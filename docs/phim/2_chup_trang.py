"""Bước 2: chụp trang giới thiệu ở 1440px, DSF 2: nền toàn trang (ẩn mảnh nổi) + từng mảnh [data-layer] nền trong suốt, pad 28px,
lưu vị trí vào _build/cap/trang.json; cắt nền thành 2 tấm (giới hạn texture 8192px) ở một hàng màu đồng nhất.
Dùng: python3 docs/phim/2_chup_trang.py"""
import os, json
import numpy as np
from PIL import Image
from chung import BUILD, server, open_page
from playwright.sync_api import sync_playwright
Image.MAX_IMAGE_PIXELS = None
PAD = 28; CAP = os.path.join(BUILD, 'cap'); os.makedirs(os.path.join(CAP, 'lop'), exist_ok=True)
server()
with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = open_page(b, 1440, 900, 2)
    H = p.evaluate('document.documentElement.scrollHeight')
    for y in range(0, H, 600): p.evaluate(f'scrollTo(0,{y})'); p.wait_for_timeout(60)   # cuộn hết trang một lần cho ảnh lazy tải
    p.evaluate('scrollTo(0,0)')
    p.wait_for_function("[...document.images].every(i => i.complete && i.naturalWidth > 0)", timeout=20000)
    p.evaluate('document.fonts.ready'); p.wait_for_timeout(400)
    H = p.evaluate('document.documentElement.scrollHeight')
    lop = p.evaluate("""() => [...document.querySelectorAll('[data-layer]')].map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        return {name: e.dataset.layer, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, radius: parseFloat(cs.borderTopLeftRadius) || 0} })""")
    st = p.add_style_tag(content='[data-layer]{visibility:hidden!important}')
    p.screenshot(path=os.path.join(CAP, 'nen.png'), full_page=True)
    p.evaluate('s => s.remove()', st)
    p.add_style_tag(content='html,body{background:transparent!important} *{box-shadow:none!important} body *{visibility:hidden!important}')
    for L in lop:
        x0, y0 = int(L['x']) - PAD, int(L['y']) - PAD
        x1, y1 = int(-(-(L['x'] + L['w']) // 1)) + PAD, int(-(-(L['y'] + L['h']) // 1)) + PAD
        L.update(ix=x0, iy=y0, iw=x1 - x0, ih=y1 - y0, file=f"lop/{L['name']}.png")
        sel = f'[data-layer="{L["name"]}"]'
        s2 = p.add_style_tag(content=f'{sel}, {sel} *{{visibility:visible!important}}')
        p.screenshot(path=os.path.join(CAP, L['file']), full_page=True, omit_background=True, clip={'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0})
        p.evaluate('s => s.remove()', s2)
    sec = p.evaluate("""() => [...document.querySelectorAll('header.nav, section, footer, h1, h2')].map(s => { const r = s.getBoundingClientRect();
        return {tag: s.tagName.toLowerCase(), cls: s.className, text: s.tagName[0] === 'H' ? s.textContent.slice(0, 40) : '', y: r.top + scrollY, h: r.height} })""")
    b.close()
im = Image.open(os.path.join(CAP, 'nen.png')).convert('RGB'); a = np.asarray(im); H2 = a.shape[0]; mid = H2 // 2; split = None
for d in range(0, 2000, 2):
    for y in (mid - d, mid + d):
        if (a[y - 6:y + 6] == a[y, 0]).all(): split = y; break
    if split: break
assert split and split % 2 == 0, 'không tìm được hàng đồng màu để cắt nền'
os.makedirs(os.path.join(BUILD, 'tex'), exist_ok=True)
im.crop((0, 0, 2880, split)).save(os.path.join(BUILD, 'tex/nen-0.png')); im.crop((0, split, 2880, H2)).save(os.path.join(BUILD, 'tex/nen-1.png'))
json.dump({'W': 1440, 'H': H, 'dsf': 2, 'pad': PAD, 'split': split // 2, 'layers': lop, 'sections': sec}, open(os.path.join(CAP, 'trang.json'), 'w'), ensure_ascii=False, indent=1)
print('xong bước 2: trang cao', H, 'px,', len(lop), 'mảnh nổi, cắt nền ở', split // 2)
