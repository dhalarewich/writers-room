#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createCard, loadCard } from '../core/card.js';
import { moveCard } from '../core/board.js';
import { checkStudio } from '../core/check.js';
import { doctorStudio } from '../core/doctor.js';
import { shipCard } from '../core/shipdiff.js';
import { deriveTitle, resolveCaptureStudio, writeDefaultStudio } from '../core/capture.js';
import { findStudioRoot, initStudio, loadStudio } from '../core/studio.js';
import { loadSweepConfig } from '../core/sweepconfig.js';
import { pieceOnly, sweep } from '../core/sweep.js';
import { writeStatus } from '../core/status.js';
import { buildIndex, findInVault, resolveLinks } from '../core/vault.js';
import { palette, paint } from '../core/theme.js';
import type { Stage } from '../core/types.js';
import { STAGES, STAGE_DIRS } from '../core/types.js';
import { editorPrompt, loadCases, runConfig, soloPrompt, wardenPrompt, writerPrompt } from '../eval/run.js';
import { judgePromptFor, mergeJudgments, scoreAll } from '../eval/score.js';
import { buildReport } from '../eval/report.js';
import { parseFlags, flagString } from './args.js';
import { requireStudio } from './context.js';
import { renderBoard, boardJson } from './render.js';

const USAGE = `wr — the Writers Room studio tool

  wr init [dir] --name <name> --prefix <px>   create a studio
  wr new "<title>" [--stage s] [--channel c] [--pillar p] [--source s] [--body -]
  wr capture "<text>" [--title t] [--source s] [--url u] [--studio path]
                                              quick capture → inbox, from anywhere (stdin ok)
  wr capture --set-default                    make this studio the capture target from anywhere
  wr move <id> <stage> [--force]              stages: ${STAGES.join(' ')}
  wr board [--json]                           render the board
  wr check [--json]                           lint the studio
  wr doctor [--json]                          onboarding readiness (what /setup still needs)
  wr index                                    regenerate vault/INDEX.md
  wr find <query...>                          lexical search across the vault
  wr links <vault-file>                       resolve [[wiki-links]]
  wr sweep <id|file> [--channel c] [--json]   mechanical de-slop counts
  wr ship <id>                                publish: capture edit diff, move to published
  wr adopt                                    convert stray notes in stage dirs into cards
  wr studio                                   full-screen TUI (board, peek, move)
  wr serve [--port 4614]                      web board: drag to move, card pages, archive, ship
  wr eval run|score|merge|report|prompt …     the lineup eval
`;

type Verb = (args: string[]) => number | Promise<number>;

