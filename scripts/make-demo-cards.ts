/**
 * Generates the demo studio's board cards. Run once from the repo root:
 *   npx tsx scripts/make-demo-cards.ts
 * Idempotence: refuses to run if the demo board already has cards.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendSection, createCard, saveCard } from '../src/core/card.js';
import { listCards } from '../src/core/board.js';
import { loadStudio } from '../src/core/studio.js';
import { buildIndex } from '../src/core/vault.js';
import { writeStatus } from '../src/core/status.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'demo-studio');
const studio = loadStudio(root);
if (listCards(studio).length > 0) {
  console.error('demo studio already has cards — refusing to regenerate');
  process.exit(1);
}

// Inbox: three raw captures.
createCard(studio, { title: 'Stove fuel math nobody does', source: 'capture — trailhead note' }, 'inbox',
  'Everyone compares stove weights, nobody compares fuel-per-boil at altitude. My canister log from the Winds trip has real numbers: the "light" stove cost me 40g/day more in fuel.\n');
createCard(studio, { title: 'Repair desks as brand moats', source: 'capture — conversation' }, 'inbox',
  'Talked to the repair lead at a pack company. They log failures by seam like we did. Nobody writes about this as a moat. Ties to the jacket experiment.\n');
createCard(studio, { title: 'The gear list I actually regret', source: 'capture — shower thought' }, 'inbox',
  'Ten years of gear lists and the regrets are all the same category: things bought for trips I imagined, not trips I take.\n');

// Ideas: two scored cards with dossier sections.
const idea1 = createCard(studio, {
  title: 'Fuel-per-boil is the spec sheet lie',
  channel: ['longform'], pillar: 'gear-truth', score: 81, tags: ['priority'],
  source: 'scout — split from fuel math capture',
}, 'ideas', 'Angle: stove weight is a vanity metric; fuel consumption at altitude is the real weight. Use the Winds canister log: 12 boils, weighed before/after.\n');
appendSection(idea1, 'Positioning', 'Audience: gram-counters ready to be told they are counting the wrong grams. Ladders to the "specs hide the field" throughline. Verdict: strong fit.');
appendSection(idea1, 'Score', 'specificity 26/30 · strategic 21/25 · audience 17/20 · novelty 11/15 · urgency 6/10 → **81**. The honest line: the canister log is the piece; without it this is a take.');
saveCard(idea1);

const idea2 = createCard(studio, {
  title: 'Buy gear for the trips you take',
  channel: ['linkedin'], pillar: 'trail-craft', score: 64,
  source: 'scout — split from regret capture',
}, 'ideas', 'Angle: audit a decade of purchases against actual trip log; the regret pattern is aspirational buying.\n');
appendSection(idea2, 'Positioning', 'Audience: overbuyers. Well-worn territory; the trip-log audit is the only fresh part. Verdict: reframe needed.');
appendSection(idea2, 'Score', 'specificity 17/30 · strategic 15/25 · audience 15/20 · novelty 8/15 · urgency 9/10 → **64**. Needs the actual audit numbers to clear 72.');
saveCard(idea2);

// Drafting: one card mid-pipeline with fact brief.
const drafting = createCard(studio, {
  title: 'The $50 repair that buys a decade of loyalty',
  channel: ['linkedin'], pillar: 'small-business', score: 84,
  gates: { facts: 'passed', critique: 'pending', voice: 'pending' },
  source: 'scout — split from repair moat capture',
}, 'drafting',
  'Draft in progress: open on the deliberate jacket sabotage, land the 2.7× repeat-purchase number, close on "the repair desk is the brand."\n');
appendSection(drafting, 'Fact brief', '| # | Claim | Status | Source | Confidence |\n|---|---|---|---|---|\n| 1 | repair costs brand ~$50 all-in | verified | vault: warranty-economics | high |\n| 2 | repeat-purchase 2.7× after free repair | verified | vault: warranty-economics | high |\n| 3 | "three brands tested" | verified | bio + samples | high |\n\nGate: passed. No load-bearing claim needs the web.');
appendSection(drafting, 'Pulled', 'vault/knowledge/repair/warranty-economics.md — the $50 and 2.7× numbers\nvault/bio.md — repair-desk standing, no-founder guard');
saveCard(drafting);

buildIndex(studio);
writeStatus(studio);
console.log('demo cards created:', listCards(studio).map((c) => c.meta.id).join(', '));
