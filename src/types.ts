// ============================================================
// mmcp-inbox-router — core types
// ============================================================

/** Raw parsed message extracted from an inbox.md ledger */
export interface ParsedMessage {
  id: string;           // unique message ID (from envelope header or generated)
  timestamp: string;    // ISO 8601
  from: string;         // agent or human identity
  to: string;           // target agent/space
  subject: string;      // short subject line
  body: string;         // full message body (markdown)
  signature?: string;   // CWT-lite signature if present
  raw: string;          // original markdown block
}

/** Classification result for a parsed message */
export interface MessageClass {
  intent: MessageIntent;
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  extractedRefs: ExtractedRefs;
}

/** All possible message intents the router can classify */
export type MessageIntent =
  | 'task:create'        // create a new issue/task
  | 'task:update'        // update an existing task
  | 'task:complete'      // mark a task complete
  | 'handoff:request'    // agent requesting handoff to another agent
  | 'handoff:accept'     // agent accepting a handoff
  | 'approval:request'   // agent requesting human approval
  | 'approval:grant'     // human granting approval
  | 'approval:deny'      // human denying approval
  | 'status:update'      // status board update
  | 'ci:trigger'         // trigger a GitHub Actions workflow
  | 'receipt:ack'        // acknowledgement receipt
  | 'unknown';           // could not classify

/** References extracted from message body */
export interface ExtractedRefs {
  issueRefs: string[];   // e.g. ["pocket-agent-engine#1"]
  agentRefs: string[];   // e.g. ["alice.mmcp", "bob.mmcp"]
  repoRefs: string[];    // e.g. ["nothinginfinity/m-mcp"]
  urlRefs: string[];     // any https:// URLs
}

/** A routing rule that maps intent + conditions to actions */
export interface RouteRule {
  id: string;
  name: string;
  match: {
    intent?: MessageIntent | MessageIntent[];
    fromAgent?: string | string[];
    toAgent?: string | string[];
    tags?: string[];
  };
  actions: RouteAction[];
  policy?: string;       // reference to policies.json policy id
  enabled: boolean;
}

/** A dispatchable action produced by the router */
export type RouteAction =
  | { type: 'create_issue'; title: string; body: string; labels?: string[]; repo: string }
  | { type: 'append_thread'; issueNumber: number; body: string; repo: string }
  | { type: 'update_status'; path: string; content: string; repo: string }
  | { type: 'write_receipt'; spaceName: string; messageId: string; status: 'processed' | 'error'; repo: string }
  | { type: 'trigger_workflow'; workflowId: string; inputs?: Record<string, string>; repo: string }
  | { type: 'noop'; reason: string };

/** Result of processing a single message */
export interface ProcessResult {
  messageId: string;
  intent: MessageIntent;
  actionsDispatched: RouteAction[];
  success: boolean;
  error?: string;
  dryRun: boolean;
}

/** Configuration for a router run */
export interface RouterConfig {
  repo: string;          // owner/repo of the GitHub ledger
  spaceName?: string;    // specific space to scan, or all if omitted
  dryRun: boolean;
  verbose: boolean;
  githubToken?: string;  // PAT — if omitted, uses GITHUB_TOKEN env var
}
