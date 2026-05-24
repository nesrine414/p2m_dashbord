type PredictionRow = Record<string, unknown>;
type PredictionProvider = 'xgboost' | 'fallback';

const ML_PREDICT_URL = process.env.ML_PREDICT_URL || 'http://127.0.0.1:8001/predict';
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 20000);
const ML_BLEND_WEIGHT = 0.35;
const SIGNAL_BLEND_WEIGHT = 1 - ML_BLEND_WEIGHT;
const PANNE_THRESHOLD = 0.5;

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringValue = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const pushDriver = (drivers: string[], condition: boolean, label: string): void => {
  if (condition) {
    drivers.push(label);
  }
};

const getTelemetrySignal = (row: PredictionRow): { probability: number; drivers: string[] } => {
  const status = toStringValue(row.rtu_status, 'Online');
  const fiberStatus = toStringValue(row.fiber_status, 'Normal');
  const routeStatus = toStringValue(row.route_status, 'Active');
  const testResult = toStringValue(row.test_result, 'Pass');
  const severity = toStringValue(row.severity, 'None');
  const alarmType = toStringValue(row.alarm_type, 'None');

  const alarmCount = toNumber(row.dashboard_nb_alarms_24h, 0);
  const uptimePercent = toNumber(row.dashboard_uptime_percent, 100);
  const attenuation = toNumber(row.dashboard_avg_attenuation ?? row.attenuation_db, 0);
  const temperature = toNumber(row.temperature_c, 25);

  let probability = 0.05;
  const drivers: string[] = [];

  probability += Math.min(0.24, alarmCount * 0.075);
  pushDriver(drivers, alarmCount > 0, `${alarmCount} active alarm(s)`);

  if (status === 'Offline') {
    probability += 0.33;
    drivers.push('RTU offline');
  } else if (status === 'Unreachable') {
    probability += 0.26;
    drivers.push('RTU unreachable');
  }

  if (fiberStatus === 'Broken') {
    probability += 0.34;
    drivers.push('fiber broken');
  } else if (fiberStatus === 'Degraded') {
    probability += 0.17;
    drivers.push('fiber degraded');
  }

  if (routeStatus === 'Inactive') {
    probability += 0.12;
    drivers.push('route inactive');
  } else if (routeStatus === 'Skipped') {
    probability += 0.05;
    drivers.push('route skipped');
  }

  if (testResult === 'Fail') {
    probability += 0.2;
    drivers.push('OTDR test failed');
  }

  if (severity === 'Critical') {
    probability += 0.22;
    drivers.push('critical alarm');
  } else if (severity === 'Major') {
    probability += 0.13;
    drivers.push('major alarm');
  } else if (severity === 'Minor') {
    probability += 0.06;
    drivers.push('minor alarm');
  }

  if (alarmType === 'Fiber Cut') {
    probability += 0.16;
    drivers.push('fiber cut alarm');
  } else if (alarmType === 'RTU Down') {
    probability += 0.14;
    drivers.push('RTU down alarm');
  } else if (alarmType === 'High Loss') {
    probability += 0.11;
    drivers.push('high loss alarm');
  } else if (alarmType !== 'None') {
    probability += 0.07;
    drivers.push('active alarm type');
  }

  if (temperature > 37) {
    probability += Math.min(0.15, (temperature - 37) * 0.018);
    drivers.push('high RTU temperature');
  }

  if (attenuation > 18) {
    probability += Math.min(0.18, (attenuation - 18) * 0.012);
    drivers.push('very high attenuation');
  } else if (attenuation > 10) {
    probability += Math.min(0.1, (attenuation - 10) * 0.012);
    drivers.push('high attenuation');
  }

  if (uptimePercent < 60) {
    probability += 0.18;
    drivers.push('low uptime');
  } else if (uptimePercent < 80) {
    probability += 0.09;
    drivers.push('reduced uptime');
  } else {
    probability -= Math.min(0.12, (uptimePercent - 80) * 0.006);
  }

  const noHardAlarm =
    status === 'Online' &&
    fiberStatus === 'Normal' &&
    routeStatus === 'Active' &&
    testResult === 'Pass' &&
    severity === 'None' &&
    alarmType === 'None' &&
    alarmCount === 0;

  if (noHardAlarm && attenuation < 8 && temperature < 35 && uptimePercent >= 90) {
    probability = Math.min(probability, 0.18);
  }

  return {
    probability: clamp(probability, 0.02, 0.98),
    drivers,
  };
};

