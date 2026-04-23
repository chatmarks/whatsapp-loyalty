// Frontend types mirroring API response shapes

export type Plan = 'free' | 'starter' | 'pro';
export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export type VoucherType = 'reward' | 'manual' | 'birthday' | 'winback';
export type BlastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface Business {
  id: string;
  owner_email: string;
  business_name: string;
  slug: string;
  phone_display: string | null;
  wa_phone_number_id: string | null;
  wa_phone_number: string | null;
  plan: Plan;
  stamps_per_reward: number;
  reward_description: string;
  stamp_count: number;
  reward_stages: Array<{ stamp: number; description: string; emoji?: string }>;
  message_templates: Record<string, string> | null;
  blast_count_this_week: number;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  youtube_url: string | null;
  timezone: string;
  locale: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessStats {
  memberCount: number;
  orderCount: number;
  stampTotal: number;
  vouchersActive: number;
  vouchersIssued: number;
  vouchersClaimed: number;
}

export interface Customer {
  id: string;
  business_id: string;
  phone_display: string;
  display_name: string | null;
  wa_contact_name: string | null;
  customer_code: string | null;
  total_stamps: number;
  lifetime_stamps: number;
  current_tier_id: string | null;
  opted_in_at: string;
  opted_out_at: string | null;
  last_interaction_at: string | null;
  referral_code: string | null;
  wallet_token: string | null;
  created_at: string;
}

export interface StampEvent {
  id: string;
  amount: number;
  source: 'manual' | 'order' | 'referral' | 'keyword';
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  description: string;
  discount_type: string | null;
  discount_value: number | null;
  issued_at: string;
  expires_at: string | null;
  claimed_at: string | null;
  redeemed_at: string | null;
}

export interface MembershipTier {
  id: string;
  name: string;
  min_lifetime_stamps: number;
  stamp_multiplier: number;
  perks: Array<{ label: string; description: string }>;
  badge_color: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  tax_rate: number;
  active: boolean;
  sort_order: number;
}

export interface OrderLineItem {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
}

export interface Order {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  source: 'admin' | 'client_form';
  line_items: OrderLineItem[];
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  stamps_awarded: number;
  remark: string | null;
  created_at: string;
}

export interface BlastCampaign {
  id: string;
  name: string;
  template_name: string;
  audience: string;
  status: BlastStatus;
  recipient_count: number | null;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiSuccess<T> {
  data: T;
}
