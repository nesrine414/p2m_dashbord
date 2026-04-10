import { databaseState } from '../config/database';
import { demoFibres, demoMeasurements, demoRtus } from '../data/demoData';
import { Fibre, Measurement, RTU } from '../models';
import {
  EmulatorNumericThreshold,
  EmulatorThresholdsConfig,
  getRtuEmulatorThresholdSource,
  refreshRtuEmulatorThresholds,
} from './rtuEmulatorThresholdsService';

type RtuStatus = 'online' | 'offline' | 'warning' | 'unreachable';
type FibreStatus = 'normal' | 'degraded' | 'broken';
type PowerStatus = 'normal' | 'failure';
type OtdrStatus = 'ready' | 'busy' | 'fault';
type TestResult = 'pass' | 'fail';

interface EvaluatedMetric {
  key: string;
  label: string;
  value: number | string | null;
  unit?: string;
  status: 'normal' | 'warning' | 'critical' | 'info';
  thresholds?: {
    warning: number;
    critical: number;
  };
}

interface EmulatorRtuRecord {
  id: number;
  name: string;
  ipAddress: string;
  serialNumber?: string | null;
  locationAddress?: string | null;
  status: RtuStatus;
  power: PowerStatus;
  temperature: number | null;
  otdrStatus: OtdrStatus | null;
}

interface EmulatorFibreRecord {
  id: number;
  rtuId: number;
  name: string;
  status: FibreStatus;
  lengthKm: number | null;
  measurement?: {
    attenuationDb: number | null;
    wavelength: 1310 | 1550 | 1625 | null;
    testResult: TestResult | null;
  };
}

export interface EmulatorQueryResult {
  requestedIpAddress: string;
  sampledAt: string;
  thresholdSource: string;
  rtu: {
    id: number;
    name: string;
    ipAddress: string;
    serialNumber?: string | null;
    locationAddress?: string | null;
    status: RtuStatus;
    metrics: {
      power: PowerStatus;
      otdrStatus: OtdrStatus | null;
      temperatureC: number | null;
      heartbeatAgeMinutes: number;
      averageAttenuationDb: number | null;
    };
    evaluations: EvaluatedMetric[];
  };
  fibres: Array<{
    id: number;
    name: string;
    status: FibreStatus;
    lengthKm: number | null;
    metrics: {
      attenuationDb: number | null;
      wavelength: 1310 | 1550 | 1625 | null;
      testResult: TestResult | null;
      measurementAgeMinutes: number;
    };
    evaluations: EvaluatedMetric[];
  }>;
}

const hashIp = (ipAddress: string): number =>
  ipAddress.split('.').reduce((acc, chunk) => acc + Number(chunk || 0), 0);

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const roundTo = (value: number, digits = 1): number => Number(value.toFixed(digits));

const evaluateNumericMetric = (
  key: string,
  label: string,
  value: number | null,
  threshold: EmulatorNumericThreshold
): EvaluatedMetric => {
  if (value === null || !Number.isFinite(value)) {
    return {
      key,
      label,
      value: null,
      unit: threshold.unit,
      status: 'info',
      thresholds: {
        warning: threshold.warning,
        critical: threshold.critical,
      },
    };
  }

  const status =
    value >= threshold.critical ? 'critical' : value >= threshold.warning ? 'warning' : 'normal';

  return {
    key,
    label,
    value: roundTo(value),
    unit: threshold.unit,
    status,
    thresholds: {
      warning: threshold.warning,
      critical: threshold.critical,
    },
  };
};

const buildHeartbeatAgeMinutes = (status: RtuStatus, seed: number): number => {
  switch (status) {
    case 'offline':
      return 45 + (seed % 30);
    case 'unreachable':
      return 90 + (seed % 45);
    case 'warning':
      return 12 + (seed % 10);
    default:
      return 1 + (seed % 6);
  }
};

const buildMeasurementAgeMinutes = (status: FibreStatus, seed: number): number => {
  switch (status) {
    case 'broken':
      return 75 + (seed % 25);
    case 'degraded':
      return 25 + (seed % 18);
    default:
      return 3 + (seed % 10);
  }
};

const buildSimulatedTemperature = (baseTemperature: number | null, status: RtuStatus, seed: number): number | null => {
  if (status === 'offline') {
    return 0;
  }

  const baseline = baseTemperature ?? 30;
  const offset = (seed % 5) - 1;

  if (status === 'warning') {
    return roundTo(clamp(baseline + offset + 5, 0, 60));
  }

  if (status === 'unreachable') {
    return roundTo(clamp(baseline + offset + 2, 0, 60));
  }

  return roundTo(clamp(baseline + offset, 0, 60));
};

const buildSimulatedAttenuation = (
  baseAttenuation: number | null,
  status: FibreStatus,
  seed: number
): number | null => {
  const baseline =
    baseAttenuation ?? (status === 'broken' ? 14.5 : status === 'degraded' ? 8.4 : 4.2);
  const jitter = ((seed % 9) - 4) * 0.2;
  const uplift = status === 'broken' ? 2.4 : status === 'degraded' ? 0.9 : 0;
  return roundTo(clamp(baseline + jitter + uplift, 0.2, 40));
};

