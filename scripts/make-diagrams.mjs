// Regenerate assets/diagrams/*.svg — hand-laid-out SVG (no auto-layout) so text
// never depends on a browser's font metrics. Mirrors scripts/make-wordmark.mjs:
// plain .mjs, writeFileSync, run with `node`. Colors hardcoded from src/core/theme.ts
// so the diagrams read correctly on GitHub in both light and dark page themes —
// the dark rounded background makes each SVG self-contained.
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = '#141210';
const PANEL_FILL = '#1d1a17';
const PANEL_STROKE = '#2a251f';
const TEXT = '#e8e0d4';
const DIM = '#8a7f70';
const COPPER = '#c47a3d';
const BRIGHT_COPPER = '#e09a5a';
const OK_GREEN = '#7d9c6a';
const FONT = "ui-monospace, 'SF Mono', Menlo, monospace";

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function bg(w, h) {
  return `<rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="${BG}"/>`;
}

function box(x, y, w, h, { stroke = PANEL_STROKE, strokeWidth = 1 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ry="8" fill="${PANEL_FILL}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function text(x, y, content, { size = 13, color = TEXT, anchor = 'middle' } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(content)}</text>`;
}

// Straight arrow from (x1,y1) to (x2,y2) with a small triangular head at the end.
function arrow(x1, y1, x2, y2, color, width = 1, { dashed = false } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const headLen = 8;
  const headWidth = 4;
  const backX = x2 - ux * headLen;
  const backY = y2 - uy * headLen;
  const perpX = -uy;
  const perpY = ux;
  const p1x = (backX + perpX * headWidth).toFixed(1);
  const p1y = (backY + perpY * headWidth).toFixed(1);
  const p2x = (backX - perpX * headWidth).toFixed(1);
  const p2y = (backY - perpY * headWidth).toFixed(1);
  const dash = dashed ? ` stroke-dasharray="4 3"` : '';
  return (
    `<line x1="${x1}" y1="${y1}" x2="${backX.toFixed(1)}" y2="${backY.toFixed(1)}" stroke="${color}" stroke-width="${width}"${dash}/>\n` +
    `<polygon points="${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>`
  );
}

function buildBoardFlow() {
  const W = 860;
  const H = 220;
  const boxY = 60;
  const boxH = 42;
  const textY = 86; // boxY + boxH/2 + ~5
  const callY = 42; // "your call" label, above box row
  const subY = 122; // sub-label, below box row (boxY+boxH=102, +20 clear)
  const braceY = 150;
  const capY = 172;

  const stages = [
    { label: '0 inbox', x: 40, w: 80 },
    { label: '1 ideas', x: 143, w: 80 },
    { label: '2 approved', x: 246, w: 100 },
    { label: '3 drafting', x: 369, w: 100 },
    { label: '4 editing', x: 492, w: 92 },
    { label: '5 ready', x: 607, w: 80 },
    { label: '6 published', x: 710, w: 110 },
  ];

  const parts = [bg(W, H)];

  // Arrows between consecutive stages. Index 1 (ideas->approved) and index 5
  // (ready->published) are the human gates — bright copper, 2px, labeled.
  for (let i = 0; i < stages.length - 1; i++) {
    const a = stages[i];
    const b = stages[i + 1];
    const x1 = a.x + a.w;
    const x2 = b.x;
    const y = boxY + boxH / 2;
    const isGate = i === 1 || i === 5;
    const color = isGate ? BRIGHT_COPPER : DIM;
    const width = isGate ? 2 : 1;
    parts.push(arrow(x1, y, x2, y, color, width));
    if (isGate) {
      const cx = (x1 + x2) / 2;
      parts.push(text(cx, callY, 'your call', { size: 11, color: BRIGHT_COPPER }));
      const sub = i === 1 ? 'worth drafting?' : '/ship';
      parts.push(text(cx, subY, sub, { size: 11, color: BRIGHT_COPPER }));
    }
  }

  // Stage boxes (published gets the ok-green border).
  stages.forEach((s, i) => {
    const stroke = i === stages.length - 1 ? OK_GREEN : PANEL_STROKE;
    parts.push(box(s.x, boxY, s.w, boxH, { stroke }));
    parts.push(text(s.x + s.w / 2, textY, s.label, { size: 13 }));
  });

  // Dim brace spanning approved -> ready, captioned underneath.
  const braceX1 = stages[2].x;
  const braceX2 = stages[5].x + stages[5].w;
  parts.push(`<line x1="${braceX1}" y1="${braceY}" x2="${braceX2}" y2="${braceY}" stroke="${DIM}" stroke-width="1"/>`);
  parts.push(`<line x1="${braceX1}" y1="${braceY - 6}" x2="${braceX1}" y2="${braceY}" stroke="${DIM}" stroke-width="1"/>`);
  parts.push(`<line x1="${braceX2}" y1="${braceY - 6}" x2="${braceX2}" y2="${braceY}" stroke="${DIM}" stroke-width="1"/>`);
  parts.push(
    text((braceX1 + braceX2) / 2, capY, 'the pipeline drives everything between the two gates (/write)', {
      size: 11,
      color: DIM,
    }),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Board flow: seven stages from inbox to published. Two human-gate arrows, bright copper — ideas to approved (worth drafting) and ready to published (ship) — bracket a pipeline that runs the rest on its own.">
${parts.join('\n')}
</svg>
`;
}

function buildAnatomy() {
  const W = 860;
  const H = 300;

  const topY = 18;
  const topH = 62;
  const topTitleY = 44;
  const topSubY = 66;

  const cardY = 118;
  const cardH = 50;
  const cardTextY = 148;

  const botY = 196;
  const botH = 58;
  const botTitleY = 222;
  const botSubY = 244;

  const panelA = { x: 20, w: 390 };
  const panelB = { x: 450, w: 390 };
  const card = { x: 300, w: 260 };
  const vault = { x: 20, w: 300 };
  const memory = { x: 540, w: 300 };
  const draft = { x: 360, w: 140 };

  const parts = [bg(W, H)];

  // Top row: channels + pillars, each arrowing down into the card.
  parts.push(box(panelA.x, topY, panelA.w, topH));
  parts.push(text(panelA.x + panelA.w / 2, topTitleY, 'channels — where you publish'));
  parts.push(text(panelA.x + panelA.w / 2, topSubY, 'linkedin · blog · x', { size: 11, color: DIM }));

  parts.push(box(panelB.x, topY, panelB.w, topH));
  parts.push(text(panelB.x + panelB.w / 2, topTitleY, 'pillars — what you own'));
  parts.push(text(panelB.x + panelB.w / 2, topSubY, '3–5 themes, one per card', { size: 11, color: DIM }));

  parts.push(arrow(panelA.x + panelA.w / 2, topY + topH, card.x + 65, cardY, DIM, 1));
  parts.push(arrow(panelB.x + panelB.w / 2, topY + topH, card.x + card.w - 65, cardY, DIM, 1));

  // Center card, bright-copper border.
  parts.push(box(card.x, cardY, card.w, cardH, { stroke: BRIGHT_COPPER, strokeWidth: 2 }));
  parts.push(text(card.x + card.w / 2, cardTextY, 'card = one pillar × channels', { color: BRIGHT_COPPER }));

  // Card feeds down into draft.
  parts.push(arrow(card.x + card.w / 2, cardY + cardH, draft.x + draft.w / 2, botY, DIM, 1));

  // Bottom row: vault (left) and memory (right), each arrowing into draft.
  parts.push(box(vault.x, botY, vault.w, botH));
  parts.push(text(vault.x + vault.w / 2, botTitleY, 'vault/ — ratified memory (canon)'));
  parts.push(text(vault.x + vault.w / 2, botSubY, 'voice · bio · strategy · rubric', { size: 11, color: DIM }));

  parts.push(box(memory.x, botY, memory.w, botH));
  parts.push(text(memory.x + memory.w / 2, botTitleY, 'memory/ — provisional ledger'));
  parts.push(text(memory.x + memory.w / 2, botSubY, 'learnings · your edit diffs', { size: 11, color: DIM }));

  parts.push(box(draft.x, botY, draft.w, botH));
  parts.push(text(draft.x + draft.w / 2, botY + botH / 2 + 5, 'draft', { size: 15, color: TEXT }));

  const midY = botY + botH / 2;
  parts.push(arrow(vault.x + vault.w, midY, draft.x, midY, COPPER, 2));
  parts.push(arrow(memory.x, midY, draft.x + draft.w, midY, COPPER, 2));

  // Dashed graduation path along the bottom: memory earns its way into vault.
  const gradY = 272;
  parts.push(
    arrow(memory.x + memory.w / 2, gradY, vault.x + vault.w / 2, gradY, DIM, 1, { dashed: true }),
  );
  parts.push(
    text((vault.x + vault.w / 2 + memory.x + memory.w / 2) / 2, 290, 'graduates after 3+ ships + your sign-off', {
      size: 11,
      color: DIM,
    }),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Studio anatomy: channels and pillars meet in a card. Vault (ratified memory) and memory (provisional ledger) both feed the draft; memory graduates into vault after ships and your sign-off.">
${parts.join('\n')}
</svg>
`;
}

mkdirSync(new URL('../assets/diagrams/', import.meta.url), { recursive: true });
writeFileSync(new URL('../assets/diagrams/board-flow.svg', import.meta.url), buildBoardFlow());
writeFileSync(new URL('../assets/diagrams/anatomy.svg', import.meta.url), buildAnatomy());
console.log('board-flow.svg and anatomy.svg written to assets/diagrams/');
