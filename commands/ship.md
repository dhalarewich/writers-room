---
description: "Publish a ready card: capture your hand-edits as voice memory, move to published, log analytics later. Usage: /ship <card-id> | /ship --analytics [card-id]"
---

# /ship — the operator's gate

Agent budget: 0 subagents. Shipping is deterministic; this command is ceremony around `wr ship`.

## Publish mode (default)

1. The card must be in `5-ready/` — if not, stop; the move to ready is the pipeline's job, and the move OUT of ready is exactly what's happening now, by the operator's word only.
2. Show the operator a one-screen recap before the act: title, channel, gate states, the Editor's Bet, and `wr sweep <id>` counts. If any gate is not `passed`, say so plainly and stop unless the operator explicitly overrides (record the override in the Dossier `### Shipped` section).
3. **Ask the one question that keeps the voice loop alive:** "Is the card text exactly what went (or is going) live? If you polished it on the platform, paste the final version now — or say `as-is`." If they paste text: replace the card's piece (everything above the `***` Dossier separator, frontmatter untouched) with the pasted version, verbatim — do not fix, trim, or improve it; it is ground truth. If they say as-is, continue.
4. `wr ship <id>`. The tool diffs agent-final against the card as it stands now — with paste-back, that diff IS your hand-edits, the single highest-signal voice data this system collects.
5. If the diff exists, say one line: how many changed hunks, and that `/learn` will mine it. Do not mine it now — shipping should feel like shipping, not like a review.
6. Remind once: paste the piece to the actual channel yourself — this studio never posts anywhere. (Already posted? Then step 3 covered it and you're done.)

## Analytics mode (`--analytics`)

For a `6-published/` card (default: most recently shipped without an analytics entry). Ask for the numbers conversationally, one line ("views / likes / comments / saves / shares — whatever the channel gives you"), or parse an `analytics: views=2300 likes=84 …` line from `## Notes`. Then:

- Append a dated entry to `memory/performance.md`: card id, channel, the numbers, and the Editor's Bet verbatim next to what actually happened.
- Judge against `vault/strategy.md`'s thresholds: add `winner` or `dud` to the card's `tags` (neither if thresholds are missing or the result is mid — degrade gracefully, never crash the ritual over a missing config).
- One observation, max: if the Bet was wrong in an instructive way, note it in the performance entry. Calibration lives in the log, not in a lecture.
