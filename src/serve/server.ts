import { createServer } from 'node:http';
import type { Studio } from '../core/types.js';
import { renderBoardHtml } from './render.js';

export function serveBoard(studio: Studio, port: number): void {
  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderBoardHtml(studio));
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`◈ board at http://localhost:${port} (read-only, ctrl-c to stop)`);
  });
}
