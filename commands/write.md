---
description: "Pipeline engine — approved cards through drafting, editing, and the three gates to ready. Usage: /write [card-id] [--top N] [--auto] [--table]"
---

# /write — the pipeline engine

Runs approved cards to `5-ready/`. This is the production path for pieces where the thinking is done — including ghostwriting, which is simply this engine doing its job. Agent budget: 6 subagents per card (7 with `--table`).

## Step 0 — orient and read the operator

`wr board --json`. For each card in scope, read `## Notes` and the Dossier tail for unaddressed operator words:
- **Forward direction** (addresses a stage not yet run): carry it verbatim into that stage's agent context.
- **Backward pushback** (criticizes output that exists): stop that card and point at `/learn` — don't paper over it with a re-run the operator didn't ask for.

## Step 1 — scope

- Card id given → that card (from `2-approved`, or resume mid-pipeline from `3-drafting`/`4-editing`).
- No args → every `2-approved` card, highest `score` first. `--top N` caps.
- `--auto` → first promote: `1-ideas` cards with `score >= thresholds.min_score` move to `2-approved` (whole `series` promotes together if any member clears; count all members against `thresholds.max_per_run`), then run the batch. Cards below threshold are left untouched. Announce what promoted and what didn't.
- Never touch `pinned` cards in batch mode; list them for the operator.

## Step 2–5 — per card

2. **Fact brief** — dispatch `fact-checker` (pre-draft mode). If `gates.facts` comes back `blocked`: halt this card in `2-approved` (batch: skip and log; single: surface the blocking questions and stop).
3. **Draft** — `wr move <id> drafting`, dispatch `writer`. If the draft comes back with a banned-pattern violation the writer flagged, halt here.
4. **Edit** — `wr move <id> editing`, dispatch `editor`. Sanity rule: if the edit cut more than 30% beyond target or rewrote >40%, halt for the operator — the draft and the edit are fighting.
5. **Gates** — dispatch in parallel, one message, three subagents: `fact-checker` (re-check mode), `critic` (critique gate), `warden` (voice gate — always last to *finish*; if either other gate edits text, warden re-sweeps the final combined text). All three `passed` → `wr move <id> ready`. Any `blocked` → card stays in `4-editing`, `needs: [operator]` set by the gate, blockers surfaced as the gate wrote them.

`--table` (high-stakes): between steps 4 and 5, dispatch `critic` and `editor` for parallel *takes* (Dossier comments, no edits) plus re-read by the writer, then synthesize the one change-set yourself, apply it, and continue to gates. Use when the operator says round-table, launch, flagship, or the piece defines a position.

## Step 6 — close the run

`wr check` (fix anything red). `wr board`. Report per card: stage reached, gate states, blockers with their questions, and the Editor's Bet. If any stage's context contained forward direction that proved transferable, append the rule to `memory/learnings.md` (dedupe first, cite the operator's words as evidence).

Stop rules recap (batch = skip-and-log, single = halt-and-surface): unverifiable load-bearing claim · banned-pattern draft · edit-vs-draft fight · any blocked gate. Never move anything past `5-ready/` — shipping is the operator's act, via `/ship`.
