import { Router } from 'express';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, requireRole(['admin', 'user', 'customer']), getNotifications);
router.patch('/read-all', authMiddleware, requireRole(['admin', 'user', 'customer']), markAllNotificationsRead);
router.patch('/:id/read', authMiddleware, requireRole(['admin', 'user', 'customer']), markNotificationRead);

export default router;
