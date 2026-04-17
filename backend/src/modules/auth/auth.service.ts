import bcrypt from 'bcryptjs';
import { supabase } from '../../config/supabase.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 12;

export async function register(input: RegisterInput): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Check slug + email uniqueness
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .or(`owner_email.eq.${input.email},slug.eq.${input.slug}`)
    .maybeSingle();

  if (existing) throw new ConflictError('Email or slug already in use');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      owner_email: input.email,
      password_hash: passwordHash,
      business_name: input.businessName,
      slug: input.slug,
    })
    .select('id, owner_email, business_name, plan, wa_phone_number_id')
    .single();

  if (error || !business) throw new Error('Failed to create business');

  const accessToken = signAccessToken({
    sub: business.id,
    email: business.owner_email,
    name: business.business_name,
    plan: business.plan,
    waPhoneId: business.wa_phone_number_id,
  });
  const refreshToken = signRefreshToken(business.id);

  return { accessToken, refreshToken };
}

export async function login(input: LoginInput): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, owner_email, password_hash, business_name, plan, wa_phone_number_id, active')
    .eq('owner_email', input.email)
    .maybeSingle();

  if (!business || !business.active) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(input.password, business.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const accessToken = signAccessToken({
    sub: business.id,
    email: business.owner_email,
    name: business.business_name,
    plan: business.plan,
    waPhoneId: business.wa_phone_number_id,
  });
  const refreshToken = signRefreshToken(business.id);

  return { accessToken, refreshToken };
}

export async function refresh(token: string): Promise<{ accessToken: string }> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, owner_email, business_name, plan, wa_phone_number_id, active')
    .eq('id', payload.sub)
    .maybeSingle();

  if (!business || !business.active) throw new UnauthorizedError('Business not found');

  const accessToken = signAccessToken({
    sub: business.id,
    email: business.owner_email,
    name: business.business_name,
    plan: business.plan,
    waPhoneId: business.wa_phone_number_id,
  });

  return { accessToken };
}
