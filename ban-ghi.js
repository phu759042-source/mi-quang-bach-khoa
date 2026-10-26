/* Mì Quảng Bách Khoa · ban-ghi.js
   1. Bộ ghi thao tác: mỗi sự kiện của lượt chơi / trận solo được ghi kèm thời điểm (ms tính từ lúc bắt đầu),
      lưu cùng bản lưu máy (mqbk-run) và gửi lên server (bảng ban_ghi) khi kết thúc.
   2. Màn xem lại: dựng lại quán từ danh sách sự kiện, xem hai người cạnh nhau, phát/tua/đổi tốc độ.
   3. Hồ sơ: Thống kê (solo + mở quán), Ván solo (kiểu chess.com), Lượt bán.
   File này chỉ khai báo hàm; mọi biến game (S, D, solo, DIFF, KHACH…) nằm trong index.html. */

/* ================= 1. Bộ ghi ================= */
const REC_V = 1;
let REC = null;                 // {v, kind:'run'|'solo', diff, md, t0, ev:[[ms, mã, ...]], cid}
const ING_KEYS = () => Object.keys(ING);
function recStart(kind){
  REC = {v:REC_V, kind, diff, md: solo ? solo.md : null, t0: Date.now(), ev: [], cid: 0};
}
function rec(code, ...a){
  if(!REC || REC.ev.length >= 12000) return;
  REC.ev.push([Date.now() - REC.t0, code, ...a]);
}
const r1 = x => Math.round(x * 10) / 10;
// gọi trong spawn(), sau khi biết khách ngồi bàn i hay xếp hàng (i = -1)
function recSpawn(c, i){
  if(!REC) return;
  c.id = ++REC.cid;
  const ks = ING_KEYS();
  rec('S', c.id, KHACH.indexOf(c.kh), c.teacher ? 1 : 0, c.order.map(k => ks.indexOf(k)).join(''),
      r1(c.max), r1(c.qmax), Math.round(c.price), c.teacher ? -1 : LINES.indexOf(c.line), i);
}
const recIng = k => ING_KEYS().indexOf(k);
// Gửi bản ghi lên server. Lỗi mạng thì giữ lại trong máy, lần mở game sau gửi tiếp.
async function recUpload(meta){
  if(!REC || !sb || !user) { REC = null; return }
  const goi = {p_thach_dau: meta.thach_dau || null, p_run: meta.run || null, p_du_lieu: REC};
  REC = null;
  const {error} = await rpcRetry('luu_ban_ghi', goi, 3);
  if(error && isNetErr(error)) { try{ localStorage.setItem('mqbk-rec-cho', JSON.stringify(goi)) }catch(e){} }
}
async function recFlush(){
  let goi = null; try{ goi = JSON.parse(localStorage.getItem('mqbk-rec-cho')) }catch(e){}
  if(!goi || !sb || !user) return;
  const {error} = await rpcRetry('luu_ban_ghi', goi, 2);
  if(!error || !isNetErr(error)) try{ localStorage.removeItem('mqbk-rec-cho') }catch(e){}
}

