import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doctorStudio } from './doctor.js';
import { initStudio, loadStudio } from './studio.js';

function freshStudio() {
  const root = mkdtempSync(join(tmpdir(), 'wr-doctor-'));
  return initStudio(root, { name: 'Fresh', prefix: 'fr' });
}

describe('doctorStudio', () => {
  it('reports a fresh studio as all-template and not ready', () => {
    const { items, ready } = doctorStudio(freshStudio());
    expect(ready).toBe(false);
    const byAsset = Object.fromEntries(items.map((i) => [i.asset, i.state]));
    expect(byAsset['studio.yml pillars']).toBe('template');
    expect(byAsset['voice samples']).toBe('missing');
    expect(byAsset['style DNA']).toBe('template');
    expect(byAsset['bio']).toBe('template');
    expect(byAsset['feeds']).toBe('thin');
  });

  it('turns ready when pillars are named, samples exist, and template flags are removed', () => {
    const studio = freshStudio();
    writeFileSync(
      join(studio.root, 'studio.yml'),
      'name: Fresh\nprefix: fr\nchannels: [linkedin]\npillars: [craft, business]\nthresholds: {min_score: 72, max_per_run: 6}\nfeeds: {}\n',
    );
    for (let i = 1; i <= 3; i++) {
      writeFileSync(join(studio.root, 'vault', 'voice', 'samples', `s${i}.md`), `# Sample ${i}\n\ntext\n`);
    }
    for (const rel of ['vault/voice/style-dna.md', 'vault/voice/banned-patterns.md', 'vault/bio.md', 'vault/strategy.md', 'vault/rubric.md']) {
      const path = join(studio.root, rel);
      writeFileSync(path, readFileSync(path, 'utf8').replace('template: true\n', ''));
    }
    const { items, ready } = doctorStudio(loadStudio(studio.root));
    expect(ready).toBe(true);
    expect(items.find((i) => i.asset === 'feeds')?.state).toBe('thin'); // non-blocking
  });

  it('counts thin samples', () => {
    const studio = freshStudio();
    writeFileSync(join(studio.root, 'vault', 'voice', 'samples', 'one.md'), '# One\n');
    const { items } = doctorStudio(studio);
    expect(items.find((i) => i.asset === 'voice samples')?.state).toBe('thin');
  });
});
