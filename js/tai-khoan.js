/* Mì Quảng Bách Khoa · js/tai-khoan.js: Đăng nhập, đăng ký, quên mật khẩu, sửa hồ sơ, avatar.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Màn hình tài khoản ================= */
function showOv(on){const ov=$('ov');ov.hidden=!on;ov.style.display=on?'flex':'none';
  const v=$('visits');if(v){const show=on&&visitCount!=null;v.hidden=!show;v.style.display=show?'flex':'none'}}
let visitCount=null;
// Bộ đếm truy cập (bản 2.15.3): mở trang chỉ đọc số (p_khach = null). Chỉ ghi nhận một "người" khi có thao tác thật
// (chạm, bấm, gõ phím) và trình duyệt không tự nhận là tự động / bot, vì bot quét web chạy được JS nhưng hiếm khi bấm.
// Server còn giới hạn 20 người mới / giờ / địa chỉ mạng (ghi_luot_truy_cap).
function hienSoTruyCap(data){
  if(!data) return;
  visitCount=data.luot??data.tong;
  $('vTong').textContent=soVN(visitCount);
  $('vNguoi').textContent=soVN(data.nguoi??0);
  $('visits').title=tl(`Lượt truy cập: mỗi lần mở trang tính 1 lượt. Người: số trình duyệt khác nhau đã ghé. Hôm nay có ${data.hom_nay} người ghé.`,`Visits: every page open counts once. People: distinct browsers that visited. ${data.hom_nay} people today.`);
  showOv(!$('ov').hidden);
}
const laBot=()=>navigator.webdriver===true||/bot|crawl|spider|slurp|headless|lighthouse|preview|scan|fetch/i.test(navigator.userAgent||'');
async function countVisit(){
  const {data}=await rpcRetry('ghi_luot_truy_cap',{p_khach:null},2);
  hienSoTruyCap(data);
  if(laBot()) return;
  const EV=['pointerdown','keydown','touchstart'];
  const ghi=async()=>{
    EV.forEach(ev=>removeEventListener(ev,ghi,true));
    let id=null;
    try{id=localStorage.getItem('mqbk-khach');if(!id){id=crypto.randomUUID();localStorage.setItem('mqbk-khach',id)}}catch(e){id=null}
    if(!id) return;
    const {data}=await rpcRetry('ghi_luot_truy_cap',{p_khach:id},2);
    hienSoTruyCap(data);
  };
  EV.forEach(ev=>addEventListener(ev,ghi,{capture:true,passive:true}));
}
function openOv(html){const ov=$('ov');showOv(true);ov.innerHTML=html;ov.scrollTop=0;return ov}
const khoaTen=id=>tKhoa((khoaList.find(k=>k.id===id)||{}).ten||'');
// Bản 2.17.0: người chơi không phải sinh viên BKĐN để trống khoa/lớp (cột profiles.sinh_vien = false)
const laSV=p=>!!p&&(p.sinh_vien??!!p.lop);
const NGOAI_BK=`<span class="ngoai-bk" title="${tl('Không phải sinh viên Bách Khoa Đà Nẵng','Not a Bach Khoa Da Nang student')}">${tl('Ngoài BK','Non-BK')}</span>`;
// Bản 2.21.0: người ngoài BKĐN có trường thì hiện tên trường thay cho nhãn "Ngoài BK"
let truongList=[];
const truongTen=id=>(truongList.find(t=>t.id===id)||{}).ten_ngan||'';
const truongCua=p=>p&&p.truong_id&&p.truong_id!=='khac'&&!laSV(p)?(p.truong||truongTen(p.truong_id)):'';
// Bản 2.22.0: giáo viên có nhãn GV trước tên trường
const GV_TAG=()=>`<span class="ngoai-bk gv-tag" title="${tl('Giáo viên, giảng viên','Teacher or lecturer')}">${tl('GV','Teacher')}</span>`;
const lopKhoaHTML=(p,khoa)=>laSV(p)?esc(p.lop)+(khoa===false?'':' · '+esc(tKhoa(khoa??khoaTen(p.khoa_id))))
  :p&&p.giang_vien?GV_TAG()+(truongCua(p)?` <span class="ngoai-bk truong-tag">${esc(truongCua(p))}</span>`:'')
  :truongCua(p)?`<span class="ngoai-bk truong-tag">${esc(truongCua(p))}</span>`:NGOAI_BK;

