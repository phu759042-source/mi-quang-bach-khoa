/* Mì Quảng Bách Khoa · js/ban-be.js: bạn bè, lời mời kết bạn và chuông thông báo (bản 2.14.0).
   Dữ liệu: bảng ban_be (mỗi cặp một dòng, 'cho' | 'ban') và thong_bao trên Supabase, chỉ đọc;
   thay đổi qua RPC gui_ket_ban / tra_loi_ket_ban / huy_ket_ban / doc_thong_bao.
   Cập nhật ngay nhờ Realtime (đăng ký trong soloConnect), dự phòng hỏi lại mỗi 30 giây. */
const BB = {qh: new Map(), rows: [], tb: [], hs: new Map(), daTai: false, ve: null, t: null};
// quan hệ với một người: 'ban' | 'da_gui' (mình mời) | 'nhan' (họ mời mình) | undefined
const quanHe = uid => BB.qh.get(uid);
const bbChuaDoc = () => BB.tb.filter(t => !t.da_doc).length;
const bbSoLoiMoi = () => [...BB.qh.values()].filter(v => v === 'nhan').length;

async function bbTai(){
  if(!sb || !user || !ranked) return;
  const [{data: r1}, {data: r2}] = await Promise.all([
    sb.from('ban_be').select('a,b,nguoi_gui,trang_thai,tao_luc,ket_ban_luc'),
    sb.from('thong_bao').select('id,loai,tu,da_doc,tao_luc').order('tao_luc', {ascending:false}).limit(50)]);
  if(!user) return;
  BB.rows = r1 || []; BB.tb = r2 || []; BB.daTai = true;
  BB.qh = new Map(BB.rows.map(r => [r.a === user.id ? r.b : r.a, r.trang_thai === 'ban' ? 'ban' : r.nguoi_gui === user.id ? 'da_gui' : 'nhan']));
  await bbHoSo([...BB.qh.keys(), ...BB.tb.map(t => t.tu)]);
  bbVe();
}
// Tên, lớp, avatar, Elo của những người liên quan (giữ trong bộ nhớ)
async function bbHoSo(ids){
  const can = [...new Set(ids.filter(id => id && !BB.hs.has(id)))];
  if(!can.length) return;
  const {data} = await sb.from('profiles').select('id,ten,lop,khoa_id,sinh_vien,truong_id,giang_vien,elo,avatar_url').in('id', can);
  (data || []).forEach(p => { BB.hs.set(p.id, p); lbPeople.set(p.id, p) });
}
const NGUOI_CHOI = tl('Người chơi', 'Player');
const bbTen = id => BB.hs.get(id)?.ten || NGUOI_CHOI;
// Vẽ lại mọi chỗ phụ thuộc: số trên chuông / nút Bạn bè, các nút kết bạn, màn đang mở
function bbVe(){
  document.querySelectorAll('[data-bb-badge]').forEach(el => { const n = el.dataset.bbBadge === 'tb' ? bbChuaDoc() : bbSoLoiMoi();
    el.textContent = n > 9 ? '9+' : n; el.hidden = !n });
  document.querySelectorAll('[data-kb-slot]').forEach(el => { if(!el.querySelector('[data-sure]')) el.innerHTML = kbNut(el.dataset.kbSlot, el.dataset.kbAn) });   // đang hỏi lại thì giữ nguyên
  if(BB.ve) BB.ve();
}
function bbDoi(){ clearTimeout(BB.t); BB.t = setTimeout(bbTai, 250) }
// Realtime: thông báo mới → hiện toast ngay
async function bbSuKien(p){
  bbDoi();
  const t = p.new; if(p.eventType !== 'INSERT' || !t || t.da_doc) return;
  await bbHoSo([t.tu]);
  toast(t.loai === 'loi_moi_ket_ban' ? tl(`${tenNgan(bbTen(t.tu))} gửi lời mời kết bạn`, `${tenNgan(bbTen(t.tu))} sent you a friend request`) : tl(`${tenNgan(bbTen(t.tu))} đã đồng ý kết bạn`, `${tenNgan(bbTen(t.tu))} accepted your friend request`));
  try{ sfx.streak() }catch(e){}
}
function bbReset(){ BB.qh = new Map(); BB.rows = []; BB.tb = []; BB.daTai = false; BB.ve = null; bbVe() }

