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
  return `<div class="streak-pill ${s.lit?'on':''}">${flameSVG(s.lit)}<b>${s.n}</b><span>${s.n?'ngày liên tiếp':'Chưa có chuỗi'}${s.lit?' · hôm nay đã giữ lửa':' · chốt sổ 1 lượt hôm nay để '+(s.n?'giữ':'thắp')+' lửa'}</span></div>`};
// Màn hiệu ứng: lửa xám bùng thành lửa cam, số chuỗi nhảy lên
function streakScreen(oldN,newN,best,next){
  const week=[], dow=(new Date(vnDate()+'T00:00:00').getDay()+6)%7; // 0 = thứ Hai
  for(let k=0;k<7;k++){const off=k-dow, inStreak=off<=0&&off>-newN;
    week.push(`<div class="wd ${inStreak?(off===0?'today':'on'):''} ${off>0?'future':''}"><i>${off===0?'':inStreak?'✓':''}</i><span>${['T2','T3','T4','T5','T6','T7','CN'][k]}</span></div>`)}
  const record=newN>1&&newN>=best;
  openOv(`<div class="streak-stage" role="status" aria-live="polite">
    <div class="flame-wrap"><div class="glow"></div>${flameSVG(false,'f-gray')}${flameSVG(true,'f-lit')}
      <div class="sparks">${Array.from({length:14},(_,k)=>`<i style="--x:${Math.round((Math.random()-.5)*160)}px;--d:${(.7+Math.random()*.9).toFixed(2)}s;--s:${(4+Math.random()*5).toFixed(1)}px"></i>`).join('')}</div></div>
    <div class="streak-num"><b id="sNum">${oldN}</b></div>
    <h2>${newN===1?'Thắp lửa chuỗi mới!':`Chuỗi ${newN} ngày liên tiếp!`}</h2>
    ${record?'<div class="record">Kỷ lục mới của bạn</div>':''}
    <p class="muted">Ngày mai quay lại mở quán và chốt sổ ít nhất một lượt để giữ lửa. Bỏ một ngày là chuỗi về 0.</p>
    <div class="week">${week.join('')}</div>
    <button class="btn warm grow" id="sNext">Tiếp tục</button></div>`);
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
    endFx('lose','Quán đóng cửa',why,()=>finishRun(why,false,true));
    return;
  }
  midClose=cashOut;
  running=false; midRun=false;
  const lost=S.lost||0;
  const hs=DIFF[diff].hs;
  const est=Math.round(S.total*hs/10)-Math.round(lost*15*hs**2);
  const ov=$('ov'); showOv(true);
  const head=cashOut?`<div class="eyebrow">Chốt sổ · ${DIFF[diff].n}</div><h2>Nghỉ bán sau ${S.day} ngày</h2>`
                     :`<div class="eyebrow">Quán tạm đóng cửa · ${DIFF[diff].n}</div><h2>Trụ được ${S.day} ngày</h2>`;
  const summary=`<div class="sum"><span>Tổng doanh thu</span><b>${S.total}k</b><span>Tim đã mất</span><b>${lost}</b>
    <span>Thưởng (${S.total}k × ${hs} ÷ 10)</span><b>+${Math.round(S.total*hs/10)}</b>
    <span>Phạt (${lost} tim × ${phat(diff)})</span><b>−${Math.round(lost*15*hs**2)}</b></div>`;
  if(!ranked){
    if(S.day>guestBest.day||(S.day===guestBest.day&&S.total>guestBest.money)){guestBest={day:S.day,money:S.total};try{localStorage.setItem('mqbk-best',JSON.stringify(guestBest))}catch(e){}}
    const showGuest=()=>{openOv(`${head}<p>${esc(why)}</p>${summary}
      <p class="muted">Lượt chơi thử không được tính điểm. Nếu đăng nhập, lượt này sẽ ${est>=0?'cộng':'trừ'} <b>${Math.abs(est)}</b> ĐBK.</p>
      <div class="col grow"><button class="btn" id="again">Chơi lại</button><button class="btn ghost" id="home">Về màn hình chính</button></div>`);
      $('again').onclick=()=>startRun(); $('home').onclick=home};
    const before=streakState().n, g=bumpGuestStreak();
    const showG=()=>{const c=midClose;showGuest();lockButtons($('ov'),c?1200:900);if(c){midClose=false;sfx.closeEnd();if(est>=0)confetti()}};
    if(g.moi) streakScreen(before,g.chuoi,g.best,showG); else showG();
    return;
  }
  // Lưu kết quả trên máy trước khi gửi, để không mất nếu mạng lỗi
  const pend={uid:user.id,run:runId,so_ngay:S.day,doanh_thu:S.total,tim_mat:lost};
  savePending(pend); runId=null;
  const trySubmit=async()=>{
    ov.innerHTML=`${head}<p>${esc(why)}</p>${summary}<div class="submitting" id="msg"><span class="coin" aria-hidden="true"></span>Đang nộp điểm…</div>`;
    submitting=true; if(cashOut) sfx.countStart();
    const [{data,error}]=await Promise.all([submitPending(pend), new Promise(r=>setTimeout(r,cashOut?800:0))]);
    submitting=false; sfx.countStop();
    if(error&&cashOut) sfx.closeFail();
    if(error&&!isNetErr(error)){
      ov.innerHTML=`${head}${summary}<div class="msg">Không nộp được điểm: ${esc(error.message)}</div>
        <div class="col grow"><button class="btn" id="home">Về màn hình chính</button></div>`;
      $('home').onclick=home; return;
    }
    if(error){
      ov.innerHTML=`${head}${summary}<div class="msg">Chưa nộp được điểm do mạng chập chờn.</div>
        <p class="muted">Kết quả đã được lưu trên máy này. Bấm thử lại, hoặc lần sau mở game trên máy này sẽ tự nộp. Lượt này không bị tính là bỏ dở.</p>
        <div class="col grow"><button class="btn" id="retry">Thử nộp lại</button><button class="btn ghost" id="home">Về màn hình chính</button></div>`;
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
  const ov=$('ov');
  if(profile) profile.diem=data.diem; myRank=data.hang;
  const d=data.delta;
  ov.innerHTML=`${head}<p>${esc(why)}</p>
    <div><div class="eyebrow">Điểm Bách Khoa</div>
      <div class="big pop-in" style="color:${d==null||d>=0?'var(--leaf)':'var(--chili)'}">${d==null?'Đã ghi nhận':(d>=0?'+':'−')+Math.abs(d)}</div>
      <p class="muted">Bây giờ bạn có <b>${data.diem}</b> ĐBK, hạng <b>#${data.hang}</b> toàn trường.</p></div>
    ${summary}
    <div class="col grow"><button class="btn" id="again">Chơi lượt mới</button>
      <button class="btn ghost" id="lb">Xem bảng xếp hạng</button>
      <div class="row"><button class="link" id="xemlai">Xem lại lượt này</button><button class="link" id="home">Về màn hình chính</button></div></div>`;
  $('again').onclick=()=>startRun(); $('lb').onclick=()=>leaderboard('sv'); $('home').onclick=home;
  const rid=lastRunRec; $('xemlai').onclick=()=>replayScreen({run:rid,back:home,title:'Xem lại lượt vừa chơi',sub:`${DIFF[diff].n} · ${data.delta>0?'+':''}${data.delta} ĐBK`});
  lockButtons(ov,cash?1200:900); if(cash&&(d??0)>=0) confetti();
}
