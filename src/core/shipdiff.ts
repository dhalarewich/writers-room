import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { moveCard } from './board.js';
import { appendSection, loadCard, saveCard } from './card.js';
import type { Card, Studio } from './types.js';

function editsDir(studio: Studio): string {
  const dir = join(studio.root, 'memory', 'edits');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Freeze the agent-final body when a card reaches ready/. */
export function snapshotForShip(studio: Studio, card: Card): void {
  writeFileSync(join(editsDir(studio), `${card.meta.id}.agent.md`), card.body);
}

/**
 * Minimal unified-style line diff (LCS). Enough to show the operator's hand
 * edits to /learn; not a general-purpose diff tool.
 */
export function lineDiff(a: string, b: string): string {
  const A = a.split('\n');
  const B = b.split('\n');
  const m = A.length;
  const n = B.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = A[i] === B[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      out.push(`  ${A[i]}`);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push(`- ${A[i]}`);
      i++;
    } else {
      out.push(`+ ${B[j]}`);
      j++;
    }
  }
  while (i < m) out.push(`- ${A[i++]}`);
  while (j < n) out.push(`+ ${B[j++]}`);
  return out.join('\n');
}

/** Compact a full diff to changed lines with one line of context on each side. */
function compact(diff: string): string {
  const lines = diff.split('\n');
  const keep = new Set<number>();
  lines.forEach((line, idx) => {
    if (line.startsWith('- ') || line.startsWith('+ ')) {
      keep.add(idx - 1);
      keep.add(idx);
      keep.add(idx + 1);
    }
  });
  const out: string[] = [];
  let lastKept = -2;
  lines.forEach((line, idx) => {
    if (!keep.has(idx)) return;
    if (idx > lastKept + 1) out.push('@@');
    out.push(line);
    lastKept = idx;
  });
  return out.join('\n');
}

export function captureShipDiff(
  studio: Studio,
  id: string,
): { diffPath: string | null; changed: boolean } {
  const snapshotPath = join(editsDir(studio), `${id}.agent.md`);
  if (!existsSync(snapshotPath)) return { diffPath: null, changed: false };
  const agentFinal = readFileSync(snapshotPath, 'utf8');
  const current = loadCard(studio, id).body;
  if (agentFinal === current) return { diffPath: null, changed: false };
  const diffPath = join(editsDir(studio), `${id}.diff`);
  const header = `# ${id} — operator edits after agent-final\n# captured ${new Date().toISOString()}\n`;
  writeFileSync(diffPath, header + compact(lineDiff(agentFinal, current)) + '\n');
  return { diffPath, changed: true };
}

/** Publish gate: ready/ → published/, capturing the operator's hand edits and logging them on the card. */
export function shipCard(
  studio: Studio,
  id: string,
): { changed: boolean; diffPath: string | null; card: Card } {
  const card = loadCard(studio, id);
  if (card.stage !== 'ready') {
    throw new Error(
      `${id} is in ${card.stage}, not ready/ — move it there first (the operator's publish gate).`,
    );
  }
  const { changed, diffPath } = captureShipDiff(studio, id);
  const moved = moveCard(studio, id, 'published');
  appendSection(
    moved,
    'Shipped',
    `${new Date().toISOString().slice(0, 10)} — operator edits after agent-final: ${changed ? `yes (${diffPath})` : 'none'}`,
  );
  saveCard(moved);
  return { changed, diffPath, card: moved };
}