const applyOperationalGuards = (row: PredictionRow, probability: number): number => {
  const status = toStringValue(row.rtu_status, 'Online');
  const fiberStatus = toStringValue(row.fiber_status, 'Normal');
  const testResult = toStringValue(row.test_result, 'Pass');
  const severity = toStringValue(row.severity, 'None');
  const alarmType = toStringValue(row.alarm_type, 'None');
  const alarmCount = toNumber(row.dashboard_nb_alarms_24h, 0);
  const uptimePercent = toNumber(row.dashboard_uptime_percent, 100);
  const attenuation = toNumber(row.dashboard_avg_attenuation ?? row.attenuation_db, 0);
  const temperature = toNumber(row.temperature_c, 25);

  let guarded = probability;

  if (fiberStatus === 'Broken' || alarmType === 'Fiber Cut') {
    guarded = Math.max(guarded, 0.86);
  }

  if (status === 'Offline' && (severity === 'Critical' || alarmType === 'RTU Down')) {
    guarded = Math.max(guarded, 0.82);
  }

  if (testResult === 'Fail' && (severity === 'Critical' || attenuation > 18)) {
    guarded = Math.max(guarded, 0.72);
  }

  if (
    status === 'Online' &&
    fiberStatus === 'Normal' &&
    testResult === 'Pass' &&
    severity === 'None' &&
    alarmType === 'None' &&
    alarmCount === 0 &&
    uptimePercent >= 90 &&
    attenuation < 8 &&
    temperature < 35
  ) {
    guarded = Math.min(guarded, 0.28);
  }

  return clamp(guarded, 0.02, 0.98);
};

const withPredictionFields = (
  row: PredictionRow,
  probability: number,
  signalProbability: number,
  drivers: string[],
  mlProbability?: number
): PredictionRow => {
  const probabilityPanne = Number(probability.toFixed(6));
  const predictionBinary = probabilityPanne >= PANNE_THRESHOLD ? 1 : 0;

  return {
    ...row,
    prediction_binary: predictionBinary,
    prediction_label: predictionBinary === 1 ? 'Panne' : 'Normal',
    probability_panne: probabilityPanne,
    probability_normal: Number((1 - probabilityPanne).toFixed(6)),
    probability_signal: Number(signalProbability.toFixed(6)),
    probability_ml_raw: mlProbability === undefined ? undefined : Number(mlProbability.toFixed(6)),
    risk_drivers: drivers,
  };
};

const buildFallbackPredictions = (rows: PredictionRow[]): PredictionRow[] => {
  return rows.map((row) => {
    const signal = getTelemetrySignal(row);
    const probability = applyOperationalGuards(row, signal.probability);
    return withPredictionFields(row, probability, signal.probability, signal.drivers);
  });
};

const calibrateMlPredictions = (inputRows: PredictionRow[], predictions: PredictionRow[]): PredictionRow[] => {
  return predictions.map((prediction, index) => {
    const sourceRow = inputRows[index] || prediction;
    const signal = getTelemetrySignal(sourceRow);
    const mlProbability = clamp(toNumber(prediction.probability_panne, signal.probability), 0.02, 0.98);
    const blendedProbability = ML_BLEND_WEIGHT * mlProbability + SIGNAL_BLEND_WEIGHT * signal.probability;
    const probability = applyOperationalGuards(sourceRow, blendedProbability);

    return withPredictionFields(
      prediction,
      probability,
      signal.probability,
      signal.drivers,
      mlProbability
    );
  });
};

const requestMlServer = async (rows: PredictionRow[]): Promise<{
  provider: PredictionProvider;
  predictions: PredictionRow[];
}> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const response = await fetch(ML_PREDICT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as {
      provider?: PredictionProvider;
      predictions?: PredictionRow[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || `ML server responded with ${response.status}`);
    }

    if (!Array.isArray(payload.predictions)) {
      throw new Error('Invalid ML server response');
    }

    return {
      provider: payload.provider || 'xgboost',
      predictions: payload.predictions,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const predictPanneRisk = async (rows: PredictionRow[]): Promise<{
  predictions: PredictionRow[];
  provider: PredictionProvider;
  summary: {
    total: number;
    normal: number;
    panne: number;
  };
}> => {
  if (!rows.length) {
    throw new Error('NO_ROWS_PROVIDED');
  }

  let provider: PredictionProvider = 'xgboost';
  let predictions: PredictionRow[];

  try {
    const result = await requestMlServer(rows);
    provider = result.provider;
    predictions = calibrateMlPredictions(rows, result.predictions);
  } catch (error) {
    console.warn('ML prediction fallback activated:', error);
    provider = 'fallback';
    predictions = buildFallbackPredictions(rows);
  }

  const normal = predictions.filter((row) => row.prediction_label === 'Normal').length;
  const panne = predictions.filter((row) => row.prediction_label === 'Panne').length;

  return {
    predictions,
    provider,
    summary: {
      total: predictions.length,
      normal,
      panne,
    },
  };
};
