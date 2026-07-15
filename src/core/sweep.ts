export interface SweepResult {
  emDashes: number;
  contrastSnaps: string[];
  hashtags: number;
  ruleOfThree: string[];
  metronome: { flagged: boolean; stdev: number };
  bannedHits: string[];
  credentialStacks: string[];
}

/** Remove fenced code, inline code, and HTML comments (DEFEND/IMAGE markers) before counting prose tells. */
function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/** The piece is everything before the Dossier; sweep must never count the paperwork. */
export function pieceOnly(body: string): string {
  return body.split(/\n(?:\*\*\*\n+)?## Dossier\b/)[0];
}

const SNAP_PATTERNS: RegExp[] = [
  // "It's not X — it's Y" / "not just X, it's Y" / "not X, but about Y"
  /\bnot (?:just |only |merely |simply )?[^.!?;\n]{2,60}?(?:—|--|,|;)\s*(?:it'?s|it is|they'?re|that'?s|but)\b/gi,
  // "isn't X, but Y" — negated clause snapping to a but-reassertion
  /\b(?:is|was|are|were)n'?t (?:just |only |merely |about )?[^.!?;\n]{2,60}?(?:—|--|,|;)\s*but\b/gi,
  // "isn't X. It's Y." — reassertion sentence must re-open with It/They/That/This + be
  /\b(?:is|was|are|were)n't (?:just |only |a |an |the )?[^.!?\n]{2,60}[.!?]\s+(?:It|They|That|This)(?:'s|'re|'ll| is| are| was| were| will be)\b/g,
  // "won't be X. It'll be Y."
  /\bwon'?t be [^.!?\n]{2,60}[.!?]\s+(?:It|They|That|This)(?:'ll| will)\b/gi,
  // "stops being X and starts being Y"
  /\bstops? being [^.!?\n]{2,60} and starts? being\b/gi,
];

function findSnaps(text: string): string[] {
  const hits: { index: number; snippet: string }[] = [];
  for (const pattern of SNAP_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      hits.push({ index: match.index ?? 0, snippet: match[0].trim() });
    }
  }
  // De-overlap: two patterns can match the same construction.
  hits.sort((a, b) => a.index - b.index);
  const out: { index: number; snippet: string }[] = [];
  for (const hit of hits) {
    const last = out[out.length - 1];
    if (last && hit.index < last.index + last.snippet.length) continue;
    out.push(hit);
  }
  return out.map((h) => h.snippet);
}

function sentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s));
}

function findRuleOfThree(text: string): string[] {
  const hits: string[] = [];
  const sents = sentences(text);
  // Three consecutive short fragments presented as sentences.
  for (let i = 0; i + 2 < sents.length; i++) {
    const trio = sents.slice(i, i + 3);
    if (trio.every((s) => s.split(/\s+/).length <= 4)) {
      hits.push(trio.join(' '));
      i += 2;
    }
  }
  // A tidy triad of short parallel items closing a sentence: "x y, x y, (and) x y."
  const item = String.raw`[\w'’]+(?:\s+[\w'’]+){0,2}`;
  const triad = new RegExp(String.raw`(?:^|[:;.!?]\s*)(${item}),\s+(${item}),\s+(?:and\s+)?(${item})[.!?]`, 'gm');
  for (const match of stripListLines(text).matchAll(triad)) {
    const items = [match[1], match[2], match[3]];
    if (items.every((it) => it.split(/\s+/).length <= 3)) hits.push(match[0].trim());
  }
  return hits;
}

/** Bulleted/numbered lists are legitimate lists; the tell is triads hidden in prose. */
function stripListLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*([-*+]|\d+\.)\s/.test(line))
    .join('\n');
}

function metronome(text: string): { flagged: boolean; stdev: number } {
  const lengths = sentences(text).map((s) => s.split(/\s+/).length);
  if (lengths.length < 6) return { flagged: false, stdev: 0 };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const stdev = Math.sqrt(variance);
  return { flagged: stdev < 3 && mean >= 5 && mean <= 20, stdev: Number(stdev.toFixed(2)) };
}

const ROLE_WORDS = new Set([
  'founder', 'cofounder', 'operator', 'investor', 'builder', 'maker', 'engineer',
  'designer', 'marketer', 'writer', 'creator', 'advisor', 'exec', 'executive',
  'ceo', 'cto', 'cpo', 'coach', 'author', 'speaker', 'strategist', 'leader',
]);

function findCredentialStacks(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\b[a-z]+(?:-[a-z]+){2,}\b/gi)) {
    const parts = match[0].toLowerCase().split('-');
    const roles = parts.filter((p) => ROLE_WORDS.has(p)).length;
    if (roles >= 2) out.push(match[0]);
  }
  return out;
}

export function sweep(text: string, opts: { bannedPhrases?: string[] } = {}): SweepResult {
  const prose = stripCode(text);
  const lower = prose.toLowerCase();
  const bannedHits = (opts.bannedPhrases ?? [])
    .filter((phrase) => lower.includes(phrase.toLowerCase()))
    .map((phrase) => phrase.toLowerCase());
  return {
    emDashes: (prose.match(/—/g) ?? []).length,
    contrastSnaps: findSnaps(prose),
    hashtags: (prose.match(/(?<=^|\s)#[A-Za-z]\w*/gm) ?? []).length,
    ruleOfThree: findRuleOfThree(prose),
    metronome: metronome(prose),
    bannedHits,
    credentialStacks: findCredentialStacks(prose),
  };
}
