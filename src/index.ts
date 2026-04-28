// ============================================================
// mmcp-inbox-router — public API
// ============================================================

export { parseMarkdownInbox } from './parser.js';
export { classifyMessage } from './classifier.js';
export { matchRouteRules } from './rules.js';
export { GitHubDispatcher } from './dispatcher.js';
export { GitHubLedgerReader } from './ledger.js';
export { ProcessedMessageStore } from './store.js';
export type {
  ParsedMessage,
  MessageClass,
  MessageIntent,
  ExtractedRefs,
  RouteRule,
  RouteAction,
  ProcessResult,
  RouterConfig,
} from './types.js';
