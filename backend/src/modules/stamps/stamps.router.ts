import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { issueHandler, listHandler } from './stamps.controller.js';

export const stampsRouter = Router();

stampsRouter.use(authMiddleware);
stampsRouter.get('/',      listHandler);
stampsRouter.post('/issue', issueHandler);
