import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { listCards } from './board.js';
import type { Card, Stage, Studio } from './types.js';
import { GATE_STATES, STAGES, STAGE_DIRS } from './types.js';

export interface Problem {
  path: string;
  rule: string;
  message: string;
}

/** Stages from which a card must carry a pillar. */
const PILLAR_REQUIRED_FROM: Stage[] = ['ideas', 'approved', 'drafting', 'editing', 'ready', 'published'];

export function checkStudio(studio: Studio): Problem[] {
  const problems: Problem[] = [];
  const cards = listCards(studio);
  const byId = new Map<string, Card[]>();

  for (const card of cards) {
    const push = (rule: string, message: string) =>
      problems.push({ path: card.path, rule, message });
    const list = byId.get(card.meta.id) ?? [];
    list.push(card);
    byId.set(card.meta.id, list);

    const fileId = basename(card.path).split('-').slice(0, 2).join('-');
    if (card.meta.id && fileId !== card.meta.id) {
      push('id-mismatch', `filename says ${fileId} but frontmatter says ${card.meta.id}`);
    }
    if (!card.meta.title) push('title-missing', 'card has no title');

    if (card.meta.pillar && !studio.config.pillars.includes(card.meta.pillar)) {
      push('pillar-unknown', `pillar "${card.meta.pillar}" is not in studio.yml (${studio.config.pillars.join(', ')})`);
    }
    if (!card.meta.pillar && PILLAR_REQUIRED_FROM.includes(card.stage)) {
      push('pillar-missing', `cards in ${card.stage} need exactly one pillar`);
    }
    for (const channel of card.meta.channel) {
      if (!studio.config.channels.includes(channel)) {
        push('channel-unknown', `channel "${channel}" is not in studio.yml (${studio.config.channels.join(', ')})`);
      }
    }
    for (const [gate, state] of Object.entries(card.meta.gates)) {
      if (!GATE_STATES.includes(state)) {
        push('gate-invalid', `gate ${gate} has invalid state "${state}"`);
      }
    }
    const blocked = Object.values(card.meta.gates).includes('blocked');
    if (blocked && !card.meta.needs.includes('operator')) {
      push('needs-vs-gates', 'a blocked gate requires needs: [operator] so the board surfaces it');
    }
    if (card.meta.series) {
      const anchor = cards.find((c) => c.meta.id === card.meta.series?.of);
      if (!anchor) {
        push('series-broken', `series anchor ${card.meta.series.of} not found on the board`);
      }
      const siblings = cards.filter((c) => c.meta.series?.of === card.meta.series?.of);
      const lens = new Set(siblings.map((c) => c.meta.series?.len));
      if (lens.size > 1) {
        push('series-broken', `siblings of ${card.meta.series.of} disagree on series length`);
      }
    }
  }

  for (const [id, dupes] of byId) {
    if (id && dupes.length > 1) {
      for (const card of dupes) {
        problems.push({ path: card.path, rule: 'dup-id', message: `id ${id} appears ${dupes.length} times` });
      }
    }
  }

  for (const stage of STAGES) {
    const dir = join(studio.root, 'board', STAGE_DIRS[stage]);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (file.startsWith('.')) continue;
      if (!file.endsWith('.md')) {
        problems.push({
          path: join(dir, file),
          rule: 'stray-file',
          message: 'not a card — run `wr adopt` to convert notes into cards',
        });
      }
    }
  }

  return problems;
}
