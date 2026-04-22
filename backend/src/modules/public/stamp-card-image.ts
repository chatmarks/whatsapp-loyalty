import { Resvg } from '@resvg/resvg-js';

export interface RewardStage {
  stamp: number;
  description: string;
  emoji?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// White checkmark matching the wallet's SVG icon (24×24 viewBox, rendered at 22×22)
const CHECKMARK_PATH = 'M5 13l4 4L19 7';

export function generateStampCardPng(
  businessName: string,
  primaryColor: string,
  stampCount: number,
  currentStamps: number,
  rewardStages: RewardStage[],
): Buffer {
  const svg = buildSvg(businessName, primaryColor, stampCount, currentStamps, rewardStages);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 640 },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Builds an SVG that matches the wallet StampDot grid + card layout pixel-for-pixel.
 *
 * Reference: CustomerWalletPage.tsx
 *  – dot size:          52×52 (wallet uses px; we scale to match 640px output)
 *  – gap:               8
 *  – cols:              min(5, stampCount)
 *  – filled non-reward: primaryColor bg, white checkmark
 *  – filled reward:     #f59e0b bg, emoji (best-effort), fallback: white checkmark
 *  – unfilled reward:   transparent, 2.5px dashed #f59e0b88 border, faint emoji
 *  – unfilled normal:   transparent, 2.5px solid ${color}40 border
 *  – opacities:         filled=1, unfilled-reward=0.55, unfilled=0.35
 */
function buildSvg(
  businessName: string,
  primaryColor: string,
  stampCount: number,
  current: number,
  rewardStages: RewardStage[],
): string {
  // ── Layout constants (match wallet at 640px) ──────────────────────────────
  const W       = 640;
  const PAD     = 24;          // outer horizontal padding
  const COLS    = Math.min(5, stampCount);
  const ROWS    = Math.ceil(stampCount / COLS);
  const D       = 64;          // dot diameter (wallet: 52px; scale ×1.23 for 640px)
  const GAP     = 10;          // gap between dots
  const R       = D / 2;

  // Header
  const HDR_PT  = 56;          // padding-top  (wallet: 48px)
  const HDR_PB  = 38;          // padding-bottom
  const LOGO_SZ = 60;          // logo/initial square
  const HDR_H   = HDR_PT + LOGO_SZ + 12 + 20 + 6 + 16 + HDR_PB; // rough: initial+name+subtitle

  // Card body
  const CP      = 24;          // card padding
  const BADGE_H = 34;          // reward badge row height
  const TITLE_H = 44;          // "Treuekarte" + stamp count line
  const GRID_H  = ROWS * D + (ROWS - 1) * GAP;
  const BAR_H   = 42;          // progress bar section
  const NEXT_H  = 20;          // next-reward label
  const CARD_H  = CP + TITLE_H + BADGE_H + CP + GRID_H + BAR_H + NEXT_H + CP;

  const H = HDR_H + CARD_H;

  // ── Derived values ────────────────────────────────────────────────────────
  const rewardPositions = new Set(rewardStages.map((s) => s.stamp));
  const AMBER = '#f59e0b';
  const AMBER_SHADOW = 'rgba(245,158,11,0.45)';

  const nextReward = rewardStages
    .filter((s) => s.stamp > current)
    .sort((a, b) => a.stamp - b.stamp)[0];
  const nextText = nextReward
    ? `Noch ${nextReward.stamp - current} Stempel bis: ${esc(nextReward.description)}`
    : 'Alle Belohnungen verdient! \u2728';

  const initial = businessName.charAt(0).toUpperCase();

  // ── Stamp grid ────────────────────────────────────────────────────────────
  const gridW   = COLS * D + (COLS - 1) * GAP;
  const gridX   = (W - gridW) / 2;
  const gridY   = HDR_H + CP + TITLE_H + BADGE_H + CP;

  const dots: string[] = [];

  for (let i = 0; i < stampCount; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const cx  = gridX + col * (D + GAP) + R;
    const cy  = gridY + row * (D + GAP) + R;
    const pos = i + 1;

    const filled   = pos <= current;
    const isReward = rewardPositions.has(pos);
    const stage    = rewardStages.find((s) => s.stamp === pos);
    const emoji    = stage?.emoji ?? (isReward ? '🎁' : null);

    if (filled) {
      // Filled circle — primary or amber
      const bg  = isReward ? AMBER : primaryColor;
      const shdColor = isReward ? AMBER_SHADOW : `${primaryColor}55`;

      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${bg}" ` +
        `filter="drop-shadow(0 4px 12px ${shdColor})"/>`,
      );

      if (isReward && emoji) {
        // Emoji text (best-effort — renders if system has emoji font)
        dots.push(
          `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
          `font-size="28" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"` +
          `>${esc(emoji)}</text>`,
        );
        // Geometric fallback (white checkmark drawn underneath — visible if emoji fails)
        // We draw it BEHIND the text — already drawn first so emoji text covers it
        // Actually draw a white checkmark at a lower opacity so if emoji renders it blends
        dots.push(
          `<g transform="translate(${cx - 13},${cy - 13})" opacity="0.35">` +
          `<path d="${CHECKMARK_PATH}" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
          `</g>`,
        );
      } else {
        // White checkmark
        dots.push(
          `<g transform="translate(${cx - 13},${cy - 13})">` +
          `<path d="${CHECKMARK_PATH}" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
          `</g>`,
        );
      }
    } else {
      // Unfilled circle
      const border      = isReward ? `stroke="${AMBER}88" stroke-dasharray="5 3.5"` : `stroke="${primaryColor}40"`;
      const opacity     = isReward ? 0.55 : 0.35;
      const innerFill   = isReward ? '#fffbeb' : 'white';

      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${R - 1.5}" fill="${innerFill}" ` +
        `${border} stroke-width="2.5" opacity="${opacity}"/>`,
      );

      if (isReward && emoji) {
        // Faint emoji (opacity 0.6 matches wallet's `opacity: 0.6` for unfilled reward)
        dots.push(
          `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
          `font-size="26" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" ` +
          `opacity="0.45">${esc(emoji)}</text>`,
        );
      }
    }
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const barY    = gridY + GRID_H + 20;
  const barW    = W - PAD * 2;
  const pct     = Math.min(1, current / stampCount);
  const fillW   = Math.max(6, Math.round(pct * barW));

