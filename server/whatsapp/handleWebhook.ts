import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { solveDoubt } from '../doubt/solveDoubt';
import { synthesizeNarration, getAudioDuration, voiceForLanguage } from '../video/tts';

// See server/whatsapp/README.md for exactly what's stubbed here vs. what a
// live integration additionally needs (Meta account, tokens, webhook hosting).

interface IncomingMessage {
  from: string;
  text: string;
  /** Stub-only shortcut: a real webhook only carries a media id, requiring a
   *  separate authenticated Graph API call to fetch the actual image bytes. */
  imageBase64?: string;
}

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: { body: string };
  image?: { id?: string; mime_type?: string; base64?: string };
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
}

/** Extracts the first incoming message from a WhatsApp Cloud API-shaped webhook payload. */
export function extractIncomingMessage(payload: WhatsAppWebhookPayload): IncomingMessage | null {
  const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages;
  const message = messages?.[0];
  if (!message) return null;

  const text = message.type === 'text' ? message.text?.body || '' : '';
  const imageBase64 = message.type === 'image' && message.image?.base64
    ? `data:${message.image.mime_type || 'image/jpeg'};base64,${message.image.base64}`
    : undefined;

  return { from: message.from, text, imageBase64 };
}

/** Strips markdown/LaTeX formatting that doesn't render in a plain WhatsApp text message. */
function toPlainText(explanation: string): string {
  return explanation
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => inner.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, ''))
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\quad|\\\\|&/g, ' ')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface WhatsAppOutboundMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'audio';
  text?: { body: string };
  audio?: { link: string };
}

/**
 * Runs an incoming WhatsApp-shaped doubt through the same solving pipeline the
 * web app uses, and builds the outbound message(s) a live integration would
 * POST to the WhatsApp Send Message API (returned directly here instead, since
 * this stub has no real credentials to actually send them).
 */
export async function handleIncomingDoubt(message: IncomingMessage): Promise<WhatsAppOutboundMessage[]> {
  const result = await solveDoubt({ imageBase64: message.imageBase64, text: message.text, language: 'English' });
  const plainText = toPlainText(result.explanation);

  const outbound: WhatsAppOutboundMessage[] = [
    { messaging_product: 'whatsapp', to: message.from, type: 'text', text: { body: plainText } },
  ];

  try {
    const dir = path.join(process.cwd(), 'generated', 'whatsapp');
    await fs.mkdir(dir, { recursive: true });
    const id = randomUUID();
    const audioPath = path.join(dir, `${id}.mp3`);
    await synthesizeNarration(plainText.slice(0, 1000), audioPath, voiceForLanguage('English'));
    await getAudioDuration(audioPath); // fails loudly if synthesis produced something unplayable
    outbound.push({
      messaging_product: 'whatsapp',
      to: message.from,
      type: 'audio',
      audio: { link: `/generated/whatsapp/${id}.mp3` },
    });
  } catch (err) {
    // Voice note is a nice-to-have for the "voice-note-style response" — if TTS
    // isn't available (e.g. edge-tts not installed), still return the text reply.
    console.error('WhatsApp voice-note generation failed:', err);
  }

  return outbound;
}
