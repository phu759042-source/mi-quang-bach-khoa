/* Mì Quảng Bách Khoa · js/hang.js: phân hạng (bản 2.15.0).
   - Hạng ĐBK kiểu Liên Quân, 7 bậc theo tổng ĐBK, mỗi bậc một huy hiệu SVG tự vẽ (khiên + tô mì, bậc cao có cánh, ngọc, vương miện).
   - Danh hiệu Elo solo kiểu Codeforces, chỉ là chữ có màu (màu nằm trong css: .r-newbie … .r-lgm, có bản cho giao diện tối). */
const HANG_DBK = [
  {k:'dong',     n:'Đồng',      tu:-Infinity, c1:'#F0B47E', c2:'#8A5226'},
  {k:'bac',      n:'Bạc',       tu:10000,     c1:'#EEF2F6', c2:'#7D8792'},
  {k:'vang',     n:'Vàng',      tu:20000,     c1:'#FFE08A', c2:'#B07D0B'},
  {k:'bachkim',  n:'Bạch Kim',  tu:50000,     c1:'#A6F2E7', c2:'#1F8278'},
  {k:'kimcuong', n:'Kim Cương', tu:100000,    c1:'#BCD7FF', c2:'#2F5BC4'},
  {k:'tinhanh',  n:'Tinh Anh',  tu:500000,    c1:'#E6C9FF', c2:'#7537BF'},
  {k:'caothu',   n:'Cao Thủ',   tu:1000000,   c1:'#FFC98A', c2:'#BF3A0C'}];
function hangDBK(d){
  let i = 0; HANG_DBK.forEach((h, j) => { if((d || 0) >= h.tu) i = j });
  return {...HANG_DBK[i], i, ke: HANG_DBK[i + 1] || null};
}
const HANG_ELO = [
  [0, 'Newbie', 'newbie'], [1200, 'Pupil', 'pupil'], [1400, 'Specialist', 'specialist'], [1600, 'Expert', 'expert'],
  [1900, 'Candidate Master', 'cm'], [2100, 'Master', 'master'], [2300, 'International Master', 'im'],
  [2400, 'Grandmaster', 'gm'], [2600, 'International Grandmaster', 'igm'], [3000, 'Legendary Grandmaster', 'lgm']];
function hangElo(e){
  e = e ?? 1200; let i = 0; HANG_ELO.forEach((h, j) => { if(e >= h[0]) i = j });
  const [tu, n, k] = HANG_ELO[i], ke = HANG_ELO[i + 1];
  return {i, tu, n, k, ke: ke ? {tu: ke[0], n: ke[1], k: ke[2]} : null};
}
// Danh hiệu Elo: chữ màu. chip = nền sáng (dùng trên thẻ xanh đậm ở màn chính / hồ sơ)
const eloTitle = (e, chip) => { const h = hangElo(e); return `<span class="elo-t r-${h.k}${chip ? ' chip' : ''}" title="Elo ${e ?? 1200}">${h.n}</span>` };
// Tên người chơi tô màu theo Elo (bảng Solo, giống Codeforces)
const tenElo = (ten, e) => `<span class="ten-elo r-${hangElo(e).k}">${esc(ten)}</span>`;

