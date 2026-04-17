import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listHandler, getHandler, createHandler, updateStatusHandler } from './orders.controller.js';

export const ordersRouter = Router();

ordersRouter.use(authMiddleware);

ordersRouter.get('/', listHandler);
ordersRouter.get('/:id', getHandler);
ordersRouter.post('/', createHandler);
ordersRouter.patch('/:id/status', updateStatusHandler);
