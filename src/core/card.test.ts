import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendSection,
  createCard,
  loadCard,
  nextId,
  parseCard,
  saveCard,
  serializeCard,
} from './card.js';
import { initStudio } from './studio.js';

function makeStudio() {
  const root = mkdtempSync(join(tmpdir(), 'wr-card-'));
  return initStudio(root, { name: 'Demo', prefix: 'dm' });
}

describe('createCard', () => {
  it('writes a card into the inbox with a monotonic id and slug', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'How Orbit Ships Product!' });
    expect(card.meta.id).toBe('dm-0001');
    expect(card.stage).toBe('inbox');
    expect(card.path.endsWith('board/0-inbox/dm-0001-how-orbit-ships-product.md')).toBe(true);
    const second = createCard(studio, { title: 'Another' }, 'ideas');
    expect(second.meta.id).toBe('dm-0002');
    expect(second.stage).toBe('ideas');
  });

  it('applies defaults: pending gates, empty needs, unpinned', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'T' });
    expect(card.meta.gates).toEqual({ facts: 'pending', critique: 'pending', voice: 'pending' });
    expect(card.meta.needs).toEqual([]);
    expect(card.meta.pinned).toBe(false);
    expect(card.meta.created).toBeTruthy();
  });

  it('normalizes a scalar channel to an array', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'T', channel: 'linkedin' as unknown as string[] });
    expect(card.meta.channel).toEqual(['linkedin']);
  });
});

describe('parse/serialize round trip', () => {
  it('preserves body and meta', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'T', tags: ['hot-take'] }, 'inbox', 'The sketch.\n');
    const text = readFileSync(card.path, 'utf8');
    const round = parseCard(card.path, 'inbox', text);
    expect(round.meta.tags).toEqual(['hot-take']);
    expect(round.body).toContain('The sketch.');
    expect(serializeCard(round)).toBe(text);
  });
});

describe('loadCard/saveCard', () => {
  it('finds a card by id in any stage and bumps updated on save', () => {
    const studio = makeStudio();
    createCard(studio, { title: 'Elsewhere' }, 'editing');
    const card = loadCard(studio, 'dm-0001');
    expect(card.stage).toBe('editing');
    const before = card.meta.updated;
    card.body = 'new body\n';
    card.meta.updated = '2000-01-01T00:00:00.000Z';
    saveCard(card);
    const reloaded = loadCard(studio, 'dm-0001');
    expect(reloaded.body).toBe('new body\n');
    expect(reloaded.meta.updated >= before).toBe(true);
  });

  it('throws a clear error for a missing id', () => {
    const studio = makeStudio();
    expect(() => loadCard(studio, 'dm-9999')).toThrow(/dm-9999/);
  });
});

describe('appendSection', () => {
  it('creates the Dossier on first append and appends thereafter', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'T' }, 'ideas', 'Sketch.\n');
    appendSection(card, 'Positioning', 'Audience: builders.\n');
    appendSection(card, 'Score', 'Total: 78\n');
    expect(card.body).toContain('## Dossier');
    expect(card.body.indexOf('### Positioning')).toBeLessThan(card.body.indexOf('### Score'));
    expect(card.body.match(/## Dossier/g)?.length).toBe(1);
  });
});

describe('nextId', () => {
  it('pads to four digits and honors the prefix', () => {
    const studio = makeStudio();
    expect(nextId(studio)).toBe('dm-0001');
    expect(nextId(studio)).toBe('dm-0002');
  });
});
