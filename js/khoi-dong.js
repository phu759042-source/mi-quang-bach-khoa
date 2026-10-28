/* Mì Quảng Bách Khoa · js/khoi-dong.js: Khởi động game: đọc link, đăng nhập, vào lại lượt/trận đang dở.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Khởi động ================= */
S={day:1,money:0,rep:5,upg:{},total:0};
D={t:DAYLEN,earned:0,served:0,lost:0,slots:[null,null,null],spawnT:1,bowl:{items:new Set(['mi','tom','trung','rau']),broth:true},ev:EVENTS[0]};
renderAll();
let recovering=/type=recovery/.test(location.hash), justConfirmed=/type=(signup|email_change)/.test(location.hash), linkError='';
(function readLink(){
  const q=new URLSearchParams(location.hash.slice(1)+'&'+location.search.slice(1));
  if(q.get('thach')) pendingThach=q.get('thach');
  if(q.get('error_description')) linkError=/expired|invalid/i.test(q.get('error_description'))
    ?tl('Link trong email đã hết hạn hoặc đã dùng rồi. Hãy đăng nhập, hoặc bấm Quên mật khẩu để nhận link mới.','The email link has expired or was already used. Sign in, or tap Forgot password to get a new link.')
    :q.get('error_description').replace(/\+/g,' ');
})();
const cleanUrl=()=>{try{history.replaceState(null,'',BACK_URL)}catch(e){}};
applyTheme(theme);
swInit();
if(pendingThach) cleanUrl();
$('sndSlot').innerHTML=soundBtn(false);
(async function boot(){
  if(!sb){ranked=false;if(!(await resumeRun()))home();return}
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==='PASSWORD_RECOVERY'){recovering=true;user=session?.user||user;setTimeout(()=>{cleanUrl();newPasswordScreen()},0)}
  });
  openOv(`<div class="empty-state">${tl('Đang mở quán…','Opening the shop…')}</div>`);
  countVisit();
  try{
    await loadKhoa();
    const {data:{session}}=await sb.auth.getSession();
    user=session?.user||null;
    if(/access_token|error_description/.test(location.hash)) cleanUrl();
    if(recovering&&user){newPasswordScreen();return}
    if(user){ await afterLogin(); if(justConfirmed) toast(tl('Đã xác nhận email, chào mừng bạn','Email confirmed, welcome!')); } else if(!(await resumeRun())) authScreen();
  }catch(e){ranked=false;if(!(await resumeRun().catch(()=>false)))home();toast(tl('Không kết nối được máy chủ, đang chơi thử','Cannot reach the server, playing offline'))}
})();
