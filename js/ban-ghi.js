/* Mì Quảng Bách Khoa · ban-ghi.js
   1. Bộ ghi thao tác: mỗi sự kiện của lượt chơi / trận solo được ghi kèm thời điểm (ms tính từ lúc bắt đầu),
      lưu cùng bản lưu máy (mqbk-run) và gửi lên server (bảng ban_ghi) khi kết thúc.
   2. Màn xem lại: dựng lại quán từ danh sách sự kiện, xem hai người cạnh nhau, phát/tua/đổi tốc độ.
   3. Hồ sơ (của mình hoặc người khác): Thống kê (solo + mở quán), Ván solo (kiểu chess.com), Lượt bán.
   4. Xem trực tiếp người đang bán / đang solo qua Realtime Broadcast, hết trận thì mời thách đấu.
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
async function replayScreen(o){   // o = {thach_dau, run, back, title, sub, first: id người hiện bên trái}
  rpStop(); xemStop();
  nhoMan('xemlai', o.thach_dau ? 'td' : 'run', o.thach_dau || o.run, o.first || null, o.title || '', o.sub || '');
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
  const first = o.first || user.id;
  data.sort((a, b) => (a.user_id === first ? -1 : b.user_id === first ? 1 : 0));
  const players = data.map(d => ({id: d.user_id, ten: pmap.get(d.user_id)?.ten || 'Người chơi', av: pmap.get(d.user_id)?.avatar_url,
    ev: d.du_lieu.ev || [], st: rpNew(), dk: d.du_lieu.diff}));
  const dur = Math.max(...players.map(p => p.ev.length ? p.ev[p.ev.length - 1][0] : 0)) + 1000;
  const {data: kr} = o.thach_dau ? await sb.from('thach_dau').select('id,a,b,thang,ly_do,doi_a,doi_b,a_doanh_thu,b_doanh_thu,a_tim_mat,b_tim_mat,do_kho').eq('id', o.thach_dau).maybeSingle()
    : await sb.from('runs').select('id,trang_thai,so_ngay,doanh_thu,tim_mat,delta').eq('id', o.run).maybeSingle();
  if(!$('back')) return;
  players.forEach(p => { p.kq = !kr ? null : o.thach_dau ? (!kr.thang ? 'hoa' : kr.thang === p.id ? 'thang' : 'thua')
    : (kr.trang_thai === 'bo_cuoc' || (kr.delta || 0) < 0 ? 'thua' : (kr.delta || 0) > 0 ? 'thang' : 'hoa') });
  RP = {players, T: 0, dur, speed: 1, playing: false, last: 0, o, kr, ketOn: null};
  const ks = ING_KEYS();
  const days = []; players[0].ev.forEach(e => { if(e[1] === 'D') days.push([e[0], e[2]]) });
  // Người khác trong trận / lượt này: có nút thách đấu và kết bạn ngay trên màn xem lại
  const khac = [...new Set(o.thach_dau && kr ? [kr.a, kr.b] : players.map(p => p.id))].filter(id => id && id !== user.id);
  await bbHoSo(khac);
  if(!$('back')) return;
  const moves = [];
  players.forEach((p, pi) => p.ev.forEach(e => { const l = rpLine(e, ks); if(l) moves.push({t: e[0], pi, l, kind: e[1]}) }));
  moves.sort((a, b) => a.t - b.t);
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${esc(o.sub || 'Xem lại')}</div><button class="link" id="back">Đóng</button></div>
    <h2>${esc(o.title || 'Xem lại')}</h2>
    ${khac.length ? `<div class="row rp-act">${khac.map(id => `<button type="button" class="btn ghost" data-rp-thach="${id}">Thách đấu ${esc(tenNgan(bbTen(id)))}</button><span class="kb-row" data-kb-slot="${id}" data-kb-an="ban">${kbNut(id, 'ban')}</span>`).join('')}</div>` : ''}
    ${players.length < 2 && o.thach_dau ? '<p class="muted">Chỉ có bản ghi của một bên (bên kia đang dùng bản game cũ hoặc chưa gửi kịp).</p>' : ''}
    <div class="rp-stage n${players.length}" id="rpStage">${players.map((p, i) => `<div class="rp-view" id="rpv${i}"></div>`).join('')}</div>
    <div class="rp-ket" id="rpKet" role="status" hidden></div>
    <div class="rp-ctl">
      <div class="rp-btns">
        <button type="button" class="pz rp-ic" id="rpDau" aria-label="Về đầu trận" title="Về đầu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h2.5v16H5zM20 4v16L8.5 12z" fill="currentColor"/></svg></button>
        <button type="button" class="pz" id="rpBack10" aria-label="Lùi 10 giây">−10s</button>
        <button type="button" class="btn rp-play" id="rpPlay" aria-label="Phát">Phát</button>
        <button type="button" class="pz" id="rpFwd10" aria-label="Tiến 10 giây">+10s</button>
        <button type="button" class="pz rp-ic" id="rpCuoi" aria-label="Đến cuối trận, xem kết quả" title="Đến cuối"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 4H19v16h-2.5zM4 4v16l11.5-8z" fill="currentColor"/></svg></button>
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
  $('rpDau').onclick = () => { rpPause(); rpSeek(0) };
  $('rpCuoi').onclick = () => { rpPause(); rpSeek(RP.dur); const k = $('rpKet'); if(k && !k.hidden) k.scrollIntoView({block:'nearest', behavior:'smooth'}) };
  $('rpSeek').oninput = e => rpSeek(+e.target.value);
  $('ov').querySelector('.rp-speed').onclick = e => { const b = e.target.closest('[data-s]'); if(!b) return; RP.speed = +b.dataset.s;
    $('ov').querySelectorAll('.rp-speed button').forEach(x => x.setAttribute('aria-pressed', x === b)) };
  $('ov').querySelector('.rp-act')?.addEventListener('click', e => { const b = e.target.closest('[data-rp-thach]'); if(!b) return;
    const id = b.dataset.rpThach, p = BB.hs.get(id) || {id, ten: bbTen(id)}; rpStop();
    if(onlineSt.get(id) === 'solo') return watchScreen(id, () => replayScreen(o));
    challengeScreen(p, () => replayScreen(o)) });
  $('rpStage').onclick = e => { const b = e.target.closest('[data-hs]'); if(b && b.dataset.hs){ rpStop(); hoSoScreen('stats', b.dataset.hs, () => replayScreen(o)) } };
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
  rpKet(T >= RP.dur - 50 || RP.players.every(p => p.st.ended));
  if(!playing){ RP.last = performance.now() }
  const s = $('rpSeek'); if(s && document.activeElement !== s) s.value = T;
  const n = $('rpNow'); if(n) n.textContent = mmss(T);
  RP.players.forEach((p, i) => rpDraw(p, i, T));
  const ml = $('rpMoves'); if(ml){ let cur = null; ml.querySelectorAll('.rp-mv').forEach(b => { const on = +b.dataset.t <= T; b.classList.toggle('done', on); if(on) cur = b });
    ml.querySelectorAll('.rp-mv.cur').forEach(b => b.classList.remove('cur')); if(cur) cur.classList.add('cur') }
}
// Kết quả cuối trận: ai thắng ai thua (solo) hoặc lượt bán được bao nhiêu ĐBK, hiện khi tua tới cuối
function rpKet(on){
  const box = $('rpKet'); if(!box || !RP || !RP.kr) return;
  on = !!on; if(RP.ketOn === on) return; RP.ketOn = on;
  RP.players.forEach(p => p.ketTag = on && p.kq ? `<span class="rp-kq ${KQ[p.kq].c}">${KQ[p.kq].n}</span>` : '');
  box.hidden = !on; if(!on){ box.innerHTML = ''; return }
  const r = RP.kr, ps = RP.players, ten = id => esc(tenNgan((ps.find(p => p.id === id) || {}).ten || 'Đối thủ'));
  if(RP.o.thach_dau){
    const doi = id => { const s = r.a === id ? 'a' : 'b', d = r['doi_' + s] || 0, dk = diemSolo(r.do_kho, r[s + '_doanh_thu'] || 0, r[s + '_tim_mat'] || 0);
      return `<span>${ten(id)}: ${dk} ĐBK · <b>${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} Elo</b></span>` };
    box.className = 'rp-ket ' + (r.thang ? 'win' : 'even');
    box.innerHTML = `<div class="rp-ket-t">${r.thang ? `${kqIcon('thang')} <b>${ten(r.thang)} thắng</b>${(() => { const l = r.thang === r.a ? r.b : r.a; return ` · ${ten(l)} thua` })()}`
      : `${kqIcon('hoa')} <b>Hoà</b>`}<small>${LY_DO[r.ly_do] || ''}</small></div><div class="rp-ket-s">${doi(r.a)}${doi(r.b)}</div>`;
  } else {
    const p = ps[0], d = r.delta || 0;
    box.className = 'rp-ket ' + KQ[p.kq].c;
    box.innerHTML = `<div class="rp-ket-t">${kqIcon(p.kq)} <b>${r.trang_thai === 'bo_cuoc' ? 'Bỏ dở' : `Trụ ${r.so_ngay} ngày`}</b><small>${d > 0 ? 'có lời' : d < 0 ? 'lỗ' : 'hoà vốn'}</small></div>
      <div class="rp-ket-s"><span>${r.doanh_thu || 0}k doanh thu · mất ${r.tim_mat || 0} tim</span><span><b>${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} ĐBK</b></span></div>`;
  }
}
function rpDraw(p, i, T){
  const el = $('rpv' + i); if(!el) return;
  const st = p.st, rem = rpRem(st, T), dayT = DAYLEN - rem, rush = st.running && rem <= RUSH[1] && rem > RUSH[0];
  const bar = (r) => { const v = Math.max(0, Math.min(1, r)); return `<div class="pat"><i style="width:${v * 100}%;background:${v > .5 ? 'var(--leaf)' : v > .25 ? 'var(--turmeric)' : 'var(--chili)'}"></i></div>` };
  const ratio = k => k.r - (T - k.at) / 1000 / k.max, qratio = k => k.qr - (T - k.qat) / 1000 / k.qmax;
  const hearts = Array.from({length:5}, (_, k) => `<svg viewBox="0 0 24 22" aria-hidden="true"><path d="${HEART_PATH}" fill="${k < st.rep ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/></svg>`).join('');
  // Đầu quán (avatar + tên) dựng một lần và giữ nguyên, để bấm vào mở hồ sơ không bị mất khi khung hình vẽ lại
  if(el.dataset.who !== String(p.id)){
    el.dataset.who = p.id;
    el.innerHTML = `<div class="rp-head"><button type="button" class="rp-who" data-hs="${p.id || ''}" aria-label="Xem hồ sơ ${esc(p.ten)}">${avatarHTML(p.av, p.ten, 28)}<b>${esc(tenNgan(p.ten))}</b></button><span class="rp-hr"></span></div><div class="rp-body"></div>`;
  }
  el.querySelector('.rp-hr').innerHTML = `${p.ketTag || ''}<span class="hearts">${hearts}</span>`;
  el.querySelector('.rp-body').innerHTML = `
    <div class="rp-stats"><span>Ngày <b>${st.day || 1}</b></span><span>${st.shop ? 'Cửa hàng' : st.ended ? 'Đã xong' : `<b>${Math.ceil(rem)}</b>s`}</span>
      <span>Hôm nay <b>${st.earned}${st.target ? '/' + st.target : ''}k</b></span><span>Tổng <b>${st.total}k</b></span>${rush ? '<span class="tag rush">Cao điểm</span>' : ''}</div>
    <div class="rp-tables" style="--n:${st.n}">${st.slots.map((k, j) => k ? `<div class="rp-c${k.teacher ? ' teacher' : ''}"><span class="ava" style="background:${k.kh[2]}">${k.teacher ? 'Thầy' : k.kh[0]}</span>
      <span class="order">${k.order.map(icon).join('')}</span>${bar(ratio(k))}</div>` : `<div class="rp-c empty">Bàn ${j + 1}</div>`).join('')}</div>
    <div class="rp-q">${st.queue.length ? `Xếp hàng ${st.queue.map(k => `<i style="--c:${k.kh[2]};box-shadow:0 0 0 2px ${qratio(k) > .5 ? 'var(--leaf)' : qratio(k) > .25 ? 'var(--turmeric)' : 'var(--chili)'}"></i>`).join('')}` : '&nbsp;'}</div>
    <div class="rp-bowl"><span class="rp-b">${st.bowl.length ? st.bowl.map(icon).join('') : '<em>Tô trống</em>'}</span>${st.broth ? '<span class="tag broth">Đã chan</span>' : ''}</div>
    <div class="rp-log">${st.log.slice().reverse().map((l, k) => `<span class="${l.kind}" style="opacity:${1 - k * .25}">${esc(l.txt)}</span>`).join('')}</div>`;
}

/* ================= 3. Hồ sơ: Thống kê · Ván solo · Lượt bán (của mình hoặc của bất kỳ ai) ================= */
const fmtNgay = iso => { if(!iso) return ''; const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', year:'numeric'}) + ' · ' +
    d.toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit', minute:'2-digit'}) };
const KQ = {thang:{c:'win', s:'+', n:'Thắng'}, thua:{c:'loss', s:'−', n:'Thua'}, hoa:{c:'even', s:'=', n:'Hoà'}};
const kqIcon = k => `<span class="kq ${KQ[k].c}" role="img" aria-label="${KQ[k].n}">${KQ[k].s}</span>`;
const LY_DO = {het_tim:'hết tim', diem:'so điểm', roi_tran:'rời trận', bo_cuoc:'bỏ cuộc', ca_hai_roi:'cả hai rời', hoa_thoa_thuan:'đồng ý hoà'};
function soloView(r, uid = user.id){   // một trận nhìn từ phía người chơi uid
  const me = r.a === uid ? 'a' : 'b', o = me === 'a' ? 'b' : 'a';
  const kq = !r.thang ? 'hoa' : r.thang === uid ? 'thang' : 'thua';
  return {r, me, o, kq, opp: r[o], eloTruoc: r['elo_' + me], doi: r['doi_' + me] || 0, eloOpp: r['elo_' + o]};
}
const PROF_COT = 'id,ten,lop,khoa_id,sinh_vien,diem,elo,solo_thang,solo_thua,solo_hoa,avatar_url,ngay_xa_nhat,chuoi,chuoi_dai_nhat,ngay_chuoi';
let HS = null;   // hồ sơ đang xem: {uid, who, back, self}
// Chuỗi ngày của người khác: tính từ các cột trong profiles giống streakState()
const chuoiCua = w => { const lit = w.ngay_chuoi === vnDate(), alive = lit || w.ngay_chuoi === vnDate(-1);
  return {n: alive ? w.chuoi || 0 : 0, lit, best: w.chuoi_dai_nhat || 0} };
async function hoSoScreen(tab = 'stats', uid = null, back = null){
  if(!ranked || !sb){ toast('Đăng nhập để xem hồ sơ'); return }
  rpStop(); xemStop();
  const self = !uid || uid === user.id; uid = self ? user.id : uid;
  nhoMan('hoso', tab, self ? null : uid);
  if(back || !HS || HS.uid !== uid) HS = {uid, self, back: back || home, who: self ? profile : null};
  if(self) HS.who = profile;
  if(!HS.who){
    openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Hồ sơ</div><button class="link" id="back">Đóng</button></div><div class="empty-state">Đang tải hồ sơ…</div>`);
    $('back').onclick = HS.back;
    const h = HS, {data, error} = await sb.from('profiles').select(PROF_COT).eq('id', uid).maybeSingle();
    if(HS !== h || !$('back')) return;
    if(!data){ $('ov').querySelector('.empty-state').textContent = error ? 'Không tải được: ' + error.message : 'Không tìm thấy người chơi này.'; return }
    h.who = data;
  }
  const w = HS.who;
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Hồ sơ${self ? ' của bạn' : ''}</div><button class="link" id="back">Đóng</button></div>
    <div class="me has-av">${avatarHTML(w.avatar_url, w.ten, 48, 'me-av')}<div class="nm">${self ? '' : `<span class="dot" data-online="${w.id}" ${onlineSet.has(w.id) ? '' : 'hidden'}></span>`}${esc(w.ten)}${self ? '' : ' ' + stBadge(w.id)}</div>
      <div class="sub">${lopKhoaHTML(w)}</div>
      <div class="pts2"><div><span class="hang-row">${hangLogo(w.diem, 34)}<b>${w.diem ?? 0}</b></span><small id="hsRkD">ĐBK${self && myRank ? ` · #${myRank}` : ''}</small><small>${hangDBK(w.diem).n}</small></div>
        <div><b>${w.elo ?? 1200}</b><small id="hsRkE">Elo solo</small><small>${eloTitle(w.elo, 1)}</small></div></div></div>
    ${self ? '' : `<div class="row hs-act"><button type="button" class="btn" id="hsThach" data-thach="${w.id}">Thách đấu</button>
      <button type="button" class="btn ghost live-btn" id="hsXem" data-xem="${w.id}" hidden><i class="live-dot" aria-hidden="true"></i>Xem trực tiếp</button>
      <span class="kb-row" data-kb-slot="${w.id}">${kbNut(w.id)}</span></div>`}
    <div class="tabs" role="tablist">${[['stats','Thống kê'],['games','Ván solo'],['runs','Lượt bán']].map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div>
    <div class="col" id="hsBody"><div class="empty-state">Đang tải…</div></div>`);
  $('back').onclick = HS.back;
  hoSoHang(HS);
  const me = () => hoSoScreen(tab, uid);
  if(!self){
    $('hsThach').onclick = () => { if(onlineSt.get(uid) === 'solo') return watchScreen(uid, me); challengeScreen(w, me) };
    $('hsXem').onclick = () => watchScreen(uid, me);
    applyPresence();
  }
  $('ov').querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-t]'); if(b) hoSoScreen(b.dataset.t, uid) };
  const body = $('hsBody');
  if(tab === 'games') return gamesTab(body, 0);
  if(tab === 'runs') return runsTab(body);
  return statsTab(body);
}
// Hạng ĐBK (bảng sinh viên) và hạng Elo solo (1 + số người Elo cao hơn, giống tab Solo của bảng xếp hạng)
async function hoSoHang(h){
  const w = h.who, gan = (id, t) => { const el = $(id); if(el && HS === h) el.textContent = t };
  if(!h.hangD) h.hangD = (h.self && myRank) || (await sb.from('bxh_sinh_vien').select('hang').eq('id', h.uid).maybeSingle()).data?.hang || null;
  if(h.hangD) gan('hsRkD', `ĐBK · hạng #${h.hangD}`);
  if(!h.hangE){ const {data} = await sb.from('profiles').select('id').gt('elo', w.elo ?? 1200).limit(1000); if(data) h.hangE = data.length + 1 }
  if(h.hangE) gan('hsRkE', `Elo · hạng #${h.hangE}`);
}
const back2 = tab => { const uid = HS.uid; return () => hoSoScreen(tab, uid) };
const tenHS = () => HS.self ? 'Bạn' : tenNgan(HS.who.ten);
async function oppMap(ids){
  if(!ids.length) return new Map();
  const {data} = await sb.from('profiles').select('id,ten,lop,elo,avatar_url').in('id', [...new Set(ids)]);
  return new Map((data || []).map(p => [p.id, p]));
}
// Trận đã xong của một người (sau khi mở hồ sơ công khai, RLS cho đọc mọi trận đã xong nên phải lọc theo người)
const tranCua = (uid, cot) => sb.from('thach_dau').select(cot).or(`a.eq.${uid},b.eq.${uid}`).eq('trang_thai', 'xong');
async function gamesTab(body, from){
  const N = 20, h = HS, uid = h.uid;
  const {data, error} = await tranCua(uid, 'id,a,b,do_kho,che_do,thang,ly_do,elo_a,elo_b,doi_a,doi_b,ket_thuc,a_doanh_thu,b_doanh_thu,a_tim_mat,b_tim_mat')
    .order('ket_thuc', {ascending:false}).range(from, from + N - 1);
  if(!$('hsBody') || HS !== h) return;
  if(error){ body.innerHTML = `<div class="empty-state">Không tải được: ${esc(error.message)}</div>`; return }
  const rows = (data || []).map(r => soloView(r, uid));
  if(!rows.length && !from){ body.innerHTML = `<div class="empty-state">${h.self ? 'Bạn chưa đấu trận solo nào. Vào Bảng xếp hạng, bấm tên một bạn để thách đấu.' : `${esc(tenNgan(h.who.ten))} chưa đấu trận solo nào.`}</div>`; return }
  const om = await oppMap(rows.map(v => v.opp));
  const {data: bg} = rows.length ? await sb.from('ban_ghi').select('thach_dau_id').in('thach_dau_id', rows.map(v => v.r.id)) : {data: []};
  if(HS !== h) return;
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
    replayScreen({thach_dau: v.r.id, first: uid, back: back2('games'), title: `${tenNgan(h.who.ten)} vs ${tenNgan(p.ten)}`,
      sub: `${KQ[v.kq].n} · ${DIFF[v.r.do_kho].n} · ${CHE_DO[v.r.che_do].n} · ${fmtNgay(v.r.ket_thuc)}`}) };
}
async function runsTab(body){
  const h = HS;
  const {data, error} = await sb.from('runs').select('id,do_kho,trang_thai,so_ngay,doanh_thu,tim_mat,delta,ket_thuc')
    .eq('user_id', h.uid).neq('trang_thai', 'dang_choi').order('ket_thuc', {ascending:false}).limit(50);
  if(!$('hsBody') || HS !== h) return;
  if(error){ body.innerHTML = `<div class="empty-state">Không tải được: ${esc(error.message)}</div>`; return }
  if(!data || !data.length){ body.innerHTML = `<div class="empty-state">${h.self ? 'Bạn' : esc(tenNgan(h.who.ten))} chưa có lượt bán nào được tính điểm.</div>`; return }
  const {data: bg} = await sb.from('ban_ghi').select('run_id').in('run_id', data.map(r => r.id));
  if(HS !== h) return;
  const coBG = new Set((bg || []).map(x => x.run_id));
  body.innerHTML = `<p class="muted">50 lượt gần nhất. Bản ghi để xem lại được giữ cho 50 lượt mới nhất.</p><div class="list games" id="rList">${data.map(r => {
    const d = r.delta || 0, k = r.trang_thai === 'bo_cuoc' ? 'thua' : d > 0 ? 'thang' : d < 0 ? 'thua' : 'hoa';
    return `<button type="button" class="li game" data-id="${r.id}" ${coBG.has(r.id) ? '' : 'data-no="1"'}>${kqIcon(k)}
      <span class="nm"><span>${DIFF[r.do_kho].n} · ${r.trang_thai === 'bo_cuoc' ? 'bỏ dở' : `trụ ${r.so_ngay} ngày`}</span>
        <span class="sb">${r.doanh_thu || 0}k doanh thu · mất ${r.tim_mat || 0} tim · ${fmtNgay(r.ket_thuc)}</span></span>
      <span class="pt"><span class="elo-doi">${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}</span>${coBG.has(r.id) ? '<small class="xem">Xem lại ›</small>' : ''}</span></button>` }).join('')}</div>`;
  $('rList').onclick = e => { const b = e.target.closest('[data-id]'); if(!b) return; if(b.dataset.no){ toast('Lượt này không có bản ghi'); return }
    const r = data.find(x => x.id === +b.dataset.id);
    replayScreen({run: r.id, first: h.uid, back: back2('runs'), title: `${h.self ? 'Lượt bán' : tenNgan(h.who.ten) + ' bán'} ${DIFF[r.do_kho].n}`, sub: `${r.so_ngay} ngày · ${r.delta > 0 ? '+' : ''}${r.delta} ĐBK · ${fmtNgay(r.ket_thuc)}`}) };
}
async function statsTab(body){
  const h = HS, w = h.who;
  const [{data: tr}, {data: rs}] = await Promise.all([
    tranCua(h.uid, 'id,a,b,che_do,do_kho,thang,elo_a,elo_b,doi_a,doi_b,ket_thuc').order('ket_thuc', {ascending:true}).limit(1000),
    sb.from('runs').select('id,do_kho,trang_thai,so_ngay,doanh_thu,delta,ket_thuc').eq('user_id', h.uid).neq('trang_thai', 'dang_choi').order('ket_thuc', {ascending:true}).limit(1000)]);
  if(!$('hsBody') || HS !== h) return;
  const games = (tr || []).map(r => soloView(r, h.uid)), runs = rs || [];
  const W = games.filter(g => g.kq === 'thang').length, L = games.filter(g => g.kq === 'thua').length, Dr = games.length - W - L;
  const pct = n => games.length ? Math.round(n / games.length * 100) : 0;
  const eloSeries = games.map(g => ({t: g.r.ket_thuc, v: (g.eloTruoc ?? 1200) + g.doi, g}));
  const eloMax = Math.max(1200, w.elo ?? 1200, ...eloSeries.map(x => x.v));
  const theo = md => { const gs = games.filter(g => g.r.che_do === md), x = gs.filter(g => g.kq === 'thang').length;
    return gs.length ? `${x}/${gs.length} thắng (${Math.round(x / gs.length * 100)}%)` : 'chưa đấu' };
  const tot = runs.length, loi = runs.filter(r => (r.delta || 0) > 0).length;
  const avg = tot ? Math.round(runs.reduce((s, r) => s + (r.delta || 0), 0) / tot) : 0;
  const best = runs.reduce((b, r) => !b || (r.delta || 0) > (b.delta || 0) ? r : b, null);
  const dai = Math.max(w.ngay_xa_nhat || 0, ...runs.map(r => r.so_ngay || 0));
  const st = h.self ? streakState() : chuoiCua(w);
  const byDiff = Object.keys(DIFF).map(k => { const xs = runs.filter(r => r.do_kho === k); if(!xs.length) return '';
    return `<tr><td>${DIFF[k].n}</td><td>${xs.length}</td><td>${Math.round(xs.reduce((s, r) => s + (r.delta || 0), 0) / xs.length)}</td>
      <td>${Math.max(...xs.map(r => r.delta || 0))}</td><td>${Math.max(...xs.map(r => r.so_ngay || 0))}</td></tr>` }).join('');
  body.innerHTML = `
    <section class="card-s"><h3>Solo</h3>
      <div class="hang-the elo"><div class="hang-tt"><b>${eloTitle(w.elo)}</b><span class="muted">${(() => { const h = hangElo(w.elo); return h.ke ? `Còn <b>${h.ke.tu - (w.elo ?? 1200)}</b> Elo nữa lên ${eloTitle(h.ke.tu)}` : 'Danh hiệu cao nhất' })()}</span></div></div>
      <div class="tiles"><div class="tile"><span>Elo hiện tại</span><b>${w.elo ?? 1200}</b></div><div class="tile"><span>Elo cao nhất</span><b>${eloMax}</b></div>
        <div class="tile"><span>Số trận</span><b>${games.length}</b></div></div>
      ${games.length ? `<div class="wdl" role="img" aria-label="Thắng ${pct(W)}%, hoà ${pct(Dr)}%, thua ${pct(L)}%">
          ${W ? `<i class="win" style="flex:${W}"></i>` : ''}${Dr ? `<i class="even" style="flex:${Dr}"></i>` : ''}${L ? `<i class="loss" style="flex:${L}"></i>` : ''}</div>
        <div class="wdl-l"><span>${kqIcon('thang')} Thắng <b>${W}</b> · ${pct(W)}%</span><span>${kqIcon('hoa')} Hoà <b>${Dr}</b> · ${pct(Dr)}%</span><span>${kqIcon('thua')} Thua <b>${L}</b> · ${pct(L)}%</span></div>
        <div class="muted">Sinh tồn: ${theo('sinh_ton')} · Điểm cao: ${theo('diem')}</div>
        <div class="chart-t">Elo sau mỗi trận <span class="muted">· rê hoặc kéo ngang để xem từng trận</span></div><div class="chart" id="cElo"></div>` : '<p class="muted">Chưa có trận solo nào.</p>'}
    </section>
    <section class="card-s"><h3>Mở quán (chế độ thường)</h3>
      ${hangTheDBK(w.diem)}
      <div class="tiles"><div class="tile"><span>ĐBK hiện có</span><b>${w.diem}</b></div><div class="tile"><span>Số lượt</span><b>${tot}</b></div>
        <div class="tile"><span>TB mỗi lượt</span><b>${avg > 0 ? '+' : avg < 0 ? '−' : ''}${Math.abs(avg)}</b></div>
        <div class="tile"><span>Lượt có lời</span><b>${tot ? Math.round(loi / tot * 100) : 0}%</b></div>
        <div class="tile"><span>Trụ lâu nhất</span><b>${dai} ngày</b></div>
        <div class="tile"><span>Lượt tốt nhất</span><b>${best ? (best.delta > 0 ? '+' : '') + best.delta : '—'}</b></div></div>
      <div class="streak-pill ${st.lit ? 'on' : ''}">${flameSVG(st.lit)}<b>${st.n}</b><span>ngày liên tiếp hiện tại · dài nhất <b>${w.chuoi_dai_nhat || st.best || 0}</b> ngày</span></div>
      ${tot ? `<div class="chart-t">ĐBK từng lượt (${Math.min(tot, 40)} lượt gần nhất) <span class="muted">· rê hoặc kéo ngang để xem từng lượt</span></div><div class="chart" id="cRuns"></div>
        <div style="overflow-x:auto"><table class="tb"><tr><th>Độ khó</th><th>Số lượt</th><th>TB ĐBK</th><th>Tốt nhất</th><th>Trụ lâu nhất</th></tr>${byDiff}</table></div>` : '<p class="muted">Chưa có lượt bán nào được tính điểm.</p>'}
    </section>`;
  if(games.length) lineChart($('cElo'), eloSeries.map((x, k) => ({x:k, y:x.v, tip:`Trận ${k + 1} · ${KQ[x.g.kq].n} · ${x.g.doi > 0 ? '+' : ''}${x.g.doi} → <b>${x.v}</b><br>${fmtNgay(x.t)}`})));
  if(tot) barChart($('cRuns'), runs.slice(-40).map(r => ({y:r.delta || 0, tip:`${DIFF[r.do_kho].n} · ${r.trang_thai === 'bo_cuoc' ? 'bỏ dở' : r.so_ngay + ' ngày'} · <b>${(r.delta || 0) > 0 ? '+' : ''}${r.delta || 0} ĐBK</b><br>${fmtNgay(r.ket_thuc)}`})));
}

/* ================= 4. Xem trực tiếp =================
   Mỗi người chơi giữ một kênh Realtime Broadcast "xem:<id>". Người xem gửi "hello" (8 giây/lần);
   khi còn người xem, máy người chơi gửi các sự kiện mới của REC mỗi 0,6 giây. Không ghi gì vào database.
   Màn xem dùng lại bộ dựng quán của phần xem lại (rpApply/rpDraw), trễ khoảng nửa giây. */
const LIVE = {ch:null, cur:null, sent:0, until:0, need:null, ket:null, last:0, t:null, xem:new Map()};
function liveOpen(){
  if(!sb || !user || LIVE.ch) return;
  LIVE.ch = sb.channel('xem:' + user.id, {config:{broadcast:{self:false}}})
    .on('broadcast', {event:'hello'}, ({payload}) => {
      const now = Date.now(), d = payload || {}; LIVE.until = now + 25000;
      if(d.by) LIVE.xem.set(d.by, now + 25000);
      const n = Math.max(0, +d.have || 0); LIVE.need = LIVE.need == null ? n : Math.min(LIVE.need, n);
      liveTick() })
    .subscribe();
  clearInterval(LIVE.t); LIVE.t = setInterval(liveTick, 600);
}
function liveClose(){ if(LIVE.ch){ try{ sb.removeChannel(LIVE.ch) }catch(e){} LIVE.ch = null } clearInterval(LIVE.t) }
const liveSend = (event, payload) => { try{ LIVE.ch && LIVE.ch.send({type:'broadcast', event, payload}) }catch(e){} };
// Số người đang xem mình (hiện trong dòng trạng thái lúc bán)
const liveSo = () => { const now = Date.now(); let n = 0; LIVE.xem.forEach((t, k) => t > now ? n++ : LIVE.xem.delete(k)); return n };
function liveTick(){
  if(REC && REC !== LIVE.cur){ LIVE.cur = REC; LIVE.sent = 0; LIVE.ket = null }
  const now = Date.now();
  if(!LIVE.ch || now > LIVE.until){ LIVE.need = null; return }
  const R = LIVE.cur, ended = R && R.ev.length && R.ev[R.ev.length - 1][1] === 'O';
  if(!R || (ended && !REC && !midRun && now - (R.t0 + R.ev[R.ev.length - 1][0]) > 180000)){   // không bán gì (hoặc đã xong quá 3 phút)
    if(LIVE.need != null){ LIVE.need = null; liveSend('idle', {st: presenceNow()}) } return }
  let from = LIVE.need != null ? Math.min(LIVE.need, LIVE.sent) : LIVE.sent; LIVE.need = null;
  if(from >= R.ev.length && now - LIVE.last < 3000) return;         // không có gì mới: 3 giây báo một lần
  const m = {id:R.t0, kind:R.kind, diff:R.diff, md:R.md, opp:R.opp || null, td:R.td || null};
  do { const part = R.ev.slice(from, from + 800);
    liveSend('ev', {m, from, ev: part, el: now - R.t0, ket: LIVE.ket}); from += part.length } while(from < R.ev.length);
  LIVE.sent = R.ev.length; LIVE.last = now;
}
// Kết quả cuối (sau khi server tính điểm/Elo) gửi kèm cho người xem
function liveKet(k){ if(!LIVE.cur) return; LIVE.ket = k; LIVE.last = 0; if(Date.now() < LIVE.until) liveTick() }

/* ---- màn xem trực tiếp ---- */
let XEM = null;   // {uid, back, ps: Map id → {id, ten, av, ev, st, m, el, at, ket}, order, timers}
function xemStop(){
  if(!XEM) return;
  const x = XEM; XEM = null;
  clearInterval(x.hello); clearTimeout(x.wd); cancelAnimationFrame(x.raf);
  x.ps.forEach(p => { try{ sb.removeChannel(p.ch) }catch(e){} });
}
function xemHello(p){ try{ p.ch.send({type:'broadcast', event:'hello', payload:{have: p.ev.length, by: user && user.id}}) }catch(e){} }
async function watchScreen(uid, back){
  if(!ranked || !sb || !user){ toast('Đăng nhập để xem trực tiếp'); return }
  if(uid === user.id) return;
  rpStop(); xemStop(); nhoMan('xem', uid);
  const x = XEM = {uid, back: back || home, ps: new Map(), order: [], idle: false, endShown: false};
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow"><span class="live-tag"><i class="live-dot" aria-hidden="true"></i>Trực tiếp</span> <span id="xEye"></span></div><button class="link" id="back">Đóng</button></div>
    <h2 id="xTitle">Đang kết nối…</h2><p class="muted" id="xSub">Đang chờ quán của bạn ấy gửi tình hình.</p>
    <div class="rp-stage n1" id="xStage"><div class="rp-view" id="rpv0"></div></div>
    <div id="xEnd" aria-live="polite"></div>
    <div class="eyebrow">Diễn biến mới nhất</div><div class="list rp-moves" id="xMoves"></div>`);
  $('back').onclick = () => { xemStop(); x.back() };
  $('xStage').onclick = e => { const b = e.target.closest('[data-hs]'); if(b && b.dataset.hs){ xemStop(); hoSoScreen('stats', b.dataset.hs, () => watchScreen(uid, x.back)) } };
  await xemJoin(uid);
  if(XEM !== x) return;
  x.hello = setInterval(() => x.ps.forEach(xemHello), 8000);
  x.wd = setTimeout(() => { if(XEM === x && !x.ps.get(uid).m && !x.idle) xemIdle(x, null) }, 7000);
  x.raf = requestAnimationFrame(xemFrame);
}
async function xemJoin(id){
  const x = XEM; if(!x || x.ps.has(id)) return;
  const p = {id, ten: lbPeople.get(id)?.ten || 'Người chơi', av: lbPeople.get(id)?.avatar_url, ev: [], st: rpNew(), m: null, el: 0, at: 0, ket: null};
  x.ps.set(id, p); x.order.push(id);
  p.ch = sb.channel('xem:' + id, {config:{broadcast:{self:false}}})
    .on('broadcast', {event:'ev'}, ({payload}) => xemEv(x, p, payload))
    .on('broadcast', {event:'idle'}, ({payload}) => { if(id === x.uid && !p.m) xemIdle(x, payload && payload.st) })
    .subscribe(s => { if(s === 'SUBSCRIBED') xemHello(p) });
  const {data} = await sb.from('profiles').select('id,ten,lop,elo,avatar_url').eq('id', id).maybeSingle();
  if(data){ p.ten = data.ten; p.av = data.avatar_url; p.prof = data; lbPeople.set(id, data) }
  if(XEM === x) xemHead(x);
}
function xemEv(x, p, d){
  if(XEM !== x || !d || !d.m) return;
  if(!p.m || p.m.id !== d.m.id){          // lượt / trận mới: dựng lại từ đầu
    p.m = d.m; p.ev = []; p.st = rpNew(); p.ket = null;
    if(p.id === x.uid){ x.endShown = false; x.idle = false; $('xEnd').innerHTML = ''; $('xMoves').innerHTML = '';
      [...x.ps.keys()].filter(k => k !== x.uid).forEach(k => { try{ sb.removeChannel(x.ps.get(k).ch) }catch(e){} x.ps.delete(k) });
      x.order = [x.uid] }
    if(d.from > 0){ xemHello(p); return }
  }
  if(d.from > p.ev.length){ xemHello(p); return }   // thiếu đoạn giữa: xin gửi lại
  const moi = d.ev.slice(p.ev.length - d.from);
  p.ev.push(...moi); p.el = d.el; p.at = Date.now();
  if(d.ket) p.ket = d.ket;
  const ks = ING_KEYS(), ml = $('xMoves');
  if(ml) moi.forEach(e => { const l = rpLine(e, ks); if(!l) return;
    ml.insertAdjacentHTML('afterbegin', `<div class="li rp-mv ${e[1] === 'V' ? 'good' : /[WLJ]/.test(e[1]) ? 'bad' : ''}"><span class="rk">${mmss(e[0])}</span><span class="nm">${x.order.length > 1 ? `<b>${esc(tenNgan(p.ten))}</b> · ` : ''}${esc(l)}</span></div>`);
    while(ml.children.length > 30) ml.lastElementChild.remove() });
  if(p.id === x.uid && p.m.kind === 'solo' && p.m.opp && !x.ps.has(p.m.opp)) xemJoin(p.m.opp);
  xemHead(x);
}
function xemHead(x){
  const p = x.ps.get(x.uid), t = $('xTitle'), sub = $('xSub'), stg = $('xStage'); if(!p || !t) return;
  if(stg && stg.children.length !== x.order.length){
    stg.className = 'rp-stage n' + x.order.length; stg.innerHTML = x.order.map((k, i) => `<div class="rp-view" id="rpv${i}"></div>`).join('') }
  if(!p.m) { t.textContent = p.ten; return }
  const o = p.m.opp && x.ps.get(p.m.opp);
  t.textContent = p.m.kind === 'solo' ? `${tenNgan(p.ten)} vs ${o ? tenNgan(o.ten) : 'đối thủ'}` : `${p.ten} đang bán`;
  sub.textContent = p.m.kind === 'solo' ? `Solo · ${DIFF[p.m.diff]?.n || ''} · ${CHE_DO[p.m.md]?.n || ''}` : `Chế độ thường · ${DIFF[p.m.diff]?.n || ''}`;
}
function xemIdle(x, st){
  if(XEM !== x) return; x.idle = true;
  const p = x.ps.get(x.uid);
  $('xTitle').textContent = p.ten;
  $('xSub').textContent = st === 'ranh' ? `${tenNgan(p.ten)} đang không bán, bạn có thể thách đấu ngay.`
    : `Chưa nhận được gì từ quán của ${tenNgan(p.ten)}. Có thể bạn ấy vừa tắt game hoặc đang dùng bản cũ.`;
  xemEnd(x, null);
}
function xemFrame(){
  const x = XEM; if(!x) return;
  if(!$('xStage')){ xemStop(); return }                // đã chuyển sang màn khác
  const now = Date.now();
  x.order.forEach((id, i) => { const p = x.ps.get(id); if(!p || !p.m) return;
    const T = Math.max(0, p.el + (now - p.at) - 500);
    while(p.st.i < p.ev.length && p.ev[p.st.i][0] <= T) rpApply(p.st, p.ev[p.st.i++]);
    rpDraw(p, i, Math.min(T, p.st.ended ? p.ev[p.ev.length - 1][0] : T)) });
  const p = x.ps.get(x.uid), eye = $('xEye');
  if(eye) eye.textContent = p && p.m && p.at && now - p.at > 15000 ? '· mất tín hiệu' : '';
  if(p && p.m && !x.endShown){
    const o = p.m.opp && x.ps.get(p.m.opp), ket = p.ket || (o && o.ket);
    if(p.m.kind === 'solo' ? ket : p.st.ended && (ket || now - (p.endAt ||= now) > 12000)) xemEnd(x, ket);
  }
  x.raf = requestAnimationFrame(xemFrame);
}
// Kết thúc: báo kết quả, mời thách đấu (người vừa xong đã rảnh)
function xemEnd(x, ket){
  x.endShown = true;
  const p = x.ps.get(x.uid), box = $('xEnd'); if(!box) return;
  const nut = id => { const q = x.ps.get(id); return q ? `<button type="button" class="btn${id === x.uid ? '' : ' ghost'}" data-thach-xem="${id}">Thách đấu ${esc(tenNgan(q.ten))}</button>` : '' };
  let html = '';
  if(p.m && p.m.kind === 'solo' && ket){
    const r = ket, o = x.ps.get(p.m.opp), ten = id => esc(tenNgan((x.ps.get(id) || {}).ten || 'Đối thủ'));
    const kq = !r.thang ? 'Hoà' : `${ten(r.thang)} thắng`;
    const dm = id => { const s = r.a === id ? 'a' : 'b'; const d = r['doi_' + s] || 0; return `${ten(id)} ${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} Elo` };
    html = `<div class="xem-ket"><b>${kq}</b> · ${LY_DO[r.ly_do] || ''}<br><span class="muted">${dm(r.a)} · ${dm(r.b)}</span></div>
      <div class="col grow">${nut(x.uid)}${o ? nut(o.id) : ''}<button type="button" class="btn ghost" id="xReplay">Xem lại trận</button></div>`;
  } else if(p.m && p.st.ended){
    const cash = ket ? ket.cash : p.ev[p.ev.length - 1][5];
    html = `<div class="xem-ket"><b>${esc(tenNgan(p.ten))} ${cash ? 'đã chốt sổ' : 'đã đóng quán'}</b> sau ${p.st.day || 1} ngày · ${p.st.total}k doanh thu${ket && ket.delta != null ? ` · ${ket.delta > 0 ? '+' : ''}${ket.delta} ĐBK` : ''}</div>
      <div class="col grow">${nut(x.uid)}</div>`;
  } else {
    html = `<div class="col grow">${nut(x.uid)}</div>`;
  }
  box.innerHTML = html + `<button type="button" class="link" id="xHoSo">Xem hồ sơ ${esc(tenNgan(p.ten))}</button>`;
  box.querySelectorAll('[data-thach-xem]').forEach(b => b.onclick = () => {
    const id = b.dataset.thachXem, q = x.ps.get(id);
    if(onlineSt.get(id) === 'solo'){ toast(`${tenNgan(q.ten)} vẫn đang trong trận`); return }
    xemStop(); challengeScreen(q.prof || lbPeople.get(id) || {id, ten: q.ten, avatar_url: q.av}, x.back) });
  $('xHoSo').onclick = () => { xemStop(); hoSoScreen('stats', x.uid, x.back) };
  if($('xReplay')) $('xReplay').onclick = () => { const id = ket.id; xemStop();
    replayScreen({thach_dau: id, first: x.uid, back: x.back, title: $('xTitle')?.textContent || 'Xem lại', sub: 'Trận vừa xong'}) };
  if(ket) lockButtons(box, 700);
}

/* ---- Biểu đồ nhỏ (SVG) ----
   Dòng số liệu nằm PHÍA TRÊN biểu đồ (ngón tay không che), luôn hiện điểm đang chọn, mặc định là điểm mới nhất.
   Rê chuột, hoặc chạm rồi kéo ngang để lướt qua từng cột/điểm; thả tay vẫn giữ điểm đã chọn.
   Kéo dọc vẫn cuộn trang (touch-action: pan-y). Bàn phím: Tab vào biểu đồ rồi ← → Home End. */
function chartScrub(host, svg, W, n, xOf, chon){
  const read = document.createElement('div'); read.className = 'cread'; read.setAttribute('aria-live', 'polite'); host.prepend(read);
  svg.setAttribute('tabindex', '0');
  let k = -1;
  const dat = i => { i = Math.max(0, Math.min(n - 1, i)); if(i === k) return; k = i; read.innerHTML = chon(i) };
  const tu = e => { const r = svg.getBoundingClientRect(); if(!r.width) return; const vx = (e.clientX - r.left) * W / r.width;
    let best = 0, d = Infinity; for(let i = 0; i < n; i++){ const di = Math.abs(xOf(i) - vx); if(di < d){ d = di; best = i } } dat(best) };
  svg.addEventListener('pointerdown', e => { tu(e); try{ svg.setPointerCapture(e.pointerId) }catch(x){} });
  svg.addEventListener('pointermove', tu);
  svg.addEventListener('keydown', e => { const m = {ArrowLeft: k - 1, ArrowRight: k + 1, Home: 0, End: n - 1}[e.key];
    if(m != null){ e.preventDefault(); dat(m) } });
  dat(n - 1);
}
function lineChart(host, pts){
  const W = host.clientWidth || 320, H = 150, P = {l:38, r:10, t:12, b:20};
  const ys = pts.map(p => p.y), lo = Math.min(...ys, 1200) - 10, hi = Math.max(...ys, 1200) + 10;
  const X = k => P.l + (pts.length < 2 ? (W - P.l - P.r) / 2 : k / (pts.length - 1) * (W - P.l - P.r)), Y = v => P.t + (hi - v) / (hi - lo) * (H - P.t - P.b);
  const ticks = [lo + 10, Math.round((lo + hi) / 2), hi - 10];
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Elo từ ${ys[0]} đến ${ys[ys.length - 1]} qua ${pts.length} trận. Dùng phím mũi tên để xem từng trận.">
    ${ticks.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${P.l - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${Math.round(v)}</text>`).join('')}
    <polyline points="${pts.map((p, k) => `${X(k)},${Y(p.y)}`).join(' ')}" class="ln"/>
    <line class="xh" y1="${P.t}" y2="${H - P.b}" x1="-9" x2="-9"/><circle class="dot hov" r="5" cx="-9" cy="-9"/></svg>`;
  const svg = host.querySelector('svg'), xh = svg.querySelector('.xh'), hv = svg.querySelector('.hov');
  chartScrub(host, svg, W, pts.length, X, k => { xh.setAttribute('x1', X(k)); xh.setAttribute('x2', X(k)); hv.setAttribute('cx', X(k)); hv.setAttribute('cy', Y(pts[k].y)); return pts[k].tip });
}
function barChart(host, bars){
  const W = host.clientWidth || 320, H = 150, P = {l:38, r:6, t:10, b:10};
  const m = Math.max(10, ...bars.map(b => Math.abs(b.y))), Y = v => P.t + (m - v) / (2 * m) * (H - P.t - P.b), y0 = Y(0);
  const bw = (W - P.l - P.r) / bars.length, gap = Math.min(2, bw * .25), w = Math.max(1, bw - gap);
  const rr = Math.min(4, w / 2);
  const path = (x, v) => { const y = Y(v), h = Math.abs(y - y0); if(h < .5) return '';
    return v > 0 ? `M${x},${y0}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y0}Z`
                 : `M${x},${y0}V${y - rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y - rr}V${y0}Z` };
  const cx = k => P.l + k * bw + w / 2;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="ĐBK của ${bars.length} lượt gần nhất. Dùng phím mũi tên để xem từng lượt.">
    <line class="xh" y1="${P.t}" y2="${H - P.b}" x1="-9" x2="-9"/>
    <text x="${P.l - 6}" y="${Y(m) + 8}" class="ax" text-anchor="end">+${m}</text><text x="${P.l - 6}" y="${Y(-m)}" class="ax" text-anchor="end">−${m}</text>
    <line x1="${P.l}" x2="${W - P.r}" y1="${y0}" y2="${y0}" class="base"/><text x="${P.l - 6}" y="${y0 + 4}" class="ax" text-anchor="end">0</text>
    ${bars.map((b, k) => `<path d="${path(P.l + k * bw, b.y)}" class="bar ${b.y >= 0 ? 'up' : 'down'}"/>`).join('')}
    <rect x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" class="hit"/></svg>`;
  const svg = host.querySelector('svg'), xh = svg.querySelector('.xh'), ps = svg.querySelectorAll('path.bar');
  chartScrub(host, svg, W, bars.length, cx, k => { ps.forEach((p, j) => p.classList.toggle('mo', j !== k));
    xh.setAttribute('x1', cx(k)); xh.setAttribute('x2', cx(k)); return bars[k].tip });
}
