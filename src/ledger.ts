// ============================================================
// mmcp-inbox-router — GitHub ledger reader
// Reads inbox.md files from GitHub via REST API
// ============================================================

import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';

export class GitHubLedgerReader {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /** Read a single inbox.md by space name from a GitHub repo */
  async readSpaceInbox(repo: string, spaceName: string): Promise<string> {
    const [owner, repoName] = repo.split('/');
    const path = `spaces/${spaceName}/inbox.md`;

    const { data } = await this.octokit.repos.getContent({ owner, repo: repoName, path });
    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }
    return Buffer.from(data.content, 'base64').toString();
  }

  /** List all space inbox paths in a repo */
  async listSpaceInboxes(repo: string): Promise<string[]> {
    const [owner, repoName] = repo.split('/');
    const inboxes: string[] = [];

    try {
      const { data } = await this.octokit.repos.getContent({
        owner, repo: repoName, path: 'spaces'
      });
      if (!Array.isArray(data)) return [];

      for (const entry of data) {
        if (entry.type === 'dir') {
          inboxes.push(entry.name);
        }
      }
    } catch {
      // spaces/ directory may not exist
    }

    return inboxes;
  }

  /** Read a local inbox.md file (for CLI --file mode) */
  readLocalFile(filePath: string): string {
    return readFileSync(filePath, 'utf-8');
  }
}
