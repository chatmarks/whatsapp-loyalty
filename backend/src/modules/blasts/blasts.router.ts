import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listHandler, createHandler, sendHandler, deleteHandler } from './blasts.controller.js';

export const blastsRouter = Router();

blastsRouter.use(authMiddleware);

blastsRouter.get('/', listHandler);
blastsRouter.post('/', createHandler);
blastsRouter.post('/:id/send', sendHandler);
blastsRouter.delete('/:id', deleteHandler);
