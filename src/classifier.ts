// ============================================================
// mmcp-inbox-router — deterministic message classifier
// Zero LLM calls in v1. Pattern-based intent detection.
// ============================================================

import type { ParsedMessage, MessageClass, MessageIntent, ExtractedRefs } from './types.js';

/** Classify a parsed message deterministically */
export function classifyMessage(msg: ParsedMessage): MessageClass {
  const intent = detectIntent(msg);
  const tags = extractTags(msg);
  const extractedRefs = extractRefs(msg);

  return {
    intent,
    confidence: scoreConfidence(intent, msg),
    tags,
    extractedRefs,
  };
}

// ── Intent detection ────────────────────────────────────────

const INTENT_PATTERNS: Array<{ intent: MessageIntent; patterns: RegExp[] }> = [
  {
    intent: 'approval:request',
    patterns: [
      /\bapprove\b/i, /\bneed.*approval\b/i, /\bwaiting.*approval\b/i,
      /\brequest.*approval\b/i, /\bplease.*review\b/i,
    ],
  },
  {
    intent: 'approval:grant',
    patterns: [
      /\bapproved\b/i, /\blgtm\b/i, /\bship it\b/i, /\bgo ahead\b/i,
    ],
  },
  {
    intent: 'approval:deny',
    patterns: [
      /\bdenied\b/i, /\bnot approved\b/i, /\bhold off\b/i, /\bblock\b/i,
    ],
  },
  {
    intent: 'handoff:request',
    patterns: [
      /\bhand.?off\b/i, /\btransfer.*to\b/i, /\bpassing.*to\b/i,
      /\bdelegate.*to\b/i, /\broute.*to\b/i,
    ],
  },
  {
    intent: 'handoff:accept',
    patterns: [
      /\baccepting.*handoff\b/i, /\btaking.*over\b/i, /\bpicking.*up\b/i,
    ],
  },
  {
    intent: 'task:complete',
    patterns: [
      /\bdone\b/i, /\bcomplete[d]?\b/i, /\bfinished\b/i, /\bclosed\b/i,
      /\bresolved\b/i, /\b✅\b/,
    ],
  },
  {
    intent: 'task:update',
    patterns: [
      /\bupdate.*on\b/i, /\bstatus.*update\b/i, /\bprogress.*on\b/i,
      /\bblocked.*on\b/i, /\bblocking\b/i,
    ],
  },
  {
    intent: 'ci:trigger',
    patterns: [
      /\bdeploy\b/i, /\brun.*ci\b/i, /\btrigger.*workflow\b/i,
      /\brun.*tests\b/i, /\bbuild.*and.*deploy\b/i,
    ],
  },
  {
    intent: 'status:update',
    patterns: [
      /\bstatus:\b/i, /\bproject.*status\b/i, /\bboard.*update\b/i,
    ],
  },
  {
    intent: 'receipt:ack',
    patterns: [
      /\breceived\b/i, /\back\b/i, /\backnowledge\b/i, /\bgot it\b/i,
    ],
  },
  {
    intent: 'task:create',
    patterns: [
      /\bcreate.*issue\b/i, /\bnew.*task\b/i, /\badd.*to.*backlog\b/i,
      /\bfile.*issue\b/i, /\bneed.*to.*build\b/i, /\bcan you\b/i,
      /\bplease\b/i, /\btodo\b/i,
    ],
  },
];

function detectIntent(msg: ParsedMessage): MessageIntent {
  const text = `${msg.subject} ${msg.body}`.toLowerCase();

  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(text))) return intent;
  }

  return 'unknown';
}

// ── Confidence scoring ───────────────────────────────────────

function scoreConfidence(
  intent: MessageIntent,
  msg: ParsedMessage
): 'high' | 'medium' | 'low' {
  if (intent === 'unknown') return 'low';
  // High confidence if subject line alone triggers the intent
  const subjectOnly = msg.subject.toLowerCase();
  const patternsForIntent = INTENT_PATTERNS.find(i => i.intent === intent)?.patterns ?? [];
  if (patternsForIntent.some(p => p.test(subjectOnly))) return 'high';
  return 'medium';
}

// ── Tag extraction ───────────────────────────────────────────

function extractTags(msg: ParsedMessage): string[] {
  const tags = new Set<string>();
  const text = `${msg.subject} ${msg.body}`;

  const hashTags = text.match(/#[a-z][a-z0-9-]*/gi) ?? [];
  hashTags.forEach(t => tags.add(t.toLowerCase()));

  // Tier tags from PAE terminology
  if (/\btier-[1-4]\b/i.test(text)) {
    const tier = text.match(/\btier-([1-4])\b/i)?.[1];
    if (tier) tags.add(`tier-${tier}`);
  }

  // Phase tags
  if (/\bphase-?([1-5])\b/i.test(text)) {
    const phase = text.match(/\bphase-?([1-5])\b/i)?.[1];
    if (phase) tags.add(`phase-${phase}`);
  }

  return [...tags];
}

// ── Ref extraction ───────────────────────────────────────────

function extractRefs(msg: ParsedMessage): ExtractedRefs {
  const text = `${msg.subject} ${msg.body}`;

  const issueRefs = [...(text.match(/[a-z0-9-]+\/[a-z0-9-]+#\d+/gi) ?? []),
                    ...(text.match(/#\d+/g) ?? [])];

  const agentRefs  = text.match(/[a-z][a-z0-9-]*\.mmcp/gi) ?? [];
  const repoRefs   = text.match(/[a-z0-9-]+\/[a-z0-9-]+(?=#|\s|$)/gi) ?? [];
  const urlRefs    = text.match(/https?:\/\/[^\s)>"]+/gi) ?? [];

  return {
    issueRefs: [...new Set(issueRefs)],
    agentRefs: [...new Set(agentRefs)],
    repoRefs:  [...new Set(repoRefs)],
    urlRefs:   [...new Set(urlRefs)],
  };
}
