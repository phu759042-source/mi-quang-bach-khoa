// ---------- chữ màn cuối (canvas 2D) ----------
const ovc = document.getElementById('ov'), ctx = ovc.getContext('2d');
let logoImg = null;
const LINE1 = ['Mở', 'quán', 'thôi.'], LINE2 = ['Cả', 'trường', 'đang', 'chờ.'];
function drawOverlay(t) {
  ctx.clearRect(0, 0, W, HT);
  if (t < 10.0) return false;
  ctx.save();
  // huy hiệu: logo + tên
  const pa = ss(10.02, 10.30, t);
  if (pa > 0) {
    ctx.font = '500 21px GeistFilm';
    const txt = 'Mì Quảng Bách Khoa', tw = ctx.measureText(txt).width, lh = 26, padL = 8, gap = 10, padR = 18, hgt = 42;
    const bw = padL + lh + gap + tw + padR, x0 = CX - bw / 2, y0 = 44 + (1 - pa) * 6;
    ctx.globalAlpha = pa;
    ctx.shadowColor = 'rgba(26,33,51,0.10)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(x0, y0, bw, hgt, hgt / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.drawImage(logoImg, x0 + padL, y0 + (hgt - lh) / 2, lh, lh);
    ctx.fillStyle = '#1B3A6B'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + padL + lh + gap, y0 + hgt / 2 + 1);
  }
  ctx.textBaseline = 'alphabetic';
  const line = (words, font, color, base, t0, step) => {
    ctx.font = font; const sp = ctx.measureText(' ').width;
    const ws = words.map(w => ctx.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let x = CX - tot / 2;
    words.forEach((w, i) => {
      const p = clamp((t - (t0 + i * step)) / 0.34, 0, 1);
      if (p > 0) {
        const e = easeOut(p), blur = 12 * (1 - e);
        ctx.globalAlpha = e; ctx.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        ctx.fillStyle = color; ctx.fillText(w, x, base + 16 * (1 - e));
      }
      x += ws[i] + sp;
    });
    ctx.filter = 'none';
  };
  line(LINE1, '500 74px GeistFilm', '#1B3A6B', 158, 10.12, 0.06);
  line(LINE2, 'italic 400 82px NewsreaderFilm', '#8b8b92', 250, 10.36, 0.05);
  ctx.restore();
  return true;
}

