import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const FM_RE = /^---\n([\s\S]*?)\n---\n?/;

export function parseDoc(text: string): { meta: Record<string, unknown>; body: string } {
  const match = FM_RE.exec(text);
  if (!match) return { meta: {}, body: text };
  const meta = (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
  return { meta, body: text.slice(match[0].length) };
}

export function serializeDoc(meta: Record<string, unknown>, body: string): string {
  if (Object.keys(meta).length === 0) return body;
  return `---\n${stringifyYaml(meta).trimEnd()}\n---\n${body}`;
}
