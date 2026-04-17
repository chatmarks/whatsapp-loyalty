import { supabase } from '../../config/supabase.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { Voucher } from '../../types/database.js';
import type { IssueVoucherInput, ListVouchersInput } from './vouchers.schema.js';
import type { PaginatedResponse } from '../../types/api.js';

export async function listVouchers(
  businessId: string,
  input: ListVouchersInput,
): Promise<PaginatedResponse<Voucher>> {
  const offset = (input.page - 1) * input.pageSize;

  let query = supabase
    .from('vouchers')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('issued_at', { ascending: false })
    .range(offset, offset + input.pageSize - 1);

  if (input.customerId) query = query.eq('customer_id', input.customerId);
  if (input.status === 'active') query = query.is('redeemed_at', null).is('claimed_at', null);
  if (input.status === 'claimed') query = query.not('claimed_at', 'is', null);
  if (input.status === 'redeemed') query = query.not('redeemed_at', 'is', null);

  const { data, count, error } = await query;
  if (error) throw new Error('Failed to fetch vouchers');

  return {
    data: (data ?? []) as Voucher[],
    total: count ?? 0,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function issueVoucher(
  businessId: string,
  input: IssueVoucherInput,
): Promise<Voucher> {
  const { data, error } = await supabase
    .from('vouchers')
    .insert({
      business_id: businessId,
      customer_id: input.customerId,
      type: input.type,
      description: input.description,
      discount_type: input.discountType ?? null,
      discount_value: input.discountValue ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Failed to issue voucher');
  return data as Voucher;
}

export async function redeemVoucher(businessId: string, code: string): Promise<Voucher> {
  const { data: voucher } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code)
    .eq('business_id', businessId)
    .single();

  if (!voucher) throw new NotFoundError('Voucher');
  if (voucher.redeemed_at) throw new ConflictError('Voucher already redeemed');
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    throw new ConflictError('Voucher expired');
  }

  const { data: updated, error } = await supabase
    .from('vouchers')
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: businessId })
    .eq('id', voucher.id)
    .select('*')
    .single();

  if (error || !updated) throw new Error('Failed to redeem voucher');
  return updated as Voucher;
}

export async function claimVoucher(businessId: string, code: string): Promise<Voucher> {
  const { data: voucher } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code)
    .eq('business_id', businessId)
    .single();

  if (!voucher) throw new NotFoundError('Voucher');
  if (voucher.claimed_at) throw new ConflictError('Voucher already claimed');

  const { data: updated, error } = await supabase
    .from('vouchers')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', voucher.id)
    .select('*')
    .single();

  if (error || !updated) throw new Error('Failed to claim voucher');
  return updated as Voucher;
}
