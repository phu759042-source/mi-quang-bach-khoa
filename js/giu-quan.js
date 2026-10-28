/* Mì Quảng Bách Khoa · js/giu-quan.js: Giữ quán khi tải lại trang, tạm dừng, đóng quán, bỏ cuộc, xin hoà.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Giữ quán khi tải lại trang + Tạm dừng / Đóng quán =================
   Trạng thái lượt đang chơi được lưu vào localStorage `mqbk-run` mỗi giây và ở mỗi lần đổi màn.
   Tải lại trang thì quay lại đúng chỗ: đang bán, cửa hàng cuối ngày, màn hết tim, hoặc trận solo.
   Chỉ thoát khi bán xong hoặc bấm Đóng quán (chế độ thường) / Bỏ cuộc (solo). */
const RUN_KEY='mqbk-run';
let runPhase='day';
function saveRun(phase){
  if(phase) runPhase=phase;
  if(!midRun||!S) return;
  try{localStorage.setItem(RUN_KEY,JSON.stringify({v:1,uid:user?user.id:null,ranked,runId,solo:solo?solo.id:null,diff,phase:runPhase,S,rec:REC,
    D:D?{t:D.t,earned:D.earned,served:D.served,lost:D.lost,shield:D.shield,ev:EVENTS.indexOf(D.ev),rushSaid:!!D.rushSaid}:null,at:Date.now()}))}catch(e){}
}
function loadRun(){try{return JSON.parse(localStorage.getItem(RUN_KEY))}catch(e){return null}}
function clearRun(){try{localStorage.removeItem(RUN_KEY)}catch(e){}}
setInterval(()=>{if(midRun&&running)saveRun('day')},1000);
addEventListener('pagehide',()=>{if(midRun)saveRun()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&midRun)saveRun()});
// Dựng lại D (ngày đang bán) từ bản lưu: giữ giờ còn lại, doanh thu hôm nay; khách đang chờ thì không giữ
function mkD(sd){
  const n=lv('ban')?4:3;
  return {t:sd&&sd.t>0?sd.t:DAYLEN,earned:sd?.earned||0,served:sd?.served||0,lost:sd?.lost||0,slots:Array(n).fill(null),queue:[],
    rushSaid:!!sd?.rushSaid,spawnT:1.2,shield:sd?.shield??lv('the'),bowl:{items:new Set(lv('phubep')?['mi']:[]),broth:false},
    ev:EVENTS[sd&&sd.ev>=0?sd.ev:(S.day-1)%4]};
}
// Gọi lúc mở game (sau khi biết đã đăng nhập hay chưa). Trả true nếu đã đưa người chơi về quán đang mở.
async function resumeRun(){
  const r=loadRun(); if(!r||r.v!==1||!r.S||r.solo) return false;
  if(r.ranked){
    if(!ranked||!user||r.uid!==user.id) return false;
    const {data}=await sb.from('runs').select('id,trang_thai').eq('id',r.runId).maybeSingle();
    if(!data||data.trang_thai!=='dang_choi'){clearRun();return false}
  } else {
    if(ranked||Date.now()-r.at>12*3600e3){clearRun();return false}
  }
  runId=r.runId; diff=DIFF[r.diff]?r.diff:'thuong'; S=r.S; S.lost=S.lost||0; S.bought=S.bought||0; midRun=true; running=false;
  D=mkD(r.D); REC=r.rec||null; rec('Y');
  if(r.phase==='shop'){showShop();toast(tl('Quán vẫn đang mở, bán tiếp nhé','Your shop is still open, keep selling'));return true}
  if(S.rep<=0){reviveScreen();return true}
  resumeScreen(); return true;
}
function resumeScreen(){
  runPhase='day';
  openOv(`<div class="eyebrow">${DIFF[diff].n} · ${tl('Ngày','Day')} ${S.day}</div><h2>${tl('Quán đang mở dở','Shop still open')}</h2>
    <p>${tl('Trang vừa tải lại nhưng quán vẫn giữ nguyên, kể cả nâng cấp đã mua. Khách đang chờ lúc tải lại đã về, nên bạn không bị mất tim vì họ.','The page reloaded but your shop is intact, upgrades included. Customers who were waiting have left, and you do not lose hearts for them.')}</p>
    <div class="sum"><span>${tl('Giờ bán còn lại','Time left today')}</span><b>${Math.ceil(D.t)} ${tl('giây','s')}</b><span>${tl('Hôm nay đã bán','Sold today')}</span><b>${D.earned}/${target(S.day)}k</b>
      <span>${tl('Uy tín','Reputation')}</span><b>${S.rep} ${tl('tim','hearts')}</b><span>${tl('Tiền trong két','Money in the till')}</span><b>${S.money}k</b></div>
    <div class="col grow"><button class="btn" id="go">${tl('Bán tiếp','Keep selling')} · 3</button>
      <button class="btn ghost" id="close">${tl('Đóng quán','Close shop')}</button></div>`);
  let k=3; const go=()=>{clearInterval(cd);sfx.cash(true);resumeDay()};
  const cd=setInterval(()=>{k--;const b=$('go');if(!b){clearInterval(cd);return} if(k<=0)go(); else b.textContent=tl('Bán tiếp · ','Keep selling · ')+k},1000);
  $('go').onclick=go;
  $('close').onclick=()=>{clearInterval(cd);closeShopConfirm(resumeScreen)};
}
const PAUSE_ICON='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const FLAG_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
function setPauseBtn(){
  const s=$('pauseSlot'); if(!s) return;
  s.innerHTML=solo?`<button type="button" class="pz" id="pauseBtn" aria-label="${tl('Bỏ cuộc hoặc xin hoà','Resign or offer a draw')}">${FLAG_ICON}<span>${tl('Bỏ cuộc · Hoà','Resign · Draw')}</span></button>`
    :`<button type="button" class="pz" id="pauseBtn" aria-label="${tl('Tạm dừng hoặc đóng quán','Pause or close shop')}">${PAUSE_ICON}<span>${tl('Tạm dừng','Pause')}</span></button>`;
  $('pauseBtn').onclick=()=>solo?soloMenu():pauseMenu();
}
document.addEventListener('keydown',e=>{if((e.key==='Escape'||e.key==='p'||e.key==='P')&&running&&!/input|select|textarea/i.test(e.target.tagName)){e.preventDefault();solo?soloMenu():pauseMenu()}});
// Chế độ thường: dừng đồng hồ, chọn bán tiếp hoặc đóng quán
function pauseMenu(){
  if(!running||solo) return;
  running=false; rec('Z'); saveRun('day'); sfx.remove();
  openOv(`<div class="eyebrow">${tl('Tạm dừng','Paused')} · ${DIFF[diff].n} · ${tl('Ngày','Day')} ${S.day} · ${tl(`còn ${Math.ceil(D.t)} giây`,`${Math.ceil(D.t)}s left`)}</div><h2>${tl('Quán đang tạm nghỉ','Shop on a break')}</h2>
    <p>${tl('Đồng hồ đang dừng. Khách vẫn ngồi chờ, bán tiếp thì họ được nghỉ thêm một nhịp.','The clock is stopped. Customers are still waiting and get a short breather when you resume.')}</p>
    <div class="sum"><span>${tl('Hôm nay đã bán','Sold today')}</span><b>${D.earned}/${target(S.day)}k</b><span>${tl('Uy tín','Reputation')}</span><b>${S.rep} ${tl('tim','hearts')}</b><span>${tl('Tổng doanh thu','Total revenue')}</span><b>${S.total}k</b></div>
    <div class="col grow"><button class="btn" id="go">${tl('Bán tiếp','Keep selling')}</button><button class="btn ghost" id="close">${tl('Đóng quán','Close shop')}</button></div>`);
  lockButtons($('ov'),500);
  $('go').onclick=resumeDay; $('close').onclick=()=>closeShopConfirm(pauseMenu2);
}
function pauseMenu2(){running=true;pauseMenu()}
// Đóng quán giữa ngày: tim còn lại tính là mất hết
function closeShopConfirm(back){
  const hs=DIFF[diff].hs, con=S.rep, mat=(S.lost||0)+con, thuong=Math.round(S.total*hs/10), tru=Math.round(mat*15*hs**2), tong=thuong-tru;
  openOv(`<div class="eyebrow">${tl('Đóng quán','Close shop')} · ${DIFF[diff].n} · ${tl('Ngày','Day')} ${S.day}</div><h2>${tl('Đóng quán giữa chừng?','Close the shop now?')}</h2>
    <p>${tl(`Lượt chơi kết thúc ngay. <b>${con} tim còn lại sẽ bị tính là mất hết</b>${S.lost?`, cộng với ${S.lost} tim đã mất trước đó`:''}.`,`The run ends right away. <b>Your ${con} remaining hearts count as lost</b>${S.lost?`, plus ${S.lost} lost earlier`:''}.`)}</p>
    <div class="sum"><span>${tl('Doanh thu đến giờ','Revenue so far')}</span><b>${S.total}k</b><span>${tl('Tim bị tính là mất','Hearts counted as lost')}</span><b>${mat}</b>
      <span>${tl('Thưởng','Bonus')} (${S.total}k × ${hs} ÷ 10)</span><b>+${thuong}</b><span>${tl('Phạt','Penalty')} (${mat} ${tl('tim','hearts')} × ${phat(diff)})</span><b>−${tru}</b>
      <span>${ranked?tl('ĐBK của lượt này','BKP for this run'):tl('Nếu có tài khoản','With an account')}</span><b style="color:${tong>=0?'var(--leaf)':'var(--chili)'}">${tong>=0?'+':'−'}${Math.abs(tong)}</b></div>
    ${ranked?'':`<p class="muted">${tl('Lượt chơi thử không tính điểm.','Trial runs do not count.')}</p>`}
    <div class="col grow"><button class="btn" id="back">${tl('Quay lại bán','Back to selling')}</button><button class="btn ghost" id="ok">${tl(`Đóng quán, mất ${con} tim còn lại`,`Close and lose ${con} remaining hearts`)}</button></div>`);
  lockButtons($('ov'),800);
  $('back').onclick=back;
  $('ok').onclick=()=>{S.lost=mat;S.rep=0;finishRun(tl(`Bạn đã đóng quán giữa chừng, ${con} tim còn lại bị tính là mất.`,`You closed early, your ${con} remaining hearts count as lost.`))};
}

