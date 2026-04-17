-- Migration 005: notification_logs
-- DSGVO-compliant: stores delivery status only, no phone numbers or message bodies

CREATE TABLE notification_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES customers (id) ON DELETE SET NULL,
  blast_id      uuid REFERENCES blast_campaigns (id) ON DELETE SET NULL,
  order_id      uuid REFERENCES orders (id) ON DELETE SET NULL,
  event_type    text NOT NULL CHECK (
    event_type IN ('stamp_issued', 'voucher_issued', 'blast', 'opt_in', 'opt_out', 'order_confirmed')
  ),
  wa_message_id text,
  status        text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  error_detail  text,
  -- Intentionally no phone column — DSGVO compliance
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_logs_business_created ON notification_logs (business_id, created_at DESC);
CREATE INDEX idx_notification_logs_customer ON notification_logs (customer_id, event_type);
CREATE INDEX idx_notification_logs_wa_id ON notification_logs (wa_message_id) WHERE wa_message_id IS NOT NULL;
