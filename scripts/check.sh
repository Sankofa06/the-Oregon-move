#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${OREGON_CHECK_FORCE_GREP:-}" ]] && command -v rg >/dev/null 2>&1; then
  search() { rg "$@"; }
  search_fixed() { rg -F "$@"; }
else
  search() { grep -ER "$@"; }
  search_fixed() { grep -FR "$@"; }
fi

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
  .gitignore
)
for file in "${required[@]}"; do
  test -f "$file" || { echo "Missing required file: $file" >&2; exit 1; }
done

node --check landing-page/app.mjs
node --check landing-page/model.mjs
node --check landing-page/public-data.mjs
node --test scripts/model.test.mjs

scan_targets=(landing-page scripts .github/workflows README.md docs AGENTS.md WORKFORCE.md .gitignore)

absolute_pattern='/''Users/|file:''//'
if search -n "$absolute_pattern" "${scan_targets[@]}"; then
  echo "Privacy failure: absolute local path found." >&2
  exit 1
fi

if find . -type f \( -name 'oregon-move-private-*.json' -o -name 'oregon-move-*-model-*.json' \) -print -quit | grep -q .; then
  echo "Privacy failure: exported private plan file is tracked in the project tree." >&2
  exit 1
fi

if search -n -i '(<script[^>]+src="https?://|@import[[:space:]]+url|fonts\.(googleapis|gstatic))' landing-page; then
  echo "Static-site failure: remote script or font dependency found." >&2
  exit 1
fi

if search -n '\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b' landing-page; then
  echo "Privacy failure: unexpected outbound-request API found." >&2
  exit 1
fi

if search -n -i '(google-analytics|googletagmanager|segment\.com|mixpanel|amplitude|hotjar|telemetry)' landing-page; then
  echo "Privacy failure: analytics or telemetry marker found." >&2
  exit 1
fi

if search -n '(src|href)="/|url\(/' landing-page; then
  echo "Pages failure: root-relative asset URL found." >&2
  exit 1
fi

if search -n 'innerHTML|insertAdjacentHTML|document\.write' landing-page; then
  echo "Safety failure: unsafe HTML injection API found." >&2
  exit 1
fi

search -q "connect-src 'none'" landing-page/index.html
search -q 'Save this model on this device' landing-page/index.html
search -q 'Browser storage is not a vault' landing-page/index.html
search -q 'Illustrative example' landing-page/index.html
search -q 'View source on GitHub' landing-page/index.html
search -q 'My model' landing-page/index.html
search -q 'Partner model' landing-page/index.html
search -q 'region-map' landing-page/index.html
search -q 'candidate-form' landing-page/index.html
search -q 'Editable 12-month Gantt' landing-page/index.html
search_fixed -q 'oregonMove.workspace.v2.${slot}' landing-page/model.mjs
search_fixed -q 'if (!input.dataset.modelPath && !input.dataset.path) return;' landing-page/app.mjs
search_fixed -q 'byId("hide-values").addEventListener("change"' landing-page/app.mjs
search_fixed -q 'oregon-move-private-${activeWorkspace}-model-' landing-page/app.mjs
search_fixed -q 'oregon-move-private-*.json' .gitignore
search_fixed -q 'body.private-plan.hide-values input:not' landing-page/overrides.css
search_fixed -q 'byId("save-device").addEventListener("change"' landing-page/app.mjs

workflow=.github/workflows/pages.yml
for action in 'actions/checkout@v7' 'actions/configure-pages@v6' 'actions/upload-pages-artifact@v5' 'actions/deploy-pages@v5'; do
  search -q "$action" "$workflow" || { echo "Workflow failure: missing $action" >&2; exit 1; }
done
search -q 'contents: read' "$workflow"
search -q 'pages: write' "$workflow"
search -q 'id-token: write' "$workflow"
search -q 'path: landing-page' "$workflow"
search -q 'name: github-pages' "$workflow"
search -q 'group: pages' "$workflow"
search -q 'cancel-in-progress: false' "$workflow"
search -q 'persist-credentials: false' "$workflow"
if search -q 'pull_request' "$workflow"; then
  echo "Workflow failure: pull_request must not trigger this workflow." >&2
  exit 1
fi

echo "Focused site, model, privacy, and Pages checks passed."
