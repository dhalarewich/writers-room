import { describe, expect, it } from 'vitest';
import { parseDoc, serializeDoc } from './frontmatter.js';

describe('parseDoc', () => {
  it('splits frontmatter from body', () => {
    const { meta, body } = parseDoc('---\nid: x\nn: 3\n---\nhello\nworld\n');
    expect(meta).toEqual({ id: 'x', n: 3 });
    expect(body).toBe('hello\nworld\n');
  });

  it('returns empty meta when there is no frontmatter', () => {
    const { meta, body } = parseDoc('just a body\n');
    expect(meta).toEqual({});
    expect(body).toBe('just a body\n');
  });

  it('only recognizes frontmatter at byte zero', () => {
    const text = 'intro\n---\nid: x\n---\n';
    const { meta, body } = parseDoc(text);
    expect(meta).toEqual({});
    expect(body).toBe(text);
  });

  it('leaves --- lines inside the body alone', () => {
    const { body } = parseDoc('---\nid: x\n---\nabove\n---\nbelow\n');
    expect(body).toBe('above\n---\nbelow\n');
  });
});

describe('serializeDoc', () => {
  it('round-trips with parseDoc', () => {
    const meta = { id: 'wr-0001', tags: ['a', 'b'], pinned: false };
    const body = '# Title\n\nsome text\n';
    const round = parseDoc(serializeDoc(meta, body));
    expect(round.meta).toEqual(meta);
    expect(round.body).toBe(body);
  });

  it('emits no frontmatter block for empty meta', () => {
    expect(serializeDoc({}, 'body\n')).toBe('body\n');
  });
});
