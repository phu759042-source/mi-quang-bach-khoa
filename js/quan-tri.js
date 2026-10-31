/* Mì Quảng Bách Khoa · js/quan-tri.js: Màn quản trị (bản 2.24.0) cho chủ game: danh sách người đang bị ẩn khỏi
   bảng xếp hạng vì lượt bất thường (bản ghi không khớp kết quả nộp, hoặc thiếu bản ghi), xem lại từng lượt,
   "Cho qua" (lượt thật) hoặc "Huỷ các lượt này" (gian lận: điểm lượt đó về 0, tính lại điểm).
   Quyền nằm ở server (bảng quan_tri, hàm la_quan_tri / qt_*); client chỉ ẩn hiện nút.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
let laQT = false;
async function kiemQuanTri(){
  laQT = false;
  if(!sb || !user) return;
  try{ const {data} = await sb.rpc('la_quan_tri'); laQT = data === true }catch(e){}
}
const qtNutHTML = () => laQT ? `<button class="btn ghost" id="quantri">${tl('Quản trị', 'Admin')} <span class="bb-so" id="qtSo" hidden></span></button>` : '';
async function qtDem(){
  if(!laQT) return;
  try{ const {data} = await sb.rpc('qt_danh_sach'); const n = (data || []).length, el = $('qtSo');
    if(el){ el.textContent = n; el.hidden = !n } }catch(e){}
}
async function quanTriScreen(back = home){
  if(!laQT) return back();
  nhoMan('quantri');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Quản trị', 'Admin')}</div><button class="link" id="back">${tl('Đóng', 'Close')}</button></div>
    <h2>${tl('Lượt chờ duyệt', 'Runs awaiting review')}</h2>
    <p class="muted">${tl('Những người dưới đây đang bị ẩn khỏi bảng xếp hạng vì có lượt bất thường. Xem lại bản ghi rồi chọn: <b>Cho qua</b> nếu là lượt thật, hoặc <b>Huỷ các lượt này</b> nếu gian lận (điểm các lượt đó về 0, điểm người chơi được tính lại từ các lượt còn lại). Mọi thao tác được ghi nhật ký.',
      'These players are hidden from the leaderboard because of unusual runs. Watch the recording, then choose <b>Approve</b> for genuine runs or <b>Void these runs</b> for cheating (those runs score 0 and the player\'s points are recalculated). Every action is logged.')}</p>
    <div class="col" id="qtBody"><div class="empty-state">${tl('Đang tải…', 'Loading…')}</div></div>
    <h3 style="margin-top:18px">${tl('Cảnh cáo và cấm', 'Warnings and bans')}</h3>
    <p class="muted">${tl(`Huỷ lượt gian lận tự cộng 1 lần cảnh cáo và gửi thông báo. Đủ ${CANH_CAO_MAX} lần thì tài khoản bị khoá, email vào danh sách đen.`, `Voiding cheated runs adds 1 warning and notifies the player. At ${CANH_CAO_MAX} warnings the account is banned and its email blacklisted.`)}</p>
    <div class="col" id="qtViPham"></div>`);
  $('back').onclick = () => back();
  const ve = async () => {
    const body = $('qtBody'); if(!body) return;
    const {data, error} = await sb.rpc('qt_danh_sach');
    if(!$('qtBody')) return;
    if(error){ body.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return }
    const ds = data || [];
    if(!ds.length){ body.innerHTML = `<div class="empty-state">${tl('Không có lượt nào chờ duyệt.', 'Nothing to review.')}</div>`; return }
    const gio = s => new Date(s).toLocaleString(EN ? 'en-GB' : 'vi-VN', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'});
    body.innerHTML = ds.map(p => `<div class="qt-the" data-qt-p="${p.id}">
      <div class="qt-dau"><button type="button" class="link qt-ten" data-hs="${p.id}">${esc(p.ten)}</button>
        <span class="sb">${lopKhoaHTML(p, false)} · ${soVN(p.diem)} ${tl('ĐBK', 'BKP')} · ${p.so_luot} ${tl('lượt', 'runs')}</span></div>
      <div class="qt-luot">${(p.luot || []).map(r => `<div class="qt-dong">
        <span><b>#${r.id}</b> ${DIFF[r.do_kho] ? DIFF[r.do_kho].n : r.do_kho} · ${r.so_ngay} ${tl('ngày', 'd')} · ${soVN(r.doanh_thu)}k · ${r.giay}s · ${r.delta >= 0 ? '+' : ''}${r.delta} ${tl('ĐBK', 'BKP')} · ${gio(r.ket_thuc)}</span>
        <span class="qt-ly-do">${esc(r.ly_do)}</span>
        ${r.co_ban_ghi ? `<button type="button" class="link" data-qt-rp="${r.id}" data-ten="${esc(p.ten)}" data-uid="${p.id}">${tl('Xem lại', 'Replay')}</button>` : ''}</div>`).join('')}</div>
      <div class="row qt-nut"><button type="button" class="btn ghost" data-qt="cho_qua" data-uid="${p.id}">${tl('Cho qua', 'Approve')}</button>
        <button type="button" class="btn warm" data-qt="huy" data-uid="${p.id}">${tl('Huỷ các lượt này', 'Void these runs')}</button></div>
      <div class="msg" data-qt-msg="${p.id}"></div></div>`).join('');
  };
  const veViPham = async () => {
    const el = $('qtViPham'); if(!el) return;
    const {data, error} = await sb.rpc('qt_ds_vi_pham');
    if(!$('qtViPham')) return;
    if(error){ el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return }
    el.innerHTML = (data || []).length ? `<div class="list">${data.map(p => `<div class="li qt-vp">
      <span class="nm"><button type="button" class="link qt-ten" data-hs="${p.id}">${esc(p.ten)}</button> ${p.bi_ban ? BAN_TAG() : ''}
        <span class="sb">${tl('Cảnh cáo', 'Warnings')} ${p.canh_cao}/${CANH_CAO_MAX} · ${esc(p.email || '')}${p.ban_luc ? ` · ${tl('bị ban', 'banned')} ${luc(p.ban_luc)}` : ''}</span></span>
      ${p.bi_ban ? `<button type="button" class="btn ghost" data-vp="go_ban" data-uid="${p.id}">${tl('Gỡ ban', 'Unban')}</button>`
        : `<button type="button" class="btn ghost" data-vp="canh_cao" data-uid="${p.id}">${tl('Cảnh cáo thêm', 'Add warning')}</button>`}</div>`).join('')}</div>`
      : `<div class="empty-state">${tl('Chưa ai bị cảnh cáo.', 'No warnings yet.')}</div>`;
  };
  $('qtViPham').onclick = async e => {
    const hs = e.target.closest('[data-hs]'); if(hs) return hoSoScreen('stats', hs.dataset.hs, () => quanTriScreen(back));
    const b = e.target.closest('[data-vp]'); if(!b) return;
    if(!b.dataset.sure){ b.dataset.sure = 1; b.textContent = tl('Bấm lần nữa để xác nhận', 'Tap again to confirm');
      setTimeout(() => { if(b.isConnected) veViPham() }, 4000); return }
    b.disabled = true;
    const {data, error} = await sb.rpc(b.dataset.vp === 'go_ban' ? 'qt_go_ban' : 'qt_canh_cao', {p_uid: b.dataset.uid});
    if(error){ toast(error.message); b.disabled = false; return }
    toast(b.dataset.vp === 'go_ban' ? tl('Đã gỡ ban', 'Unbanned') : data?.bi_ban ? tl(`Cảnh cáo ${data.canh_cao}/${CANH_CAO_MAX}: đã ban`, `Warning ${data.canh_cao}/${CANH_CAO_MAX}: banned`) : tl(`Cảnh cáo ${data?.canh_cao}/${CANH_CAO_MAX}`, `Warning ${data?.canh_cao}/${CANH_CAO_MAX}`));
    veViPham(); ve();
  };
  $('qtBody').onclick = async e => {
    const hs = e.target.closest('[data-hs]'); if(hs) return hoSoScreen('stats', hs.dataset.hs, () => quanTriScreen(back));
    const rp = e.target.closest('[data-qt-rp]');
    if(rp) return replayScreen({run: +rp.dataset.qtRp, first: rp.dataset.uid, title: `${tl('Lượt', 'Run')} #${rp.dataset.qtRp} · ${rp.dataset.ten}`, back: () => quanTriScreen(back)});
    const b = e.target.closest('[data-qt]'); if(!b) return;
    const uid = b.dataset.uid, msg = document.querySelector(`[data-qt-msg="${uid}"]`);
    if(b.dataset.qt === 'huy' && !b.dataset.sure){ b.dataset.sure = 1; b.textContent = tl('Bấm lần nữa để huỷ', 'Tap again to void');
      setTimeout(() => { if(b.isConnected){ delete b.dataset.sure; b.textContent = tl('Huỷ các lượt này', 'Void these runs') } }, 4000); return }
    b.disabled = true;
    const {data, error} = await sb.rpc(b.dataset.qt === 'huy' ? 'qt_huy_luot' : 'qt_cho_qua', {p_uid: uid});
    if(error){ b.disabled = false; if(msg){ msg.className = 'msg'; msg.textContent = error.message } return }
    toast(b.dataset.qt === 'huy' ? tl(`Đã huỷ ${data?.so_luot_huy ?? ''} lượt, điểm ${soVN(data?.diem_cu ?? 0)} → ${soVN(data?.diem_moi ?? 0)}${data?.canh_cao ? `, cảnh cáo ${data.canh_cao}/${CANH_CAO_MAX}${data.bi_ban ? ', đã ban' : ''}` : ''}`, `Voided ${data?.so_luot_huy ?? ''} runs, points ${data?.diem_cu ?? 0} → ${data?.diem_moi ?? 0}`)
                                 : tl('Đã cho qua', 'Approved'));
    ve(); veViPham();
  };
  ve(); veViPham();
}
