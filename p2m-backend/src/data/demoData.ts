export type DemoRTUStatus = 'online' | 'offline' |'unreachable';
export type DemoPowerStatus = 'normal' | 'failure';
export type DemoOtdrStatus = 'ready' | 'busy' | 'fault';
export type DemoFibreStatus = 'normal' | 'degraded' | 'broken';
export type DemoAlarmSeverity = 'critical' | 'major' | 'minor' | 'info';
export type DemoAlarmLifecycle = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
type DemoRoutePathPoint = [number, number];

export interface DemoRTU {
  id: number;
  name: string;
  locationAddress: string;
  locationLatitude: number;
  locationLongitude: number;
  ipAddress: string;
  serialNumber: string;
  status: DemoRTUStatus;
  power: DemoPowerStatus;
  temperature: number;
  otdrStatus: DemoOtdrStatus;
  lastSeen: string;
}

export interface DemoFibre {
  id: number;
  fromRtuId: number;
  toRtuId: number;
  name: string;
  length: number;
  status: DemoFibreStatus;
}

export interface DemoMeasurement {
  id: number;
  fibreId: number;
  attenuation: number;
  testResult: 'pass' | 'fail';
  wavelength: 1310 | 1550 | 1625;
  timestamp: string;
}

export interface DemoAlarm {
  id: number;
  fibreId: number;
  type: 'Fiber Cut' | 'High Loss';
  severity: DemoAlarmSeverity;
  status: 'active' | 'cleared';
  localization: number;
  timestamp: string;
}

export interface DemoPerformance {
  id: number;
  fibreId: number;
  mttr: number;
  mtbf: number;
  recordedAt: string;
}

export interface DemoFiberRoute {
  id: number;
  routeName: string;
  source: string;
  destination: string;
  sourceRtuId?: number;
  destinationRtuId?: number;
  fiberStatus: 'normal' | 'degraded' | 'broken';
  routeStatus: 'active' | 'inactive' | 'skipped';
  lengthKm: number;
  attenuationDb: number;
  reflectionEvents: boolean;
  lastTestTime: string;
  path?: DemoRoutePathPoint[];
}

export interface DemoOtdrTest {
  id: number;
  rtuId?: number;
  routeId: number;
  mode: 'auto' | 'manual' | 'scheduled';
  pulseWidth: string;
  dynamicRangeDb: number;
  wavelengthNm: 1310 | 1550 | 1625;
  result: 'pass' | 'fail';
  testedAt: string;
}

export const demoRtus: DemoRTU[] = [
  { id: 1, name: 'RTU-TUNIS-BACKBONE', locationAddress: 'Tunis Centre', locationLatitude: 36.8065, locationLongitude: 10.1815, ipAddress: '10.60.1.11', serialNumber: 'NQMS-RTU-TN-0001', status: 'online', power: 'normal', temperature: 31, otdrStatus: 'ready', lastSeen: '2026-04-02T10:02:00.000Z' },
  { id: 2, name: 'RTU-SOUSSE-METRO', locationAddress: 'Sousse Ville', locationLatitude: 35.8256, locationLongitude: 10.636, ipAddress: '10.60.1.12', serialNumber: 'NQMS-RTU-TN-0002', status: 'online', power: 'normal', temperature: 39, otdrStatus: 'busy', lastSeen: '2026-04-02T09:54:00.000Z' },
  { id: 3, name: 'RTU-SFAX-CORE', locationAddress: 'Sfax Centre', locationLatitude: 34.7398, locationLongitude: 10.76, ipAddress: '10.60.1.13', serialNumber: 'NQMS-RTU-TN-0003', status: 'online', power: 'normal', temperature: 30, otdrStatus: 'ready', lastSeen: '2026-04-02T10:01:00.000Z' },
  { id: 4, name: 'RTU-GABES-AGGREGATION', locationAddress: 'Gabes Hub', locationLatitude: 33.8881, locationLongitude: 10.0972, ipAddress: '10.60.1.14', serialNumber: 'NQMS-RTU-TN-0004', status: 'offline', power: 'failure', temperature: 0, otdrStatus: 'fault', lastSeen: '2026-04-02T08:15:00.000Z' },
  { id: 5, name: 'RTU-GAFSA-EDGE', locationAddress: 'Gafsa Backbone', locationLatitude: 34.4311, locationLongitude: 8.7757, ipAddress: '10.60.1.15', serialNumber: 'NQMS-RTU-TN-0005', status: 'unreachable', power: 'failure', temperature: 36, otdrStatus: 'fault', lastSeen: '2026-04-02T08:42:00.000Z' },
  { id: 6, name: 'RTU-BIZERTE-DISTRIBUTION', locationAddress: 'Bizerte Nord', locationLatitude: 37.2746, locationLongitude: 9.8739, ipAddress: '10.60.1.16', serialNumber: 'NQMS-RTU-TN-0006', status: 'online', power: 'normal', temperature: 29, otdrStatus: 'ready', lastSeen: '2026-04-02T10:00:30.000Z' },
];

