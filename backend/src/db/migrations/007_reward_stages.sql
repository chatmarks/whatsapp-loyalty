-- Migration 007: configurable stamp_count + multi-stage reward_stages
-- stamp_count replaces stamps_per_reward as the authoritative card length
-- reward_stages is a JSONB array of {stamp: int, description: text} objects

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS stamp_count     int  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS reward_stages   jsonb NOT NULL DEFAULT '[{"stamp":10,"description":"Gratis Produkt"}]';

-- Back-fill existing rows: stamp_count = stamps_per_reward, reward_stages from reward_description
UPDATE businesses
SET
  stamp_count   = stamps_per_reward,
  reward_stages = jsonb_build_array(
    jsonb_build_object('stamp', stamps_per_reward, 'description', reward_description)
  )
WHERE stamp_count = 10; -- only touch rows that still have the default (i.e. not yet set)

COMMENT ON COLUMN businesses.stamp_count IS
  'Total number of stamp slots on the loyalty card (max 12 recommended).';

COMMENT ON COLUMN businesses.reward_stages IS
  'JSON array of reward thresholds: [{stamp: int, description: text}, ...]. '
  'Card resets when stamp_count is reached.';
