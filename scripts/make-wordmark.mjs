// Regenerate assets/wordmark.svg from the figlet art below (SVG because GitHub's
// macOS font stack lacks U+2591 and misaligns shade-block ASCII art).
import { writeFileSync } from 'node:fs';

const ART = `
░██       ░██          ░██   ░██
░██       ░██                ░██
░██  ░██  ░██ ░██░████ ░██░████████  ░███████  ░██░████  ░███████
░██ ░████ ░██ ░███     ░██   ░██    ░██    ░██ ░███     ░██
░██░██ ░██░██ ░██      ░██   ░██    ░█████████ ░██       ░███████
░████   ░████ ░██      ░██   ░██    ░██        ░██             ░██
░███     ░███ ░██      ░██    ░████  ░███████  ░██       ░███████

░█████████
░██     ░██
░██     ░██  ░███████   ░███████  ░█████████████
░█████████  ░██    ░██ ░██    ░██ ░██   ░██   ░██
░██   ░██   ░██    ░██ ░██    ░██ ░██   ░██   ░██
░██    ░██  ░██    ░██ ░██    ░██ ░██   ░██   ░██
░██     ░██  ░███████   ░███████  ░██   ░██   ░██
`.replace(/^\n/, '').replace(/\n$/, '');

const CELL_W = 9;
const CELL_H = 16;
const COPPER = '#c47a3d';
const lines = ART.split('\n');
const cols = Math.max(...lines.map((l) => l.length));
const rects = [];
lines.forEach((line, row) => {
  for (let col = 0; col < line.length; col++) {
    const ch = line[col];
    if (ch !== '█' && ch !== '░') continue;
    const opacity = ch === '█' ? '1' : '0.38';
    rects.push(`<rect x="${col * CELL_W}" y="${row * CELL_H}" width="${CELL_W}" height="${CELL_H}" fill="${COPPER}" fill-opacity="${opacity}"/>`);
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * CELL_W} ${lines.length * CELL_H}" role="img" aria-label="Writers Room">
${rects.join('\n')}
</svg>
`;
writeFileSync(new URL('../assets/wordmark.svg', import.meta.url), svg);
console.log(`wordmark.svg: ${lines.length} rows x ${cols} cols, ${rects.length} cells`);
