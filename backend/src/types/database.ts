// Supabase row types matching the DB schema

export type Plan = 'free' | 'starter' | 'pro';
export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export type OrderSource = 'admin' | 'client_form';
export type StampSource = 'manual' | 'order' | 'referral';
export type VoucherType = 'reward' | 'manual' | 'birthday' | 'winback';
export type DiscountType = 'percent' | 'fixed' | 'free_item';
export type BlastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type BlastAudience = 'all' | `tier:${string}` | 'inactive_30';
export type NotificationEventType =
  | 'stamp_issued'
  | 'voucher_issued'
  | 'blast'
  | 'opt_in'
  | 'opt_out'
  | 'order_confirmed';
export type NotificationStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Business {
  id: string;
  owner_email: string;
  password_hash: string;
  business_name: string;
  slug: string;
  phone_display: string | null;
  wa_phone_number_id: string | null;
  wa_access_token_enc: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  stamps_per_reward: number;
  reward_description: string;
  stamp_count: number;
  reward_stages: Array<{ stamp: number; description: string }>;
  blast_count_this_week: number;
  blast_week_reset_at: string | null;
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

export interface Customer {
  id: string;
  business_id: string;
  phone_enc: string;
  phone_hash: string;
  display_name: string | null;
  wa_contact_name: string | null;
  total_stamps: number;
  lifetime_stamps: number;
  current_tier_id: string | null;
  opted_in_at: string;
  opt_in_ip: string | null;
  opted_out_at: string | null;
  last_interaction_at: string | null;
  referral_code: string | null;
  referred_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StampEvent {
  id: string;
  business_id: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  source: StampSource;
  issued_by: string | null;
  wa_message_id: string | null;
  created_at: string;
}

export interface Voucher {
  id: string;
  business_id: string;
  customer_id: string;
  code: string;
  type: VoucherType;
  description: string;
  discount_type: DiscountType | null;
  discount_value: number | null;
  issued_at: string;
  expires_at: string | null;
  claimed_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
  order_id: string | null;
  created_at: string;
}

export interface MembershipTier {
  id: string;
  business_id: string;
  name: string;
  min_lifetime_stamps: number;
  stamp_multiplier: number;
  perks: Array<{ label: string; description: string }>;
  badge_color: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  tax_rate: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  business_id: string;
  customer_id: string | null;
  status: OrderStatus;
  source: OrderSource;
  line_items: OrderLineItem[];
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  total: number;
  voucher_id: string | null;
  payment_method: string | null;
  stamps_awarded: number;
  remark: string | null;
  wa_notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlastCampaign {
  id: string;
  business_id: string;
  name: string;
  template_name: string;
  template_params: Record<string, string> | null;
  audience: string;
  status: BlastStatus;
  recipient_count: number | null;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  blast_id: string | null;
  order_id: string | null;
  event_type: NotificationEventType;
  wa_message_id: string | null;
  status: NotificationStatus;
  error_detail: string | null;
  created_at: string;
}
