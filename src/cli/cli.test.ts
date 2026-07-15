import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MAIN = resolve(__dirname, 'main.ts');
const TSX = resolve(__dirname, '..', '..', 'node_modules', '.bin', 'tsx');

function wr(cwd: string, ...args: string[]): { stdout: string; code: number } {
  try {
    const stdout = execFileSync(TSX, [MAIN, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
    return { stdout, code: 0 };
  } catch (error) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? '', code: e.status ?? 1 };
  }
}

describe('wr end to end', () => {
  it('init → new → move → board → sweep → ship → check', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-cli-'));
    expect(wr(dir, 'init', '.', '--name', 'CLI Demo', '--prefix', 'cd').code).toBe(0);

    const created = wr(dir, 'new', 'First idea', '--pillar', 'pillar-one', '--channel', 'linkedin');
    expect(created.stdout).toContain('cd-0001');

    expect(wr(dir, 'move', 'cd-0001', 'editing').code).toBe(0);
    expect(wr(dir, 'move', 'cd-0001', 'ready').code).toBe(0);

    const board = wr(dir, 'board');
    expect(board.stdout).toContain('CLI Demo');
    expect(board.stdout).toContain('5-ready (1)');

    const shipped = wr(dir, 'ship', 'cd-0001');
    expect(shipped.code).toBe(0);
    expect(shipped.stdout).toContain('published');

    expect(wr(dir, 'check').code).toBe(0);
  });

  it('refuses to ship a card that is not in ready', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-cli2-'));
    wr(dir, 'init', '.', '--name', 'X', '--prefix', 'x');
    wr(dir, 'new', 'Note');
    const result = wr(dir, 'ship', 'x-0001');
    expect(result.code).toBe(1);
  });

  it('adopts stray notes into cards', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-cli3-'));
    wr(dir, 'init', '.', '--name', 'X', '--prefix', 'x');
    writeFileSync(join(dir, 'board', '0-inbox', 'raw-thought.txt'), 'A raw thought\nwith a body line\n');
    const result = wr(dir, 'adopt');
    expect(result.stdout).toContain('adopted raw-thought.txt');
    expect(wr(dir, 'board').stdout).toContain('A raw thought');
  });
});