/* ---- nút kết bạn dùng ở hồ sơ, sau trận solo, xem lại, tìm kiếm ---- */
const UNG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M19 8v6M16 11h6"/></svg>';
function kbNut(uid, an){
  if(!uid || !user || uid === user.id || !ranked) return '';
  const q = quanHe(uid), c = 'btn ghost kb';
  if(q === 'ban') return an === 'ban' ? '' : `<span class="kb-on" role="status">✓ ${tl('Đã là bạn bè', 'Friends')}</span><button type="button" class="${c} kb-bo" data-kb="bo" data-kb-id="${uid}">${tl('Huỷ kết bạn', 'Unfriend')}</button>`;
  if(q === 'da_gui') return `<button type="button" class="${c}" data-kb="huy" data-kb-id="${uid}">${tl('Đã gửi lời mời · Huỷ', 'Request sent · Cancel')}</button>`;
  if(q === 'nhan') return `<button type="button" class="btn kb" data-kb="dong_y" data-kb-id="${uid}">${tl('Đồng ý kết bạn', 'Accept request')}</button><button type="button" class="link" data-kb="tu_choi" data-kb-id="${uid}">${tl('Từ chối', 'Decline')}</button>`;
  return `<button type="button" class="${c}" data-kb="gui" data-kb-id="${uid}">${UNG}${tl('Kết bạn', 'Add friend')}</button>`;
}
async function kbLam(act, uid, nut){
  if(act === 'bo' && !nut.dataset.sure){ nut.dataset.sure = 1; nut.textContent = tl('Chắc chắn? Bấm lần nữa để huỷ', 'Sure? Tap again to unfriend'); nut.classList.add('canh-bao');
    setTimeout(() => { if(nut.isConnected && nut.dataset.sure){ delete nut.dataset.sure; nut.textContent = tl('Huỷ kết bạn', 'Unfriend'); nut.classList.remove('canh-bao') } }, 4000); return }
  nut.disabled = true;
  const {data, error} = act === 'gui' ? await sb.rpc('gui_ket_ban', {p_b: uid})
    : act === 'dong_y' || act === 'tu_choi' ? await sb.rpc('tra_loi_ket_ban', {p_nguoi: uid, p_dong_y: act === 'dong_y'})
    : await sb.rpc('huy_ket_ban', {p_nguoi: uid});
  if(error){ nut.disabled = false; toast(error.message); return }
  const ten = tenNgan(bbTen(uid) !== NGUOI_CHOI ? bbTen(uid) : lbPeople.get(uid)?.ten);
  toast(data?.trang_thai === 'ban' ? tl(`Bạn và ${ten} đã là bạn bè`, `You and ${ten} are now friends`) : act === 'gui' ? tl(`Đã gửi lời mời kết bạn tới ${ten}`, `Friend request sent to ${ten}`)
    : act === 'tu_choi' ? tl('Đã từ chối lời mời', 'Request declined') : act === 'bo' ? tl(`Đã huỷ kết bạn với ${ten}`, `You unfriended ${ten}`) : tl('Đã huỷ lời mời', 'Request cancelled'));
  await bbTai();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-kb]'); if(!b || b.disabled) return;
  e.stopPropagation(); kbLam(b.dataset.kb, b.dataset.kbId, b);
}, true);

/* ---- chuông thông báo ---- */
const CHUONG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
const chuongHTML = () => `<button type="button" class="chuong" id="chuong" aria-label="${tl('Thông báo', 'Notifications')}">${CHUONG}<span class="bb-so" data-bb-badge="tb" hidden></span></button>`;
const truoc = iso => { const s = (Date.now() - new Date(iso)) / 1000;
  return s < 60 ? tl('vừa xong', 'just now') : s < 3600 ? tl(`${Math.floor(s / 60)} phút trước`, `${Math.floor(s / 60)} min ago`) : s < 86400 ? tl(`${Math.floor(s / 3600)} giờ trước`, `${Math.floor(s / 3600)} h ago`) : fmtNgay(iso) };
