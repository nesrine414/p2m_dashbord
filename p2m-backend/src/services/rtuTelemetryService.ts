import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { demoAlarms, demoFiberRoutes, demoFibres, demoMeasurements, demoOtdrTests, demoPerformances, demoRtus } from '../data/demoData';
import {
  Alarm,
  Fibre,
  Measurement,
  OtdrTestResult,
  Performance,
  RTU,
} from '../models';
import {
  SupervisionAlarmRecord,
  SupervisionDashboardSnapshot,
  SupervisionFibreRecord,
  SupervisionMeasurementRecord,
  SupervisionOtdrMode,
  SupervisionOtdrResult,
  SupervisionRtuRecord,
  SupervisionTelemetryAlarm,
  SupervisionTelemetryBundle,
  SupervisionTelemetryFibre,
} from '../types/supervision';
import { calculateDashboardSnapshot, calculateRtuSummary } from './kpiCalculatorService';

const ROUTE_TARGETS_BY_SOURCE: Record<number, number[]> = {
  1: [6, 2, 5],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4],
  6: [1, 2],
};

const normalizeIp = (ipAddress: string): string => ipAddress.trim();

const buildPath = (
  source:
    | { latitude?: number | string | null; longitude?: number | string | null; locationLatitude?: number | string | null; locationLongitude?: number | string | null }
    | null
    | undefined,
  destination:
    | { latitude?: number | string | null; longitude?: number | string | null; locationLatitude?: number | string | null; locationLongitude?: number | string | null }
    | null
    | undefined
): SupervisionTelemetryFibre['path'] => {
  const sourceLat = Number(source?.latitude ?? source?.locationLatitude);
  const sourceLon = Number(source?.longitude ?? source?.locationLongitude);
  const destinationLat = Number(destination?.latitude ?? destination?.locationLatitude);
  const destinationLon = Number(destination?.longitude ?? destination?.locationLongitude);

  if (!Number.isFinite(sourceLat) || !Number.isFinite(sourceLon) || !destination || !Number.isFinite(destinationLat) || !Number.isFinite(destinationLon)) {
    return null;
  }

  return [
    { latitude: Number(sourceLat.toFixed(6)), longitude: Number(sourceLon.toFixed(6)) },
    { latitude: Number(destinationLat.toFixed(6)), longitude: Number(destinationLon.toFixed(6)) },
  ];
};

const pickDestination = (sourceRtuId: number, fibreName: string, availableRtuIds: number[]): number | null => {
  const ordinal = Math.max(1, Number((fibreName || '').replace(/\D+/g, '')) || 1);
  const configured = ROUTE_TARGETS_BY_SOURCE[sourceRtuId] || [];
  const configuredTarget = configured.length ? configured[(ordinal - 1) % configured.length] : undefined;

  if (configuredTarget && configuredTarget !== sourceRtuId && availableRtuIds.includes(configuredTarget)) {
    return configuredTarget;
  }

  const sourceIndex = availableRtuIds.indexOf(sourceRtuId);
  const baseIndex = sourceIndex >= 0 ? sourceIndex : 0;
  const candidate = availableRtuIds[(baseIndex + ordinal) % availableRtuIds.length];
  return candidate === sourceRtuId ? null : candidate;
};

const routeStatus = (status: string): 'active' | 'inactive' | 'skipped' =>
  status === 'broken' ? 'inactive' : status === 'degraded' ? 'skipped' : 'active';

const serializeAlarm = (alarm: Alarm): SupervisionTelemetryAlarm => ({
  id: alarm.id,
  rtuId: alarm.rtuId ?? null,
  fibreId: alarm.fibreId ?? null,
  routeId: alarm.routeId ?? null,
  alarmType: alarm.alarmType,
  severity: alarm.severity,
  lifecycleStatus: alarm.lifecycleStatus,
  message: alarm.message,
  location: alarm.location ?? null,
  localizationKm: alarm.localizationKm ?? null,
  owner: alarm.owner ?? null,
  occurredAt: alarm.occurredAt,
  acknowledgedAt: alarm.acknowledgedAt ?? null,
  resolvedAt: alarm.resolvedAt ?? null,
  resolutionComment: alarm.resolutionComment ?? null,
  source: 'database',
});

const demoRtuRecord = (rtu: (typeof demoRtus)[number]): SupervisionRtuRecord => ({
  id: rtu.id,
  name: rtu.name,
  locationAddress: rtu.locationAddress,
  latitude: rtu.locationLatitude,
  longitude: rtu.locationLongitude,
  ipAddress: rtu.ipAddress,
  serialNumber: rtu.serialNumber,
  status: rtu.status,
  power: rtu.power,
  temperature: rtu.temperature,
  otdrStatus: rtu.otdrStatus,
  attenuationDb: null,
  lastSeen: rtu.lastSeen,
});

