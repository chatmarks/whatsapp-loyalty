// Meta Cloud API webhook payload types

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  field: string;
  value: WebhookValue;
}

export interface WebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: InboundMessage[];
  statuses?: MessageStatus[];
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export interface InboundMessage {
  id: string;
  from: string; // E.164 phone number (no +)
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'audio' | 'document' | 'sticker' | 'unknown';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

// Outbound send request shapes
export interface TextMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { body: string; preview_url?: boolean };
}

export interface TemplateMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

// Interactive CTA-URL button — Meta unterstützt dies auch außerhalb von Templates
// (innerhalb des 24h-Servicefensters)
export interface CtaUrlMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'cta_url';
    body: { text: string };
    footer?: { text: string };
    action: {
      name: 'cta_url';
      parameters: {
        display_text: string; // Button-Beschriftung (max 20 Zeichen)
        url: string;
      };
    };
  };
}

export interface ImageMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image';
  image: {
    link: string;
    caption?: string;
  };
}

export type SendMessageRequest = TextMessageRequest | TemplateMessageRequest | CtaUrlMessageRequest | ImageMessageRequest;

export interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}
