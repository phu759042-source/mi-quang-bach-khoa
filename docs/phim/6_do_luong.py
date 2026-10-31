"""Bước 6: đo bản xem nhanh 30fps. Dùng: python3 docs/phim/6_do_luong.py docs/phim/_build/xem-nhanh-30fps.mp4
Optical flow thưa (Lucas–Kanade trên điểm đặc trưng, bỏ vùng của mảnh nổi và ô logo) + homography RANSAC cho mặt phẳng trang.
 - tốc độ xuống trang: dịch chuyển dọc của điểm giữa khung (qua homography) ÷ (f·cosθ/D)
 - zoom: định thức Jacobian của homography tại giữa khung; > 1 là phóng to vào."""
import os, sys, numpy as np, cv2
from chung import BUILD, open_film
from playwright.sync_api import sync_playwright
VID = sys.argv[1]; FPS = 30
with sync_playwright() as pw:
    b, p = open_film(pw)
    cams = p.evaluate('n => Array.from({length:n}, (_, i) => { const c = window.FILM.camera(i/30); return [c.D, c.th, c.L[1]] })', 436)
    names = [n for n, _ in p.evaluate('window.FILM.info.pieces')]
    # vùng màn hình của mọi mảnh nổi và ô logo ở từng khung (để loại khỏi phép đo mặt phẳng trang)
    polys = p.evaluate('''([names, n]) => Array.from({length:n}, (_, i) => { const t = i/30; const out = [];
        for (const nm of names) out.push(window.FILM.sample(nm, t).corners.map(c => [c[0], c[1]]));
        for (let k = 0; k < 5; k++) { const r = window.FILM.tileScr(k, t); if (r) { const s = r.size*0.8; out.push([[r.scr[0]-s, r.scr[1]-s],[r.scr[0]+s, r.scr[1]-s],[r.scr[0]-s, r.scr[1]+s],[r.scr[0]+s, r.scr[1]+s]]) } }
        return out })''', [names, 436])
    b.close()
cap = cv2.VideoCapture(VID); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(cv2.cvtColor(cv2.resize(f, (720, 576), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY))
mask = np.zeros((576, 720), np.uint8); mask[10:470, 10:710] = 255
C = np.array([[[360.0, 288.0]]], np.float32)
rows = []
for i in range(len(fr) - 1):
    t = (i + 0.5) / FPS
    if t > 8.2: break
    mk = mask.copy()
    for poly in polys[i] + polys[i + 1]:
        q = np.array([poly[0], poly[1], poly[3], poly[2]], np.float32) / 2
        hull = cv2.convexHull(q.astype(np.int32)); cv2.fillConvexPoly(mk, hull, 0)
        cv2.dilate(mk, np.ones((1, 1), np.uint8))
    mk = cv2.erode(mk, np.ones((15, 15), np.uint8))
    p0 = cv2.goodFeaturesToTrack(fr[i], 1200, 0.004, 5, mask=mk)
    if p0 is None or len(p0) < 30: rows.append((t, np.nan, np.nan, np.nan, 0)); continue
    p1, st, _ = cv2.calcOpticalFlowPyrLK(fr[i], fr[i + 1], p0, None, winSize=(21, 21), maxLevel=4)
    pb, st2, _ = cv2.calcOpticalFlowPyrLK(fr[i + 1], fr[i], p1, None, winSize=(21, 21), maxLevel=4)
    good = (st[:, 0] == 1) & (st2[:, 0] == 1) & (np.linalg.norm((pb - p0)[:, 0], axis=1) < 0.5)
    if good.sum() < 30: rows.append((t, np.nan, np.nan, np.nan, int(good.sum()))); continue
    H, inl = cv2.findHomography(p0[good], p1[good], cv2.RANSAC, 0.8)
    if H is None: rows.append((t, np.nan, np.nan, np.nan, 0)); continue
    c1 = cv2.perspectiveTransform(C, H)[0, 0]
    dy = -(c1[1] - 288.0) * 2                      # px khung đầy đủ, dương = nội dung đi lên
    e = 2.0; q = np.array([[[360 + e, 288], [360 - e, 288], [360, 288 + e], [360, 288 - e]]], np.float32)
    m = cv2.perspectiveTransform(q, H)[0]
    J = np.array([(m[0] - m[1]) / (2 * e), (m[2] - m[3]) / (2 * e)]).T
    D = (cams[i][0] + cams[i + 1][0]) / 2; th = (cams[i][1] + cams[i + 1][1]) / 2
    v_page = dy * D / (1880 * np.cos(th)) * FPS
    v_true = (cams[i + 1][2] - cams[i][2]) * FPS
    rows.append((t, v_page, v_true, np.linalg.det(J), int(inl.sum())))
R = np.array(rows, dtype=float)
ok = ~np.isnan(R[:, 1])
print(f'khung đo được: {ok.sum()}/{len(R)} (số điểm khớp trung vị {np.median(R[ok, 4]):.0f})')
def seg(a, b): m = ok & (R[:, 0] >= a) & (R[:, 0] < b); return R[m]
cr = seg(1.65, 7.3)
print(f'lướt đều 1,65–7,3 s: tốc độ đo min {cr[:,1].min():.0f} · max {cr[:,1].max():.0f} · trung vị {np.median(cr[:,1]):.0f} px trang/s (camera: {np.median(cr[:,2]):.0f}); lệch chuẩn {cr[:,1].std():.1f}')
sm = np.convolve(cr[:, 1], np.ones(3) / 3, mode='valid')
dips = [(round(cr[k + 1, 0], 2), round(sm[k])) for k in range(1, len(sm)) if sm[k] < sm[k - 1] * 0.95]
print('chỗ tụt >5% (trung bình trượt 3 khung) khi lướt đều:', dips or 'không có')
ra = seg(0, 1.65); print('tăng tốc 0–1,65 s (đo/camera):', ' '.join(f'{r[0]:.2f}:{r[1]:.0f}/{r[2]:.0f}' for r in ra[::4]))
mono = all(ra[k + 1, 1] >= ra[k, 1] * 0.93 - 8 for k in range(len(ra) - 1))
print('đoạn tăng tốc có tụt không:', 'không' if mono else 'CÓ')
dc = seg(7.3, 8.2); print('chậm lại 7,3–8,2 s (đo/camera):', ' '.join(f'{r[0]:.2f}:{r[1]:.0f}/{r[2]:.0f}' for r in dc[::3]))
dets = R[ok, 3]
print(f'định thức Jacobian tại giữa khung trong lúc bay: lớn nhất {dets.max():.5f} · nhỏ nhất {dets.min():.5f}  → zoom vào: {"CÓ" if dets.max() > 1.0005 else "không"}')
np.savetxt(os.path.join(BUILD, 'do-luong.csv'), R, delimiter=',', header='t,v_do,v_camera,det_J,so_diem', fmt='%.5f')