const dbRtuRecord = (rtu: RTU): SupervisionRtuRecord => ({
  id: rtu.id,
  name: rtu.name,
  locationAddress: rtu.locationAddress ?? null,
  latitude: rtu.locationLatitude ?? null,
  longitude: rtu.locationLongitude ?? null,
  ipAddress: rtu.ipAddress ?? null,
  serialNumber: rtu.serialNumber ?? null,
  status: rtu.status,
  power: rtu.power ?? null,
  temperature: rtu.temperature ?? null,
  otdrStatus: rtu.otdrStatus ?? null,
  attenuationDb: rtu.attenuationDb ?? null,
  lastSeen: rtu.lastSeen ?? null,
});

const demoMeasurementRecord = (measurement: (typeof demoMeasurements)[number]): SupervisionMeasurementRecord => measurement;

const dbMeasurementRecord = (measurement: Measurement): SupervisionMeasurementRecord => ({
  id: measurement.id,
  fibreId: measurement.fibreId,
  attenuation: measurement.attenuation ?? null,
  testResult: measurement.testResult,
  wavelength: measurement.wavelength,
  timestamp: measurement.timestamp,
});

const demoFibreRecord = (fibre: (typeof demoFibres)[number]): SupervisionFibreRecord => ({
  id: fibre.id,
  rtuId: fibre.fromRtuId,
  name: fibre.name,
  length: fibre.length,
  status: fibre.status,
});

const dbFibreRecord = (fibre: Fibre): SupervisionFibreRecord => ({
  id: fibre.id,
  rtuId: fibre.rtuId,
  name: fibre.name,
  length: fibre.length ?? null,
  status: fibre.status,
});

const buildDemoTelemetryFibre = (
  fibre: (typeof demoFibres)[number],
  sourceRtu: (typeof demoRtus)[number],
  destinationRtu: (typeof demoRtus)[number],
  latestMeasurement?: (typeof demoMeasurements)[number],
  latestTest?: (typeof demoOtdrTests)[number]
): SupervisionTelemetryFibre => {
  const route = demoFiberRoutes.find((item) => item.id === fibre.id);
  const testResult: SupervisionOtdrResult = latestMeasurement?.testResult || latestTest?.result || (fibre.status === 'broken' ? 'fail' : 'pass');
  const testMode: SupervisionOtdrMode = latestTest?.mode || (testResult === 'fail' ? 'manual' : 'auto');

  return {
    id: fibre.id,
    fibreId: fibre.id,
    rtuId: fibre.fromRtuId,
    sourceRtuId: sourceRtu.id,
    destinationRtuId: destinationRtu.id,
    routeName: route?.routeName || `${sourceRtu.name} -> ${destinationRtu.name} (${fibre.name})`,
    source: sourceRtu.name,
    destination: destinationRtu.name,
    fiberStatus: fibre.status,
    routeStatus: route?.routeStatus || routeStatus(fibre.status),
    lengthKm: fibre.length,
    attenuationDb: latestMeasurement?.attenuation ?? route?.attenuationDb ?? null,
    attenuationTrend: fibre.status === 'broken' ? 'rising' : 'stable',
    testMode,
    wavelengthNm: latestMeasurement?.wavelength || latestTest?.wavelengthNm || 1550,
    testResult,
    lastTestTime: route?.lastTestTime || latestMeasurement?.timestamp || latestTest?.testedAt || null,
    reflectionEvents: route?.reflectionEvents ?? testResult === 'fail',
    path: route?.path ? route.path.map(([latitude, longitude]) => ({ latitude, longitude })) : buildPath(sourceRtu, destinationRtu),
  };
};

const buildDbTelemetryFibre = (
  fibre: Fibre,
  sourceRtu: RTU,
  destinationRtu: RTU | null,
  latestMeasurement?: Measurement | null,
  latestTest?: OtdrTestResult | null
): SupervisionTelemetryFibre => {
  const testResult: SupervisionOtdrResult = latestMeasurement?.testResult || latestTest?.result || (fibre.status === 'broken' ? 'fail' : 'pass');
  const testMode: SupervisionOtdrMode = latestTest?.mode || (testResult === 'fail' ? 'manual' : 'auto');

  return {
    id: fibre.id,
    fibreId: fibre.id,
    rtuId: fibre.rtuId,
    sourceRtuId: sourceRtu.id,
    destinationRtuId: destinationRtu?.id ?? null,
    routeName: `${sourceRtu.name} -> ${destinationRtu?.name || `RTU-${destinationRtu?.id ?? fibre.id}`} (${fibre.name})`,
    source: sourceRtu.name,
    destination: destinationRtu?.name || `RTU-${destinationRtu?.id ?? fibre.id}`,
    fiberStatus: fibre.status,
    routeStatus: routeStatus(fibre.status),
    lengthKm: fibre.length ?? null,
    attenuationDb: latestMeasurement?.attenuation ?? null,
    attenuationTrend: fibre.status === 'broken' ? 'rising' : 'stable',
    testMode,
    wavelengthNm: latestMeasurement?.wavelength || latestTest?.wavelengthNm || 1550,
    testResult,
    lastTestTime: latestMeasurement?.timestamp || latestTest?.testedAt || null,
    reflectionEvents: testResult === 'fail',
    path: buildPath(
      dbRtuRecord(sourceRtu),
      destinationRtu ? dbRtuRecord(destinationRtu) : null
    ),
  };
};

