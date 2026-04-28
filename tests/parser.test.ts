import { describe, it, expect } from 'vitest';
import { parseMarkdownInbox } from '../src/parser.js';
import { readFileSync } from 'fs';

const SAMPLE = readFileSync('fixtures/sample-inbox.md', 'utf-8');

describe('parseMarkdownInbox', () => {
  it('parses fenced envelopes', () => {
    const messages = parseMarkdownInbox(SAMPLE);
    expect(messages.length).toBe(3);
  });

  it('extracts correct fields from first message', () => {
    const [first] = parseMarkdownInbox(SAMPLE);
    expect(first.id).toBe('msg-2026-001');
    expect(first.from).toBe('human@nothinginfinity');
    expect(first.to).toBe('alice.mmcp');
    expect(first.subject).toBe('Build the mmcp-inbox-router parser module');
    expect(first.body).toContain('parseMarkdownInbox');
  });

  it('returns empty array for empty inbox', () => {
    const messages = parseMarkdownInbox('# Inbox\n\nNo messages yet.');
    expect(messages.length).toBe(0);
  });
});
