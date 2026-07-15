import { describe, expect, it } from 'vitest';
import { pieceOnly, sweep } from './sweep.js';

describe('em dashes', () => {
  it('counts em dashes but not hyphens or code blocks', () => {
    const r = sweep('One — two — three. A well-known hyphen.\n```\ncode — with dash\n```\n');
    expect(r.emDashes).toBe(2);
  });

  it('ignores HTML comment markers like DEFEND and IMAGE', () => {
    const r = sweep('Clean prose.\n<!-- IMAGE: alt — with a dash -->\n<!-- DEFEND: reason — because -->\n');
    expect(r.emDashes).toBe(0);
  });
});

describe('pieceOnly', () => {
  it('strips the Dossier regardless of separator style', () => {
    expect(pieceOnly('The piece.\n\n***\n\n## Dossier\n\n### Score — 82\n')).toBe('The piece.\n');
    expect(pieceOnly('The piece.\n## Dossier\ntext — here\n')).toBe('The piece.');
    expect(pieceOnly('No dossier at all.\n')).toBe('No dossier at all.\n');
  });
});

describe('contrast snaps', () => {
  const positives = [
    "It's not just automation — it's judgment.",
    "This isn't a strategy. It's a countdown.",
    "The work won't be coding. It'll be reviewing.",
    'The tool stops being a helper and starts being a partner.',
    "Success isn't about output, but about restraint.",
  ];
  for (const text of positives) {
    it(`matches: ${text.slice(0, 40)}`, () => {
      expect(sweep(text).contrastSnaps.length).toBeGreaterThanOrEqual(1);
    });
  }

  const negatives = [
    "This isn't ready yet. We ship tomorrow.",
    'I did not expect the launch to work.',
    "It's not perfect. Nobody claimed otherwise.",
  ];
  for (const text of negatives) {
    it(`ignores: ${text.slice(0, 40)}`, () => {
      expect(sweep(text).contrastSnaps).toEqual([]);
    });
  }

  it('counts stacked snaps separately', () => {
    const text =
      "It's not a tool — it's a teammate. The job isn't writing. It's editing. Growth won't be linear. It'll be lumpy.";
    expect(sweep(text).contrastSnaps.length).toBe(3);
  });
});

describe('rule of three', () => {
  it('flags three consecutive short fragments', () => {
    const r = sweep('No fluff. No filler. No slop.');
    expect(r.ruleOfThree.length).toBeGreaterThanOrEqual(1);
  });

  it('flags a tidy triad of short items closing a sentence', () => {
    const r = sweep('The playbook was simple: ship fast, learn hard, stay small.');
    expect(r.ruleOfThree.length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag ordinary prose with commas', () => {
    const r = sweep(
      'We shipped the beta in March, which surprised the team that had planned for June, and the customers who found it early told us exactly what was missing.',
    );
    expect(r.ruleOfThree).toEqual([]);
  });
});

describe('metronome', () => {
  it('flags uniform sentence lengths', () => {
    const text = Array.from(
      { length: 8 },
      (_, i) => `The team shipped the feature on time again${i % 2 ? ' now' : ''}.`,
    ).join(' ');
    expect(sweep(text).metronome.flagged).toBe(true);
  });

  it('passes varied rhythm', () => {
    const text =
      'It broke. We spent the whole of March rebuilding the ingestion path that nobody had touched since the seed round, mostly at night. Then quiet. The next release took an afternoon. Nobody outside the team ever knew how close the whole thing came to falling over that spring. Shipping resumed.';
    expect(sweep(text).metronome.flagged).toBe(false);
  });
});

describe('hashtags, banned phrases, credential stacks', () => {
  it('counts hashtags but not markdown headings or anchors', () => {
    const r = sweep('# Heading\n\nGreat launch #buildinpublic #AI\nSee [docs](guide.md#setup).');
    expect(r.hashtags).toBe(2);
  });

  it('finds banned phrases case-insensitively', () => {
    const r = sweep('Thrilled to Share our roadmap.', { bannedPhrases: ['thrilled to share'] });
    expect(r.bannedHits).toEqual(['thrilled to share']);
  });

  it('flags hyphenated credential stacks', () => {
    const r = sweep('A founder-operator-investor take on markets.');
    expect(r.credentialStacks).toEqual(['founder-operator-investor']);
  });

  it('leaves ordinary hyphenated compounds alone', () => {
    expect(sweep('A well-thought-out plan.').credentialStacks).toEqual([]);
  });
});
