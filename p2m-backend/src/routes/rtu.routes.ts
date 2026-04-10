import { Router } from 'express';
import {
  createRTU,
  deleteRTU,
  getRtuEmulatorThresholdsController,
  getRTUById,
  getRTUs,
  queryRtuEmulator,
  updateRtuEmulatorThresholdsController,
  updateRTU,
} from '../controllers/rtuController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getRTUs);
router.post('/emulator/query', queryRtuEmulator);
router.get('/emulator/thresholds', authMiddleware, requireRole(['admin', 'user', 'customer']), getRtuEmulatorThresholdsController);
router.put('/emulator/thresholds', authMiddleware, requireRole(['admin', 'user']), updateRtuEmulatorThresholdsController);
router.get('/:id', getRTUById);
router.post('/', authMiddleware, requireRole(['admin']), createRTU);
router.put('/:id', authMiddleware, requireRole(['admin']), updateRTU);
router.delete('/:id', authMiddleware, requireRole(['admin']), deleteRTU);

export default router;
