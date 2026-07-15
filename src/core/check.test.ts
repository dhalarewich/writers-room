import { mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCard, loadCard, saveCard } from './card.js';
import { checkStudio } from './check.js';
import { initStudio } from './studio.js';

function makeStudio() {
  const root = mkdtempSync(join(tmpdir(), 'wr-check-'));
  return initStudio(root, { name: 'Demo', prefix: 'dm' });
}

function rules(studio: ReturnType<typeof makeStudio>): string[] {
  return checkStudio(studio).map((p) => p.rule);
}

describe('checkStudio', () => {
  it('passes a clean studio', () => {
    const studio = makeStudio();
    createCard(studio, { title: 'Note' }); // inbox needs no pillar
    createCard(studio, { title: 'Idea', pillar: 'pillar-one', channel: ['linkedin'] }, 'ideas');
    expect(checkStudio(studio)).toEqual([]);
  });

  it('flags unknown and missing pillars', () => {
    const studio = makeStudio();
    createCard(studio, { title: 'Bad pillar', pillar: 'nope' }, 'ideas');
    createCard(studio, { title: 'No pillar' }, 'drafting');
    const r = rules(studio);
    expect(r).toContain('pillar-unknown');
    expect(r).toContain('pillar-missing');
  });

  it('flags unknown channels and invalid gates', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'T', pillar: 'pillar-one', channel: ['myspace'] }, 'ideas');
    card.meta.gates.voice = 'maybe' as never;
    saveCard(card);
    const r = rules(studio);
    expect(r).toContain('channel-unknown');
    expect(r).toContain('gate-invalid');
  });

  it('requires needs:[operator] when a gate is blocked', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'T', pillar: 'pillar-one' }, 'drafting');
    card.meta.gates.facts = 'blocked';
    saveCard(card);
    expect(rules(studio)).toContain('needs-vs-gates');
  });

  it('flags broken series and duplicate ids', () => {
    const studio = makeStudio();
    createCard(
      studio,
      { title: 'Two', pillar: 'pillar-one', series: { of: 'dm-0999', seq: 2, len: 3 } },
      'ideas',
    );
    const a = createCard(studio, { title: 'Dup A' });
    writeFileSync(
      join(studio.root, 'board', '0-inbox', 'dm-0001-dup-b.md'),
      `---\nid: ${a.meta.id}\ntitle: Dup B\ngates: {facts: pending, critique: pending, voice: pending}\npinned: false\ncreated: x\nupdated: x\n---\n`,
    );
    const r = rules(studio);
    expect(r).toContain('series-broken');
    expect(r).toContain('dup-id');
  });

  it('flags id/filename mismatches and stray files', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Mismatch' });
    renameSync(card.path, join(studio.root, 'board', '0-inbox', 'dm-0042-mismatch.md'));
    writeFileSync(join(studio.root, 'board', '0-inbox', 'stray.txt'), 'raw note');
    const r = rules(studio);
    expect(r).toContain('id-mismatch');
    expect(r).toContain('stray-file');
  });
});
