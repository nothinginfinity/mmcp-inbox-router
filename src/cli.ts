#!/usr/bin/env node
// ============================================================
// mmcp-inbox-router — CLI entry point
// Usage: mmcp-router scan --space alice.mmcp --repo owner/repo
// ============================================================

import { Command } from 'commander';
import { parseMarkdownInbox } from './parser.js';
import { classifyMessage } from './classifier.js';
import { matchRouteRules } from './rules.js';
import { GitHubDispatcher } from './dispatcher.js';
import { GitHubLedgerReader } from './ledger.js';
import { ProcessedMessageStore } from './store.js';
import { readFileSync } from 'fs';
import type { RouteRule } from './types.js';

const program = new Command();

program
  .name('mmcp-router')
  .description('MMCP inbox router — reads ledgers, classifies messages, dispatches GitHub actions')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan an inbox ledger and route messages')
  .option('--file <path>', 'Path to local inbox.md file')
  .option('--space <name>', 'Space name (reads from GitHub repo)')
  .option('--repo <owner/repo>', 'GitHub repo containing spaces/ directory')
  .option('--rules <path>', 'Path to rules JSON file', 'config/rules.json')
  .option('--dry-run', 'Print actions without executing', false)
  .option('--verbose', 'Show full classification output', false)
  .action(async (opts) => {
    const token = process.env.GITHUB_TOKEN ?? process.env.PAE_TOKEN ?? '';
    if (!opts.file && !token) {
      console.error('Error: GITHUB_TOKEN or PAE_TOKEN env var required for --space mode');
      process.exit(1);
    }

    const reader = new GitHubLedgerReader(token);
    const store  = new ProcessedMessageStore();
    const dispatcher = new GitHubDispatcher({ token, dryRun: opts.dryRun, verbose: opts.verbose });

    // Load routing rules
    let rules: RouteRule[] = [];
    try {
      rules = JSON.parse(readFileSync(opts.rules, 'utf-8')) as RouteRule[];
    } catch {
      console.warn(`[warn] Could not load rules from ${opts.rules}, using empty ruleset`);
    }

    // Read inbox content
    let content: string;
    if (opts.file) {
      content = reader.readLocalFile(opts.file);
    } else if (opts.space && opts.repo) {
      content = await reader.readSpaceInbox(opts.repo, opts.space);
    } else {
      console.error('Error: provide --file or both --space and --repo');
      process.exit(1);
    }

    // Parse → classify → route → dispatch
    const messages = parseMarkdownInbox(content);
    console.log(`[scan] Found ${messages.length} message(s)`);

    for (const msg of messages) {
      if (store.isProcessed(msg.id)) {
        if (opts.verbose) console.log(`[skip] Already processed: ${msg.id}`);
        continue;
      }

      const cls     = classifyMessage(msg);
      const actions = matchRouteRules(msg, cls, rules, opts.repo ?? 'nothinginfinity/pocket-agent-engine');

      if (opts.verbose) {
        console.log(`[classify] ${msg.id} → ${cls.intent} (${cls.confidence})`);
        console.log(`[actions]`, actions.map(a => a.type).join(', '));
      }

      const result = await dispatcher.dispatch(msg, cls, actions);

      if (result.success) {
        store.markProcessed(msg.id);
        console.log(`[ok] ${msg.id} → ${cls.intent} → ${result.actionsDispatched.map(a => a.type).join(', ')}`);
      } else {
        console.error(`[error] ${msg.id}: ${result.error}`);
      }
    }
  });

program
  .command('status')
  .description('Print last processed message IDs')
  .action(() => {
    const store = new ProcessedMessageStore();
    const ids = store.getAll();
    console.log(`Processed messages: ${ids.length}`);
    ids.forEach(id => console.log(` - ${id}`));
  });

program
  .command('rules')
  .description('Print active routing rules')
  .option('--rules <path>', 'Path to rules JSON file', 'config/rules.json')
  .action((opts) => {
    try {
      const rules = JSON.parse(readFileSync(opts.rules, 'utf-8')) as RouteRule[];
      console.log(`Active rules: ${rules.filter(r => r.enabled).length}/${rules.length}`);
      rules.filter(r => r.enabled).forEach(r => {
        console.log(` - [${r.id}] ${r.name} → ${r.actions.map(a => a.type).join(', ')}`);
      });
    } catch {
      console.error('Could not load rules file');
    }
  });

program.parse();
