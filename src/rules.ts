// ============================================================
// mmcp-inbox-router — route rule engine
// Matches classified messages to RouteActions
// ============================================================

import type { ParsedMessage, MessageClass, RouteRule, RouteAction } from './types.js';

/** Match a classified message against a set of rules and return actions */
export function matchRouteRules(
  msg: ParsedMessage,
  classification: MessageClass,
  rules: RouteRule[],
  repo: string
): RouteAction[] {
  const actions: RouteAction[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (matchesRule(msg, classification, rule)) {
      actions.push(...buildActions(msg, classification, rule, repo));
    }
  }

  if (actions.length === 0) {
    actions.push({ type: 'noop', reason: `No rule matched intent: ${classification.intent}` });
  }

  return actions;
}

function matchesRule(
  msg: ParsedMessage,
  cls: MessageClass,
  rule: RouteRule
): boolean {
  const { match } = rule;

  if (match.intent) {
    const intents = Array.isArray(match.intent) ? match.intent : [match.intent];
    if (!intents.includes(cls.intent)) return false;
  }

  if (match.fromAgent) {
    const agents = Array.isArray(match.fromAgent) ? match.fromAgent : [match.fromAgent];
    if (!agents.includes(msg.from)) return false;
  }

  if (match.toAgent) {
    const agents = Array.isArray(match.toAgent) ? match.toAgent : [match.toAgent];
    if (!agents.includes(msg.to)) return false;
  }

  if (match.tags?.length) {
    if (!match.tags.some(t => cls.tags.includes(t))) return false;
  }

  return true;
}

function buildActions(
  msg: ParsedMessage,
  cls: MessageClass,
  rule: RouteRule,
  repo: string
): RouteAction[] {
  return rule.actions.map(action => {
    // Interpolate message fields into action templates
    if (action.type === 'create_issue') {
      return {
        ...action,
        repo: action.repo || repo,
        title: interpolate(action.title, msg),
        body: interpolate(action.body, msg),
      };
    }
    if (action.type === 'write_receipt') {
      return { ...action, messageId: msg.id, repo: action.repo || repo };
    }
    return { ...action, repo: (action as { repo?: string }).repo || repo };
  }) as RouteAction[];
}

function interpolate(template: string, msg: ParsedMessage): string {
  return template
    .replace(/\{\{subject\}\}/g, msg.subject)
    .replace(/\{\{body\}\}/g, msg.body)
    .replace(/\{\{from\}\}/g, msg.from)
    .replace(/\{\{to\}\}/g, msg.to)
    .replace(/\{\{id\}\}/g, msg.id)
    .replace(/\{\{timestamp\}\}/g, msg.timestamp);
}
