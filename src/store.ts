// ============================================================
// mmcp-inbox-router — processed message deduplication store
// In-memory for now; persisted to .mmcp-router-state.json
// ============================================================

import { existsSync, readFileSync, writeFileSync } from 'fs';

const STATE_FILE = '.mmcp-router-state.json';

export class ProcessedMessageStore {
  private processed: Set<string>;
  private statePath: string;

  constructor(statePath: string = STATE_FILE) {
    this.statePath = statePath;
    this.processed = this.load();
  }

  isProcessed(messageId: string): boolean {
    return this.processed.has(messageId);
  }

  markProcessed(messageId: string): void {
    this.processed.add(messageId);
    this.save();
  }

  getAll(): string[] {
    return [...this.processed];
  }

  private load(): Set<string> {
    if (!existsSync(this.statePath)) return new Set();
    try {
      const data = JSON.parse(readFileSync(this.statePath, 'utf-8')) as { processed: string[] };
      return new Set(data.processed ?? []);
    } catch {
      return new Set();
    }
  }

  private save(): void {
    writeFileSync(
      this.statePath,
      JSON.stringify({ processed: [...this.processed], updatedAt: new Date().toISOString() }, null, 2)
    );
  }
}
