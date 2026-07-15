import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { archiveCard, boardCounts, listCards, moveCard } from './board.js';
import { createCard, loadCard, saveCard } from './card.js';
import { captureShipDiff, shipCard } from './shipdiff.js';
import { initStudio } from './studio.js';

function makeStudio() {
  const root = mkdtempSync(join(tmpdir(), 'wr-board-'));
  return initStudio(root, { name: 'Demo', prefix: 'dm' });
}

describe('listCards / boardCounts', () => {
  it('lists per stage sorted by id, and counts', () => {
    const studio = makeStudio();
    createCard(studio, { title: 'B' }, 'ideas');
    createCard(studio, { title: 'A' }, 'ideas');
    createCard(studio, { title: 'C' }, 'inbox');
    const ideas = listCards(studio, 'ideas');
    expect(ideas.map((c) => c.meta.id)).toEqual(['dm-0001', 'dm-0002']);
    expect(listCards(studio)).toHaveLength(3);
    expect(boardCounts(studio).ideas).toBe(2);
    expect(boardCounts(studio).inbox).toBe(1);
  });
});

describe('moveCard', () => {
  it('renames the file into the target stage dir', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Move me' });
    const moved = moveCard(studio, card.meta.id, 'approved');
    expect(moved.stage).toBe('approved');
    expect(existsSync(card.path)).toBe(false);
    expect(moved.path).toContain('2-approved');
    expect(loadCard(studio, 'dm-0001').stage).toBe('approved');
  });

  it('refuses to move a pinned card without force', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Pinned', pinned: true });
    expect(() => moveCard(studio, card.meta.id, 'ideas')).toThrow(/pinned/);
    expect(moveCard(studio, card.meta.id, 'ideas', { force: true }).stage).toBe('ideas');
  });

  it('snapshots the body when a card reaches ready', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Ship me' }, 'editing', 'agent final text\n');
    moveCard(studio, card.meta.id, 'ready');
    const snap = join(studio.root, 'memory', 'edits', 'dm-0001.agent.md');
    expect(readFileSync(snap, 'utf8')).toBe('agent final text\n');
  });
});

describe('captureShipDiff', () => {
  it('reports unchanged when the operator made no edits', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Clean' }, 'editing', 'final\n');
    moveCard(studio, card.meta.id, 'ready');
    expect(captureShipDiff(studio, 'dm-0001')).toEqual({ diffPath: null, changed: false });
  });

  it('captures a compact diff of operator edits', () => {
    const studio = makeStudio();
    const card = createCard(
      studio,
      { title: 'Edited' },
      'editing',
      'keep one\ncut this line\nkeep two\n',
    );
    moveCard(studio, card.meta.id, 'ready');
    const onDisk = loadCard(studio, 'dm-0001');
    onDisk.body = 'keep one\na better line\nkeep two\n';
    saveCard(onDisk);
    const { diffPath, changed } = captureShipDiff(studio, 'dm-0001');
    expect(changed).toBe(true);
    const diff = readFileSync(diffPath!, 'utf8');
    expect(diff).toContain('- cut this line');
    expect(diff).toContain('+ a better line');
    expect(diff).toContain('  keep one');
  });
});

describe('archiveCard', () => {
  it('moves the card file into board/archive and drops it from listCards', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Archive me' }, 'ideas');
    const newPath = archiveCard(studio, card.meta.id);
    expect(existsSync(card.path)).toBe(false);
    expect(newPath).toContain(join('board', 'archive'));
    expect(existsSync(newPath)).toBe(true);
    expect(listCards(studio)).toHaveLength(0);
  });

  it('refuses to archive a pinned card', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Pinned', pinned: true });
    expect(() => archiveCard(studio, card.meta.id)).toThrow(/pinned/);
  });
});

describe('shipCard', () => {
  it('moves a ready card to published, appends Shipped, reports unchanged with no snapshot edits', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Ship me' }, 'editing', 'final text\n');
    moveCard(studio, card.meta.id, 'ready');
    const result = shipCard(studio, card.meta.id);
    expect(result.changed).toBe(false);
    expect(result.diffPath).toBeNull();
    expect(result.card.stage).toBe('published');
    expect(result.card.path).toContain('6-published');
    expect(result.card.body).toContain('### Shipped');
    expect(loadCard(studio, card.meta.id).stage).toBe('published');
  });

  it('throws when the card is not in ready', () => {
    const studio = makeStudio();
    const card = createCard(studio, { title: 'Too soon' }, 'editing');
    expect(() => shipCard(studio, card.meta.id)).toThrow(
      `${card.meta.id} is in editing, not ready/ — move it there first (the operator's publish gate).`,
    );
  });
});
