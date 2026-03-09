import { Router } from 'express';
import { getDashboardStats, getTopology } from '../controllers/dashboardController';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/topology', getTopology);

export default router;