function authScreen(mode='login'){
  openOv(`<div class="split"><div class="split-a">
  <img class="hero-icon desk" src="icons/favicon.svg" alt="" width="88" height="88">
  <div class="home-top"><div class="eyebrow">${tl('Lấy cảm hứng từ Mì Quảng Bích · 1-3 Đặng Dung, Hòa Khánh Bắc','Inspired by Mì Quảng Bích · 1-3 Dang Dung, Hoa Khanh Bac')}</div><div class="top-act">${langHTML()}</div></div>
  <h1>${TEN_H1}</h1>
  <p>${tl('Mở quán mì Quảng ở Hòa Khánh Bắc, nơi sinh viên Bách Khoa Đà Nẵng hay ghé ăn, và bán cho sinh viên các khoa. Mỗi lượt chơi cộng hoặc trừ <b>Điểm Bách Khoa</b> cho bạn, cho lớp và cho khoa của bạn.','Run a mì Quảng noodle shop in Hoa Khanh Bac, where Da Nang University of Science and Technology (Bach Khoa) students eat, and serve students from every faculty. Every run adds or subtracts <b>Bach Khoa Points</b> for you, your class and your faculty.')}</p>
  </div><div class="split-b">
  <form class="col" id="f" novalidate>
    <label>Email<input id="em" type="email" autocomplete="email" required placeholder="${tl('ban@email.com','you@email.com')}"></label>
    <label>${tl('Mật khẩu','Password')}<input id="pw" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="6" required placeholder="${tl('Ít nhất 6 ký tự','At least 6 characters')}"></label>
    <div class="msg" id="msg"></div>
    ${thuHTML()}
    ${mode==='signup'?`<p class="muted" style="margin:0;font-size:13px">${tl('Tạo tài khoản là bạn đồng ý với cách game lưu và dùng dữ liệu ở mục "Về game &amp; chính sách dữ liệu" bên dưới.','By creating an account you agree to how the game stores and uses data, described in "About &amp; data policy" below.')}</p>`:''}
    <button class="btn" type="submit">${mode==='login'?tl('Đăng nhập','Sign in'):tl('Tạo tài khoản','Create account')}</button>
  </form>
  <button class="link" id="sw">${mode==='login'?tl('Chưa có tài khoản? Đăng ký','No account? Sign up'):tl('Đã có tài khoản? Đăng nhập','Have an account? Sign in')}</button>
  ${mode==='login'?`<button class="link" id="forgot">${tl('Quên mật khẩu?','Forgot password?')}</button>`:''}
  <button class="link" id="guest">${tl('Chơi thử, không tính điểm','Play a trial run (no points)')}</button>
  ${themeHTML()}
  <button class="link" id="contact">${tl('Liên hệ người làm game','Contact the developer')}</button>
  <button class="link" id="vegame">${tl('Về game &amp; chính sách dữ liệu','About &amp; data policy')}</button>
  </div></div>`);
  $('contact').onclick=()=>contactScreen(()=>authScreen(mode));
  $('vegame').onclick=()=>veGameScreen(()=>authScreen(mode));
  if(linkError){$('msg').textContent=linkError;linkError=''}
  if(mode==='login') $('forgot').onclick=()=>forgotScreen($('em').value.trim());
  $('sw').onclick=()=>authScreen(mode==='login'?'signup':'login');
  $('guest').onclick=()=>{ranked=false;home()};
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const email=$('em').value.trim(), pw=$('pw').value, msg=$('msg');
    if(!/^\S+@\S+\.\S+$/.test(email)){msg.textContent=tl('Email chưa đúng định dạng.','That email does not look right.');return}
    if(pw.length<6){msg.textContent=tl('Mật khẩu cần ít nhất 6 ký tự.','Password needs at least 6 characters.');return}
    msg.className='msg ok'; msg.textContent=mode==='login'?tl('Đang đăng nhập…','Signing in…'):tl('Đang tạo tài khoản…','Creating account…');
    const res=mode==='login'
      ? await sb.auth.signInWithPassword({email,password:pw})
      : await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname,data:{lang:LANG}}});   // lang: chọn mẫu email Việt / Anh
    if(res.error){msg.className='msg';msg.textContent=viErr(res.error.message);return}
    if(mode==='signup'&&!res.data.session){msg.textContent=tl('Đã gửi email xác nhận. Mở email, bấm link xác nhận rồi quay lại đăng nhập.','Confirmation email sent. Open it, tap the link, then come back and sign in.');return}
    user=res.data.user; await afterLogin();
  };
}
const BACK_URL=location.origin+location.pathname;
function forgotScreen(email=''){
  openOv(`<div class="eyebrow">${tl('Tài khoản','Account')}</div><h2>${tl('Quên mật khẩu','Forgot password')}</h2>
  <p class="muted">${tl('Nhập email bạn đã đăng ký. Mình sẽ gửi link để bạn đặt mật khẩu mới.','Enter the email you signed up with. We will send a link to set a new password.')}</p>
  <form class="col" id="f" novalidate>
    <label>Email<input id="em" type="email" autocomplete="email" value="${esc(email)}" placeholder="${tl('ban@email.com','you@email.com')}"></label>
    <div class="msg" id="msg"></div>
    <button class="btn" type="submit">${tl('Gửi link đặt lại mật khẩu','Send reset link')}</button>
  </form>
  <button class="link" id="back">${tl('Quay lại đăng nhập','Back to sign in')}</button>`);
  $('back').onclick=()=>authScreen('login');
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const em=$('em').value.trim(), msg=$('msg');
    if(!/^\S+@\S+\.\S+$/.test(em)){msg.className='msg';msg.textContent=tl('Email chưa đúng định dạng.','That email does not look right.');return}
    msg.className='msg ok';msg.textContent=tl('Đang gửi…','Sending…');
    const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:BACK_URL});
    if(error){msg.className='msg';msg.textContent=viErr(error.message);return}
    msg.textContent=tl('Đã gửi. Mở email từ Mì Quảng Bách Khoa và bấm nút Đặt mật khẩu mới. Nhớ xem cả mục Spam.','Sent. Open the email from Mì Quảng Bách Khoa and tap the reset button. Check Spam too.');
  };
}
function newPasswordScreen(){
  openOv(`<div class="eyebrow">${tl('Tài khoản','Account')}</div><h2>${tl('Đặt mật khẩu mới','Set a new password')}</h2>
  <form class="col" id="f" novalidate>
    <label>${tl('Mật khẩu mới','New password')}<input id="pw" type="password" autocomplete="new-password" placeholder="${tl('Ít nhất 6 ký tự','At least 6 characters')}"></label>
    <label>${tl('Nhập lại mật khẩu','Repeat password')}<input id="pw2" type="password" autocomplete="new-password"></label>
    <div class="msg" id="msg"></div>
    <button class="btn" type="submit">${tl('Lưu mật khẩu','Save password')}</button>
  </form>`);
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const pw=$('pw').value, msg=$('msg');
    if(pw.length<6){msg.className='msg';msg.textContent=tl('Mật khẩu cần ít nhất 6 ký tự.','Password needs at least 6 characters.');return}
    if(pw!==$('pw2').value){msg.className='msg';msg.textContent=tl('Hai mật khẩu chưa giống nhau.','The passwords do not match.');return}
    msg.className='msg ok';msg.textContent=tl('Đang lưu…','Saving…');
    const {data,error}=await sb.auth.updateUser({password:pw});
    if(error){msg.className='msg';msg.textContent=viErr(error.message);return}
    recovering=false; user=data.user; toast(tl('Đã đổi mật khẩu','Password changed')); await afterLogin();
  };
}
function viErr(m){
  if(EN) return m;
  if(/should be different/i.test(m)) return 'Mật khẩu mới phải khác mật khẩu cũ.';
  if(/session missing|expired|invalid.*(link|token)/i.test(m)) return 'Link đã hết hạn hoặc đã dùng rồi. Hãy gửi lại link mới.';
  if(/Invalid login/i.test(m)) return 'Sai email hoặc mật khẩu.';
  if(/not confirmed/i.test(m)) return 'Email chưa được xác nhận. Kiểm tra hộp thư (cả mục Spam).';
  if(/already registered/i.test(m)) return 'Email này đã có tài khoản, hãy đăng nhập.';
  if(/rate limit/i.test(m)) return 'Hệ thống đang quá tải email, thử lại sau ít phút.';
  return m;
}
async function afterLogin(){
  // Bản 2.19.1: ghi ngôn ngữ đang dùng vào user_metadata.lang để email (đặt lại mật khẩu…) gửi đúng tiếng Việt / Anh
  if(user&&user.user_metadata?.lang!==LANG) try{sb.auth.updateUser({data:{lang:LANG}}).catch(()=>{})}catch(e){}
  await loadProfile();
  if(profile){await flushPending(); recFlush()}
  ranked=!!profile; if(ranked){soloConnect();pushResync();if(pendingThach){const t=pendingThach;pendingThach=null;setTimeout(()=>openThach(t),900)}}
  if(profile&&await soloBoot()) return;
  if(profile&&await resumeRun()) return;
  if(!profile) return profileScreen();
  if(!(await moLaiMan())) home();
  if(!profile.so_luot) nhanLuotThu();
}
async function loadKhoa(){
  const [{data},t]=await Promise.all([sb.from('khoa').select('id,ten').order('ten'),
    sb.from('truong').select('id,ten,ten_ngan,tinh').then(r=>r,()=>({data:null}))]);
  khoaList=data||[]; truongList=t.data||[];
}
async function loadProfile(){
  const {data}=await sb.from('profiles').select('ten,khoa_id,lop,sinh_vien,truong_id,giang_vien,diem,so_luot,ngay_xa_nhat,chuoi,ngay_chuoi,chuoi_dai_nhat,avatar_url,avatar_khung,elo,solo_thang,solo_thua,solo_hoa').eq('id',user.id).maybeSingle();
  profile=data||null; myRank=null;
  if(profile&&profile.so_luot>0){
    const r=await sb.from('bxh_sinh_vien').select('hang').eq('id',user.id).maybeSingle();
    myRank=r.data?.hang??null;
  }
}
function profileScreen(){
  const p=profile||{}; if(profile) nhoMan('suahoso');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${profile?tl('Sửa hồ sơ','Edit profile'):tl('Bước cuối','Last step')}</div>${profile?`<button type="button" class="link" id="pClose">${tl('Đóng','Close')}</button>`:''}</div><h2>${profile?tl('Thông tin của bạn','Your details'):tl('Giới thiệu một chút về bạn','Tell us about you')}</h2>
  <p class="muted">${profile&&!laSV(p)?tl('Tên sẽ hiện công khai trên bảng xếp hạng.','Your name is shown publicly on the leaderboard.'):tl('Tên, lớp và khoa sẽ hiện công khai trên bảng xếp hạng.','Your name, class and faculty are shown publicly on the leaderboard.')} ${tl('Không cần nhập MSSV.','No student ID needed.')}</p>
  ${profile?`<div class="av-edit">${avatarHTML(p.avatar_url,p.ten,72)}
    <div class="col" style="gap:4px"><b>Avatar</b><span class="muted">${tl('Hiện cạnh tên bạn trên bảng xếp hạng sinh viên.','Shown next to your name on the leaderboard.')}</span>
    <div class="row">${p.avatar_url?`<button type="button" class="link" id="avAdjust">${tl('Chỉnh lại khung','Adjust crop')}</button><button type="button" class="link" id="avNew">${tl('Đổi ảnh','Change photo')}</button><button type="button" class="link" id="avDel">${tl('Xoá','Remove')}</button>`
      :`<button type="button" class="link" id="avNew">${tl('Thêm avatar','Add avatar')}</button>`}</div></div></div>`
    :`<p class="muted">${tl('Lưu hồ sơ xong, bấm vào thẻ tên của bạn ở màn chính để thêm avatar.','After saving, tap your name card on the home screen to add an avatar.')}</p>`}
  <form class="col" id="f" novalidate>
    <label>${tl('Tên hiển thị','Display name')}<input id="ten" maxlength="40" autocomplete="nickname" value="${esc(p.ten)}" placeholder="${tl('Ví dụ: Phú 26T','e.g. Phu 26T')}"></label>
    <fieldset class="sv-hoi"><legend>${truongList.length?tl('Bạn là ai, học hoặc dạy ở đâu?','Who are you, and where do you study or teach?'):tl('Bạn có phải sinh viên Trường Đại học Bách Khoa, Đại học Đà Nẵng không?','Are you a student at the University of Science and Technology, University of Da Nang (Bach Khoa)?')}</legend>
      <div class="sv-chon${truongList.length?' c4':''}" role="radiogroup" aria-label="${tl('Trường của bạn','Your school')}">
        <button type="button" class="diff" role="radio" data-sv="1" aria-pressed="false" aria-checked="false"><b>${truongList.length?tl('Sinh viên BK Đà Nẵng','BK Da Nang student'):tl('Có','Yes')}</b><small>${tl('Chọn khoa, lớp','Pick faculty and class')}</small></button>
        ${truongList.length?`<button type="button" class="diff" role="radio" data-sv="2" aria-pressed="false" aria-checked="false"><b>${tl('Sinh viên trường khác','Student elsewhere')}</b><small>${tl('Đua điểm cho trường mình','Compete for my school')}</small></button>
        <button type="button" class="diff" role="radio" data-sv="3" aria-pressed="false" aria-checked="false"><b>${tl('Giáo viên','Teacher')}</b><small>${tl('Thầy cô, giảng viên','Teachers and lecturers')}</small></button>`:''}
        <button type="button" class="diff" role="radio" data-sv="0" aria-pressed="false" aria-checked="false"><b>${truongList.length?tl('Không đi học','Not a student'):tl('Không','No')}</b><small>${tl('Mình chơi cho vui','Just playing for fun')}</small></button></div>
      <p class="sv-note" id="svNote" hidden></p></fieldset>
    <div class="col" id="trFields" hidden><label><span id="trNhan">${tl('Trường','School')}</span><select id="truong"><option value="">${tl('Chọn trường','Pick a school')}</option>${(()=>{
      const ds=truongList.filter(t=>t.id!=='khac'), tinh=[...new Set(ds.map(t=>t.tinh))].sort((a,b)=>(a==='Đà Nẵng'?-1:b==='Đà Nẵng'?1:a.localeCompare(b,'vi')));
      return tinh.map(n=>`<optgroup label="${esc(n)}">${ds.filter(t=>t.tinh===n).sort((a,b)=>(b.id==='dut')-(a.id==='dut')||a.ten.localeCompare(b.ten,'vi')).map(t=>`<option value="${t.id}"${t.id===p.truong_id?' selected':''}${t.id==='dut'&&!p.giang_vien?' disabled':''}>${esc(t.ten)}</option>`).join('')}</optgroup>`).join('')
        +`<option value="khac"${p.truong_id==='khac'?' selected':''}>${tl('Trường khác (chưa có trong danh sách)','Other (not listed)')}</option>`})()}</select></label></div>
    <div class="col" id="svFields" hidden>
    <label>${tl('Khoa','Faculty')}<select id="khoa"><option value="">${tl('Chọn khoa','Pick a faculty')}</option>${khoaList.map(k=>`<option value="${k.id}"${k.id===p.khoa_id?' selected':''}>${esc(EN?tKhoa(k.id):k.ten)}</option>`).join('')}</select></label>
    <label>${tl('Lớp sinh hoạt','Class')}<input id="lop" maxlength="16" value="${esc(p.lop)}" placeholder="${tl('Ví dụ: 26T_ATTT','e.g. 26T_ATTT')}" autocapitalize="characters"></label></div>
    <div class="msg" id="msg"></div>
    <button class="btn" type="submit">${tl('Lưu và vào quán','Save and open the shop')}</button>
  </form>
  <button class="link" id="out">${tl('Đăng xuất','Sign out')}</button>
  ${profile?`<button type="button" class="link nguy" id="xoaTK">${tl('Xoá tài khoản','Delete account')}</button>`:''}`);
  if(profile){(async()=>{const st=await pushState(),el=document.createElement('div');el.className='push-row';
    el.innerHTML=`${BELL}<span><b>${tl('Thông báo thách đấu','Challenge notifications')}</b><br>${st==='on'?tl('Đang bật trên máy này.','On for this device.'):st==='ios'?tl('Cần thêm game vào Màn hình chính trước.','Add the game to your Home Screen first.'):st==='denied'?tl('Đang bị chặn trong cài đặt trình duyệt.','Blocked in browser settings.'):st==='unsupported'?tl('Trình duyệt này chưa hỗ trợ.','Not supported by this browser.'):tl('Đang tắt trên máy này.','Off for this device.')}</span>
      ${st==='unsupported'?'':`<button type="button" class="link" id="pushTg">${st==='on'?tl('Tắt','Turn off'):st==='ios'||st==='denied'?tl('Xem cách làm','How to'):tl('Bật','Turn on')}</button>`}`;
    const f=$('f'); if(f) f.before(el);
    const b=$('pushTg'); if(b) b.onclick=async()=>{if(st==='on'){await disablePush()}else{await enablePush()} profileScreen()};})()}
  $('out').onclick=logout; if($('pClose')) $('pClose').onclick=home;
  if($('xoaTK')) $('xoaTK').onclick=xoaTaiKhoanScreen;
  if($('avNew')) $('avNew').onclick=chooseAvatar;
  if($('avAdjust')) $('avAdjust').onclick=readjustAvatar;
  if($('avDel')) $('avDel').onclick=e=>{if(e.target.dataset.sure){removeAvatar()}else{e.target.dataset.sure=1;e.target.textContent=tl('Bấm lần nữa để xoá','Tap again to remove')}};
  // 1 = sinh viên BKĐN, 2 = trường khác (bản 2.21.0), 0 = không đi học. Người đã có hồ sơ giữ lựa chọn cũ.
  // 1 SV BKĐN · 2 SV trường khác · 3 giáo viên (bản 2.22.0) · 0 không đi học
  let sv=profile?(laSV(p)?1:p.giang_vien&&truongList.length?3:p.truong_id&&truongList.length?2:0):null;
  const chonSV=v=>{sv=v;
    $('f').querySelectorAll('[data-sv]').forEach(b=>{const on=String(v)===b.dataset.sv;b.setAttribute('aria-pressed',on);b.setAttribute('aria-checked',on)});
    $('svFields').hidden=v!==1; $('trFields').hidden=v!==2&&v!==3; const n=$('svNote');
    const dut=$('truong').querySelector('[value="dut"]'); if(dut){dut.disabled=v!==3; if(v!==3&&$('truong').value==='dut') $('truong').value=''}
    $('trNhan').textContent=v===3?tl('Trường bạn dạy','School you teach at'):tl('Trường','School'); n.hidden=false; n.className='sv-note '+(v?'co':'khong');
    n.innerHTML=v===3?tl('<b>Lưu ý:</b> thầy cô chọn trường mình dạy, kể cả Bách Khoa Đà Nẵng. Điểm được cộng cho trường trên bảng <b>Trường</b>, tên có nhãn <b>GV</b> và đua cùng sinh viên trên bảng Cá nhân. Bảng Lớp và Khoa chỉ tính sinh viên.','<b>Note:</b> teachers pick the school they teach at, including Bach Khoa Da Nang. Your points count for that school on the <b>Schools</b> board, your name gets a <b>Teacher</b> tag, and you compete with students on the Players board. Classes and Faculties count students only.')
      :v===2?tl('<b>Lưu ý:</b> điểm của bạn được cộng cho trường trên bảng xếp hạng <b>Trường</b>. Bảng Lớp và Khoa chỉ dành cho sinh viên BKĐN. Trường bạn chưa có trong danh sách thì chọn "Trường khác" và nhắn người làm game để thêm.','<b>Note:</b> your points count for your school on the <b>Schools</b> leaderboard. Classes and Faculties are for Bach Khoa Da Nang students only. If your school is not listed, pick "Other" and message the developer to add it.')
      :v===1?tl('<b>Lưu ý:</b> sinh viên Bách Khoa cần chọn khoa và nhập lớp. Điểm của bạn được cộng vào bảng xếp hạng lớp và khoa.','<b>Note:</b> Bach Khoa students must pick a faculty and enter a class. Your points also count for your class and faculty.')
      :tl('<b>Lưu ý:</b> không cần khoa và lớp. Bạn vẫn chơi, tính ĐBK, solo và lên bảng xếp hạng chung như mọi người, chỉ không được tính vào bảng lớp và khoa. Tên bạn sẽ có nhãn "Ngoài BK".','<b>Note:</b> no faculty or class needed. You still play, earn BKP, play solo and appear on the overall leaderboard, but you are not counted in the class and faculty boards. Your name gets a "Non-BK" tag.')};
  $('f').querySelector('.sv-chon').onclick=e=>{const b=e.target.closest('[data-sv]');if(b){chonSV(+b.dataset.sv);$('msg').textContent=''}};
  if(sv!==null) chonSV(sv);
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const ten=$('ten').value.trim(), kh=$('khoa').value, lop=$('lop').value.trim().toUpperCase().replace(/\s+/g,'_'), msg=$('msg');
    msg.className='msg';
    if(ten.length<2){msg.textContent=tl('Tên cần từ 2 ký tự.','Name needs at least 2 characters.');return}
    if(sv===null){msg.textContent=truongList.length?tl('Chọn bạn đang học ở đâu.','Choose where you study.'):tl('Chọn bạn có phải sinh viên Bách Khoa Đà Nẵng không.','Choose whether you are a Bach Khoa Da Nang student.');return}
    const tr=$('truong').value;
    if((sv===2||sv===3)&&!tr){msg.textContent=sv===3?tl('Chọn trường bạn dạy.','Pick the school you teach at.'):tl('Chọn trường của bạn.','Pick your school.');return}
    if(sv===1&&!kh){msg.textContent=tl('Chọn khoa của bạn.','Pick your faculty.');return}
    if(sv===1&&!/^[0-9]{2}[A-Z0-9_]{1,14}$/.test(lop)){msg.textContent=tl('Lớp bắt đầu bằng 2 số khoá, ví dụ 26T_ATTT.','Class starts with the 2-digit intake year, e.g. 26T_ATTT.');return}
    msg.className='msg ok'; msg.textContent=tl('Đang lưu…','Saving…');
    const {error}=await sb.rpc('luu_ho_so',sv===1?{p_ten:ten,p_khoa_id:kh,p_lop:lop,p_sinh_vien:true}:{p_ten:ten,p_khoa_id:null,p_lop:null,p_sinh_vien:false,...(truongList.length?{p_truong_id:sv===2||sv===3?tr:null,p_giang_vien:sv===3}:{})});
    if(error){msg.className='msg';msg.textContent=tl('Không lưu được: ','Could not save: ')+error.message;return}
    const moi=!profile; await loadProfile(); ranked=true; soloConnect(); home(); if(moi) nhanLuotThu();
  };
}
/* Xoá tài khoản (bản 2.18.0): xoá ảnh đại diện trong Storage, thôi nhận thông báo đẩy, rồi RPC xoa_tai_khoan
   xoá dòng auth.users (mọi bảng khác tự xoá theo). Phải gõ XOÁ để mở khoá nút. */
function xoaTaiKhoanScreen(){
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Xoá tài khoản','Delete account')}</div><button type="button" class="link" id="back">${tl('Huỷ','Cancel')}</button></div>
  <h2>${tl('Xoá vĩnh viễn tài khoản?','Delete your account forever?')}</h2>
  <div class="xoa-tk">
    <p>${tl(`Tài khoản <b>${esc(profile?.ten||'')}</b>${user?.email?` (${esc(user.email)})`:''} và toàn bộ dữ liệu sẽ bị xoá ngay, <b>không khôi phục được</b>:`,`The account <b>${esc(profile?.ten||'')}</b>${user?.email?` (${esc(user.email)})`:''} and all its data will be deleted right away and <b>cannot be recovered</b>:`)}</p>
    <ul>${tl(`<li>Điểm Bách Khoa, hạng, chuỗi ngày, Elo và thành tích solo. Bạn biến mất khỏi mọi bảng xếp hạng.</li>
      <li>Lịch sử lượt bán, các trận solo và bản ghi xem lại (trận đã đấu cũng mất khỏi lịch sử của đối thủ; Elo của họ giữ nguyên).</li>
      <li>Hồ sơ, ảnh đại diện, bạn bè, lời mời, thông báo và đăng ký thông báo đẩy.</li>
      <li>Email đăng nhập. Sau này muốn chơi tiếp thì đăng ký lại từ đầu.</li>`,`<li>Bach Khoa Points, rank, streak, Elo and solo record. You disappear from every leaderboard.</li>
      <li>Run history, solo matches and replays (matches also vanish from your opponents' history; their Elo stays).</li>
      <li>Profile, avatar, friends, requests, notifications and push subscriptions.</li>
      <li>Your sign-in email. To play again later you would sign up from scratch.</li>`)}</ul>
  </div>
  <label><span>${tl('Gõ <b>XOÁ</b> để xác nhận','Type <b>DELETE</b> to confirm')}</span><input id="xnXoa" autocomplete="off" autocapitalize="characters" placeholder="${tl('XOÁ','DELETE')}"></label>
  <div class="msg" id="msg"></div>
  <button type="button" class="btn nguy" id="xoaOk" disabled>${tl('Xoá vĩnh viễn tài khoản','Delete account forever')}</button>
  <button type="button" class="btn ghost" id="xoaHuy">${tl('Giữ lại tài khoản','Keep my account')}</button>`);
  const ok=()=>{const v=$('xnXoa').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(); return v==='XOA'||(EN&&v==='DELETE')};
  $('back').onclick=$('xoaHuy').onclick=profileScreen;
  $('xnXoa').oninput=()=>{$('xoaOk').disabled=!ok()};
  $('xoaOk').onclick=async()=>{
    if(!ok()) return; const b=$('xoaOk'), msg=$('msg'); b.disabled=true; msg.className='msg ok'; msg.textContent=tl('Đang xoá…','Deleting…');
    if(profile?.avatar_url) try{await sb.storage.from('avatars').remove([user.id+'/goc.jpg',user.id+'/avatar.jpg'])}catch(e){}
    await pushUnlink();
    const {error}=await sb.rpc('xoa_tai_khoan',{p_xac_nhan:'XOA'});
    if(error){msg.className='msg';msg.textContent=tl('Chưa xoá được: ','Could not delete: ')+error.message;b.disabled=false;return}
    ['mqbk-run','mqbk-pending','mqbk-rec-cho'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
    nhoMan(null);bbReset();soloDisconnect();try{await sb.auth.signOut()}catch(e){}
    user=null;profile=null;ranked=false;myRank=null;authScreen();toast(tl('Đã xoá tài khoản và toàn bộ dữ liệu','Your account and all data were deleted'));
  };
}
async function logout(){nhoMan(null);bbReset();soloDisconnect();await pushUnlink();await sb.auth.signOut();user=null;profile=null;ranked=false;authScreen()}

/* ================= Avatar ================= */
const AV_BASE=SB_URL+'/storage/v1/object/public/avatars/';
const avColor=s=>['#1B3A6B','#6B4A2B','#C8321E','#5A6270','#2F6B3A','#7B3F8C','#B5651D','#2E7D7A','#8A2E4B'][[...String(s||'?')].reduce((a,c)=>a+c.charCodeAt(0),0)%9];
const initials=s=>String(s||'?').trim().split(/\s+/).slice(-2).map(w=>w[0]).join('').toUpperCase();
function avatarHTML(url,name,size=36,cls=''){
  return url?`<img class="av ${cls}" src="${esc(url)}" alt="" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px">`
    :`<span class="av av-txt ${cls}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px;background:${avColor(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
}
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>no(new Error(tl('Không mở được ảnh','Could not open the image')));i.src=src})}
function canvasBlob(cv,q=.88){return new Promise(ok=>cv.toBlob(ok,'image/jpeg',q))}
// Ảnh gốc thu nhỏ tối đa 1080px để lưu nhẹ, giữ lại để chỉnh khung sau này
async function shrink(file){
  const url=URL.createObjectURL(file); try{
    const img=await loadImg(url), k=Math.min(1,1080/Math.max(img.naturalWidth,img.naturalHeight));
    const cv=document.createElement('canvas'); cv.width=Math.round(img.naturalWidth*k); cv.height=Math.round(img.naturalHeight*k);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height); return cv;
  } finally {URL.revokeObjectURL(url)}
}
function pickFile(){return new Promise(ok=>{const f=document.createElement('input');f.type='file';f.accept='image/*';f.onchange=()=>ok(f.files[0]||null);f.click()})}
async function chooseAvatar(){
  const file=await pickFile(); if(!file) return;
  if(!/^image\//.test(file.type)){toast(tl('Hãy chọn một file ảnh','Please pick an image file'));return}
  try{const cv=await shrink(file); avatarEditor(cv,{x:.5,y:.5,z:1},true)}catch(e){toast(tl('Không mở được ảnh này, thử ảnh khác','Could not open this image, try another'))}
}
async function readjustAvatar(){
  const k=profile&&profile.avatar_khung; if(!k){chooseAvatar();return}
  toast(tl('Đang mở ảnh gốc…','Opening original photo…'));
  try{const img=await loadImg(AV_BASE+user.id+'/goc.jpg?v='+(k.v||0)); avatarEditor(img,k,false)}
  catch(e){toast(tl('Không tải được ảnh gốc, hãy chọn lại ảnh','Could not load the original, pick the photo again'))}
}
// Trình cắt: kéo để di chuyển, thanh trượt / lăn chuột / chụm 2 ngón để phóng to
function avatarEditor(src,khung,isNew){
  const W=src.naturalWidth||src.width, H=src.naturalHeight||src.height, M=Math.min(W,H);
  const st={x:khung.x??.5,y:khung.y??.5,z:Math.min(4,Math.max(1,khung.z??1))};
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Avatar</div><button class="link" id="cancel">${tl('Huỷ','Cancel')}</button></div>
  <h2>${tl('Căn khung avatar','Crop your avatar')}</h2>
  <p class="muted">${tl('Kéo ảnh để chọn phần nằm trong vòng tròn, kéo thanh trượt để phóng to hoặc thu nhỏ.','Drag the photo to choose what sits in the circle, use the slider to zoom.')}</p>
  <div class="crop" id="crop"><canvas id="cv"></canvas><div class="ring"></div></div>
  <label class="zoom">${tl('Thu nhỏ','Zoom out')}<input type="range" id="zm" min="1" max="4" step="0.01" value="${st.z}" aria-label="${tl('Phóng to','Zoom')}">${tl('Phóng to','Zoom in')}</label>
  <div class="msg" id="msg"></div>
  <div class="col grow"><button class="btn" id="save">${tl('Lưu avatar','Save avatar')}</button><button class="btn ghost" id="other">${tl('Chọn ảnh khác','Pick another photo')}</button></div>`);
  const box=$('crop'), cv=$('cv'), ctx=cv.getContext('2d');
  const size=()=>box.clientWidth, dpr=Math.min(2,devicePixelRatio||1);
  const clamp=()=>{const h=M/st.z/2; st.x=Math.min(1-h/W,Math.max(h/W,st.x)); st.y=Math.min(1-h/H,Math.max(h/H,st.y))};
  const rect=()=>{const s=M/st.z; return [st.x*W-s/2, st.y*H-s/2, s, s]};
  const draw=()=>{const V=size(); cv.width=V*dpr; cv.height=V*dpr; clamp(); const [sx,sy,sw,sh]=rect();
    ctx.imageSmoothingQuality='high'; ctx.drawImage(src,sx,sy,sw,sh,0,0,cv.width,cv.height)};
  draw(); addEventListener('resize',draw);
  const pts=new Map(); let pinch=0;
  box.addEventListener('pointerdown',e=>{box.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY})});
  box.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const pr=pts.get(e.pointerId);
    if(pts.size===1){const k=M/st.z/size(); st.x-=(e.clientX-pr.x)*k/W; st.y-=(e.clientY-pr.y)*k/H}
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const [a,b]=[...pts.values()], d=Math.hypot(a.x-b.x,a.y-b.y); if(pinch) st.z=Math.min(4,Math.max(1,st.z*d/pinch)); pinch=d; $('zm').value=st.z}
    draw()});
  const up=e=>{pts.delete(e.pointerId);pinch=0};
  box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up);
  box.addEventListener('wheel',e=>{e.preventDefault();st.z=Math.min(4,Math.max(1,st.z*(e.deltaY<0?1.08:.93)));$('zm').value=st.z;draw()},{passive:false});
  $('zm').oninput=e=>{st.z=+e.target.value;draw()};
  const leave=()=>{removeEventListener('resize',draw);profileScreen()};
  $('cancel').onclick=leave;
  $('other').onclick=()=>{removeEventListener('resize',draw);chooseAvatar()};
  $('save').onclick=async()=>{
    const msg=$('msg'); msg.className='msg ok'; msg.textContent=tl('Đang lưu avatar…','Saving avatar…'); $('save').disabled=true;
    try{
      const v=isNew?Date.now():(khung.v||Date.now());
      const out=document.createElement('canvas'); out.width=out.height=256; const [sx,sy,sw,sh]=rect();
      const o=out.getContext('2d'); o.imageSmoothingQuality='high'; o.drawImage(src,sx,sy,sw,sh,0,0,256,256);
      const bucket=sb.storage.from('avatars');
      if(isNew){const g=await bucket.upload(user.id+'/goc.jpg',await canvasBlob(src.tagName==='CANVAS'?src:out,.85),{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'});if(g.error)throw g.error}
      const a=await bucket.upload(user.id+'/avatar.jpg',await canvasBlob(out,.9),{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'}); if(a.error) throw a.error;
      const url=AV_BASE+user.id+'/avatar.jpg?v='+Date.now(), k={x:+st.x.toFixed(4),y:+st.y.toFixed(4),z:+st.z.toFixed(3),v};
      const r=await sb.rpc('luu_avatar',{p_url:url,p_khung:k}); if(r.error) throw r.error;
      profile.avatar_url=url; profile.avatar_khung=k; toast(tl('Đã lưu avatar','Avatar saved')); leave();
    }catch(e){msg.className='msg';msg.textContent=tl('Chưa lưu được: ','Could not save: ')+(e.message||e);$('save').disabled=false}
  };
}
async function removeAvatar(){
  const r=await sb.rpc('luu_avatar',{p_url:null,p_khung:null});
  if(r.error){toast(tl('Chưa xoá được, thử lại','Could not remove, try again'));return}
  sb.storage.from('avatars').remove([user.id+'/goc.jpg',user.id+'/avatar.jpg']);
  profile.avatar_url=null; profile.avatar_khung=null; toast(tl('Đã xoá avatar','Avatar removed')); profileScreen();
}
