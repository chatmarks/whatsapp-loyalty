-- Migration 009: Add phone_hash to wa_messages for pre-registration message linking
-- Run manually in Supabase SQL Editor

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS phone_hash text;

CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_hash
  ON wa_messages(business_id, phone_hash, created_at DESC)
  WHERE phone_hash IS NOT NULL;
