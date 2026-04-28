// ============================================================
// mmcp-inbox-router — inbox.md parser
// Reads MMCP envelope blocks from markdown ledger files
// ============================================================

import type { ParsedMessage } from './types.js';

const ENVELOPE_FENCE = /^---mmcp-envelope---$/m;
const ENVELOPE_END   = /^---end-envelope---$/m;
const HEADER_RE      = /^([A-Za-z-]+):\s*(.+)$/;

/**
 * Parse a markdown inbox.md file into structured messages.
 * Envelopes are delimited by ---mmcp-envelope--- / ---end-envelope--- fences.
 * Falls back to parsing H3 message blocks for legacy format.
 */
export function parseMarkdownInbox(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  // Strategy 1: fenced MMCP envelopes
  const fenced = parseFencedEnvelopes(content);
  if (fenced.length > 0) return fenced;

  // Strategy 2: H3 message blocks (legacy / human-written)
  return parseH3Blocks(content);
}

function parseFencedEnvelopes(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');
  let inEnvelope = false;
  let block: string[] = [];

  for (const line of lines) {
    if (ENVELOPE_FENCE.test(line)) {
      inEnvelope = true;
      block = [];
      continue;
    }
    if (ENVELOPE_END.test(line) && inEnvelope) {
      inEnvelope = false;
      const msg = parseEnvelopeBlock(block.join('\n'));
      if (msg) messages.push(msg);
      block = [];
      continue;
    }
    if (inEnvelope) block.push(line);
  }

  return messages;
}

function parseEnvelopeBlock(block: string): ParsedMessage | null {
  const lines = block.split('\n');
  const headers: Record<string, string> = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = HEADER_RE.exec(lines[i]);
    if (match) {
      headers[match[1].toLowerCase()] = match[2].trim();
      bodyStart = i + 1;
    } else if (lines[i].trim() === '') {
      bodyStart = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStart).join('\n').trim();
  const id = headers['message-id'] ?? headers['id'] ?? generateId();

  if (!headers['from'] || !headers['to']) return null;

  return {
    id,
    timestamp: headers['date'] ?? headers['timestamp'] ?? new Date().toISOString(),
    from: headers['from'],
    to: headers['to'],
    subject: headers['subject'] ?? '(no subject)',
    body,
    signature: headers['signature'],
    raw: block,
  };
}

function parseH3Blocks(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const blocks = content.split(/^### /m).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const subject = lines[0]?.trim() ?? '(no subject)';
    const body = lines.slice(1).join('\n').trim();

    // Extract metadata from body if present
    const fromMatch = /\*\*From:\*\*\s*(.+)/.exec(body);
    const toMatch   = /\*\*To:\*\*\s*(.+)/.exec(body);
    const dateMatch = /\*\*Date:\*\*\s*(.+)/.exec(body);
    const idMatch   = /\*\*ID:\*\*\s*(.+)/.exec(body);

    messages.push({
      id: idMatch?.[1]?.trim() ?? generateId(),
      timestamp: dateMatch?.[1]?.trim() ?? new Date().toISOString(),
      from: fromMatch?.[1]?.trim() ?? 'unknown',
      to: toMatch?.[1]?.trim() ?? 'unknown',
      subject,
      body,
      raw: block,
    });
  }

  return messages;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
