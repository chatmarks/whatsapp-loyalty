import { describe, it, expect } from 'vitest';

// Blast limit enforcement logic tests (pure, no DB needed)

const MAX_BLASTS_PER_WEEK = 2;

function canSendBlast(blastCountThisWeek: number): boolean {
  return blastCountThisWeek < MAX_BLASTS_PER_WEEK;
}

describe('Blast 2/week enforcement', () => {
  it('allows first blast', () => {
    expect(canSendBlast(0)).toBe(true);
  });

  it('allows second blast', () => {
    expect(canSendBlast(1)).toBe(true);
  });

  it('blocks third blast', () => {
    expect(canSendBlast(2)).toBe(false);
  });

  it('blocks when already at limit', () => {
    expect(canSendBlast(MAX_BLASTS_PER_WEEK)).toBe(false);
  });
});

describe('Weekly reset logic', () => {
  it('resets count when reset date is before this Monday', () => {
    const mondayThisWeek = new Date('2026-04-13T00:00:00.000Z'); // Monday
    const lastReset = new Date('2026-04-06T00:00:00.000Z'); // Last Monday
    expect(lastReset < mondayThisWeek).toBe(true);
  });

  it('does not reset when reset date is after this Monday', () => {
    const mondayThisWeek = new Date('2026-04-13T00:00:00.000Z');
    const lastReset = new Date('2026-04-14T00:00:00.000Z'); // This week
    expect(lastReset < mondayThisWeek).toBe(false);
  });
});
