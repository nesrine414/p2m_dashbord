import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, Fibre, Measurement, RTU } from '../models';
import { demoAlarms, demoFiberRoutes, demoOtdrTests, demoRtus } from '../data/demoData';

const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'] as const;
const RESOLVED_ALARM_LIFECYCLE_STATUSES = ['resolved', 'closed', 'cleared'] as const;

const ROUTE_TARGETS_BY_SOURCE: Record<number, number[]> = {
  1: [6, 2, 5],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4],
  6: [1, 2],
};

const buildRouteName = (sourceName: string, destinationName: string, fibreName?: string): string => {
  if (fibreName) {
    return `${sourceName} -> ${destinationName} (${fibreName})`;
  }

  return `${sourceName}-${destinationName}`;
};

const buildRouteStatus = (status: string): 'active' | 'inactive' | 'skipped' => {
  if (status === 'broken') {
    return 'inactive';
  }

  if (status === 'degraded') {
    return 'skipped';
  }

  return 'active';
};

const pickDestinationRtuId = (
  sourceRtuId: number,
  fibreName: string,
  availableRtuIds: number[]
): number | null => {
  const fiberOrdinal = Math.max(1, Number((fibreName || '').replace(/\D+/g, '')) || 1);
  const configuredTargets = ROUTE_TARGETS_BY_SOURCE[sourceRtuId] || [];
  const configuredTargetId =
    configuredTargets.length > 0 ? configuredTargets[(fiberOrdinal - 1) % configuredTargets.length] : undefined;

  if (configuredTargetId && configuredTargetId !== sourceRtuId && availableRtuIds.includes(configuredTargetId)) {
    return configuredTargetId;
  }

  if (availableRtuIds.length === 0) {
    return null;
  }

  const sourceIndex = availableRtuIds.indexOf(sourceRtuId);
  const fallbackIndex = sourceIndex >= 0 ? sourceIndex : 0;
  let candidate = availableRtuIds[(fallbackIndex + fiberOrdinal) % availableRtuIds.length];

  if (candidate === sourceRtuId) {
    candidate = availableRtuIds[(fallbackIndex + fiberOrdinal + 1) % availableRtuIds.length];
  }

  if (candidate === sourceRtuId) {
    return null;
  }

  return candidate;
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

const buildFibrePath = (
  sourceLatitude?: number | string | null,
  sourceLongitude?: number | string | null,
  destinationLatitude?: number | string | null,
  destinationLongitude?: number | string | null
) => {
  const sourceLat = Number(sourceLatitude);
  const sourceLon = Number(sourceLongitude);
  const destLat = Number(destinationLatitude);
  const destLon = Number(destinationLongitude);

  if (
    !Number.isFinite(sourceLat) ||
    !Number.isFinite(sourceLon) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLon)
  ) {
    return null;
  }

  return [
    [Number(sourceLat.toFixed(6)), Number(sourceLon.toFixed(6))],
    [Number(destLat.toFixed(6)), Number(destLon.toFixed(6))],
  ];
};

const calculateMTTR = async (): Promise<number> => {
  const resolvedAlarms = await Alarm.findAll({
    where: {
      lifecycleStatus: {
        [Op.in]: RESOLVED_ALARM_LIFECYCLE_STATUSES,
      },
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
      const rtuUnreachable = demoRtus.filter((item) => item.status === 'unreachable').length;
      const rtuWarning = 0;
      const rtuTotal = demoRtus.length;
      const criticalAlarms = demoAlarms.filter(
        (item) =>
          item.severity === 'critical' &&
          OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus as (typeof OPEN_ALARM_LIFECYCLE_STATUSES)[number])
      ).length;
      const majorAlarms = demoAlarms.filter(
        (item) =>
          item.severity === 'major' &&
          OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus as (typeof OPEN_ALARM_LIFECYCLE_STATUSES)[number])
      ).length;
      const minorAlarms = demoAlarms.filter(
        (item) =>
          item.severity === 'minor' &&
          OPEN_ALARM_LIFECYCLE_STATUSES.includes(item.lifecycleStatus as (typeof OPEN_ALARM_LIFECYCLE_STATUSES)[number])
      ).length;
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

    const [rtuOnline, rtuOffline, rtuWarning, rtuUnreachable, criticalAlarms, majorAlarms, minorAlarms] = await Promise.all([
      RTU.count({ where: { status: 'online' } }),
      RTU.count({ where: { status: 'offline' } }),
      Promise.resolve(0),
      RTU.count({ where: { status: { [Op.in]: ['unreachable', 'warning'] } } }),
      Alarm.count({ where: { severity: 'critical', lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
      Alarm.count({ where: { severity: 'major', lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
      Alarm.count({ where: { severity: 'minor', lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES } } }),
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

    const [fibres, measurements, rtus] = await Promise.all([
      Fibre.findAll({
        include: [{ model: RTU, as: 'rtu', attributes: ['id', 'name', 'locationAddress', 'locationLatitude', 'locationLongitude'] }],
        order: [['id', 'ASC']],
      }),
      Measurement.findAll({ order: [['timestamp', 'DESC']] }),
      RTU.findAll({
        attributes: ['id', 'name', 'locationAddress', 'locationLatitude', 'locationLongitude'],
        order: [['id', 'ASC']],
      }),
    ]);

    const latestMeasurementByFibre = new Map<number, Measurement>();
    measurements.forEach((measurement) => {
      const fibreId = measurement.get('fibreId') as number;
      if (!latestMeasurementByFibre.has(fibreId)) {
        latestMeasurementByFibre.set(fibreId, measurement);
      }
    });

    const availableRtuIds = rtus.map((rtu) => rtu.get('id') as number);
    const rtuById = new Map<number, RTU>();
    rtus.forEach((rtu) => {
      rtuById.set(rtu.get('id') as number, rtu);
    });

    const routes = fibres.map((fibre, index) => {
      const rtu = fibre.get('rtu') as RTU | undefined;
      const latestMeasurement = latestMeasurementByFibre.get(fibre.get('id') as number);
      const fibreName = fibre.get('name') as string;
      const sourceRtu = rtu || rtuById.get(fibre.get('rtuId') as number);
      const sourceRtuId = sourceRtu ? (sourceRtu.get('id') as number) : null;
      const destinationRtuId =
        sourceRtuId !== null ? pickDestinationRtuId(sourceRtuId, fibreName, availableRtuIds) : null;
      const destinationRtu = destinationRtuId !== null ? rtuById.get(destinationRtuId) || null : null;
      const sourceName = sourceRtu ? ((sourceRtu.get('name') as string) || `RTU-${fibre.get('rtuId') as number}`) : `RTU-${fibre.get('rtuId') as number}`;
      const destinationName = destinationRtu
        ? ((destinationRtu.get('name') as string) || `RTU-${destinationRtuId}`)
        : `RTU-${destinationRtuId ?? index + 1}`;
      const routeName = buildRouteName(sourceName, destinationName, fibreName);

      return {
        id: fibre.get('id') as number,
        routeName,
        source: sourceName,
        destination: destinationName,
        sourceRtuId,
        destinationRtuId,
        fiberStatus: fibre.get('status') as string,
        routeStatus: buildRouteStatus(fibre.get('status') as string),
        path:
          sourceRtu && destinationRtu
            ? buildFibrePath(
                sourceRtu.get('locationLatitude') as string | number | null,
                sourceRtu.get('locationLongitude') as string | number | null,
                destinationRtu.get('locationLatitude') as string | number | null,
                destinationRtu.get('locationLongitude') as string | number | null
              )
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
