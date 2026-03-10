import { Router } from 'express';
import { getDashboardStats, getRecentOtdrTests, getTopology } from '../controllers/dashboardController';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/topology', getTopology);
router.get('/otdr-recent', getRecentOtdrTests);

export default router;
