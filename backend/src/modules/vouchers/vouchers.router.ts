import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { listHandler, issueHandler, redeemHandler, claimHandler } from './vouchers.controller.js';

export const vouchersRouter = Router();

vouchersRouter.use(authMiddleware);

vouchersRouter.get('/', listHandler);
vouchersRouter.post('/issue', issueHandler);
vouchersRouter.post('/:code/redeem', redeemHandler);
vouchersRouter.post('/:code/claim', claimHandler);
