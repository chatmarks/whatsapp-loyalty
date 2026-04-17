import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listHandler, createHandler, updateHandler, deleteHandler, sortHandler } from './products.controller.js';

export const productsRouter = Router();

productsRouter.use(authMiddleware);

productsRouter.get('/', listHandler);
productsRouter.post('/', createHandler);
productsRouter.patch('/sort', sortHandler);
productsRouter.patch('/:id', updateHandler);
productsRouter.delete('/:id', deleteHandler);
