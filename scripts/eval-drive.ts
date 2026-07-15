/**
 * Drives the remaining eval stages natively for whichever cases are ready:
 *  - warden: eval/out/lineup-edited/<case>.md → eval/out/lineup/<case>.md
 *  - judge:  solo + lineup complete → eval/judgments/<case>.json
 * Skips anything missing or already done; safe to re-run.
 *   npx tsx scripts/eval-drive.ts /path/to/studio [--model opus]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadStudio } from '../src/core/studio.js';
import { claude, editorPrompt, loadCases, runWarden } from '../src/eval/run.js';
import { judgePromptFor } from '../src/eval/score.js';

const root = process.argv[2];
const model = process.argv.includes('--model') ? process.argv[process.argv.indexOf('--model') + 1] : 'opus';
if (!root) {
  console.error('usage: tsx scripts/eval-drive.ts <studio-root> [--model m]');
  process.exit(1);
}
const studio = loadStudio(root);
mkdirSync(join(root, 'eval', 'out', 'lineup'), { recursive: true });
mkdirSync(join(root, 'eval', 'judgments'), { recursive: true });

for (const evalCase of loadCases(studio)) {
  const draftPath = join(root, 'eval', 'out', 'lineup-draft', `${evalCase.name}.md`);
  const editedPath = join(root, 'eval', 'out', 'lineup-edited', `${evalCase.name}.md`);
  if (existsSync(draftPath) && !existsSync(editedPath)) {
    console.log(`▸ editor ${evalCase.name} …`);
    const started = Date.now();
    const piece = claude(editorPrompt(studio, evalCase, readFileSync(draftPath, 'utf8')), { model, cwd: root });
    writeFileSync(editedPath, piece + '\n');
    console.log(`  done in ${Math.round((Date.now() - started) / 1000)}s`);
  }
  const finalPath = join(root, 'eval', 'out', 'lineup', `${evalCase.name}.md`);
  if (existsSync(editedPath) && !existsSync(finalPath)) {
    console.log(`▸ warden ${evalCase.name} …`);
    const started = Date.now();
    const piece = runWarden(studio, evalCase, readFileSync(editedPath, 'utf8'), model);
    writeFileSync(finalPath, piece + '\n');
    console.log(`  done in ${Math.round((Date.now() - started) / 1000)}s`);
  }
  const soloPath = join(root, 'eval', 'out', 'solo', `${evalCase.name}.md`);
  const judgmentPath = join(root, 'eval', 'judgments', `${evalCase.name}.json`);
  if (existsSync(soloPath) && existsSync(finalPath) && !existsSync(judgmentPath)) {
    console.log(`▸ judge ${evalCase.name} …`);
    const started = Date.now();
    const raw = claude(judgePromptFor(studio, evalCase), { model, cwd: root });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error(`  judge returned no JSON for ${evalCase.name}; raw saved to .raw.txt`);
      writeFileSync(judgmentPath.replace('.json', '.raw.txt'), raw);
      continue;
    }
    writeFileSync(judgmentPath, match[0] + '\n');
    console.log(`  done in ${Math.round((Date.now() - started) / 1000)}s`);
  }
}
console.log('eval-drive pass complete');