/* ================= 2. Dựng lại quán từ sự kiện ================= */
// Trạng thái một người tại thời điểm T. apply() chạy lần lượt từng sự kiện.
function rpNew(){
  return {day:0, ev:0, target:0, n:3, rem0:DAYLEN, tRef:0, running:false, earned:0, total:0, rep:5, lost:0,
    slots:[null,null,null], queue:[], bowl:[], broth:false, upg:{}, shop:false, ended:false, cust:new Map(), log:[], i:0};
}
const rpRem = (st, T) => Math.max(0, st.running ? st.rem0 - (T - st.tRef) / 1000 : st.rem0);
function rpApply(st, e){
  const [t, c] = e, ks = ING_KEYS();
  const say = (txt, kind) => { st.log.push({t, txt, kind}); if(st.log.length > 4) st.log.shift() };
  const free = id => { st.slots = st.slots.map(x => x && x.id === id ? null : x) };
  const base = () => { st.bowl = st.upg.phubep ? ['mi'] : []; st.broth = false };
  switch(c){
    case 'D': st.day = e[2]; st.ev = e[3]; st.n = e[4]; st.target = e[5]; st.slots = Array(st.n).fill(null); st.queue = [];
      st.earned = 0; st.rem0 = DAYLEN; st.tRef = t; st.running = true; st.shop = false; base(); say(`Mở quán ngày ${e[2]}`, 'day'); break;
    case 'S': { const k = {id:e[2], kh:KHACH[e[3]] || KHACH[0], teacher:!!e[4], order:String(e[5]).split('').map(d => ks[+d]),
        max:e[6], qmax:e[7], price:e[8], at:t, r:1, qat:t, qr:1};
      st.cust.set(k.id, k);
      if(e[10] >= 0) st.slots[e[10]] = k; else st.queue.push(k); break }
    case 'T': { const k = st.cust.get(e[2]); if(k){ st.queue = st.queue.filter(x => x !== k); st.slots[e[3]] = k; k.at = t; k.r = 1 } break }
    case 'A': if(!st.bowl.includes(ks[e[2]])) st.bowl.push(ks[e[2]]); break;
    case 'R': st.bowl = st.bowl.filter(x => x !== ks[e[2]]); break;
    case 'P': st.broth = true; break;
    case 'X': base(); say('Đổ bỏ tô', 'bad'); break;
    case 'V': { st.earned += e[4]; st.total += e[4]; free(e[2]); base(); say(`Bưng bàn ${e[3] + 1}: +${e[4]}k`, 'good'); break }
    case 'W': free(e[2]); base(); say(`Sai món ở bàn ${e[3] + 1}`, 'bad'); break;
    case 'L': free(e[2]); say(`Khách bàn ${e[3] + 1} bỏ về`, 'bad'); break;
    case 'J': st.queue = st.queue.filter(x => x.id !== e[2]); say('Khách xếp hàng bỏ về', 'bad'); break;
    case 'G': { const k = st.cust.get(e[2]); if(k){ if(e[3]){ k.qat = t; k.qr = .5 } else { k.at = t; k.r = .5 } } say('Thẻ tích điểm giữ chân khách', 'good'); break }
    case 'H': st.rep = e[2]; st.lost = e[3]; break;
    case 'E': st.rem0 = 0; st.running = false; st.earned = e[2]; st.shop = true; say(`Hết ngày ${st.day}: ${e[2]}k`, 'day'); break;
    case 'B': st.upg[e[2]] = e[3]; say(`Mua ${upgName(e[2], e[3])}`, 'shop'); break;
    case 'K': st.rep++; say('Mua 1 tim', 'shop'); break;
    case 'Z': st.rem0 = rpRem(st, t); st.running = false; say('Tạm dừng', 'day'); break;
    case 'U': st.rem0 = e[2]; st.tRef = t; st.running = true; st.shop = false; if(e[3]) st.n = e[3]; say('Bán tiếp', 'day'); break;
    case 'Y': st.rem0 = rpRem(st, t); st.running = false; st.slots = Array(st.n).fill(null); st.queue = []; base(); say('Tải lại trang', 'bad'); break;
    case 'O': st.rem0 = rpRem(st, t); st.running = false; st.ended = true; say('Kết thúc', 'day'); break;
  }
}
const upgName = (id, lvl) => { const u = UPG.find(x => x.id === id); return u ? (u.lv[lvl - 1] || u.lv[0]).n : id };
// Dòng diễn biến cho danh sách bên dưới (chỉ những việc đáng xem)
function rpLine(e, ks){
  const c = e[1];
  return c === 'D' ? `Mở quán ngày ${e[2]}` : c === 'V' ? `Bưng bàn ${e[3] + 1}, +${e[4]}k` : c === 'W' ? `Sai món ở bàn ${e[3] + 1}, mất 1 tim`
    : c === 'L' ? `Khách bàn ${e[3] + 1} chờ lâu bỏ về, mất 1 tim` : c === 'J' ? 'Khách xếp hàng bỏ về, mất 1 tim'
    : c === 'E' ? `Hết ngày, bán được ${e[2]}k` : c === 'B' ? `Mua ${upgName(e[2], e[3])}` : c === 'K' ? 'Mua 1 tim'
    : c === 'Z' ? 'Tạm dừng' : c === 'Y' ? 'Tải lại trang' : c === 'O' ? 'Kết thúc' : null;
}
const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` };

/* ================= 2b. Màn xem lại ================= */
let RP = null;   // {players:[{ten, av, ev, st}], T, dur, speed, playing, raf, last}
function rpStop(){ if(RP){ RP.playing = false; cancelAnimationFrame(RP.raf); clearInterval(RP.tick) } RP = null }
async function replayScreen(o){   // o = {thach_dau, run, back, title, sub}
  rpStop();
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Xem lại</div><button class="link" id="back">Đóng</button></div>
    <h2>${esc(o.title || 'Xem lại')}</h2><div class="empty-state">Đang tải bản ghi…</div>`);
  $('back').onclick = () => { rpStop(); (o.back || home)() };
  const q = sb.from('ban_ghi').select('user_id,du_lieu');
  const {data, error} = await (o.thach_dau ? q.eq('thach_dau_id', o.thach_dau) : q.eq('run_id', o.run));
  if(!$('back')) return;
  if(error || !data || !data.length){
    $('ov').querySelector('.empty-state').textContent = error ? 'Không tải được bản ghi: ' + error.message
      : 'Trận này chưa có bản ghi. Bản ghi chỉ có từ bản 2.11.0, và được gửi lên ngay khi trận kết thúc.';
    return;
  }
  const ids = data.map(d => d.user_id);
  const {data: ps} = await sb.from('profiles').select('id,ten,avatar_url').in('id', ids);
  const pmap = new Map((ps || []).map(p => [p.id, p]));
  data.sort((a, b) => (a.user_id === user.id ? -1 : b.user_id === user.id ? 1 : 0));
  const players = data.map(d => ({id: d.user_id, ten: pmap.get(d.user_id)?.ten || 'Người chơi', av: pmap.get(d.user_id)?.avatar_url,
    ev: d.du_lieu.ev || [], st: rpNew(), dk: d.du_lieu.diff}));
  const dur = Math.max(...players.map(p => p.ev.length ? p.ev[p.ev.length - 1][0] : 0)) + 1000;
  RP = {players, T: 0, dur, speed: 1, playing: false, last: 0, o};
  const ks = ING_KEYS();
  const days = []; players[0].ev.forEach(e => { if(e[1] === 'D') days.push([e[0], e[2]]) });
  const moves = [];
  players.forEach((p, pi) => p.ev.forEach(e => { const l = rpLine(e, ks); if(l) moves.push({t: e[0], pi, l, kind: e[1]}) }));
  moves.sort((a, b) => a.t - b.t);
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${esc(o.sub || 'Xem lại')}</div><button class="link" id="back">Đóng</button></div>
    <h2>${esc(o.title || 'Xem lại')}</h2>
    ${players.length < 2 && o.thach_dau ? '<p class="muted">Chỉ có bản ghi của một bên (bên kia đang dùng bản game cũ hoặc chưa gửi kịp).</p>' : ''}
    <div class="rp-stage n${players.length}" id="rpStage">${players.map((p, i) => `<div class="rp-view" id="rpv${i}"></div>`).join('')}</div>
    <div class="rp-ctl">
      <div class="rp-btns">
        <button type="button" class="pz" id="rpBack10" aria-label="Lùi 10 giây">−10s</button>
        <button type="button" class="btn rp-play" id="rpPlay" aria-label="Phát">Phát</button>
        <button type="button" class="pz" id="rpFwd10" aria-label="Tiến 10 giây">+10s</button>
        <span class="rp-speed" role="group" aria-label="Tốc độ">${[1,2,4,8].map(s => `<button type="button" data-s="${s}" aria-pressed="${s === 1}">${s}×</button>`).join('')}</span>
      </div>
      <div class="rp-bar"><input type="range" id="rpSeek" min="0" max="${dur}" step="100" value="0" aria-label="Thời điểm trong trận">
        <div class="rp-days">${days.map(([t, d]) => `<i style="left:${t / dur * 100}%" title="Ngày ${d}">${d}</i>`).join('')}</div></div>
      <div class="rp-time"><b id="rpNow">0:00</b> / ${mmss(dur)}</div>
    </div>
    <div class="eyebrow">Diễn biến</div>
    <div class="list rp-moves" id="rpMoves">${moves.map((m, k) => `<button type="button" class="li rp-mv ${m.kind === 'V' ? 'good' : /[WLJ]/.test(m.kind) ? 'bad' : ''}" data-t="${m.t}" data-k="${k}">
      <span class="rk">${mmss(m.t)}</span><span class="nm">${players.length > 1 ? `<b>${esc(tenNgan(players[m.pi].ten))}</b> · ` : ''}${esc(m.l)}</span></button>`).join('') || '<div class="empty-state">Không có diễn biến.</div>'}</div>`);
  $('back').onclick = () => { rpStop(); (o.back || home)() };
  $('rpPlay').onclick = () => { RP.playing ? rpPause() : rpPlay() };
  $('rpBack10').onclick = () => rpSeek(RP.T - 10000);
  $('rpFwd10').onclick = () => rpSeek(RP.T + 10000);
  $('rpSeek').oninput = e => rpSeek(+e.target.value);
  $('ov').querySelector('.rp-speed').onclick = e => { const b = e.target.closest('[data-s]'); if(!b) return; RP.speed = +b.dataset.s;
    $('ov').querySelectorAll('.rp-speed button').forEach(x => x.setAttribute('aria-pressed', x === b)) };
  $('rpMoves').onclick = e => { const b = e.target.closest('[data-t]'); if(b) rpSeek(+b.dataset.t) };
  rpSeek(0); rpPlay();
}
function rpPlay(){ if(!RP) return; if(RP.T >= RP.dur) rpSeek(0); RP.playing = true; RP.last = performance.now(); $('rpPlay').textContent = 'Dừng'; RP.raf = requestAnimationFrame(rpFrame) }
function rpPause(){ if(!RP) return; RP.playing = false; cancelAnimationFrame(RP.raf); const b = $('rpPlay'); if(b) b.textContent = 'Phát' }
function rpFrame(now){
  if(!RP || !RP.playing || !$('rpStage')) return;
  let T = RP.T + (now - RP.last) * RP.speed; RP.last = now;
  // Bỏ qua quãng không ai bán (cửa hàng, tạm dừng, tải lại) dài hơn 1,5 giây
  if(RP.players.every(p => !p.st.running)){
    const next = Math.min(...RP.players.map(p => p.ev[p.st.i] ? p.ev[p.st.i][0] : Infinity));
    if(next - T > 1500 && next < Infinity) T = next - 300;
  }
  if(T >= RP.dur){ rpSeek(RP.dur); rpPause(); return }
  rpSeek(T, true);
  RP.raf = requestAnimationFrame(rpFrame);
}
function rpSeek(T, playing){
  if(!RP) return;
  T = Math.max(0, Math.min(RP.dur, T));
  RP.players.forEach(p => {
    if(T < RP.T || !p.st.day && !p.st.i){ p.st = rpNew() }      // tua lùi: dựng lại từ đầu
    while(p.st.i < p.ev.length && p.ev[p.st.i][0] <= T) rpApply(p.st, p.ev[p.st.i++]);
  });
  RP.T = T;
  if(!playing){ RP.last = performance.now() }
  const s = $('rpSeek'); if(s && document.activeElement !== s) s.value = T;
  const n = $('rpNow'); if(n) n.textContent = mmss(T);
  RP.players.forEach((p, i) => rpDraw(p, i, T));
  const ml = $('rpMoves'); if(ml){ let cur = null; ml.querySelectorAll('.rp-mv').forEach(b => { const on = +b.dataset.t <= T; b.classList.toggle('done', on); if(on) cur = b });
    ml.querySelectorAll('.rp-mv.cur').forEach(b => b.classList.remove('cur')); if(cur) cur.classList.add('cur') }
}
function rpDraw(p, i, T){
  const el = $('rpv' + i); if(!el) return;
  const st = p.st, rem = rpRem(st, T), dayT = DAYLEN - rem, rush = st.running && rem <= RUSH[1] && rem > RUSH[0];
  const bar = (r) => { const v = Math.max(0, Math.min(1, r)); return `<div class="pat"><i style="width:${v * 100}%;background:${v > .5 ? 'var(--leaf)' : v > .25 ? 'var(--turmeric)' : 'var(--chili)'}"></i></div>` };
  const ratio = k => k.r - (T - k.at) / 1000 / k.max, qratio = k => k.qr - (T - k.qat) / 1000 / k.qmax;
  const hearts = Array.from({length:5}, (_, k) => `<svg viewBox="0 0 24 22" aria-hidden="true"><path d="${HEART_PATH}" fill="${k < st.rep ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/></svg>`).join('');
  el.innerHTML = `<div class="rp-head">${avatarHTML(p.av, p.ten, 28)}<b>${esc(tenNgan(p.ten))}</b><span class="hearts">${hearts}</span></div>
    <div class="rp-stats"><span>Ngày <b>${st.day || 1}</b></span><span>${st.shop ? 'Cửa hàng' : st.ended ? 'Đã xong' : `<b>${Math.ceil(rem)}</b>s`}</span>
      <span>Hôm nay <b>${st.earned}${st.target ? '/' + st.target : ''}k</b></span><span>Tổng <b>${st.total}k</b></span>${rush ? '<span class="tag rush">Cao điểm</span>' : ''}</div>
    <div class="rp-tables" style="--n:${st.n}">${st.slots.map((k, j) => k ? `<div class="rp-c${k.teacher ? ' teacher' : ''}"><span class="ava" style="background:${k.kh[2]}">${k.teacher ? 'Thầy' : k.kh[0]}</span>
      <span class="order">${k.order.map(icon).join('')}</span>${bar(ratio(k))}</div>` : `<div class="rp-c empty">Bàn ${j + 1}</div>`).join('')}</div>
    <div class="rp-q">${st.queue.length ? `Xếp hàng ${st.queue.map(k => `<i style="--c:${k.kh[2]};box-shadow:0 0 0 2px ${qratio(k) > .5 ? 'var(--leaf)' : qratio(k) > .25 ? 'var(--turmeric)' : 'var(--chili)'}"></i>`).join('')}` : '&nbsp;'}</div>
    <div class="rp-bowl"><span class="rp-b">${st.bowl.length ? st.bowl.map(icon).join('') : '<em>Tô trống</em>'}</span>${st.broth ? '<span class="tag broth">Đã chan</span>' : ''}</div>
    <div class="rp-log">${st.log.slice().reverse().map((l, k) => `<span class="${l.kind}" style="opacity:${1 - k * .25}">${esc(l.txt)}</span>`).join('')}</div>`;
}

