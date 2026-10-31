"""Bước 6: đo bản xem nhanh 30fps bằng optical flow (Farneback). Dùng: python3 docs/phim/6_do_luong.py _build/xem-nhanh-30fps.mp4
 - tốc độ trượt xuống trang = dịch chuyển dọc ở giữa khung ÷ tỉ lệ px màn/px trang tại điểm nhìn (f·cosθ/D); không được tụt khi lướt đều
 - zoom: độ phân kỳ ngang của dòng chảy ở giữa khung (dương = phóng to vào); không được dương trong lúc bay"""
import os, sys, numpy as np, cv2

from chung import BUILD, open_film
from playwright.sync_api import sync_playwright
VID = sys.argv[1]; FPS = 30
with sync_playwright() as pw:
    b, p = open_film(pw)
    cams = p.evaluate('n => Array.from({length:n}, (_, i) => { const c = window.FILM.camera(i/30); return [c.D, c.th, c.L[1]] })', 436)
    b.close()
cap = cv2.VideoCapture(VID); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(cv2.cvtColor(cv2.resize(f, (720, 576), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY))
print('khung', len(frames))
rows = []
for i in range(len(frames) - 1):
    t = (i + 0.5) / FPS
    if t > 8.25: break
    fl = cv2.calcOpticalFlowFarneback(frames[i], frames[i + 1], None, 0.5, 4, 25, 4, 7, 1.5, 0)
    # vùng giữa khung (toạ độ ảnh 720×576): dòng 250-326, cột 200-520
    c = fl[250:326, 200:520]
    vy = -np.median(c[..., 1]) * 2            # px khung đầy đủ / khung hình, dương = nội dung đi lên
    D = (cams[i][0] + cams[i + 1][0]) / 2; th = (cams[i][1] + cams[i + 1][1]) / 2
    page_v = vy * D / (1880 * np.cos(th)) * FPS   # px trang / giây
    true_v = (cams[i + 1][2] - cams[i][2]) * FPS
    # phân kỳ ngang: hồi quy vx theo x trên dải giữa
    xs = np.arange(200, 520); vx = np.median(fl[250:326, 200:520, 0], axis=0)
    div = np.polyfit(xs, vx, 1)[0]            # >0: giãn ra (zoom vào)
    rows.append((t, page_v, true_v, div))
R = np.array(rows)
def at(a, b): m = (R[:, 0] >= a) & (R[:, 0] < b); return R[m]
cr = at(1.7, 7.25)
print(f'tốc độ đo được lúc lướt đều (1,7–7,25 s): min {cr[:,1].min():.0f}  max {cr[:,1].max():.0f}  trung vị {np.median(cr[:,1]):.0f} px trang/s (camera thật: {np.median(cr[:,2]):.0f})')
dips = [(round(a[0], 2), round(a[1])) for a, b_ in zip(cr[1:], cr[:-1]) if a[1] < b_[1] * 0.93]
print('chỗ tụt >7% so với khung trước trong đoạn lướt đều:', dips[:10] or 'không có')
ramp = at(0.0, 1.7)
print('đoạn tăng tốc 0–1,7 s (đo/thật):', ' '.join(f'{r[0]:.2f}:{r[1]:.0f}/{r[2]:.0f}' for r in ramp[::5]))
print('đoạn chậm lại 7,25–8,25 s (đo/thật):', ' '.join(f'{r[0]:.2f}:{r[1]:.0f}/{r[2]:.0f}' for r in at(7.25, 8.3)[::4]))
print(f'phân kỳ ngang lớn nhất trong lúc bay (dương = zoom vào): {R[:,3].max():.5f}  (nhỏ nhất {R[:,3].min():.5f})')
print('có lúc zoom vào trong lúc bay:', 'CÓ' if R[:, 3].max() > 1e-4 else 'không')
np.savetxt(os.path.join(BUILD, 'do-luong.csv'), R, delimiter=',', header='t,v_do,v_that,phan_ky', fmt='%.5f')
