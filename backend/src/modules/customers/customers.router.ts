import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listHandler, getHandler, deleteHandler } from './customers.controller.js';

export const customersRouter = Router();

customersRouter.use(authMiddleware);

customersRouter.get('/', listHandler);
customersRouter.get('/:id', getHandler);
customersRouter.delete('/:id', deleteHandler);
