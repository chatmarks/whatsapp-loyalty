import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
import { env } from '../config/env.js';
import type { Plan } from '../types/database.js';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Bypass: skip auth when DEV_BUSINESS_ID is set and no token provided.
  // Setting DEV_BUSINESS_ID is an explicit opt-in — never set it in real multi-tenant production.
  if (env.DEV_BUSINESS_ID && !req.headers.authorization) {
    req.business = {
      id: env.DEV_BUSINESS_ID,
      business_name: 'Dev Business',
      plan: 'pro' as Plan,
      wa_phone_number_id: null,
    };
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing Bearer token'));
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.business = {
      id: payload.sub,
      business_name: payload.name,
      plan: payload.plan as Plan,
      wa_phone_number_id: payload.waPhoneId,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
