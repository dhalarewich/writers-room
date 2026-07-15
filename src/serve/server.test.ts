import { request } from 'node:http';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { moveCard } from '../core/board.js';
import { createCard, loadCard } from '../core/card.js';
import { initStudio } from '../core/studio.js';
import type { Server } from 'node:http';
import { serveBoard } from './server.js';

let server: Server | undefined;
afterEach(() => server?.close());

async function start() {
  const root = mkdtempSync(join(tmpdir(), 'wr-serve-'));
  const studio = initStudio(root, { name: 'Serve', prefix: 'sv' });
  createCard(studio, { title: 'Draggable' }, 'ideas');
  server = serveBoard(studio, 0); // ephemeral port
  await new Promise((r) => server!.once('listening', r));
  const port = (server!.address() as AddressInfo).port;
  return { studio, port };
}

function post(
  port: number,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data), ...headers },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
      },
    );
    req.on('error', reject);
    req.end(data);
  });
}

function get(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('serveBoard /move', () => {
  it('moves a card to the dropped stage', async () => {
    const { studio, port } = await start();
    const res = await post(port, '/move', { id: 'sv-0001', to: 'approved' });
    expect(res.status).toBe(200);
    expect(loadCard(studio, 'sv-0001').stage).toBe('approved');
  });

  it('rejects an unknown stage', async () => {
    const { studio, port } = await start();
    const res = await post(port, '/move', { id: 'sv-0001', to: 'nowhere' });
    expect(res.status).toBe(400);
    expect(loadCard(studio, 'sv-0001').stage).toBe('ideas'); // unmoved
  });

  it('blocks a cross-origin POST', async () => {
    const { studio, port } = await start();
    const res = await post(port, '/move', { id: 'sv-0001', to: 'approved' }, { origin: 'http://evil.example' });
    expect(res.status).toBe(403);
    expect(loadCard(studio, 'sv-0001').stage).toBe('ideas'); // unmoved
  });

  it('rejects a raw move into published — ship has its own ceremony', async () => {
    const { studio, port } = await start();
    const res = await post(port, '/move', { id: 'sv-0001', to: 'published' });
    expect(res.status).toBe(400);
    expect(res.body).toContain('ceremony');
    expect(loadCard(studio, 'sv-0001').stage).toBe('ideas'); // unmoved
  });
});

describe('GET /card/:id', () => {
  it('renders the card detail page', async () => {
    const { port } = await start();
    const res = await get(port, '/card/sv-0001');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Draggable');
  });

  it('404s on an unknown id', async () => {
    const { port } = await start();
    const res = await get(port, '/card/nope');
    expect(res.status).toBe(404);
  });
});

describe('POST /archive', () => {
  it('moves the card file into board/archive and drops it off the board', async () => {
    const { studio, port } = await start();
    const res = await post(port, '/archive', { id: 'sv-0001' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(() => loadCard(studio, 'sv-0001')).toThrow();
    expect(existsSync(join(studio.root, 'board', 'archive'))).toBe(true);
  });
});

describe('POST /ship', () => {
  it('rejects shipping a card that is not in ready', async () => {
    const { port } = await start();
    const res = await post(port, '/ship', { id: 'sv-0001' });
    expect(res.status).toBe(400);
  });

  it('does not mutate a non-ready card even when finalText is pasted', async () => {
    const { studio, port } = await start();
    const before = loadCard(studio, 'sv-0001');
    const res = await post(port, '/ship', { id: 'sv-0001', finalText: 'should never land' });
    expect(res.status).toBe(400);
    const after = loadCard(studio, 'sv-0001');
    expect(after.body).toBe(before.body);
    expect(after.body).not.toContain('should never land');
  });

  it('ships a ready card with pasted finalText, swapping the piece and capturing the diff', async () => {
    const { studio, port } = await start();
    const card = createCard(
      studio,
      { title: 'Ready piece' },
      'editing',
      'agent draft.\n\n***\n\n## Dossier\n\nfacts.\n',
    );
    moveCard(studio, card.meta.id, 'ready');
    const res = await post(port, '/ship', { id: card.meta.id, finalText: 'operator final text.' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
    const shipped = loadCard(studio, card.meta.id);
    expect(shipped.stage).toBe('published');
    const onDisk = readFileSync(shipped.path, 'utf8');
    expect(onDisk).toContain('operator final text.');
    expect(onDisk).toContain('## Dossier');
    expect(onDisk).toContain('facts.');
    expect(existsSync(join(studio.root, 'memory', 'edits', `${card.meta.id}.diff`))).toBe(true);
  });
});