/* ================= 3. Hồ sơ: Thống kê · Ván solo · Lượt bán ================= */
const fmtNgay = iso => { if(!iso) return ''; const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', year:'numeric'}) + ' · ' +
    d.toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit'}) };
const KQ = {thang:{c:'win', s:'+', n:'Thắng'}, thua:{c:'loss', s:'−', n:'Thua'}, hoa:{c:'even', s:'=', n:'Hoà'}};
const kqIcon = k => `<span class="kq ${KQ[k].c}" role="img" aria-label="${KQ[k].n}">${KQ[k].s}</span>`;
const LY_DO = {het_tim:'hết tim', diem:'so điểm', roi_tran:'rời trận', bo_cuoc:'bỏ cuộc', ca_hai_roi:'cả hai rời', hoa_thoa_thuan:'đồng ý hoà'};
function soloView(r){   // một trận nhìn từ phía mình
  const me = r.a === user.id ? 'a' : 'b', o = me === 'a' ? 'b' : 'a';
  const kq = !r.thang ? 'hoa' : r.thang === user.id ? 'thang' : 'thua';
  return {r, me, o, kq, opp: r[o], eloTruoc: r['elo_' + me], doi: r['doi_' + me] || 0, eloOpp: r['elo_' + o]};
}
async function hoSoScreen(tab = 'stats'){
  if(!ranked || !sb){ toast('Đăng nhập để xem thống kê'); return }
  rpStop();
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Hồ sơ</div><button class="link" id="back">Đóng</button></div>
    <div class="me has-av">${avatarHTML(profile.avatar_url, profile.ten, 48, 'me-av')}<div class="nm">${esc(profile.ten)}</div>
      <div class="sub">${esc(profile.lop)} · ${esc(khoaTen(profile.khoa_id))}</div><div class="pts">${profile.elo ?? 1200}<small>Elo solo</small></div></div>
    <div class="tabs" role="tablist">${[['stats','Thống kê'],['games','Ván solo'],['runs','Lượt bán']].map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div>
    <div class="col" id="hsBody"><div class="empty-state">Đang tải…</div></div>`);
  $('back').onclick = home;
  $('ov').querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-t]'); if(b) hoSoScreen(b.dataset.t) };
  const body = $('hsBody');
  if(tab === 'games') return gamesTab(body, 0);
  if(tab === 'runs') return runsTab(body);
  return statsTab(body);
}
const back2 = tab => () => hoSoScreen(tab);
async function oppMap(ids){
  if(!ids.length) return new Map();
  const {data} = await sb.from('profiles').select('id,ten,lop,avatar_url').in('id', [...new Set(ids)]);
  return new Map((data || []).map(p => [p.id, p]));
}
async function gamesTab(body, from){
  const N = 20;
  const {data, error} = await sb.from('thach_dau').select('id,a,b,do_kho,che_do,thang,ly_do,elo_a,elo_b,doi_a,doi_b,ket_thuc,a_doanh_thu,b_doanh_thu,a_tim_mat,b_tim_mat')
    .eq('trang_thai', 'xong').order('ket_thuc', {ascending:false}).range(from, from + N - 1);
  if(!$('hsBody')) return;
  if(error){ body.innerHTML = `<div class="empty-state">Không tải được: ${esc(error.message)}</div>`; return }
  const rows = (data || []).map(soloView);
  if(!rows.length && !from){ body.innerHTML = '<div class="empty-state">Bạn chưa đấu trận solo nào. Vào Bảng xếp hạng, bấm tên một bạn để thách đấu.</div>'; return }
  const om = await oppMap(rows.map(v => v.opp));
  const {data: bg} = rows.length ? await sb.from('ban_ghi').select('thach_dau_id').in('thach_dau_id', rows.map(v => v.r.id)) : {data: []};
  const coBG = new Set((bg || []).map(x => x.thach_dau_id));
  const html = rows.map(v => { const p = om.get(v.opp) || {ten:'Người chơi'};
    return `<button type="button" class="li game" data-id="${v.r.id}">${kqIcon(v.kq)}
      <span class="nm with-av">${avatarHTML(p.avatar_url, p.ten, 34)}<span>${esc(p.ten)}${v.eloOpp != null ? ` <small class="muted">(${v.eloOpp})</small>` : ''}
        <span class="sb">${DIFF[v.r.do_kho].n} · ${CHE_DO[v.r.che_do].n} · ${LY_DO[v.r.ly_do] || ''} · ${fmtNgay(v.r.ket_thuc)}</span></span></span>
      <span class="pt"><span class="elo-doi">${v.doi > 0 ? '+' : v.doi < 0 ? '−' : '±'}${Math.abs(v.doi)}</span>${coBG.has(v.r.id) ? '<small class="xem">Xem lại ›</small>' : ''}</span></button>` }).join('');
  if(!from) body.innerHTML = `<div class="list games" id="gList"></div>`;
  $('gList').insertAdjacentHTML('beforeend', html);
  body.querySelector('#gMore')?.remove();
  if(rows.length === N) body.insertAdjacentHTML('beforeend', '<button type="button" class="btn ghost" id="gMore">Xem thêm</button>');
  $('gMore') && ($('gMore').onclick = () => gamesTab(body, from + N));
  $('gList').onclick = e => { const b = e.target.closest('[data-id]'); if(!b) return; const v = rows.find(x => x.r.id === +b.dataset.id); if(!v) return;
    const p = om.get(v.opp) || {ten:'Đối thủ'};
    replayScreen({thach_dau: v.r.id, back: back2('games'), title: `${tenNgan(profile.ten)} vs ${tenNgan(p.ten)}`,
      sub: `${KQ[v.kq].n} · ${DIFF[v.r.do_kho].n} · ${CHE_DO[v.r.che_do].n} · ${fmtNgay(v.r.ket_thuc)}`}) };
}
async function runsTab(body){
  const {data, error} = await sb.from('runs').select('id,do_kho,trang_thai,so_ngay,doanh_thu,tim_mat,delta,ket_thuc')
    .eq('user_id', user.id).neq('trang_thai', 'dang_choi').order('ket_thuc', {ascending:false}).limit(50);
  if(!$('hsBody')) return;
  if(error){ body.innerHTML = `<div class="empty-state">Không tải được: ${esc(error.message)}</div>`; return }
  if(!data || !data.length){ body.innerHTML = '<div class="empty-state">Bạn chưa có lượt bán nào được tính điểm.</div>'; return }
  const {data: bg} = await sb.from('ban_ghi').select('run_id').in('run_id', data.map(r => r.id));
  const coBG = new Set((bg || []).map(x => x.run_id));
  body.innerHTML = `<p class="muted">50 lượt gần nhất. Bản ghi để xem lại được giữ cho 50 lượt mới nhất.</p><div class="list games" id="rList">${data.map(r => {
    const d = r.delta || 0, k = r.trang_thai === 'bo_cuoc' ? 'thua' : d > 0 ? 'thang' : d < 0 ? 'thua' : 'hoa';
    return `<button type="button" class="li game" data-id="${r.id}" ${coBG.has(r.id) ? '' : 'data-no="1"'}>${kqIcon(k)}
      <span class="nm"><span>${DIFF[r.do_kho].n} · ${r.trang_thai === 'bo_cuoc' ? 'bỏ dở' : `trụ ${r.so_ngay} ngày`}</span>
        <span class="sb">${r.doanh_thu || 0}k doanh thu · mất ${r.tim_mat || 0} tim · ${fmtNgay(r.ket_thuc)}</span></span>
      <span class="pt"><span class="elo-doi">${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}</span>${coBG.has(r.id) ? '<small class="xem">Xem lại ›</small>' : ''}</span></button>` }).join('')}</div>`;
  $('rList').onclick = e => { const b = e.target.closest('[data-id]'); if(!b) return; if(b.dataset.no){ toast('Lượt này không có bản ghi'); return }
    const r = data.find(x => x.id === +b.dataset.id);
    replayScreen({run: r.id, back: back2('runs'), title: `Lượt bán ${DIFF[r.do_kho].n}`, sub: `${r.so_ngay} ngày · ${r.delta > 0 ? '+' : ''}${r.delta} ĐBK · ${fmtNgay(r.ket_thuc)}`}) };
}
async function statsTab(body){
  const [{data: tr}, {data: rs}] = await Promise.all([
    sb.from('thach_dau').select('id,a,b,che_do,do_kho,thang,elo_a,elo_b,doi_a,doi_b,ket_thuc').eq('trang_thai', 'xong').order('ket_thuc', {ascending:true}).limit(1000),
    sb.from('runs').select('id,do_kho,trang_thai,so_ngay,doanh_thu,delta,ket_thuc').eq('user_id', user.id).neq('trang_thai', 'dang_choi').order('ket_thuc', {ascending:true}).limit(1000)]);
  if(!$('hsBody')) return;
  const games = (tr || []).map(soloView), runs = rs || [];
  const W = games.filter(g => g.kq === 'thang').length, L = games.filter(g => g.kq === 'thua').length, Dr = games.length - W - L;
  const pct = n => games.length ? Math.round(n / games.length * 100) : 0;
  const eloSeries = games.map(g => ({t: g.r.ket_thuc, v: (g.eloTruoc ?? 1200) + g.doi, g}));
  const eloMax = Math.max(1200, profile.elo ?? 1200, ...eloSeries.map(x => x.v));
  const theo = md => { const gs = games.filter(g => g.r.che_do === md), w = gs.filter(g => g.kq === 'thang').length;
    return gs.length ? `${w}/${gs.length} thắng (${Math.round(w / gs.length * 100)}%)` : 'chưa đấu' };
  const tot = runs.length, loi = runs.filter(r => (r.delta || 0) > 0).length;
  const avg = tot ? Math.round(runs.reduce((s, r) => s + (r.delta || 0), 0) / tot) : 0;
  const best = runs.reduce((b, r) => !b || (r.delta || 0) > (b.delta || 0) ? r : b, null);
  const dai = Math.max(profile.ngay_xa_nhat || 0, ...runs.map(r => r.so_ngay || 0));
  const st = streakState();
  const byDiff = Object.keys(DIFF).map(k => { const xs = runs.filter(r => r.do_kho === k); if(!xs.length) return '';
    return `<tr><td>${DIFF[k].n}</td><td>${xs.length}</td><td>${Math.round(xs.reduce((s, r) => s + (r.delta || 0), 0) / xs.length)}</td>
      <td>${Math.max(...xs.map(r => r.delta || 0))}</td><td>${Math.max(...xs.map(r => r.so_ngay || 0))}</td></tr>` }).join('');
  body.innerHTML = `
    <section class="card-s"><h3>Solo</h3>
      <div class="tiles"><div class="tile"><span>Elo hiện tại</span><b>${profile.elo ?? 1200}</b></div><div class="tile"><span>Elo cao nhất</span><b>${eloMax}</b></div>
        <div class="tile"><span>Số trận</span><b>${games.length}</b></div></div>
      ${games.length ? `<div class="wdl" role="img" aria-label="Thắng ${pct(W)}%, hoà ${pct(Dr)}%, thua ${pct(L)}%">
          ${W ? `<i class="win" style="flex:${W}"></i>` : ''}${Dr ? `<i class="even" style="flex:${Dr}"></i>` : ''}${L ? `<i class="loss" style="flex:${L}"></i>` : ''}</div>
        <div class="wdl-l"><span>${kqIcon('thang')} Thắng <b>${W}</b> · ${pct(W)}%</span><span>${kqIcon('hoa')} Hoà <b>${Dr}</b> · ${pct(Dr)}%</span><span>${kqIcon('thua')} Thua <b>${L}</b> · ${pct(L)}%</span></div>
        <div class="muted">Sinh tồn: ${theo('sinh_ton')} · Điểm cao: ${theo('diem')}</div>
        <div class="chart-t">Elo sau mỗi trận</div><div class="chart" id="cElo"></div>` : '<p class="muted">Chưa có trận solo nào.</p>'}
    </section>
    <section class="card-s"><h3>Mở quán (chế độ thường)</h3>
      <div class="tiles"><div class="tile"><span>ĐBK hiện có</span><b>${profile.diem}</b></div><div class="tile"><span>Số lượt</span><b>${tot}</b></div>
        <div class="tile"><span>TB mỗi lượt</span><b>${avg > 0 ? '+' : avg < 0 ? '−' : ''}${Math.abs(avg)}</b></div>
        <div class="tile"><span>Lượt có lời</span><b>${tot ? Math.round(loi / tot * 100) : 0}%</b></div>
        <div class="tile"><span>Trụ lâu nhất</span><b>${dai} ngày</b></div>
        <div class="tile"><span>Lượt tốt nhất</span><b>${best ? (best.delta > 0 ? '+' : '') + best.delta : '—'}</b></div></div>
      <div class="streak-pill ${st.lit ? 'on' : ''}">${flameSVG(st.lit)}<b>${st.n}</b><span>ngày liên tiếp hiện tại · dài nhất <b>${profile.chuoi_dai_nhat || st.best || 0}</b> ngày</span></div>
      ${tot ? `<div class="chart-t">ĐBK từng lượt (${Math.min(tot, 40)} lượt gần nhất)</div><div class="chart" id="cRuns"></div>
        <div style="overflow-x:auto"><table class="tb"><tr><th>Độ khó</th><th>Số lượt</th><th>TB ĐBK</th><th>Tốt nhất</th><th>Trụ lâu nhất</th></tr>${byDiff}</table></div>` : '<p class="muted">Chưa có lượt bán nào được tính điểm.</p>'}
    </section>`;
  if(games.length) lineChart($('cElo'), eloSeries.map((x, k) => ({x:k, y:x.v, tip:`Trận ${k + 1} · ${KQ[x.g.kq].n} · ${x.g.doi > 0 ? '+' : ''}${x.g.doi} → <b>${x.v}</b><br>${fmtNgay(x.t)}`})));
  if(tot) barChart($('cRuns'), runs.slice(-40).map(r => ({y:r.delta || 0, tip:`${DIFF[r.do_kho].n} · ${r.trang_thai === 'bo_cuoc' ? 'bỏ dở' : r.so_ngay + ' ngày'} · <b>${(r.delta || 0) > 0 ? '+' : ''}${r.delta || 0} ĐBK</b><br>${fmtNgay(r.ket_thuc)}`})));
}

/* ---- Biểu đồ nhỏ (SVG) kèm chú thích khi rê/chạm ---- */
function chartTip(host, html, x, y){
  let t = host.querySelector('.ctip'); if(!t){ t = document.createElement('div'); t.className = 'ctip'; host.appendChild(t) }
  if(html == null){ t.hidden = true; return }
  t.hidden = false; t.innerHTML = html;
  const w = host.clientWidth; t.style.left = Math.min(Math.max(x - 70, 0), w - 150) + 'px'; t.style.top = Math.max(y - 64, 0) + 'px';
}
function lineChart(host, pts){
  const W = host.clientWidth || 320, H = 150, P = {l:38, r:10, t:12, b:20};
  const ys = pts.map(p => p.y), lo = Math.min(...ys, 1200) - 10, hi = Math.max(...ys, 1200) + 10;
  const X = k => P.l + (pts.length < 2 ? (W - P.l - P.r) / 2 : k / (pts.length - 1) * (W - P.l - P.r)), Y = v => P.t + (hi - v) / (hi - lo) * (H - P.t - P.b);
  const ticks = [lo + 10, Math.round((lo + hi) / 2), hi - 10];
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Elo từ ${ys[0]} đến ${ys[ys.length - 1]} qua ${pts.length} trận">
    ${ticks.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${P.l - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${Math.round(v)}</text>`).join('')}
    <polyline points="${pts.map((p, k) => `${X(k)},${Y(p.y)}`).join(' ')}" class="ln"/>
    <circle cx="${X(pts.length - 1)}" cy="${Y(ys[ys.length - 1])}" r="4" class="dot"/>
    <line class="xh" y1="${P.t}" y2="${H - P.b}" x1="-9" x2="-9"/><circle class="dot hov" r="5" cx="-9" cy="-9"/></svg>`;
  const svg = host.querySelector('svg'), xh = svg.querySelector('.xh'), hv = svg.querySelector('.hov');
  const move = e => { const r = svg.getBoundingClientRect(), mx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    let k = Math.round((mx - P.l) / Math.max(1, W - P.l - P.r) * (pts.length - 1)); k = Math.max(0, Math.min(pts.length - 1, k));
    xh.setAttribute('x1', X(k)); xh.setAttribute('x2', X(k)); hv.setAttribute('cx', X(k)); hv.setAttribute('cy', Y(pts[k].y));
    chartTip(host, pts[k].tip, X(k), Y(pts[k].y)) };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => { xh.setAttribute('x1', -9); xh.setAttribute('x2', -9); hv.setAttribute('cx', -9); chartTip(host, null) });
}
function barChart(host, bars){
  const W = host.clientWidth || 320, H = 150, P = {l:38, r:6, t:10, b:10};
  const m = Math.max(10, ...bars.map(b => Math.abs(b.y))), Y = v => P.t + (m - v) / (2 * m) * (H - P.t - P.b), y0 = Y(0);
  const bw = (W - P.l - P.r) / bars.length, gap = Math.min(2, bw * .25), w = Math.max(1, bw - gap);
  const rr = Math.min(4, w / 2);
  const path = (x, v) => { const y = Y(v), h = Math.abs(y - y0); if(h < .5) return '';
    return v > 0 ? `M${x},${y0}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y0}Z`
                 : `M${x},${y0}V${y - rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y - rr}V${y0}Z` };
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="ĐBK của ${bars.length} lượt gần nhất">
    <text x="${P.l - 6}" y="${Y(m) + 8}" class="ax" text-anchor="end">+${m}</text><text x="${P.l - 6}" y="${Y(-m)}" class="ax" text-anchor="end">−${m}</text>
    <line x1="${P.l}" x2="${W - P.r}" y1="${y0}" y2="${y0}" class="base"/><text x="${P.l - 6}" y="${y0 + 4}" class="ax" text-anchor="end">0</text>
    ${bars.map((b, k) => `<path d="${path(P.l + k * bw, b.y)}" class="${b.y >= 0 ? 'up' : 'down'}"/><rect x="${P.l + k * bw}" y="${P.t}" width="${bw}" height="${H - P.t - P.b}" class="hit" data-k="${k}"/>`).join('')}</svg>`;
  const svg = host.querySelector('svg');
  const show = e => { const r = e.target.closest('.hit'); if(!r){ chartTip(host, null); return } const k = +r.dataset.k;
    svg.querySelectorAll('path').forEach((p, j) => p.style.opacity = j === k ? 1 : .55); chartTip(host, bars[k].tip, P.l + k * bw + bw / 2, Y(Math.max(0, bars[k].y))) };
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', () => { svg.querySelectorAll('path').forEach(p => p.style.opacity = 1); chartTip(host, null) });
}
