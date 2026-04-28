import { describe, it, expect } from 'vitest';
import { classifyMessage } from '../src/classifier.js';
import type { ParsedMessage } from '../src/types.js';

const base: ParsedMessage = {
  id: 'test-001',
  timestamp: '2026-04-27T00:00:00Z',
  from: 'human@nothinginfinity',
  to: 'alice.mmcp',
  subject: '',
  body: '',
  raw: '',
};

describe('classifyMessage', () => {
  it('classifies task:create', () => {
    const msg = { ...base, subject: 'Please create a new task for the parser module' };
    const cls = classifyMessage(msg);
    expect(cls.intent).toBe('task:create');
  });

  it('classifies approval:request', () => {
    const msg = { ...base, subject: 'Need your approval to merge this PR' };
    const cls = classifyMessage(msg);
    expect(cls.intent).toBe('approval:request');
  });

  it('classifies handoff:request', () => {
    const msg = { ...base, subject: 'Handing off classifier work to you' };
    const cls = classifyMessage(msg);
    expect(cls.intent).toBe('handoff:request');
  });

  it('classifies task:complete', () => {
    const msg = { ...base, subject: 'Parser module complete ✅' };
    const cls = classifyMessage(msg);
    expect(cls.intent).toBe('task:complete');
  });

  it('extracts agent refs', () => {
    const msg = { ...base, body: 'Route to alice.mmcp and bob.mmcp' };
    const cls = classifyMessage(msg);
    expect(cls.extractedRefs.agentRefs).toContain('alice.mmcp');
    expect(cls.extractedRefs.agentRefs).toContain('bob.mmcp');
  });

  it('extracts issue refs', () => {
    const msg = { ...base, body: 'See pocket-agent-engine#1 for context' };
    const cls = classifyMessage(msg);
    expect(cls.extractedRefs.issueRefs.some(r => r.includes('pocket-agent-engine#1'))).toBe(true);
  });

  it('falls back to unknown for unrecognized intent', () => {
    const msg = { ...base, subject: 'xyzzy plugh' };
    const cls = classifyMessage(msg);
    expect(cls.intent).toBe('unknown');
    expect(cls.confidence).toBe('low');
  });
});
