// Render `wr board` ANSI output as a dark-panel HTML file for screenshotting.
// Usage: node scripts/board-shot.mjs <studio-dir> <out.html>
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [studio, out] = process.argv.slice(2);
const ansi = execFileSync('node', [resolve(import.meta.dirname, '../dist/cli/main.js'), 'board'], {
  cwd: studio,
  encoding: 'utf8',
  env: { ...process.env, FORCE_COLOR: '1' },
});

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Minimal SGR subset used by paint(): 1m (bold), 38;2;r;g;bm (fg), 0m (reset).
let html = '';
let open = 0;
for (const token of esc(ansi).split('[')) {
  if (html === '' && !/^\d/.test(token)) { html += token; continue; }
  const m = token.match(/^([\d;]+)m([\s\S]*)$/);
  if (!m) { html += token; continue; }
  const [_, code, text] = m;
  if (code === '0') {
    html += '</span>'.repeat(open) + text;
    open = 0;
  } else if (code === '1') {
    html += `<span style="font-weight:700">${text}`;
    open++;
  } else {
    const rgb = code.match(/^38;2;(\d+);(\d+);(\d+)$/);
    if (rgb) { html += `<span style="color:rgb(${rgb[1]},${rgb[2]},${rgb[3]})">`; open++; }
    html += text;
  }
}
html += '</span>'.repeat(open);

writeFileSync(out, `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#0b0a09;display:inline-block;padding:28px">
<pre style="margin:0;background:#141210;color:#e8e0d4;padding:28px 36px;border-radius:12px;font:14px/1.5 'SF Mono',Menlo,Consolas,monospace">${html}</pre>
</body>`);
console.log('wrote', out);
