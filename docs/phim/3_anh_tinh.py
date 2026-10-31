"""Bước 3: vẽ vài khung để xem trước khi render. Dùng: python3 docs/phim/3_anh_tinh.py 0,1.6,2.5,5,6.5,9.3,11"""
import os, sys, base64
from chung import BUILD, open_film
from playwright.sync_api import sync_playwright
from PIL import Image
TS = [float(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '0,1.6,2.5,5,6.5,9.3,11').split(',')]
os.makedirs(os.path.join(BUILD, 'anh'), exist_ok=True)
with sync_playwright() as pw:
    b, p = open_film(pw)
    for t in TS:
        r = p.evaluate('t => window.FILM.frame(t)', t)
        im = Image.frombytes('RGBA', (1440, 1152), base64.b64decode(r['b64'])).transpose(Image.FLIP_TOP_BOTTOM).convert('RGB')
        im.save(os.path.join(BUILD, 'anh', f'k-{t:05.2f}.png')); print('khung', t)
    b.close()
