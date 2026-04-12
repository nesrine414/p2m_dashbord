import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, Fibre, Measurement, RTU } from '../models';
import { demoAlarms, demoFiberRoutes, demoFibres, demoMeasurements, demoOtdrTests, demoRtus } from '../data/demoData';
import { getDashboardStatsSnapshot } from '../services/dashboardStatsService';
import { classifyFibreAgingStatus, computeAttenuationPerKm } from '../utils/fibreAging';

const OPEN_ALARM_LIFECYCLE_STATUSES = ['active', 'acknowledged', 'in_progress'] as const;
const RESOLVED_ALARM_LIFECYCLE_STATUSES = ['resolved', 'closed', 'cleared'] as const;
const DEFAULT_TREND_WINDOW_MINUTES = 180;
const DEFAULT_TREND_LIMIT = 120;

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
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const resolvedAlarms = await Alarm.findAll({
    where: {
      lifecycleStatus: {
        [Op.in]: RESOLVED_ALARM_LIFECYCLE_STATUSES,
      },
      resolvedAt: {
        [Op.gte]: thirtyDaysAgo,
      },
    },
    order: [['resolvedAt', 'DESC']],
    limit: 50,
  });

  if (resolvedAlarms.length === 0) {
    return 0;
  }

  const validDurationsHours = resolvedAlarms
    .map((alarm) => {
      if (!alarm.resolvedAt || !alarm.occurredAt) {
        return null;
      }

      const diffMs = alarm.resolvedAt.getTime() - alarm.occurredAt.getTime();
      if (!Number.isFinite(diffMs) || diffMs < 0) {
        return null;
      }

      return diffMs / (1000 * 60 * 60);
    })
    .filter((duration): duration is number => typeof duration === 'number');

  if (validDurationsHours.length === 0) {
    return 0;
  }

  const totalHours = validDurationsHours.reduce((acc, value) => acc + value, 0);
  return Number((totalHours / validDurationsHours.length).toFixed(4));
};

const parseBoundedNumber = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const getTrendStartTimestamp = (windowMinutes: number): Date => {
  if (windowMinutes === 24 * 60) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (windowMinutes === 7 * 24 * 60) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return start;
  }

  return new Date(Date.now() - windowMinutes * 60_000);
};

const calculateAverageAttenuation = async (): Promise<number> => {
  const measurements = await Measurement.findAll({
    order: [['timestamp', 'DESC']],
    attributes: ['fibreId', 'attenuation'],
  });

  const latestByFibre = new Map<number, number>();
  measurements.forEach((measurement) => {
    const fibreId = measurement.get('fibreId') as number;
    const attenuation = measurement.get('attenuation') as number | null;

    if (latestByFibre.has(fibreId)) {
      return;
    }

    if (typeof attenuation === 'number' && attenuation > 0) {
      latestByFibre.set(fibreId, attenuation);
    }
  });

  if (latestByFibre.size === 0) {
    return 0;
  }

  const sum = Array.from(latestByFibre.values()).reduce((acc, value) => acc + value, 0);
  return Number((sum / latestByFibre.size).toFixed(1));
};

const calculateEstimatedMTBF = async (rtuTotal: number): Promise<number> => {
  const [openAlarmCount, degradedOrBrokenFibres, measurements] = await Promise.all([
    Alarm.count({
      where: {
        lifecycleStatus: { [Op.in]: OPEN_ALARM_LIFECYCLE_STATUSES },
      },
    }),
    Fibre.count({
      where: {
        status: { [Op.in]: ['degraded', 'broken'] },
      },
    }),
    Measurement.findAll({
      order: [['timestamp', 'DESC']],
      attributes: ['fibreId', 'testResult'],
    }),
  ]);

  const latestByFibre = new Map<number, string | null>();
  measurements.forEach((measurement) => {
    const fibreId = measurement.get('fibreId') as number;
    if (latestByFibre.has(fibreId)) {
      return;
    }

    latestByFibre.set(fibreId, (measurement.get('testResult') as string | null) ?? null);
  });

  const failedLatestTests = Array.from(latestByFibre.values()).filter((result) => result === 'fail').length;
  const incidentLoad = Math.max(1, openAlarmCount + degradedOrBrokenFibres + failedLatestTests);
  const networkScale = Math.max(1, rtuTotal);

  return Number(((networkScale * 168) / incidentLoad).toFixed(1));
};

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardStatsSnapshot();
    res.json(stats);
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
      const attenuationDb = latestMeasurement ? ((latestMeasurement.get('attenuation') as number | null) ?? null) : null;
      const lengthKm = (fibre.get('length') as number | null) ?? null;
      const attenuationPerKm = computeAttenuationPerKm(attenuationDb, lengthKm);
      const agingStatus = classifyFibreAgingStatus(attenuationPerKm, fibre.get('status') as string);

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
        lengthKm,
        attenuationDb,
        attenuationPerKm,
        agingStatus,
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

export const getRouteAttenuationTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const routeId = Number(req.params.routeId);
    if (!Number.isFinite(routeId) || routeId <= 0) {
      res.status(400).json({ error: 'Invalid route id' });
      return;
    }

    const query = req.query as Record<string, string | undefined>;
    const windowMinutes = parseBoundedNumber(
      query.windowMinutes,
      DEFAULT_TREND_WINDOW_MINUTES,
      5,
      7 * 24 * 60
    );
    const limit = parseBoundedNumber(query.limit, DEFAULT_TREND_LIMIT, 10, 5000);
    const fromTimestamp = getTrendStartTimestamp(windowMinutes);

    if (!databaseState.connected) {
      const route = demoFiberRoutes.find((item) => item.id === routeId);
      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      const points = demoMeasurements
        .filter((measurement) => measurement.fibreId === routeId)
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
        .slice(-limit)
        .map((measurement) => ({
          timestamp: measurement.timestamp,
          attenuationDb: measurement.attenuation,
          wavelengthNm: measurement.wavelength,
          testResult: measurement.testResult,
        }));

      res.json({
        routeId: route.id,
        routeName: route.routeName,
        source: route.source,
        destination: route.destination,
        windowMinutes,
        sampledAt: new Date().toISOString(),
        points,
        degradedMode: true,
      });
      return;
    }

    const fibre = await Fibre.findByPk(routeId, {
      include: [{ model: RTU, as: 'rtu', attributes: ['id', 'name'] }],
    });
    if (!fibre) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    const sourceRtu = fibre.get('rtu') as RTU | undefined;
    const sourceName = sourceRtu ? ((sourceRtu.get('name') as string) || `RTU-${fibre.get('rtuId') as number}`) : `RTU-${fibre.get('rtuId') as number}`;
    const destinationName = (fibre.get('name') as string) || `Fibre-${fibre.get('id') as number}`;
    const routeName = buildRouteName(sourceName, destinationName, fibre.get('name') as string);

    const measurements = await Measurement.findAll({
      where: {
        fibreId: routeId,
        timestamp: {
          [Op.gte]: fromTimestamp,
        },
      },
      order: [['timestamp', 'DESC']],
      limit,
    });

    const points = measurements
      .slice()
      .reverse()
      .map((measurement) => ({
        timestamp: measurement.get('timestamp') as Date,
        attenuationDb: (measurement.get('attenuation') as number | null) ?? null,
        wavelengthNm: Number(measurement.get('wavelength') as unknown as string),
        testResult: measurement.get('testResult') as string,
      }));

    res.json({
      routeId,
      routeName,
      source: sourceName,
      destination: destinationName,
      windowMinutes,
      sampledAt: new Date().toISOString(),
      points,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attenuation trend' });
  }
};
