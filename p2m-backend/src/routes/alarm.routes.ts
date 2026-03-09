import { Router } from 'express';
import {
  acknowledgeAlarm,
  createAlarm,
  getAlarmById,
  getAlarms,
  resolveAlarm,
} from '../controllers/alarmController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAlarms);
router.get('/:id', getAlarmById);
router.post('/', authMiddleware, requireRole(['admin', 'user']), createAlarm);
router.patch('/:id/acknowledge', authMiddleware, requireRole(['admin', 'user']), acknowledgeAlarm);
router.patch('/:id/resolve', authMiddleware, requireRole(['admin', 'user']), resolveAlarm);

export default router;
