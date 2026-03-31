import { Router } from 'express';
import { postChatMessage } from '../controllers/aiController';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/chat', authMiddleware, requireRole(['admin', 'user', 'customer']), postChatMessage);

export default router;
