import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { archiveCard, moveCard } from '../core/board.js';
import { loadCard, replacePiece, saveCard } from '../core/card.js';
import { shipCard } from '../core/shipdiff.js';
import { writeStatus } from '../core/status.js';
import type { Stage, Studio } from '../core/types.js';
import { STAGES } from '../core/types.js';
import { renderBoardHtml, renderCardHtml } from './render.js';

/**
 * Same-origin guard (a random tab can't drive the local board) + bounded JSON body
 * reader, shared by every POST route. Errors thrown by `handler` (bad input, a
 * pinned card, an unknown id, …) are reported as 400 with the error's message.
 */
function withJsonBody(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (body: Record<string, unknown>) => void,
): void {
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('cross-origin');
    return;
  }
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 10_000) req.destroy(); // no unbounded bodies
  });
  req.on('end', () => {
    try {
      handler(JSON.parse(raw) as Record<string, unknown>);
    } catch (err) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end(err instanceof Error ? err.message : String(err));
    }
  });
}

export function serveBoard(studio: Studio, port: number): Server {
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/move') {
      withJsonBody(req, res, ({ id, to }) => {
        if (typeof to !== 'string' || !STAGES.includes(to as Stage)) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end('bad stage');
          return;
        }
        if (to === 'published') {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end('publishing has its own ceremony — open the card and ship it');
          return;
        }
        const card = moveCard(studio, String(id), to as Stage);
        writeStatus(studio); // parity with `wr move`
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id: card.meta.id, stage: card.stage }));
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/archive') {
      withJsonBody(req, res, ({ id }) => {
        archiveCard(studio, String(id));
        writeStatus(studio);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/ship') {
      withJsonBody(req, res, ({ id, finalText }) => {
        const cardId = String(id);
        const card = loadCard(studio, cardId);
        if (card.stage !== 'ready') {
          // Check BEFORE the paste-back write: a card that won't ship must not be mutated.
          throw new Error(
            `${cardId} is in ${card.stage}, not ready/ — move it there first (the operator's publish gate).`,
          );
        }
        if (typeof finalText === 'string' && finalText.length > 0) {
          card.body = replacePiece(card.body, finalText);
          saveCard(card);
        }
        const { changed, diffPath } = shipCard(studio, cardId);
        writeStatus(studio);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, changed, diffPath }));
      });
      return;
    }
    if (req.method === 'GET' && req.url?.startsWith('/card/')) {
      const id = decodeURIComponent(req.url.slice('/card/'.length));
      try {
        const html = renderCardHtml(studio, id);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
      }
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