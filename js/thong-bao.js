/* Mì Quảng Bách Khoa · js/thong-bao.js: Thông báo đẩy (Web Push) khi có lời thách.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Thông báo đẩy khi có lời thách (Web Push) =================
   sw.js nhận push từ Edge Function thong-bao-thach-dau rồi hiện thông báo hệ thống,
   kể cả khi game đang đóng hoặc người chơi ở app khác. Bấm thông báo → mở game → hiện lời thách. */
const PUSH_PUB='BCE_Q504DzeGzAx28t2RdRpc_x7Ui_iMb0Pnzv9C9zGnJlZfnLL02fLD7A_0Eewy3-yCgaxjKTjyITecdDYc9tI';
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let swReg=null;
function pushSupport(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
async function swInit(){
  if(!('serviceWorker' in navigator)) return;
  try{ swReg=await navigator.serviceWorker.register('sw.js'); }catch(e){ swReg=null }
  navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='thach'){openThach(e.data.id)}});
}
// Trạng thái để vẽ nút: on | off | denied | ios | unsupported
async function pushState(){
  if(isIOS&&!isStandalone()) return 'ios';
  if(!pushSupport()) return 'unsupported';
  if(Notification.permission==='denied') return 'denied';
  if(Notification.permission!=='granted') return 'off';
  const reg=swReg||await navigator.serviceWorker.ready.catch(()=>null);
  const sub=reg&&await reg.pushManager.getSubscription().catch(()=>null);
  return sub?'on':'off';
}
const b64u=s=>{const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))};
const key64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function saveSub(sub){
  const {error}=await sb.rpc('luu_push',{p_endpoint:sub.endpoint,p_p256dh:key64(sub.getKey('p256dh')),p_auth:key64(sub.getKey('auth'))});
  if(error) throw error;
}
// Gọi từ nút bấm (trình duyệt chỉ cho xin quyền khi người dùng bấm)
async function enablePush(){
  if(!ranked){toast('Đăng nhập để nhận thông báo');return false}
  const st=await pushState();
  if(st==='ios'){iosGuide();return false}
  if(st==='unsupported'){toast('Trình duyệt này chưa hỗ trợ thông báo');return false}
  if(st==='denied'){deniedGuide();return false}
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){toast(perm==='denied'?'Bạn đã chặn thông báo':'Chưa bật thông báo');return false}
    const reg=swReg||await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(PUSH_PUB)});
    await saveSub(sub);
    try{localStorage.removeItem('mqbk-push-later')}catch(e){}
    sfx.heart(); toast('Đã bật thông báo thách đấu');
    return true;
  }catch(e){toast('Không bật được: '+(e.message||e));return false}
}
async function disablePush(){
  try{const reg=swReg||await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
    if(sub){await sb.rpc('xoa_push',{p_endpoint:sub.endpoint});await sub.unsubscribe()}}catch(e){}
  toast('Đã tắt thông báo trên máy này');
}
// Sau khi đăng nhập: máy đã cho phép rồi thì gắn đăng ký vào tài khoản này (âm thầm)
async function pushResync(){
  if(!ranked||!pushSupport()||Notification.permission!=='granted') return;
  try{const reg=swReg||await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(PUSH_PUB)});
    await saveSub(sub)}catch(e){}
}
async function pushUnlink(){ // đăng xuất: máy này thôi nhận thông báo của tài khoản cũ
  try{const reg=swReg||await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();
    if(sub) await sb.rpc('xoa_push',{p_endpoint:sub.endpoint})}catch(e){}
}
const BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
// Thẻ mời bật thông báo trên màn chính (ẩn nếu đã bật hoặc bấm "Để sau" trong 7 ngày)
async function pushCard(){
  const slot=$('pushSlot'); if(!slot||!ranked) return;
  const st=await pushState();
  let later=0; try{later=+localStorage.getItem('mqbk-push-later')||0}catch(e){}
  if(st==='on'||st==='unsupported'||Date.now()-later<7*864e5){slot.innerHTML='';return}
  const txt=st==='ios'?'Trên iPhone, thêm game vào Màn hình chính để nhận thông báo khi bạn bè thách đấu.'
    :st==='denied'?'Thông báo đang bị chặn nên bạn sẽ lỡ lời thách khi không mở game.'
    :'Nhận thông báo khi bạn bè thách đấu, kể cả lúc không mở game.';
  slot.innerHTML=`<div class="push-card">${BELL}<span>${txt}</span>
    <button type="button" class="btn warm" id="pushOn">${st==='ios'?'Xem cách làm':st==='denied'?'Cách mở lại':'Bật thông báo'}</button>
    <button type="button" class="link" id="pushLater">Để sau</button></div>`;
  $('pushOn').onclick=async()=>{if(await enablePush()) slot.innerHTML=''};
  $('pushLater').onclick=()=>{try{localStorage.setItem('mqbk-push-later',Date.now())}catch(e){};slot.innerHTML=''};
}
function iosGuide(){
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Thông báo trên iPhone</div><button class="link" id="back">Đóng</button></div>
    <h2>Thêm game vào Màn hình chính</h2>
    <p>iPhone chỉ cho trang web gửi thông báo khi đã được thêm vào Màn hình chính (iOS 16.4 trở lên).</p>
    <ol class="steps"><li>Mở game bằng <b>Safari</b>.</li><li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên).</li>
      <li>Chọn <b>Thêm vào MH chính</b>, rồi bấm <b>Thêm</b>.</li><li>Mở game từ biểu tượng mới trên Màn hình chính, đăng nhập rồi bấm <b>Bật thông báo</b>.</li></ol>
    <div class="col grow"><button class="btn" id="ok">Đã hiểu</button></div>`);
  $('back').onclick=home; $('ok').onclick=home;
}
function deniedGuide(){
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Thông báo</div><button class="link" id="back">Đóng</button></div>
    <h2>Thông báo đang bị chặn</h2>
    <p>Trước đây bạn đã chọn chặn thông báo của game, nên game không tự hỏi lại được.</p>
    <ol class="steps"><li><b>Android (Chrome)</b>: bấm biểu tượng bên trái thanh địa chỉ › <b>Quyền</b> › <b>Thông báo</b> › Cho phép.</li>
      <li><b>Laptop</b>: bấm biểu tượng ổ khoá cạnh địa chỉ trang › <b>Thông báo</b> › Cho phép.</li>
      <li><b>iPhone</b>: Cài đặt › <b>Thông báo</b> › Mì Quảng BK › bật <b>Cho phép thông báo</b>.</li></ol>
    <p class="muted">Xong thì tải lại trang và bấm Bật thông báo.</p>
    <div class="col grow"><button class="btn" id="ok">Đã hiểu</button></div>`);
  $('back').onclick=home; $('ok').onclick=home;
}
// Mở từ thông báo (?thach=id hoặc tin nhắn từ sw.js): hiện lời thách nếu còn hạn
let pendingThach=null;
async function openThach(id){
  if(!id) return;
  if(!user){pendingThach=id;return}
  window.focus();
  await soloPoll(false);
  if(notices.has(+id)) return;
  const {data}=await sb.from('thach_dau').select('id,trang_thai,het_han').eq('id',id).maybeSingle();
  if(!data||data.trang_thai!=='cho'||new Date(data.het_han)<Date.now()) toast('Lời thách này đã hết hạn hoặc bị huỷ');
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user&&soloCh) soloPoll(false)});