export const demoFibres: DemoFibre[] = [
  { id: 1, fromRtuId: 1, toRtuId: 6, name: 'F1', length: 65.2, status: 'normal' },
  { id: 2, fromRtuId: 1, toRtuId: 2, name: 'F2', length: 140.5, status: 'degraded' },
  { id: 3, fromRtuId: 1, toRtuId: 5, name: 'F3', length: 350.1, status: 'normal' },
  { id: 4, fromRtuId: 2, toRtuId: 1, name: 'F1', length: 140.5, status: 'degraded' },
  { id: 5, fromRtuId: 2, toRtuId: 3, name: 'F2', length: 130.8, status: 'normal' },
  { id: 6, fromRtuId: 3, toRtuId: 2, name: 'F1', length: 130.8, status: 'normal' },
  { id: 7, fromRtuId: 3, toRtuId: 4, name: 'F2', length: 140.2, status: 'broken' },
  { id: 8, fromRtuId: 4, toRtuId: 3, name: 'F1', length: 140.2, status: 'broken' },
  { id: 9, fromRtuId: 4, toRtuId: 5, name: 'F2', length: 157.0, status: 'degraded' },
  { id: 10, fromRtuId: 5, toRtuId: 4, name: 'F1', length: 157.0, status: 'degraded' },
  { id: 11, fromRtuId: 6, toRtuId: 1, name: 'F1', length: 65.2, status: 'normal' },
  { id: 12, fromRtuId: 6, toRtuId: 2, name: 'F2', length: 160.8, status: 'normal' },
];

export const demoMeasurements: DemoMeasurement[] = [
  { id: 1, fibreId: 1, attenuation: 14.8, testResult: 'pass', wavelength: 1550, timestamp: '2026-04-02T09:40:00.000Z' },
  { id: 2, fibreId: 2, attenuation: 38.6, testResult: 'fail', wavelength: 1550, timestamp: '2026-04-02T09:37:00.000Z' },
  { id: 3, fibreId: 3, attenuation: 77.4, testResult: 'pass', wavelength: 1310, timestamp: '2026-04-02T09:28:00.000Z' },
  { id: 4, fibreId: 4, attenuation: 39.9, testResult: 'fail', wavelength: 1625, timestamp: '2026-04-02T09:32:00.000Z' },
  { id: 5, fibreId: 5, attenuation: 28.6, testResult: 'pass', wavelength: 1550, timestamp: '2026-04-02T09:46:00.000Z' },
  { id: 6, fibreId: 6, attenuation: 29.2, testResult: 'pass', wavelength: 1310, timestamp: '2026-04-02T09:48:00.000Z' },
  { id: 7, fibreId: 7, attenuation: 55.7, testResult: 'fail', wavelength: 1625, timestamp: '2026-04-02T09:18:00.000Z' },
  { id: 8, fibreId: 8, attenuation: 57.1, testResult: 'fail', wavelength: 1550, timestamp: '2026-04-02T08:10:00.000Z' },
  { id: 9, fibreId: 9, attenuation: 35.1, testResult: 'fail', wavelength: 1625, timestamp: '2026-04-02T08:42:00.000Z' },
  { id: 10, fibreId: 10, attenuation: 34.4, testResult: 'fail', wavelength: 1550, timestamp: '2026-04-02T08:53:00.000Z' },
  { id: 11, fibreId: 11, attenuation: 14.3, testResult: 'pass', wavelength: 1310, timestamp: '2026-04-02T09:55:00.000Z' },
  { id: 12, fibreId: 12, attenuation: 35.9, testResult: 'pass', wavelength: 1550, timestamp: '2026-04-02T09:58:00.000Z' },
];

export const demoFibreAlarms: DemoAlarm[] = [
  { id: 1001, fibreId: 2, type: 'High Loss', severity: 'major', status: 'active', localization: 12.4, timestamp: '2026-04-02T09:37:00.000Z' },
  { id: 1002, fibreId: 4, type: 'High Loss', severity: 'major', status: 'active', localization: 6.8, timestamp: '2026-04-02T09:32:00.000Z' },
  { id: 1003, fibreId: 7, type: 'Fiber Cut', severity: 'critical', status: 'active', localization: 11.2, timestamp: '2026-04-02T09:18:00.000Z' },
  { id: 1004, fibreId: 8, type: 'Fiber Cut', severity: 'critical', status: 'active', localization: 3.9, timestamp: '2026-04-02T08:10:00.000Z' },
  { id: 1005, fibreId: 9, type: 'High Loss', severity: 'major', status: 'active', localization: 8.5, timestamp: '2026-04-02T08:42:00.000Z' },
  { id: 1006, fibreId: 10, type: 'High Loss', severity: 'minor', status: 'cleared', localization: 10.1, timestamp: '2026-04-02T08:53:00.000Z' },
];

