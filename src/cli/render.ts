import { listCards } from '../core/board.js';
import { palette, paint } from '../core/theme.js';
import type { Card, Studio } from '../core/types.js';
import { STAGES, STAGE_DIRS, GATE_NAMES } from '../core/types.js';

function gateGlyphs(card: Card): string {
  return GATE_NAMES.map((name) => {
    const state = card.meta.gates[name];
    if (state === 'passed') return paint('✓', palette.ok);
    if (state === 'blocked') return paint('✕', palette.block);
    if (state === 'n/a') return paint('·', palette.dim);
    return paint('○', palette.dim);
  }).join('');
}

export function renderBoard(studio: Studio): string {
  const lines: string[] = [];
  const cards = listCards(studio);
  lines.push(paint(`◈ ${studio.config.name}`, palette.copperBright, { bold: true }) + paint(`  ${cards.length} cards`, palette.dim));
  for (const stage of STAGES) {
    const stageCards = cards.filter((c) => c.stage === stage);
    lines.push('');
    lines.push(paint(`${STAGE_DIRS[stage]}`, palette.copper, { bold: true }) + paint(` (${stageCards.length})`, palette.dim));
    for (const card of stageCards) {
      const score = card.meta.score != null ? paint(String(card.meta.score).padStart(3), palette.warn) : '  ·';
      const needs = card.meta.needs.length ? paint(` ⚠ ${card.meta.needs.join(',')}`, palette.block) : '';
      const pin = card.meta.pinned ? paint(' ⚲', palette.copperBright) : '';
      lines.push(
        `  ${paint(card.meta.id, palette.ink)} ${score} ${gateGlyphs(card)}  ${card.meta.title}${pin}${needs}`,
      );
    }
  }
  return lines.join('\n');
}

export function boardJson(studio: Studio): string {
  const cards = listCards(studio).map((c) => ({
    id: c.meta.id,
    stage: c.stage,
    title: c.meta.title,
    score: c.meta.score ?? null,
    channel: c.meta.channel,
    pillar: c.meta.pillar ?? null,
    tags: c.meta.tags,
    gates: c.meta.gates,
    needs: c.meta.needs,
    pinned: c.meta.pinned,
    series: c.meta.series ?? null,
    path: c.path,
  }));
  return JSON.stringify({ studio: studio.config.name, cards }, null, 2);
}