const buildDemoBundle = (ipAddress: string): SupervisionTelemetryBundle | null => {
  const rtu = demoRtus.find((item) => item.ipAddress === ipAddress);
  if (!rtu) return null;

  const fibres = demoFibres.filter((fibre) => fibre.fromRtuId === rtu.id);
  const fibreIds = fibres.map((fibre) => fibre.id);
  const measurements = demoMeasurements.filter((measurement) => fibreIds.includes(measurement.fibreId));
  const tests = demoOtdrTests.filter((test) => fibreIds.includes(test.routeId));
  const alarms = demoAlarms.filter((alarm) => alarm.rtuId === rtu.id || fibreIds.includes(alarm.fibreId || -1));

  const latestMeasurementByFibre = new Map<number, (typeof demoMeasurements)[number]>();
  measurements
    .slice()
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .forEach((measurement) => {
      if (!latestMeasurementByFibre.has(measurement.fibreId)) {
        latestMeasurementByFibre.set(measurement.fibreId, measurement);
      }
    });

  const latestTestByRoute = new Map<number, (typeof demoOtdrTests)[number]>();
  tests
    .slice()
    .sort((left, right) => new Date(right.testedAt).getTime() - new Date(left.testedAt).getTime())
    .forEach((test) => {
      if (!latestTestByRoute.has(test.routeId)) {
        latestTestByRoute.set(test.routeId, test);
      }
    });

  const telemetryFibres = fibres.map((fibre) => {
    const destination = demoRtus.find((item) => item.id === fibre.toRtuId) || rtu;
    return buildDemoTelemetryFibre(fibre, rtu, destination, latestMeasurementByFibre.get(fibre.id), latestTestByRoute.get(fibre.id));
  });

  const kpis = calculateDashboardSnapshot({
    rtus: demoRtus.map(demoRtuRecord),
    fibres: demoFibres.map(demoFibreRecord),
    alarms,
    measurements: demoMeasurements.map(demoMeasurementRecord),
    performances: demoPerformances.map((performance) => ({
      id: performance.id,
      fibreId: performance.fibreId,
      mttr: performance.mttr,
      mtbf: performance.mtbf,
      recordedAt: performance.recordedAt,
    })),
    source: 'demo',
  });

  return {
    ipAddress,
    source: 'demo',
    generatedAt: new Date().toISOString(),
    rtu: demoRtuRecord(rtu),
    fibres: telemetryFibres,
    alarms: alarms.map((alarm) => ({ ...alarm, source: 'demo' as const })),
    kpis,
    summary: calculateRtuSummary({
      rtu: demoRtuRecord(rtu),
      fibres: telemetryFibres,
      alarms,
      measurements: demoMeasurements.map(demoMeasurementRecord),
    }),
  };
};