const verbs: Record<string, Verb> = {
  init(args) {
    const { positional, flags } = parseFlags(args);
    const dir = resolve(positional[0] ?? '.');
    const name = flagString(flags, 'name') ?? basename(dir);
    const prefix = (flagString(flags, 'prefix') ?? name.slice(0, 2)).toLowerCase();
    const studio = initStudio(dir, { name, prefix });
    buildIndex(studio);
    writeStatus(studio);
    console.log(paint(`◈ studio "${name}" ready at ${dir}`, palette.copperBright, { bold: true }));
    console.log(paint('  board/ vault/ memory/ created — open studio.yml to set channels and pillars,', palette.dim));
    console.log(paint('  then run /setup in Claude Code to seed your voice.', palette.dim));
    return 0;
  },

  new(args) {
    const { positional, flags } = parseFlags(args);
    const title = positional.join(' ');
    if (!title) {
      console.error('usage: wr new "<title>" [--stage inbox] [--channel c] [--pillar p]');
      return 1;
    }
    const studio = requireStudio();
    const stage = (flagString(flags, 'stage') ?? 'inbox') as Stage;
    if (!STAGES.includes(stage)) {
      console.error(`unknown stage "${stage}" (${STAGES.join(', ')})`);
      return 1;
    }
    let body = '';
    if (flags.body === '-' || flags.body === true) {
      body = readFileSync(0, 'utf8');
    }
    const card = createCard(
      studio,
      {
        title,
        channel: flagString(flags, 'channel')?.split(',') as string[] | undefined,
        pillar: flagString(flags, 'pillar'),
        source: flagString(flags, 'source'),
        tags: flagString(flags, 'tags')?.split(',') as string[] | undefined,
      },
      stage,
      body,
    );
    writeStatus(studio);
    console.log(`${card.meta.id}  ${card.path}`);
    return 0;
  },

  capture(args) {
    const { positional, flags } = parseFlags(args);
    if (flags['set-default'] === true) {
      const root = findStudioRoot(resolve(flagString(flags, 'studio') ?? process.cwd()));
      if (!root) {
        console.error('Not inside a studio — cd into one (or pass --studio <path>).');
        return 1;
      }
      writeDefaultStudio(root);
      console.log(paint(`◈ captures from anywhere now land in ${root}`, palette.copperBright));
      return 0;
    }
    let text = positional.join(' ');
    if (!text || text === '-') {
      if (process.stdin.isTTY) {
        console.error('usage: wr capture "<text>" [--title t] [--source s] [--url u] [--studio path]  (or pipe stdin)');
        return 1;
      }
      text = readFileSync(0, 'utf8');
    }
    text = text.trim();
    if (!text) {
      console.error('nothing to capture');
      return 1;
    }
    const root = resolveCaptureStudio({
      flag: flagString(flags, 'studio'),
      cwd: process.cwd(),
      env: process.env.WR_STUDIO,
    });
    if (!root) {
      console.error(
        'No studio found: not in one, no --studio, no WR_STUDIO, no default.\nSet one: cd <studio> && wr capture --set-default',
      );
      return 1;
    }
    const studio = loadStudio(root);
    const url = flagString(flags, 'url');
    const explicitTitle = flagString(flags, 'title');
    const derived = deriveTitle(text);
    const title = explicitTitle ?? derived.title;
    let body = explicitTitle ? text : derived.body;
    if (url) body = body ? `${body}\n\n${url}` : url;
    const card = createCard(
      studio,
      { title, source: flagString(flags, 'source') ?? (url ? `capture — ${url}` : 'capture — cli') },
      'inbox',
      body ? body + '\n' : '',
    );
    writeStatus(studio);
    console.log(`${card.meta.id}  ${card.path}`);
    return 0;
  },

  move(args) {
    const { positional, flags } = parseFlags(args);
    const [id, stage] = positional;
    if (!id || !STAGES.includes(stage as Stage)) {
      console.error(`usage: wr move <id> <${STAGES.join('|')}> [--force]`);
      return 1;
    }
    const studio = requireStudio();
    const card = moveCard(studio, id, stage as Stage, { force: flags.force === true });
    writeStatus(studio);
    console.log(`${card.meta.id} → ${STAGE_DIRS[card.stage]}`);
    return 0;
  },

  board(args) {
    const { flags } = parseFlags(args);
    const studio = requireStudio();
    console.log(flags.json ? boardJson(studio) : renderBoard(studio));
    return 0;
  },

  check(args) {
    const { flags } = parseFlags(args);
    const studio = requireStudio();
    const problems = checkStudio(studio);
    if (flags.json) {
      console.log(JSON.stringify(problems, null, 2));
    } else if (problems.length === 0) {
      console.log(paint('✓ studio clean', palette.ok));
    } else {
      for (const p of problems) {
        console.log(`${paint(p.rule, palette.block)}  ${p.path}\n  ${p.message}`);
      }
    }
    return problems.length === 0 ? 0 : 1;
  },

  doctor(args) {
    const { flags } = parseFlags(args);
    const studio = requireStudio();
    const { items, ready } = doctorStudio(studio);
    if (flags.json) {
      console.log(JSON.stringify({ ready, items }, null, 2));
      return ready ? 0 : 1;
    }
    for (const item of items) {
      const glyph =
        item.state === 'ready'
          ? paint('✓', palette.ok)
          : item.state === 'thin'
            ? paint('◐', palette.warn)
            : paint('○', item.blocking ? palette.block : palette.warn);
      console.log(`${glyph} ${item.asset.padEnd(20)} ${paint(item.detail, palette.dim)}`);
    }
    console.log(
      ready
        ? paint('\n◈ studio is seeded — write.', palette.copperBright, { bold: true })
        : paint('\n○ not seeded yet — run /setup in Claude Code to continue where you left off.', palette.warn),
    );
    return ready ? 0 : 1;
  },

  index() {
    const studio = requireStudio();
    buildIndex(studio);
    console.log('vault/INDEX.md regenerated');
    return 0;
  },

  find(args) {
    const { positional } = parseFlags(args);
    const studio = requireStudio();
    const hits = findInVault(studio, positional.join(' '));
    if (hits.length === 0) {
      console.log('(no hits)');
      return 0;
    }
    for (const hit of hits) {
      console.log(`${paint(`${hit.path}:${hit.line}`, palette.copper)}  ${hit.text}`);
    }
    return 0;
  },

  links(args) {
    const { positional } = parseFlags(args);
    const studio = requireStudio();
    if (!positional[0]) {
      console.error('usage: wr links <vault-file>');
      return 1;
    }
    const path = resolve(positional[0]);
    const { out, broken } = resolveLinks(studio, path);
    for (const rel of out) console.log(rel);
    for (const name of broken) console.log(paint(`broken: [[${name}]]`, palette.block));
    return 0;
  },

  sweep(args) {
    const { positional, flags } = parseFlags(args);
    const studio = requireStudio();
    const target = positional[0];
    if (!target) {
      console.error('usage: wr sweep <id|file> [--channel longform|linkedin|x] [--json]');
      return 1;
    }
    let text: string;
    let channel = flagString(flags, 'channel');
    if (existsSync(target)) {
      text = readFileSync(target, 'utf8');
    } else {
      const card = loadCard(studio, target);
      text = pieceOnly(card.body);
      channel ??= card.meta.channel[0];
    }
    const config = loadSweepConfig(studio);
    const result = sweep(text, { bannedPhrases: config.bannedPhrases });
    const dashCeiling =
      channel === 'longform' ? config.ceilings.em_dashes.longform : config.ceilings.em_dashes.short;
    if (flags.json) {
      console.log(JSON.stringify({ ...result, ceilings: { emDashes: dashCeiling, contrastSnaps: config.ceilings.contrast_snaps } }, null, 2));
      return 0;
    }
    const over = (n: number, max: number) =>
      n > max ? paint(`${n} (ceiling ${max})`, palette.block) : paint(String(n), palette.ok);
    console.log(`em dashes       ${over(result.emDashes, dashCeiling)}`);
    console.log(`contrast snaps  ${over(result.contrastSnaps.length, config.ceilings.contrast_snaps)}`);
    for (const s of result.contrastSnaps) console.log(paint(`  ↳ ${s}`, palette.dim));
    console.log(`rule of three   ${result.ruleOfThree.length ? paint(String(result.ruleOfThree.length), palette.warn) : paint('0', palette.ok)}`);
    for (const s of result.ruleOfThree) console.log(paint(`  ↳ ${s}`, palette.dim));
    console.log(`metronome       ${result.metronome.flagged ? paint(`flagged (stdev ${result.metronome.stdev})`, palette.warn) : paint(`ok (stdev ${result.metronome.stdev})`, palette.ok)}`);
    console.log(`hashtags        ${over(result.hashtags, 0)}`);
    console.log(`banned phrases  ${result.bannedHits.length ? paint(result.bannedHits.join(', '), palette.block) : paint('0', palette.ok)}`);
    console.log(`credential stacks ${result.credentialStacks.length ? paint(result.credentialStacks.join(', '), palette.block) : paint('0', palette.ok)}`);
    return 0;
  },

  ship(args) {
    const { positional } = parseFlags(args);
    const id = positional[0];
    if (!id) {
      console.error('usage: wr ship <id>');
      return 1;
    }
    const studio = requireStudio();
    let changed: boolean;
    let diffPath: string | null;
    try {
      ({ changed, diffPath } = shipCard(studio, id));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
    writeStatus(studio);
    console.log(paint(`⇥ ${id} published`, palette.copperBright, { bold: true }));
    console.log(
      changed
        ? paint(`  hand edits captured → ${diffPath}\n  run /learn to mine them into voice memory`, palette.dim)
        : paint('  no hand edits since agent-final', palette.dim),
    );
    return 0;
  },

  studio() {
    const studio = requireStudio();
    // Lazy import keeps ink/react out of the fast path for plain verbs.
    return import('../tui/studio.js').then(({ runStudioTui }) => runStudioTui(studio).then(() => 0));
  },

  serve(args) {
    const { flags } = parseFlags(args);
    const studio = requireStudio();
    const port = Number.parseInt(flagString(flags, 'port') ?? '4614', 10);
    return import('../serve/server.js').then(({ serveBoard }) => {
      serveBoard(studio, port);
      return new Promise<number>(() => {}); // stays up until ctrl-c
    });
  },

  // Verb handler for `wr eval` (the eval harness) — a plain object method that
  // happens to be named "eval"; JavaScript's global eval() is never invoked.
  eval(args) {
    const { positional, flags } = parseFlags(args);
    const studio = requireStudio();
    const sub = positional[0];
    const model = flagString(flags, 'model');
    if (sub === 'run') {
      const configs = flagString(flags, 'config')
        ? [flagString(flags, 'config') as 'solo' | 'lineup']
        : (['lineup', 'solo'] as const);
      for (const config of configs) {
        runConfig(studio, config, { model, only: flagString(flags, 'only') });
      }
      return 0;
    }
    if (sub === 'score') {
      scoreAll(studio, { model });
      console.log('eval/scores.json written');
      return 0;
    }
    if (sub === 'report') {
      console.log(buildReport(studio));
      return 0;
    }
    if (sub === 'prompt') {
      // Emit the exact prompt for one stage of one case, for external execution
      // (used when nested `claude -p` cannot authenticate, e.g. inside a session).
      const caseName = positional[1];
      const stage = positional[2];
      const evalCase = loadCases(studio).find((c) => c.name === caseName);
      if (!evalCase || !stage) {
        console.error('usage: wr eval prompt <case> <solo|writer|editor|warden|judge> [--in <piece-file>] --out <file>');
        return 1;
      }
      const inPath = flagString(flags, 'in');
      const piece = inPath ? readFileSync(inPath, 'utf8') : '';
      let prompt: string;
      if (stage === 'solo') prompt = soloPrompt(studio, evalCase);
      else if (stage === 'writer') prompt = writerPrompt(studio, evalCase);
      else if (stage === 'editor') prompt = editorPrompt(studio, evalCase, piece);
      else if (stage === 'warden') prompt = wardenPrompt(studio, evalCase, piece);
      else if (stage === 'judge') prompt = judgePromptFor(studio, evalCase);
      else {
        console.error(`unknown stage "${stage}"`);
        return 1;
      }
      const outPath = flagString(flags, 'out');
      if (outPath) {
        writeFileSync(outPath, prompt);
        console.log(outPath);
      } else {
        console.log(prompt);
      }
      return 0;
    }
    if (sub === 'merge') {
      const scores = mergeJudgments(studio);
      console.log(`eval/scores.json written (${scores.length} cases, ${scores.filter((s) => s.judgment).length} judged)`);
      return 0;
    }
    console.error('usage: wr eval run|score|merge|report|prompt [--config solo|lineup] [--model m] [--only case]');
    return 1;
  },

  adopt() {
    const studio = requireStudio();
    let adopted = 0;
    for (const stage of STAGES) {
      const dir = join(studio.root, 'board', STAGE_DIRS[stage]);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (file.startsWith('.')) continue;
        const full = join(dir, file);
        const isCard = /^[a-z0-9]+-\d{4}-.*\.md$/.test(file);
        const isText = file.endsWith('.md') || file.endsWith('.txt');
        if (isCard || !isText) continue;
        const raw = readFileSync(full, 'utf8').trim();
        const lines = raw.split('\n');
        const title = (lines[0] ?? file).replace(/^#+\s*/, '').slice(0, 120) || file;
        const body = lines.slice(1).join('\n').trim();
        const card = createCard(studio, { title, source: `adopted — ${file}` }, stage, body ? body + '\n' : '');
        unlinkSync(full);
        adopted++;
        console.log(`${card.meta.id}  adopted ${file} (${stage})`);
      }
    }
    if (adopted === 0) console.log('nothing to adopt');
    else writeStatus(studio);
    return 0;
  },
};

const [, , verb, ...rest] = process.argv;
if (!verb || verb === 'help' || verb === '--help') {
  console.log(USAGE);
  process.exit(verb ? 0 : 1);
}
const handler = verbs[verb];
if (!handler) {
  console.error(`unknown verb "${verb}"\n\n${USAGE}`);
  process.exit(1);
}
Promise.resolve()
  .then(() => handler(rest))
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error((error as Error).message);
    process.exit(1);
  });
