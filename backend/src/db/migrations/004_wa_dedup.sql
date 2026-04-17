-- Migration 004: WhatsApp message dedup table

CREATE TABLE wa_message_events (
  wa_message_id   text PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  processed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_message_events_processed ON wa_message_events (processed_at);

-- Purge entries older than 7 days — run via Railway cron or pg_cron
-- DELETE FROM wa_message_events WHERE processed_at < now() - interval '7 days';
