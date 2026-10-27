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
  $('vTong').textContent=Number(visitCount).toLocaleString('vi-VN');
  $('vNguoi').textContent=Number(data.nguoi??0).toLocaleString('vi-VN');
  $('visits').title=`Lượt truy cập: mỗi lần mở trang tính 1 lượt. Người: số trình duyệt khác nhau đã ghé. Hôm nay có ${data.hom_nay} người ghé.`;
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
const khoaTen=id=>(khoaList.find(k=>k.id===id)||{}).ten||'';
// Bản 2.17.0: người chơi không phải sinh viên BKĐN để trống khoa/lớp (cột profiles.sinh_vien = false)
const laSV=p=>!!p&&(p.sinh_vien??!!p.lop);
const NGOAI_BK='<span class="ngoai-bk" title="Không phải sinh viên Bách Khoa Đà Nẵng">Ngoài BK</span>';
const lopKhoaHTML=(p,khoa)=>laSV(p)?esc(p.lop)+(khoa===false?'':' · '+esc(khoa??khoaTen(p.khoa_id))):NGOAI_BK;

function authScreen(mode='login'){
  openOv(`<div class="split"><div class="split-a">
  <img class="hero-icon desk" src="icons/favicon.svg" alt="" width="88" height="88">
  <div class="eyebrow">Lấy cảm hứng từ Mì Quảng Bích · 1-3 Đặng Dung, Hòa Khánh Bắc</div>
  <h1>Mì Quảng <em>Bách Khoa</em></h1>
  <p>Mở quán mì Quảng ở Hòa Khánh Bắc, nơi sinh viên Bách Khoa Đà Nẵng hay ghé ăn, và bán cho sinh viên các khoa. Mỗi lượt chơi cộng hoặc trừ <b>Điểm Bách Khoa</b> cho bạn, cho lớp và cho khoa của bạn.</p>
  </div><div class="split-b">
  <form class="col" id="f" novalidate>
    <label>Email<input id="em" type="email" autocomplete="email" required placeholder="ban@email.com"></label>
    <label>Mật khẩu<input id="pw" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="6" required placeholder="Ít nhất 6 ký tự"></label>
    <div class="msg" id="msg"></div>
    ${mode==='signup'?'<p class="muted" style="margin:0;font-size:13px">Tạo tài khoản là bạn đồng ý với cách game lưu và dùng dữ liệu ở mục "Về game &amp; chính sách dữ liệu" bên dưới.</p>':''}
    <button class="btn" type="submit">${mode==='login'?'Đăng nhập':'Tạo tài khoản'}</button>
  </form>
  <button class="link" id="sw">${mode==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button>
  ${mode==='login'?'<button class="link" id="forgot">Quên mật khẩu?</button>':''}
  <button class="link" id="guest">Chơi thử, không tính điểm</button>
  ${themeHTML()}
  <button class="link" id="contact">Liên hệ người làm game</button>
  <button class="link" id="vegame">Về game &amp; chính sách dữ liệu</button>
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
    if(!/^\S+@\S+\.\S+$/.test(email)){msg.textContent='Email chưa đúng định dạng.';return}
    if(pw.length<6){msg.textContent='Mật khẩu cần ít nhất 6 ký tự.';return}
    msg.className='msg ok'; msg.textContent=mode==='login'?'Đang đăng nhập…':'Đang tạo tài khoản…';
    const res=mode==='login'
      ? await sb.auth.signInWithPassword({email,password:pw})
      : await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});
    if(res.error){msg.className='msg';msg.textContent=viErr(res.error.message);return}
    if(mode==='signup'&&!res.data.session){msg.textContent='Đã gửi email xác nhận. Mở email, bấm link xác nhận rồi quay lại đăng nhập.';return}
    user=res.data.user; await afterLogin();
  };
}
const BACK_URL=location.origin+location.pathname;
function forgotScreen(email=''){
  openOv(`<div class="eyebrow">Tài khoản</div><h2>Quên mật khẩu</h2>
  <p class="muted">Nhập email bạn đã đăng ký. Mình sẽ gửi link để bạn đặt mật khẩu mới.</p>
  <form class="col" id="f" novalidate>
    <label>Email<input id="em" type="email" autocomplete="email" value="${esc(email)}" placeholder="ban@email.com"></label>
    <div class="msg" id="msg"></div>
    <button class="btn" type="submit">Gửi link đặt lại mật khẩu</button>
  </form>
  <button class="link" id="back">Quay lại đăng nhập</button>`);
  $('back').onclick=()=>authScreen('login');
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const em=$('em').value.trim(), msg=$('msg');
    if(!/^\S+@\S+\.\S+$/.test(em)){msg.className='msg';msg.textContent='Email chưa đúng định dạng.';return}
    msg.className='msg ok';msg.textContent='Đang gửi…';
    const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:BACK_URL});
    if(error){msg.className='msg';msg.textContent=viErr(error.message);return}
    msg.textContent='Đã gửi. Mở email từ Mì Quảng Bách Khoa và bấm nút Đặt mật khẩu mới. Nhớ xem cả mục Spam.';
  };
}
function newPasswordScreen(){
  openOv(`<div class="eyebrow">Tài khoản</div><h2>Đặt mật khẩu mới</h2>
  <form class="col" id="f" novalidate>
    <label>Mật khẩu mới<input id="pw" type="password" autocomplete="new-password" placeholder="Ít nhất 6 ký tự"></label>
    <label>Nhập lại mật khẩu<input id="pw2" type="password" autocomplete="new-password"></label>
    <div class="msg" id="msg"></div>
    <button class="btn" type="submit">Lưu mật khẩu</button>
  </form>`);
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const pw=$('pw').value, msg=$('msg');
    if(pw.length<6){msg.className='msg';msg.textContent='Mật khẩu cần ít nhất 6 ký tự.';return}
    if(pw!==$('pw2').value){msg.className='msg';msg.textContent='Hai mật khẩu chưa giống nhau.';return}
    msg.className='msg ok';msg.textContent='Đang lưu…';
    const {data,error}=await sb.auth.updateUser({password:pw});
    if(error){msg.className='msg';msg.textContent=viErr(error.message);return}
    recovering=false; user=data.user; toast('Đã đổi mật khẩu'); await afterLogin();
  };
}
function viErr(m){
  if(/should be different/i.test(m)) return 'Mật khẩu mới phải khác mật khẩu cũ.';
  if(/session missing|expired|invalid.*(link|token)/i.test(m)) return 'Link đã hết hạn hoặc đã dùng rồi. Hãy gửi lại link mới.';
  if(/Invalid login/i.test(m)) return 'Sai email hoặc mật khẩu.';
  if(/not confirmed/i.test(m)) return 'Email chưa được xác nhận. Kiểm tra hộp thư (cả mục Spam).';
  if(/already registered/i.test(m)) return 'Email này đã có tài khoản, hãy đăng nhập.';
  if(/rate limit/i.test(m)) return 'Hệ thống đang quá tải email, thử lại sau ít phút.';
  return m;
}
async function afterLogin(){
  await loadProfile();
  if(profile){await flushPending(); recFlush()}
  ranked=!!profile; if(ranked){soloConnect();pushResync();if(pendingThach){const t=pendingThach;pendingThach=null;setTimeout(()=>openThach(t),900)}}
  if(profile&&await soloBoot()) return;
  if(profile&&await resumeRun()) return;
  if(!profile) return profileScreen();
  if(!(await moLaiMan())) home();
}
async function loadKhoa(){
  const {data}=await sb.from('khoa').select('id,ten').order('ten');
  khoaList=data||[];
}
async function loadProfile(){
  const {data}=await sb.from('profiles').select('ten,khoa_id,lop,sinh_vien,diem,so_luot,ngay_xa_nhat,chuoi,ngay_chuoi,chuoi_dai_nhat,avatar_url,avatar_khung,elo,solo_thang,solo_thua,solo_hoa').eq('id',user.id).maybeSingle();
  profile=data||null; myRank=null;
  if(profile&&profile.so_luot>0){
    const r=await sb.from('bxh_sinh_vien').select('hang').eq('id',user.id).maybeSingle();
    myRank=r.data?.hang??null;
  }
}
function profileScreen(){
  const p=profile||{}; if(profile) nhoMan('suahoso');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${profile?'Sửa hồ sơ':'Bước cuối'}</div>${profile?'<button type="button" class="link" id="pClose">Đóng</button>':''}</div><h2>${profile?'Thông tin của bạn':'Giới thiệu một chút về bạn'}</h2>
  <p class="muted">Tên${profile&&!laSV(p)?'':', lớp và khoa'} sẽ hiện công khai trên bảng xếp hạng. Không cần nhập MSSV.</p>
  ${profile?`<div class="av-edit">${avatarHTML(p.avatar_url,p.ten,72)}
    <div class="col" style="gap:4px"><b>Avatar</b><span class="muted">Hiện cạnh tên bạn trên bảng xếp hạng sinh viên.</span>
    <div class="row">${p.avatar_url?`<button type="button" class="link" id="avAdjust">Chỉnh lại khung</button><button type="button" class="link" id="avNew">Đổi ảnh</button><button type="button" class="link" id="avDel">Xoá</button>`
      :`<button type="button" class="link" id="avNew">Thêm avatar</button>`}</div></div></div>`
    :`<p class="muted">Lưu hồ sơ xong, bấm vào thẻ tên của bạn ở màn chính để thêm avatar.</p>`}
  <form class="col" id="f" novalidate>
    <label>Tên hiển thị<input id="ten" maxlength="40" autocomplete="nickname" value="${esc(p.ten)}" placeholder="Ví dụ: Phú 26T"></label>
    <fieldset class="sv-hoi"><legend>Bạn có phải sinh viên Trường Đại học Bách Khoa, Đại học Đà Nẵng không?</legend>
      <div class="sv-chon" role="radiogroup" aria-label="Có phải sinh viên Bách Khoa Đà Nẵng">
        <button type="button" class="diff" role="radio" data-sv="1" aria-pressed="false" aria-checked="false"><b>Có</b><small>Mình là sinh viên BKĐN</small></button>
        <button type="button" class="diff" role="radio" data-sv="0" aria-pressed="false" aria-checked="false"><b>Không</b><small>Mình chơi cho vui</small></button></div>
      <p class="sv-note" id="svNote" hidden></p></fieldset>
    <div class="col" id="svFields" hidden>
    <label>Khoa<select id="khoa"><option value="">Chọn khoa</option>${khoaList.map(k=>`<option value="${k.id}"${k.id===p.khoa_id?' selected':''}>${esc(k.ten)}</option>`).join('')}</select></label>
    <label>Lớp sinh hoạt<input id="lop" maxlength="16" value="${esc(p.lop)}" placeholder="Ví dụ: 26T_ATTT" autocapitalize="characters"></label></div>
    <div class="msg" id="msg"></div>
    <button class="btn" type="submit">Lưu và vào quán</button>
  </form>
  <button class="link" id="out">Đăng xuất</button>`);
  if(profile){(async()=>{const st=await pushState(),el=document.createElement('div');el.className='push-row';
    el.innerHTML=`${BELL}<span><b>Thông báo thách đấu</b><br>${st==='on'?'Đang bật trên máy này.':st==='ios'?'Cần thêm game vào Màn hình chính trước.':st==='denied'?'Đang bị chặn trong cài đặt trình duyệt.':st==='unsupported'?'Trình duyệt này chưa hỗ trợ.':'Đang tắt trên máy này.'}</span>
      ${st==='unsupported'?'':`<button type="button" class="link" id="pushTg">${st==='on'?'Tắt':st==='ios'||st==='denied'?'Xem cách làm':'Bật'}</button>`}`;
    const f=$('f'); if(f) f.before(el);
    const b=$('pushTg'); if(b) b.onclick=async()=>{if(st==='on'){await disablePush()}else{await enablePush()} profileScreen()};})()}
  $('out').onclick=logout; if($('pClose')) $('pClose').onclick=home;
  if($('avNew')) $('avNew').onclick=chooseAvatar;
  if($('avAdjust')) $('avAdjust').onclick=readjustAvatar;
  if($('avDel')) $('avDel').onclick=e=>{if(e.target.dataset.sure){removeAvatar()}else{e.target.dataset.sure=1;e.target.textContent='Bấm lần nữa để xoá'}};
  // Có / Không phải sinh viên BKĐN. Người đã có hồ sơ giữ lựa chọn cũ (tài khoản trước bản 2.17.0 đều là sinh viên).
  let sv=profile?laSV(p):null;
  const chonSV=v=>{sv=v;
    $('f').querySelectorAll('[data-sv]').forEach(b=>{const on=String(+v)===b.dataset.sv;b.setAttribute('aria-pressed',on);b.setAttribute('aria-checked',on)});
    $('svFields').hidden=!v; const n=$('svNote'); n.hidden=false; n.className='sv-note '+(v?'co':'khong');
    n.innerHTML=v?'<b>Lưu ý:</b> sinh viên Bách Khoa cần chọn khoa và nhập lớp. Điểm của bạn được cộng vào bảng xếp hạng lớp và khoa.'
      :'<b>Lưu ý:</b> không cần khoa và lớp. Bạn vẫn chơi, tính ĐBK, solo và lên bảng xếp hạng chung như mọi người, chỉ không được tính vào bảng lớp và khoa. Tên bạn sẽ có nhãn "Ngoài BK".'};
  $('f').querySelector('.sv-chon').onclick=e=>{const b=e.target.closest('[data-sv]');if(b){chonSV(b.dataset.sv==='1');$('msg').textContent=''}};
  if(sv!==null) chonSV(sv);
  $('f').onsubmit=async e=>{
    e.preventDefault();
    const ten=$('ten').value.trim(), kh=$('khoa').value, lop=$('lop').value.trim().toUpperCase().replace(/\s+/g,'_'), msg=$('msg');
    msg.className='msg';
    if(ten.length<2){msg.textContent='Tên cần từ 2 ký tự.';return}
    if(sv===null){msg.textContent='Chọn bạn có phải sinh viên Bách Khoa Đà Nẵng không.';return}
    if(sv&&!kh){msg.textContent='Chọn khoa của bạn.';return}
    if(sv&&!/^[0-9]{2}[A-Z0-9_]{1,14}$/.test(lop)){msg.textContent='Lớp bắt đầu bằng 2 số khoá, ví dụ 26T_ATTT.';return}
    msg.className='msg ok'; msg.textContent='Đang lưu…';
    const {error}=await sb.rpc('luu_ho_so',sv?{p_ten:ten,p_khoa_id:kh,p_lop:lop,p_sinh_vien:true}:{p_ten:ten,p_khoa_id:null,p_lop:null,p_sinh_vien:false});
    if(error){msg.className='msg';msg.textContent='Không lưu được: '+error.message;return}
    await loadProfile(); ranked=true; soloConnect(); home();
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
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>no(new Error('Không mở được ảnh'));i.src=src})}
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
  if(!/^image\//.test(file.type)){toast('Hãy chọn một file ảnh');return}
  try{const cv=await shrink(file); avatarEditor(cv,{x:.5,y:.5,z:1},true)}catch(e){toast('Không mở được ảnh này, thử ảnh khác')}
}
async function readjustAvatar(){
  const k=profile&&profile.avatar_khung; if(!k){chooseAvatar();return}
  toast('Đang mở ảnh gốc…');
  try{const img=await loadImg(AV_BASE+user.id+'/goc.jpg?v='+(k.v||0)); avatarEditor(img,k,false)}
  catch(e){toast('Không tải được ảnh gốc, hãy chọn lại ảnh')}
}
// Trình cắt: kéo để di chuyển, thanh trượt / lăn chuột / chụm 2 ngón để phóng to
function avatarEditor(src,khung,isNew){
  const W=src.naturalWidth||src.width, H=src.naturalHeight||src.height, M=Math.min(W,H);
  const st={x:khung.x??.5,y:khung.y??.5,z:Math.min(4,Math.max(1,khung.z??1))};
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Avatar</div><button class="link" id="cancel">Huỷ</button></div>
  <h2>Căn khung avatar</h2>
  <p class="muted">Kéo ảnh để chọn phần nằm trong vòng tròn, kéo thanh trượt để phóng to hoặc thu nhỏ.</p>
  <div class="crop" id="crop"><canvas id="cv"></canvas><div class="ring"></div></div>
  <label class="zoom">Thu nhỏ<input type="range" id="zm" min="1" max="4" step="0.01" value="${st.z}" aria-label="Phóng to">Phóng to</label>
  <div class="msg" id="msg"></div>
  <div class="col grow"><button class="btn" id="save">Lưu avatar</button><button class="btn ghost" id="other">Chọn ảnh khác</button></div>`);
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
    const msg=$('msg'); msg.className='msg ok'; msg.textContent='Đang lưu avatar…'; $('save').disabled=true;
    try{
      const v=isNew?Date.now():(khung.v||Date.now());
      const out=document.createElement('canvas'); out.width=out.height=256; const [sx,sy,sw,sh]=rect();
      const o=out.getContext('2d'); o.imageSmoothingQuality='high'; o.drawImage(src,sx,sy,sw,sh,0,0,256,256);
      const bucket=sb.storage.from('avatars');
      if(isNew){const g=await bucket.upload(user.id+'/goc.jpg',await canvasBlob(src.tagName==='CANVAS'?src:out,.85),{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'});if(g.error)throw g.error}
      const a=await bucket.upload(user.id+'/avatar.jpg',await canvasBlob(out,.9),{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'}); if(a.error) throw a.error;
      const url=AV_BASE+user.id+'/avatar.jpg?v='+Date.now(), k={x:+st.x.toFixed(4),y:+st.y.toFixed(4),z:+st.z.toFixed(3),v};
      const r=await sb.rpc('luu_avatar',{p_url:url,p_khung:k}); if(r.error) throw r.error;
      profile.avatar_url=url; profile.avatar_khung=k; toast('Đã lưu avatar'); leave();
    }catch(e){msg.className='msg';msg.textContent='Chưa lưu được: '+(e.message||e);$('save').disabled=false}
  };
}
async function removeAvatar(){
  const r=await sb.rpc('luu_avatar',{p_url:null,p_khung:null});
  if(r.error){toast('Chưa xoá được, thử lại');return}
  sb.storage.from('avatars').remove([user.id+'/goc.jpg',user.id+'/avatar.jpg']);
  profile.avatar_url=null; profile.avatar_khung=null; toast('Đã xoá avatar'); profileScreen();
}
