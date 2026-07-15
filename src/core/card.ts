import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseDoc, serializeDoc } from './frontmatter.js';
import type { Card, CardMeta, GateName, GateState, Stage, Studio } from './types.js';
import { GATE_NAMES, STAGES, STAGE_DIRS } from './types.js';

export function nextId(studio: Studio): string {
  const seqPath = join(studio.root, '.wr', 'seq');
  const current = Number.parseInt(readFileSync(seqPath, 'utf8').trim() || '0', 10);
  const next = current + 1;
  writeFileSync(seqPath, String(next));
  return `${studio.config.prefix}-${String(next).padStart(4, '0')}`;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

function toArray(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function normalizeGates(value: unknown): Record<GateName, GateState> {
  const raw = (value ?? {}) as Record<string, unknown>;
  const gates = {} as Record<GateName, GateState>;
  for (const name of GATE_NAMES) {
    gates[name] = (raw[name] as GateState) ?? 'pending';
  }
  return gates;
}

export function parseCard(path: string, stage: Stage, text: string): Card {
  const { meta: raw, body } = parseDoc(text);
  const meta: CardMeta = {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    channel: toArray(raw.channel),
    pillar: raw.pillar == null ? undefined : String(raw.pillar),
    tags: toArray(raw.tags),
    score: raw.score == null ? undefined : Number(raw.score),
    series: raw.series as CardMeta['series'],
    gates: normalizeGates(raw.gates),
    needs: toArray(raw.needs),
    pinned: Boolean(raw.pinned),
    source: raw.source == null ? undefined : String(raw.source),
    created: String(raw.created ?? ''),
    updated: String(raw.updated ?? ''),
  };
  return { meta, body, path, stage };
}

export function serializeCard(card: Card): string {
  const m = card.meta;
  const meta: Record<string, unknown> = {
    id: m.id,
    title: m.title,
  };
  if (m.channel.length) meta.channel = m.channel;
  if (m.pillar) meta.pillar = m.pillar;
  if (m.tags.length) meta.tags = m.tags;
  if (m.score != null) meta.score = m.score;
  if (m.series) meta.series = m.series;
  meta.gates = m.gates;
  if (m.needs.length) meta.needs = m.needs;
  meta.pinned = m.pinned;
  if (m.source) meta.source = m.source;
  meta.created = m.created;
  meta.updated = m.updated;
  return serializeDoc(meta, card.body);
}

export function cardFiles(studio: Studio, stage: Stage): string[] {
  const dir = join(studio.root, 'board', STAGE_DIRS[stage]);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => join(dir, f));
}

export function loadCard(studio: Studio, id: string): Card {
  for (const stage of STAGES) {
    for (const path of cardFiles(studio, stage)) {
      if (basename(path).startsWith(`${id}-`) || basename(path) === `${id}.md`) {
        return parseCard(path, stage, readFileSync(path, 'utf8'));
      }
    }
  }
  throw new Error(`No card ${id} in any stage of ${studio.root}`);
}

export function saveCard(card: Card): void {
  card.meta.updated = new Date().toISOString();
  writeFileSync(card.path, serializeCard(card));
}

export function createCard(
  studio: Studio,
  init: Partial<CardMeta> & { title: string },
  stage: Stage = 'inbox',
  body = '',
): Card {
  const id = init.id ?? nextId(studio);
  const now = new Date().toISOString();
  const meta: CardMeta = {
    id,
    title: init.title,
    channel: toArray(init.channel),
    pillar: init.pillar,
    tags: toArray(init.tags),
    score: init.score,
    series: init.series,
    gates: normalizeGates(init.gates),
    needs: toArray(init.needs),
    pinned: init.pinned ?? false,
    source: init.source,
    created: init.created ?? now,
    updated: now,
  };
  const slug = slugify(init.title) || 'untitled';
  const path = join(studio.root, 'board', STAGE_DIRS[stage], `${id}-${slug}.md`);
  const card: Card = { meta, body, path, stage };
  writeFileSync(path, serializeCard(card));
  return card;
}

const DOSSIER_HEADER = '## Dossier';

export function appendSection(card: Card, heading: string, content: string): void {
  const section = `### ${heading}\n\n${content.trimEnd()}\n`;
  if (card.body.includes(section)) return;
  if (!card.body.includes(DOSSIER_HEADER)) {
    const sep = card.body.endsWith('\n') || card.body === '' ? '' : '\n';
    card.body += `${sep}\n***\n\n${DOSSIER_HEADER}\n\n`;
  }
  const notesIdx = card.body.indexOf('\n## Notes');
  if (notesIdx === -1) {
    const sep = card.body.endsWith('\n') ? '' : '\n';
    card.body += `${sep}${section}\n`;
  } else {
    card.body =
      card.body.slice(0, notesIdx + 1) + section + '\n' + card.body.slice(notesIdx + 1);
  }
}
