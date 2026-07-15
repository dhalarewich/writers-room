/**
 * One-time: advance the demo studio into a showcase board — full dossiers,
 * green gates, a real shipped card with a captured edit diff. Run after
 * make-demo-cards.ts:  npx tsx scripts/make-demo-showcase.ts
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendSection, createCard, loadCard, saveCard } from '../src/core/card.js';
import { moveCard } from '../src/core/board.js';
import { captureShipDiff } from '../src/core/shipdiff.js';
import { loadStudio } from '../src/core/studio.js';
import { buildIndex } from '../src/core/vault.js';
import { writeStatus } from '../src/core/status.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'demo-studio');
const studio = loadStudio(root);

// fn-0007: score the approved card
const approved = loadCard(studio, 'fn-0007');
approved.meta.score = 86;
approved.meta.tags = ['priority'];
appendSection(approved, 'Positioning', 'Audience: cottage-brand owners and the readers who buy from them. Sequel economics: part one earned the audience, this one pays it off with a table. Verdict: strong fit.');
appendSection(approved, 'Score', 'specificity 27/30 · strategic 23/25 · audience 18/20 · novelty 10/15 · urgency 8/10 → **86**. The honest line: the response-time table IS the piece; without three real data rows this is a rerun.');
saveCard(approved);

// fn-0006: finished draft, full dossier, all gates green → ready → operator edit → shipped
const piece = loadCard(studio, 'fn-0006');
piece.body = `I broke a $340 jacket on purpose last month.

Sliced the pit zip clean through, sent it back with an honest note, and started a timer. Third brand I've done this to. The first sent a form email and a discount code. The second quoted $45 and six weeks.

This one called me. A human, two days later, asked what I'd been doing when it tore, and had the jacket back on my porch in eleven days with a contrasting patch and a note: "we log every failure by seam, thanks for the data point."

Here's the math nobody at that company said out loud: the repair cost them about $50 all-in. The repeat-purchase rate we measured on the repair desk was 2.7× baseline. A discount code costs $34 in margin and buys no loyalty at all.

That jacket company gets every dollar I spend in this category for the next decade, and I tell this story at every trailhead.

The repair desk is the brand. The rest is fabric.
` + piece.body.slice(piece.body.indexOf('\n***\n') === -1 ? piece.body.length : piece.body.indexOf('\n***\n'));
appendSection(piece, 'Edit log', 'Words 260 → 198 (−24%). Hook kept — the sabotage confession opens cold, per style DNA. Tie-back audit: timer planted in ¶2 pays off in the eleven-days line; $340 pays off in the $50/$34 math. Cuts: warranty-policy aside (redundant with the note quote), second anecdote (one perfect example rule). DEFENDs honored: 1/1. Sweep: snaps 1, dashes 0. **Bet:** saves outperform likes 3:1 — this is a screenshot-and-send piece.');
appendSection(piece, 'Critique gate', 'Verdict: passed. Delivers the 84 — the measured 2.7× and the $50/$34 spread are the piece; specificity survived drafting intact.');
appendSection(piece, 'Voice gate', 'Sweep before → after: snaps 1 → 1 (deliberate, the close) · dashes 0 → 0 · triads 0 · rhythm varied. Fidelity 9/10 — "The repair desk is the brand. The rest is fabric." is the operator cold. Clean on all checks, no edits.');
piece.meta.gates = { facts: 'passed', critique: 'passed', voice: 'passed' };
saveCard(piece);
moveCard(studio, 'fn-0006', 'editing');
moveCard(studio, 'fn-0006', 'ready');

// the operator's hand edit after agent-final (this is what /learn mines)
const ready = loadCard(studio, 'fn-0006');
ready.body = ready.body.replace('and I tell this story at every trailhead', 'and I have told this story at three trailheads already');
saveCard(ready);
const { changed } = captureShipDiff(studio, 'fn-0006');
console.log('edit diff captured:', changed);
const shipped = moveCard(studio, 'fn-0006', 'published');
appendSection(shipped, 'Shipped', '2026-07-14 — operator edits after agent-final: yes (memory/edits/fn-0006.diff)');
saveCard(shipped);

// fn-0009: a second finished piece sitting in ready/ (the operator-gate column stays visible)
const readyCard = createCard(studio, {
  title: 'Eight points or nothing: stake-out geometry',
  channel: ['x'], pillar: 'trail-craft', score: 78,
  gates: { facts: 'passed', critique: 'passed', voice: 'passed' },
  source: 'muse — teaching probe',
}, 'editing', 'Pitched on a rock ledge above Cataract Creek and paid for it by 1am. The Halcyon wants eight honest stake points; I gave it five and a prayer. The tent was never the problem. The site was. Count your points before you count your grams.\n');
appendSection(readyCard, 'Fact brief', '| # | Claim | Status | Source | Confidence |\n|---|---|---|---|---|\n| 1 | eight stake-out points spec | verified | vault: failure-modes | high |\n\nGate: passed.');
appendSection(readyCard, 'Voice gate', 'Clean on all four checks, no edits. Fidelity 9/10.');
saveCard(readyCard);
moveCard(studio, readyCard.meta.id, 'ready');

buildIndex(studio);
writeStatus(studio);
console.log('showcase ready');
