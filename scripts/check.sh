#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

required=(
  landing-page/index.html
  landing-page/styles.css
  landing-page/overrides.css
  landing-page/app.mjs
  landing-page/model.mjs
  landing-page/public-data.mjs
  scripts/model.test.mjs
  .github/workflows/pages.yml
)
for file in "${required[@]}"; do
  test -f "$file" || { echo "Missing required file: $file" >&2; exit 1; }
done

node --check landing-page/app.mjs
node --check landing-page/model.mjs
node --check landing-page/public-data.mjs
node --test scripts/model.test.mjs

scan_targets=(landing-page scripts .github/workflows README.md docs AGENTS.md WORKFORCE.md)

absolute_pattern='/''Users/|file:''//'
if rg -n "$absolute_pattern" "${scan_targets[@]}"; then
  echo "Privacy failure: absolute local path found." >&2
  exit 1
fi

if find . -type f -name 'oregon-move-private-plan-*.json' -print -quit | grep -q .; then
  echo "Privacy failure: exported private plan file is tracked in the project tree." >&2
  exit 1
fi

if rg -n -i '(<script[^>]+src="https?://|@import[[:space:]]+url|fonts\.(googleapis|gstatic))' landing-page; then
  echo "Static-site failure: remote script or font dependency found." >&2
  exit 1
fi

if rg -n '\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b' landing-page; then
  echo "Privacy failure: unexpected outbound-request API found." >&2
  exit 1
fi

if rg -n -i '(google-analytics|googletagmanager|segment\.com|mixpanel|amplitude|hotjar|telemetry)' landing-page; then
  echo "Privacy failure: analytics or telemetry marker found." >&2
  exit 1
fi

if rg -n '(src|href)="/|url\(/' landing-page; then
  echo "Pages failure: root-relative asset URL found." >&2
  exit 1
fi

if rg -n 'innerHTML|insertAdjacentHTML|document\.write' landing-page; then
  echo "Safety failure: unsafe HTML injection API found." >&2
  exit 1
fi

rg -q "connect-src 'none'" landing-page/index.html
rg -q 'Save on this device' landing-page/index.html
rg -q 'Browser storage is not a vault' landing-page/index.html
rg -q 'Illustrative example' landing-page/index.html
rg -q 'View source on GitHub' landing-page/index.html

workflow=.github/workflows/pages.yml
for action in 'actions/checkout@v7' 'actions/configure-pages@v6' 'actions/upload-pages-artifact@v5' 'actions/deploy-pages@v5'; do
  rg -q "$action" "$workflow" || { echo "Workflow failure: missing $action" >&2; exit 1; }
done
rg -q 'contents: read' "$workflow"
rg -q 'pages: write' "$workflow"
rg -q 'id-token: write' "$workflow"
rg -q 'path: landing-page' "$workflow"
rg -q 'name: github-pages' "$workflow"
rg -q 'group: pages' "$workflow"
rg -q 'cancel-in-progress: false' "$workflow"
rg -q 'persist-credentials: false' "$workflow"
if rg -q 'pull_request' "$workflow"; then
  echo "Workflow failure: pull_request must not trigger this workflow." >&2
  exit 1
fi

echo "Focused site, model, privacy, and Pages checks passed."
