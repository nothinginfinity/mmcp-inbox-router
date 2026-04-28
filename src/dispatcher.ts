// ============================================================
// mmcp-inbox-router — GitHub action dispatcher
// Executes RouteActions against the GitHub API
// ============================================================

import { Octokit } from '@octokit/rest';
import type { RouteAction, ProcessResult, ParsedMessage, MessageClass } from './types.js';

export class GitHubDispatcher {
  private octokit: Octokit;
  private dryRun: boolean;
  private verbose: boolean;

  constructor(options: { token: string; dryRun?: boolean; verbose?: boolean }) {
    this.octokit = new Octokit({ auth: options.token });
    this.dryRun = options.dryRun ?? false;
    this.verbose = options.verbose ?? false;
  }

  async dispatch(
    msg: ParsedMessage,
    cls: MessageClass,
    actions: RouteAction[]
  ): Promise<ProcessResult> {
    const dispatched: RouteAction[] = [];
    let error: string | undefined;

    try {
      for (const action of actions) {
        if (this.verbose) console.log(`[dispatch] ${action.type}`, action);

        if (this.dryRun) {
          console.log(`[dry-run] Would execute: ${action.type}`);
          dispatched.push(action);
          continue;
        }

        await this.execute(action);
        dispatched.push(action);
      }
    } catch (err) {
      error = String(err);
      console.error(`[dispatch] Error for message ${msg.id}:`, error);
    }

    return {
      messageId: msg.id,
      intent: cls.intent,
      actionsDispatched: dispatched,
      success: !error,
      error,
      dryRun: this.dryRun,
    };
  }

  private async execute(action: RouteAction): Promise<void> {
    switch (action.type) {
      case 'create_issue': {
        const [owner, repo] = action.repo.split('/');
        await this.octokit.issues.create({
          owner, repo,
          title: action.title,
          body: action.body,
          labels: action.labels,
        });
        break;
      }

      case 'append_thread': {
        const [owner, repo] = action.repo.split('/');
        await this.octokit.issues.createComment({
          owner, repo,
          issue_number: action.issueNumber,
          body: action.body,
        });
        break;
      }

      case 'update_status': {
        const [owner, repo] = action.repo.split('/');
        // Get current SHA for update
        let sha: string | undefined;
        try {
          const { data } = await this.octokit.repos.getContent({ owner, repo, path: action.path });
          if (!Array.isArray(data) && data.type === 'file') sha = data.sha;
        } catch { /* file may not exist yet */ }

        await this.octokit.repos.createOrUpdateFileContents({
          owner, repo,
          path: action.path,
          message: `chore: update status via mmcp-inbox-router`,
          content: Buffer.from(action.content).toString('base64'),
          ...(sha ? { sha } : {}),
        });
        break;
      }

      case 'write_receipt': {
        // Append receipt to the space's inbox.md as a processed marker
        const [owner, repo] = action.repo.split('/');
        const path = `spaces/${action.spaceName}/inbox.md`;
        let existingContent = '';
        let sha: string | undefined;

        try {
          const { data } = await this.octokit.repos.getContent({ owner, repo, path });
          if (!Array.isArray(data) && data.type === 'file') {
            existingContent = Buffer.from(data.content, 'base64').toString();
            sha = data.sha;
          }
        } catch { /* file may not exist */ }

        const receipt = `\n<!-- processed:${action.messageId}:${action.status}:${new Date().toISOString()} -->\n`;
        const newContent = existingContent + receipt;

        await this.octokit.repos.createOrUpdateFileContents({
          owner, repo, path,
          message: `chore: receipt for ${action.messageId}`,
          content: Buffer.from(newContent).toString('base64'),
          ...(sha ? { sha } : {}),
        });
        break;
      }

      case 'trigger_workflow': {
        const [owner, repo] = action.repo.split('/');
        await this.octokit.actions.createWorkflowDispatch({
          owner, repo,
          workflow_id: action.workflowId,
          ref: 'main',
          inputs: action.inputs ?? {},
        });
        break;
      }

      case 'noop':
        if (this.verbose) console.log(`[noop] ${action.reason}`);
        break;
    }
  }
}
