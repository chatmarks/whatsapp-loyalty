import { Resvg } from '@resvg/resvg-js';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Generates a PNG buffer of a stamp card showing current progress. */
export function generateStampCardPng(
  businessName: string,
  stampCount: number,
  currentStamps: number,
): Buffer {
  const svg = buildSvg(businessName, stampCount, currentStamps);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 640 } });
  return Buffer.from(resvg.render().asPng());
}

function buildSvg(businessName: string, stampCount: number, current: number): string {
  // Layout: max 10 per row
  const perRow = Math.min(10, stampCount);
  const rows = Math.ceil(stampCount / perRow);
  const W = 640;
  const HEADER_H = 96;
  const CIRCLE_D = Math.min(52, Math.floor((W - 80 - (perRow - 1) * 10) / perRow));
  const ROW_GAP = 14;
  const STAMPS_H = rows * CIRCLE_D + (rows - 1) * ROW_GAP;
  const FOOTER_H = 56;
  const H = HEADER_H + STAMPS_H + FOOTER_H + 24;

  const circlesX = (W - (perRow * CIRCLE_D + (perRow - 1) * 10)) / 2;
  const circlesY = HEADER_H + 12;

  const circles: string[] = [];
  for (let i = 0; i < stampCount; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const cx = circlesX + col * (CIRCLE_D + 10) + CIRCLE_D / 2;
    const cy = circlesY + row * (CIRCLE_D + ROW_GAP) + CIRCLE_D / 2;
    const r = CIRCLE_D / 2;
    const filled = i < current;
    if (filled) {
      // Filled: solid green circle with white inner dot
      circles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#16a34a"/>`);
      circles.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.32}" fill="white" opacity="0.9"/>`);
    } else {
      // Empty: light outline
      circles.push(`<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="#f9fafb" stroke="#d1d5db" stroke-width="2"/>`);
    }
  }

  const remaining = stampCount - current;
  const progressLine = remaining > 0
    ? `${current} / ${stampCount} Stempel  -  Noch ${remaining} bis zur Belohnung`
    : `Alle ${stampCount} Stempel gesammelt!`;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" rx="18" fill="#f0fdf4"/>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="17" fill="none" stroke="#16a34a" stroke-width="2.5"/>
  <text x="${W / 2}" y="44" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#15803d"
  >${escapeXml(businessName)}</text>
  <text x="${W / 2}" y="70" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#6b7280"
  >Stempelkarte</text>
  <line x1="40" y1="84" x2="${W - 40}" y2="84" stroke="#bbf7d0" stroke-width="1.5"/>
  ${circles.join('\n  ')}
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#374151"
  >${escapeXml(progressLine)}</text>
</svg>`;
}
