"""Bước 1: tải font (google/fonts, sparse checkout qua git) và dựng font tĩnh + 4 ô logo 512px.
Dùng: python3 docs/phim/1_chuan_bi.py"""
import os, re, subprocess
from chung import BUILD, REPO
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from playwright.sync_api import sync_playwright
os.makedirs(os.path.join(BUILD, 'tex'), exist_ok=True)
gf = os.path.join(BUILD, 'gfonts')
if not os.path.isdir(gf):
    subprocess.run(['git', 'clone', '-q', '--depth', '1', '--filter=blob:none', '--sparse', 'https://github.com/google/fonts', gf], check=True)
    subprocess.run(['git', '-C', gf, 'sparse-checkout', 'set', 'ofl/baloo2', 'ofl/bevietnampro', 'ofl/geist', 'ofl/newsreader'], check=True)
ofl = os.path.join(gf, 'ofl')
# Tiêu đề màn cuối: Geist 500. Đuôi in nghiêng: Instrument Serif không có dấu tiếng Việt (ơ, ư, ả…) nên dùng Newsreader Italic (opsz 72).
f = TTFont(os.path.join(ofl, 'geist/Geist[wght].ttf')); instancer.instantiateVariableFont(f, {'wght': 500}, inplace=True)
f.save(os.path.join(BUILD, 'tex/Geist-500.ttf'))
f = TTFont(os.path.join(ofl, 'newsreader/Newsreader-Italic[opsz,wght].ttf')); instancer.instantiateVariableFont(f, {'opsz': 72, 'wght': 400}, inplace=True)
f.save(os.path.join(BUILD, 'tex/Newsreader-Italic-72.ttf'))
# 4 ô logo (màu nền khác nhau) từ icons/favicon.svg
fav = open(os.path.join(REPO, 'icons/favicon.svg'), encoding='utf-8').read().strip()
MAU = {'navy': ('#1B3A6B', '#E8A317'), 'chili': ('#C8321E', '#E8A317'), 'leaf': ('#2F6B3A', '#E8A317'), 'turmeric': ('#E8A317', '#1B3A6B')}
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 512, 'height': 512})
    for k, (bg, sun) in MAU.items():
        s = fav.replace('fill="#1B3A6B"/>', f'fill="{bg}"/>', 1).replace('r="86" fill="#E8A317"', f'r="86" fill="{sun}"')
        s = re.sub(r'<svg [^>]*>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="512" height="512">', s, count=1)
        p.set_content(f'<html><body style="margin:0;background:transparent">{s}</body></html>')
        p.screenshot(path=os.path.join(BUILD, f'tex/logo-{k}.png'), omit_background=True, clip={'x': 0, 'y': 0, 'width': 512, 'height': 512})
    b.close()
print('xong bước 1')
