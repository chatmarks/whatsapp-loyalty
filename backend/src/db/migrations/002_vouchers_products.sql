-- Migration 002: vouchers + products

-- ─── products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  price         numeric(10, 2) NOT NULL CHECK (price >= 0),
  category      text NOT NULL DEFAULT 'Sonstiges',
  image_url     text,
  tax_rate      numeric(4, 2) NOT NULL DEFAULT 19.00,
  active        boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_business_active ON products (business_id, active, category);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── vouchers ─────────────────────────────────────────────────────────────────
-- orders FK added in migration 003 via ALTER
CREATE TABLE vouchers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  customer_id    uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  code           text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  type           text NOT NULL CHECK (type IN ('reward', 'manual', 'birthday', 'winback')),
  description    text NOT NULL,
  discount_type  text CHECK (discount_type IN ('percent', 'fixed', 'free_item')),
  discount_value numeric(10, 2),
  issued_at      timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  claimed_at     timestamptz,
  redeemed_at    timestamptz,
  redeemed_by    uuid REFERENCES businesses (id),
  order_id       uuid,  -- FK to orders added in migration 003
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vouchers_business_customer ON vouchers (business_id, customer_id);
CREATE INDEX idx_vouchers_code ON vouchers (code);
CREATE INDEX idx_vouchers_unredeemed ON vouchers (business_id, redeemed_at) WHERE redeemed_at IS NULL;
