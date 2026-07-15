import { listCards } from '../core/board.js';
import { palette } from '../core/theme.js';
import type { Card, Studio } from '../core/types.js';
import { GATE_NAMES, STAGES } from '../core/types.js';

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gateDots(card: Card): string {
  return GATE_NAMES.map((name) => {
    const state = card.meta.gates[name];
    const cls = state === 'passed' ? 'ok' : state === 'blocked' ? 'block' : 'dim';
    const glyph = state === 'passed' ? '✓' : state === 'blocked' ? '✕' : '○';
    return `<span class="${cls}" title="${name}: ${state}">${glyph}</span>`;
  }).join('');
}

export function renderBoardHtml(studio: Studio): string {
  const cards = listCards(studio);
  const columns = STAGES.map((stage) => {
    const stageCards = cards.filter((c) => c.stage === stage);
    const items = stageCards
      .map(
        (c) => `
      <div class="card${c.meta.needs.length ? ' blocked' : ''}" draggable="true" data-id="${esc(c.meta.id)}">
        <div class="card-top"><span class="id">${esc(c.meta.id)}</span>${c.meta.score != null ? `<span class="score">${c.meta.score}</span>` : ''}<span class="gates">${gateDots(c)}</span></div>
        <div class="title">${esc(c.meta.title)}${c.meta.pinned ? ' ⚲' : ''}</div>
        <div class="meta">${esc(c.meta.channel.join(', ') || '')}${c.meta.pillar ? ` · ${esc(c.meta.pillar)}` : ''}${c.meta.needs.length ? ` · ⚠ ${esc(c.meta.needs.join(','))}` : ''}</div>
      </div>`,
      )
      .join('');
    return `
    <section class="column" data-stage="${stage}">
      <h2>${stage} <span class="count">${stageCards.length}</span></h2>
      ${items || '<div class="empty">—</div>'}
    </section>`;
  }).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(studio.config.name)} — Writers Room</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body { background: ${palette.bg}; color: ${palette.ink}; font: 13px/1.5 ui-monospace, "SF Mono", Menlo, monospace; padding: 24px; }
  header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
  header h1 { color: ${palette.copperBright}; font-size: 16px; font-weight: 600; }
  header .sub { color: ${palette.dim}; }
  .board { display: flex; gap: 12px; overflow-x: auto; align-items: flex-start; }
  .column { background: ${palette.panel}; border: 1px solid #2a251f; border-radius: 8px; padding: 10px; min-width: 210px; flex: 1; }
  .column h2 { color: ${palette.copper}; font-size: 12px; text-transform: lowercase; letter-spacing: .06em; margin-bottom: 8px; }
  .count { color: ${palette.dim}; font-weight: 400; }
  .card { background: ${palette.bg}; border: 1px solid #2a251f; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .card.blocked { border-color: ${palette.block}; }
  .card-top { display: flex; gap: 8px; align-items: baseline; }
  .id { color: ${palette.dim}; font-size: 11px; }
  .score { color: ${palette.warn}; font-weight: 600; }
  .gates { margin-left: auto; letter-spacing: .15em; }
  .ok { color: ${palette.ok}; } .block { color: ${palette.block}; } .dim { color: ${palette.dim}; }
  .title { margin-top: 4px; }
  .meta { color: ${palette.dim}; font-size: 11px; margin-top: 4px; }
  .empty { color: ${palette.dim}; text-align: center; padding: 12px 0; }
  .card { cursor: grab; }
  .card.dragging { opacity: .4; }
  .column.over { border-color: ${palette.copperBright}; background: #1c1712; }
</style></head>
<body>
<header><h1>◈ ${esc(studio.config.name)}</h1><span class="sub">${cards.length} cards · drag a card to move it</span></header>
<div class="board">${columns}</div>
<script>
let dragId = null, dragging = false;
document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  dragId = card.dataset.id;
  dragging = true;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});
document.addEventListener('dragend', (e) => {
  dragging = false;
  const card = e.target.closest('.card');
  if (card) card.classList.remove('dragging');
});
for (const col of document.querySelectorAll('.column')) {
  col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
  col.addEventListener('dragleave', () => col.classList.remove('over'));
  col.addEventListener('drop', async (e) => {
    e.preventDefault();
    col.classList.remove('over');
    const to = col.dataset.stage, id = dragId;
    dragId = null;
    if (!id || !to) return;
    const res = await fetch('/move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, to }),
    });
    if (res.ok) location.reload();
    else alert('move failed: ' + (await res.text()));
  });
}
// Auto-refresh replaces the old meta-refresh, but never mid-drag.
setInterval(() => { if (!dragging) location.reload(); }, 5000);
</script>
</body></html>`;
}
