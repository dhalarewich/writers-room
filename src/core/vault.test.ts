import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initStudio } from './studio.js';
import { buildIndex, findInVault, resolveLinks } from './vault.js';

function makeStudio() {
  const root = mkdtempSync(join(tmpdir(), 'wr-vault-'));
  const studio = initStudio(root, { name: 'Demo', prefix: 'dm' });
  mkdirSync(join(root, 'vault', 'knowledge', 'margins'), { recursive: true });
  writeFileSync(
    join(root, 'vault', 'knowledge', 'margins', 'dealer-margins.md'),
    '---\ndescription: How dealer margins actually work\n---\n# Dealer margins\n\nKeystone means doubling wholesale. See [[bio]] and [[nonexistent]].\n',
  );
  return studio;
}

describe('buildIndex', () => {
  it('writes a grouped index with descriptions', () => {
    const studio = makeStudio();
    const content = buildIndex(studio);
    expect(readFileSync(join(studio.root, 'vault', 'INDEX.md'), 'utf8')).toBe(content);
    expect(content).toContain('## knowledge/margins');
    expect(content).toContain('[Dealer margins](knowledge/margins/dealer-margins.md) — How dealer margins actually work');
    expect(content).toContain('[Style DNA](voice/style-dna.md)');
  });

  it('flags files without descriptions', () => {
    const studio = makeStudio();
    writeFileSync(join(studio.root, 'vault', 'knowledge', 'bare.md'), '# Bare\n\ntext\n');
    expect(buildIndex(studio)).toContain('(no description)');
  });
});

describe('findInVault', () => {
  it('ranks filename and heading hits above body hits', () => {
    const studio = makeStudio();
    const hits = findInVault(studio, 'margins');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].path).toBe('knowledge/margins/dealer-margins.md');
  });

  it('returns empty for no-term queries', () => {
    expect(findInVault(makeStudio(), '   ')).toEqual([]);
  });
});

describe('resolveLinks', () => {
  it('resolves wiki links by basename and reports broken ones', () => {
    const studio = makeStudio();
    const { out, broken } = resolveLinks(
      studio,
      join(studio.root, 'vault', 'knowledge', 'margins', 'dealer-margins.md'),
    );
    expect(out).toEqual(['bio.md']);
    expect(broken).toEqual(['nonexistent']);
  });
});
