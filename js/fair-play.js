/* Mì Quảng Bách Khoa · js/fair-play.js: Fair play (bản 2.25.0): nhãn "Bị ban", màn báo tài khoản bị khoá,
   chặn đăng nhập/đăng ký bằng email trong danh sách đen, thẻ cảnh cáo trên màn chính, báo online.
   Quyền và luật nằm ở server (profiles.canh_cao, bi_ban, danh_sach_den, _kiem_ban); client chỉ hiển thị.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
const CANH_CAO_MAX = 3;
const BAN_TAG = () => `<span class="ban-tag" title="${tl('Bị cấm vì vi phạm fair play', 'Banned for breaking fair play')}">${tl('Bị ban · vi phạm fair play', 'Banned · fair play')}</span>`;
const banMsg = () => tl('Email này đã bị cấm vì vi phạm fair play (gian lận điểm 3 lần). Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ người làm game.',
  'This email is banned for breaking fair play (cheating 3 times). If you think this is a mistake, contact the developer.');

async function emailBiCam(email){
  if(!sb || !email) return false;
  try{ const {data} = await sb.rpc('email_bi_cam', {p_email: email}); return data === true }catch(e){ return false }
}

/* Đăng nhập vào tài khoản đã bị ban: chỉ hiện thông báo, không vào game */
function banScreen(){
  nhoMan(null);
  openOv(`<div class="ban-man"><div class="eyebrow" style="color:var(--chili)">${tl('Fair play', 'Fair play')}</div>
    <h2>${tl('Tài khoản đã bị khoá', 'Account banned')}</h2>
    <p>${tl(`Tài khoản <b>${esc(profile?.ten || '')}</b> đã bị cảnh cáo ${CANH_CAO_MAX} lần vì có lượt bán gian lận, nên đã bị khoá vĩnh viễn. Bạn không thể chơi, solo, kết bạn hay nhắn tin nữa, và email này không dùng để đăng ký lại được.`,
      `<b>${esc(profile?.ten || '')}</b> was warned ${CANH_CAO_MAX} times for cheated runs and is permanently banned. You can no longer play, duel, add friends or chat, and this email cannot be used to sign up again.`)}</p>
    <p class="muted">${tl('Tên bạn vẫn hiện trên bảng xếp hạng với nhãn đỏ "Bị ban". Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ người làm game.',
      'Your name stays on the leaderboard with a red "Banned" tag. If you think this is a mistake, contact the developer.')}</p>
    <div class="col grow"><button class="btn ghost" id="banLienHe">${tl('Liên hệ người làm game', 'Contact the developer')}</button>
    <button class="btn" id="banOut">${tl('Đăng xuất', 'Sign out')}</button>
    <button class="link" id="banVeGame">${tl('Quy tắc fair play', 'Fair play rules')}</button></div></div>`);
  $('banLienHe').onclick = () => contactScreen(banScreen);
  $('banVeGame').onclick = () => veGameScreen(banScreen);
  $('banOut').onclick = logout;
}

/* Thẻ cảnh cáo trên màn chính của chính người đó */
function canhCaoCardHTML(){
  if(!ranked || !profile || !profile.canh_cao || profile.bi_ban) return '';
  return `<p class="msg canh-cao-the">${tl(`<b>Cảnh cáo ${profile.canh_cao}/${CANH_CAO_MAX}.</b> Bạn có lượt bán bất thường đã bị huỷ và không được tính điểm. Đủ ${CANH_CAO_MAX} lần cảnh cáo, tài khoản sẽ bị khoá vĩnh viễn.`,
    `<b>Warning ${profile.canh_cao}/${CANH_CAO_MAX}.</b> Some of your runs looked abnormal and were voided. At ${CANH_CAO_MAX} warnings your account is permanently banned.`)}</p>`;
}

/* Báo online: lúc đăng nhập và mỗi 4 phút khi tab đang mở */
let onlineT = null;
function batBaoOnline(){
  const bao = () => { if(sb && user && document.visibilityState === 'visible') sb.rpc('bao_online').then(() => {}, () => {}) };
  bao(); clearInterval(onlineT); onlineT = setInterval(bao, 240e3);
}

