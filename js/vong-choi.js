/* Mì Quảng Bách Khoa · js/vong-choi.js: Vòng chơi: mở ngày, khách đến, xếp hàng, làm tô, bưng, hết ngày, mất tim.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Vòng chơi ================= */
let midRun=false;
const GIA_TIM=500, TIM_MAX=5;
function newGame(){midRun=true;S={day:1,money:0,rep:5,upg:{},total:0,lost:0,bought:0};recStart('run');startDay()}
function startDay(){
  nhoMan(null);
  setTimeout(syncPresence,0);
  const n=lv('ban')?4:3;
  D={t:DAYLEN,earned:0,served:0,lost:0,slots:Array(n).fill(null),queue:[],rushSaid:false,spawnT:1.2,shield:lv('the'),
     bowl:{items:new Set(lv('phubep')?['mi']:[]),broth:false},ev:EVENTS[(S.day-1)%4]};
  rec('D',S.day,EVENTS.indexOf(D.ev),D.slots.length,solo?0:target(S.day));
  showOv(false); renderAll(); running=true; last=performance.now(); requestAnimationFrame(loop); saveRun('day');
}
function spawn(){
  const i=D.slots.findIndex(x=>!x);
  if(i<0&&D.queue.length>=(lv('ghe')?6:4)) return;
  const df=DIFF[diff], kh=pick(KHACH), teacher=Math.random()<.08;
  let nTop=Math.min(4,Math.max(1,Math.floor(rnd(1,2.6+S.day*.35+df.top))));
  const combo=lv('combo')&&nTop>1&&Math.random()<.5; if(combo) nTop--;
  const tops=[...TOPS].sort(()=>Math.random()-.5).slice(0,nTop);
  const order=['mi',...TOPS.filter(t=>tops.includes(t)&&!(t==='rau'&&lv('rau')))];
  const cool=(1+.15*lv('quat'))*D.ev.pat*df.pat;
  const max=(Math.max(9,22-S.day)+nTop*2.5)*cool*(teacher?.8:1);
  const qmax=Math.max(8,14-S.day*.5)*cool*(1+.25*lv('ghe'));
  const price=(25+5*nTop-(combo?5:0))*(1+.1*lv('bang'))*(teacher?2:1);
  const c={kh,teacher,order,max,p:max,qmax,q:qmax,price,line:teacher?tl('Thầy ghé ăn trưa, nhanh giúp thầy nhé','Lecturer on a lunch break, quick please'):pick(LINES)};
  recSpawn(c,i);
  if(i>=0){D.slots[i]=c;renderTables()} else {D.queue.push(c);renderStats()}
}
function seatQueue(){
  let moved=false;
  D.slots.forEach((c,i)=>{if(!c&&D.queue.length){D.slots[i]=D.queue.shift();rec('T',D.slots[i].id,i);moved=true}});
  if(moved){renderTables();renderStats()}
}
function loop(now){
  if(!running) return;
  const dt=Math.min(.1,(now-last)/1000); last=now;
  D.t-=dt;
  if(D.t>0){
    D.spawnT-=dt;
    if(inRush()&&!D.rushSaid){D.rushSaid=true;toast(tl('Giờ cao điểm! Khách đến gấp đôi','Rush hour! Twice the customers'));renderStats()}
    if(!inRush()&&D.rushSaid&&D.t<=RUSH[0]&&!D.rushEnd){D.rushEnd=true;renderStats()}
    if(D.spawnT<=0){spawn();const base=Math.max(2.2,5.4-S.day*.3)*(1-.06*lv('bang'))*(1-.1*lv('fanpage'))*DIFF[diff].spawn*(inRush()?.5:1);D.spawnT=rnd(base*.7,base*1.3)*D.ev.spawn}
  }
  seatQueue();
  const pdt=dt*(inRush()&&lv('tv')?.7:1); // TV: giờ cao điểm khách bớt sốt ruột
  for(let k=D.queue.length-1;k>=0;k--){const c=D.queue[k];c.q-=pdt;if(c.q<=0&&running){
    if(D.shield>0){D.shield--;c.q=c.qmax*.5;rec('G',c.id,1);toast(tl('Thẻ tích điểm giữ chân khách','Loyalty card kept a customer'));continue}
    D.queue.splice(k,1);rec('J',c.id);sfx.leave();loseHeart(tl('Khách xếp hàng lâu quá nên bỏ về','A customer waited in line too long and left'))}}
  if(!running) return;
  D.slots.forEach((c,i)=>{if(!c)return;c.p-=pdt;if(c.p<=0&&running){
    if(D.shield>0){D.shield--;c.p=c.max*.5;rec('G',c.id,0);toast(tl('Thẻ tích điểm giữ chân khách','Loyalty card kept a customer'));return}
    rec('L',c.id,i);sfx.leave();angry(i,tl('Khách bỏ đi vì chờ lâu','A customer left after waiting too long'))}});
  if(!running) return;
  updateBars();
  if(D.t<=0){endDay();return}
  requestAnimationFrame(loop);
}
function angry(i,msg){
  D.slots[i]=null;
  const el=$('tables').children[i]; if(el) el.classList.add('shake');
  renderTables(); loseHeart(msg);
}
function loseHeart(msg){
  S.rep--; S.lost++; D.lost++; rec('H',S.rep,S.lost); toast(msg); renderStats();
  if(S.rep<=0){running=false;setTimeout(()=>solo?soloFinish(tl('Hết tim rồi!','Out of hearts!')):S.money>=GIA_TIM?reviveScreen():finishRun(tl('Mất hết uy tín, sinh viên rủ nhau sang quán khác.','Out of reputation, students went to another shop.')),400)}
}
const heartsHTML=n=>Array.from({length:TIM_MAX},(_,i)=>`<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15.5 1 12 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 5-4 8.5-11 14z" fill="${i<n?'currentColor':'none'}" stroke="currentColor" stroke-width="2"/></svg>`).join('');
function buyHeart(){
  if(S.rep>=TIM_MAX){toast(tl('Uy tín đã đầy','Reputation is full'));return false}
  if(S.money<GIA_TIM){toast(tl(`Két chưa đủ ${GIA_TIM}k`,`You need ${GIA_TIM}k in the till`));return false}
  S.money-=GIA_TIM; S.rep++; S.bought++; rec('K'); toast(tl('Đã mua 1 tim','Bought 1 heart')); sfx.heart(); saveRun();
  return true;
}
const heartRow=()=>solo?`<div class="heart-row"><span class="lbl">${tl('Uy tín','Rep')}</span><span class="hearts big">${heartsHTML(S.rep)}</span><span class="muted">${tl('Solo không mua lại tim','No heart buying in solo')}</span><button type="button" id="buyHeart" hidden></button></div>`:`<div class="heart-row"><span class="lbl">${tl('Uy tín','Rep')}</span><span class="hearts big" aria-label="${tl(`Còn ${S.rep} trên ${TIM_MAX} tim`,`${S.rep} of ${TIM_MAX} hearts left`)}">${heartsHTML(S.rep)}</span>
  <button type="button" class="plus" id="buyHeart" aria-label="${tl(`Mua 1 tim với giá ${GIA_TIM}k`,`Buy 1 heart for ${GIA_TIM}k`)}" ${S.rep>=TIM_MAX||S.money<GIA_TIM?'disabled':''}>+</button>
  <span class="muted">${GIA_TIM}k/${tl('tim','heart')} · ${tl('két còn','till')} <b id="ketH">${S.money}k</b></span></div>`;
