import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDoc } from './frontmatter.js';
import type { Studio } from './types.js';

export interface SweepConfig {
  ceilings: { em_dashes: { longform: number; short: number }; contrast_snaps: number };
  bannedPhrases: string[];
}

const DEFAULTS: SweepConfig = {
  ceilings: { em_dashes: { longform: 2, short: 0 }, contrast_snaps: 2 },
  bannedPhrases: [],
};

/** Ceilings and phrase bans live in ONE place: vault/voice/banned-patterns.md frontmatter. */
export function loadSweepConfig(studio: Studio): SweepConfig {
  const path = join(studio.root, 'vault', 'voice', 'banned-patterns.md');
  if (!existsSync(path)) return DEFAULTS;
  const { meta } = parseDoc(readFileSync(path, 'utf8'));
  const ceilings = meta.ceilings as Partial<SweepConfig['ceilings']> | undefined;
  return {
    ceilings: {
      em_dashes: {
        longform: ceilings?.em_dashes?.longform ?? DEFAULTS.ceilings.em_dashes.longform,
        short: ceilings?.em_dashes?.short ?? DEFAULTS.ceilings.em_dashes.short,
      },
      contrast_snaps: ceilings?.contrast_snaps ?? DEFAULTS.ceilings.contrast_snaps,
    },
    bannedPhrases: Array.isArray(meta.banned_phrases) ? meta.banned_phrases.map(String) : [],
  };
}