async function thongBaoScreen(back = home){
  if(!ranked || !sb){ toast(tl('Đăng nhập để xem thông báo', 'Sign in to see notifications')); return }
  nhoMan('thongbao');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Thông báo', 'Notifications')}</div><button class="link" id="back">${tl('Đóng', 'Close')}</button></div>
    <h2>${tl('Thông báo', 'Notifications')}</h2><div class="col" id="tbBody"><div class="empty-state">${tl('Đang tải…', 'Loading…')}</div></div>`);
  $('back').onclick = () => { BB.ve = null; back() };
  const ve = () => {
    const body = $('tbBody'); if(!body){ BB.ve = null; return }
    if(!BB.tb.length){ body.innerHTML = `<div class="empty-state">${tl('Chưa có thông báo nào. Lời mời kết bạn và những ai đồng ý kết bạn với bạn sẽ hiện ở đây.', 'No notifications yet. Friend requests and people who accept yours will show up here.')}</div>`; return }
    body.innerHTML = `<div class="list tb-list">${BB.tb.map(t => { const p = BB.hs.get(t.tu) || {ten:NGUOI_CHOI}, q = quanHe(t.tu);
      return `<div class="li tb-li${t.da_doc ? '' : ' moi'}" data-prof="${t.tu}" role="button" tabindex="0">
        <span>${avatarHTML(p.avatar_url, p.ten, 38)}</span>
        <span class="nm"><span><b>${esc(p.ten)}</b> ${t.loai === 'loi_moi_ket_ban' ? tl('gửi lời mời kết bạn', 'sent you a friend request') : tl('đã đồng ý kết bạn với bạn', 'accepted your friend request')}</span>
          <span class="sb">${truoc(t.tao_luc)}${t.loai === 'loi_moi_ket_ban' && q !== 'nhan' ? (q === 'ban' ? tl(' · đã là bạn bè', ' · friends') : tl(' · đã xử lý', ' · handled')) : ''}</span>
          ${t.loai === 'loi_moi_ket_ban' && q === 'nhan' ? `<span class="row kb-row">${kbNut(t.tu)}</span>` : ''}</span></div>` }).join('')}</div>`;
  };
  BB.ve = ve;
  $('tbBody').onclick = e => { const el = e.target.closest('[data-prof]'); if(el && !e.target.closest('button')) { BB.ve = null; hoSoScreen('stats', el.dataset.prof, () => thongBaoScreen(back)) } };
  if(!BB.daTai) await bbTai(); else ve();
  if(bbChuaDoc()){ await sb.rpc('doc_thong_bao'); setTimeout(() => { BB.tb.forEach(t => t.da_doc = true); bbVe() }, 1500) }
}

/* ---- màn Bạn bè: danh sách, lời mời, tìm để kết bạn ---- */
async function banBeScreen(tab = 'ban', back = home){
  if(!ranked || !sb){ toast(tl('Đăng nhập để kết bạn', 'Sign in to add friends')); return }
  nhoMan('banbe', tab);
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Bạn bè', 'Friends')}</div><button class="link" id="back">${tl('Đóng', 'Close')}</button></div>
    <h2>${tl('Bạn bè', 'Friends')}</h2>
    <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="bbQ" type="search" placeholder="${tl('Tìm theo tên hoặc lớp để kết bạn', 'Find people by name or class')}" autocomplete="off" enterkeyhint="search" aria-label="${tl('Tìm người chơi để kết bạn', 'Find players to add')}"></div>
    <div class="tabs t2" role="tablist"><button role="tab" data-t="ban" aria-selected="${tab === 'ban'}">${tl('Bạn bè', 'Friends')} <span class="bb-dem" id="bbN1"></span></button>
      <button role="tab" data-t="loi_moi" aria-selected="${tab === 'loi_moi'}">${tl('Lời mời', 'Requests')} <span class="bb-so" data-bb-badge="lm" hidden></span></button></div>
    <div class="col" id="bbBody"><div class="empty-state">${tl('Đang tải…', 'Loading…')}</div></div>`);
  const me = () => banBeScreen(tab, back);
  $('back').onclick = () => { BB.ve = null; back() };
  $('ov').querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-t]'); if(b) banBeScreen(b.dataset.t, back) };
  const dong = (p, phai) => `<div class="li" data-prof="${p.id}" role="button" tabindex="0"><span>${avatarHTML(p.avatar_url, p.ten, 36)}</span>
    <span class="nm"><span class="dot" data-online="${p.id}" ${onlineSet.has(p.id) ? '' : 'hidden'}></span>${esc(p.ten)} ${stBadge(p.id)}<span class="sb">${'lop' in p ? lopKhoaHTML(p, false) + ' · ' : ''}Elo ${p.elo ?? 1200} ${eloTitle(p.elo)}</span></span>${phai}</div>`;
  const ve = () => {
    const body = $('bbBody'); if(!body){ BB.ve = null; return }
    if($('bbQ') && $('bbQ').value.trim()) return;               // đang hiện kết quả tìm kiếm
    const ds = id => BB.hs.get(id) || {id, ten:NGUOI_CHOI};
    const ban = [...BB.qh].filter(([, v]) => v === 'ban').map(([k]) => ds(k)).sort((x, y) => onlineSet.has(y.id) - onlineSet.has(x.id) || (y.elo ?? 0) - (x.elo ?? 0));
    $('bbN1').textContent = ban.length ? `(${ban.length})` : '';
    if(tab === 'ban'){
      body.innerHTML = ban.length ? `<div class="list">${ban.map(p => dong(p, `<button type="button" class="act" data-uid="${p.id}">${tl('Thách đấu', 'Challenge')}</button>`)).join('')}</div>
        <p class="muted"><span class="dot"></span>${tl('đang mở game · bấm tên để xem hồ sơ', 'online · tap a name for their profile')}</p>`
        : `<div class="empty-state">${tl('Chưa có bạn bè nào. Tìm bạn ở ô phía trên, hoặc bấm "Kết bạn" trong hồ sơ của ai đó, hay sau một trận solo.', 'No friends yet. Search above, or tap "Add friend" on someone\'s profile or after a solo match.')}</div>`;
      applyPresence(); return;
    }
    const nhan = [...BB.qh].filter(([, v]) => v === 'nhan').map(([k]) => ds(k)), gui = [...BB.qh].filter(([, v]) => v === 'da_gui').map(([k]) => ds(k));
    body.innerHTML = `<div class="eyebrow">${tl('Đã nhận', 'Received')} (${nhan.length})</div>
      ${nhan.length ? `<div class="list">${nhan.map(p => dong(p, `<span class="kb-row">${kbNut(p.id)}</span>`)).join('')}</div>` : `<p class="muted">${tl('Không có lời mời nào đang chờ.', 'No pending requests.')}</p>`}
      <div class="eyebrow">${tl('Đã gửi', 'Sent')} (${gui.length})</div>
      ${gui.length ? `<div class="list">${gui.map(p => dong(p, `<span class="kb-row">${kbNut(p.id)}</span>`)).join('')}</div>` : `<p class="muted">${tl('Bạn chưa gửi lời mời nào đang chờ.', 'You have no pending sent requests.')}</p>`}`;
  };
  BB.ve = ve;
  $('bbBody').onclick = e => {
    const a = e.target.closest('.act[data-uid]');
    if(a){ const p = BB.hs.get(a.dataset.uid) || lbPeople.get(a.dataset.uid); if(!p) return; BB.ve = null;
      return onlineSt.get(p.id) === 'solo' ? watchScreen(p.id, me) : challengeScreen(p, me) }
    if(e.target.closest('button')) return;
    const el = e.target.closest('[data-prof]'); if(el){ BB.ve = null; hoSoScreen('stats', el.dataset.prof, me) } };
  let t; $('bbQ').oninput = () => { clearTimeout(t); const v = $('bbQ').value.trim(); t = setTimeout(() => v ? bbTim(v, dong) : ve(), 300) };
  if(!BB.daTai) await bbTai(); else ve();
  bbVe();
}
async function bbTim(q, dong){
  const body = $('bbBody'); if(!body) return;
  body.innerHTML = `<div class="empty-state">${tl('Đang tìm…', 'Searching…')}</div>`;
  const {data, error} = await sb.rpc('tim_nguoi_choi', {p_q: q});
  if(!$('bbQ') || $('bbQ').value.trim() !== q) return;
  if(error){ body.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return }
  (data || []).forEach(p => { BB.hs.set(p.id, {...BB.hs.get(p.id), ...p}); lbPeople.set(p.id, p) });
  body.innerHTML = data && data.length ? `<div class="list">${data.map(p => dong(p, `<span class="kb-row" data-kb-slot="${p.id}">${kbNut(p.id)}</span>`)).join('')}</div>`
    : `<div class="empty-state">${tl('Không thấy ai có tên hoặc lớp này.', 'Nobody with that name or class.')}</div>`;
}
