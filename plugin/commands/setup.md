---
description: "Seed a studio with a real voice: samples in, evidence-backed voice spec out. Resumable; run once per board. Usage: /setup [dir] [--import <path>] [--from <sibling-studio-path>]"
---

# /setup — onboarding

Agent budget: 0 subagents. This is a guided conversation plus file work. It must feel like sitting down with a sharp editor on day one, not like filling in a form.

**The state machine is `wr doctor --json`.** Run it first and after every stage. It reports each asset as `ready` / `template` / `thin` / `missing` — so this command is resumable across sessions with zero memory: whatever doctor says is unfinished is where you pick up. Never re-ask for something doctor says is `ready` (offer to revisit only if the operator asks).

**Pacing rules.** One stage at a time, one question at a time. Show the doctor checklist once at the start (it is the map and the progress bar) and once at the end. Between stages, one line: what just got seeded, what's next. The whole thing runs 15–20 minutes with samples in hand; say so up front. The operator can stop anytime — doctor remembers.

## Stage 0 — the studio itself

If `wr board --json` errors: this folder has no studio. Ask for name and a 2–4 letter card prefix (offer the folder name as default), then `wr init <dir> --name <name> --prefix <px>`.

Multiple boards are just multiple folders — each with its own board, vault, and memory. If the operator already has another studio, offer `--from <path>`: copy `vault/voice/` (style-dna, banned-patterns, samples) and `vault/bio.md` from the sibling — the author's voice travels, but pillars, strategy, and feeds stay per-board. Verify copied files have no `template: true` flag; then doctor will show only the per-board stages remaining. This is the two-minute path for a second board.

Then `studio.yml`, together, two questions:
1. **Channels** they actually publish on (delete the rest — an unused channel is a lie the Writer will believe).
2. **Pillars**, named in their own words, 2–4 of them. Push back on marketing-speak: pillars gate every card and feed the rubric, so "stuff I find interesting" and "thought leadership" both fail. A good pillar names territory only this operator can hold.

Edit `studio.yml` yourself; read the result back in one line.

## Stage 1 — samples (the spine; nothing distills without them)

Ask for **3–8 pieces they consider most them** — the ones where a friend would say "this sounds exactly like you."

- Intake, either way: they paste into chat, or they drop files into `vault/voice/samples/` and say so. For pasted pieces, you write the file: `vault/voice/samples/<yyyy-mm>-<slug>.md`, frontmatter `description:` (one line: what it is, which channel) plus a `source:` line for provenance (where and when it was published).
- **Real published pieces only — not aspirations.** If they offer something "closer to how I want to sound," decline it kindly and say why: the vault describes the voice that exists; aspirations go in strategy, or they poison every downstream judgment.
- Mixed channels welcome; note each sample's register.
- Under 3 samples: stop the voice stages here, seed what else you can (bio, strategy don't need samples), and tell them exactly what to bring back. Doctor will hold the spot.

## Stage 2 — Style DNA (evidence-backed distillation)

The contract: **every rule quotes a sample.** No sample line, no rule. This is what separates a voice spec from a horoscope.

1. Read every sample in full. Run `wr sweep <sample-path>` on each and keep the counts — this is the author's *measured* baseline, not a guess.
2. Fill `vault/voice/style-dna.md` section by section (rhythm · vocabulary · hooks · transitions · stances · moves · never-does · gaps), each rule followed by its evidence quote and which sample it came from.
3. Work conversationally at the interesting spots: when two samples disagree, ask which one is "more you." When you spot a signature move (a word they lean on, a closing shape), name it and confirm — operators often don't know their own tells, and this moment is where /setup earns trust.
4. Section 8 (gaps) is honest: registers the samples don't cover, listed plainly. The Writer treads carefully there; pretending coverage is how ghostwriting goes generic.
5. Read the finished DNA back as a two-minute summary. Revise until they say "that's me." Then remove the `template: true` line from the file's frontmatter.

## Stage 3 — banned patterns (measured, then personal)

1. Ceilings from evidence: set `em_dashes` and `contrast_snaps` in the frontmatter from the sweep baselines of Stage 2 — if their real pieces use zero em dashes, the ceiling is 0/0, not the default. Show them the numbers.
2. Then ask the one question that fills the phrase list: **"What do you delete on sight — from your own drafts, or from AI text pretending to be you?"** Every answer goes into `banned_phrases` (machine-enforced by `wr sweep` forever after — tell them that; it's the best moment in onboarding).
3. Walk the shipped structural bans in one breath (snaps, tidy lists, metronome, hype openers, engagement bait); adjust only what they push on. Remove the template flag.

## Stage 4 — bio (five minutes, facts only)

Interview, don't lecture: identity · current and prior ventures · exits with exact acquirers and dates · expertise · **expertise they must NOT claim** · then the question that produces the gold: **"What has AI or the press gotten wrong about you before?"** — every answer becomes a "Known mistakes to never claim" entry, the Fact-Checker's strongest guardrails. Remove the template flag.

## Stage 5 — strategy

Three questions, their words: what should this body of work earn you in 18 months (north star) · who is it for, ranked (audiences — and warn: a piece serving every audience serves none) · what does winning look like per channel (the thresholds `/ship --analytics` will judge by; rough numbers fine, recalibrate later). One line per pillar on what belongs inside it. Remove the template flag.

## Stage 6 — rubric

Default five criteria (specificity 30 · strategic value 25 · audience fit 20 · novelty 15 · urgency 10) with the calibration ladder. Ask one question: "Reweight anything?" Most say no — good, move on. Remove the template flag.

## Finish

`wr index` · `wr check` · `wr doctor` — the checklist should be green (feeds may stay `thin`; offer to add RSS URLs now or never). Show the doctor output. Then the sixty-second tour, concretely on THEIR studio:

> Drop thoughts in `board/0-inbox/` or run `/feed` to stock it. `/muse` when you have half a thought worth digging out. `/write` runs approved cards through drafting, editing, and three gates. You edit anything in `5-ready/` by hand — then `/ship`, and the diff between what the agents wrote and what you shipped becomes voice memory via `/learn`. The system gets more you every time you correct it.

First-run suggestion: pick one idea they already have, run it through `/muse` seed-depth right now, and leave them with a scored card on the board — an onboarding that ends with inventory beats one that ends with configuration.

## `--import <path>` — migrating from the hosted Writers Room

Map a Kan-era export onto the studio (ask before overwriting anything the doctor shows as `ready`):

| old | new |
|---|---|
| voice card / Style-DNA source-of-record | `vault/voice/style-dna.md` |
| samples file(s) | `vault/voice/samples/` |
| bio card | `vault/bio.md` |
| banned-patterns card | `vault/voice/banned-patterns.md` (phrases into the frontmatter list) |
| rubric card | `vault/rubric.md` |
| strategy card | `vault/strategy.md` (thresholds table included) |
| learnings card | `memory/learnings.md` (entries verbatim, format-converted) |
| performance-log card | `memory/performance.md` |
| config card (min-score, max-per-run) | `studio.yml` thresholds |
| feeds card | `studio.yml` feeds |
| knowledge corpus folders | `vault/knowledge/<topic>/` |
| live board cards (if exported) | matching `board/` stage dirs via `wr new` + `wr move` |

Remove `template: true` from every file the import fills. Finish with `wr check`, `wr index`, and `wr doctor` — all green.
