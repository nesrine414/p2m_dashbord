export type EmulatorIncidentType = 'rtu-down' | 'temperature' | 'high-loss' | 'fiber-cut';

const readNumber = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readBoolean = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

export const emulatorConfig = {
  enabled: readBoolean('EMULATOR_ENABLED', true),
  tickIntervalMs: readNumber('EMULATOR_TICK_INTERVAL_MS', 15000),
  incidentChancePerTick: Math.min(Math.max(readNumber('EMULATOR_INCIDENT_CHANCE', 0.7), 0.05), 1),
  maxConcurrentIncidents: Math.max(readNumber('EMULATOR_MAX_CONCURRENT_INCIDENTS', 3), 1),
  minResolutionDelayMs: readNumber('EMULATOR_MIN_RESOLUTION_DELAY_MS', 30000),
  maxResolutionDelayMs: readNumber('EMULATOR_MAX_RESOLUTION_DELAY_MS', 90000),
  temperatureWarningC: readNumber('EMULATOR_TEMPERATURE_WARNING_C', 40),
  temperatureCriticalC: readNumber('EMULATOR_TEMPERATURE_CRITICAL_C', 45),
  attenuationWarningDb: readNumber('EMULATOR_ATTENUATION_WARNING_DB', 12),
  attenuationCriticalDb: readNumber('EMULATOR_ATTENUATION_CRITICAL_DB', 18),
  measurementHistoryPointsPerFibre: Math.max(readNumber('EMULATOR_MEASUREMENT_HISTORY_POINTS_PER_FIBRE', 8), 2),
  measurementHistorySpacingMinutes: Math.max(readNumber('EMULATOR_MEASUREMENT_HISTORY_SPACING_MINUTES', 30), 5),
  fiberCutProbability: Math.min(Math.max(readNumber('EMULATOR_FIBER_CUT_PROBABILITY', 0.25), 0.05), 1),
  highLossProbability: Math.min(Math.max(readNumber('EMULATOR_HIGH_LOSS_PROBABILITY', 0.35), 0.05), 1),
  temperatureProbability: Math.min(Math.max(readNumber('EMULATOR_TEMPERATURE_PROBABILITY', 0.2), 0.05), 1),
  rtuDownProbability: Math.min(Math.max(readNumber('EMULATOR_RTU_DOWN_PROBABILITY', 0.2), 0.05), 1),
};

export const emulatorIncidentTypeSequence: EmulatorIncidentType[] = [
  'temperature',
  'high-loss',
  'rtu-down',
  'fiber-cut',
];

export const getRandomIncidentDurationMs = (): number => {
  const min = Math.min(emulatorConfig.minResolutionDelayMs, emulatorConfig.maxResolutionDelayMs);
  const max = Math.max(emulatorConfig.minResolutionDelayMs, emulatorConfig.maxResolutionDelayMs);

  if (max <= min) {
    return min;
  }

  return Math.floor(min + Math.random() * (max - min));
};
