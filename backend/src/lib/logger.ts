import pino from 'pino';
import { env } from '../config/env.js';

// PII-safe logger — never include phone numbers or message bodies in log calls
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
  // Redact any accidental PII fields at the transport level
  redact: {
    paths: ['phone', 'phone_enc', 'phone_hash', 'body', 'message_body', 'text'],
    censor: '[REDACTED]',
  },
});
