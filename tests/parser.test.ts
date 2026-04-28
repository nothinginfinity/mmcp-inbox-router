import { describe, it, expect } from 'vitest';
import { parseMarkdownInbox } from '../src/parser.js';
import { readFileSync } from 'fs';

const FENCED_SAMPLE = readFileSync('fixtures/sample-inbox.md', 'utf-8');
const JSON_SAMPLE   = readFileSync('fixtures/alice-inbox.md', 'utf-8');

// ── Strategy 1: Fenced envelopes ────────────────────────────
describe('parseMarkdownInbox — fenced envelopes', () => {
  it('parses 3 fenced envelopes', () => {
    expect(parseMarkdownInbox(FENCED_SAMPLE).length).toBe(3);
  });

  it('extracts correct fields from first message', () => {
    const [first] = parseMarkdownInbox(FENCED_SAMPLE);
    expect(first.id).toBe('msg-2026-001');
    expect(first.from).toBe('human@nothinginfinity');
    expect(first.to).toBe('alice.mmcp');
    expect(first.subject).toBe('Build the mmcp-inbox-router parser module');
    expect(first.body).toContain('parseMarkdownInbox');
  });
});

// ── Strategy 2: JSON code blocks ────────────────────────────
describe('parseMarkdownInbox — JSON envelopes (Studio-OS-Chat format)', () => {
  it('parses 3 JSON envelope blocks', () => {
    expect(parseMarkdownInbox(JSON_SAMPLE).length).toBe(3);
  });

  it('extracts correct fields from first JSON message', () => {
    const [first] = parseMarkdownInbox(JSON_SAMPLE);
    expect(first.id).toBe('msg-bob-alice-test-001');
    expect(first.from).toBe('bob.mmcp');
    expect(first.to).toBe('alice.mmcp');
    expect(first.subject).toContain('NETWORK.md');
    expect(first.body).toContain('pocket-agent-engine');
  });

  it('extracts approval:request from second message', () => {
    const [, second] = parseMarkdownInbox(JSON_SAMPLE);
    expect(second.subject).toContain('approval');
  });

  it('extracts handoff from third message', () => {
    const [,, third] = parseMarkdownInbox(JSON_SAMPLE);
    expect(third.subject.toLowerCase()).toContain('handing off');
  });

  it('carries signature field', () => {
    const [first] = parseMarkdownInbox(JSON_SAMPLE);
    expect(first.signature).toBe('signed:bob.mmcp:msg-bob-alice-test-001');
  });
});

// ── Edge cases ───────────────────────────────────────────────
describe('parseMarkdownInbox — edge cases', () => {
  it('returns empty array for empty inbox', () => {
    expect(parseMarkdownInbox('# Inbox\n\nNo messages yet.').length).toBe(0);
  });

  it('skips malformed JSON blocks silently', () => {
    const bad = '```json\n{ broken json \n```';
    expect(parseMarkdownInbox(bad).length).toBe(0);
  });

  it('skips JSON blocks missing from/to', () => {
    const noFrom = '```json\n{"id":"x","to":"alice.mmcp","payload":{"subject":"hi"}}\n```';
    expect(parseMarkdownInbox(noFrom).length).toBe(0);
  });
});