/* Hết tim giữa ngày: tạm dừng, cho mua tim để bán tiếp */
function reviveScreen(){
  const draw=()=>{
    openOv(`<div class="eyebrow">${tl(`Ngày ${S.day} · còn ${Math.ceil(D.t)} giây`,`Day ${S.day} · ${Math.ceil(D.t)}s left`)}</div><h2>${tl('Hết uy tín rồi!','Out of reputation!')}</h2>
    <p>${tl('Sinh viên đang rủ nhau sang quán khác. Bạn có thể bỏ tiền trong két ra mua lại uy tín để bán tiếp, hoặc đóng quán và chốt điểm.','Students are heading to another shop. Spend money from the till to buy back reputation and keep selling, or close the shop and bank your points.')}</p>
    ${heartRow()}
    <p class="rule">${tl('Mua tim không xoá điểm phạt: mỗi tim đã mất vẫn bị trừ ĐBK khi chốt sổ. Tiền mua tim lấy từ két, không làm giảm doanh thu tính điểm.','Buying hearts does not cancel penalties: every lost heart still costs BKP when you cash out. Hearts are paid from the till and do not reduce the revenue that counts for points.')}</p>
    <div class="col grow"><button class="btn" id="resume" ${S.rep>0?'':'disabled'}>${tl(`Bán tiếp với ${S.rep} tim`,`Keep selling with ${S.rep} hearts`)}</button>
    <button class="btn ghost" id="close">${tl('Đóng quán, chốt điểm','Close shop, bank points')}</button></div>`);
    $('buyHeart').onclick=()=>{if(buyHeart())draw()};
    $('resume').onclick=resumeDay;
    $('buyHeart').addEventListener('click',()=>saveRun('revive'));
    $('close').onclick=()=>finishRun(tl('Mất hết uy tín, bạn đóng quán sớm.','Out of reputation, you closed early.'));
  };
  draw(); lockButtons($('ov'),900); saveRun('revive');
}
function resumeDay(){
  setTimeout(syncPresence,0);
  if(S.rep<=0) return;
  // khách đang chờ được nghỉ một nhịp sau khi quán lấy lại uy tín
  D.slots.forEach(c=>{if(c)c.p=Math.max(c.p,c.max*.5)}); D.queue.forEach(c=>c.q=Math.max(c.q,c.qmax*.5));
  rec('U',Math.round(D.t*10)/10,D.slots.length);
  showOv(false); renderAll(); running=true; last=performance.now(); requestAnimationFrame(loop); saveRun('day');
}
function serve(i){
  const c=D.slots[i]; if(!c||!running) return;
  const b=D.bowl;
  if(!b.items.size){toast(tl('Tô còn trống','The bowl is empty'));return}
  if(!b.broth&&lv('noi')&&b.items.has('mi')){b.broth=true;rec('P');sfx.pour()}
  if(!b.broth){toast(tl('Chưa chan nước lèo','Add the broth first'));return}
  const ok=matches(c,b);
  const el=$('tables').children[i];
  resetBowl();
  if(!ok){rec('W',c.id,i);sfx.wrong();angry(i,tl('Sai món rồi, khách không chịu','Wrong order, the customer refused'));return}
  const tip=Math.round(c.price*.3*(c.p/c.max)*D.ev.tip*(lv('wifi')?1.5:1)*(lv('fanpage')>=2?1.2:1));
  const gain=Math.round(c.price)+tip+(lv('qr')?3:0);
  rec('V',c.id,i,gain,Math.round(c.p/c.max*100));
  D.earned+=gain;S.money+=gain;S.total+=gain;D.served++;sfx.cash(c.teacher||tip>c.price*.2);
  floatText(el,`+${gain}k`,tip>0?'var(--leaf)':'var(--heading)');
  D.slots[i]=null; renderTables(); renderStats();
}
function matches(c,b){
  const want=new Set(c.order), got=new Set(b.items);
  if(lv('rau')) got.delete('rau');
  return want.size===got.size&&[...want].every(x=>got.has(x));
}
/* Nhân viên chạy bàn: tô vừa chan nước lèo khớp món của khách nào thì bưng cho người sắp hết kiên nhẫn nhất */
function autoServe(){
  if(!lv('chay')||!running||!D.bowl.broth) return;
  let best=-1;
  D.slots.forEach((c,i)=>{if(c&&matches(c,D.bowl)&&(best<0||c.p/c.max<D.slots[best].p/D.slots[best].max))best=i});
  if(best>=0) setTimeout(()=>{if(running&&D.slots[best]&&D.bowl.broth&&matches(D.slots[best],D.bowl))serve(best)},250);
}
function resetBowl(){D.bowl={items:new Set(lv('phubep')?['mi']:[]),broth:false};renderBowl();renderPad()}
function endDay(){
  running=false; rec('E',D.earned);
  if(solo){soloPush(true); if(S.day>=SOLO_NGAY){soloFinish(tl('Đã bán đủ 3 ngày.','Sold for all 3 days.'));return} soloShop(); return}
  if(D.earned<target(S.day)){finishRun(tl(`Hôm nay chỉ bán được ${D.earned}k, chưa đủ ${target(S.day)}k tiền mặt bằng.`,`Only ${D.earned}k sold today, short of the ${target(S.day)}k rent.`));return}
  showShop();
}
