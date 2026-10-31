/* Mì Quảng Bách Khoa · js/nop-diem.js: Chuỗi ngày (streak) và kết thúc lượt, nộp điểm.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Chuỗi ngày (streak) ================= */
// Ngày theo giờ Việt Nam, dạng YYYY-MM-DD; off = số ngày lệch so với hôm nay
const vnDate=(off=0)=>new Date(Date.now()+off*864e5).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
function guestStreak(){try{return JSON.parse(localStorage.getItem('mqbk-streak'))||{chuoi:0,ngay:null,best:0}}catch(e){return {chuoi:0,ngay:null,best:0}}}
function streakState(){
  const s=ranked&&profile?{chuoi:profile.chuoi||0,ngay:profile.ngay_chuoi||null,best:profile.chuoi_dai_nhat||0}:guestStreak();
  const lit=s.ngay===vnDate(), alive=lit||s.ngay===vnDate(-1);
  return {n:alive?s.chuoi:0,lit,best:s.best};
}
// Người chơi thử: tự tính chuỗi trên máy
function bumpGuestStreak(){
  const s=guestStreak(), today=vnDate();
  if(s.ngay===today) return {moi:false,chuoi:s.chuoi,best:s.best};
  s.chuoi=s.ngay===vnDate(-1)?s.chuoi+1:1; s.ngay=today; s.best=Math.max(s.best||0,s.chuoi);
  try{localStorage.setItem('mqbk-streak',JSON.stringify(s))}catch(e){}
  return {moi:true,chuoi:s.chuoi,best:s.best};
}
let flameId=0;
function flameSVG(lit,cls=''){
  const id='fl'+(++flameId);
  return `<svg class="flame ${cls}" viewBox="0 0 64 80" aria-hidden="true"><defs>
    <linearGradient id="${id}o" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${lit?'#E8461E':'#8A9099'}"/><stop offset="1" stop-color="${lit?'#FFA41F':'#B4B9C1'}"/></linearGradient>
    <linearGradient id="${id}i" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${lit?'#FFB23A':'#C9CDD3'}"/><stop offset="1" stop-color="${lit?'#FFF0A8':'#E4E7EB'}"/></linearGradient></defs>
    <path fill="url(#${id}o)" d="M32 3c4 15 21 23 21 44a21 21 0 0 1-42 0c0-10 5-17 10-21 0 8 3 12 8 13C26 26 27 14 32 3z"/>
    <path fill="url(#${id}i)" d="M33 36c3 7 11 11 11 20a12 12 0 0 1-24 0c0-6 3-9 6-11 1 4 3 7 6 7-1-6-1-11 1-16z"/></svg>`;
}
const streakPill=()=>{const s=streakState();
  return `<div class="streak-pill ${s.lit?'on':''}">${flameSVG(s.lit)}<b>${s.n}</b><span>${s.n?tl('ngày liên tiếp','day streak'):tl('Chưa có chuỗi','No streak yet')}${s.lit?tl(' · hôm nay đã giữ lửa',' · kept alive today'):tl(' · chốt sổ 1 lượt hôm nay để '+(s.n?'giữ':'thắp')+' lửa',' · cash out 1 run today to '+(s.n?'keep':'light')+' it')}</span></div>`};
// Màn hiệu ứng: lửa xám bùng thành lửa cam, số chuỗi nhảy lên
function streakScreen(oldN,newN,best,next){
  const week=[], dow=(new Date(vnDate()+'T00:00:00').getDay()+6)%7; // 0 = thứ Hai
  for(let k=0;k<7;k++){const off=k-dow, inStreak=off<=0&&off>-newN;
    week.push(`<div class="wd ${inStreak?(off===0?'today':'on'):''} ${off>0?'future':''}"><i>${off===0?'':inStreak?'✓':''}</i><span>${(EN?['M','T','W','T','F','S','S']:['T2','T3','T4','T5','T6','T7','CN'])[k]}</span></div>`)}
  const record=newN>1&&newN>=best;
  openOv(`<div class="streak-stage" role="status" aria-live="polite">
    <div class="flame-wrap"><div class="glow"></div>${flameSVG(false,'f-gray')}${flameSVG(true,'f-lit')}
      <div class="sparks">${Array.from({length:14},(_,k)=>`<i style="--x:${Math.round((Math.random()-.5)*160)}px;--d:${(.7+Math.random()*.9).toFixed(2)}s;--s:${(4+Math.random()*5).toFixed(1)}px"></i>`).join('')}</div></div>
    <div class="streak-num"><b id="sNum">${oldN}</b></div>
    <h2>${newN===1?tl('Thắp lửa chuỗi mới!','New streak lit!'):tl(`Chuỗi ${newN} ngày liên tiếp!`,`${newN}-day streak!`)}</h2>
    ${record?`<div class="record">${tl('Kỷ lục mới của bạn','Your new record')}</div>`:''}
    <p class="muted">${tl('Ngày mai quay lại mở quán và chốt sổ ít nhất một lượt để giữ lửa. Bỏ một ngày là chuỗi về 0.','Come back tomorrow and cash out at least one run to keep the flame. Miss a day and the streak resets to 0.')}</p>
    <div class="week">${week.join('')}</div>
    <button class="btn warm grow" id="sNext">${tl('Tiếp tục','Continue')}</button></div>`);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  sfx.streak();
  setTimeout(()=>{const n=$('sNum');if(n){n.textContent=newN;n.classList.add('pop');sfx.num()}},reduce?0:900);
  $('sNext').onclick=next;
  lockButtons($('ov'),1300);
}

