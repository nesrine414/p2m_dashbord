import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import defaultThresholds from '../config/rtuEmulatorThresholds.json';

export interface EmulatorNumericThreshold {
  warning: number;
  critical: number;
  unit: string;
}

export interface EmulatorThresholdsConfig {
  rtu: {
    temperatureC: EmulatorNumericThreshold;
    heartbeatAgeMinutes: EmulatorNumericThreshold;
    averageAttenuationDb: EmulatorNumericThreshold;
  };
  fibre: {
    attenuationDb: EmulatorNumericThreshold;
    measurementAgeMinutes: EmulatorNumericThreshold;
  };
}

const fileCandidates = [
  path.resolve(process.cwd(), 'src/config/rtuEmulatorThresholds.json'),
  path.resolve(__dirname, '../config/rtuEmulatorThresholds.json'),
];

const getThresholdsFilePath = (): string => {
  const existingCandidate = fileCandidates.find((candidate) => existsSync(candidate));
  return existingCandidate || fileCandidates[0];
};

const cloneThresholds = (value: EmulatorThresholdsConfig): EmulatorThresholdsConfig =>
  JSON.parse(JSON.stringify(value)) as EmulatorThresholdsConfig;

const parseFiniteNonNegative = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Number(parsed.toFixed(3));
};

const validateMetric = (
  rawMetric: unknown,
  label: string,
  expectedUnit: string
): EmulatorNumericThreshold => {
  const metric = rawMetric as Partial<EmulatorNumericThreshold> | null | undefined;
  const warning = parseFiniteNonNegative(metric?.warning);
  const critical = parseFiniteNonNegative(metric?.critical);
  const unit = typeof metric?.unit === 'string' ? metric.unit : '';

  if (warning === null || critical === null) {
    throw new Error(`Invalid thresholds for ${label}: warning and critical must be non-negative numbers.`);
  }

  if (warning >= critical) {
    throw new Error(`Invalid thresholds for ${label}: warning must be strictly lower than critical.`);
  }

  if (unit.trim() !== expectedUnit) {
    throw new Error(`Invalid unit for ${label}: expected "${expectedUnit}".`);
  }

  return { warning, critical, unit: expectedUnit };
};

const validateThresholdsConfig = (raw: unknown): EmulatorThresholdsConfig => {
  const source = raw as Record<string, unknown> | null;
  if (!source || typeof source !== 'object') {
    throw new Error('Invalid thresholds payload.');
  }

  const rtuSource = source.rtu as Record<string, unknown> | undefined;
  const fibreSource = source.fibre as Record<string, unknown> | undefined;

  if (!rtuSource || !fibreSource) {
    throw new Error('Threshold payload must contain both rtu and fibre sections.');
  }

  return {
    rtu: {
      temperatureC: validateMetric(rtuSource.temperatureC, 'rtu.temperatureC', 'C'),
      heartbeatAgeMinutes: validateMetric(rtuSource.heartbeatAgeMinutes, 'rtu.heartbeatAgeMinutes', 'min'),
      averageAttenuationDb: validateMetric(rtuSource.averageAttenuationDb, 'rtu.averageAttenuationDb', 'dB'),
    },
    fibre: {
      attenuationDb: validateMetric(fibreSource.attenuationDb, 'fibre.attenuationDb', 'dB'),
      measurementAgeMinutes: validateMetric(fibreSource.measurementAgeMinutes, 'fibre.measurementAgeMinutes', 'min'),
    },
  };
};

let cachedThresholds: EmulatorThresholdsConfig = validateThresholdsConfig(defaultThresholds);

const loadThresholdsFromFile = async (): Promise<EmulatorThresholdsConfig> => {
  const filePath = getThresholdsFilePath();

  try {
    const fileContent = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(fileContent) as unknown;
    const validated = validateThresholdsConfig(parsed);
    cachedThresholds = validated;
    return cloneThresholds(validated);
  } catch {
    return cloneThresholds(cachedThresholds);
  }
};

export const getRtuEmulatorThresholds = (): EmulatorThresholdsConfig => cloneThresholds(cachedThresholds);

export const refreshRtuEmulatorThresholds = async (): Promise<EmulatorThresholdsConfig> =>
  loadThresholdsFromFile();

export const updateRtuEmulatorThresholds = async (
  payload: unknown
): Promise<EmulatorThresholdsConfig> => {
  const validated = validateThresholdsConfig(payload);
  const filePath = getThresholdsFilePath();

  await writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  cachedThresholds = validated;

  return cloneThresholds(validated);
};

export const getRtuEmulatorThresholdSource = (): string => getThresholdsFilePath();
