import { createServer, type Server } from 'node:http';
import { moveCard } from '../core/board.js';
import { writeStatus } from '../core/status.js';
import type { Stage, Studio } from '../core/types.js';
import { STAGES } from '../core/types.js';
import { renderBoardHtml } from './render.js';

export function serveBoard(studio: Studio, port: number): Server {
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/move') {
      // Same-origin guard: a browser sends Origin on cross-site POSTs; block them
      // so a random tab can't drive the local board. Same-origin fetch omits/matches it.
      const origin = req.headers.origin;
      if (origin && origin !== `http://${req.headers.host}`) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('cross-origin');
        return;
      }
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10_000) req.destroy(); // no unbounded bodies
      });
      req.on('end', () => {
        try {
          const { id, to } = JSON.parse(body) as { id?: unknown; to?: unknown };
          if (typeof to !== 'string' || !STAGES.includes(to as Stage)) {
            res.writeHead(400, { 'content-type': 'text/plain' });
            res.end('bad stage');
            return;
          }
          const card = moveCard(studio, String(id), to as Stage);
          writeStatus(studio); // parity with `wr move`
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, id: card.meta.id, stage: card.stage }));
        } catch (err) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end(err instanceof Error ? err.message : String(err));
        }
      });
      return;
    }
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderBoardHtml(studio));
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`◈ board at http://localhost:${port} (drag cards to move · ctrl-c to stop)`);
  });
  return server;
}