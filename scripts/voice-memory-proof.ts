/**
 * Demonstrates the voice-memory loop end to end, reproducibly, on a copy of
 * the demo studio: generate a draft, plant a correction rule in
 * memory/learnings.md, regenerate with the identical prompt assembly, and
 * verify the rule changed the output.
 *   npx tsx scripts/voice-memory-proof.ts [--model sonnet]
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStudio } from '../src/core/studio.js';
import { claude } from '../src/eval/run.js';

const model = process.argv.includes('--model')
  ? process.argv[process.argv.indexOf('--model') + 1]
  : 'sonnet';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'wr-voiceproof-'));
cpSync(join(repo, 'fixtures', 'demo-studio'), work, { recursive: true });
const studio = loadStudio(work);

const FORBIDDEN = 'loyalty';
const RULE = `### 2026-07-12 — Never use the word "${FORBIDDEN}"; describe the repeat behavior instead
- **Context**: fn-0006 — operator strips this word on sight; it labels the effect instead of showing it
- **Evidence**: operator note: "don't tell me they're loyal, tell me they came back 2.7x"
- **Apply to**: writer, editor, warden
- **Status**: active
`;

function assemble(): string {
  return [
    'You are the Writer for this studio. Draft the LinkedIn piece the card below describes, as the operator, obeying the voice spec, bans, and EVERY active rule in the learnings ledger.',
    '\n# Voice spec\n', readFileSync(join(work, 'vault', 'voice', 'style-dna.md'), 'utf8'),
    '\n# Banned patterns\n', readFileSync(join(work, 'vault', 'voice', 'banned-patterns.md'), 'utf8'),
    '\n# Learnings (operator corrections — every rule binds)\n', readFileSync(join(work, 'memory', 'learnings.md'), 'utf8'),
    '\n# The card\n', readFileSync(join(work, 'board', '3-drafting', 'fn-0006-the-50-repair-that-buys-a-decade-of-loya.md'), 'utf8'),
    '\nOutput ONLY the piece text.',
  ].join('');
}

console.log(`▸ draft A (before correction, ${model}) …`);
const before = claude(assemble(), { model, cwd: work });
writeFileSync(join(work, 'proof-A.md'), before);

const ledgerPath = join(work, 'memory', 'learnings.md');
const ledger = readFileSync(ledgerPath, 'utf8');
writeFileSync(ledgerPath, ledger.replace('<!-- Append new entries above this line, newest first. -->', RULE + '\n<!-- Append new entries above this line, newest first. -->'));

console.log('▸ draft B (after planting the rule) …');
const after = claude(assemble(), { model, cwd: work });
writeFileSync(join(work, 'proof-B.md'), after);

const inBefore = before.toLowerCase().includes(FORBIDDEN);
const inAfter = after.toLowerCase().includes(FORBIDDEN);
console.log(`\n"${FORBIDDEN}" in draft A (no rule):   ${inBefore ? 'YES' : 'no'}`);
console.log(`"${FORBIDDEN}" in draft B (rule active): ${inAfter ? 'YES' : 'no'}`);
console.log(`work dir: ${work}`);
if (!inAfter && inBefore) console.log('\nVOICE MEMORY PROOF: PASS — the planted correction changed the output.');
else if (!inAfter && !inBefore) console.log('\nInconclusive this run (word absent in both) — re-run; A omitting it by chance is possible but unlikely given the card title contains it.');
else process.exit(1);
