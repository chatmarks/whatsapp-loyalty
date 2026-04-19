import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  PHONE_HMAC_SECRET: z.string().min(32),
  PHONE_ENC_KEY: z.string().length(64), // 32-byte hex key

  // Meta / WhatsApp
  META_WA_TOKEN: z.string().min(1),
  META_WA_PHONE_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_VERIFY_TOKEN: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // App
  CLIENT_URL: z.string().url(),
  // Public URL of this backend — used to build stamp-card image links sent via WhatsApp.
  // Set to your Railway backend URL (e.g. https://my-app.railway.app). Optional.
  BACKEND_URL: z.string().url().optional(),

  // Dev only — bypass JWT auth when set; never set in production
  DEV_BUSINESS_ID: z.string().uuid().optional(),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
  // Intentionally using process.exit rather than throwing — misconfigured env is unrecoverable
  process.stderr.write(`[env] Missing or invalid env vars: ${missing}\n`);
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