const combineFibreStatus = (baseStatus: FibreStatus, evaluations: EvaluatedMetric[], testResult: TestResult | null): FibreStatus => {
  if (baseStatus === 'broken') {
    return 'broken';
  }

  if (evaluations.some((item) => item.status === 'critical')) {
    return 'broken';
  }

  if (baseStatus === 'degraded' || testResult === 'fail' || evaluations.some((item) => item.status === 'warning')) {
    return 'degraded';
  }

  return 'normal';
};

const combineRtuStatus = (
  rtu: EmulatorRtuRecord,
  evaluations: EvaluatedMetric[],
  fibreStatuses: FibreStatus[],
  heartbeatAgeMinutes: number,
  rtuThresholds: EmulatorThresholdsConfig['rtu']
): RtuStatus => {
  if (rtu.power === 'failure' || rtu.status === 'offline') {
    return 'offline';
  }

  if (rtu.status === 'unreachable' || heartbeatAgeMinutes >= rtuThresholds.heartbeatAgeMinutes.critical) {
    return 'unreachable';
  }

  if (
    rtu.status === 'warning' ||
    rtu.otdrStatus === 'fault' ||
    evaluations.some((item) => item.status === 'warning' || item.status === 'critical') ||
    fibreStatuses.some((status) => status !== 'normal')
  ) {
    return 'warning';
  }

  return 'online';
};

const extractLatestMeasurement = (measurements: Measurement[]): Measurement | null => {
  const sorted = measurements
    .slice()
    .sort((left, right) => new Date(right.get('timestamp') as Date).getTime() - new Date(left.get('timestamp') as Date).getTime());

  return sorted[0] ?? null;
};

const loadEmulatorDataFromDatabase = async (
  ipAddress: string
): Promise<{ rtu: EmulatorRtuRecord | null; fibres: EmulatorFibreRecord[] }> => {
  const rtu = await RTU.findOne({
    where: { ipAddress },
    order: [['id', 'ASC']],
  });

  if (!rtu) {
    return { rtu: null, fibres: [] };
  }

  const fibres = await Fibre.findAll({
    where: { rtuId: rtu.get('id') as number },
    include: [{ model: Measurement, as: 'measurements' }],
    order: [['id', 'ASC']],
  });

  const mappedFibres = fibres.map((fibre) => {
    const latestMeasurement = extractLatestMeasurement((fibre.get('measurements') as Measurement[] | undefined) ?? []);

    return {
      id: fibre.get('id') as number,
      rtuId: fibre.get('rtuId') as number,
      name: fibre.get('name') as string,
      status: fibre.get('status') as FibreStatus,
      lengthKm: (fibre.get('length') as number | null) ?? null,
      measurement: latestMeasurement
        ? {
            attenuationDb: (latestMeasurement.get('attenuation') as number | null) ?? null,
            wavelength: (latestMeasurement.get('wavelength') as 1310 | 1550 | 1625 | null) ?? null,
            testResult: (latestMeasurement.get('testResult') as TestResult | null) ?? null,
          }
        : undefined,
    } satisfies EmulatorFibreRecord;
  });

  return {
    rtu: {
      id: rtu.get('id') as number,
      name: rtu.get('name') as string,
      ipAddress: (rtu.get('ipAddress') as string | null) ?? ipAddress,
      serialNumber: (rtu.get('serialNumber') as string | null) ?? null,
      locationAddress: (rtu.get('locationAddress') as string | null) ?? null,
      status: rtu.get('status') as RtuStatus,
      power: ((rtu.get('power') as PowerStatus | null) ?? 'normal') as PowerStatus,
      temperature: (rtu.get('temperature') as number | null) ?? null,
      otdrStatus: (rtu.get('otdrStatus') as OtdrStatus | null) ?? null,
    },
    fibres: mappedFibres,
  };
};

const loadEmulatorDataFromDemo = (
  ipAddress: string
): { rtu: EmulatorRtuRecord | null; fibres: EmulatorFibreRecord[] } => {
  const rtu = demoRtus.find((item) => item.ipAddress === ipAddress);

  if (!rtu) {
    return { rtu: null, fibres: [] };
  }

  const fibres = demoFibres
    .filter((item) => item.fromRtuId === rtu.id)
    .map((fibre) => {
      const latestMeasurement = demoMeasurements
        .filter((measurement) => measurement.fibreId === fibre.id)
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];

      return {
        id: fibre.id,
        rtuId: fibre.fromRtuId,
        name: fibre.name,
        status: fibre.status,
        lengthKm: fibre.length,
        measurement: latestMeasurement
          ? {
              attenuationDb: latestMeasurement.attenuation,
              wavelength: latestMeasurement.wavelength,
              testResult: latestMeasurement.testResult,
            }
          : undefined,
      } satisfies EmulatorFibreRecord;
    });

  return {
    rtu: {
      id: rtu.id,
      name: rtu.name,
      ipAddress: rtu.ipAddress,
      serialNumber: rtu.serialNumber,
      locationAddress: rtu.locationAddress,
      status: rtu.status,
      power: rtu.power,
      temperature: rtu.temperature,
      otdrStatus: rtu.otdrStatus,
    },
    fibres,
  };
};

