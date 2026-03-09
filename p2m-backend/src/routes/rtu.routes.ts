import { Router } from 'express';
import {
  createRTU,
  deleteRTU,
  getRTUById,
  getRTUs,
  updateRTU,
} from '../controllers/rtuController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getRTUs);
router.get('/:id', getRTUById);
router.post('/', authMiddleware, requireRole(['admin']), createRTU);
router.put('/:id', authMiddleware, requireRole(['admin']), updateRTU);
router.delete('/:id', authMiddleware, requireRole(['admin']), deleteRTU);

export default router;
