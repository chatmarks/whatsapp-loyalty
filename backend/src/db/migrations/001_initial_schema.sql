-- Migration 001: businesses + customers + stamp_events + blast_campaigns
-- Run with service-role credentials before app start

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── businesses ──────────────────────────────────────────────────────────────
CREATE TABLE businesses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email             text NOT NULL UNIQUE,
  password_hash           text NOT NULL,
  business_name           text NOT NULL,
  slug                    text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  phone_display           text,
  wa_phone_number_id      text,
  wa_access_token_enc     text,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  stamps_per_reward       int NOT NULL DEFAULT 10 CHECK (stamps_per_reward > 0),
  reward_description      text NOT NULL DEFAULT 'Gratis Getränk',
  blast_count_this_week   int NOT NULL DEFAULT 0,
  blast_week_reset_at     timestamptz,
  logo_url                text,
  banner_url              text,
  primary_color           text DEFAULT '#25D366',
  secondary_color         text DEFAULT '#128C7E',
  youtube_url             text,
  timezone                text NOT NULL DEFAULT 'Europe/Berlin',
  locale                  text NOT NULL DEFAULT 'de',
  active                  boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_slug ON businesses (slug);

-- ─── membership_tiers (referenced by customers FK) ───────────────────────────
CREATE TABLE membership_tiers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  name                  text NOT NULL,
  min_lifetime_stamps   int NOT NULL DEFAULT 0,
  stamp_multiplier      numeric(3, 1) NOT NULL DEFAULT 1.0,
  perks                 jsonb NOT NULL DEFAULT '[]',
  badge_color           text,
  sort_order            int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

-- ─── customers ───────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  phone_enc             text NOT NULL,
  phone_hash            text NOT NULL,
  display_name          text,
  wa_contact_name       text,
  total_stamps          int NOT NULL DEFAULT 0,
  lifetime_stamps       int NOT NULL DEFAULT 0,
  current_tier_id       uuid REFERENCES membership_tiers (id) ON DELETE SET NULL,
  opted_in_at           timestamptz NOT NULL,
  opt_in_ip             inet,
  opted_out_at          timestamptz,
  last_interaction_at   timestamptz,
  referral_code         text UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  referred_by_id        uuid REFERENCES customers (id) ON DELETE SET NULL,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone_hash)
);

CREATE INDEX idx_customers_business_id ON customers (business_id);
CREATE INDEX idx_customers_phone_hash ON customers (phone_hash);
CREATE INDEX idx_customers_opted_out ON customers (business_id, opted_out_at) WHERE opted_out_at IS NULL;

-- ─── stamp_events ─────────────────────────────────────────────────────────────
-- orders table created in 003; forward FK added via ALTER in that migration
CREATE TABLE stamp_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  order_id      uuid,  -- FK to orders added in migration 003
  amount        int NOT NULL CHECK (amount > 0),
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'order', 'referral')),
  issued_by     uuid REFERENCES businesses (id),
  wa_message_id text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamp_events_business_customer ON stamp_events (business_id, customer_id);
CREATE INDEX idx_stamp_events_business_created ON stamp_events (business_id, created_at DESC);

-- ─── blast_campaigns ─────────────────────────────────────────────────────────
CREATE TABLE blast_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  name             text NOT NULL,
  template_name    text NOT NULL,
  template_params  jsonb,
  audience         text NOT NULL DEFAULT 'all',
  status           text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  recipient_count  int,
  sent_count       int NOT NULL DEFAULT 0,
  failed_count     int NOT NULL DEFAULT 0,
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blast_campaigns_business_status ON blast_campaigns (business_id, status);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_blast_campaigns_updated_at
  BEFORE UPDATE ON blast_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
