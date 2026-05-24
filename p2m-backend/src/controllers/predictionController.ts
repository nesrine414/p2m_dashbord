import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { predictPanneRisk } from '../services/predictionService';

type PredictionRequestBody = {
  row?: Record<string, unknown>;
  rows?: Array<Record<string, unknown>>;
};

export const postPanneRiskPrediction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as PredictionRequestBody;
    const rows =
      Array.isArray(body.rows) && body.rows.length > 0
        ? body.rows
        : body.row
          ? [body.row]
          : [];

    if (!rows.length) {
      res.status(400).json({ error: 'row or rows is required' });
      return;
    }

    const payload = await predictPanneRisk(rows);

    res.json({
      ...payload,
      requestedBy: req.user?.username || 'anonymous',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ROWS_PROVIDED') {
      res.status(400).json({ error: 'No rows provided for prediction' });
      return;
    }

    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate panne prediction' });
  }
};
