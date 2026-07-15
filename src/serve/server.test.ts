import { request } from 'node:http';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
});