export const runRtuEmulatorQuery = async (ipAddress: string): Promise<EmulatorQueryResult | null> => {
  const normalizedIpAddress = ipAddress.trim();
  const thresholds = await refreshRtuEmulatorThresholds();
  const rtuThresholds = thresholds.rtu;
  const fibreThresholds = thresholds.fibre;
  const seed = hashIp(normalizedIpAddress);
  const sourceData = databaseState.connected
    ? await loadEmulatorDataFromDatabase(normalizedIpAddress)
    : loadEmulatorDataFromDemo(normalizedIpAddress);

  if (!sourceData.rtu) {
    return null;
  }

  const simulatedFibres = sourceData.fibres.map((fibre) => {
    const fibreSeed = seed + fibre.id;
    const attenuationDb = buildSimulatedAttenuation(fibre.measurement?.attenuationDb ?? null, fibre.status, fibreSeed);
    const measurementAgeMinutes = buildMeasurementAgeMinutes(fibre.status, fibreSeed);
    const evaluations = [
      evaluateNumericMetric('attenuationDb', 'Attenuation', attenuationDb, fibreThresholds.attenuationDb),
      evaluateNumericMetric(
        'measurementAgeMinutes',
        'Measurement age',
        measurementAgeMinutes,
        fibreThresholds.measurementAgeMinutes
      ),
      {
        key: 'testResult',
        label: 'Test result',
        value: fibre.measurement?.testResult ?? 'unknown',
        status: fibre.measurement?.testResult === 'fail' ? 'warning' : 'normal',
      } satisfies EvaluatedMetric,
    ];

    const status = combineFibreStatus(fibre.status, evaluations, fibre.measurement?.testResult ?? null);

    return {
      id: fibre.id,
      name: fibre.name,
      status,
      lengthKm: fibre.lengthKm,
      metrics: {
        attenuationDb,
        wavelength: fibre.measurement?.wavelength ?? null,
        testResult: fibre.measurement?.testResult ?? null,
        measurementAgeMinutes,
      },
      evaluations,
    };
  });

  const averageAttenuationDb =
    simulatedFibres.length > 0
      ? roundTo(
          simulatedFibres.reduce((sum, fibre) => sum + (fibre.metrics.attenuationDb ?? 0), 0) / simulatedFibres.length
        )
      : null;
  const heartbeatAgeMinutes = buildHeartbeatAgeMinutes(sourceData.rtu.status, seed);
  const temperatureC = buildSimulatedTemperature(sourceData.rtu.temperature, sourceData.rtu.status, seed);

  const rtuEvaluations = [
    evaluateNumericMetric('temperatureC', 'Temperature', temperatureC, rtuThresholds.temperatureC),
    evaluateNumericMetric(
      'heartbeatAgeMinutes',
      'Heartbeat age',
      heartbeatAgeMinutes,
      rtuThresholds.heartbeatAgeMinutes
    ),
    evaluateNumericMetric(
      'averageAttenuationDb',
      'Average attenuation',
      averageAttenuationDb,
      rtuThresholds.averageAttenuationDb
    ),
    {
      key: 'power',
      label: 'Power',
      value: sourceData.rtu.power,
      status: sourceData.rtu.power === 'failure' ? 'critical' : 'normal',
    } satisfies EvaluatedMetric,
    {
      key: 'otdrStatus',
      label: 'OTDR',
      value: sourceData.rtu.otdrStatus,
      status: sourceData.rtu.otdrStatus === 'fault' ? 'warning' : 'normal',
    } satisfies EvaluatedMetric,
  ];

  const rtuStatus = combineRtuStatus(
    sourceData.rtu,
    rtuEvaluations,
    simulatedFibres.map((item) => item.status),
    heartbeatAgeMinutes,
    rtuThresholds
  );

  return {
    requestedIpAddress: normalizedIpAddress,
    sampledAt: new Date().toISOString(),
    thresholdSource: getRtuEmulatorThresholdSource(),
    rtu: {
      id: sourceData.rtu.id,
      name: sourceData.rtu.name,
      ipAddress: sourceData.rtu.ipAddress,
      serialNumber: sourceData.rtu.serialNumber,
      locationAddress: sourceData.rtu.locationAddress,
      status: rtuStatus,
      metrics: {
        power: sourceData.rtu.power,
        otdrStatus: sourceData.rtu.otdrStatus,
        temperatureC,
        heartbeatAgeMinutes,
        averageAttenuationDb,
      },
      evaluations: rtuEvaluations,
    },
    fibres: simulatedFibres,
  };
};