/* ---- Solo: bỏ cuộc, xin hoà (trận vẫn chạy, không dừng đồng hồ) ---- */
function soloMenu(){
  if(!solo) return;
  let m=$('soloMenu'); if(m){m.remove();return}
  m=document.createElement('div'); m.id='soloMenu'; m.className='float-panel'; m.setAttribute('role','dialog'); m.setAttribute('aria-label',tl('Bỏ cuộc hoặc xin hoà','Resign or offer a draw'));
  const n=esc(tenNgan(solo.opp.ten)), cho=solo.row.xin_hoa_boi===user.id;
  m.innerHTML=`<div class="fp-t">${tl('Trận vẫn đang chạy','The match is still running')}</div>
    <button type="button" class="btn ghost" id="smDraw" ${cho?'disabled':''}>${cho?tl(`Đang chờ ${n} trả lời`,`Waiting for ${n}`):tl(`Xin hoà với ${n}`,`Offer ${n} a draw`)}</button>
    <button type="button" class="btn ghost" id="smQuit">${tl('Bỏ cuộc, chấp nhận thua','Resign and accept the loss')}</button>
    <button type="button" class="link" id="smClose">${tl('Đóng','Close')}</button>`;
  $('app').appendChild(m); lockButtons(m,400);
  $('smClose').onclick=()=>m.remove();
  $('smDraw').onclick=async()=>{ m.remove(); if(!solo) return; const id=solo.id;
    const {data,error}=await sb.rpc('xin_hoa',{p_id:id});
    if(error){toast(error.message);return}
    if(data&&solo&&solo.id===id){soloUpdate(data); if(solo&&data.trang_thai!=='xong') toast(tl(`Đã xin hoà, chờ ${tenNgan(solo.opp.ten)} trả lời`,`Draw offered, waiting for ${tenNgan(solo.opp.ten)}`))} };
  let armed=false;
  $('smQuit').onclick=async e=>{ if(!armed){armed=true;e.target.textContent=tl('Bấm lần nữa: chấp nhận thua','Tap again to accept the loss');return}
    e.target.disabled=true; m.remove(); if(!solo) return;
    const {data,error}=await sb.rpc('bo_tran_solo',{p_id:solo.id}); if(error) toast(error.message); else if(data) soloUpdate(data) };
}
let drawT=0;
function hideDrawOffer(){clearTimeout(drawT);const el=$('drawOffer');if(el)el.remove()}
function showDrawOffer(r){
  hideDrawOffer(); if(!solo) return;
  const el=document.createElement('div'); el.id='drawOffer'; el.className='float-panel offer'; el.setAttribute('role','alertdialog'); el.setAttribute('aria-label',tl('Đối thủ xin hoà','Your opponent offers a draw'));
  el.innerHTML=`<div class="fp-t"><b>${esc(tenNgan(solo.opp.ten))}</b> ${tl('xin hoà','offers a draw')}</div>
    <div class="fp-row"><button type="button" class="btn ghost" data-no>${tl('Không','No')}</button><button type="button" class="btn" data-yes>${tl('Đồng ý hoà','Accept draw')}</button></div>
    <div class="timer"><i style="animation-duration:20000ms"></i></div>`;
  $('app').appendChild(el); lockButtons(el,800);
  tone(660,.12,{type:'triangle',vol:.18}); tone(880,.18,{type:'triangle',vol:.18,at:.13});
  const id=r.id, ans=async ok=>{hideDrawOffer(); const {data,error}=await sb.rpc('tra_loi_hoa',{p_id:id,p_dong_y:ok}); if(error) toast(error.message); else if(data) soloUpdate(data)};
  el.querySelector('[data-yes]').onclick=()=>ans(true);
  el.querySelector('[data-no]').onclick=()=>ans(false);
  drawT=setTimeout(hideDrawOffer,20000);
}
// Gọi trong soloUpdate: hiện/ẩn lời xin hoà, báo khi bị từ chối
function soloDrawWatch(prev,r){
  const xb=r.xin_hoa_boi, moi=xb&&r.xin_hoa_luc&&Date.parse(r.xin_hoa_luc)>Date.now()-25000;
  if(xb&&xb!==user.id&&moi&&r.xin_hoa_luc!==solo.offerSeen){solo.offerSeen=r.xin_hoa_luc;showDrawOffer(r)}
  if(!xb||xb===user.id) hideDrawOffer();
  if(prev&&prev.xin_hoa_boi===user.id&&!xb&&r.trang_thai==='dang_dau') toast(tl(`${tenNgan(solo.opp.ten)} không đồng ý hoà`,`${tenNgan(solo.opp.ten)} declined the draw`));
}
