---
description: "Open the read-only web board in a browser. Usage: /board [--port 4614]"
---

# /board — the wall

Agent budget: 0 subagents. This is ceremony around `wr serve`; keep it fast.

The board is a read-only web view of the studio — columns by stage, cards with scores and gate dots, refreshes every 5s. Good as the first thing up when a session starts.

1. Pick the port: `--port N` if given, else `4614`.
2. If something already answers on that port (`curl -sf -o /dev/null http://localhost:PORT`), skip straight to step 4 — a board is already up.
3. Otherwise start it detached so the terminal stays free: `wr serve --port PORT &`. Give it a beat, then confirm it's listening.
4. Open it: `open http://localhost:PORT` (darwin). Report the URL either way — the operator may want it in the desktop browser pane instead.

Don't foreground `wr serve` — it blocks until ctrl-c and swallows the session. If the studio can't be found, that's `requireStudio` failing; tell the operator to run from a studio folder.
