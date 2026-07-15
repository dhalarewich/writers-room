---
description: "Close the feedback loop: classify pushback, re-run the responsible stage, mine ship-time edit diffs into voice memory. Usage: /learn [card-id] [--fold]"
---

# /learn — the voice memory loop

Agent budget: 2 subagents (the one re-run stage; plus warden if text changed).

## Step 1 — gather the unprocessed signal

- **Stated pushback:** `## Notes` entries and chat feedback on the named card (no card given: scan `wr board --json` for the most recently updated cards with Notes newer than the Dossier's last section).
- **Edit diffs:** every `memory/edits/*.diff` not yet marked mined (a mined diff has a `mined: <date>` first line).

Nothing unprocessed → say so in one line and stop. No invented work.

## Step 2 — classify each pushback item

Five categories, routed to the one responsible stage:

| category | route card to | re-run |
|---|---|---|
| factual — a claim is wrong | `2-approved` | fact-checker |
| voice — sounds off, tells, not-them | `3-drafting` | writer |
| hook/close — opener, ending, share-craft weak | `4-editing` | editor |
| positioning — wrong audience, angle, pillar | `1-ideas` | scout (re-position) |
| ambiguous | no move | ask ONE clarifying question, stop |

Mixed items route to the earliest implicated stage; say what still pends. `pinned` cards: recommend the route, wait for the word. Use `wr move`, dispatch the one agent with the operator's words verbatim in its context, and if the re-run changed text that had already passed gates, re-run `warden` on the final text.

## Step 3 — mine the diffs

For each unmined diff: read it next to the shipped piece. Distill **0–3 rules**, each transferable ("never convert a measured number to a rounded one"), never draft-specific ("the tent piece needed a shorter close"). The bar: would this rule have changed a *different* piece too?

For each candidate rule: check `memory/learnings.md` for an existing equivalent (update its evidence instead of duplicating). New rules — show the operator the rule + the diff hunk that produced it, get a yes, then append in the standard entry format with the diff path as Evidence. Mark the diff mined (prepend `mined: <date>`). Zero rules from a diff is a fine outcome; say why in one line (usually: edits were content-specific, not voice-signal).

## Step 4 (`--fold`) — graduation

A rule graduates when the pipeline has tested it, not when a calendar says so. One **exposure** = one shipped piece the rule could have shaped (its Apply-to stage ran for that channel). A rule **held** through an exposure if, since the rule's date: no later ledger entry contradicts or supersedes it, and no mined diff or `## Notes` pushback re-corrected the same pattern. A re-correction resets the count to zero — that rule needs strengthening or better evidence, not graduation.

Two triggers, both computable from the ledger dates, `memory/edits/`, and the `### Shipped` dates on `6-published/` cards:

- **Exposure trigger:** a `Status: active` rule held through 3+ ships (operator override: `thresholds.fold_ships` in studio.yml).
- **Pressure trigger:** more than 15 active rules (override: `thresholds.ledger_max`). learnings.md is always-loaded working memory and should stay about a screen long — propose the oldest, most-survived rules first.

For each candidate: fold the instruction into `vault/voice/style-dna.md` or `banned-patterns.md` (phrase bans go in the frontmatter list so `wr sweep` enforces them mechanically — the best possible outcome for a rule is becoming a regex). Show the operator the rule and where it's going, get a yes, then mark the ledger entry `Status: superseded — folded into <file> <date>`. Never delete entries; the ledger is also the system's history of being wrong.

## Close

`wr check`. Report: items classified and routed · rules appended (quoted) · diffs mined · what pends on the operator. If either fold trigger fires (even on a run without `--fold`), end with one line naming the candidates and suggesting `/learn --fold`.
