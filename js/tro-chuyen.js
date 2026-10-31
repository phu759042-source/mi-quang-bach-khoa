/* Mì Quảng Bách Khoa · js/tro-chuyen.js: Trò chuyện (bản 2.25.0): phòng chung cho mọi người và nhắn riêng
   giữa hai người, kiểu Messenger. Bảng tin_nhan (phong 'chung' | 'dm:<uid nhỏ>:<uid lớn>'), gửi qua RPC
   gui_tin_nhan (chặn spam, chặn người bị ban), đã đọc qua doc_tin, danh sách qua ds_hoi_thoai.
   Tin mới đến bằng Realtime postgres_changes (RLS lọc: chỉ thấy phòng chung và tin của mình).
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
const TC = {ch: null, phong: null, ds: null, chuaDoc: 0, t: 0, ve: null};
const phongDM = (a, b) => 'dm:' + [a, b].sort().join(':');

function tcBat(){
  if(!sb || !user || TC.ch) return;
  TC.ch = sb.channel('tc-' + user.id)
    .on('postgres_changes', {event: '*', schema: 'public', table: 'tin_nhan'}, p => tcSuKien(p))
    .subscribe();
  tcDem();
}
function tcTat(){ if(TC.ch){ sb.removeChannel(TC.ch); TC.ch = null } TC.phong = null; TC.ds = null; TC.chuaDoc = 0; TC.ve = null; tcVeSo() }
async function tcDem(){
  if(!sb || !user || !ranked) return;
  try{ const {data} = await sb.rpc('ds_hoi_thoai'); if(!data) return; TC.ds = data;
    TC.chuaDoc = (data.rieng || []).reduce((s, r) => s + (+r.chua_doc || 0), 0);
    TC.chung = +(data.chung?.chua_doc || 0); tcVeSo(); if(TC.ve) TC.ve() }catch(e){}
}
const tcDoi = () => { clearTimeout(TC.t); TC.t = setTimeout(tcDem, 400) };
// số trên nút Tin nhắn: tin riêng chưa đọc (phòng chung chỉ hiện chấm)
function tcVeSo(){
  document.querySelectorAll('[data-tc-badge]').forEach(el => { const n = TC.chuaDoc || 0;
    el.textContent = n ? (n > 9 ? '9+' : n) : ''; el.hidden = !n && !TC.chung; el.classList.toggle('cham', !n && !!TC.chung) });
}
function tcSuKien(p){
  const t = p.new; if(!t) return;
  if(TC.phong === t.phong && TC.nhan) TC.nhan(t, p.eventType);
  else if(p.eventType === 'INSERT' && t.nguoi_gui !== user?.id && t.phong !== 'chung'){
    bbHoSo([t.nguoi_gui]).then(() => toast(tl(`${tenNgan(bbTen(t.nguoi_gui))}: ${t.noi_dung.slice(0, 60)}`, `${tenNgan(bbTen(t.nguoi_gui))}: ${t.noi_dung.slice(0, 60)}`)));
  }
  tcDoi();
}

/* ---- danh sách hội thoại ---- */
async function tinNhanScreen(back = home){
  if(!ranked || !sb){ toast(tl('Đăng nhập để trò chuyện', 'Sign in to chat')); return }
  nhoMan('tinnhan');
  TC.phong = null; TC.nhan = null;
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Trò chuyện', 'Chat')}</div><button class="link" id="back">${tl('Đóng', 'Close')}</button></div>
    <h2>${tl('Tin nhắn', 'Messages')}</h2>
    <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="tcQ" type="search" placeholder="${tl('Tìm người để nhắn tin', 'Find someone to message')}" autocomplete="off" enterkeyhint="search"></div>
    <div class="col" id="tcBody"><div class="empty-state">${tl('Đang tải…', 'Loading…')}</div></div>`);
  $('back').onclick = () => { TC.ve = null; back() };
  const me = () => tinNhanScreen(back);
  const ve = () => {
    const body = $('tcBody'); if(!body){ TC.ve = null; return }
    if($('tcQ') && $('tcQ').value.trim()) return;
    const d = TC.ds || {}, c = d.chung;
    const dong = (attr, av, ten, nd, ts, n, ban) => `<div class="li tc-li${n ? ' moi' : ''}" ${attr} role="button" tabindex="0"><span>${av}</span>
      <span class="nm"><span><b>${ten}</b> ${ban ? BAN_TAG() : ''}</span><span class="sb tc-cuoi">${nd}</span></span>
      <span class="tc-phai"><small>${ts ? luc(ts) : ''}</small>${n ? `<span class="bb-so">${n > 9 ? '9+' : n}</span>` : ''}</span></div>`;
    body.innerHTML = `<div class="list">${dong('data-tc-phong="chung"', '<span class="tc-chung-icon" aria-hidden="true">#</span>', tl('Phòng chung', 'Public room'),
        c ? (c.noi_dung == null ? tl('Tin nhắn đã bị ẩn', 'Message hidden') : `${esc(tenNgan(c.ten || ''))}: ${esc(c.noi_dung)}`) : tl('Mọi người cùng trò chuyện ở đây', 'Everyone chats here'), c?.tao_luc, +(c?.chua_doc || 0))}
      ${(d.rieng || []).map(r => dong(`data-tc-phong="${r.phong}" data-tc-nguoi="${r.nguoi}"`, avatarHTML(r.avatar_url, r.ten, 38), esc(r.ten),
        r.noi_dung == null ? tl('Tin nhắn đã bị ẩn', 'Message hidden') : (r.cua_minh ? tl('Bạn: ', 'You: ') : '') + esc(r.noi_dung), r.tao_luc, +r.chua_doc, r.bi_ban)).join('')}</div>
      ${(d.rieng || []).length ? '' : `<p class="muted">${tl('Chưa có tin nhắn riêng. Tìm một người ở ô phía trên, hoặc bấm "Nhắn tin" trong hồ sơ của họ.', 'No private messages yet. Find someone above, or tap "Message" on their profile.')}</p>`}`;
  };
  TC.ve = ve;
  $('tcBody').onclick = e => {
    const el = e.target.closest('[data-tc-phong]'); if(!el) return;
    TC.ve = null; chatScreen(el.dataset.tcPhong, el.dataset.tcNguoi || null, me);
  };
  let t; $('tcQ').oninput = () => { clearTimeout(t); const v = $('tcQ').value.trim(); t = setTimeout(async () => {
    if(!v) return ve();
    const {data} = await sb.rpc('tim_nguoi_choi', {p_q: v}); const body = $('tcBody'); if(!body || $('tcQ').value.trim() !== v) return;
    (data || []).forEach(p => BB.hs.set(p.id, {...BB.hs.get(p.id), ...p}));
    body.innerHTML = (data || []).length ? `<div class="list">${data.map(p => `<div class="li" data-tc-phong="${phongDM(user.id, p.id)}" data-tc-nguoi="${p.id}" role="button" tabindex="0">
      <span>${avatarHTML(p.avatar_url, p.ten, 34)}</span><span class="nm">${esc(p.ten)} <span class="sb">${lopKhoaHTML(p, p.khoa)}</span></span></div>`).join('')}</div>`
      : `<div class="empty-state">${tl('Không thấy ai.', 'Nobody found.')}</div>` }, 300) };
  if(TC.ds) ve();
  await tcDem(); ve();
}

/* ---- một cuộc trò chuyện ---- */
async function chatScreen(phong, nguoi, back){
  if(!ranked || !sb){ toast(tl('Đăng nhập để trò chuyện', 'Sign in to chat')); return }
  back = back || (() => tinNhanScreen(home));
  nhoMan('chat', phong, nguoi);
  if(nguoi) await bbHoSo([nguoi]);
  const p = nguoi ? BB.hs.get(nguoi) || {ten: NGUOI_CHOI} : null;
  TC.phong = phong;
  openOv(`<div class="tc-khung">
    <div class="row tc-dau" style="justify-content:space-between;align-items:center">
      ${p ? `<button type="button" class="link tc-ai" data-hs="${nguoi}">${avatarHTML(p.avatar_url, p.ten, 34)}<span><b>${esc(p.ten)}</b> ${p.bi_ban ? BAN_TAG() : ''}<small>${onlineSet.has(nguoi) ? tl('Đang online', 'Online') : p.lan_cuoi ? tl(`Online ${luc(p.lan_cuoi)}`, `Online ${luc(p.lan_cuoi)}`) : ''}</small></span></button>`
        : `<div><div class="eyebrow">${tl('Trò chuyện', 'Chat')}</div><b class="tc-ten-phong"># ${tl('Phòng chung', 'Public room')}</b></div>`}
      <button class="link" id="back">${tl('Đóng', 'Close')}</button></div>
    <div class="tc-tin" id="tcTin"><div class="empty-state">${tl('Đang tải…', 'Loading…')}</div></div>
    <form class="tc-go" id="tcGo"><textarea id="tcNhap" rows="1" maxlength="500" placeholder="${tl('Nhắn tin…', 'Message…')}" ${profile?.bi_ban ? 'disabled' : ''}></textarea>
      <button class="btn" type="submit" id="tcGui" aria-label="${tl('Gửi', 'Send')}">${tl('Gửi', 'Send')}</button></form>
    <p class="muted tc-luat">${tl('Giữ lịch sự, không spam, không chia sẻ thông tin cá nhân của người khác.', 'Be kind, no spam, no sharing other people\'s personal info.')} <button type="button" class="link" id="tcLuat">${tl('Quy tắc', 'Rules')}</button></p></div>`);
  const thoat = () => { TC.phong = null; TC.nhan = null; back() };
  $('back').onclick = thoat;
  $('tcLuat').onclick = () => { TC.phong = null; veGameScreen(() => chatScreen(phong, nguoi, back)) };
  if($('ov').querySelector('.tc-ai')) $('ov').querySelector('.tc-ai').onclick = () => { TC.phong = null; hoSoScreen('stats', nguoi, () => chatScreen(phong, nguoi, back)) };
  const khung = $('tcTin'), tin = [], daCo = new Set();
  let cu = null, het = false;
  const gio = ts => new Date(ts).toLocaleTimeString(EN ? 'en-GB' : 'vi-VN', {hour: '2-digit', minute: '2-digit'});
  const dongHTML = (m, truoc) => {
    const minh = m.nguoi_gui === user.id, a = BB.hs.get(m.nguoi_gui) || {ten: NGUOI_CHOI}, lien = truoc && truoc.nguoi_gui === m.nguoi_gui && new Date(m.tao_luc) - new Date(truoc.tao_luc) < 120e3;
    return `<div class="tc-dong${minh ? ' minh' : ''}${lien ? ' lien' : ''}" data-id="${m.id}">
      ${!minh && phong === 'chung' && !lien ? `<button type="button" class="tc-av" data-hs="${m.nguoi_gui}">${avatarHTML(a.avatar_url, a.ten, 28)}</button>` : !minh && phong === 'chung' ? '<span class="tc-av"></span>' : ''}
      <div class="tc-bong${m.da_xoa ? ' xoa' : ''}">${!minh && phong === 'chung' && !lien ? `<b class="tc-ng">${esc(a.ten)}${a.bi_ban ? ' ' + BAN_TAG() : ''}</b>` : ''}
        ${m.da_xoa ? tl('Tin nhắn đã bị quản trị ẩn', 'Message hidden by an admin') : esc(m.noi_dung).replace(/\n/g, '<br>')}
        <small>${gio(m.tao_luc)}${laQT && !m.da_xoa ? ` · <button type="button" class="link tc-an" data-an="${m.id}">${tl('Ẩn', 'Hide')}</button>` : ''}</small></div></div>`;
  };
  const ve = (cuon) => {
    const duoi = khung.scrollHeight - khung.scrollTop - khung.clientHeight < 80;
    khung.innerHTML = (het ? '' : `<button type="button" class="link tc-them" id="tcThem">${tl('Xem tin cũ hơn', 'Older messages')}</button>`)
      + (tin.length ? tin.map((m, i) => dongHTML(m, tin[i - 1])).join('') : `<div class="empty-state">${phong === 'chung' ? tl('Chưa có ai nói gì. Chào mọi người đi!', 'Nobody has said anything yet. Say hi!') : tl('Gửi lời chào đầu tiên nhé.', 'Send the first message.')}</div>`);
    if(cuon || duoi) khung.scrollTop = khung.scrollHeight;
    const th = $('tcThem'); if(th) th.onclick = taiCu;
  };
  const docDen = () => { const max = tin.reduce((m, x) => Math.max(m, x.id), 0); if(max) sb.rpc('doc_tin', {p_phong: phong, p_den: max}).then(tcDoi, () => {}) };
  const tai = async (truocId) => {
    let q = sb.from('tin_nhan').select('id,phong,nguoi_gui,nguoi_nhan,noi_dung,da_xoa,tao_luc').eq('phong', phong).order('id', {ascending: false}).limit(40);
    if(truocId) q = q.lt('id', truocId);
    const {data, error} = await q; if(error){ khung.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return [] }
    const ds = (data || []).reverse(); if(ds.length < 40) het = true;
    await bbHoSo(ds.map(m => m.nguoi_gui)); return ds;
  };
  const taiCu = async () => { const h = khung.scrollHeight; const ds = await tai(cu); ds.forEach(m => daCo.add(m.id)); tin.unshift(...ds); if(ds.length) cu = ds[0].id; ve(); khung.scrollTop = khung.scrollHeight - h };
  TC.nhan = async (m, ev) => {
    if(!$('tcTin')) return;
    if(ev === 'UPDATE'){ const i = tin.findIndex(x => x.id === m.id); if(i >= 0){ tin[i] = {...tin[i], ...m}; ve() } return }
    if(daCo.has(m.id)) return; daCo.add(m.id); await bbHoSo([m.nguoi_gui]); tin.push(m); ve(m.nguoi_gui === user.id); docDen();
  };
  const ds = await tai(); if(!$('tcTin')) return;
  ds.forEach(m => daCo.add(m.id)); tin.push(...ds); cu = ds.length ? ds[0].id : null; ve(true); docDen();
  khung.onclick = async e => {
    const an = e.target.closest('[data-an]');
    if(an){ const {error} = await sb.rpc('qt_xoa_tin', {p_id: +an.dataset.an}); if(error) toast(error.message); else { const m = tin.find(x => x.id === +an.dataset.an); if(m){ m.da_xoa = true; ve() } } return }
    const h = e.target.closest('[data-hs]'); if(h){ TC.phong = null; hoSoScreen('stats', h.dataset.hs, () => chatScreen(phong, nguoi, back)) }
  };
  const nhap = $('tcNhap');
  nhap.oninput = () => { nhap.style.height = 'auto'; nhap.style.height = Math.min(120, nhap.scrollHeight) + 'px' };
  nhap.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); $('tcGo').requestSubmit() } };
  $('tcGo').onsubmit = async e => {
    e.preventDefault();
    const nd = nhap.value.trim(); if(!nd) return;
    $('tcGui').disabled = true;
    const {data, error} = await sb.rpc('gui_tin_nhan', {p_toi: nguoi || null, p_noi_dung: nd});
    if($('tcGui')) $('tcGui').disabled = false;
    if(error){ toast(error.message); return }
    nhap.value = ''; nhap.oninput();
    if(data) TC.nhan(data, 'INSERT');
    nhap.focus();
  };
}
