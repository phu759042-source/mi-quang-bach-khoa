/* Mì Quảng Bách Khoa · js/solo.js: Solo kiểu chess.com: thách đấu, realtime, trận 3 ngày, Elo, vào lại trận.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Solo: thách đấu như chess.com =================
   Luồng: A tìm B (thanh tìm kiếm hoặc bảng xếp hạng) → chọn độ khó + luật → gui_thach_dau.
   B nhận thông báo realtime ở góc dưới bên phải (có âm thanh), đồng ý → tra_loi_thach_dau.
   Hai bên đếm ngược rồi cùng bán 3 ngày; tiến độ gửi qua cap_nhat_solo, server phân thắng thua và tính Elo. */
const SOLO_NGAY=3, SOLO_SHOP=20;
const CHE_DO={
  sinh_ton:{n:'Sinh tồn',d:'Ai hết tim trước thì thua. Cả hai trụ đủ 3 ngày thì so ĐBK.'},
  diem:{n:'Điểm cao',d:'Hết 3 ngày, ai nhiều ĐBK hơn thì thắng. Hết tim là dừng sớm.'}};
let solo=null;            // trận đang đấu
let soloWait=null;        // lời thách mình đã gửi, đang chờ trả lời
let soloAccepting=null;   // id lời thách mình vừa bấm đồng ý
let soloCh=null, onlineCh=null, onlineSet=new Set(), onlineSt=new Map(), myPresence='';
// Trạng thái gửi kèm tín hiệu "đang mở game": rảnh, đang bán (chế độ thường) hay đang solo
const presenceNow=()=>solo?'solo':midRun?'ban':'ranh';
function syncPresence(force){
  const st=presenceNow(); if(!onlineCh||(!force&&st===myPresence)) return;
  myPresence=st; try{onlineCh.track({at:Date.now(),st})}catch(e){}
}
const ST_TEN={solo:'Đang solo',ban:'Đang bán'};
const stBadge=id=>`<span class="st-badge" data-st="${id}" ${ST_TEN[onlineSt.get(id)]?'':'hidden'}>${ST_TEN[onlineSt.get(id)]||''}</span>`;
function applyPresence(){
  document.querySelectorAll('[data-online]').forEach(el=>el.hidden=!onlineSet.has(el.dataset.online));
  document.querySelectorAll('[data-st]').forEach(el=>{const t=ST_TEN[onlineSt.get(el.dataset.st)];el.hidden=!t;el.textContent=t||''});
  // người đang solo: nút đổi thành "Xem trận" (xem trực tiếp), hết trận tự đổi lại "Thách đấu"
  document.querySelectorAll('.act[data-uid]').forEach(b=>{const kin=onlineSt.get(b.dataset.uid)==='solo';b.classList.toggle('watch',kin);b.textContent=kin?'Xem trận':'Thách đấu'});
  document.querySelectorAll('[data-thach]').forEach(b=>{const kin=onlineSt.get(b.dataset.thach)==='solo';b.textContent=kin?'Đang trong trận · Xem':'Thách đấu'});
  document.querySelectorAll('[data-xem]').forEach(b=>{const st=onlineSt.get(b.dataset.xem);b.hidden=!(st==='ban'||st==='solo')});
  const cb=$('busyNote'); if(cb) cb.dispatchEvent(new Event('presence'));
}
const notices=new Map();  // id lời thách → {el,row,p,timer}
const diemSolo=(dk,dt,tm)=>Math.round(dt*DIFF[dk].hs/10)-Math.round(tm*15*DIFF[dk].hs**2);
const eloDoi=(ra,rb,s)=>Math.round(32*(s-1/(1+10**((rb-ra)/400))));
const myElo=()=>profile?.elo??1200;
const tenNgan=s=>String(s||'').trim().split(/\s+/).pop()||'Đối thủ';
const HEART_PATH='M12 21C5 15.5 1 12 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 5-4 8.5-11 14z';

