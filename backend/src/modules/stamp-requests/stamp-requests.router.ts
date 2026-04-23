import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import * as Service from './stamp-requests.service.js';

export const stampRequestsRouter = Router();

stampRequestsRouter.use(authMiddleware);

/** GET /stamp-requests/pending — list all pending requests for this business. */
stampRequestsRouter.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await Service.listPending(req.business.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /stamp-requests/:id/approve */
stampRequestsRouter.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Service.approveRequest(req.business.id, req.params['id'] as string);
    res.json({ data: { approved: true } });
  } catch (err) {
    next(err);
  }
});

/** POST /stamp-requests/:id/decline */
stampRequestsRouter.post('/:id/decline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Service.declineRequest(req.business.id, req.params['id'] as string);
    res.json({ data: { declined: true } });
  } catch (err) {
    next(err);
  }
});