const buildDbBundle = async (ipAddress: string): Promise<SupervisionTelemetryBundle | null> => {
  const rtu = await RTU.findOne({ where: { ipAddress } });
  if (!rtu) return null;

  const [allRtus, allFibres, allMeasurements, allTests, allAlarms, allPerformances] = await Promise.all([
    RTU.findAll({ order: [['id', 'ASC']] }),
    Fibre.findAll({ order: [['id', 'ASC']] }),
    Measurement.findAll({ order: [['timestamp', 'DESC']] }),
    OtdrTestResult.findAll({ order: [['testedAt', 'DESC']] }),
    Alarm.findAll({ order: [['occurredAt', 'DESC']] }),
    Performance.findAll({ order: [['recordedAt', 'DESC']] }),
  ]);

  const fibres = allFibres.filter((fibre) => fibre.rtuId === rtu.id);
  const fibreIds = fibres.map((fibre) => fibre.id);
  const rtuById = new Map<number, RTU>(allRtus.map((item) => [item.id, item]));

  const latestMeasurementByFibre = new Map<number, Measurement>();
  allMeasurements.forEach((measurement) => {
    if (!latestMeasurementByFibre.has(measurement.fibreId)) {
      latestMeasurementByFibre.set(measurement.fibreId, measurement);
    }
  });

  const latestTestByRoute = new Map<number, OtdrTestResult>();
  allTests.forEach((test) => {
    if (typeof test.routeId === 'number' && !latestTestByRoute.has(test.routeId)) {
      latestTestByRoute.set(test.routeId, test);
    }
  });

  const telemetryFibres = fibres.map((fibre) => {
    const destinationId = pickDestination(rtu.id, fibre.name, allRtus.map((item) => item.id));
    return buildDbTelemetryFibre(
      fibre,
      rtu,
      destinationId ? rtuById.get(destinationId) || null : null,
      latestMeasurementByFibre.get(fibre.id) || null,
      latestTestByRoute.get(fibre.id) || null
    );
  });

  const relatedAlarms = allAlarms.filter((alarm) => {
    if (alarm.rtuId === rtu.id) return true;
    if (typeof alarm.fibreId === 'number' && fibreIds.includes(alarm.fibreId)) return true;
    if (typeof alarm.routeId === 'number' && fibreIds.includes(alarm.routeId)) return true;
    return false;
  });

  const relatedMeasurements = allMeasurements.filter((measurement) => fibreIds.includes(measurement.fibreId));
  const kpis = calculateDashboardSnapshot({
    rtus: allRtus.map(dbRtuRecord),
    fibres: allFibres.map(dbFibreRecord),
    alarms: allAlarms.map(serializeAlarm),
    measurements: allMeasurements.map(dbMeasurementRecord),
    performances: allPerformances.map((performance) => ({
      id: performance.id,
      fibreId: performance.fibreId,
      mttr: performance.mttr,
      mtbf: performance.mtbf,
      recordedAt: performance.recordedAt,
    })),
    source: 'database',
  });

  return {
    ipAddress,
    source: 'database',
    generatedAt: new Date().toISOString(),
    rtu: dbRtuRecord(rtu),
    fibres: telemetryFibres,
    alarms: relatedAlarms.map(serializeAlarm),
    kpis,
    summary: calculateRtuSummary({
      rtu: dbRtuRecord(rtu),
      fibres: telemetryFibres,
      alarms: relatedAlarms.map(serializeAlarm),
      measurements: relatedMeasurements.map(dbMeasurementRecord),
    }),
  };
};

export const lookupTelemetryBundleByIp = async (ipAddress: string): Promise<SupervisionTelemetryBundle | null> => {
  const normalized = normalizeIp(ipAddress);
  if (!normalized) return null;
  return databaseState.connected ? buildDbBundle(normalized) : buildDemoBundle(normalized);
};

export const lookupTelemetryBundleByRtuId = async (rtuId: number): Promise<SupervisionTelemetryBundle | null> => {
  if (!databaseState.connected) {
    const demoRtu = demoRtus.find((item) => item.id === rtuId);
    return demoRtu ? buildDemoBundle(demoRtu.ipAddress) : null;
  }

  const rtu = await RTU.findByPk(rtuId);
  return rtu?.ipAddress ? buildDbBundle(rtu.ipAddress) : null;
};

export const buildTelemetryBundleForDashboard = async (): Promise<SupervisionDashboardSnapshot> => {
  if (!databaseState.connected) {
    return calculateDashboardSnapshot({
      rtus: demoRtus.map(demoRtuRecord),
      fibres: demoFibres.map(demoFibreRecord),
      alarms: demoAlarms,
      measurements: demoMeasurements.map(demoMeasurementRecord),
      performances: demoPerformances.map((performance) => ({
        id: performance.id,
        fibreId: performance.fibreId,
        mttr: performance.mttr,
        mtbf: performance.mtbf,
        recordedAt: performance.recordedAt,
      })),
      source: 'demo',
    });
  }

  const [rtus, fibres, measurements, performances, alarms] = await Promise.all([
    RTU.findAll({ order: [['id', 'ASC']] }),
    Fibre.findAll({ order: [['id', 'ASC']] }),
    Measurement.findAll({ order: [['timestamp', 'DESC']] }),
    Performance.findAll({ order: [['recordedAt', 'DESC']] }),
    Alarm.findAll({ order: [['occurredAt', 'DESC']] }),
  ]);

  return calculateDashboardSnapshot({
    rtus: rtus.map(dbRtuRecord),
    fibres: fibres.map(dbFibreRecord),
    alarms: alarms.map(serializeAlarm),
    measurements: measurements.map(dbMeasurementRecord),
    performances: performances.map((performance) => ({
      id: performance.id,
      fibreId: performance.fibreId,
      mttr: performance.mttr,
      mtbf: performance.mtbf,
      recordedAt: performance.recordedAt,
    })),
    source: 'database',
  });
};