/* ================= Kết thúc lượt & nộp điểm ================= */
let midClose=false, lastRunRec=null;
async function finishRun(why, cashOut=false, sauFx=false){
  setTimeout(syncPresence,0);
  clearRun();
  if(REC&&!REC.xong){rec('O',S.day,S.total,S.lost||0,cashOut?1:0);REC.xong=1}
  if(!cashOut&&!sauFx){
    running=false; midRun=false;
    if(ranked&&runId&&user) savePending({uid:user.id,run:runId,so_ngay:S.day,doanh_thu:S.total,tim_mat:S.lost||0}); // giữ điểm nếu tắt trang giữa chừng
    endFx('lose',tl('Quán đóng cửa','Shop closed'),why,()=>finishRun(why,false,true));
    return;
  }
  midClose=cashOut; demLuotMay();
  running=false; midRun=false;
  const lost=S.lost||0;
  const hs=DIFF[diff].hs;
  const est=Math.round(S.total*hs/10)-Math.round(lost*15*hs**2);
  const ov=$('ov'); showOv(true);
  const head=cashOut?`<div class="eyebrow">${tl('Chốt sổ','Cashed out')} · ${DIFF[diff].n}</div><h2>${tl(`Nghỉ bán sau ${S.day} ngày`,`Stopped after ${S.day} days`)}</h2>`
                     :`<div class="eyebrow">${tl('Quán tạm đóng cửa','Shop closed')} · ${DIFF[diff].n}</div><h2>${tl(`Trụ được ${S.day} ngày`,`Lasted ${S.day} days`)}</h2>`;
  const summary=`<div class="sum"><span>${tl('Tổng doanh thu','Total revenue')}</span><b>${S.total}k</b><span>${tl('Tim đã mất','Hearts lost')}</span><b>${lost}</b>
    <span>${tl('Thưởng','Bonus')} (${S.total}k × ${hs} ÷ 10)</span><b>+${Math.round(S.total*hs/10)}</b>
    <span>${tl('Phạt','Penalty')} (${lost} ${tl('tim','hearts')} × ${phat(diff)})</span><b>−${Math.round(lost*15*hs**2)}</b></div>`;
  if(!ranked){
    giuLuotThu(est);
    if(S.day>guestBest.day||(S.day===guestBest.day&&S.total>guestBest.money)){guestBest={day:S.day,money:S.total};try{localStorage.setItem('mqbk-best',JSON.stringify(guestBest))}catch(e){}}
    const showGuest=()=>{openOv(`${head}<p>${esc(why)}</p>${summary}
      <p class="muted">${sb&&est>0?tl(`Lượt chơi thử chưa được tính điểm. Tạo tài khoản trong 24 giờ thì lượt này được cộng <b>${est}</b> ĐBK cho bạn.`,`Trial runs do not count yet. Create an account within 24 hours and this run adds <b>${est}</b> BKP for you.`):tl(`Lượt chơi thử không được tính điểm. Nếu đăng nhập, lượt này sẽ ${est>=0?'cộng':'trừ'} <b>${Math.abs(est)}</b> ĐBK.`,`Trial runs do not count. If you were signed in, this run would ${est>=0?'add':'subtract'} <b>${Math.abs(est)}</b> BKP.`)}</p>
      <div class="col grow">${sb&&est>0?`<button class="btn" id="giuDiem">${tl(`Tạo tài khoản, giữ +${est} ĐBK`,`Create an account, keep +${est} BKP`)}</button>`:''}<button class="btn${sb&&est>0?' ghost':''}" id="again">${tl('Chơi lại','Play again')}</button><button class="btn ghost" id="home">${tl('Về màn hình chính','Back to home')}</button></div>`);
      $('again').onclick=()=>startRun(); $('home').onclick=home; if($('giuDiem')) $('giuDiem').onclick=()=>authScreen('signup')};
    const before=streakState().n, g=bumpGuestStreak();
    const showG=()=>{const c=midClose;showGuest();lockButtons($('ov'),c?1200:900);if(c){midClose=false;sfx.closeEnd();if(est>=0)confetti()}};
    if(g.moi) streakScreen(before,g.chuoi,g.best,showG); else showG();
    return;
  }
  // Lưu kết quả trên máy trước khi gửi, để không mất nếu mạng lỗi
  const pend={uid:user.id,run:runId,so_ngay:S.day,doanh_thu:S.total,tim_mat:lost};
  savePending(pend); runId=null;
  const trySubmit=async()=>{
    ov.innerHTML=`${head}<p>${esc(why)}</p>${summary}<div class="submitting" id="msg"><span class="coin" aria-hidden="true"></span>${tl('Đang nộp điểm…','Submitting score…')}</div>`;
    submitting=true; if(cashOut) sfx.countStart();
    const [{data,error}]=await Promise.all([submitPending(pend), new Promise(r=>setTimeout(r,cashOut?800:0))]);
    submitting=false; sfx.countStop();
    if(error&&cashOut) sfx.closeFail();
    if(error&&!isNetErr(error)){
      ov.innerHTML=`${head}${summary}<div class="msg">${tl('Không nộp được điểm','Could not submit the score')}: ${esc(error.message)}</div>
        <div class="col grow"><button class="btn" id="home">${tl('Về màn hình chính','Back to home')}</button></div>`;
      $('home').onclick=home; return;
    }
    if(error){
      ov.innerHTML=`${head}${summary}<div class="msg">${tl('Chưa nộp được điểm do mạng chập chờn.','Score not submitted yet, the connection is unstable.')}</div>
        <p class="muted">${tl('Kết quả đã được lưu trên máy này. Bấm thử lại, hoặc lần sau mở game trên máy này sẽ tự nộp. Lượt này không bị tính là bỏ dở.','The result is saved on this device. Try again, or it will be submitted next time you open the game here. The run will not count as abandoned.')}</p>
        <div class="col grow"><button class="btn" id="retry">${tl('Thử nộp lại','Retry')}</button><button class="btn ghost" id="home">${tl('Về màn hình chính','Back to home')}</button></div>`;
      $('retry').onclick=trySubmit; $('home').onclick=home; return;
    }
    lastRunRec=pend.run; liveKet({delta:data?data.delta:null,cash:cashOut?1:0}); recUpload({run:pend.run});
    if(data&&data.chuoi_moi){
      const before=streakState().n;
      if(profile){profile.chuoi=data.chuoi;profile.ngay_chuoi=vnDate();profile.chuoi_dai_nhat=data.chuoi_dai_nhat}
      const go=()=>streakScreen(before,data.chuoi,data.chuoi_dai_nhat,()=>{openOv('');showResult(head,why,summary,data)});
      go();
    } else showResult(head,why,summary,data);
  };
  trySubmit();
}
function showResult(head,why,summary,data){
  const cash=midClose;
  if(midClose){midClose=false;sfx.closeEnd()}
  const cu=profile?profile.diem:null;
  if(profile) profile.diem=data.diem; myRank=data.hang;
  const d=data.delta, doiHang=cu!=null&&data.diem!=null?doiHangHTML(cu,data.diem,'dbk'):'';
  // Bản 2.19.0: đổi hạng ĐBK thì hiện màn hiệu ứng riêng trước, rồi mới tới kết quả
  if(doiHang) return doiHangScreen('dbk',cu,data.diem,()=>veKetQua(false));
  veKetQua(cash);
  function veKetQua(cash){
  const ov=$('ov');
  ov.innerHTML=`${head}<p>${esc(why)}</p>
    <div><div class="eyebrow">${tl('Điểm Bách Khoa','Bach Khoa Points')}</div>
      <div class="big pop-in" style="color:${d==null||d>=0?'var(--leaf)':'var(--chili)'}">${d==null?tl('Đã ghi nhận','Recorded'):(d>=0?'+':'−')+Math.abs(d)}</div>
      <p class="muted">${tl(`Bây giờ bạn có <b>${data.diem}</b> ĐBK, hạng <b>#${data.hang}</b> toàn trường.`,`You now have <b>${data.diem}</b> BKP, rank <b>#${data.hang}</b> overall.`)}</p></div>
    ${doiHang}
    ${summary}
    <div class="col grow"><button class="btn" id="again">${tl('Chơi lượt mới','New run')}</button>
      <button class="btn ghost" id="lb">${tl('Xem bảng xếp hạng','Leaderboard')}</button>
      <div class="row"><button class="link" id="xemlai">${tl('Xem lại lượt này','Replay this run')}</button><button class="link" id="home">${tl('Về màn hình chính','Back to home')}</button></div></div>`;
  $('again').onclick=()=>startRun(); $('lb').onclick=()=>leaderboard('sv'); $('home').onclick=home;
  const rid=lastRunRec; $('xemlai').onclick=()=>replayScreen({run:rid,back:home,title:tl('Xem lại lượt vừa chơi','Replay of your last run'),sub:`${DIFF[diff].n} · ${data.delta>0?'+':''}${data.delta} ${tl('ĐBK','BKP')}`});
  lockButtons(ov,cash?1200:900); if(cash&&(d??0)>=0) confetti();
  }
}
