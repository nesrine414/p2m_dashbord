import { Router } from 'express';
import { postPanneRiskPrediction } from '../controllers/predictionController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/panne-risk',
  authMiddleware,
  requireRole(['admin', 'user', 'customer']),
  postPanneRiskPrediction
);

export default router;
