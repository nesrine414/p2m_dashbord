type PredictionRow = Record<string, unknown>;
type PredictionProvider = 'xgboost' | 'fallback';

const ML_PREDICT_URL = process.env.ML_PREDICT_URL || 'http://127.0.0.1:8001/predict';
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 20000);

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

const buildFallbackPredictions = (rows: PredictionRow[]): PredictionRow[] => {
  return rows.map((row) => {
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

    let probability = 0.08;

    probability += Math.min(0.26, alarmCount * 0.08);

    if (status === 'Offline') {
      probability += 0.28;
    } else if (status === 'Unreachable') {
      probability += 0.22;
    }

    if (fiberStatus === 'Broken') {
      probability += 0.24;
    } else if (fiberStatus === 'Degraded') {
      probability += 0.14;
    }

    if (routeStatus === 'Inactive') {
      probability += 0.12;
    } else if (routeStatus === 'Skipped') {
      probability += 0.06;
    }

    if (testResult === 'Fail') {
      probability += 0.14;
    }

    if (severity === 'Critical') {
      probability += 0.18;
    } else if (severity === 'Major') {
      probability += 0.1;
    } else if (severity === 'Minor') {
      probability += 0.05;
    }

    if (alarmType !== 'None') {
      probability += 0.07;
    }

    if (temperature > 37) {
      probability += Math.min(0.12, (temperature - 37) * 0.015);
    }

    if (attenuation > 10) {
      probability += Math.min(0.12, (attenuation - 10) * 0.01);
    }

    probability -= Math.min(0.18, Math.max(0, uptimePercent - 70) * 0.004);
    probability = Math.min(0.98, Math.max(0.02, probability));

    const predictionBinary = probability >= 0.5 ? 1 : 0;
    const predictionLabel = predictionBinary === 1 ? 'Panne' : 'Normal';

    return {
      ...row,
      prediction_binary: predictionBinary,
      prediction_label: predictionLabel,
      probability_panne: Number(probability.toFixed(6)),
      probability_normal: Number((1 - probability).toFixed(6)),
    };
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
    predictions = result.predictions;
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
