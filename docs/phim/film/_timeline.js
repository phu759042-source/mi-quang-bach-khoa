'use strict';
/* Mì Quảng Bách Khoa · phim bay qua trang giới thiệu (14,5 giây, 1440×1152).
   Mọi khung hình tính từ thời gian t trong FILM.frame(t): không timer, không CSS transition.
   Toạ độ thế giới = toạ độ trang (px CSS): x sang phải, y xuống dưới trang, z hướng lên khỏi mặt trang. */

const W = 1440, HT = 1152, FOC = 1880, CX = 720, CY = 576, DUR = 14.5;
const DEG = Math.PI / 180, TILT = 56 * DEG;
const HAZE = [0.965, 0.973, 0.976];
const ROOT = '/docs/phim/_build/';   // mọi thứ sinh ra ở bước 1–2 (font, texture, ảnh chụp trang)

// ---------- tiện ích ----------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) };
const ss5 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) };
const easeOut = u => 1 - (1 - u) ** 3;
const easeInOutQuad = u => u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };

let J, PH, HERO_B, LY0, CRUISE, S_OVER, D_OVER, S_CARD = 1018 / 1440;

// ---------- bảng tích phân (bước 0,1 ms) ----------
const DT = 1e-4, NT = Math.ceil(DUR / DT) + 2;
const tabV = new Float64Array(NT), tabW = new Float64Array(NT), tabR = new Float64Array(NT);
function vGlide(t) {
  if (t <= 0) return 0;
  if (t < 0.6) return 0.5 * ss(0, 0.6, t);
  if (t < 1.25) return 0.5;
  if (t < 1.6) return 0.5 + 0.5 * ss(1.25, 1.6, t);
  if (t < 7.3) return 1.0;
  return 1.0 - 0.88 * ss(7.3, 8.3, t);
}
const wDist = t => ss(0, 0.8, t) * Math.pow(clamp(1 - t / 8.2, 0, 1), 1.5);
const rRise = t => ss(7.75, 8.35, t) - ss(8.95, 9.25, t);
function buildTables() {
  let pv = 0, pw = 0, pr = 0;
  for (let i = 1; i < NT; i++) {
    const t0 = (i - 1) * DT, t1 = i * DT;
    pv += (vGlide(t0) + vGlide(t1)) * DT / 2; tabV[i] = pv;
    pw += (wDist(t0) + wDist(t1)) * DT / 2; tabW[i] = pw;
    pr += (rRise(t0) + rRise(t1)) * DT / 2; tabR[i] = pr;
  }
}
function look(tab, t) { const x = clamp(t, 0, (NT - 2) * DT) / DT, i = Math.floor(x), f = x - i; return tab[i] * (1 - f) + tab[i + 1] * f }
const V = t => look(tabV, t);
let W82, R925, RMAX;
const Dfl = t => 1360 + 340 * look(tabW, Math.min(t, 8.2)) / W82;

// ---------- camera ----------
const PIN = HT - 42 - CY;   // đáy trang giữ cách đáy khung 42px
const lglide = t => LY0 + CRUISE * V(t);
function logScaleAfter(t) {        // log tỉ lệ (px màn hình / px trang) từ 9,25s, camera nhìn thẳng xuống
  const l0 = Math.log(S_OVER), l1 = l0 + Math.log(1.035), l2 = Math.log(S_CARD);
  if (t < 9.47) return l0 + (l1 - l0) * ss(9.25, 9.47, t);
  if (t < 9.97) return l1 + (l2 - l1) * easeInOutQuad((t - 9.47) / 0.5);
  return l2 + Math.log(1.02) * ss(9.97, 14.5, t);
}
function camera(t) {
  t = clamp(t, 0, DUR);
  let D, th, Ly;
  if (t < 9.25) {
    D = Math.exp(Math.log(Dfl(t)) + RMAX * look(tabR, t));
    th = TILT * (1 - ss(8.15, 8.95, t));
    const pin = PH - PIN * D / (FOC * Math.cos(th) + PIN * Math.sin(th));
    Ly = lerp(lglide(t), pin, ss(8.3, 8.65, t));
  } else {
    const s = Math.exp(logScaleAfter(t)); D = FOC / s; th = 0;
    if (t < 9.47) Ly = PH / 2;
    else {
      const s47 = Math.exp(logScaleAfter(9.47)), y0 = CY - s47 * PH / 2;
      const ytop = lerp(y0, 283, ss(9.70, 9.97, t));
      Ly = (CY - ytop) / s;
    }
  }
  const sn = Math.sin(th), cs = Math.cos(th);
  const L = [CX, Ly, 0], C = [CX, Ly + D * sn, D * cs];
  return { t, D, th, L, C, F: [0, -sn, -cs], U: [0, -cs, sn], R: [1, 0, 0] };
}
function project(cam, P) {
  const v = v3.sub(P, cam.C), z = v3.dot(v, cam.F);
  return [CX + FOC * v3.dot(v, cam.R) / z, CY - FOC * v3.dot(v, cam.U) / z, z];
}
function unproject(cam, sx, sy, depth) {
  return v3.add(cam.C, v3.add(v3.mul(cam.F, depth), v3.add(v3.mul(cam.R, (sx - CX) * depth / FOC), v3.mul(cam.U, (CY - sy) * depth / FOC))));
}
// thời điểm điểm nhìn (khi lướt) đi qua toạ độ y của trang
function tPass(y) {
  if (y <= LY0) return 0;
  let lo = 0, hi = 8.3;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lglide(m) < y) lo = m; else hi = m }
  return (lo + hi) / 2;
}