export const demoPerformances: DemoPerformance[] = [
  { id: 1, fibreId: 1, mttr: 1.8, mtbf: 216, recordedAt: '2026-04-02T09:00:00.000Z' },
  { id: 2, fibreId: 2, mttr: 3.4, mtbf: 132, recordedAt: '2026-04-02T09:00:00.000Z' },
  { id: 3, fibreId: 7, mttr: 6.2, mtbf: 81, recordedAt: '2026-04-02T09:00:00.000Z' },
  { id: 4, fibreId: 8, mttr: 8.1, mtbf: 64, recordedAt: '2026-04-02T09:00:00.000Z' },
];

const latestMeasurementByFibre = new Map<number, DemoMeasurement>(
  demoMeasurements
    .slice()
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .map((measurement) => [measurement.fibreId, measurement])
);

const buildFibrePath = (source: DemoRTU, destination: DemoRTU): DemoRoutePathPoint[] => [
  [Number(source.locationLatitude.toFixed(6)), Number(source.locationLongitude.toFixed(6))],
  [Number(destination.locationLatitude.toFixed(6)), Number(destination.locationLongitude.toFixed(6))],
];

const toRouteStatus = (status: DemoFibreStatus): 'active' | 'inactive' | 'skipped' => {
  if (status === 'broken') return 'inactive';
  if (status === 'degraded') return 'skipped';
  return 'active';
};

const getPulseWidth = (length: number): string => {
  if (length >= 30) return '100 ns';
  if (length >= 20) return '50 ns';
  return '30 ns';
};

const getMode = (measurement: DemoMeasurement): 'auto' | 'manual' | 'scheduled' => {
  if (measurement.testResult === 'fail') return 'manual';
  if (measurement.wavelength === 1625) return 'scheduled';
  return 'auto';
};

export const demoFiberRoutes: DemoFiberRoute[] = demoFibres.map((fibre) => {
  const rtu = demoRtus.find((item) => item.id === fibre.fromRtuId);
  const latestMeasurement = latestMeasurementByFibre.get(fibre.id);
  const destinationRtu = demoRtus.find((item) => item.id === fibre.toRtuId);

  if (!rtu || !destinationRtu) throw new Error(`Data missing for fibre ${fibre.id}`);

  return {
    id: fibre.id,
    routeName: `${rtu.name} -> ${destinationRtu.name} (${fibre.name})`,
    source: rtu.name,
    destination: destinationRtu.name,
    sourceRtuId: rtu.id,
    destinationRtuId: destinationRtu.id,
    fiberStatus: fibre.status,
    routeStatus: toRouteStatus(fibre.status),
    lengthKm: fibre.length,
    attenuationDb: latestMeasurement?.attenuation ?? 0,
    reflectionEvents: latestMeasurement?.testResult === 'fail',
    lastTestTime: latestMeasurement?.timestamp || rtu.lastSeen,
    path: buildFibrePath(rtu, destinationRtu),
  };
});

export const demoOtdrTests: DemoOtdrTest[] = demoMeasurements.map((measurement) => {
  const fibre = demoFibres.find((item) => item.id === measurement.fibreId);
  if (!fibre) throw new Error(`Fibre not found for measurement ${measurement.id}`);

  return {
    id: measurement.id,
    rtuId: fibre.fromRtuId,
    routeId: fibre.id,
    mode: getMode(measurement),
    pulseWidth: getPulseWidth(fibre.length),
    dynamicRangeDb: Number((measurement.attenuation + 12).toFixed(1)),
    wavelengthNm: measurement.wavelength,
    result: measurement.testResult,
    testedAt: measurement.timestamp,
  };
});

export const demoAlarms = demoFibreAlarms.map((alarm) => {
  const fibre = demoFibres.find((item) => item.id === alarm.fibreId);
  const rtu = fibre ? demoRtus.find((item) => item.id === fibre.fromRtuId) : undefined;

  if (!fibre || !rtu) throw new Error(`Fibre or RTU not found for alarm ${alarm.id}`);

  return {
    id: alarm.id,
    rtuId: rtu.id,
    fibreId: fibre.id,
    routeId: fibre.id,
    severity: alarm.severity,
    lifecycleStatus: alarm.status === 'active' ? 'active' as DemoAlarmLifecycle : 'resolved' as DemoAlarmLifecycle,
    alarmType: alarm.type,
    message: alarm.type === 'Fiber Cut'
        ? `Coupure fibre détectée sur ${rtu.name} (${fibre.name}).`
        : `Perte élevée détectée sur ${rtu.name} (${fibre.name}).`,
    location: rtu.locationAddress,
    localizationKm: `KM ${alarm.localization.toFixed(1)}`,
    owner: 'Emulator NQMS',
    occurredAt: alarm.timestamp,
  };
});