  // ── Layout y positions ────────────────────────────────────────────────────
  const titleY  = HDR_H + CP + 20;
  const badgeY  = HDR_H + CP + TITLE_H + 8;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hdr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}cc"/>
    </linearGradient>
    <linearGradient id="bar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}99"/>
    </linearGradient>
  </defs>

  <!-- Page background -->
  <rect width="${W}" height="${H}" fill="#f5f5f5"/>

  <!-- Header gradient (matches wallet header) -->
  <rect width="${W}" height="${HDR_H}" fill="url(#hdr)"/>
  <!-- Decorative circles (wallet: top-right: 160px @opacity 0.08, inner: 80px @0.06) -->
  <circle cx="${W + 40}" cy="-40" r="190" fill="rgba(255,255,255,0.08)"/>
  <circle cx="${W - 24}" cy="24" r="95"  fill="rgba(255,255,255,0.06)"/>

  <!-- Logo / initial badge (wallet: borderRadius 14, rgba(255,255,255,0.25)) -->
  <rect x="${PAD}" y="${HDR_PT}" width="${LOGO_SZ}" height="${LOGO_SZ}" rx="17"
    fill="rgba(255,255,255,0.25)"/>
  <text x="${PAD + LOGO_SZ / 2}" y="${HDR_PT + LOGO_SZ / 2 + 1}"
    text-anchor="middle" dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800"
    fill="white">${esc(initial)}</text>

  <!-- Business name row (wallet: opacity 0.8 small label + large name) -->
  <text x="${PAD + LOGO_SZ + 14}" y="${HDR_PT + 16}"
    font-family="Arial, Helvetica, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)"
    font-weight="500">${esc(businessName)}</text>
  <text x="${PAD + LOGO_SZ + 14}" y="${HDR_PT + 42}"
    font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800"
    fill="white">Deine Stempelkarte</text>
  <text x="${PAD + LOGO_SZ + 14}" y="${HDR_PT + 64}"
    font-family="Arial, Helvetica, sans-serif" font-size="14" fill="rgba(255,255,255,0.75)">
    ${current} von ${stampCount} Stempeln</text>

  <!-- White card -->
  <rect x="0" y="${HDR_H}" width="${W}" height="${CARD_H}" fill="white"
    rx="0"/>

  <!-- Card title row -->
  <text x="${CP}" y="${titleY}"
    font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700"
    fill="#1a1a1a">Treuekarte</text>
  <text x="${W - CP}" y="${titleY}" text-anchor="end"
    font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#888">
    ${current} von ${stampCount} Stempeln</text>

  <!-- Reward badge pill (wallet: fef3c7 bg, b45309 text, fcd34d border) -->
  <rect x="${CP}" y="${badgeY}" width="170" height="${BADGE_H}" rx="${BADGE_H / 2}"
    fill="#fef3c7" stroke="#fcd34d" stroke-width="1.5"/>
  <!-- Star icon inside badge -->
  <path d="M${CP + 16} ${badgeY + 10} l1.4 4.3h4.5l-3.7 2.7 1.4 4.3-3.6-2.6-3.6 2.6 1.4-4.3-3.7-2.7h4.5z"
    fill="#b45309"/>
  <text x="${CP + 30}" y="${badgeY + BADGE_H / 2 + 1}"
    dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif"
    font-size="13" font-weight="600" fill="#b45309">${rewardStages.length} Belohnungen</text>

  <!-- Stamp dots -->
  ${dots.join('\n  ')}

  <!-- Progress bar track -->
  <rect x="${PAD}" y="${barY}" width="${barW}" height="7" rx="3.5" fill="#f0f0f0"/>
  <!-- Progress bar fill -->
  <rect x="${PAD}" y="${barY}" width="${fillW}" height="7" rx="3.5" fill="url(#bar)"/>

  <!-- Next reward label (wallet: fontSize 12, color #aaa, textAlign center) -->
  <text x="${W / 2}" y="${barY + 24}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="13" fill="#aaa">${nextText}</text>
</svg>`;
}
