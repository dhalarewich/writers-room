import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Studio } from '../core/types.js';
import type { CaseScore } from './score.js';

function mech(score: CaseScore, which: 'solo' | 'lineup'): string {
  const m = score.mechanical[which];
  return `${m.contrastSnaps.length}sn ${m.emDashes}em ${m.ruleOfThree.length}r3${m.metronome.flagged ? ' MET' : ''}${m.bannedHits.length ? ` ${m.bannedHits.length}ban` : ''}`;
}

export function buildReport(studio: Studio): string {
  const scores = JSON.parse(
    readFileSync(join(studio.root, 'eval', 'scores.json'), 'utf8'),
  ) as CaseScore[];
  const judged = scores.filter((s) => s.judgment);
  const axes = ['voice_fidelity', 'specificity', 'hook', 'restraint', 'overall'];

  const avg = (which: 'solo' | 'lineup', axis: string) => {
    const values = judged.map((s) => s.judgment!.axes[which]?.[axis]).filter((v) => typeof v === 'number');
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '—';
  };
  const wins = (which: 'solo' | 'lineup') => judged.filter((s) => s.judgment!.moreLikeAuthor === which).length;
  const mechTotal = (which: 'solo' | 'lineup') =>
    scores.reduce(
      (n, s) => n + s.mechanical[which].contrastSnaps.length + s.mechanical[which].emDashes + s.mechanical[which].ruleOfThree.length + s.mechanical[which].bannedHits.length,
      0,
    );

  const lines: string[] = [
    '# Eval report — lineup vs solo',
    '',
    `${scores.length} cases · blind judge · mechanical counts from \`wr sweep\` (sn=contrast-snaps, em=em dashes, r3=rule-of-three, MET=metronome, ban=banned phrases)`,
    '',
    '## Aggregates',
    '',
    `| | ${axes.join(' | ')} | "more like the author" | mechanical tells (total) |`,
    `|---|${axes.map(() => '---').join('|')}|---|---|`,
    `| **lineup** | ${axes.map((a) => avg('lineup', a)).join(' | ')} | ${wins('lineup')}/${judged.length} | ${mechTotal('lineup')} |`,
    `| **solo** | ${axes.map((a) => avg('solo', a)).join(' | ')} | ${wins('solo')}/${judged.length} | ${mechTotal('solo')} |`,
    '',
    `Ties: ${judged.filter((s) => s.judgment!.moreLikeAuthor === 'tie').length}`,
    '',
    '## Per case',
    '',
    '| case | lineup vf/overall | solo vf/overall | more-like-author | lineup mech | solo mech |',
    '|---|---|---|---|---|---|',
  ];
  for (const s of scores) {
    const j = s.judgment;
    lines.push(
      `| ${s.case} | ${j ? `${j.axes.lineup.voice_fidelity}/${j.axes.lineup.overall}` : '—'} | ${j ? `${j.axes.solo.voice_fidelity}/${j.axes.solo.overall}` : '—'} | ${j?.moreLikeAuthor ?? '—'} | ${mech(s, 'lineup')} | ${mech(s, 'solo')} |`,
    );
  }
  lines.push('', '## Judge rationales', '');
  for (const s of judged) {
    lines.push(`- **${s.case}**: ${s.judgment!.rationale}`);
  }
  lines.push('', '## Verdict', '', '_(written by the operator or the room after reading the numbers)_', '');
  const report = lines.join('\n');
  writeFileSync(join(studio.root, 'eval', 'REPORT.md'), report);
  return report;
}
