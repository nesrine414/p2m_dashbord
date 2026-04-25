import { Router } from 'express';
import aiRoutes from './ai.routes';
import alarmRoutes from './alarm.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import notificationRoutes from './notification.routes';
import predictionRoutes from './prediction.routes';
import rtuRoutes from './rtu.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/rtu', rtuRoutes);
router.use('/alarms', alarmRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/predictions', predictionRoutes);

export default router;
