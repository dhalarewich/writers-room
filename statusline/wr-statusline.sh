#!/usr/bin/env bash
# Writers Room statusline for Claude Code.
# Wire in settings.json:  "statusLine": { "type": "command", "command": "bash /path/to/wr-statusline.sh" }
# Reads the nearest studio's .wr/status.json (walking up from cwd); silent when not in a studio.

input=$(cat)
cwd=$(printf '%s' "$input" | sed -n 's/.*"current_dir"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -z "$cwd" ] && cwd=$(pwd)

dir="$cwd"
status=""
while [ "$dir" != "/" ]; do
  if [ -f "$dir/.wr/status.json" ]; then status="$dir/.wr/status.json"; break; fi
  dir=$(dirname "$dir")
done
[ -z "$status" ] && exit 0

python3 - "$status" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
c = s.get("counts", {})
parts = [f"✍ {s.get('studio','studio')}"]
order = ["inbox", "ideas", "approved", "drafting", "editing", "ready"]
short = {"inbox": "in", "ideas": "id", "approved": "ap", "drafting": "dr", "editing": "ed", "ready": "rd"}
run = [f"{short[k]} {c[k]}" for k in order if c.get(k)]
if run: parts.append(" · ".join(run))
blocked = s.get("blocked", [])
if blocked: parts.append(f"⚠ {len(blocked)} blocked")
print("  ".join(parts))
PY
