import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, Fibre, Measurement, RTU } from '../models';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from '../data/demoData';

const FIBRE_OFFSETS: Array<[number, number]> = [
  [0.0, 0.018],
  [0.014, 0.012],
  [0.018, 0.0],
  [0.014, -0.012],
  [0.0, -0.018],
  [-0.014, -0.012],
  [-0.018, 0.0],
  [-0.014, 0.012],
];

const buildRouteName = (rtuName: string, fibreName: string): string => `${rtuName}-${fibreName}`;

const buildRouteStatus = (status: string): 'active' | 'inactive' | 'skipped' => {
  if (status === 'broken') {
    return 'inactive';
  }

  if (status === 'degraded') {
    return 'skipped';
  }

  return 'active';
};

const buildPulseWidth = (length?: number | null): string => {
  if (!length || length <= 0) {
    return '30 ns';
  }

  if (length >= 30) {
    return '100 ns';
  }

  if (length >= 20) {
    return '50 ns';
  }

  return '30 ns';
};

const buildMeasurementMode = (result: string, wavelength: number): 'auto' | 'manual' | 'scheduled' => {
  if (result === 'fail') {
    return 'manual';
  }

  if (wavelength === 1625) {
    return 'scheduled';
  }

  return 'auto';
};

const buildFibrePath = (latitude?: number | string | null, longitude?: number | string | null, fibreName?: string) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const fibreIndex = Math.max(0, Number((fibreName || '').replace(/\D+/g, '')) - 1) % FIBRE_OFFSETS.length;
  const [latOffset, lonOffset] = FIBRE_OFFSETS[fibreIndex];

  return [
    [lat, lon],
    [Number((lat + latOffset).toFixed(6)), Number((lon + lonOffset).toFixed(6))],
  ];
};

