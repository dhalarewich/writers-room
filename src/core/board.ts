import { mkdirSync, readFileSync, renameSync } from 'node:fs';
import { basename, join } from 'node:path';
import { cardFiles, loadCard, parseCard, saveCard } from './card.js';
import { snapshotForShip } from './shipdiff.js';
import type { Card, Stage, Studio } from './types.js';
import { STAGES, STAGE_DIRS } from './types.js';

export function listCards(studio: Studio, stage?: Stage): Card[] {
  const stages = stage ? [stage] : STAGES;
  const cards: Card[] = [];
  for (const s of stages) {
    for (const path of cardFiles(studio, s)) {
      cards.push(parseCard(path, s, readFileSync(path, 'utf8')));
    }
  }
  return cards;
}

export function boardCounts(studio: Studio): Record<Stage, number> {
  const counts = {} as Record<Stage, number>;
  for (const s of STAGES) counts[s] = cardFiles(studio, s).length;
  return counts;
}

export function moveCard(
  studio: Studio,
  id: string,
  to: Stage,
  opts: { force?: boolean } = {},
): Card {
  const card = loadCard(studio, id);
  if (card.meta.pinned && !opts.force) {
    throw new Error(`${id} is pinned — pass --force after the operator has approved the move`);
  }
  if (card.stage === to) return card;
  const target = join(studio.root, 'board', STAGE_DIRS[to], basename(card.path));
  renameSync(card.path, target);
  card.path = target;
  card.stage = to;
  saveCard(card);
  if (to === 'ready') snapshotForShip(studio, card);
  return card;
}

export function archiveCard(studio: Studio, id: string): string {
  const card = loadCard(studio, id);
  if (card.meta.pinned) {
    throw new Error(`${id} is pinned — pass --force after the operator has approved the move`);
  }
  const dir = join(studio.root, 'board', 'archive');
  mkdirSync(dir, { recursive: true });
  const target = join(dir, basename(card.path));
  renameSync(card.path, target);
  return target;
}