// ---------- mảnh nổi ----------
let pieces = [];
const DIVE_HAZE = t => ss(9.47, 9.72, t), DIVE_CUT = t => ss(9.75, 9.93, t);
function setupPieces() {
  const cfg = {
    'hero-chip-1': { z0: 3, z1: 44, a: 30, r: [0.10, 1.35], s: [3.4, 4.2] },
    'hero-chip-2': { z0: 3, z1: 56, a: 30, r: [0.17, 1.35], s: [3.4, 4.2] },
    'hero-chip-3': { z0: 3, z1: 50, a: 30, r: [0.24, 1.35], s: [3.4, 4.2] },
    'hero-cta': { z0: 4, z1: 26, a: 10, r: [0.15, 1.30], s: [3.4, 4.2] },
    'hero-phone': { z0: 10, z1: 38, a: 12, r: [0.25, 1.40], s: [3.4, 4.2] },
    'hero-khach': { z0: 12, z1: 66, a: 26, r: [0.20, 1.30], s: [3.4, 4.2] },
    'hero-ket': { z0: 10, z1: 74, a: 32, r: [0.30, 1.35], s: [3.4, 4.2] },
    'bxh-anh-1': { z0: 6, z1: 100, a: 46, r: [1.35, 2.55], rel: 's', s: [1.7, 2.7] },
    'bxh-anh-2': { z0: 6, z1: 130, a: 46, r: [1.42, 2.62], rel: 's', s: [1.7, 2.7] },
    'bxh-anh-3': { z0: 6, z1: 115, a: 46, r: [1.49, 2.70], rel: 's', s: [1.7, 2.7] },
    'bxh-chip-trai': { z0: 4, z1: 200, a: 54, r: [1.75, 2.45], s: [3.8, 4.6] },
    'bxh-chip-phai': { z0: 4, z1: 200, a: 54, r: [1.80, 2.50], s: [3.8, 4.6] },
    'khach-trich': { z0: 22, z1: 112, a: 30, r: [5.45, 6.30], rel: 's', s: [1.4, 2.4], ext: 50 },
    'cuoi-cta': { z0: 4, z1: 30, a: 14, r: [7.35, 7.95], s: [8.7, 9.2] },
  };
  pieces = [];
  for (const L of J.layers) {
    if (L.name.startsWith('hero-tile')) continue;
    let c = cfg[L.name];
    const cy = L.y + L.h / 2, tc = tPass(cy);
    if (!c) {
      const k = +(L.name.match(/(\d+)$/) || [0, 0])[1];
      const g = L.name.startsWith('buoc') ? { z1: 34, a: 22, st: .05 } : L.name.startsWith('solo-chip') ? { z1: 48, a: 28, st: .04 }
        : L.name === 'solo-anh' ? { z1: 64, a: 24, st: 0 } : L.name.startsWith('hang') ? { z1: 42, a: 34, st: .04 } : { z1: 30, a: 16, st: 0 };
      c = { z0: 5, z1: g.z1, a: g.a, r: [tc - 0.95 + g.st * k, tc - 0.15 + g.st * k], s: [tc + 1.6, tc + 2.6] };
    } else if (c.rel === 's') c = { ...c, s: [tc + c.s[0], tc + c.s[1]] };
    const radius = L.name.includes('chip') || L.name.endsWith('cta') ? Math.min(L.h / 2, L.radius) : L.radius;
    pieces.push({ ...L, cfg: c, tc, cx: L.x + L.w / 2, cy, radius, below: L.y > HERO_B - 1, tex: null });
  }
}
function pieceState(P, t) {
  const c = P.cfg, lift = ss(c.r[0], c.r[1], t) * (1 - ss(c.s[0], c.s[1], t));
  const z = lerp(c.z0, c.z1, lift), a = c.a * DEG * lift;
  const haze = P.below ? DIVE_HAZE(t) : 0, op = P.below ? 1 - DIVE_CUT(t) : 1;
  return { c: [P.cx, P.cy, z], a, roll: 0, s: 1, op, haze, ext: (c.ext || 0) * ss(c.r[0], c.r[1], t) };
}