/* "3 phút trước", "hôm qua"… */
function luc(ts){
  if(!ts) return '';
  const s = (Date.now() - new Date(ts)) / 1000;
  if(s < 90) return tl('vừa xong', 'just now');
  if(s < 3600) return tl(`${Math.round(s / 60)} phút trước`, `${Math.round(s / 60)} min ago`);
  if(s < 86400) return tl(`${Math.round(s / 3600)} giờ trước`, `${Math.round(s / 3600)} h ago`);
  if(s < 86400 * 7) return tl(`${Math.round(s / 86400)} ngày trước`, `${Math.round(s / 86400)} days ago`);
  return new Date(ts).toLocaleDateString(EN ? 'en-GB' : 'vi-VN');
}
const ngayThang = ts => ts ? new Date(ts).toLocaleDateString(EN ? 'en-GB' : 'vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '';

/* Thông báo của hệ thống trong chuông (cảnh cáo, bị ban, đối thủ từng solo bị ban, gỡ ban) */
const HE_THONG = ['canh_cao', 'bi_ban', 'doi_thu_bi_ban', 'go_ban'];
function tbChu(t, ngan){
  const c = t.chi_tiet || {}, ten = esc(BB.hs.get(t.tu)?.ten || NGUOI_CHOI);
  if(t.loai === 'canh_cao') return ngan ? tl(`Cảnh cáo ${c.lan || 1}/${CANH_CAO_MAX}: lượt bán bất thường đã bị huỷ`, `Warning ${c.lan || 1}/${CANH_CAO_MAX}: abnormal runs voided`)
    : tl(`<b>Cảnh cáo ${c.lan || 1}/${CANH_CAO_MAX}.</b> Bạn có ${c.so_luot ? `${c.so_luot} ` : ''}lượt bán có dấu hiệu bất thường và đã bị quản trị huỷ, các lượt đó không được tính điểm. Đủ ${CANH_CAO_MAX} lần cảnh cáo, tài khoản sẽ bị khoá vĩnh viễn.`,
         `<b>Warning ${c.lan || 1}/${CANH_CAO_MAX}.</b> ${c.so_luot ? `${c.so_luot} of your` : 'Some of your'} runs looked abnormal and were voided by an admin; they do not count. At ${CANH_CAO_MAX} warnings your account is permanently banned.`);
  if(t.loai === 'bi_ban') return ngan ? tl('Tài khoản của bạn đã bị khoá vì vi phạm fair play', 'Your account was banned for breaking fair play')
    : tl(`<b>Tài khoản đã bị khoá.</b> Bạn đã bị cảnh cáo ${CANH_CAO_MAX} lần vì gian lận điểm.`, `<b>Account banned.</b> You were warned ${CANH_CAO_MAX} times for cheating.`);
  if(t.loai === 'doi_thu_bi_ban') return ngan ? tl(`${ten} từng solo với bạn đã bị ban`, `${ten}, who dueled you, was banned`)
    : tl(`<b>${ten}</b>, người từng solo với bạn, đã bị ban vì vi phạm fair play.`, `<b>${ten}</b>, who dueled you before, was banned for breaking fair play.`);
  return ngan ? tl('Tài khoản đã được mở khoá', 'Your account was unbanned') : tl('<b>Tài khoản của bạn đã được mở khoá.</b> Chúc bạn chơi vui và công bằng.', '<b>Your account was unbanned.</b> Play fair and have fun.');
}
function tbHeThongHTML(t, p){
  const coNguoi = t.loai === 'doi_thu_bi_ban' && t.tu;
  return `<div class="li tb-li tb-ht ${t.loai}${t.da_doc ? '' : ' moi'}"${coNguoi ? ` data-prof="${t.tu}" role="button" tabindex="0"` : ''}>
    <span>${coNguoi ? avatarHTML(p.avatar_url, p.ten, 38) : `<span class="tb-ht-icon" aria-hidden="true">${t.loai === 'go_ban' ? '✓' : '!'}</span>`}</span>
    <span class="nm"><span>${tbChu(t)}</span><span class="sb">${luc(t.tao_luc)}${coNguoi ? '' : tl(' · Quản trị', ' · Admin')}</span></span></div>`;
}
