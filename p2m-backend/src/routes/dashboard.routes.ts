import { Router } from 'express';
import {
  getDashboardStats,
  getRecentOtdrTests,
  getRouteAttenuationTrend,
  getTopology,
} from '../controllers/dashboardController';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/topology', getTopology);
router.get('/otdr-recent', getRecentOtdrTests);
router.get('/attenuation-trend/:routeId', getRouteAttenuationTrend);

export default router;
