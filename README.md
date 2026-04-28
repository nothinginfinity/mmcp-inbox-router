# mmcp-inbox-router

> GitHub-native MMCP message router — reads inbox ledgers, classifies envelopes deterministically, and dispatches actions without LLM calls.

Part of the [Pocket Agent Engine](https://github.com/nothinginfinity/pocket-agent-engine) · **Tier 2 — Engine Core · Phase 1**

---

## What it does

1. **Reads** `spaces/*/inbox.md` ledgers from GitHub (via API or local clone)
2. **Parses** MMCP signed envelopes from markdown
3. **Classifies** each message deterministically (no LLM in v1)
4. **Routes** to the correct action via policy rules
5. **Dispatches** one or more GitHub actions:
   - Create issue
   - Append thread comment
   - Update `projects/*/status.md`
   - Write receipt back to inbox
   - Trigger GitHub Actions workflow

## Stack

- TypeScript · Node 20+
- Vitest for tests
- Biome for lint/format
- GitHub REST API (`@octokit/rest`)
- Zero LLM calls in v1 — pure deterministic routing

## Quick Start

```bash
npm install
npm run build

# Dry-run against a local inbox file
npx mmcp-router scan --file fixtures/sample-inbox.md --dry-run

# Live scan against a GitHub space
npx mmcp-router scan --space alice.mmcp --repo nothinginfinity/pocket-agent-engine
```

## CLI Reference

```
mmcp-router scan   Scan an inbox ledger and route messages
  --file <path>    Path to local inbox.md file
  --space <name>   Space name (reads from GitHub repo)
  --repo <owner/repo>  GitHub repo containing the spaces/ directory
  --dry-run        Print actions without executing
  --verbose        Show full classification output

mmcp-router status  Print last processed message IDs from state store
mmcp-router rules   Print active routing rules from config
```

## Architecture

```
inbox.md
  └─ parseMarkdownInbox()     → ParsedMessage[]
       └─ classifyMessage()   → MessageClass + intent
            └─ matchRouteRules() → RouteAction[]
                 └─ dispatch()   → GitHub API calls
                      └─ writeReceipt() → inbox.md append
```

## Project Role

| Layer | This repo |
|---|---|
| Reads from | `spaces/*/inbox.md` (GitHub ledger) |
| Writes to | GitHub issues, threads, status.md, receipts |
| Depends on | `@nothinginfinity/m-mcp` (envelope types) |
| Used by | `pocket-agent-engine` orchestrator, `pae` CLI |

## Linked Issues

- [pocket-agent-engine#1](https://github.com/nothinginfinity/pocket-agent-engine/issues/1) — Phase 1 gate
- [pocket-agent-engine#6](https://github.com/nothinginfinity/pocket-agent-engine/issues/6) — Bootstrap tracker
