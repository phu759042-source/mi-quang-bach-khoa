"""Bước 4: render phim ra MP4 H.264. Dùng: python3 docs/phim/4_render.py [fps=60] [khung đầu] [khung cuối] [file ra] [taps=40] [mbMax=32]
Mỗi khung: vẽ cảnh một lần kèm vận tốc từng điểm ảnh, nhoè chuyển động N mẫu trong 0,7 khung, rồi độ sâu trường ảnh 40 mẫu.
Ghi ra tên tạm .tmp.mp4, đổi tên khi ffmpeg thoát 0. Chia đoạn rồi nối: ffmpeg -f concat -safe 0 -i ds.txt -c copy phim.mp4"""
import os, sys, base64, subprocess, time
from chung import BUILD, open_film
from playwright.sync_api import sync_playwright
fps = int(sys.argv[1]) if len(sys.argv) > 1 else 60
f0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0
f1 = int(sys.argv[3]) if len(sys.argv) > 3 else int(round(14.5 * fps))
out = sys.argv[4] if len(sys.argv) > 4 else os.path.join(BUILD, f'phim-{fps}fps.mp4')
taps = int(sys.argv[5]) if len(sys.argv) > 5 else 40
mbmax = int(sys.argv[6]) if len(sys.argv) > 6 else 32
tmp = out[:-4] + '.tmp.mp4'
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1440x1152', '-r', str(fps), '-i', '-',
                       '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp],
                      stdin=subprocess.PIPE)
t0 = time.time()
with sync_playwright() as pw:
    b, p = open_film(pw)
    for i in range(f0, f1):
        r = p.evaluate('([t,o]) => window.FILM.frame(t,o)', [i / fps, {'taps': taps, 'mbMax': mbmax}])
        ff.stdin.write(base64.b64decode(r['b64']))
        if (i - f0) % 30 == 0:
            el = time.time() - t0; n = i - f0 + 1
            print(f'khung {i} | {el / n:.2f} s/khung | còn ~{(f1 - i - 1) * el / n / 60:.1f} phút', flush=True)
    b.close()
ff.stdin.close()
if ff.wait() == 0: os.replace(tmp, out); print('xong', out)
else: sys.exit('ffmpeg lỗi')