/* ---- kết nối realtime: lời thách tới, cập nhật trận, ai đang online ---- */
function soloConnect(){
  if(!sb||!user||soloCh) return;
  soloCh=sb.channel('solo-'+user.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'thach_dau'},p=>soloRow(p.new))
    .subscribe();
  onlineCh=sb.channel('online',{config:{presence:{key:user.id}}});
  onlineCh.on('presence',{event:'sync'},()=>{
      const ps=onlineCh.presenceState();
      onlineSet=new Set(Object.keys(ps));
      onlineSt=new Map(Object.entries(ps).map(([k,ms])=>{const m=[...(ms||[])].sort((a,b)=>(b.at||0)-(a.at||0))[0]||{};return [k,m.st||'ranh']}));
      applyPresence()})
    .subscribe(s=>{if(s==='SUBSCRIBED') syncPresence(true)});
  liveOpen();
  soloPoll(true); clearInterval(soloConnect.t); soloConnect.t=setInterval(()=>soloPoll(false),15000);
}
function soloDisconnect(){
  if(soloCh){sb.removeChannel(soloCh);soloCh=null}
  if(onlineCh){sb.removeChannel(onlineCh);onlineCh=null}
  liveClose(); clearInterval(soloConnect.t); [...notices.keys()].forEach(dropNotice);
}
// Dự phòng khi realtime chập chờn: hỏi server lời thách đang chờ; trận cũ còn treo (tải lại trang giữa trận) thì tính bỏ trận
async function soloPoll(boot){
  if(!sb||!user) return;
  const {data}=await sb.from('thach_dau').select('*').or(`a.eq.${user.id},b.eq.${user.id}`)
    .in('trang_thai',['cho','dang_dau']).order('id',{ascending:false}).limit(10);
  (data||[]).forEach(r=>{
    if(r.trang_thai==='cho'){
      if(new Date(r.het_han)<=Date.now()) return;
      if(r.b===user.id) soloRow(r);
      else if(boot&&r.a===user.id) soloResume(r);          // tải lại trang lúc đang chờ: quay lại màn chờ
      return }
    const mine=(solo&&solo.id===r.id)||(soloWait&&soloWait.id===r.id)||soloAccepting===r.id;
    if(!mine) soloResume(r);                               // trận đang đấu mà máy này không giữ: cho vào lại
  });
}
function soloRow(r){
  if(!r||!user) return;
  const mine=r.a===user.id?'a':r.b===user.id?'b':null; if(!mine) return;
  if(mine==='b'&&r.trang_thai==='cho'){ if(!notices.has(r.id)&&new Date(r.het_han)>Date.now()) showNotice(r); return }
  if(notices.has(r.id)) dropNotice(r.id);
  if(soloWait&&soloWait.id===r.id){
    if(r.trang_thai==='dang_dau') return startSolo(r,soloWait.opp);
    if(['tu_choi','het_han','huy'].includes(r.trang_thai)) return waitEnded(r);
  }
  if(solo&&solo.id===r.id) return soloUpdate(r);
  if(r.trang_thai==='dang_dau'&&!solo&&!soloWait&&soloAccepting!==r.id) soloResume(r);
}

/* ---- thông báo thách đấu ở góc dưới bên phải ---- */
const TITLE0=document.title;
function titleBlink(on){clearInterval(titleBlink.t);document.title=TITLE0;if(!on)return;let k=0;
  titleBlink.t=setInterval(()=>{document.title=(k++%2)?TITLE0:'(!) Có lời thách đấu'},1000)}
const soloBusy=()=>midRun||!!solo||!!soloWait;
async function showNotice(r){
  notices.set(r.id,{row:r});                      // giữ chỗ để không hiện hai lần
  const {data:p}=await sb.from('profiles').select('id,ten,lop,khoa_id,elo,avatar_url').eq('id',r.a).maybeSingle();
  if(!notices.has(r.id)) return;
  const left=Math.max(0,new Date(r.het_han)-Date.now());
  let box=$('notices');
  if(!box){box=document.createElement('div');box.id='notices';box.className='notices';box.setAttribute('aria-live','assertive');document.body.appendChild(box)}
  const el=document.createElement('div'); el.className='notice'; el.setAttribute('role','alertdialog'); el.setAttribute('aria-label','Lời thách đấu');
  el.innerHTML=`${avatarHTML(p?.avatar_url,p?.ten||'?',44)}
    <div class="t">${esc(p?.ten||'Một người chơi')} thách đấu bạn!</div>
    <div class="d">${esc(p?.lop||'')} · Elo ${p?.elo??'—'} · ${DIFF[r.do_kho].n} · ${CHE_DO[r.che_do].n}</div>
    <div class="note" hidden>Bạn đang chơi dở, chốt sổ xong mới nhận được.</div>
    <div class="timer"><i style="animation-duration:${left}ms"></i></div>
    <div class="acts2"><button type="button" class="btn ghost" data-no>Từ chối</button><button type="button" class="btn" data-yes>Đồng ý</button></div>`;
  box.appendChild(el);
  Object.assign(notices.get(r.id),{el,p,timer:setTimeout(()=>dropNotice(r.id),left)});
  refreshNotices();
  sfx.challenge(); try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(e){}
  titleBlink(true);
  el.querySelector('[data-no]').onclick=()=>answer(r.id,false);
  el.querySelector('[data-yes]').onclick=()=>answer(r.id,true);
}
function refreshNotices(){
  const busy=soloBusy();
  notices.forEach(n=>{if(!n.el)return;n.el.querySelector('[data-yes]').disabled=busy;n.el.querySelector('.note').hidden=!busy});
}
function dropNotice(id){
  const n=notices.get(id); notices.delete(id); if(!n) return;
  clearTimeout(n.timer); if(n.el){n.el.classList.add('out');setTimeout(()=>n.el.remove(),250)}
  if(!notices.size) titleBlink(false);
}
async function answer(id,yes){
  const n=notices.get(id); if(!n||!n.el) return;
  if(yes&&soloBusy()){toast('Bạn đang chơi dở');return}
  n.el.querySelectorAll('button').forEach(b=>b.disabled=true);
  if(yes) soloAccepting=id;
  const {data,error}=await sb.rpc('tra_loi_thach_dau',{p_id:id,p_dong_y:yes});
  dropNotice(id);
  if(error){soloAccepting=null;toast(error.message);return}
  if(yes&&data?.trang_thai==='dang_dau'){[...notices.keys()].forEach(dropNotice);startSolo(data,n.p)}
  soloAccepting=null;
}

