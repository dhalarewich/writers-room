/** Field-station palette: dark ground, copper signal. One source for TUI, board render, web view. */
export const palette = {
  bg: '#141210',
  panel: '#1d1a17',
  ink: '#e8e0d4',
  dim: '#8a7f70',
  copper: '#c47a3d',
  copperBright: '#e09a5a',
  ok: '#7d9c6a',
  warn: '#c9a227',
  block: '#b0563e',
} as const;

const useColor = (): boolean =>
  process.stdout.isTTY === true && !process.env.NO_COLOR;

function hexToAnsi(hex: string, background = false): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `[${background ? 48 : 38};2;${r};${g};${b}m`;
}

export function paint(text: string, hex: string, opts: { bold?: boolean } = {}): string {
  if (!useColor()) return text;
  const bold = opts.bold ? '[1m' : '';
  return `${bold}${hexToAnsi(hex)}${text}[0m`;
}
