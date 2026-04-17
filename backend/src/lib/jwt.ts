import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;   // business id
  email: string;
  name: string;
  plan: string;
  waPhoneId: string | null;
}

const ACCESS_TTL = '8h';
const REFRESH_TTL = '30d';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(businessId: string): string {
  return jwt.sign({ sub: businessId, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: REFRESH_TTL,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; type: string };
  if (decoded.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  return decoded;
}
