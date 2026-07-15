import React, { useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdin } from 'ink';
import { listCards } from '../core/board.js';
import { moveCard } from '../core/board.js';
import { writeStatus } from '../core/status.js';
import { palette } from '../core/theme.js';
import type { Card, Stage, Studio } from '../core/types.js';
import { GATE_NAMES, STAGES } from '../core/types.js';

const STAGE_LABELS: Record<Stage, string> = {
  inbox: 'inbox',
  ideas: 'ideas',
  approved: 'approved',
  drafting: 'drafting',
  editing: 'editing',
  ready: 'ready',
  published: 'published',
};

function GateGlyphs({ card }: { card: Card }) {
  return (
    <>
      {GATE_NAMES.map((name) => {
        const state = card.meta.gates[name];
        const glyph = state === 'passed' ? '✓' : state === 'blocked' ? '✕' : state === 'n/a' ? '·' : '○';
        const color = state === 'passed' ? palette.ok : state === 'blocked' ? palette.block : palette.dim;
        return (
          <Text key={name} color={color}>
            {glyph}
          </Text>
        );
      })}
    </>
  );
}

function CardRow({ card, selected }: { card: Card; selected: boolean }) {
  return (
    <Box>
      <Text color={selected ? palette.copperBright : palette.dim}>{selected ? '▸ ' : '  '}</Text>
      <Text color={palette.ink} bold={selected}>
        {card.meta.id}
      </Text>
      <Text color={palette.warn}> {card.meta.score != null ? String(card.meta.score).padStart(3) : '  ·'} </Text>
      <GateGlyphs card={card} />
      <Text color={selected ? palette.ink : palette.dim}>
        {' '}
        {card.meta.title.slice(0, 46)}
        {card.meta.pinned ? ' ⚲' : ''}
      </Text>
      {card.meta.needs.length > 0 && <Text color={palette.block}> ⚠</Text>}
    </Box>
  );
}

function Peek({ card }: { card: Card }) {
  const lines = card.body.split('\n').slice(0, 24);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={palette.copper} paddingX={1} width={64}>
      <Text color={palette.copperBright} bold>
        {card.meta.id} · {card.meta.title}
      </Text>
      <Text color={palette.dim}>
        {card.meta.channel.join(',') || '—'} · {card.meta.pillar ?? 'no pillar'} · gates{' '}
        {GATE_NAMES.map((g) => `${g}:${card.meta.gates[g]}`).join(' ')}
      </Text>
      <Text> </Text>
      {lines.map((line, i) => (
        <Text key={i} color={palette.ink} wrap="truncate">
          {line || ' '}
        </Text>
      ))}
      {card.body.split('\n').length > 24 && <Text color={palette.dim}>… (open the file for the rest)</Text>}
    </Box>
  );
}

function App({ studio }: { studio: Studio }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const [refresh, setRefresh] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [peek, setPeek] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [message, setMessage] = useState('');

  const cards = useMemo(() => listCards(studio), [studio, refresh]);
  const byStage = useMemo(() => {
    const map = new Map<Stage, Card[]>();
    for (const stage of STAGES) map.set(stage, cards.filter((c) => c.stage === stage));
    return map;
  }, [cards]);

  const stage = STAGES[stageIdx];
  const column = byStage.get(stage) ?? [];
  const selected = column[Math.min(cardIdx, Math.max(column.length - 1, 0))];

  useInput(
    (input, key) => {
    setMessage('');
    if (moveMode) {
      const n = Number.parseInt(input, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 6 && selected) {
        try {
          moveCard(studio, selected.meta.id, STAGES[n]);
          writeStatus(studio);
          setRefresh((r) => r + 1);
          setMessage(`${selected.meta.id} → ${STAGES[n]}`);
        } catch (error) {
          setMessage((error as Error).message);
        }
      }
      setMoveMode(false);
      return;
    }
    if (input === 'q') exit();
    else if (input === 'h' || key.leftArrow) {
      setStageIdx((i) => Math.max(0, i - 1));
      setCardIdx(0);
    } else if (input === 'l' || key.rightArrow) {
      setStageIdx((i) => Math.min(STAGES.length - 1, i + 1));
      setCardIdx(0);
    } else if (input === 'j' || key.downArrow) setCardIdx((i) => Math.min(column.length - 1, i + 1));
    else if (input === 'k' || key.upArrow) setCardIdx((i) => Math.max(0, i - 1));
    else if (key.return) setPeek((p) => !p);
    else if (input === 'm' && selected) setMoveMode(true);
    else if (input === 'r') setRefresh((r) => r + 1);
    },
    { isActive: isRawModeSupported === true },
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={palette.copperBright} bold>
          ◈ {studio.config.name}
        </Text>
        <Text color={palette.dim}>
          {'  '}
          {cards.length} cards · h/l stages · j/k cards · enter peek · m move · r refresh · q quit
        </Text>
      </Box>
      <Text> </Text>
      <Box>
        {STAGES.map((s, i) => (
          <Text key={s} color={i === stageIdx ? palette.copperBright : palette.copper} bold={i === stageIdx}>
            {i === stageIdx ? `[${STAGE_LABELS[s]} ${byStage.get(s)?.length ?? 0}]` : ` ${STAGE_LABELS[s]} ${byStage.get(s)?.length ?? 0} `}
          </Text>
        ))}
      </Box>
      <Text> </Text>
      {column.length === 0 ? (
        <Text color={palette.dim}>  (empty)</Text>
      ) : (
        column.map((card, i) => <CardRow key={card.meta.id} card={card} selected={i === Math.min(cardIdx, column.length - 1)} />)
      )}
      <Text> </Text>
      {moveMode && selected && (
        <Text color={palette.warn}>
          move {selected.meta.id} to: {STAGES.map((s, i) => `${i}=${s}`).join(' ')} (any other key cancels)
        </Text>
      )}
      {message !== '' && <Text color={palette.warn}>{message}</Text>}
      {peek && selected && <Peek card={selected} />}
    </Box>
  );
}

export function runStudioTui(studio: Studio): Promise<void> {
  const instance = render(<App studio={studio} />);
  return instance.waitUntilExit();
}
