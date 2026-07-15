import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findStudioRoot, initStudio, loadStudio } from './studio.js';
import { STAGE_DIRS } from './types.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'wr-test-'));
}

describe('initStudio', () => {
  it('creates the full studio tree', () => {
    const root = tmp();
    initStudio(root, { name: 'Demo', prefix: 'dm' });
    for (const dir of Object.values(STAGE_DIRS)) {
      expect(existsSync(join(root, 'board', dir))).toBe(true);
    }
    expect(existsSync(join(root, 'board', 'archive'))).toBe(true);
    expect(existsSync(join(root, 'vault', 'voice', 'samples'))).toBe(true);
    expect(existsSync(join(root, 'vault', 'knowledge'))).toBe(true);
    expect(existsSync(join(root, 'memory', 'edits'))).toBe(true);
    expect(readFileSync(join(root, '.wr', 'seq'), 'utf8')).toBe('0');
    expect(existsSync(join(root, 'vault', 'voice', 'style-dna.md'))).toBe(true);
    expect(existsSync(join(root, 'memory', 'learnings.md'))).toBe(true);
  });

  it('writes a loadable studio.yml with substituted name and prefix', () => {
    const root = tmp();
    initStudio(root, { name: 'Demo Studio', prefix: 'dm' });
    const studio = loadStudio(root);
    expect(studio.config.name).toBe('Demo Studio');
    expect(studio.config.prefix).toBe('dm');
    expect(studio.config.channels).toContain('linkedin');
    expect(studio.config.thresholds.min_score).toBe(72);
  });

  it('refuses to init over an existing studio', () => {
    const root = tmp();
    initStudio(root, { name: 'A', prefix: 'a' });
    expect(() => initStudio(root, { name: 'B', prefix: 'b' })).toThrow(/already/i);
  });
});

describe('loadStudio', () => {
  it('rejects a config missing prefix', () => {
    const root = tmp();
    initStudio(root, { name: 'Demo', prefix: 'dm' });
    writeFileSync(join(root, 'studio.yml'), 'name: Broken\n');
    expect(() => loadStudio(root)).toThrow(/prefix/);
  });
});

describe('findStudioRoot', () => {
  it('finds the root from a nested directory', () => {
    const root = tmp();
    initStudio(root, { name: 'Demo', prefix: 'dm' });
    const nested = join(root, 'board', '0-inbox');
    expect(findStudioRoot(nested)).toBe(root);
  });

  it('returns null outside any studio', () => {
    const stray = tmp();
    mkdirSync(join(stray, 'deep'), { recursive: true });
    expect(findStudioRoot(join(stray, 'deep'))).toBeNull();
  });
});
