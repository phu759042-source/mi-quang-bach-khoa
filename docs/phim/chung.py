"""Phần dùng chung cho các bước dựng phim giới thiệu (docs/phim).
Máy chủ tĩnh phục vụ thư mục gốc của repo; trang giới thiệu ở /gioi-thieu/, trang phim ở /docs/phim/film/,
mọi thứ sinh ra (font, ảnh chụp, texture, video) nằm trong docs/phim/_build (không đưa vào git)."""
import os, sys, subprocess, time, atexit, socket
PHIM = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(PHIM, '..', '..'))
BUILD = os.path.join(PHIM, '_build')
PORT = int(os.environ.get('PHIM_PORT', '8790'))
BASE = f'http://localhost:{PORT}'
GF = '/docs/phim/_build/gfonts/ofl/'          # google/fonts (sparse checkout ở bước 1)
# Chromium phần mềm (SwiftShader). Máy có GPU thật: đặt PHIM_GPU=1 để dùng card đồ hoạ (Windows: --use-angle=d3d11)
ARGS = (['--enable-gpu', '--ignore-gpu-blocklist'] + (['--use-angle=d3d11'] if sys.platform == 'win32' else [])
        if os.environ.get('PHIM_GPU') else ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

def server():
    try:
        socket.create_connection(('localhost', PORT), timeout=.5).close(); return None
    except OSError:
        p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', REPO], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        atexit.register(p.terminate); time.sleep(1); return p

def font_css():
    s = f"@font-face{{font-family:'Baloo 2';src:url({BASE}{GF}baloo2/Baloo2[wght].ttf) format('truetype');font-weight:400 800}}\n"
    for n, w in [('Regular', 400), ('Medium', 500), ('SemiBold', 600), ('Bold', 700), ('ExtraBold', 800)]:
        s += f"@font-face{{font-family:'Be Vietnam Pro';src:url({BASE}{GF}bevietnampro/BeVietnamPro-{n}.ttf);font-weight:{w}}}\n"
    return s

def route(r):
    """chỉ cho tải từ máy; Google Fonts thay bằng font đã tải về (máy dựng có thể không vào được mạng ngoài)."""
    u = r.request.url
    if u.startswith(BASE + '/'): return r.continue_()
    if 'fonts.googleapis.com' in u: return r.fulfill(status=200, content_type='text/css', body=font_css())
    return r.abort()

def open_page(b, w=1440, h=900, dsf=1, scheme='light'):
    """mở trang giới thiệu với font thật."""
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, color_scheme=scheme, locale='vi-VN')
    ctx.route('**/*', route)
    p = ctx.new_page(); p.on('pageerror', lambda e: print('  LỖI JS', e))
    p.goto(BASE + '/gioi-thieu/index.html'); p.wait_for_load_state('networkidle'); p.evaluate('document.fonts.ready'); p.wait_for_timeout(300)
    return p

def open_film(pw):
    """mở trang phim (WebGL2), đợi tải xong texture và font."""
    server()
    b = pw.chromium.launch(args=ARGS)
    p = b.new_page(viewport={'width': 1440, 'height': 1152})
    p.on('console', lambda m: print('  [console]', m.type, m.text[:300]) if m.type == 'error' else None)
    p.on('pageerror', lambda e: print('  [pageerror]', e))
    p.goto(f'{BASE}/docs/phim/film/index.html?v={time.time()}')
    p.wait_for_function('window.FILM && (window.FILM.ready || window.FILM.error)', timeout=180000)
    err = p.evaluate('window.FILM.error')
    if err: raise RuntimeError(err)
    return b, p
