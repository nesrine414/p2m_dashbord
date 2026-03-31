import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateAiChatResponse } from '../services/aiChatService';

export const postChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = req.body as { message?: string };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const payload = await generateAiChatResponse(message);

    res.json({
      ...payload,
      requestedBy: req.user?.username || 'anonymous',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate chatbot response' });
  }
};
