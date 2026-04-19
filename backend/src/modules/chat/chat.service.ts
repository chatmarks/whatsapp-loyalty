import { supabase } from '../../config/supabase.js';
import { decryptPhone, maskPhone } from '../../lib/crypto.js';

export interface Conversation {
  customer_id: string;
  display_name: string | null;
  wa_contact_name: string | null;
  phone_display: string;
  opted_out_at: string | null;
  last_body: string;
  last_direction: 'inbound' | 'outbound';
  last_message_at: string;
  last_status: string;
  unread: boolean;
}

export async function listConversations(businessId: string): Promise<Conversation[]> {
  const { data: messages } = await supabase
    .from('wa_messages')
    .select('customer_id, direction, body, status, created_at')
    .eq('business_id', businessId)
    .not('customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (!messages?.length) return [];

  // Keep only the latest message per customer
  const latestByCustomer = new Map<string, typeof messages[0]>();
  for (const msg of messages) {
    if (msg.customer_id && !latestByCustomer.has(msg.customer_id)) {
      latestByCustomer.set(msg.customer_id, msg);
    }
  }

  const customerIds = [...latestByCustomer.keys()];

  const { data: customers } = await supabase
    .from('customers')
    .select('id, display_name, wa_contact_name, opted_out_at, phone_enc')
    .eq('business_id', businessId)
    .in('id', customerIds);

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);

  return customerIds
    .flatMap((customerId) => {
      const msg = latestByCustomer.get(customerId)!;
      const c = customerMap.get(customerId);
      if (!c) return [];

      let phoneMasked = '***';
      if (typeof c.phone_enc === 'string' && c.phone_enc !== '[REDACTED]') {
        try {
          phoneMasked = maskPhone(decryptPhone(c.phone_enc));
        } catch {
          phoneMasked = '***';
        }
      }

      return [{
        customer_id: customerId,
        display_name: c.display_name ?? null,
        wa_contact_name: c.wa_contact_name ?? null,
        phone_display: phoneMasked,
        opted_out_at: c.opted_out_at ?? null,
        last_body: msg.body,
        last_direction: msg.direction as 'inbound' | 'outbound',
        last_message_at: msg.created_at,
        last_status: msg.status,
        unread: msg.direction === 'inbound',
      }];
    })
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
}
