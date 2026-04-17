-- Wallet token: zufällige UUID pro Kunde, wird in WhatsApp-Links eingebettet.
-- Damit öffnet jeder Kunde seine persönliche Stempelkarte im Browser — kein Login nötig.
ALTER TABLE customers
  ADD COLUMN wallet_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX idx_customers_wallet_token ON customers (wallet_token);
