// Typed API request/response shapes

import type { Business, Customer } from './database.js';

// Attach business to request after JWT verification
declare global {
  namespace Express {
    interface Request {
      business: Pick<Business, 'id' | 'business_name' | 'plan' | 'wa_phone_number_id'>;
    }
  }
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Business stats shape returned by /businesses/me/stats
export interface BusinessStats {
  memberCount: number;
  orderCount: number;
  stampTotal: number;
  vouchersActive: number;
  vouchersIssued: number;
  vouchersClaimed: number;
}

// Customer without PII fields (phone_enc, phone_hash never exposed)
export type SafeCustomer = Omit<Customer, 'phone_enc' | 'phone_hash'> & {
  phone_display: string; // masked, e.g. +49 *** *** 1234
};
