import type { TemplateMessageRequest, TextMessageRequest, CtaUrlMessageRequest, ImageMessageRequest } from '../../types/whatsapp.js';

const LANG = { code: 'de' };

// ── Freitext + CTA-Button (24h-Servicefenster, kein Template nötig) ──────────
// Mit walletUrl: interaktive Nachricht mit "Stempelkarte öffnen"-Button.
// Ohne walletUrl: einfacher Text-Fallback.
// Sobald genehmigte Templates vorliegen, auf Template-Varianten umstellen.

type OutboundMessage = TextMessageRequest | CtaUrlMessageRequest | ImageMessageRequest;

export function stampIssuedText(
  to: string,
  count: number,
  total: number,
  stampsPerReward: number,
  walletUrl?: string,
  customBody?: string,
  imageUrl?: string,
  ctaLabel?: string,
): OutboundMessage {
  const remaining = stampsPerReward - total;
  const body = customBody ??
    `Du hast ${count} Stempel erhalten! 🎉\n\n` +
    `📍 Aktueller Stand: ${total}/${stampsPerReward} Stempel\n` +
    `Noch ${remaining} bis zu deiner Belohnung.`;

  if (walletUrl) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        ...(imageUrl ? { header: { type: 'image' as const, image: { link: imageUrl } } } : {}),
        body: { text: body },
        action: { name: 'cta_url', parameters: { display_text: ctaLabel ?? 'Stempelkarte öffnen', url: walletUrl } },
      },
    };
  }

  // No wallet URL but image available → image message with caption
  if (imageUrl) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: { link: imageUrl, caption: body },
    } as OutboundMessage;
  }

  return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body } };
}

export function rewardEarnedText(
  to: string,
  voucherCode: string,
  description: string,
  walletUrl?: string,
  customBody?: string,
  ctaLabel?: string,
): OutboundMessage {
  const body = customBody ??
    `🎉 Glückwunsch! Du hast deine Belohnung verdient!\n\n` +
    `🎁 ${description}\n` +
    `Dein Code: *${voucherCode}*\n\n` +
    `Zeige diesen Code beim nächsten Besuch vor.`;

  if (walletUrl) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: body },
        action: { name: 'cta_url', parameters: { display_text: ctaLabel ?? 'Gutschein ansehen', url: walletUrl } },
      },
    };
  }

  return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body } };
}

export function optOutConfirmText(to: string, customBody?: string): TextMessageRequest {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      body: customBody ?? 'Du wurdest erfolgreich vom Treueprogramm abgemeldet. Auf Wiedersehen! 👋',
    },
  };
}

export function stampIssuedTemplate(
  to: string,
  count: number,
  total: number,
  stampsPerReward: number,
): TemplateMessageRequest {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: 'stamp_issued',
      language: LANG,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(count) },
            { type: 'text', text: String(total) },
            { type: 'text', text: String(stampsPerReward) },
          ],
        },
      ],
    },
  };
}

export function rewardEarnedTemplate(
  to: string,
  voucherCode: string,
  description: string,
): TemplateMessageRequest {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: 'reward_earned',
      language: LANG,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: description },
            { type: 'text', text: voucherCode },
          ],
        },
      ],
    },
  };
}

export function voucherIssuedTemplate(
  to: string,
  code: string,
  description: string,
): TemplateMessageRequest {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: 'voucher_issued',
      language: LANG,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: description },
            { type: 'text', text: code },
          ],
        },
      ],
    },
  };
}

export function optOutConfirmTemplate(to: string): TemplateMessageRequest {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: 'opt_out_confirm',
      language: LANG,
    },
  };
}

export function winBackTemplate(to: string, businessName: string): TemplateMessageRequest {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: 'win_back',
      language: LANG,
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: businessName }],
        },
      ],
    },
  };
}
