// ============================================================
// mmcp-inbox-router — inbox.md parser
// Three strategies, tried in order:
//   1. Fenced MMCP envelopes  (---mmcp-envelope--- / ---end-envelope---)
//   2. JSON code blocks        (```json { "from": ... } ``` — Studio-OS-Chat format)
//   3. H3 markdown blocks      (legacy / human-written)
// ============================================================

import type { ParsedMessage } from './types.js';

const ENVELOPE_FENCE = /^---mmcp-envelope---$/m;
const ENVELOPE_END   = /^---end-envelope---$/m;
const HEADER_RE      = /^([A-Za-z-]+):\s*(.+)$/;

/**
 * Parse a markdown inbox.md file into structured messages.
 * Tries three envelope formats in priority order.
 */
export function parseMarkdownInbox(content: string): ParsedMessage[] {
  // Strategy 1: fenced MMCP envelopes (canonical format)
  const fenced = parseFencedEnvelopes(content);
  if (fenced.length > 0) return fenced;

  // Strategy 2: JSON code blocks (Studio-OS-Chat alice/bob format)
  const json = parseJsonEnvelopes(content);
  if (json.length > 0) return json;

  // Strategy 3: H3 message blocks (legacy / human-written)
  return parseH3Blocks(content);
}

// ── Strategy 1: Fenced envelopes ────────────────────────────

function parseFencedEnvelopes(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');
  let inEnvelope = false;
  let block: string[] = [];

  for (const line of lines) {
    if (ENVELOPE_FENCE.test(line)) { inEnvelope = true; block = []; continue; }
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

// ── Strategy 2: JSON code blocks ────────────────────────────

/**
 * Parses the Studio-OS-Chat alice/bob envelope format:
 *
 * ```json
 * {
 *   "id": "msg-bob-alice-...",
 *   "from": "bob.mmcp",
 *   "to": "alice.mmcp",
 *   "payload": { "subject": "...", "content": "...", "contentType": "text/plain" },
 *   "sentAt": "2026-04-21T18:36:00Z",
 *   "signature": "signed:bob.mmcp:..."
 * }
 * ```
 */
function parseJsonEnvelopes(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  // Match all ```json ... ``` code blocks
  const jsonBlockRe = /```json\s*\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;

  while ((match = jsonBlockRe.exec(content)) !== null) {
    const raw = match[1].trim();
    try {
      const envelope = JSON.parse(raw) as JsonEnvelope;
      const msg = normalizeJsonEnvelope(envelope, raw);
      if (msg) messages.push(msg);
    } catch {
      // malformed JSON block — skip silently
    }
  }

  return messages;
}

interface JsonEnvelope {
  id?: string;
  from?: string;
  to?: string;
  sentAt?: string;
  threadId?: string;
  signature?: string;
  payload?: {
    subject?: string;
    content?: string;
    contentType?: string;
  };
  // flat fallback fields
  subject?: string;
  content?: string;
  body?: string;
}

function normalizeJsonEnvelope(env: JsonEnvelope, raw: string): ParsedMessage | null {
  const from = env.from;
  const to   = env.to;
  if (!from || !to) return null;

  const subject = env.payload?.subject ?? env.subject ?? '(no subject)';
  const body    = env.payload?.content ?? env.content ?? env.body ?? '';

  return {
    id:        env.id ?? generateId(),
    timestamp: env.sentAt ?? new Date().toISOString(),
    from,
    to,
    subject,
    body,
    signature: env.signature,
    raw,
  };
}

// ── Strategy 3: H3 blocks ────────────────────────────────────

function parseH3Blocks(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const blocks = content.split(/^### /m).slice(1);

  for (const block of blocks) {
    const lines   = block.split('\n');
    const subject = lines[0]?.trim() ?? '(no subject)';
    const body    = lines.slice(1).join('\n').trim();

    const fromMatch = /\*\*From:\*\*\s*(.+)/.exec(body);
    const toMatch   = /\*\*To:\*\*\s*(.+)/.exec(body);
    const dateMatch = /\*\*Date:\*\*\s*(.+)/.exec(body);
    const idMatch   = /\*\*ID:\*\*\s*(.+)/.exec(body);

    messages.push({
      id:        idMatch?.[1]?.trim()   ?? generateId(),
      timestamp: dateMatch?.[1]?.trim() ?? new Date().toISOString(),
      from:      fromMatch?.[1]?.trim() ?? 'unknown',
      to:        toMatch?.[1]?.trim()   ?? 'unknown',
      subject,
      body,
      raw: block,
    });
  }
  return messages;
}

// ── Helpers ──────────────────────────────────────────────────

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
