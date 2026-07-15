# Eval results — does the lineup earn its contexts?

2026-07-12. The agent-lineup decision in this repo is backed by this run, not by vibes. Method and numbers below; raw outputs and per-case judgments live in the operator's studio (`eval/`), which is private.

## Question

Does the multi-context production chain (Writer → Editor → Warden, plus gates) beat one well-prompted solo agent with identical context on voice fidelity and quality?

## Method

- **Cases:** 5 seeds reverse-engineered from the operator's real published pieces (topic, angle, verified specifics — no published prose). All LinkedIn-register, matching the operator's actual channel mix to date.
- **Identical evidence:** both configs receive the same pre-verified fact brief inside the seed, isolating the production-process question from research luck.
- **Identical context:** style DNA, banned patterns (with ceilings), the live learnings ledger, and bio — the same files the runtime agents load.
- **Configs:** `lineup` = three sequential opus calls (Writer draft → Editor cut → Warden de-slop). `solo` = one opus call instructed to draft, self-edit, and de-slop.
- **Scoring, two layers:** mechanical tells counted by `wr sweep` (deterministic code: contrast-snaps, em dashes, rule-of-three, metronome, banned phrases); and a blind judge (the runtime Warden prompt) scoring both pieces per case against the *actual published reference*, with per-case A/B order set by a hash of the case name. The judge never knows which config produced which piece.

## Results

| | voice fidelity | specificity | hook | restraint | overall | more-like-the-author | mechanical tells (5 pieces) |
|---|---|---|---|---|---|---|---|
| **lineup** | **8.2** | 8.2 | 8.0 | **8.2** | 8.0 | **3/5** | **2** |
| **solo** | 8.0 | 8.2 | **8.2** | 7.6 | 8.0 | 2/5 | 5 |

## The incident worth more than the averages

On the first pass, one lineup piece scored 4/10 — because the Warden **leaked its QA narration into the artifact** ("This piece is already clean. I ran the full sweep: …" followed by the actual post). The blind judge caught it immediately. This is a failure mode solo generation structurally cannot have: relays can leak stage scaffolding into the work.

We fixed it the way this project fixes things — mechanically, not with hope: `runWarden` now detects report-shaped openings and retries once with a hardened output contract (`looksLikeMetaLeak` in `src/eval/run.ts`). The pre-fix report is preserved in the studio (`eval/pre-fix/`). Post-fix, the same case re-judged clean (8/7 lineup vs 9/9 solo; solo still won that case on the merits).

## Reading the numbers honestly

- **Draft quality is parity.** A well-prompted solo agent with the full vault in context writes essentially as well as the Writer→Editor relay. The judge's case notes repeatedly dinged the lineup for *over-engineering* (a too-crafted close, a stacked rhetorical ending) — the editor stage can polish past the voice.
- **The measurable, repeatable edge is the independent ear**: restraint +0.6 and 2 vs 5 mechanical tells. The Warden as a fresh context, with counts computed by code, is what keeps slop at zero — which is the entire brand promise of this system.
- **Head-to-head 3–2 for the lineup** is a lean, not a landslide, at n=5.

## Decision

**Keep the lineup for the production path; spend contexts where the data says they pay.** Specifically:

1. The **Warden stays, always, on final combined text** — it is the cheapest context in the chain and carries the largest measured effect (restraint + tells).
2. **Writer → Editor stays as the default**, with a note in the Editor's prompt already warning against polishing past the voice; the judge's specific over-engineering catches (engineered closes, list-shaped prose) were folded into awareness here.
3. **Solo-parity is a feature, not a threat**: `/muse --cowrite` and any future fast path can use single-context generation without quality panic, as long as the Warden still runs.

## Limitations, stated plainly

n=5; one judge (blinded, but same model family as the writers — self-preference can't be fully excluded); one channel register; and the early generation waves were executed by session subagents rather than the CLI runner (identical prompts and model tier — the CLI was unauthenticated until mid-run). Re-run with `wr eval run && wr eval score && wr eval report` at n≥20 once more pieces ship; the harness is idempotent and the judge is the runtime voice gate, so this eval doubles as gate calibration.
