import { describe, it, expect } from 'vitest';

const OPT_OUT_KEYWORDS = new Set(['stop', 'abmelden', 'nein', 'stopp']);

function isOptOutKeyword(text: string): boolean {
  return OPT_OUT_KEYWORDS.has(text.trim().toLowerCase());
}

describe('Opt-out keyword detection', () => {
  it('detects "stop"', () => expect(isOptOutKeyword('stop')).toBe(true));
  it('detects "abmelden"', () => expect(isOptOutKeyword('abmelden')).toBe(true));
  it('detects "nein"', () => expect(isOptOutKeyword('nein')).toBe(true));
  it('detects "stopp"', () => expect(isOptOutKeyword('stopp')).toBe(true));
  it('detects with surrounding whitespace', () => expect(isOptOutKeyword('  stop  ')).toBe(true));
  it('detects uppercase variant', () => expect(isOptOutKeyword('STOP')).toBe(true));
  it('does not trigger on regular message', () => expect(isOptOutKeyword('Danke!')).toBe(false));
  it('does not trigger on partial match', () => expect(isOptOutKeyword('stopped')).toBe(false));
});
