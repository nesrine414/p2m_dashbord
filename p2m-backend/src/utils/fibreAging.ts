export type FibreAgingStatus = 'normal' | 'aging' | 'critical';

const toFinitePositive = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseThreshold = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const getFibreAgingWarningThreshold = (): number =>
  parseThreshold(process.env.FIBRE_AGING_WARNING_DB_PER_KM, 0.3);

export const getFibreAgingCriticalThreshold = (): number => {
  const warning = getFibreAgingWarningThreshold();
  const critical = parseThreshold(process.env.FIBRE_AGING_CRITICAL_DB_PER_KM, 0.4);

  if (critical <= warning) {
    return Number((warning + 0.1).toFixed(3));
  }

  return critical;
};

export const computeAttenuationPerKm = (
  attenuationDb: number | null | undefined,
  lengthKm: number | null | undefined
): number | null => {
  const attenuation = toFinitePositive(attenuationDb);
  const length = toFinitePositive(lengthKm);

  if (attenuation === null || length === null) {
    return null;
  }

  return Number((attenuation / length).toFixed(4));
};

export const classifyFibreAgingStatus = (
  attenuationPerKm: number | null,
  fallbackStatus?: string | null
): FibreAgingStatus => {
  if (fallbackStatus === 'broken') {
    return 'critical';
  }

  if (attenuationPerKm === null) {
    return 'normal';
  }

  const critical = getFibreAgingCriticalThreshold();
  const warning = getFibreAgingWarningThreshold();

  if (attenuationPerKm > critical) {
    return 'critical';
  }

  if (attenuationPerKm > warning) {
    return 'aging';
  }

  return 'normal';
};
