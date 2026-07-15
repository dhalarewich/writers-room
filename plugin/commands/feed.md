---
description: "Stock the inbox from signal sources, then split and score. Usage: /feed [--rss --mine --gap --backlog --theme --kb --provoke] [--top N] [--skip-split]"
---

# /feed — entry point: autonomous + provocation

Keeps the inbox from ever being the reason nothing ships. Agent budget: 3 subagents.

## Step 0

`wr board --json`. Read `studio.yml` (feeds list). If the operator left forward direction in chat or on inbox cards, carry it to the Scout.

## Step 1 — source

Dispatch `scout` (mode 1) with the requested sources — no source flags means all that are viable (`rss` needs feeds in `studio.yml`; `mine` needs published cards; skip non-viable sources silently and say so in the report). Pass `--top N` as the card budget. Include `provoke` by default: one good provocation per run beats five mild angles — but zero manufactured tensions.

If the session is interactive and the inbox was empty when the run started, offer — once, in one line — to switch to `/muse` instead: live material beats mined material when the operator is actually present. Their call; never auto-launch the interview.

## Step 2 — split and score (unless `--skip-split`)

Dispatch `scout` (mode 2) over unprocessed inbox captures (oldest first; skip captures under ~30 characters of substance). Then dispatch `critic` (mode 1) over the unscored `1-ideas` cards. Processed captures stay in `0-inbox` with their `### Spawned` section — list them in the report as "processed, safe to archive." The operator archives their own raw material; you never do.

## Step 3 — report

`wr board`. Then, tightly: cards created per source · skipped-and-why (dedup hits, non-viable sources) · the ranked new ideas with the Critic's honest lines · any provocation, quoted, with its two sources — and the suggestion to open it with `/muse`.
