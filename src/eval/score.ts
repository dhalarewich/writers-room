import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadSweepConfig } from '../core/sweepconfig.js';
import { sweep, type SweepResult } from '../core/sweep.js';
import type { Studio } from '../core/types.js';
import { claude, loadCases, type EvalCase } from './run.js';

export interface Judgment {
  case: string;
  axes: Record<'solo' | 'lineup', Record<string, number>>;
  moreLikeAuthor: 'solo' | 'lineup' | 'tie';
  rationale: string;
}

export interface CaseScore {
  case: string;
  mechanical: Record<'solo' | 'lineup', SweepResult>;
  judgment: Judgment | null;
}

const AXES = ['voice_fidelity', 'specificity', 'hook', 'restraint', 'overall'] as const;

function judgePrompt(studio: Studio, evalCase: EvalCase, a: string, b: string, reference: string): string {
  const dna = readFileSync(join(studio.root, 'vault', 'voice', 'style-dna.md'), 'utf8');
  return [
    'You are judging two anonymous drafts of the same piece against an author\'s voice spec and a REFERENCE piece the author actually published. You do not know what produced either draft. Be exacting; ties are allowed but must be earned.',
    '\n# Voice spec\n', dna,
    '\n# Reference piece (the author\'s real, published writing)\n', reference,
    '\n# Piece A\n', a,
    '\n# Piece B\n', b,
    `\nScore each piece 1-10 on: ${AXES.join(', ')}. voice_fidelity means: would a reader who knows the reference author's work attribute this piece to them without hesitation (8+ = yes). restraint means freedom from AI tells, hype, and reach. Then name which piece reads more like the reference author overall: "A", "B", or "tie".`,
    '\nAnswer with ONLY this JSON, no other text:',
    '{"A": {"voice_fidelity": n, "specificity": n, "hook": n, "restraint": n, "overall": n}, "B": {...}, "more_like_author": "A|B|tie", "rationale": "<three sentences max>"}',
  ].join('');
}

/** Deterministic per-case blinding: which config is shown as "A". */
export function blindOrder(caseName: string): 'solo-first' | 'lineup-first' {
  const hash = createHash('sha256').update(caseName).digest();
  return hash[0] % 2 === 0 ? 'solo-first' : 'lineup-first';
}

