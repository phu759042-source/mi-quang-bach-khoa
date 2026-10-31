#!/usr/bin/env bash
# Kiểm tra cú pháp JavaScript: script nhỏ trong index.html, mọi file js/*.js và sw.js (cần Node.js).
# Kiểm tra thêm: index.html nạp đủ mọi file trong js/, và mọi file đều mang cùng số phiên bản ?v= với PHIEN_BAN.
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
python3 - "$TMP/inline.js" <<'PY'
import re, sys, os
s = open('index.html', encoding='utf-8').read()
open(sys.argv[1], 'w', encoding='utf-8').write('\n;\n'.join(re.findall(r'<script>(.*?)</script>', s, re.S)))
nap = re.findall(r'<script src="(js/[^"?]+)\?v=([^"]+)"', s)
co = sorted('js/' + f for f in os.listdir('js') if f.endswith('.js'))
thieu = set(co) - {f for f, _ in nap}
if thieu: sys.exit(f'index.html chưa nạp: {sorted(thieu)}')
pb = re.search(r"PHIEN_BAN='([^']+)'", open('js/cau-hinh.js', encoding='utf-8').read()).group(1)
lech = [f for f, v in nap if v != pb] + ([] if f'css/giao-dien.css?v={pb}' in s else ['css/giao-dien.css'])
if lech: sys.exit(f'?v= khác PHIEN_BAN {pb}: {lech}')
print(f'OK index.html nạp đủ {len(nap)} file js, cùng phiên bản {pb}')
PY
node --check "$TMP/inline.js" && echo "OK script trong index.html"
# nối các file theo đúng thứ tự nạp rồi kiểm tra một lượt (bắt lỗi khai báo trùng tên giữa các file)
python3 - "$TMP/all.js" <<'PY'
import re, sys
s = open('index.html', encoding='utf-8').read()
open(sys.argv[1], 'w', encoding='utf-8').write('\n;\n'.join(open(f, encoding='utf-8').read() for f in re.findall(r'<script src="(js/[^"?]+)', s)))
PY
for f in js/*.js; do node --check "$f"; done && echo "OK từng file js/"
node --check "$TMP/all.js" && echo "OK ghép các file js/ (không trùng tên biến)"
node --check sw.js && echo "OK sw.js"
# trang dựng phim giới thiệu (docs/phim/film): các file nạp theo thứ tự, ghép lại kiểm tra một lượt
cat docs/phim/film/_timeline.js docs/phim/film/_gl.js docs/phim/film/_overlay.js docs/phim/film/_frame.js > "$TMP/phim.js"
node --check "$TMP/phim.js" && echo "OK trang dựng phim (docs/phim/film)"