// Huy hiệu hạng ĐBK
let hangLogoId = 0;
function hangLogo(d, size = 28, h = hangDBK(d)){
  const id = 'hl' + (++hangLogoId), i = h.i, c1 = h.c1, c2 = h.c2;
  const canh = n => `<g fill="${c1}" stroke="${c2}" stroke-width="1.6" stroke-linejoin="round">
      <path d="M13 18 C5 15 -1 22 0 33 C4 29 8 28 12 29 Z"/>${n > 1 ? '<path d="M12 29 C5 29 1 36 3 45 C6 40 9 39 13 39 Z"/>' : ''}</g>`;
  const doiCanh = n => `${canh(n)}<g transform="translate(64 0) scale(-1 1)">${canh(n)}</g>`;
  return `<svg class="hang-logo" viewBox="-6 -10 76 74" width="${size}" height="${size}" role="img" aria-label="Hạng ${h.n}"><title>Hạng ${h.n}</title>
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    ${i >= 3 ? doiCanh(i >= 5 ? 2 : 1) : ''}
    <path d="M32 4 L52 11 V29 C52 43 43 52 32 58 C21 52 12 43 12 29 V11 Z" fill="url(#${id})" stroke="${c2}" stroke-width="2.6" stroke-linejoin="round"/>
    ${i >= 1 ? `<path d="M32 9 L47.5 14.5 V29 C47.5 40 40.5 47.5 32 52.5 C23.5 47.5 16.5 40 16.5 29 V14.5 Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>` : ''}
    <path d="M38 17 L45 27 M41 15 L47 25" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".95"/>
    <path d="M20 28 H44 A12 12 0 0 1 20 28 Z" fill="#fff" fill-opacity=".95"/>
    <path d="M23 31 Q27 34 31 31 T39 31" fill="none" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>
    ${i >= 2 ? `<path d="M27 25 q-2 -3 0 -6 M32 25 q-2 -3 0 -6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>` : ''}
    ${i >= 4 && i < 6 ? `<path d="M32 -6 L37 0 L32 6 L27 0 Z" fill="${c1}" stroke="${c2}" stroke-width="1.6" stroke-linejoin="round"/>` : ''}
    ${i >= 6 ? `<path d="M20 4 L22 -7 L28 -1 L32 -9 L36 -1 L42 -7 L44 4 Z" fill="#FFD54A" stroke="#B07D0B" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="32" cy="-1" r="1.8" fill="#E53935"/>` : ''}
  </svg>`;
}
// Thẻ hạng ĐBK có thanh tiến độ lên hạng kế tiếp (dùng trong Thống kê)
function hangTheDBK(d){
  const h = hangDBK(d), ke = h.ke;
  const pct = ke ? Math.max(0, Math.min(100, ((d || 0) - Math.max(0, h.tu)) / (ke.tu - Math.max(0, h.tu)) * 100)) : 100;
  return `<div class="hang-the">${hangLogo(d, 56, h)}<div class="hang-tt"><b>Hạng ${h.n}</b>
    <span class="muted">${ke ? `Còn <b>${(ke.tu - (d || 0)).toLocaleString('vi-VN')}</b> ĐBK nữa lên ${ke.n}` : 'Hạng cao nhất'}</span>
    <div class="hang-bar" role="img" aria-label="${Math.round(pct)}% tới hạng ${ke ? ke.n : h.n}"><i style="width:${pct}%;background:${h.c2}"></i></div></div></div>`;
}
// Bảng giải thích các hạng (luật ở bảng xếp hạng)
const hangBangDBK = () => `<div class="hang-ds">${HANG_DBK.map((h, i) => `<span>${hangLogo(Math.max(0, h.tu), 26)}<b>${h.n}</b><small>${i ? 'từ ' + h.tu.toLocaleString('vi-VN') : 'dưới 10.000'}</small></span>`).join('')}</div>`;
const hangBangElo = () => `<div class="hang-ds elo">${HANG_ELO.map(([tu, n, k], i) => `<span><b class="elo-t r-${k}">${n}</b><small>${i + 1 < HANG_ELO.length ? `${tu}–${HANG_ELO[i + 1][0] - 1}` : `${tu}+`}</small></span>`).join('')}</div>`;
// Lên / xuống hạng sau một lượt hoặc một trận
function doiHangHTML(cu, moi, loai){
  if(loai === 'dbk'){ const a = hangDBK(cu), b = hangDBK(moi); if(a.i === b.i) return '';
    return `<div class="len-hang ${b.i > a.i ? 'len' : 'xuong'}">${hangLogo(moi, 44, b)}<span>${b.i > a.i ? 'Lên hạng' : 'Xuống hạng'} <b>${b.n}</b></span></div>` }
  const a = hangElo(cu), b = hangElo(moi); if(a.i === b.i) return '';
  return `<div class="len-hang ${b.i > a.i ? 'len' : 'xuong'}"><span>${b.i > a.i ? 'Danh hiệu mới' : 'Xuống danh hiệu'}: ${eloTitle(moi)}</span></div>`;
}