function parseJudgeJson(raw: string): { A: Record<string, number>; B: Record<string, number>; more_like_author: string; rationale: string } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`judge returned no JSON: ${raw.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

export function judgeCase(studio: Studio, evalCase: EvalCase, model?: string): Judgment | null {
  const soloPath = join(studio.root, 'eval', 'out', 'solo', `${evalCase.name}.md`);
  const lineupPath = join(studio.root, 'eval', 'out', 'lineup', `${evalCase.name}.md`);
  if (!existsSync(soloPath) || !existsSync(lineupPath)) return null;
  const solo = readFileSync(soloPath, 'utf8');
  const lineup = readFileSync(lineupPath, 'utf8');
  const reference = evalCase.meta.ref
    ? readFileSync(join(studio.root, evalCase.meta.ref), 'utf8')
    : '(no reference on file — judge on the voice spec alone)';
  const order = blindOrder(evalCase.name);
  const [a, b] = order === 'solo-first' ? [solo, lineup] : [lineup, solo];
  const raw = claude(judgePrompt(studio, evalCase, a, b, reference), { model, cwd: studio.root });
  const parsed = parseJudgeJson(raw);
  const unblind = (label: string): 'solo' | 'lineup' | 'tie' => {
    if (label === 'tie') return 'tie';
    if (order === 'solo-first') return label === 'A' ? 'solo' : 'lineup';
    return label === 'A' ? 'lineup' : 'solo';
  };
  const axesFor = (which: 'solo' | 'lineup') =>
    order === (which === 'solo' ? 'solo-first' : 'lineup-first') ? parsed.A : parsed.B;
  return {
    case: evalCase.name,
    axes: { solo: axesFor('solo'), lineup: axesFor('lineup') },
    moreLikeAuthor: unblind(parsed.more_like_author),
    rationale: parsed.rationale,
  };
}

/** Emit the blinded judge prompt for a case (for external execution of the judge call). */
export function judgePromptFor(studio: Studio, evalCase: EvalCase): string {
  const solo = readFileSync(join(studio.root, 'eval', 'out', 'solo', `${evalCase.name}.md`), 'utf8');
  const lineup = readFileSync(join(studio.root, 'eval', 'out', 'lineup', `${evalCase.name}.md`), 'utf8');
  const reference = evalCase.meta.ref
    ? readFileSync(join(studio.root, evalCase.meta.ref), 'utf8')
    : '(no reference on file — judge on the voice spec alone)';
  const order = blindOrder(evalCase.name);
  const [a, b] = order === 'solo-first' ? [solo, lineup] : [lineup, solo];
  return judgePrompt(studio, evalCase, a, b, reference);
}

/**
 * Merge externally-produced judge outputs (eval/judgments/<case>.json, the raw
 * blinded JSON) with mechanical sweeps into eval/scores.json. Unblinding uses
 * the same deterministic blindOrder as judgePromptFor.
 */
export function mergeJudgments(studio: Studio): CaseScore[] {
  const config = loadSweepConfig(studio);
  const scores: CaseScore[] = [];
  for (const evalCase of loadCases(studio)) {
    const mechanical = {} as CaseScore['mechanical'];
    let complete = true;
    for (const which of ['solo', 'lineup'] as const) {
      const path = join(studio.root, 'eval', 'out', which, `${evalCase.name}.md`);
      if (!existsSync(path)) {
        complete = false;
        continue;
      }
      mechanical[which] = sweep(readFileSync(path, 'utf8'), { bannedPhrases: config.bannedPhrases });
    }
    if (!complete) continue;
    const judgmentPath = join(studio.root, 'eval', 'judgments', `${evalCase.name}.json`);
    let judgment: Judgment | null = null;
    if (existsSync(judgmentPath)) {
      const parsed = parseJudgeJson(readFileSync(judgmentPath, 'utf8'));
      const order = blindOrder(evalCase.name);
      const unblind = (label: string): 'solo' | 'lineup' | 'tie' => {
        if (label === 'tie') return 'tie';
        if (order === 'solo-first') return label === 'A' ? 'solo' : 'lineup';
        return label === 'A' ? 'lineup' : 'solo';
      };
      const axesFor = (which: 'solo' | 'lineup') =>
        order === (which === 'solo' ? 'solo-first' : 'lineup-first') ? parsed.A : parsed.B;
      judgment = {
        case: evalCase.name,
        axes: { solo: axesFor('solo'), lineup: axesFor('lineup') },
        moreLikeAuthor: unblind(parsed.more_like_author),
        rationale: parsed.rationale,
      };
    }
    scores.push({ case: evalCase.name, mechanical, judgment });
  }
  writeFileSync(join(studio.root, 'eval', 'scores.json'), JSON.stringify(scores, null, 2));
  return scores;
}

export function scoreAll(studio: Studio, opts: { model?: string } = {}): CaseScore[] {
  const config = loadSweepConfig(studio);
  const scores: CaseScore[] = [];
  for (const evalCase of loadCases(studio)) {
    const mechanical = {} as CaseScore['mechanical'];
    let complete = true;
    for (const which of ['solo', 'lineup'] as const) {
      const path = join(studio.root, 'eval', 'out', which, `${evalCase.name}.md`);
      if (!existsSync(path)) {
        complete = false;
        continue;
      }
      mechanical[which] = sweep(readFileSync(path, 'utf8'), { bannedPhrases: config.bannedPhrases });
    }
    if (!complete) {
      console.log(`▹ ${evalCase.name}: outputs incomplete, skipping`);
      continue;
    }
    console.log(`▸ judging ${evalCase.name} (blind: ${blindOrder(evalCase.name)}) …`);
    const judgment = judgeCase(studio, evalCase, opts.model);
    scores.push({ case: evalCase.name, mechanical, judgment });
  }
  writeFileSync(join(studio.root, 'eval', 'scores.json'), JSON.stringify(scores, null, 2));
  return scores;
}