// ---------- 5 ô logo bay tự do ----------
const TILE_COL = ['navy', 'chili', 'leaf', 'turmeric', 'navy'];
const TILE_EDGE = [[0.06, 0.13, 0.25], [0.48, 0.13, 0.08], [0.11, 0.25, 0.13], [0.62, 0.42, 0.05], [0.06, 0.13, 0.25]];
let TILE0 = [];
const HANG = [ // nơi treo ngoài hai góc trên của trang lúc ~1,35s: [x, y, z, cỡ, góc nghiêng, xoay]
  [151, 387, 230, 162, 48, -9], [204, 26, 150, 159, 52, 7], [1267, 456, 250, 168, 46, 8], [1234, 49, 160, 165, 50, -6]];
const END = [ // màn cuối: [x, y, z, cỡ, xoay] (toạ độ trang, camera nhìn thẳng xuống)
  [16, 12, 40, 150, -8], [1422, 16, 60, 128, 10], [1748, 520, 10, 196, -6]];
function tileState(k, t) {
  const cam = camera(t);
  if (t >= 9.5) {           // màn cuối
    if (k <= 2) {
      const e = END[k], u = ss5(9.55 + 0.05 * k, 10.15 + 0.05 * k, t);
      const drift = Math.sin(t * 0.9 + k * 2.1) * 3;
      return { c: [e[0] + drift, e[1] + Math.cos(t * 0.7 + k) * 3, lerp(1500 - 200 * k, e[2], u)], a: 0, roll: e[4] * DEG, s: e[3] / 32,
        op: ss(9.55 + 0.05 * k, 9.78 + 0.05 * k, t), haze: 0, ext: e[3] * 0.07 };
    }
    // hai ô mờ lớn trôi vào từ hai góc dưới, rất gần ống kính
    const u = easeOut(clamp((t - 9.85) / 4.65, 0, 1));
    const p = k === 3 ? [lerp(-90, 165, u), lerp(1290, 1065, u), 880] : [lerp(1560, 1290, u), lerp(1320, 1085, u), 960];
    return { c: unproject(cam, p[0], p[1], p[2]), a: 0, roll: (k === 3 ? 14 : -12) * DEG, s: (k === 3 ? 190 : 205) / 32, op: 1, haze: 0, ext: 0 };
  }
  if (k === 4) return null;
  if (k === 0 && t > 4.6 && t < 6.3) {   // một ô lướt qua mép trái, sát ống kính, mờ
    const u = ss(4.75, 6.15, t);
    const p = unproject(cam, lerp(40, 70, Math.sin(u * Math.PI)) - 130 + 260 * Math.sin(u * Math.PI) * 0.5, lerp(1320, -180, u), 470);
    return { c: p, a: cam.th * 0.95, roll: lerp(-20, 15, u) * DEG, s: 120 / 32, op: 1, haze: 0, ext: 0 };
  }
  if (t > 2.6) return null;
  const s0 = TILE0[k], h = HANG[k];
  const u = ss5(0.10 + 0.06 * k, 1.35, t);
  let x = lerp(s0[0], h[0], u), y = lerp(s0[1], h[1], u), z = lerp(3, h[2], u) + Math.sin(Math.PI * u) * 60;
  const size = lerp(32, h[3], Math.pow(u, 2.2)), a = lerp(0, h[4], u) * DEG, roll = lerp(0, h[5], u) * DEG;
  y += 300 * ss(1.25, 2.1, t);           // bám theo camera 300px xuống trang
  z += 400 * ss(1.85, 2.6, t) ** 1.5;    // rồi trôi lên, ra khỏi mép trên
  x += (k % 2 ? 1 : -1) * 40 * ss(1.85, 2.6, t);
  return { c: [x, y, z], a, roll, s: size / 32, op: 1, haze: 0, ext: size * 0.07 * u };
}

// ---------- tiêu cự: theo thứ ở giữa khung ----------
function focusFactor(t) {
  const cam = camera(t); let f = cam.D;
  const test = (st, hx, hy) => {
    if (!st || st.op < 0.5) return;
    const n = [0, Math.sin(st.a), Math.cos(st.a)], den = v3.dot(cam.F, n);
    if (Math.abs(den) < 1e-3) return;
    const tt = v3.dot(v3.sub(st.c, cam.C), n) / den; if (tt <= 10) return;
    const d = v3.sub(v3.add(cam.C, v3.mul(cam.F, tt)), st.c);
    const lx = d[0], ly = d[1] * Math.cos(st.a) - d[2] * Math.sin(st.a);
    const cov = ss(0, 40, hx - Math.abs(lx)) * ss(0, 40, hy - Math.abs(ly));
    if (cov > 0) f = Math.min(f, lerp(cam.D, tt, cov));
  };
  for (const P of pieces) test(pieceState(P, t), P.w / 2, P.h / 2);
  return f / cam.D;
}
function focusAt(t) {
  let s = 0, w = 0;
  for (let k = 0; k < 12; k++) { const wk = Math.exp(-k / 4); s += wk * focusFactor(Math.max(0, t - k * 0.025)); w += wk }
  return camera(t).D * s / w;
}

