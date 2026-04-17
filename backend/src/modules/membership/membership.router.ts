import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listHandler, createHandler, updateHandler, deleteHandler } from './membership.controller.js';

export const membershipRouter = Router();

membershipRouter.use(authMiddleware);

membershipRouter.get('/tiers', listHandler);
membershipRouter.post('/tiers', createHandler);
membershipRouter.patch('/tiers/:id', updateHandler);
membershipRouter.delete('/tiers/:id', deleteHandler);
