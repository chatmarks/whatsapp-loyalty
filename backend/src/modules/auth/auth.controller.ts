import type { Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.schema.js';
import * as AuthService from './auth.service.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = RegisterSchema.parse(req.body);
    const tokens = await AuthService.register(input);
    res.status(201).json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = LoginSchema.parse(req.body);
    const tokens = await AuthService.login(input);
    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    const tokens = await AuthService.refresh(refreshToken);
    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  // Stateless JWT — client discards token; future: maintain revocation list in Redis
  res.json({ data: { message: 'Logged out' } });
}
