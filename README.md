<div align="center">

<img src="assets/wordmark.svg" alt="Writers Room" width="416">

# AI-assisted writing that actually sounds like you.

**Writers Room is a local-first editorial studio that turns rough ideas into researched, edited drafts with independent fact, critique, and voice checks, then learns from every change you make.**

[![tests](https://img.shields.io/badge/tests-90%20passing-4c9a52)](#the-eval)
[![node](https://img.shields.io/badge/node-%3E%3D20-6aa84f)](package.json)
[![version](https://img.shields.io/badge/version-1.0.0--alpha.9-c47a3d)](https://github.com/dhalarewich/writers-room/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-D97757)](#install)
[![Codex](https://img.shields.io/badge/Codex-planned-8a7f70)](#hosts)
[![license](https://img.shields.io/badge/license-MIT-3d7dc4)](LICENSE)

[Explore the demo](#explore-the-demo-studio-in-two-minutes) · [Why it's different](#why-its-different) · [Install](#install) · [Set up](#set-up-your-first-studio) · [A week with it](#a-week-with-it) · [Under the hood](#under-the-hood) · [Eval](#the-eval)

</div>

---

**For people who publish under their own name and already use AI assistants.** Built for [Claude Code](https://claude.com/claude-code). Plain Markdown files on your own disk. No hosted backend.

Most content tools mass-produce text, then bolt a "humanizer" on the end to sand off the slop. Writers Room works the other way around: the AI drafts in your voice, checked against a voice spec distilled from pieces you actually published, and every hand-edit you make before publishing is captured as a diff and mined back into memory. Every piece teaches it more about how you actually write. If a draft doesn't read unmistakably like its author, it doesn't ship.

- **It learns from what you change, not just what you upload.** The difference between its draft and your published piece becomes evidence for the next one.
- **Grounded in writing that genuinely sounds like you.** Every voice rule quotes one of your real samples: no sample line, no rule.
- **Independent fact, critique, and voice checks.** Reviews run outside the drafting context, so they catch what a drafting agent can't reliably catch in its own work.
- **Plain Markdown, start to finish.** The board, knowledge, drafts, and memory are ordinary files you can read, grep, and back up.
- **You stay the publisher.** Ideas don't advance and pieces don't ship without an explicit decision from you.

<div align="center">

<video src="https://github.com/user-attachments/assets/64cf034a-3675-4bfd-b2a0-10c581ff978e"></video>

*From rough idea to checked draft, human edit, and a new voice rule in 60 seconds.*

</div>

## Explore the demo studio in two minutes

A complete synthetic studio ships in the repo. No voice setup, no interview.

```bash
npm i -g @dhalarewich/writers-room
git clone https://github.com/dhalarewich/writers-room
cd writers-room/fixtures/demo-studio
wr studio        # full-screen board, or `wr serve` for the web view
```

You get a real board with cards at every stage and a fictional voice already dialled in, enough to feel the interface before deciding whether to onboard your own voice.

## Why it's different

**Your pushback and edits teach it how to sound more like you.**
The final diff between its draft and your published piece becomes evidence for future work. Corrections don't evaporate, they compound.

**You can write beside it, not just review its output.**
`/muse` turns a half-formed thought into a finished piece through dialogue, and by default every sentence in that piece is one you actually said, quarried from the conversation and reordered rather than paraphrased. Writing *with* the AI instead of sitting back to approve its guesses is the most natural anti-slop pattern there is.

**Voice rules are auditable.**
Every rule points back to a real sample, edit, or correction. Nothing silently changes your voice profile. A rule only becomes permanent after it holds up across multiple published pieces and you approve it.

**Quality checks are independent.**
Fact, critique, and voice reviews run in fresh contexts, outside the one that wrote the draft. Mechanical AI tells are counted by code, not vibes.

**Your work stays legible and portable.**
The board is folders. The drafts are Markdown. The memory is an append-only ledger. No database, no lock-in, no export button because nothing was ever locked in.

**You remain the publisher.**
Two gates on the board move only by your hand: deciding what's worth drafting, and deciding what ships. Nothing automated ever crosses the second.

## Install

Prerequisites: [Claude Code](https://claude.com/claude-code) and Node 20+.

Add the plugin in Claude Code:

```
/plugin marketplace add dhalarewich/plugins
/plugin install writers-room@dhalarewich
```

Then install the `wr` CLI, which manages the local board, files, and deterministic checks:

```bash
npm i -g @dhalarewich/writers-room
```

`wr --help` lists the verbs. (To hack on the CLI itself, clone the repo and run `npm install && npm run build && npm link` instead.)

## Models and usage

Writers Room prioritizes independent checks over token efficiency. A normal `/write` run uses six model contexts per card: two Fact-Checker passes plus the Writer, Editor, Critic, and Warden. By default, the five fact/draft/edit/voice calls use Opus and the Critic uses Sonnet. `/feed` uses three Sonnet contexts.

Expect meaningful Claude Code usage for a full write. Model assignments are just the `model:` lines in `agents/*.md`; change them if you want a lighter setup. You can also run `wr eval` against the solo workflow and use fewer contexts if it performs as well for your voice.

## Set up your first studio

```bash
mkdir ~/writing/my-studio && cd ~/writing/my-studio
wr init . --name "My Studio" --prefix ms
```

Then open Claude Code in that folder and run **`/setup`**. Bring 3–8 pieces you actually published, the ones where a friend would say "this sounds exactly like you." Setup interviews you and:

- distills your **Style DNA** from the samples, where every rule must quote a sample line ("no sample line, no rule");
- **measures** your mechanical ceilings (em dashes, contrast-snaps) from your real pieces instead of guessing;
- asks "what do you delete on sight?" and turns every answer into a machine-enforced phrase ban;
- asks "what has AI gotten wrong about you before?" and turns every answer into a Fact-Checker guardrail;
- fills strategy (north star, audiences, what counts as a winner) and the scoring rubric.

It takes 15–20 minutes and is fully resumable. **`wr doctor`** shows what's seeded and what's still template, so you can stop anytime and pick up later. Writers Room will not draft in your name until voice setup is complete.

**Second board?** Every folder is its own studio. `/setup --from ~/writing/first-studio` carries your voice (style DNA, bans, samples, bio) over in two minutes; pillars, strategy, and feeds stay per-board.

## A week with it

The whole product in one loop: an idea gets scored, drafted, checked, shipped, and your hand-edits teach it something. Walkthrough on the demo studio (`fixtures/demo-studio`, prefix `fn`).

**Monday, `/feed`.** It stocks the inbox from every viable source and hands back a ranked list:

```
fn-0004  Fuel-per-boil is the spec sheet lie          81  gear-truth
  honest line: the canister log is the piece; without it this is a take
fn-0005  Buy gear for the trips you take               64  trail-craft
  honest line: needs the actual audit numbers to clear 72
```

You read both. `fn-0005` is short of the auto-promote threshold, but you've already run the trip-log audit it's asking for. Worth drafting anyway, and that call is yours to make, not the score's:

```
wr move fn-0005 approved
```

**Tuesday, `/write fn-0005`.** It runs the fact brief, draft, and edit passes and closes with the report `/write` always gives: gate states plus the Editor's Bet, a falsifiable line about how the piece will land.

```
fn-0005  Buy gear for the trips you take → 5-ready/
  gates: facts passed · critique passed · voice passed
  Editor's Bet: comments beat shares here. reads as confession, not advice
```

**Wednesday**, before anything ships, you open `board/5-ready/fn-0005-*.md` in your own editor, cut two sentences the Editor left in, then run `/ship fn-0005`: the recap, the one question that keeps the voice loop alive, and the result.

```
Buy gear for the trips you take · linkedin · facts/critique/voice: passed
Editor's Bet: comments beat shares here. reads as confession, not advice

Is the card text exactly what went (or is going) live? Paste the final
version, or say `as-is`.
> as-is

⇥ fn-0005 published
  hand edits captured → memory/edits/fn-0005.diff
  run /learn to mine them into voice memory
```

Two hunks in that diff: the two sentences you cut.

**Friday, `/learn`.** It mines the diff and appends a rule, evidence attached, to the same append-only ledger `memory/learnings.md` already holds entries like this in:

```
1 diff mined, 1 rule appended:
"Cut the hedge before the numbers. The confession lands harder cold."
```

That last line is the whole point in miniature: a concrete, evidence-backed editorial rule, learned from a decision you actually made. The next draft won't make the same mistake.

<div align="center"><img src="assets/screenshots/board.png" alt="wr board, themed terminal render of the demo studio" width="720"></div>

## Daily use

**The board flows left to right.** Every card starts in `0-inbox` and moves one column rightward until it ships. Your whole job is deciding what advances.

<div align="center"><img src="assets/diagrams/board-flow.svg" alt="board flow, two human gates: ideas to approved, ready to published" width="820"></div>

**Two of those arrows are yours alone.** Everything *between* them the pipeline drives on its own: `/write` runs a card from `approved` through the three gates to `ready`. But the two human gates never move without you, promoting `ideas → approved` and `ready → published`, and while `/write --auto` can cross the first when a score clears your threshold, nothing automated ever crosses the second.

**Moving a card is its own small act**, separate from the work a stage does. Three ways, whichever's in reach:

| To move a card | Do this | When |
|---|---|---|
| **Just ask Claude** | "move ms-7 to approved" | you're in a Claude Code session |
| **Terminal** | `wr move ms-7 approved` | you're in the shell |
| **Drag the file** | drag its `.md` between `board/` folders in Finder, or on the web board | you're looking at the board |

All three do the same thing: the card's `.md` file physically moves from one `board/` folder to the next. The folder **is** the stage, there's no other state to touch.

Five verbs in Claude Code:

| Command | What it does |
|---|---|
| `/feed` | stocks the inbox: all viable sources by default, or focus it in plain words ("just my feeds", "find gaps", "something provocative"). Sources: your published winners, RSS, pillar gaps, stale backlog, theme clusters, dormant knowledge, plus one *provocation* (a real tension between things you've said) |
| `/muse` | interactive co-writing. Talk through a half-formed thought and it digs out what you actually think (Socratic probes, Five Whys, steelman, hot-take excavation). Stop at a sharp idea card, or keep going (`--piece`) all the way to a finished draft assembled only from sentences *you* said in the conversation (`--cowrite` lifts that restriction so it writes connective prose in your voice). Writing beside it, not reviewing its guesses |
| `/write` | pipeline engine: fact brief → draft → edit → three gates → `5-ready/`. Single card, batch, `--auto` (score-threshold promotion), or `--table` (round-table treatment for high-stakes pieces) |
| `/ship` | your publish gate. Recaps gates and the Editor's bet, runs `wr ship`, which diffs the agent-final text against what you actually shipped. `--analytics` logs performance later |
| `/learn` | closes the loop: classifies your pushback, re-runs the one responsible stage, and mines your ship-time edit diffs into rules (each citing its diff as evidence) |

The rhythm: `/feed` or `/muse`, review the scored ideas, move what you believe in to `2-approved/`, `/write`, edit the piece in `5-ready/` with your own hands, `/ship`, then `/learn` when you've corrected something.

From the terminal, `wr` covers everything without a model: `wr capture "thought"` (quick capture to inbox from anywhere; `--set-default` once to make a studio the target), `wr board` (themed render), `wr studio` (full-screen TUI), `wr serve` (web board: drag cards between stages, open a card, archive, ship with paste-back; loads in Claude Code desktop's browser pane), `wr sweep <id>` (count the AI tells in any text), `wr check` (schema lint), `wr doctor` (onboarding state), `wr find` / `wr index` (vault search), `wr adopt` (turn stray notes into cards). A statusline script in `statusline/` shows live pipeline state.

The same board in the web view (`wr serve`, loads in Claude Code desktop's browser pane):

<div align="center"><img src="assets/screenshots/web-board.png" alt="wr serve, the web board in the field-station theme" width="860"></div>

## Getting things in

Capture has to be instant and judgment-free: no positioning, no scoring, no deciding if it's good. That thinking happens later, at the `/feed` split. Right now the only job is not losing the thought.

```bash
wr capture "fuel math nobody does"
```

Run it once inside a studio with `--set-default` and captures from anywhere land there, no `cd` required:

```bash
wr capture --set-default
```

It also reads stdin, and can carry its source along:

```bash
# anything that can pipe text can capture
pbpaste | wr capture -

# --url appends the link as its own trailing paragraph
wr capture "the repair math cuts both ways" --url https://example.com/thread
```

A few ways to make capture instant on whatever you carry:

- **macOS Shortcut or share sheet**: a shortcut that pipes selected text or a URL into a `wr capture` shell action, callable from anywhere the share sheet shows up.
- **Raycast script command**: bind a hotkey to a script that shells out to `wr capture "$1"`.
- **Phone**: sync the studio folder (iCloud Drive, Syncthing) and save `.md` files into `board/0-inbox/` from any notes app; `/feed` adopts and splits them like anything else.

Anything that writes a file is a capture client. No account, no API, no server.

## Under the hood

A **studio** is a folder you own. Each project folder is its own independent board:

```
my-studio/
  studio.yml            # name, channels, pillars, thresholds, feeds
  board/
    0-inbox/            # raw captures: drop .md/.txt files here from anywhere
    1-ideas/            # split, positioned, scored
    2-approved/         # you promoted it: worth drafting
    3-drafting/  4-editing/
    5-ready/            # you edit here, in your own editor, as much as you like
    6-published/
  vault/
    voice/style-dna.md        # how you write: every rule cites one of your samples
    voice/banned-patterns.md  # phrase bans + mechanical ceilings, machine-enforced
    voice/samples/            # the real pieces the spec was distilled from
    bio.md                    # facts about you: the anti-hallucination anchor
    strategy.md  rubric.md    # who it's for, what scores
    knowledge/                # your subject-matter notes, plain markdown
  memory/
    learnings.md        # append-only corrections: the voice memory
    edits/              # diffs of your hand-edits, captured at ship time
```

- **Channels**: where you publish. `linkedin`, `blog`, whatever `studio.yml` lists.
- **Pillars**: the 3–5 themes you own. `/feed` hunts gaps per pillar; the rubric scores how well a piece ladders back to one.
- **Vault**: ratified memory. Facts and rules you've signed off on: bio, strategy, rubric, style DNA, samples. Agents read it as truth; it changes only on purpose.
- **Memory**: provisional memory. A machine-written, append-only ledger, every rule citing its evidence. Rules move into the vault only after they hold up across published pieces and you sign off. Nothing drifts in silently.

<div align="center"><img src="assets/diagrams/anatomy.svg" alt="studio anatomy: channels and pillars meet in a card; vault and memory feed the draft" width="820"></div>

A card's stage **is** its folder. There is no second copy of the truth. Each card carries the working draft plus a `## Dossier`: positioning, rubric score, a per-claim fact table, the edit log, the voice-gate report, and a `Pulled` list of which vault files each stage consulted and why. Retrieval is a table of contents you can read (`vault/INDEX.md`), wiki-links, and lexical search. No embeddings, fully auditable.

The work is split across six agents by *context boundary*: the reviews that have to stay honest run in a context that never saw the draft being reviewed. That isolation, not the head-count, is the point.

| Agent | Job |
|---|---|
| Scout | mines sources, splits captures into distinct positioned ideas |
| Critic | scores against your rubric; critique gate on finished pieces, never shares the maker's context |
| Fact-Checker | bio first, vault second, web last; per-claim table with confidence tiers |
| Writer | drafts as you: voice embodiment is the whole job |
| Editor | density, hook, close; the Writer's designed adversary |
| Warden | the voice gate: tool-counted de-slop sweep + fidelity verdict, always last |

Each role runs on a fixed model chosen for its job: the Writer, Editor, Fact-Checker, and Warden run on Opus, where voice fidelity and defensibility are worth the cost; the Scout and Critic run on Sonnet. To change the split, edit the `model:` line in the matching `agents/*.md` file.

Plus the Muse, who lives in the main conversation: a Socratic interviewer that can stop at a sharp idea card, or keep going to a finished piece built only from sentences you actually said in the transcript.

Every piece passes three gates before it reaches `5-ready/`: facts, critique, voice. Nothing ever auto-publishes. `5-ready → published` is yours alone.

## The voice memory loop

Three channels feed `memory/learnings.md`:

1. **You say so**: notes on a card, classified and routed by `/learn`.
2. **Onboarding**: `/setup` distills the starting spec from published pieces.
3. **Your hands**: when a card enters `5-ready/`, the agent-final text is snapshotted; when you ship, the diff is captured and mined into rules. Rules that hold graduate into the style DNA, or become regex-enforced bans. The best fate for a correction is becoming a mechanical check.

## The eval

The six-context lineup is a hypothesis, not a belief, and the honest result is why the marketing above sells *independent checks*, not *more agents*. `wr eval` runs seed cards (reverse-engineered from real published pieces, identical pre-verified fact briefs for both sides) through the lineup and through one well-prompted solo agent, scores both mechanically (`wr sweep`) and by a blind judge against the real published references, and writes the report.

The short version: overall draft quality came out roughly even with a well-prompted solo agent. The lineup won 3–2 at `n=5`. The measurable edge wasn't better prose; it was **restraint and fewer mechanical AI tells**, from the independent voice gate and tool-counted checks. The eval also caught a real pipeline failure: the room leaking its own scaffolding into a piece. Full numbers and methodology in [docs/EVAL-RESULTS.md](docs/EVAL-RESULTS.md). Run it on your own studio; if solo ties the lineup for your voice, use fewer contexts.

## Hosts

Built as a **Claude Code** plugin today; **Codex support is planned**. The substrate is deliberately host-agnostic: the board, vault, and memory are plain markdown operated through the `wr` CLI, and every agent behavior is a markdown instruction file. Nothing in the working system depends on a specific model host except the thin packaging (`.claude-plugin/`, `skills/`, `commands/`, `agents/`).

Porting to **Codex** (or any CLI agent) means: an AGENTS.md router mirroring `skills/writers-room/SKILL.md`, custom prompts mirroring `commands/`, and running the pipeline stages as separate headless CLI calls instead of subagents. That's a pattern the eval harness already uses: each stage is an isolated call with a file-assembled prompt, which preserves the fresh-context property the gates depend on. The eval runner's engine binary is overridable via `WR_ENGINE`.

## Contributing

This is alpha, single-author, and moving fast, so expect sharp edges. Issues and PRs welcome; good first areas are the Codex port, additional capture clients, and studio themes. If you're building on the `wr` CLI, `wr --help` and the tests (`npm test`) are the fastest map of what's stable.

## What this is not

No scheduler, no multi-platform distribution, no analytics dashboards, no vector database, no growth hacks. It writes with you and protects your voice; you publish. That's the job.

## License

MIT
