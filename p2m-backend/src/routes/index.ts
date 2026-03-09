import { Router } from 'express';
import alarmRoutes from './alarm.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import rtuRoutes from './rtu.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/rtu', rtuRoutes);
router.use('/alarms', alarmRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