const calculateMTTR = async (): Promise<number> => {
  const resolvedAlarms = await Alarm.findAll({
    where: {
      lifecycleStatus: 'cleared',
    },
  });

  if (resolvedAlarms.length === 0) {
    return 0;
  }

  const totalHours = resolvedAlarms.reduce((acc, alarm) => {
    if (!alarm.resolvedAt || !alarm.occurredAt) {
      return acc;
    }
    const diffMs = alarm.resolvedAt.getTime() - alarm.occurredAt.getTime();
    return acc + diffMs / (1000 * 60 * 60);
  }, 0);

  return Number((totalHours / resolvedAlarms.length).toFixed(2));
};

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      const rtuOnline = demoRtus.filter((item) => item.status === 'online').length;
      const rtuOffline = demoRtus.filter((item) => item.status === 'offline').length;
      const rtuWarning = demoRtus.filter((item) => item.status === 'warning').length;
      const rtuUnreachable = demoRtus.filter((item) => item.status === 'unreachable').length;
      const criticalAlarms = demoAlarms.filter(
        (item) => item.severity === 'critical' && item.lifecycleStatus !== 'closed' && item.lifecycleStatus !== 'resolved'
      ).length;
      const majorAlarms = demoAlarms.filter(
        (item) => item.severity === 'major' && item.lifecycleStatus !== 'closed' && item.lifecycleStatus !== 'resolved'
      ).length;
      const minorAlarms = demoAlarms.filter(
        (item) => item.severity === 'minor' && item.lifecycleStatus !== 'closed' && item.lifecycleStatus !== 'resolved'
      ).length;
      const rtuTotal = demoRtus.length;
      const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;

      res.json({
        rtuOnline,
        rtuOffline,
        rtuWarning,
        rtuUnreachable,
        rtuTotal,
        criticalAlarms,
        majorAlarms,
        minorAlarms,
        mttr: 2.4,
        availability,
        degradedMode: true,
      });
      return;
    }

    const [rtuOnline, rtuOffline, rtuWarning, rtuUnreachable] = await Promise.all([
      RTU.count({ where: { status: 'online' } }),
      RTU.count({ where: { status: 'offline' } }),
      RTU.count({ where: { status: 'warning' } }),
      RTU.count({ where: { status: 'unreachable' } }),
    ]);

    const [criticalAlarms, majorAlarms, minorAlarms] = await Promise.all([
      Alarm.count({ where: { severity: 'critical', lifecycleStatus: { [Op.ne]: 'cleared' } } }),
      Alarm.count({ where: { severity: 'major', lifecycleStatus: { [Op.ne]: 'cleared' } } }),
      Alarm.count({ where: { severity: 'minor', lifecycleStatus: { [Op.ne]: 'cleared' } } }),
    ]);

    const rtuTotal = rtuOnline + rtuOffline + rtuWarning + rtuUnreachable;
    const availability = rtuTotal > 0 ? Number(((rtuOnline / rtuTotal) * 100).toFixed(2)) : 0;
    const mttr = await calculateMTTR();

    res.json({
      rtuOnline,
      rtuOffline,
      rtuWarning,
      rtuUnreachable,
      rtuTotal,
      criticalAlarms,
      majorAlarms,
      minorAlarms,
      mttr,
      availability,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getTopology = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.json({ routes: demoFiberRoutes, degradedMode: true });
      return;
    }

    const [fibres, measurements] = await Promise.all([
      Fibre.findAll({
        include: [{ model: RTU, as: 'rtu', attributes: ['id', 'name', 'locationAddress', 'locationLatitude', 'locationLongitude'] }],
        order: [['id', 'ASC']],
      }),
      Measurement.findAll({ order: [['timestamp', 'DESC']] }),
    ]);

    const latestMeasurementByFibre = new Map<number, Measurement>();
    measurements.forEach((measurement) => {
      const fibreId = measurement.get('fibreId') as number;
      if (!latestMeasurementByFibre.has(fibreId)) {
        latestMeasurementByFibre.set(fibreId, measurement);
      }
    });

    const routes = fibres.map((fibre) => {
      const rtu = fibre.get('rtu') as RTU | undefined;
      const latestMeasurement = latestMeasurementByFibre.get(fibre.get('id') as number);
      const fibreName = fibre.get('name') as string;
      const routeName = buildRouteName(
        rtu ? ((rtu.get('name') as string) || `RTU-${fibre.get('rtuId') as number}`) : `RTU-${fibre.get('rtuId') as number}`,
        fibreName
      );

      return {
        id: fibre.get('id') as number,
        routeName,
        source: rtu ? ((rtu.get('locationAddress') as string) || (rtu.get('name') as string)) : routeName,
        destination: `Fibre ${fibreName}`,
        fiberStatus: fibre.get('status') as string,
        routeStatus: buildRouteStatus(fibre.get('status') as string),
        path: rtu
          ? buildFibrePath(rtu.get('locationLatitude') as string | number | null, rtu.get('locationLongitude') as string | number | null, fibreName)
          : null,
        lengthKm: (fibre.get('length') as number | null) ?? null,
        attenuationDb: latestMeasurement ? ((latestMeasurement.get('attenuation') as number | null) ?? null) : null,
        reflectionEvents: latestMeasurement ? (latestMeasurement.get('testResult') as string) === 'fail' : false,
        lastTestTime: latestMeasurement ? (latestMeasurement.get('timestamp') as Date) : null,
      };
    });

    res.json({ routes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topology' });
  }
};

export const getRecentOtdrTests = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      const tests = demoOtdrTests.map((test) => {
        const route = demoFiberRoutes.find((item) => item.id === test.routeId);
        return {
          ...test,
          routeName: route?.routeName || 'Unknown',
        };
      });
      res.json({ data: tests, degradedMode: true });
      return;
    }

    const tests = await Measurement.findAll({
      include: [
        {
          model: Fibre,
          as: 'fibre',
          attributes: ['id', 'name', 'length', 'rtuId'],
          include: [{ model: RTU, as: 'rtu', attributes: ['id', 'name'] }],
        },
      ],
      order: [['timestamp', 'DESC']],
      limit: 20,
    });

    const mapped = tests.map((test) => {
      const fibre = test.get('fibre') as Fibre | undefined;
      const rtu = fibre?.get('rtu') as RTU | undefined;
      const routeName = fibre
        ? buildRouteName(
            rtu ? ((rtu.get('name') as string) || `RTU-${fibre.get('rtuId') as number}`) : `RTU-${fibre.get('rtuId') as number}`,
            (fibre.get('name') as string) || 'Fibre'
          )
        : 'Unknown';
      const attenuation = (test.get('attenuation') as number | null) ?? null;
      const wavelength = test.get('wavelength') as number;

      return {
        id: test.get('id') as number,
        mode: buildMeasurementMode(test.get('testResult') as string, wavelength),
        pulseWidth: buildPulseWidth((fibre?.get('length') as number | null) ?? null),
        dynamicRangeDb: attenuation !== null ? Number((attenuation + 12).toFixed(1)) : null,
        wavelengthNm: wavelength,
        result: test.get('testResult') as string,
        testedAt: test.get('timestamp') as Date,
        routeId: fibre ? (fibre.get('id') as number) : null,
        routeName,
      };
    });

    res.json({ data: mapped });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OTDR tests' });
  }
};
