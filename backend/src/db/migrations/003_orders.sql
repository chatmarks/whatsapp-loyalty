-- Migration 003: orders + cross-table FKs

-- ─── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  customer_id           uuid REFERENCES customers (id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  source                text NOT NULL DEFAULT 'admin'
    CHECK (source IN ('admin', 'client_form')),
  line_items            jsonb NOT NULL DEFAULT '[]',
  subtotal              numeric(10, 2) NOT NULL DEFAULT 0,
  tax_total             numeric(10, 2) NOT NULL DEFAULT 0,
  discount_amount       numeric(10, 2) NOT NULL DEFAULT 0,
  total                 numeric(10, 2) NOT NULL DEFAULT 0,
  voucher_id            uuid REFERENCES vouchers (id) ON DELETE SET NULL,
  payment_method        text,
  stamps_awarded        int NOT NULL DEFAULT 0,
  remark                text,
  wa_notification_sent  boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_business_status ON orders (business_id, status, created_at DESC);
CREATE INDEX idx_orders_customer ON orders (customer_id, created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Cross-table FKs deferred from earlier migrations ─────────────────────────
ALTER TABLE stamp_events
  ADD CONSTRAINT fk_stamp_events_order
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;

ALTER TABLE vouchers
  ADD CONSTRAINT fk_vouchers_order
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;
