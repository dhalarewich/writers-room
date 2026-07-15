import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { boardCounts, listCards } from './board.js';
import type { Studio } from './types.js';

export function writeStatus(studio: Studio): void {
  const cards = listCards(studio);
  const blocked = cards
    .filter((c) => c.meta.needs.length > 0 || Object.values(c.meta.gates).includes('blocked'))
    .map((c) => ({ id: c.meta.id, stage: c.stage, needs: c.meta.needs }));
  const published = cards.filter((c) => c.stage === 'published');
  const lastShipped = published.length
    ? published.reduce((a, b) => (a.meta.updated > b.meta.updated ? a : b)).meta.id
    : null;
  const status = {
    studio: studio.config.name,
    counts: boardCounts(studio),
    blocked,
    lastShipped,
    updated: new Date().toISOString(),
  };
  writeFileSync(join(studio.root, '.wr', 'status.json'), JSON.stringify(status, null, 2));
}

export function readStatus(root: string): Record<string, unknown> | null {
  const path = join(root, '.wr', 'status.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}
