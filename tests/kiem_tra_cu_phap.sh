#!/usr/bin/env bash
# Kiểm tra cú pháp JavaScript trong index.html và sw.js (cần Node.js).
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
python3 - "$TMP/game.js" <<'PY'
import re, sys
s = open('index.html', encoding='utf-8').read()
open(sys.argv[1], 'w', encoding='utf-8').write('\n;\n'.join(re.findall(r'<script>(.*?)</script>', s, re.S)))
PY
node --check "$TMP/game.js" && echo "OK index.html"
node --check sw.js && echo "OK sw.js"
