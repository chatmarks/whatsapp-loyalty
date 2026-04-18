-- Migration 008: WhatsApp message history + editable message templates
-- Run manually in Supabase SQL Editor

-- Store full conversation history per customer
CREATE TABLE IF NOT EXISTS wa_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id   uuid        REFERENCES customers(id) ON DELETE SET NULL,
  direction     text        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body          text        NOT NULL,
  wa_message_id text,
  status        text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_biz_cust
  ON wa_messages(business_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_messages_biz_all
  ON wa_messages(business_id, created_at DESC);

-- Update status when Meta delivers/reads a message
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id
  ON wa_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- Editable message templates per business (keys: not_registered, stamp_cooldown,
-- stamp_issued, reward_earned, opt_out_confirm, opt_in_welcome)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS message_templates jsonb;
