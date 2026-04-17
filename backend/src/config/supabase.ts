import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Service-role client bypasses RLS — only use server-side, never expose to clients
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
