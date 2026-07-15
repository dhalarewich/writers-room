---
description: Visual language for hero images — the prompt structure and the visual banned-patterns. Used when a piece needs art.
---

# Imagery

Model-agnostic prompt structure — every field, every time, pipe-separated:

`[subject] | [style/medium] | [composition/framing] | [color palette] | [mood/tone] | [aspect ratio] | [avoid: ...]`

Output shape by channel: linkedin = one hero 1:1 · longform = hero 16:9 plus 2–4 supporting images with `<!-- IMAGE: alt -->` insertion markers · x = one hero 16:9.

Rules: one committed style per piece, no model-specific syntax (`--ar`, `::weights`), restraint on mood words ("cinematic", "atmospheric", "dramatic" are tells), never depict the operator's face or name.

## Visual banned patterns

businessman climbing a mountain · glowing circuit-board brain · diverse team around a laptop · handshake in front of a skyline · purple-gradient AI slop.

## This studio's visual language

(Define your palette, medium, and recurring motifs here so heroes feel like one body of work.)
