import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, parse as parsePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type { Studio, StudioConfig } from './types.js';
import { STAGE_DIRS } from './types.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

/** The templates/ folder ships at the package root, two levels above src|dist/core. */
export function templatesDir(): string {
  return join(MODULE_DIR, '..', '..', 'templates');
}

export function findStudioRoot(from: string): string | null {
  let dir = from;
  const { root: fsRoot } = parsePath(from);
  while (true) {
    if (existsSync(join(dir, 'studio.yml'))) return dir;
    if (dir === fsRoot) return null;
    dir = dirname(dir);
  }
}

export function loadStudio(root: string): Studio {
  const configPath = join(root, 'studio.yml');
  if (!existsSync(configPath)) {
    throw new Error(`No studio.yml at ${root}`);
  }
  const raw = parseYaml(readFileSync(configPath, 'utf8')) as Partial<StudioConfig> | null;
  if (!raw || typeof raw !== 'object') throw new Error(`studio.yml is empty or invalid at ${configPath}`);
  if (!raw.prefix || typeof raw.prefix !== 'string') {
    throw new Error(`studio.yml is missing "prefix" (the card id prefix, e.g. "wr") at ${configPath}`);
  }
  if (!raw.name) throw new Error(`studio.yml is missing "name" at ${configPath}`);
  const config: StudioConfig = {
    name: String(raw.name),
    prefix: raw.prefix,
    channels: raw.channels ?? [],
    pillars: raw.pillars ?? [],
    thresholds: {
      min_score: raw.thresholds?.min_score ?? 72,
      max_per_run: raw.thresholds?.max_per_run ?? 6,
    },
    feeds: raw.feeds ?? {},
  };
  return { root, config };
}

export function initStudio(root: string, opts: { name: string; prefix: string }): Studio {
  if (existsSync(join(root, 'studio.yml'))) {
    throw new Error(`A studio already exists at ${root}`);
  }
  mkdirSync(root, { recursive: true });
  for (const dir of Object.values(STAGE_DIRS)) {
    mkdirSync(join(root, 'board', dir), { recursive: true });
  }
  mkdirSync(join(root, 'board', 'archive'), { recursive: true });
  mkdirSync(join(root, 'vault', 'voice', 'samples'), { recursive: true });
  mkdirSync(join(root, 'vault', 'knowledge'), { recursive: true });
  mkdirSync(join(root, 'memory', 'edits'), { recursive: true });
  mkdirSync(join(root, '.wr'), { recursive: true });
  writeFileSync(join(root, '.wr', 'seq'), '0');

  const tpl = templatesDir();
  const studioYml = readFileSync(join(tpl, 'studio.yml'), 'utf8')
    .replace('__NAME__', opts.name)
    .replace('__PREFIX__', opts.prefix);
  writeFileSync(join(root, 'studio.yml'), studioYml);
  cpSync(join(tpl, 'vault'), join(root, 'vault'), { recursive: true, force: false });
  cpSync(join(tpl, 'memory'), join(root, 'memory'), { recursive: true, force: false });

  return loadStudio(root);
}
