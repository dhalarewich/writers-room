import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDoc } from '../core/frontmatter.js';
import type { Studio } from '../core/types.js';

export interface EvalCase {
  name: string;
  meta: { ref?: string; channel: string; title?: string };
  seed: string;
}

export function loadCases(studio: Studio): EvalCase[] {
  const dir = join(studio.root, 'eval', 'cases');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const { meta, body } = parseDoc(readFileSync(join(dir, f), 'utf8'));
      return {
        name: f.replace(/\.md$/, ''),
        meta: { ref: meta.ref as string | undefined, channel: String(meta.channel ?? 'linkedin'), title: meta.title as string | undefined },
        seed: body.trim(),
      };
    });
}

/**
 * Env for nested `claude -p` calls. When the eval is launched from inside a
 * Claude Code session, the inherited ANTHROPIC_/CLAUDE* variables point at
 * session-scoped auth a child CLI cannot use (401s). Scrub them so the child
 * authenticates as the user's own installation.
 */
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(ANTHROPIC_|CLAUDE|AI_AGENT|BAGGAGE|SENTRY)/i.test(key)) continue;
    env[key] = value;
  }
  return env;
}

export function claude(prompt: string, opts: { model?: string; cwd?: string } = {}): string {
  // WR_ENGINE overrides the agent binary (e.g. a codex-compatible shim); args below assume claude-style flags.
  const bin = process.env.WR_ENGINE ?? 'claude';
  const args = ['-p', '--output-format', 'text'];
  if (opts.model) args.push('--model', opts.model);
  return execFileSync(bin, args, {
    input: prompt,
    encoding: 'utf8',
    cwd: opts.cwd,
    timeout: 900_000,
    maxBuffer: 32 * 1024 * 1024,
    env: cleanEnv(),
  }).trim();
}

function read(studio: Studio, rel: string): string {
  const path = join(studio.root, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

export function commonContext(studio: Studio, evalCase: EvalCase): string {
  return [
    '# Voice spec (Style DNA)\n', read(studio, 'vault/voice/style-dna.md'),
    '\n# Banned patterns and ceilings\n', read(studio, 'vault/voice/banned-patterns.md'),
    '\n# Learnings (operator corrections — every rule binds)\n', read(studio, 'memory/learnings.md'),
    '\n# Bio (facts; never contradict)\n', read(studio, 'vault/bio.md'),
    `\n# The assignment\nChannel: ${evalCase.meta.channel}. Write the piece this seed card describes. The fact brief inside the seed is pre-verified — use its specifics exactly as given, invent nothing beyond them.\n\n## Seed card\n${evalCase.seed}\n`,
  ].join('');
}

const OUTPUT_RULE =
  'Output ONLY the finished piece text. No title line unless the channel is longform, no preamble, no commentary, no markdown fences around it.';

export function soloPrompt(studio: Studio, evalCase: EvalCase): string {
  return [
    'You are the operator\'s ghostwriter. Using the voice spec, bans, learnings, and bio below, write the piece — then silently self-edit it for density and hook, and de-slop it against every ceiling before answering.',
    commonContext(studio, evalCase),
    OUTPUT_RULE,
  ].join('\n');
}

export function writerPrompt(studio: Studio, evalCase: EvalCase): string {
  return [
    'You are the Writer. Voice embodiment is the entire job: draft this piece as the operator, building 15-25% long, planting opener specifics you pay off at the close.',
    commonContext(studio, evalCase),
    OUTPUT_RULE,
  ].join('\n');
}

export function editorPrompt(studio: Studio, evalCase: EvalCase, draft: string): string {
  return [
    'You are the Editor, the Writer\'s adversary. Cut the draft below for density (channel targets: linkedin -20%, longform -10-15%), promote the buried hook if there is one, audit that every opener specific pays off, sharpen the close. Cut WITH the voice, never against it.',
    commonContext(studio, evalCase),
    '\n# The Writer\'s draft\n',
    draft,
    '\n' + OUTPUT_RULE,
  ].join('\n');
}

export function wardenPrompt(studio: Studio, evalCase: EvalCase, edited: string): string {
  return [
    'You are the Warden, the voice gate. Surgically de-slop the piece below: contrast-snaps over ceiling folded into plain sentences, em dashes over ceiling rewritten, tidy triads dissolved (never trimmed to three), at least one longer breath sentence if the rhythm is uniform, banned phrases removed. Change as little as possible; never re-draft. If it is already clean, return it EXACTLY as given.',
    commonContext(studio, evalCase),
    '\n# The piece\n',
    edited,
    '\n' + OUTPUT_RULE,
    'Never narrate your checks or say you are returning it unchanged — your entire output is the piece itself, starting with its first line.',
  ].join('\n');
}

/**
 * Multi-stage relays can leak stage scaffolding (a warden narrating its sweep)
 * into the artifact — a failure mode solo generation cannot have, first caught
 * by the eval judge on case-05. Detect report-shaped openings and retry once.
 */
export function looksLikeMetaLeak(output: string): boolean {
  const head = output.slice(0, 400).toLowerCase();
  return (
    /^(this piece|i ran|clean on|no edits|returning it|the piece (is|was) (already )?clean|after (the|my) sweep)/.test(head) ||
    (/\bsweep\b/.test(head) && /\*\*(contrast|em dash|list|rhythm)/.test(head))
  );
}

export function runWarden(studio: Studio, evalCase: EvalCase, edited: string, model?: string): string {
  const prompt = wardenPrompt(studio, evalCase, edited);
  let piece = claude(prompt, { model, cwd: studio.root });
  if (looksLikeMetaLeak(piece)) {
    piece = claude(
      prompt +
        '\n\nREMINDER: your previous answer opened with commentary about your checks. That is a defect. Output ONLY the piece text, beginning with the piece\'s own first line.',
      { model, cwd: studio.root },
    );
  }
  return piece;
}

export function runSolo(studio: Studio, evalCase: EvalCase, model?: string): string {
  return claude(soloPrompt(studio, evalCase), { model, cwd: studio.root });
}

export function runLineup(studio: Studio, evalCase: EvalCase, model?: string): string {
  const draft = claude(writerPrompt(studio, evalCase), { model, cwd: studio.root });
  const edited = claude(editorPrompt(studio, evalCase, draft), { model, cwd: studio.root });
  return runWarden(studio, evalCase, edited, model);
}

export function runConfig(
  studio: Studio,
  config: 'solo' | 'lineup',
  opts: { model?: string; only?: string } = {},
): { name: string; outPath: string }[] {
  const outDir = join(studio.root, 'eval', 'out', config);
  mkdirSync(outDir, { recursive: true });
  const results: { name: string; outPath: string }[] = [];
  for (const evalCase of loadCases(studio)) {
    if (opts.only && evalCase.name !== opts.only) continue;
    const outPath = join(outDir, `${evalCase.name}.md`);
    if (existsSync(outPath)) {
      console.log(`▹ ${config}/${evalCase.name} exists, skipping (delete to re-run)`);
      results.push({ name: evalCase.name, outPath });
      continue;
    }
    console.log(`▸ ${config}/${evalCase.name} …`);
    const started = Date.now();
    const piece = config === 'solo' ? runSolo(studio, evalCase, opts.model) : runLineup(studio, evalCase, opts.model);
    writeFileSync(outPath, piece + '\n');
    console.log(`  done in ${Math.round((Date.now() - started) / 1000)}s (${piece.length} chars)`);
    results.push({ name: evalCase.name, outPath });
  }
  return results;
}
