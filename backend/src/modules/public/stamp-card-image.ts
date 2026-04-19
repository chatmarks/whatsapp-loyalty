import { Resvg } from '@resvg/resvg-js';

export interface RewardStage {
  stamp: number;
  description: string;
  emoji?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// White checkmark path for a 24×24 viewBox
const CHECKMARK = 'M5 13l4 4L19 7';
// White star (★) for reward positions
const STAR = 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z';

export function generateStampCardPng(
  businessName: string,
  primaryColor: string,
  stampCount: number,
  currentStamps: number,
  rewardStages: RewardStage[],
): Buffer {
  const svg = buildSvg(businessName, primaryColor, stampCount, currentStamps, rewardStages);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 640 } });
  return Buffer.from(resvg.render().asPng());
}

function buildSvg(
  businessName: string,
  primaryColor: string,
  stampCount: number,
  current: number,
  rewardStages: RewardStage[],
): string {
  const W = 640;
  const COLS = Math.min(5, stampCount);
  const ROWS = Math.ceil(stampCount / COLS);
  const CIRCLE_D = 52;
  const GAP = 8;
  const HEADER_H = 88;
  const CARD_PAD = 20;
  const STAMPS_W = COLS * CIRCLE_D + (COLS - 1) * GAP;
  const STAMPS_H = ROWS * CIRCLE_D + (ROWS - 1) * GAP;
  const PROGRESS_H = 46;
  const FOOTER_H = 28;
  const CARD_H = CARD_PAD + 16 + 20 + CARD_PAD + STAMPS_H + PROGRESS_H + FOOTER_H + CARD_PAD;
  const H = HEADER_H + CARD_H;

  const rewardPositions = new Set(rewardStages.map((s) => s.stamp));
  const AMBER = '#f59e0b';

  // Next reward text
  const nextReward = rewardStages
    .filter((s) => s.stamp > current)
    .sort((a, b) => a.stamp - b.stamp)[0];
  const progressText = nextReward
    ? `Noch ${nextReward.stamp - current} Stempel bis: ${esc(nextReward.description)}`
    : 'Alle Belohnungen verdient!';
  const progressPct = Math.min(100, Math.round((current / stampCount) * 100));

  // Stamp circles
  const startX = (W - STAMPS_W) / 2;
  const stampsY = HEADER_H + CARD_PAD + 16 + 20 + CARD_PAD;

  const circles: string[] = [];
  for (let i = 0; i < stampCount; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const cx = startX + col * (CIRCLE_D + GAP) + CIRCLE_D / 2;
    const cy = stampsY + row * (CIRCLE_D + GAP) + CIRCLE_D / 2;
    const r = CIRCLE_D / 2;
    const pos = i + 1;
    const filled = pos <= current;
    const isReward = rewardPositions.has(pos);
    const fillColor = isReward ? AMBER : primaryColor;
    const borderColor = isReward ? `${AMBER}88` : `${primaryColor}40`;
    const borderStyle = isReward ? `stroke-dasharray="4 3"` : '';

    if (filled) {
      circles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" filter="url(#shadow)"/>`);
      if (isReward) {
        // Star for reward
        circles.push(
          `<g transform="translate(${cx - 12},${cy - 12})">` +
          `<path d="${STAR}" fill="white" stroke="none"/>` +
          `</g>`,
        );
      } else {
        // Checkmark
        circles.push(
          `<g transform="translate(${cx - 11},${cy - 11})">` +
          `<path d="${CHECKMARK}" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
          `</g>`,
        );
      }
    } else {
      circles.push(
        `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="${isReward ? '#fffbeb' : '#f9fafb'}" ` +
        `stroke="${borderColor}" stroke-width="2" ${borderStyle} opacity="${isReward ? 0.7 : 0.6}"/>`,
      );
    }
  }

  // Progress bar y position
  const barY = stampsY + STAMPS_H + 18;
  const barW = W - 80;
  const fillW = Math.max(4, Math.round((progressPct / 100) * barW));

  const initial = businessName.charAt(0).toUpperCase();

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}cc"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}99"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="${primaryColor}" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Header gradient -->
  <rect width="${W}" height="${H}" rx="0" fill="#f5f5f5"/>
  <rect width="${W}" height="${HEADER_H}" fill="url(#hdr)"/>
  <!-- Decorative circles in header -->
  <circle cx="${W + 20}" cy="-20" r="100" fill="rgba(255,255,255,0.07)"/>
  <circle cx="${W - 30}" cy="20" r="50" fill="rgba(255,255,255,0.05)"/>
  <!-- Business initial badge -->
  <rect x="24" y="20" width="44" height="44" rx="12" fill="rgba(255,255,255,0.22)"/>
  <text x="46" y="49" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="white"
  >${esc(initial)}</text>
  <!-- Business name -->
  <text x="80" y="36"
    font-family="Arial, Helvetica, sans-serif" font-size="12" fill="rgba(255,255,255,0.75)"
  >Stempelkarte</text>
  <text x="80" y="56"
    font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="white"
  >${esc(businessName)}</text>

  <!-- Card body -->
  <rect x="0" y="${HEADER_H}" width="${W}" height="${CARD_H}" fill="white"/>

  <!-- "Treuekarte" header row -->
  <text x="${CARD_PAD}" y="${HEADER_H + CARD_PAD + 14}"
    font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#1a1a1a"
  >Treuekarte</text>
  <text x="${W - CARD_PAD}" y="${HEADER_H + CARD_PAD + 14}" text-anchor="end"
    font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#888"
  >${current} von ${stampCount} Stempeln</text>

  <!-- Stamps -->
  ${circles.join('\n  ')}

  <!-- Progress bar track -->
  <rect x="40" y="${barY}" width="${barW}" height="6" rx="3" fill="#f0f0f0"/>
  <!-- Progress bar fill -->
  <rect x="40" y="${barY}" width="${fillW}" height="6" rx="3" fill="url(#bar)"/>

  <!-- Next reward text -->
  <text x="${W / 2}" y="${barY + 26}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#aaa"
  >${progressText}</text>
</svg>`;
}
