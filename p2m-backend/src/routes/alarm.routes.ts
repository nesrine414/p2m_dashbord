import { Router } from 'express';
import {
  acknowledgeAlarm,
  createAlarm,
  getAlarmById,
  getAlarms,
  resolveAlarm,
  inProgressAlarm,
  resolvedAlarm,
  closeAlarm,
} from '../controllers/alarmController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAlarms);
router.get('/:id', getAlarmById);
router.post('/', authMiddleware, requireRole(['admin', 'user', 'customer']), createAlarm);
router.patch('/:id/acknowledge', authMiddleware, requireRole(['admin', 'user', 'customer']), acknowledgeAlarm);
router.patch('/:id/resolve', authMiddleware, requireRole(['admin', 'user', 'customer']), resolveAlarm);
router.patch('/:id/in-progress', authMiddleware, requireRole(['admin', 'user', 'customer']), inProgressAlarm);
router.patch('/:id/resolved', authMiddleware, requireRole(['admin', 'user', 'customer']), resolvedAlarm);
router.patch('/:id/close', authMiddleware, requireRole(['admin', 'user', 'customer']), closeAlarm);

export default router;
