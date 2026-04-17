import { Router } from 'express';
import { authRateLimit } from '../../middleware/rateLimiter.js';
import { registerHandler, loginHandler, refreshHandler, logoutHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, registerHandler);
authRouter.post('/login', authRateLimit, loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
