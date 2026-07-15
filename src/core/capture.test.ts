import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deriveTitle,
  globalConfigPath,
  readDefaultStudio,
  resolveCaptureStudio,
  writeDefaultStudio,
} from './capture.js';

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'wr-capture-'));
  process.env.WR_CONFIG_DIR = join(tmp, 'config');
});
afterEach(() => {
  delete process.env.WR_CONFIG_DIR;
  rmSync(tmp, { recursive: true, force: true });
});

function makeStudio(dir: string): string {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'studio.yml'), 'name: T\nprefix: t\n');
  return dir;
}

describe('deriveTitle', () => {
  it('uses the first line as title, rest as body', () => {
    const r = deriveTitle('Fuel math nobody does\n\nStoves lie on spec sheets.');
    expect(r.title).toBe('Fuel math nobody does');
    expect(r.body).toBe('Stoves lie on spec sheets.');
  });
  it('strips a markdown heading marker', () => {
    expect(deriveTitle('# My idea\nbody').title).toBe('My idea');
  });
  it('keeps full text as body when the first line overflows', () => {
    const long = 'x'.repeat(200);
    const r = deriveTitle(long);
    expect(r.title.length).toBe(78); // 77 + ellipsis
    expect(r.body).toBe(long);
  });
  it('single short line means empty body', () => {
    expect(deriveTitle('just a thought').body).toBe('');
  });
});

describe('default studio config', () => {
  it('round-trips and respects WR_CONFIG_DIR', () => {
    expect(readDefaultStudio()).toBeNull();
    const studio = makeStudio(join(tmp, 'studio-a'));
    writeDefaultStudio(studio);
    expect(globalConfigPath().startsWith(join(tmp, 'config'))).toBe(true);
    expect(readDefaultStudio()).toBe(studio);
  });
  it('returns null on corrupt config', () => {
    mkdirSync(join(tmp, 'config'), { recursive: true });
    writeFileSync(join(tmp, 'config', 'config.json'), 'not json');
    expect(readDefaultStudio()).toBeNull();
  });
});

describe('resolveCaptureStudio', () => {
  it('prefers flag, then cwd, then env, then default', () => {
    const a = makeStudio(join(tmp, 'a'));
    const b = makeStudio(join(tmp, 'b'));
    const c = makeStudio(join(tmp, 'c'));
    const d = makeStudio(join(tmp, 'd'));
    writeDefaultStudio(d);
    expect(resolveCaptureStudio({ flag: a, cwd: b, env: c })).toBe(a);
    expect(resolveCaptureStudio({ cwd: b, env: c })).toBe(b);
    expect(resolveCaptureStudio({ cwd: join(tmp, 'nowhere'), env: c })).toBe(c);
    expect(resolveCaptureStudio({ cwd: join(tmp, 'nowhere') })).toBe(d);
  });
  it('returns null when nothing resolves', () => {
    expect(resolveCaptureStudio({ cwd: tmp })).toBeNull();
  });
});
