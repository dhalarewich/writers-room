import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseDoc } from './frontmatter.js';
import type { Studio } from './types.js';

export type AssetState = 'ready' | 'template' | 'thin' | 'missing';

export interface DoctorItem {
  asset: string;
  state: AssetState;
  blocking: boolean;
  detail: string;
}

const TEMPLATE_PILLARS = ['pillar-one', 'pillar-two', 'pillar-three'];

function fileState(studio: Studio, rel: string): { state: AssetState; detail: string } {
  const path = join(studio.root, rel);
  if (!existsSync(path)) return { state: 'missing', detail: `${rel} does not exist` };
  const { meta } = parseDoc(readFileSync(path, 'utf8'));
  if (meta.template === true) {
    return { state: 'template', detail: 'still the shipped template — /setup fills it and removes the template flag' };
  }
  return { state: 'ready', detail: 'seeded' };
}

/** Per-asset onboarding readiness. Deterministic; /setup uses it to resume. */
export function doctorStudio(studio: Studio): { items: DoctorItem[]; ready: boolean } {
  const items: DoctorItem[] = [];

  const pillarsCustomized =
    studio.config.pillars.length > 0 &&
    !studio.config.pillars.some((p) => TEMPLATE_PILLARS.includes(p));
  items.push({
    asset: 'studio.yml pillars',
    state: pillarsCustomized ? 'ready' : 'template',
    blocking: true,
    detail: pillarsCustomized
      ? studio.config.pillars.join(', ')
      : 'placeholder pillars — name your real ones (they gate every card)',
  });

  const samplesDir = join(studio.root, 'vault', 'voice', 'samples');
  const samples = existsSync(samplesDir)
    ? readdirSync(samplesDir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'))
    : [];
  items.push({
    asset: 'voice samples',
    state: samples.length >= 3 ? 'ready' : samples.length > 0 ? 'thin' : 'missing',
    blocking: true,
    detail:
      samples.length >= 3
        ? `${samples.length} samples`
        : `${samples.length}/3 minimum — drop real published pieces into vault/voice/samples/ (or paste them in /setup)`,
  });

  for (const [asset, rel] of [
    ['style DNA', 'vault/voice/style-dna.md'],
    ['banned patterns', 'vault/voice/banned-patterns.md'],
    ['bio', 'vault/bio.md'],
    ['strategy', 'vault/strategy.md'],
    ['rubric', 'vault/rubric.md'],
  ] as const) {
    const { state, detail } = fileState(studio, rel);
    items.push({ asset, state, blocking: true, detail });
  }

  const feedsEmpty = Object.keys(studio.config.feeds).length === 0;
  items.push({
    asset: 'feeds',
    state: feedsEmpty ? 'thin' : 'ready',
    blocking: false,
    detail: feedsEmpty ? 'no RSS feeds — /feed --rss stays dormant until studio.yml lists some' : `${Object.values(studio.config.feeds).flat().length} feeds`,
  });

  const ready = items.every((i) => !i.blocking || i.state === 'ready');
  return { items, ready };
}
