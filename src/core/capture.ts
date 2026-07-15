import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { findStudioRoot } from './studio.js';

const TITLE_MAX = 80;

/** First non-empty line becomes the title; overflow keeps the full text as body. */
export function deriveTitle(text: string): { title: string; body: string } {
  const lines = text.split('\n');
  const idx = lines.findIndex((l) => l.trim() !== '');
  const first = (idx === -1 ? '' : lines[idx]).replace(/^#+\s*/, '').trim();
  if (first.length > TITLE_MAX) {
    return { title: first.slice(0, 77) + '…', body: text.trim() };
  }
  return { title: first, body: lines.slice(idx + 1).join('\n').trim() };
}

export function globalConfigPath(): string {
  const dir = process.env.WR_CONFIG_DIR ?? join(homedir(), '.config', 'writers-room');
  return join(dir, 'config.json');
}

export function readDefaultStudio(): string | null {
  try {
    const raw = JSON.parse(readFileSync(globalConfigPath(), 'utf8')) as { defaultStudio?: string };
    return typeof raw.defaultStudio === 'string' ? raw.defaultStudio : null;
  } catch {
    return null;
  }
}

export function writeDefaultStudio(root: string): void {
  const path = globalConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ defaultStudio: root }, null, 2) + '\n');
}

/** Where does a capture land? flag → cwd walk → WR_STUDIO → global default. */
export function resolveCaptureStudio(opts: {
  flag?: string;
  cwd: string;
  env?: string;
}): string | null {
  for (const candidate of [opts.flag, opts.cwd, opts.env, readDefaultStudio() ?? undefined]) {
    if (!candidate) continue;
    const abs = resolve(candidate);
    if (!existsSync(abs)) continue;
    const root = findStudioRoot(abs);
    if (root) return root;
  }
  return null;
}
