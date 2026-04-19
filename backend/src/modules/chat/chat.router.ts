import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listConversations } from './chat.service.js';

const chatRouter = Router();
chatRouter.use(authMiddleware);

chatRouter.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await listConversations(req.business.id);
    res.json({ data: conversations });
  } catch (err) {
    next(err);
  }
});

export { chatRouter };