/* ---- gửi lời thách ---- */
const vsHTML=(opp)=>`<div class="vs">
  <div class="p">${avatarHTML(profile?.avatar_url,profile?.ten||'Bạn',56)}<div class="nm">${esc(profile?.ten||'Bạn')}</div><div class="sb">Elo ${myElo()}</div></div>
  <div class="x">VS</div>
  <div class="p">${avatarHTML(opp.avatar_url,opp.ten,56)}<div class="nm">${esc(opp.ten)}</div><div class="sb">${opp.lop?esc(opp.lop)+' · ':''}Elo ${opp.elo??'—'}</div></div></div>`;
async function challengeScreen(p,back,opt={}){
  if(!ranked||!sb){toast('Đăng nhập để solo');return}
  if(!p||p.id===user.id) return;
  if(solo||midRun){toast('Bạn đang chơi dở');return}
  nhoMan('thach',p.id);
  if(p.elo==null){
    const {data}=await sb.from('profiles').select('id,ten,lop,elo,avatar_url').eq('id',p.id).maybeSingle();
    if(data) p={...p,...data};
  }
  let dk=opt.dk||diff, md=opt.md||'sinh_ton';
  const win=eloDoi(myElo(),p.elo??1200,1), lose=eloDoi(myElo(),p.elo??1200,0);
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Solo · thách đấu</div><button class="link" id="back">Đóng</button></div>
    <h2>Thách đấu ${esc(tenNgan(p.ten))}</h2>
    ${vsHTML(p)}
    <div class="col"><div class="eyebrow">Độ khó</div><div class="diffs" id="sDiffs">${Object.entries(DIFF).map(([k,v])=>`<button type="button" class="diff d-${k}" data-d="${k}" aria-pressed="${k===dk}"><b>${v.n}</b><span class="x">×${v.hs}</span><small>Phạt ${phat(k)}/tim</small></button>`).join('')}</div></div>
    <div class="col"><div class="eyebrow">Luật thắng</div><div class="modes" id="sModes">${Object.entries(CHE_DO).map(([k,v])=>`<button type="button" class="mode" data-m="${k}" aria-pressed="${k===md}"><b>${v.n}</b><small>${v.d}</small></button>`).join('')}</div></div>
    <p class="muted">Mỗi người bán 3 ngày cùng lúc, có cửa hàng giữa các ngày, không mua lại tim. Thắng <b>+${win}</b> Elo, thua <b>${lose}</b> Elo. Solo không cộng trừ ĐBK.</p>
    <div class="msg" id="msg"></div>
    <div class="msg" id="busyNote" role="status"></div>
    <div class="col grow"><button class="btn" id="send">Gửi lời thách</button></div>`);
  const busy=()=>{const st=onlineSt.get(p.id), n=$('busyNote'), b=$('send'); if(!n||!b) return;
    n.className='msg'+(st==='ban'?' warn':'');
    n.textContent=st==='solo'?`${tenNgan(p.ten)} đang trong một trận solo khác. Chờ trận đó xong rồi thách lại nhé.`
      :st==='ban'?`${tenNgan(p.ten)} đang bán ở chế độ thường, phải chốt sổ xong mới nhận được lời thách.`
      :onlineSet.has(p.id)?'':`${tenNgan(p.ten)} có vẻ không mở game lúc này.`;
    if(!b.dataset.sending) b.disabled=st==='solo'};
  busy(); $('busyNote').addEventListener('presence',busy);
  $('back').onclick=back||home;
  $('sDiffs').onclick=e=>{const b=e.target.closest('.diff');if(!b)return;dk=b.dataset.d;$('sDiffs').querySelectorAll('.diff').forEach(x=>x.setAttribute('aria-pressed',x.dataset.d===dk))};
  $('sModes').onclick=e=>{const b=e.target.closest('.mode');if(!b)return;md=b.dataset.m;$('sModes').querySelectorAll('.mode').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===md))};
  $('send').onclick=async()=>{
    const msg=$('msg'); msg.className='msg ok'; msg.textContent='Đang gửi…'; $('send').disabled=true; $('send').dataset.sending=1;
    const {data,error}=await sb.rpc('gui_thach_dau',{p_b:p.id,p_do_kho:dk,p_che_do:md});
    if(error){msg.className='msg';msg.textContent=error.message;$('send').disabled=false;delete $('send').dataset.sending;
      if(/đang trong một trận|đang chờ một lời thách/i.test(error.message)){msg.textContent+='. Đang tìm lại…';soloPoll(true)}
      return}
    waitScreen({id:data,opp:p,dk,md});
  };
}
function waitScreen(w){
  soloWait=w; refreshNotices(); const end=w.end||Date.now()+60000;
  openOv(`<div class="eyebrow">Solo · ${DIFF[w.dk].n} · ${CHE_DO[w.md].n}</div><h2>Đang chờ ${esc(tenNgan(w.opp.ten))} trả lời</h2>
    ${vsHTML(w.opp)}
    <p class="muted">Lời thách hiện ở góc màn hình của ${esc(w.opp.ten)}, kèm âm thanh.${onlineSet.has(w.opp.id)?'':' Bạn ấy có vẻ không mở game lúc này nên có thể không thấy.'}</p>
    <div class="submitting"><span class="coin" aria-hidden="true"></span>Còn <span id="wLeft">${Math.max(0,Math.ceil((end-Date.now())/1000))}</span> giây</div>
    <div class="col grow"><button class="btn ghost" id="cancel">Huỷ lời thách</button></div>`);
  $('cancel').onclick=async()=>{if(soloWait!==w)return;soloWait=null;clearInterval(w.t);refreshNotices();await sb.rpc('huy_thach_dau',{p_id:w.id});home()};
  w.t=setInterval(async()=>{
    if(soloWait!==w){clearInterval(w.t);return}
    const s=Math.max(0,Math.ceil((end-Date.now())/1000)), el=$('wLeft'); if(el) el.textContent=s;
    if(s%3===0||s===0){const {data}=await sb.rpc('kiem_tra_solo',{p_id:w.id}); if(data&&soloWait===w) soloRow(data)}
  },1000);
}
function waitEnded(r){
  const w=soloWait; soloWait=null; clearInterval(w.t); refreshNotices();
  const why=r.trang_thai==='tu_choi'?`${w.opp.ten} đã từ chối lời thách.`
    :r.trang_thai==='het_han'?`${w.opp.ten} không trả lời trong 60 giây.`:'Lời thách đã bị huỷ.';
  if(r.trang_thai==='tu_choi') sfx.wrong();
  openOv(`<div class="eyebrow">Solo</div><h2>Chưa đấu được</h2><p>${esc(why)}</p>
    <div class="col grow"><button class="btn" id="again">Thách lại</button><button class="btn ghost" id="lbs">Tìm người khác</button><button class="link" id="home">Về màn hình chính</button></div>`);
  $('again').onclick=()=>challengeScreen(w.opp,null,{dk:w.dk,md:w.md}); $('lbs').onclick=()=>leaderboard('solo',true); $('home').onclick=home;
}

/* ---- trận đấu ---- */
function startSolo(r,opp){
  if(solo&&solo.id===r.id) return;
  if(soloWait){clearInterval(soloWait.t);soloWait=null}
  const me=r.a===user.id?'a':'b';
  solo={id:r.id,me,op:me==='a'?'b':'a',row:r,opp:opp||{ten:'Đối thủ'},dk:r.do_kho,md:r.che_do,prevDiff:diff,sent:'',last:0};
  diff=r.do_kho; midRun=true; refreshNotices();
  if(!opp||!opp.ten||opp.elo==null) sb.from('profiles').select('id,ten,lop,elo,avatar_url').eq('id',r[solo.op]).maybeSingle()
    .then(({data})=>{if(data&&solo&&solo.id===r.id){solo.opp=data;if(running)renderStats()}});
  let n=Math.round((new Date(r.bat_dau)-Date.now())/1000); if(!(n>=1)) n=3; n=Math.min(4,n);
  openOv(`<div class="eyebrow" style="text-align:center">Solo · ${DIFF[solo.dk].n} · ${CHE_DO[solo.md].n}</div>
    ${vsHTML(solo.opp)}<div class="countdown pop-in" id="cd">${n}</div>
    <p class="muted" style="text-align:center;margin-inline:auto">${CHE_DO[solo.md].d}</p>`);
  sfx.num();
  const t=setInterval(()=>{ if(!solo||solo.id!==r.id){clearInterval(t);return}
    n--; const cd=$('cd'); if(n>0){if(cd){cd.textContent=n;cd.classList.remove('pop-in');void cd.offsetWidth;cd.classList.add('pop-in')}sfx.num()}
    else {clearInterval(t);sfx.cash(true);soloBegin()}},1000);
}
function soloBegin(){
  if(!solo) return;
  S={day:1,money:0,rep:5,upg:{},total:0,lost:0,bought:0}; recStart('solo'); REC.opp=solo.row[solo.op]; REC.td=solo.id; startDay();
  solo.ping=setInterval(()=>soloPush(true),4000);
  solo.chk=setInterval(async()=>{if(!solo)return;const id=solo.id;const {data}=await sb.rpc('kiem_tra_solo',{p_id:id});if(data&&solo&&solo.id===id)soloUpdate(data)},10000);
}
// Gửi tiến độ của mình (gọi sau mỗi lần đổi tiền/tim, tối đa ~1,4 lần/giây, và mỗi 4 giây để báo còn online)
async function soloPush(force=false,xong=false){
  if(!solo) return;
  const key=[S.day,S.total,S.lost,xong].join();
  if(!force&&key===solo.sent) return;
  if(!force&&Date.now()-solo.last<700){clearTimeout(solo.tt);solo.tt=setTimeout(()=>soloPush(),700);return}
  solo.sent=key; solo.last=Date.now();
  const id=solo.id;
  const {data,error}=await sb.rpc('cap_nhat_solo',{p_id:id,p_ngay:Math.min(SOLO_NGAY,S.day),p_doanh_thu:S.total,p_tim_mat:Math.min(5,S.lost),p_xong:xong});
  if(!solo||solo.id!==id) return;
  if(data) soloUpdate(data);
  else if(error&&xong) setTimeout(()=>soloPush(true,true),1500);   // mạng lỗi lúc báo xong: thử lại
}
function soloUpdate(r){
  if(!solo||r.id!==solo.id) return;
  const prev=solo.row, o=solo.op; solo.row=r;
  if(r.trang_thai==='xong') return soloEnd(r);
  soloDrawWatch(prev,r);
  if(running){
    if(prev&&(r[o+'_tim_mat']||0)>(prev[o+'_tim_mat']||0)) toast(`${tenNgan(solo.opp.ten)} vừa mất 1 tim`);
    renderStats();
  }
  const os=$('oppShop'); if(os) os.innerHTML=oppLine();
  const ow=$('oppNow'); if(ow) ow.innerHTML=oppLine();
}
const oppLine=()=>{if(!solo)return'';const r=solo.row,o=solo.op,t=r[o+'_tim_mat']||0;
  return `<b>${esc(tenNgan(solo.opp.ten))}</b>: ngày ${Math.max(1,r[o+'_ngay']||1)}, ${r[o+'_doanh_thu']||0}k, mất ${t} tim, ${diemSolo(solo.dk,r[o+'_doanh_thu']||0,t)} ĐBK${r[o+'_xong']?' · đã xong':''}`};
// Thanh đối thủ hiện trong dòng sự kiện khi đang bán
function soloHud(){
  if(!solo) return '';
  const r=solo.row, o=solo.op, t=Math.min(5,r[o+'_tim_mat']||0);
  const hp=i=>`<svg viewBox="0 0 24 22" aria-hidden="true"><path d="${HEART_PATH}" fill="${i<5-t?'currentColor':'none'}" stroke="currentColor" stroke-width="2"/></svg>`;
  return `<span class="opp" aria-label="Đối thủ ${esc(solo.opp.ten)}: ${r[o+'_doanh_thu']||0}k, còn ${5-t} tim">${avatarHTML(solo.opp.avatar_url,solo.opp.ten,20)}<b>${esc(tenNgan(solo.opp.ten))}</b>
    <span>N${Math.max(1,r[o+'_ngay']||1)} · ${r[o+'_doanh_thu']||0}k</span><span class="hearts">${[0,1,2,3,4].map(hp).join('')}</span>${r[o+'_xong']?'<span>· xong</span>':''}</span>`;
}
function soloShop(){
  showShop();
  const cash=$('cash'), nx=$('next'); let armed=false, s=SOLO_SHOP;
  cash.textContent='Bỏ trận (tính thua)';
  cash.onclick=async()=>{ if(!armed){armed=true;cash.textContent='Bấm lần nữa để bỏ trận';return}
    clearInterval(t); cash.disabled=true; const {data}=await sb.rpc('bo_tran_solo',{p_id:solo.id}); if(data) soloUpdate(data) };
  nx.insertAdjacentHTML('beforebegin',`<p class="muted" id="oppShop">${oppLine()}</p>`);
  const lbl=()=>nx.textContent=`Mở quán ngày ${S.day+1} · ${s}s`;
  const go=nx.onclick; nx.onclick=()=>{clearInterval(t);go()};
  lbl(); const t=setInterval(()=>{ if(!solo){clearInterval(t);return} s--; if(s<=0){clearInterval(t);nx.onclick()} else lbl()},1000);
}
function soloFinish(why){
  running=false; if(!solo) return; saveRun('wait');
  solo.why=why; soloPush(true,true);
  const my=diemSolo(solo.dk,S.total,Math.min(5,S.lost));
  openOv(`<div class="eyebrow">Solo · ${DIFF[solo.dk].n} · ${CHE_DO[solo.md].n}</div><h2>${esc(why)}</h2>
    <div class="sum"><span>Doanh thu của bạn</span><b>${S.total}k</b><span>Tim đã mất</span><b>${Math.min(5,S.lost)}</b><span>ĐBK của bạn</span><b>${my}</b></div>
    <div class="submitting"><span class="coin" aria-hidden="true"></span>Đang chờ đối thủ…</div>
    <p class="muted" id="oppNow">${oppLine()}</p>`);
}
function soloEnd(r){
  setTimeout(syncPresence,0);
  if(!solo) return;
  const s=solo; solo=null; document.querySelectorAll('.toast,#soloMenu').forEach(t=>t.remove()); hideDrawOffer(); clearRun();
  running=false; midRun=false; clearInterval(s.ping); clearInterval(s.chk); clearTimeout(s.tt);
  diff=s.prevDiff;
  if(REC){rec('O',S.day,S.total,S.lost||0); recUpload({thach_dau:r.id})}
  liveKet({id:r.id,a:r.a,b:r.b,thang:r.thang,ly_do:r.ly_do,doi_a:r.doi_a,doi_b:r.doi_b});
  const me=s.me, o=s.op, draw=!r.thang, win=r.thang===user.id, d=r['doi_'+me]??0, eloMoi=(r['elo_'+me]??myElo())+d;
  if(profile){profile.elo=Math.max(100,eloMoi); const k=draw?'solo_hoa':win?'solo_thang':'solo_thua'; profile[k]=(profile[k]||0)+1}
  const ten=s.opp.ten||'Đối thủ', n=tenNgan(ten);
  const why={het_tim:win?`${ten} hết tim trước.`:draw?'Hai bạn hết tim cùng lúc.':'Bạn hết tim trước.',
    diem:draw?'Hai bạn bằng điểm sau 3 ngày.':'So ĐBK sau 3 ngày bán.',
    roi_tran:win?`${ten} đã rời trận quá lâu nên bị xử thua.`:'Bạn mất kết nối quá lâu nên bị xử thua.',
    bo_cuoc:win?`${ten} đã bỏ cuộc.`:'Bạn đã bỏ cuộc.', ca_hai_roi:'Cả hai đều mất kết nối.', hoa_thoa_thuan:'Hai bạn đồng ý hoà.'}[r.ly_do]||'';
  const cell=(k,x)=>`<td>${x}</td>`, dm=diemSolo(s.dk,r[me+'_doanh_thu'],r[me+'_tim_mat']), dt=diemSolo(s.dk,r[o+'_doanh_thu'],r[o+'_tim_mat']);
  const show=()=>{
    openOv(`<div class="eyebrow">Solo · ${DIFF[s.dk].n} · ${CHE_DO[s.md].n}</div>
    <h2>${draw?'Hoà!':win?'Bạn thắng!':'Bạn thua rồi'}</h2><p>${esc(why)}</p>
    <div><div class="eyebrow">Elo solo</div>
      <div class="big pop-in" style="color:${d>0?'var(--leaf)':d<0?'var(--chili)':'var(--heading)'}">${d>0?'+':d<0?'−':'±'}${Math.abs(d)}</div>
      <p class="muted">Elo của bạn bây giờ là <b>${Math.max(100,eloMoi)}</b>.</p></div>
    <div class="sum" style="display:block"><table class="tb"><tr><th></th><th>Bạn</th><th>${esc(n)}</th></tr>
      <tr><td>Số ngày</td>${cell(0,r[me+'_ngay'])}${cell(0,r[o+'_ngay'])}</tr>
      <tr><td>Doanh thu</td>${cell(0,r[me+'_doanh_thu']+'k')}${cell(0,r[o+'_doanh_thu']+'k')}</tr>
      <tr><td>Tim đã mất</td>${cell(0,r[me+'_tim_mat'])}${cell(0,r[o+'_tim_mat'])}</tr>
      <tr><td>ĐBK</td>${cell(0,'<b>'+dm+'</b>')}${cell(0,'<b>'+dt+'</b>')}</tr></table></div>
    <div class="col grow"><button class="btn" id="re">Tái đấu</button><button class="btn ghost" id="xemlai">Xem lại trận</button>
      <div class="row"><button class="link" id="lbs">Bảng xếp hạng Solo</button><button class="link" id="home">Về màn hình chính</button></div></div>`);
    $('xemlai').onclick=()=>replayScreen({thach_dau:r.id,back:home,title:`${tenNgan(profile?.ten||'Bạn')} vs ${tenNgan(ten)}`,sub:`${draw?'Hoà':win?'Thắng':'Thua'} · ${DIFF[s.dk].n} · ${CHE_DO[s.md].n}`});
    $('re').onclick=()=>challengeScreen({...s.opp,id:r[o]},null,{dk:s.dk,md:s.md});
    $('lbs').onclick=()=>leaderboard('solo'); $('home').onclick=home;
    refreshNotices();
  };
  endFx(draw?'draw':win?'win':'lose', draw?'Hoà!':win?'Bạn thắng!':'Bạn thua rồi', why, show);
}

/* ---- vào lại trận sau khi tải lại trang ---- */
async function soloBoot(){
  const snap=loadRun(); if(!snap||!snap.solo||!user||snap.uid!==user.id) return false;
  openOv('<div class="empty-state">Đang vào lại trận solo…</div>');
  const {data:r}=await sb.from('thach_dau').select('*').eq('id',snap.solo).maybeSingle();
  if(r&&r.trang_thai==='dang_dau'){
    await soloResume(r);
    for(let i=0;i<60&&resuming===r.id;i++) await new Promise(ok=>setTimeout(ok,100));   // soloPoll có thể đang vào cùng trận
    if(solo&&solo.id===r.id) return true;
    return false;
  }
  clearRun();
  if(r&&r.trang_thai==='xong') toast(r.thang===user.id?'Trận solo đã kết thúc: bạn thắng':!r.thang?'Trận solo đã kết thúc: hoà':'Trận solo đã kết thúc: bạn thua');
  return false;
}
let resuming=null;
async function soloResume(r){
  if(!user||solo||soloWait||midRun||resuming===r.id) return;
  resuming=r.id;
  try{
    const me=r.a===user.id?'a':'b', o=me==='a'?'b':'a';
    const {data:opp0}=await sb.from('profiles').select('id,ten,lop,elo,avatar_url').eq('id',r[o]).maybeSingle();
    if(solo||soloWait||midRun) return;
    const opp=opp0||{id:r[o],ten:'Đối thủ',elo:null};
    if(r.trang_thai==='cho'){ waitScreen({id:r.id,opp,dk:r.do_kho,md:r.che_do,end:new Date(r.het_han).getTime()}); toast('Lời thách của bạn vẫn đang chờ'); return }
    if(new Date(r.bat_dau)>Date.now()-1500){ startSolo(r,opp); return }   // vừa được đồng ý, còn đang đếm ngược
    // Khôi phục: ưu tiên bản lưu trên máy (giữ nâng cấp, tiền, giờ còn lại), không có thì lấy tiến độ trên server
    const ngay=Math.max(1,r[me+'_ngay']||1), dt=r[me+'_doanh_thu']||0, tm=Math.min(5,r[me+'_tim_mat']||0);
    const snap=loadRun(), coSnap=!!(snap&&snap.solo===r.id&&snap.uid===user.id&&snap.S&&snap.S.total>=dt&&(snap.S.lost||0)>=tm);
    solo={id:r.id,me,op:o,row:r,opp,dk:r.do_kho,md:r.che_do,prevDiff:diff,sent:'',last:0};
    diff=r.do_kho; midRun=true; refreshNotices();
    S=coSnap?snap.S:{day:ngay,money:dt,rep:5-tm,upg:{},total:dt,lost:tm,bought:0};
    S.lost=S.lost||0; D=mkD(coSnap?snap.D:null); REC=coSnap&&snap.rec?snap.rec:null; rec('Y');
    const {data:fresh}=await sb.rpc('cap_nhat_solo',{p_id:r.id,p_ngay:Math.min(SOLO_NGAY,S.day),p_doanh_thu:S.total,p_tim_mat:Math.min(5,S.lost),p_xong:false});
    if(!solo||solo.id!==r.id) return;
    if(fresh){ solo.row=fresh; if(fresh.trang_thai==='xong') return soloEnd(fresh) }
    solo.ping=setInterval(()=>soloPush(true),4000);
    solo.chk=setInterval(async()=>{if(!solo)return;const id=solo.id;const {data}=await sb.rpc('kiem_tra_solo',{p_id:id});if(data&&solo&&solo.id===id)soloUpdate(data)},10000);
    const xong=solo.row[me+'_xong'], phase=coSnap?snap.phase:'day';
    saveRun(xong?'wait':phase);
    const go=()=>{ clearInterval(cd); if(!solo||solo.id!==r.id) return;
      if(solo.row[solo.me+'_xong']) return soloFinish('Bạn đã bán xong.');
      if(phase==='shop') return soloShop();
      sfx.cash(true); if(coSnap&&snap.D&&D.t>1) resumeDay(); else startDay() };
    openOv(`<div class="eyebrow">Solo · ${DIFF[solo.dk].n} · ${CHE_DO[solo.md].n}</div>
      <h2>Đang vào lại trận solo</h2>
      ${vsHTML(opp)}
      <div class="sum"><span>Ngày của bạn</span><b>${S.day}/${SOLO_NGAY}</b><span>Doanh thu đã có</span><b>${S.total}k</b><span>Tim đã mất</span><b>${S.lost}</b><span>ĐBK hiện tại</span><b>${diemSolo(solo.dk,S.total,Math.min(5,S.lost))}</b></div>
      <p class="muted" id="oppNow">${oppLine()}</p>
      <p class="muted">${xong?'Bạn đã bán xong, chỉ còn chờ đối thủ.':coSnap?`Trang vừa tải lại. Quán của bạn được giữ nguyên: ${phase==='shop'?'đang ở cửa hàng cuối ngày':`còn ${Math.ceil(D.t)} giây của ngày ${S.day}`}, nâng cấp và tiền trong két.`
        :`Trang vừa tải lại trên máy khác nên ngày đang bán dở được mở lại từ đầu, giữ nguyên doanh thu và số tim. Nâng cấp không mang theo được, két được trả đủ ${S.total}k để mua lại.`}</p>
      <div class="col grow"><button class="btn" id="rejoin">${xong?'Xem trận':'Vào lại ngay · 3'}</button></div>`);
    let k=3; const cd=setInterval(()=>{k--;const b=$('rejoin');if(!b||!solo){clearInterval(cd);return} if(k<=0)go(); else if(!xong) b.textContent='Vào lại ngay · '+k},1000);
    $('rejoin').onclick=go;
  } finally { resuming=null }
}

/* ---- tìm người chơi ---- */
const lbPeople=new Map();
async function searchPlayers(q){
  const body=$('lbBody'); if(!body) return;
  body.innerHTML='<div class="empty-state">Đang tìm…</div>';
  const {data,error}=await sb.rpc('tim_nguoi_choi',{p_q:q});
  if(!$('q')||$('q').value.trim()!==q) return;
  if(error){body.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;return}
  if(!data||!data.length){body.innerHTML='<div class="empty-state">Không thấy ai có tên hoặc lớp này.</div>';return}
  const rows=[...data].sort((a,b)=>onlineSet.has(b.id)-onlineSet.has(a.id));
  rows.forEach(p=>lbPeople.set(p.id,p));
  body.innerHTML=`<div class="list">${rows.map(p=>`<div class="li" data-prof="${p.id}" role="button" tabindex="0" aria-label="Xem hồ sơ ${esc(p.ten)}"><span>${avatarHTML(p.avatar_url,p.ten,34)}</span>
    <span class="nm"><span class="dot" data-online="${p.id}" ${onlineSet.has(p.id)?'':'hidden'}></span>${esc(p.ten)} ${stBadge(p.id)}<span class="sb">${esc(p.lop)} · ${esc(p.khoa)} · Elo ${p.elo}</span></span>
    <button type="button" class="act" data-uid="${p.id}">Thách đấu</button></div>`).join('')}</div>
    <p class="muted"><span class="dot"></span>đang mở game · bấm tên để xem hồ sơ · <span class="st-badge">Đang solo</span> thì bấm "Xem trận" để xem trực tiếp</p>`;
  body.querySelectorAll('[data-prof]').forEach(el=>el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.click()}});
  applyPresence();
}
