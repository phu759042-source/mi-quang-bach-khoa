/* Mì Quảng Bách Khoa · js/man-hinh.js: Màn chính, cửa hàng, liên hệ, ủng hộ, bảng xếp hạng, điều khiển, giao diện sáng/tối.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Màn hình chính ================= */
function home(){
  nhoMan(null);
  setTimeout(syncPresence,0);
  setTimeout(refreshNotices,0); setTimeout(pushCard,0); setTimeout(duyetCard,0);
  const p=profile;
  const meCard=ranked&&p
    ?`<button type="button" class="me has-av me-btn" id="edit" aria-label="${tl('Sửa hồ sơ: tên, lớp, khoa, avatar','Edit profile: name, class, faculty, avatar')}"><span class="me-av-w">${avatarHTML(p.avatar_url,p.ten,48,'me-av')}<span class="me-pen" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></span></span><span class="nm">${esc(p.ten)}</span><span class="sub">${lopKhoaHTML(p)} · Elo ${p.elo??1200} ${eloTitle(p.elo,1)}</span>
       <span class="pts">${hangLogo(p.diem,34)}${p.diem}<small>${hangDBK(p.diem).n} · ${tl('ĐBK','BKP')}${myRank?` · ${tl('hạng','rank')} #${myRank}`:''}</small></span></button>`
    :`<div class="me"><div class="nm">${tl('Đang chơi thử','Trial mode')}</div><div class="sub">${tl('Không tính điểm','No points')}${guestBest.day?` · ${tl('kỷ lục ngày','best: day')} ${guestBest.day}`:''}</div>
       <div class="pts">—<small>${tl('ĐBK','BKP')}</small></div></div>${thuHTML()}`;
  const pill=streakPill();
  openOv(`<div class="split"><div class="split-a">
  <img class="hero-icon desk" src="icons/favicon.svg" alt="" width="88" height="88">
  <div class="home-top"><div class="eyebrow">${tl('Lấy cảm hứng từ Mì Quảng Bích · 1-3 Đặng Dung, Hòa Khánh Bắc','Inspired by Mì Quảng Bích · 1-3 Dang Dung, Hoa Khanh Bac')}</div><div class="top-act">${langHTML()}${ranked?chuongHTML():''}</div></div>
  <h1>${TEN_H1}</h1>
  ${meCard}
  ${pill}
  ${ranked?`${canhCaoCardHTML()}<div id="duyetSlot"></div><div id="pushSlot"></div>`:''}
  <ol class="steps desk">${tl('<li>Bấm <b>Mì</b>, thêm đúng topping khách gọi</li><li>Bấm <b>Chan nước lèo</b>, rồi bấm vào khách</li><li>Đủ doanh thu mỗi ngày để giữ mặt bằng. Chốt sổ lúc nào cũng được</li><li>Hết bàn thì khách xếp hàng. Để khách chờ lâu là mất tim, nhất là giờ cao điểm</li>','<li>Tap <b>Noodles</b>, then add exactly the toppings the customer ordered</li><li>Tap <b>Add broth</b>, then click the customer</li><li>Earn enough each day to pay the rent. You can cash out any time</li><li>When tables are full, customers queue. Keep them waiting too long and you lose hearts, especially at rush hour</li>')}</ol>
  <p class="muted desk keys">${tl('Chơi bằng bàn phím: <kbd>1</kbd>–<kbd>8</kbd> chọn món, <kbd>Space</kbd> chan nước lèo, <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> bưng cho bàn 1–4, <kbd>X</kbd> đổ bỏ.','Keyboard: <kbd>1</kbd>–<kbd>8</kbd> pick items, <kbd>Space</kbd> add broth, <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> serve tables 1–4, <kbd>X</kbd> dump.')}</p>
  </div><div class="split-b">
  <div class="col"><div class="eyebrow">${tl('Chọn độ khó','Difficulty')}</div>
    <div class="diffs" id="diffs">${Object.entries(DIFF).map(([k,v])=>`<button class="diff d-${k}${khoaMemKho(k)?' mem':''}" data-d="${k}" aria-pressed="${k===diff}">
      <b>${v.n}</b><span class="x">×${v.hs}</span><small>${tl(`Phạt ${phat(k)}/tim`,`−${phat(k)}/heart`)}</small></button>`).join('')}</div>
    <p class="muted" id="dd"></p></div>
  <ol class="steps mob">${tl('<li>Bấm <b>Mì</b>, thêm đúng topping khách gọi</li><li>Bấm <b>Chan nước lèo</b>, rồi chạm vào khách</li><li>Đủ doanh thu mỗi ngày để giữ mặt bằng. Chốt sổ lúc nào cũng được</li><li>Hết bàn thì khách xếp hàng. Để khách chờ lâu là mất tim</li>','<li>Tap <b>Noodles</b>, then add exactly the toppings ordered</li><li>Tap <b>Add broth</b>, then tap the customer</li><li>Earn enough each day to pay the rent. Cash out any time</li><li>When tables are full, customers queue. Long waits cost hearts</li>')}</ol>
  <div class="msg" id="msg"></div>
  <div class="col grow">
    <button class="btn" id="go">${ranked?tl('Mở quán','Open the shop'):tl('Mở quán (chơi thử)','Open the shop (trial)')}</button>
    ${ranked?`<button class="btn warm" id="solo">${tl('Solo · thách đấu bạn bè','Solo · challenge friends')}</button>`:''}
    <button class="btn ghost" id="lb">${tl('Bảng xếp hạng','Leaderboard')}</button>
    ${ranked?`<button class="btn ghost" id="hoso">${tl('Ván đấu &amp; thống kê','Matches &amp; stats')}</button><button class="btn ghost" id="banbe">${tl('Bạn bè','Friends')} <span class="bb-so" data-bb-badge="lm" hidden></span></button><button class="btn ghost" id="tinnhan">${tl('Tin nhắn','Messages')} <span class="bb-so" data-tc-badge hidden></span></button>${qtNutHTML()}`:''}
    <div class="row">${ranked?`<button class="link" id="out">${tl('Đăng xuất','Sign out')}</button>`
      :`<button class="link" id="login">${tl('Đăng ký / đăng nhập để tính điểm','Sign up / sign in to earn points')}</button>`}</div>
    <div class="row"><button class="link" id="contact">${tl('Liên hệ người làm game','Contact the developer')}</button><button class="link" id="donate">${tl('Ủng hộ game','Support the game')}</button></div>
    <div class="row"><button class="link" id="vegame">${tl('Về game &amp; chính sách dữ liệu','About &amp; data policy')}</button></div>
    <div class="row" style="align-items:center;gap:12px">${themeHTML()}${soundBtn(true)}</div>
    <div class="muted">${tl('Phiên bản','Version')} ${PHIEN_BAN}</div>
  </div></div></div>`);
  const desc=()=>{$('dd').textContent=diff==='thuong'?tl('Khách kiên nhẫn, mục tiêu vừa phải. Phạt nhẹ khi mất tim.','Patient customers, moderate targets. Light penalty for lost hearts.')
    :diff==='kho'?tl('Khách vội hơn, gọi nhiều món hơn. Điểm thưởng ×1.5, phạt gấp đôi.','Customers hurry more and order more. ×1.5 bonus, double penalty.')
    :diff==='dianguc'?tl('Khách cực vội, tô nhiều topping. Thưởng ×2.2, nhưng mất 5 tim là bị trừ 363 điểm.','Customers in a rush, lots of toppings. ×2.2 bonus, but losing 5 hearts costs 363 points.')
    :tl('Mức cao nhất. Khách vội nhất, gần như tô nào cũng 4 món, hàng chờ ngắn. Thưởng ×3, mất 5 tim bị trừ 675 điểm.','The top level. Most hurried customers, almost every bowl has 4 items, short queue. ×3 bonus, losing 5 hearts costs 675 points.')};
  desc();
  $('diffs').onclick=e=>{const b=e.target.closest('.diff');if(!b)return;
    if(b.classList.contains('mem')&&!b.dataset.hoi&&b.dataset.d!==diff){$('diffs').querySelectorAll('[data-hoi]').forEach(x=>delete x.dataset.hoi);b.dataset.hoi=1;
      $('dd').innerHTML=tl(`<b>Mới chơi thì nên bắt đầu ở mức Thường.</b> Mức ${DIFF[b.dataset.d].n} khách rất vội, mất 5 tim bị trừ ${Math.round(75*DIFF[b.dataset.d].hs**2)} ĐBK. Bấm lần nữa nếu vẫn muốn chọn.`,`<b>New players should start on Normal.</b> On ${DIFF[b.dataset.d].n} customers are in a big hurry and losing 5 hearts costs ${Math.round(75*DIFF[b.dataset.d].hs**2)} BKP. Tap again to choose it anyway.`);return}
    diff=b.dataset.d;try{localStorage.setItem('mqbk-diff',diff)}catch(e){}
    $('diffs').querySelectorAll('.diff').forEach(x=>x.setAttribute('aria-pressed',x.dataset.d===diff));desc()};
  $('go').onclick=startRun;
  $('lb').onclick=()=>leaderboard('sv');
  if(ranked){$('solo').onclick=()=>leaderboard('solo',true);$('hoso').onclick=()=>hoSoScreen('stats',null,home);
    $('banbe').onclick=()=>banBeScreen(bbSoLoiMoi()?'loi_moi':'ban',home);$('chuong').onclick=()=>thongBaoScreen(home);bbVe()}
  if($('tinnhan')){$('tinnhan').onclick=()=>tinNhanScreen(home);tcVeSo();tcDoi()}
  if($('quantri')){$('quantri').onclick=()=>quanTriScreen(home);qtDem()}
  $('contact').onclick=()=>contactScreen(home);
  $('donate').onclick=()=>donateScreen(home);
  $('vegame').onclick=()=>veGameScreen(home);
  if(ranked){$('edit').onclick=profileScreen;$('out').onclick=logout}else $('login').onclick=()=>sb?authScreen():toast(tl('Không kết nối được máy chủ','Cannot reach the server'));
}
async function startRun(){
  if(ranked){
    const msg=$('msg'); if(msg){msg.className='msg ok';msg.textContent=tl('Đang mở quán…','Opening the shop…')}
    if(!(await flushPending())){ if(msg){msg.className='msg';msg.textContent=tl('Còn một kết quả chưa nộp được do mạng. Kiểm tra mạng rồi bấm Mở quán lại.','A previous result has not been submitted yet. Check your connection and tap Open again.')} return }
    const {data,error}=await rpcRetry('bat_dau_luot',{p_do_kho:diff},3);
    if(error){ if(msg){msg.className='msg';msg.textContent=error.message} else toast(error.message); return }
    runId=data;
  }
  newGame();
}

/* ================= Cửa hàng cuối ngày ================= */
function showShop(){
  const ev=EVENTS[S.day%4], hs=DIFF[diff].hs, lost=S.lost||0;
  const now=Math.round(S.total*hs/10)-Math.round(lost*15*hs**2);
  openOv(`<div class="eyebrow">${tl('Đóng quán','Closed')} · ${tl('Ngày','Day')} ${S.day} · ${DIFF[diff].n}</div><h2>${tl('Hết một ngày bán','End of the day')}</h2>
  <div class="sum"><span>${tl('Doanh thu hôm nay','Revenue today')}</span><b>${D.earned}k</b>${solo?'':`<span>${tl('Mục tiêu','Target')}</span><b>${target(S.day)}k</b>`}
  <span>${tl('Tô đã bán','Bowls sold')}</span><b>${D.served}</b><span>${tl('Khách bỏ về','Customers lost')}</span><b>${D.lost}</b><span>${tl('Tiền trong két','Money in the till')}</span><b id="ket">${S.money}k</b>
  <span>${solo?tl('ĐBK của bạn','Your BKP'):tl('Nếu chốt sổ bây giờ','If you cash out now')}</span><b style="color:${now>=0?'var(--leaf)':'var(--chili)'}">${now>=0?'+':''}${now} ${tl('ĐBK','BKP')}</b></div>
  <div id="hrWrap">${heartRow()}</div>
  <div class="eyebrow">${tl('Nâng cấp quán','Upgrades')}</div><p class="muted" style="margin-top:-8px">${tl('Tiền mua nâng cấp lấy từ két, không làm giảm doanh thu tính điểm.','Upgrades are paid from the till and do not reduce the revenue that counts for points.')}</p><div class="col" id="shop"></div>
  <p class="muted">${tl('Ngày mai','Tomorrow')}: <b>${ev.n}</b>. ${ev.d} ${solo?'':tl(`Mục tiêu ${target(S.day+1)}k.`,`Target ${target(S.day+1)}k.`)}</p>
  <div class="col grow"><button class="btn" id="next">${tl(`Mở quán ngày ${S.day+1}`,`Open day ${S.day+1}`)}</button>
  <button class="btn ghost" id="cash">${tl('Chốt sổ, nghỉ bán','Cash out and stop')}</button></div>`);
  drawShop();
  const bindHeart=()=>{$('buyHeart').onclick=()=>{if(buyHeart()){$('hrWrap').innerHTML=heartRow();$('ket').textContent=S.money+'k';drawShop();bindHeart()}}};
  bindHeart();
  $('next').onclick=()=>{S.day++;startDay()};
  let armed=false;
  $('cash').onclick=e=>{ if(!armed){armed=true;e.target.textContent=tl('Bấm lần nữa để chốt ','Tap again to bank ')+(now>=0?'+':'')+now+tl(' ĐBK',' BKP');return}
    sfx.closeStart(); finishRun(tl('Bạn dừng đúng lúc, giữ lại thành quả.','You stopped at the right time and kept your earnings.'),true) };
  lockButtons($('ov'),800); saveRun('shop');
}
function drawShop(){
  $('shop').innerHTML=UPG.map(u=>{
    const have=lv(u.id), next=u.lv[have], cur=u.lv[have-1], max=u.lv.length;
    const tag=max>1?` <span class="muted">· ${tl('cấp','lvl')} ${have}/${max}</span>`:'';
    if(!next) return `<div class="up"><strong>${cur.n}${tag}</strong><small>${cur.d}</small><button disabled>${tl('Đã có','Owned')}</button></div>`;
    return `<div class="up"><strong>${have?cur.n+' → '+next.n:next.n}${tag}</strong><small>${next.d}</small>
      <button data-u="${u.id}" ${S.money<next.c?'disabled':''}>${next.c}k</button></div>`}).join('');
  $('shop').querySelectorAll('button[data-u]').forEach(b=>b.onclick=()=>{
    const u=UPG.find(x=>x.id===b.dataset.u), next=u.lv[lv(u.id)];
    if(next&&S.money>=next.c){S.money-=next.c;S.upg[u.id]=lv(u.id)+1;rec('B',u.id,lv(u.id));saveRun('shop');$('ket').textContent=S.money+'k';toast(tl('Đã mua ','Bought ')+next.n);drawShop();
      if($('hrWrap')){$('hrWrap').innerHTML=heartRow();$('buyHeart').onclick=()=>{if(buyHeart()){showShop()}}}}});
}

/* ================= Liên hệ ================= */
const CONTACT={ten:'Nguyễn Tấn Phú',lop:tl('26T_ATTT · Công nghệ Thông tin','26T_ATTT · Information Technology'),email:'phu759042@gmail.com',sdt:'0905416772'};
function contactScreen(back){
  nhoMan('lienhe');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Liên hệ','Contact')}</div><button class="link" id="back">${tl('Đóng','Close')}</button></div>
  <h2>${tl('Người làm game','The developer')}</h2>
  <div class="me"><div class="nm">${CONTACT.ten}</div><div class="sub">${tl(`Sinh viên ${CONTACT.lop}, Bách Khoa Đà Nẵng`,`Student, ${CONTACT.lop}, Bach Khoa Da Nang`)}</div><div class="pts"></div></div>
  <p class="muted">${tl('Gặp lỗi, muốn góp ý món mới, hay muốn thêm khoa hoặc sự kiện cho lớp mình? Nhắn mình qua email hoặc số điện thoại dưới đây.','Found a bug, have an idea for a new dish, or want your faculty or class event in the game? Reach me by email or phone below.')}</p>
  <div class="list">
    <div class="li"><span class="rk">Mail</span><span class="nm"><a href="mailto:${CONTACT.email}" style="color:var(--heading)">${CONTACT.email}</a></span><button class="link" data-copy="${CONTACT.email}">${tl('Sao chép','Copy')}</button></div>
    <div class="li"><span class="rk">${tl('SĐT','Phone')}</span><span class="nm"><a href="tel:${CONTACT.sdt}" style="color:var(--heading)">${CONTACT.sdt.replace(/(\d{4})(\d{3})(\d{3})/,'$1 $2 $3')}</a></span><button class="link" data-copy="${CONTACT.sdt}">${tl('Sao chép','Copy')}</button></div>
  </div>
  <button class="btn warm" id="donate">${tl('Ủng hộ game','Support the game')}</button>
  <p class="rule">${tl('Game lấy cảm hứng từ Mì Quảng Bích, 1-3 Đặng Dung, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng. Quán quen của sinh viên Bách Khoa.','Inspired by Mì Quảng Bích, 1-3 Dang Dung, Hoa Khanh Bac, Lien Chieu, Da Nang, a favourite spot of Bach Khoa students.')}</p>`);
  $('back').onclick=back;
  $('donate').onclick=()=>donateScreen(()=>contactScreen(back));
  $('ov').querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    try{await navigator.clipboard.writeText(b.dataset.copy);toast(tl('Đã sao chép','Copied'))}catch(e){toast(b.dataset.copy)}
  });
}

/* ================= Ủng hộ ================= */
function donateScreen(back){
  nhoMan('ungho');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Ủng hộ','Support')}</div><button class="link" id="back">${tl('Đóng','Close')}</button></div>
  <h2>${tl('Mời người làm game một tô mì','Buy the developer a bowl')}</h2>
  <p>${tl('Mì Quảng Bách Khoa miễn phí và sẽ luôn miễn phí. Nếu bạn thấy game vui, có thể ủng hộ để mình trả tiền máy chủ, email và làm thêm tính năng mới.','The game is free and always will be. If you enjoy it, a tip helps pay for the server and email and for new features.')}</p>
  <div class="donate">
    <img src="icons/ung-ho-qr.png" alt="${tl('Mã VietQR chuyển khoản MB Bank cho Nguyễn Tấn Phú, số tài khoản 0905416772','VietQR code for an MB Bank transfer to Nguyen Tan Phu, account 0905416772')}" width="280" height="380">
    <div class="list">
      <div class="li"><span class="rk">${tl('NH','Bank')}</span><span class="nm">MB Bank (${tl('Quân đội','Military Bank')})</span><span></span></div>
      <div class="li"><span class="rk">${tl('Tên','Name')}</span><span class="nm">NGUYEN TAN PHU</span><span></span></div>
      <div class="li"><span class="rk">${tl('STK','Acct')}</span><span class="nm">0905416772</span><button class="link" data-copy="0905416772">${tl('Sao chép','Copy')}</button></div>
      <div class="li"><span class="rk">${tl('ND','Note')}</span><span class="nm">Ung ho Mi Quang BK</span><button class="link" data-copy="Ung ho Mi Quang BK">${tl('Sao chép','Copy')}</button></div>
    </div>
  </div>
  <p class="rule">${tl('Quét mã bằng ứng dụng ngân hàng bất kỳ. Ủng hộ hoàn toàn tự nguyện, số tiền tuỳ bạn, và không đổi ra điểm, tim hay vật phẩm nào trong game. Cảm ơn bạn rất nhiều!','Scan with any Vietnamese banking app. Support is entirely voluntary, any amount, and never buys points, hearts or items in the game. Thank you so much!')}</p>`);
  $('back').onclick=back;
  $('ov').querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    try{await navigator.clipboard.writeText(b.dataset.copy);toast(tl('Đã sao chép','Copied'))}catch(e){toast(b.dataset.copy)}
  });
}

/* ================= Bảng xếp hạng ================= */
// Bộ lọc tab Cá nhân và Solo: 'tat_ca' mọi người · 'sv' sinh viên BKĐN (2.17.0) · 'truong' cùng trường với mình · 'gv' giáo viên (2.22.0)
let lbLoc=(()=>{try{const v=localStorage.getItem('mqbk-loc');return ['sv','truong','gv'].includes(v)?v:'tat_ca'}catch(e){return 'tat_ca'}})();
const LB_LOC=()=>[['tat_ca',tl('Tất cả','Everyone')],['sv',tl('Sinh viên BK','BK students')],...(profile&&profile.truong_id&&profile.truong_id!=='khac'&&!profile.sinh_vien?[['truong',tl('Trường mình','My school')]]:[]),['gv',tl('Giáo viên','Teachers')]];
const locHop=()=>LB_LOC().some(([k])=>k===lbLoc)?lbLoc:'tat_ca';
async function leaderboard(tab,focus){
  nhoMan('bxh',tab);
  const canSolo=ranked&&!!sb;
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${tl('Vinh danh · Học kỳ 1, 2026–2027','Hall of fame · Semester 1, 2026–2027')}</div><button class="link" id="back">${tl('Đóng','Close')}</button></div>
  <h2>${tl('Bảng xếp hạng','Leaderboard')}</h2>
  ${canSolo?`<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    <input id="q" type="search" placeholder="${tl('Tìm bạn theo tên, lớp hoặc trường để solo','Find a player by name, class or school')}" autocomplete="off" enterkeyhint="search" aria-label="${tl('Tìm người chơi để thách đấu','Find a player to challenge')}"></div>`:''}
  <div class="tabs t5" role="tablist">${[['sv',tl('Cá nhân','Players')],['truong',tl('Trường','Schools')],['lop',tl('Lớp','Classes')],['khoa',tl('Khoa','Faculties')],['solo','Solo']].map(([k,n])=>`<button role="tab" data-t="${k}" aria-selected="${k===tab}">${n}</button>`).join('')}</div>
  ${tab==='sv'||tab==='solo'?`<div class="lb-loc" role="group" aria-label="${tl('Lọc người chơi','Filter players')}">${LB_LOC().map(([k,n])=>`<button type="button" data-loc="${k}" aria-pressed="${k===locHop()}">${n}</button>`).join('')}</div>`:''}
  <div class="lb-dem muted" id="lbDem"></div>
  <div class="col" id="lbBody"><div class="empty-state">${tl('Đang tải bảng xếp hạng…','Loading leaderboard…')}</div></div>
  <div class="rule" id="rule"></div>`);
  $('back').onclick=home;
  document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b)leaderboard(b.dataset.t)};
  const loc=document.querySelector('.lb-loc');
  if(loc) loc.onclick=e=>{const b=e.target.closest('[data-loc]');if(!b||b.dataset.loc===lbLoc)return;lbLoc=b.dataset.loc;try{localStorage.setItem('mqbk-loc',lbLoc)}catch(e){}
    loc.querySelectorAll('[data-loc]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.loc===lbLoc));
    const q=$('q'); demBxh(tab); if(q&&q.value.trim()) return; loadBoard(tab,canSolo)};
  const hint=canSolo?tl(' Bấm vào tên một bạn để xem hồ sơ, thách đấu solo, hoặc xem trực tiếp khi bạn ấy đang bán.',' Tap a name to see their profile, challenge them to solo, or watch live while they are selling.'):'';
  const ngoaiBK=`<p style="margin-top:8px">${tl(`Người chơi không phải sinh viên Bách Khoa Đà Nẵng có nhãn tên trường của họ, hoặc ${NGOAI_BK} nếu không đi học: vẫn được xếp hạng cá nhân và solo, nhưng không tính vào bảng Lớp và Khoa. Bộ lọc phía trên xem riêng sinh viên BK, người cùng trường với bạn, hoặc giáo viên (nhãn GV); hạng được tính lại trong nhóm đang xem.`,`Players who are not Bach Khoa Da Nang students carry their school's name, or the ${NGOAI_BK} tag if they are not students: they are ranked in Players and Solo but not counted in Classes and Faculties. The filters above show only BK students, people from your school, or teachers (Teacher tag); ranks are recomputed within the group.`)}</p>`;
  $('rule').innerHTML=tab==='sv'?ruleText()+ngoaiBK+`<p style="margin-top:8px"><b>${tl('Hạng theo tổng ĐBK:','Ranks by total BKP:')}</b></p>${hangBangDBK()}`+(hint?`<p style="margin-top:6px">${hint.trim()}</p>`:''):tab==='lop'
    ?tl('Điểm lớp = tổng ĐBK của 10 bạn cao nhất lớp, chia 10. Lớp chưa đủ 10 người chơi thì phần thiếu tính là 0. Chỉ tính sinh viên Bách Khoa.','Class score = total BKP of the class\'s top 10 players, divided by 10. Missing players count as 0. Bach Khoa students only.')
    :tab==='truong'?tl('Điểm trường = tổng ĐBK của 30 người cao nhất trường (cả sinh viên và giáo viên), chia 30. Trường chưa đủ 30 người chơi thì phần thiếu tính là 0, nên rủ thêm bạn cùng trường vào là điểm trường lên. Chọn trường ở hồ sơ (bấm vào thẻ tên ở màn chính).','School score = total BKP of the school\'s top 30 players (students and teachers), divided by 30. Missing players count as 0, so bring classmates to raise your school. Pick your school in your profile (tap your name card on the home screen).')
    :tab==='khoa'?tl('Điểm khoa = tổng ĐBK của 30 bạn cao nhất khoa, chia 30. Chỉ tính sinh viên Bách Khoa.','Faculty score = total BKP of the faculty\'s top 30 players, divided by 30. Bach Khoa students only.')
    :tl('Elo solo bắt đầu từ 1200. Thắng người Elo cao hơn mình được cộng nhiều, thua người Elo thấp hơn bị trừ nhiều (công thức Elo như cờ vua, K = 32). Ai chưa đấu trận nào đứng ở 1200. Solo không ảnh hưởng ĐBK.','Solo Elo starts at 1200. Beating a higher-rated player gains a lot, losing to a lower-rated one costs a lot (chess Elo formula, K = 32). Players with no matches sit at 1200. Solo does not affect BKP.')+hint+ngoaiBK+`<p style="margin-top:8px"><b>${tl('Danh hiệu theo Elo:','Titles by Elo:')}</b></p>${hangBangElo()}`;
  if(!sb){$('lbBody').innerHTML=`<div class="empty-state">${tl('Không kết nối được máy chủ bảng xếp hạng.','Cannot reach the leaderboard server.')}</div>`;return}
  const lbBack=()=>leaderboard(tab);
  $('lbBody').onclick=e=>{
    const nh=e.target.closest('[data-nhom]'); if(nh){const [l,id,ten]=JSON.parse(nh.dataset.nhom);return nhomScreen(l,id,ten,lbBack)}
    const b=e.target.closest('.act[data-uid]');
    if(b){const p=lbPeople.get(b.dataset.uid); if(!p) return;
      if(onlineSt.get(p.id)==='solo') return watchScreen(p.id,lbBack);
      return challengeScreen(p,lbBack)}
    const el=e.target.closest('[data-prof]'); if(el) hoSoScreen('stats',el.dataset.prof,lbBack)};
  const q=$('q');
  if(q){ if(focus) setTimeout(()=>q.focus(),60);
    let t; q.oninput=()=>{clearTimeout(t); const v=q.value.trim(); t=setTimeout(()=>v?searchPlayers(v):loadBoard(tab,canSolo),300)} }
  loadBoard(tab,canSolo); demBxh(tab);
}
/* Bản 2.25.0: số người trên bảng đang xem */
async function demBxh(tab){
  const el=$('lbDem'); if(!el||!sb) return;
  let d; try{({data:d}=await sb.rpc('so_lieu_bxh',{p_truong:profile?.truong_id||null}))}catch(e){}
  if(!d||!$('lbDem')) return;
  const loc=locHop(), n=x=>`<b>${soVN(x||0)}</b>`;
  $('lbDem').innerHTML=tab==='sv'||tab==='solo'
    ?(loc==='sv'?tl(`${n(d.sinh_vien)} sinh viên Bách Khoa`,`${n(d.sinh_vien)} Bach Khoa students`):loc==='gv'?tl(`${n(d.giao_vien)} giáo viên`,`${n(d.giao_vien)} teachers`)
      :loc==='truong'?tl(`${n(d.truong_minh)} người cùng trường với bạn`,`${n(d.truong_minh)} people from your school`)
      :tab==='solo'?tl(`${n(d.solo)} người chơi · ${n(d.solo_da_dau)} người đã đấu solo`,`${n(d.solo)} players · ${n(d.solo_da_dau)} have played solo`)
      :tl(`${n(d.ca_nhan)} người chơi trên bảng xếp hạng`,`${n(d.ca_nhan)} players on the leaderboard`))
    :tab==='truong'?tl(`${n(d.truong)} trường · bấm vào một trường để xem ai đang chơi`,`${n(d.truong)} schools · tap one to see its players`)
    :tab==='lop'?tl(`${n(d.lop)} lớp · bấm vào một lớp để xem danh sách`,`${n(d.lop)} classes · tap one to see its players`)
    :tl(`${n(d.khoa)} khoa có người chơi · bấm vào một khoa để xem danh sách`,`${n(d.khoa)} faculties with players · tap one to see its players`);
}
/* Bản 2.25.0: bấm một lớp / khoa / trường trên bảng xếp hạng → danh sách người chơi của nhóm đó */
async function nhomScreen(loai,id,ten,back){
  nhoMan('nhom',loai,id,ten);
  const nhan=loai==='lop'?tl('Lớp','Class'):loai==='khoa'?tl('Khoa','Faculty'):tl('Trường','School');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">${nhan}</div><button class="link" id="back">${tl('Đóng','Close')}</button></div>
    <h2>${esc(ten)}</h2><div class="lb-dem muted" id="nhDem"></div><div class="col" id="nhBody"><div class="empty-state">${tl('Đang tải…','Loading…')}</div></div>`);
  $('back').onclick=()=>(back||(()=>leaderboard(loai==='truong'?'truong':loai)))();
  let q=sb.from('bxh_sinh_vien').select('id,ten,lop,khoa,khoa_id,diem,chuoi,avatar_url,sinh_vien,truong_id,truong,giang_vien,bi_ban').order('diem',{ascending:false}).limit(500);
  q=loai==='lop'?q.eq('lop',id).eq('sinh_vien',true):loai==='khoa'?q.eq('khoa_id',id).eq('sinh_vien',true):q.eq('truong_id',id);
  const {data,error}=await q; const body=$('nhBody'); if(!body) return;
  if(error){body.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;return}
  const ds=data||[];
  $('nhDem').innerHTML=tl(`<b>${ds.length}</b> người chơi${loai==='truong'&&ds.some(p=>p.giang_vien)?` · ${ds.filter(p=>p.giang_vien).length} giáo viên`:''}`,`<b>${ds.length}</b> players${loai==='truong'&&ds.some(p=>p.giang_vien)?` · ${ds.filter(p=>p.giang_vien).length} teachers`:''}`);
  if(!ds.length){body.innerHTML=`<div class="empty-state">${tl('Chưa có ai.','Nobody yet.')}</div>`;return}
  body.innerHTML=`<div class="list">${ds.map((p,i)=>`<div class="li${user&&p.id===user.id?' mine':''}" data-prof="${p.id}" role="button" tabindex="0"><span class="rk">#${1+ds.filter(z=>z.diem>p.diem).length}</span>
    <span class="nm with-av">${avatarHTML(p.avatar_url,p.ten,34)}<span>${esc(p.ten)} <span class="sb">${lopKhoaHTML(p,loai==='khoa'?false:p.khoa)}</span></span></span><span class="pt">${hangLogo(p.diem,24)}${p.diem}</span></div>`).join('')}</div>`;
  body.onclick=e=>{const el=e.target.closest('[data-prof]');if(el&&ranked)hoSoScreen('stats',el.dataset.prof,()=>nhomScreen(loai,id,ten,back))};
}
/* lim: số người hiện (mặc định 50). dinhVi: vẽ xong thì cuộn tới dòng của mình (bản 2.26.0) */
async function loadBoard(tab,canSolo,lim=50,dinhVi=false){
  let rows=[],err=null;
  const loc=locHop(), chiSV=loc==='sv', nhoNhom=loc==='truong'||loc==='gv';
  const lay=nhoNhom?1000:lim;   // lọc trường / giáo viên: nhóm nhỏ, tải hết để tính hạng trong nhóm
  const loc2=q=>loc==='sv'?q.eq('sinh_vien',true):loc==='gv'?q.eq('giang_vien',true):loc==='truong'?q.eq('truong_id',profile.truong_id):q;
  if(tab==='sv'){let q=sb.from('bxh_sinh_vien').select('id,ten,lop,khoa,diem,hang,hang_sv,chuoi,avatar_url,sinh_vien,truong_id,truong,giang_vien,bi_ban').order('diem',{ascending:false}).limit(lay);
    q=loc2(q);
    ({data:rows,error:err}=await q); if(rows&&chiSV) rows=rows.map(r=>({...r,hang:r.hang_sv}));
    else if(rows&&loc!=='tat_ca') rows=rows.map(r=>({...r,hang:1+rows.filter(z=>z.diem>r.diem).length}));
    if(rows) rows=rows.slice(0,lim)}
  else if(tab==='truong'){({data:rows,error:err}=await sb.from('bxh_truong').select('truong_id,ten,ten_ngan,tinh,so_nguoi,so_gv,diem,hang').order('hang').limit(100))}
  else if(tab==='lop'){({data:rows,error:err}=await sb.from('bxh_lop').select('lop,khoa_id,so_nguoi,diem,hang').order('hang').limit(Math.max(lim,50)))}
  else if(tab==='khoa'){({data:rows,error:err}=await sb.from('bxh_khoa').select('khoa_id,khoa,so_nguoi,diem,hang').order('hang'))}
  let soloToi=null;
  if(tab==='solo'){let q=sb.from('profiles').select('id,ten,lop,khoa_id,sinh_vien,truong_id,giang_vien,bi_ban,diem,elo,solo_thang,solo_thua,solo_hoa,avatar_url').order('elo',{ascending:false}).limit(1000);
    q=loc2(q);
    ({data:rows,error:err}=await q);
    if(rows){const all=rows, tr=x=>x.solo_thang+x.solo_thua+x.solo_hoa;
      all.sort((x,y)=>y.elo-x.elo||tr(y)-tr(x)||y.diem-x.diem);
      const hg=x=>({...x,khoa:khoaTen(x.khoa_id),hang:1+all.filter(z=>z.elo>x.elo).length});
      const toi=user&&all.find(x=>x.id===user.id); if(toi) soloToi=hg(toi);
      rows=all.slice(0,lim).map(hg)}}
  const body=$('lbBody'); if(!body||($('q')&&$('q').value.trim())||(loc!==locHop())) return;
  if(err){body.innerHTML=`<div class="empty-state">${tl('Không tải được','Could not load')}: ${esc(err.message)}</div>`;return}
  rows=rows||[];
  const chuoiTxt=c=>c>0?` · ${tl(`${c} ngày liên tiếp`,`${c}-day streak`)}`:'';
  const svRow=r=>({rk:r.hang,nm:r.ten,sbH:`${lopKhoaHTML(r,r.khoa)}${chuoiTxt(r.chuoi)}`,pt:r.diem,logo:hangLogo(r.diem,24),mine:user&&r.id===user.id,av:r.avatar_url,hasAv:true,uid:r.id,p:{id:r.id,ten:r.ten,lop:r.lop,avatar_url:r.avatar_url}});
  const soloRow=r=>({rk:r.hang,nm:r.ten,sbH:`${lopKhoaHTML(r,false)} · ${r.solo_thang+r.solo_thua+r.solo_hoa?tl(`${r.solo_thang} thắng ${r.solo_thua} thua${r.solo_hoa?` ${r.solo_hoa} hoà`:''}`,`${r.solo_thang}W ${r.solo_thua}L${r.solo_hoa?` ${r.solo_hoa}D`:''}`):tl('chưa đấu trận nào','no matches yet')}`,pt:r.elo,nmH:tenElo(r.ten,r.elo),tag:eloTitle(r.elo),mine:user&&r.id===user.id,av:r.avatar_url,hasAv:true,uid:r.id,p:{id:r.id,ten:r.ten,lop:r.lop,avatar_url:r.avatar_url,elo:r.elo}});
  const norm=rows.map(r=>tab==='sv'?svRow(r)
    :tab==='lop'?{nhom:['lop',r.lop,r.lop],rk:r.hang,nm:r.lop,sb:`${khoaTen(r.khoa_id)} · ${r.so_nguoi} ${tl('người chơi','players')}`,pt:r.diem,mine:profile&&r.lop===profile.lop}
    :tab==='truong'?{nhom:['truong',r.truong_id,r.ten_ngan],rk:r.hang,nm:r.ten_ngan,sb:`${r.tinh} · ${r.so_nguoi} ${tl('người chơi','players')}${r.so_gv?tl(`, ${r.so_gv} giáo viên`,`, ${r.so_gv} teacher${r.so_gv>1?'s':''}`):''}`,pt:r.diem,mine:profile&&r.truong_id===profile.truong_id}
    :tab==='khoa'?{nhom:['khoa',r.khoa_id,tKhoa(r.khoa)],rk:r.hang,nm:tKhoa(r.khoa),sb:`${r.so_nguoi} ${tl('người chơi','players')}`,pt:r.diem,mine:profile&&r.khoa_id===profile.khoa_id}
    :soloRow(r));
  norm.forEach(r=>{if(r.p)lbPeople.set(r.uid,r.p)});
  if(!norm.length){body.innerHTML=tab==='solo'
    ?`<div class="empty-state">${tl('Chưa có trận solo nào.','No solo matches yet.')}${canSolo?tl(' Tìm một bạn ở ô phía trên và thách đấu để mở màn.',' Find someone above and challenge them first.'):tl(' Đăng nhập để thách đấu bạn bè.',' Sign in to challenge friends.')}</div>`
    :`<div class="empty-state">${tl(`Chưa có ai trên bảng. Chơi một lượt để ghi tên ${tab==='lop'?'lớp bạn':tab==='truong'?'trường bạn':'mình'} đầu tiên.`,`Nobody here yet. Play a run to put ${tab==='lop'?'your class':tab==='truong'?'your school':'yourself'} first.`)}</div>`;return}
  const tap=r=>r.nhom?` data-nhom="${esc(JSON.stringify(r.nhom))}" role="button" tabindex="0" aria-label="${tl('Xem danh sách','View members:')} ${esc(r.nm)}"`:canSolo&&r.uid?` data-prof="${r.uid}" role="button" tabindex="0" aria-label="${tl('Xem hồ sơ','View profile:')} ${esc(r.nm)}"`:'';
  const dot=r=>r.uid?`<span class="dot" data-online="${r.uid}" ${onlineSet.has(r.uid)?'':'hidden'}></span>`:'';
  const stb=r=>r.uid&&!r.mine?stBadge(r.uid):'';
  const liHTML=(r,toi)=>`<div class="li${r.mine?' mine':''}"${toi?'':(r.mine?' data-toi-dong':'')+tap(r)}><span class="rk">#${r.rk}</span><span class="nm${r.hasAv?' with-av':''}">${r.hasAv?avatarHTML(r.av,r.nm,34):''}<span>${dot(r)}${r.nmH||esc(r.nm)} ${stb(r)}<span class="sb">${r.tag?r.tag+' · ':''}${r.sbH??esc(r.sb)}</span></span></span><span class="pt">${r.logo||''}${r.pt}</span></div>`;
  const top=norm.slice(0,3), rest=norm.slice(3);
  const pod=(r,i)=>r?`<div class="pod r${i+1}${r.mine?' mine':''}"${r.mine?' data-toi-dong':''}${tap(r)}>${r.hasAv?avatarHTML(r.av,r.nm,i===0?60:46,'pod-av'):''}<div class="rk">${r.rk}</div><div class="nm">${dot(r)}${r.nmH||esc(r.nm)}</div>${stb(r)}<div class="sb">${r.tag?r.tag+' · ':''}${r.sbH??esc(r.sb)}</div><div class="pt">${r.logo||''}${r.pt}</div></div>`:'<div></div>';
  let html=`<div class="podium">${pod(top[1],1)}${pod(top[0],0)}${pod(top[2],2)}</div>`;
  if(rest.length) html+=`<div class="list">${rest.map(r=>liHTML(r)).join('')}</div>`;
  // Thanh "vị trí của tôi" dính ở chân màn + nút định vị
  let toi=norm.find(r=>r.mine)||null;
  if(!toi&&ranked&&profile&&user){
    if(tab==='sv'){let rk=loc==='tat_ca'?myRank:null;
      if(chiSV&&laSV(profile)) rk=(await sb.from('bxh_sinh_vien').select('hang_sv').eq('id',user.id).maybeSingle()).data?.hang_sv??null;
      if(rk) toi={...svRow({...profile,khoa:khoaTen(profile.khoa_id),hang:rk}),xa:true}}
    else if(tab==='solo'&&soloToi) toi={...soloRow(soloToi),xa:true};
  }
  if(toi) html+=`<div class="lb-toi" id="lbToi"><div class="lb-toi-in">${liHTML(toi,true)}<button type="button" class="lb-dv" id="lbDinhVi" aria-label="${tl('Định vị: nhảy tới chỗ của bạn trên bảng','Locate: jump to your row')}" title="${tl('Định vị','Locate me')}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg><span>${tl('Định vị','Locate')}</span></button></div></div>`;
  if(!body.isConnected||loc!==locHop()||($('q')&&$('q').value.trim())) return;
  body.innerHTML=html;
  body.querySelectorAll('[data-prof][role=button],[data-nhom][role=button]').forEach(el=>el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}});
  const dong=body.querySelector('[data-toi-dong]'), bar=$('lbToi');
  const nhay=el=>{el.scrollIntoView({block:'center',behavior:dinhVi?'auto':'smooth'});el.classList.remove('nhay');void el.offsetWidth;el.classList.add('nhay');setTimeout(()=>el.classList.remove('nhay'),1800)};
  if(bar){
    $('lbDinhVi').onclick=e=>{e.stopPropagation();
      const d=body.querySelector('[data-toi-dong]'); if(d) return nhay(d);
      if(toi.rk&&toi.rk<=1000){const b=$('lbDinhVi');b.disabled=true;b.querySelector('span').textContent=tl('Đang tải…','Loading…');loadBoard(tab,canSolo,Math.min(1000,toi.rk+10),true)}
      else toast(tl('Bạn ở ngoài top 1000','You are outside the top 1000'))};
    if(dong&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(!bar.isConnected)return io.disconnect();bar.classList.toggle('an',es[0].isIntersecting)});io.observe(dong)}
  }
  if(dinhVi&&dong) requestAnimationFrame(()=>nhay(dong));
}
function ruleText(){
  return `${tl('<b>Cách tính ĐBK mỗi lượt:</b> doanh thu × hệ số ÷ 10, trừ số tim mất × mức phạt. Bỏ dở lượt giữa chừng tính như mất cả 5 tim.','<b>BKP per run:</b> revenue × multiplier ÷ 10, minus hearts lost × penalty. Abandoning a run counts as losing all 5 hearts.')}
  <div style="overflow-x:auto;margin-top:6px"><table class="tb"><tr><th>${tl('Độ khó','Difficulty')}</th><th>${tl('Hệ số','Multiplier')}</th><th>${tl('Phạt/tim','Penalty/heart')}</th><th>${tl('Mất 5 tim','5 hearts lost')}</th></tr>
  ${Object.entries(DIFF).map(([k,v])=>`<tr><td>${v.n}</td><td>×${v.hs}</td><td>−${phat(k)}</td><td>−${Math.round(5*15*v.hs**2)}</td></tr>`).join('')}</table></div>`;
}

/* ================= Hiệu ứng ================= */
let toastT;
function toast(m){document.querySelectorAll('.toast').forEach(t=>t.remove());const t=document.createElement('div');t.className='toast';t.textContent=m;$('app').appendChild(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),1400)}
function floatText(el,txt,col){if(!el)return;const r=el.getBoundingClientRect(),a=$('app').getBoundingClientRect();
  const f=document.createElement('div');f.className='float';f.textContent=txt;f.style.color=col;
  f.style.left=(r.left-a.left+r.width/2-24)+'px';f.style.top=(r.top-a.top+20)+'px';$('app').appendChild(f);setTimeout(()=>f.remove(),1000)}

/* ================= Điều khiển ================= */
$('pad').addEventListener('click',e=>{const b=e.target.closest('.ing');if(!b||!running)return;const k=b.dataset.k,it=D.bowl.items;
  if(D.bowl.broth){toast(tl('Đã chan nước, đổ bỏ để làm lại','Broth already added, dump the bowl to redo'));return}
  if(k!=='mi'&&!it.has('mi')){toast(tl('Cho mì vào trước đã','Add the noodles first'));return}
  if(it.has(k)){if(k==='mi'&&it.size>1){toast(tl('Bỏ topping trước khi bỏ mì','Remove toppings before the noodles'));return}it.delete(k);rec('R',recIng(k));sfx.remove()}else{it.add(k);rec('A',recIng(k));sfx.add(k)}
  renderBowl();renderPad()});
$('pour').onclick=()=>{if(!running||!D.bowl.items.has('mi')||D.bowl.broth)return;D.bowl.broth=true;rec('P');sfx.pour();renderBowl();autoServe()};
$('trash').onclick=()=>{if(running){rec('X');resetBowl()}};
$('tables').addEventListener('click',e=>{const c=e.target.closest('.cust[data-i]');if(c)serve(+c.dataset.i)});
document.addEventListener('keydown',e=>{
  if(!running||e.ctrlKey||e.metaKey||e.altKey||/input|select|textarea/i.test(e.target.tagName)) return;
  const k=e.key.toLowerCase(), keys=Object.keys(ING);
  if(/^[1-8]$/.test(k)){e.preventDefault();$('pad').querySelector(`[data-k="${keys[+k-1]}"]`)?.click()}
  else if(k===' '||k==='spacebar'){e.preventDefault();$('pour').click()}
  else if('qwer'.includes(k)&&k.length===1){e.preventDefault();serve('qwer'.indexOf(k))}
  else if(k==='x'||k==='backspace'){e.preventDefault();$('trash').click()}
});
$('tables').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const c=e.target.closest('.cust[data-i]');if(c){e.preventDefault();serve(+c.dataset.i)}}});
window.addEventListener('beforeunload',e=>{if(solo||(ranked&&runId&&!submitting)){e.preventDefault();e.returnValue=''}});

/* ================= Kéo xuống để tải lại (chỉ khi không đang trong lượt chơi) ================= */
(function pullToRefresh(){
  const ov=$('ov'), ind=$('ptr'), PULL=80;
  let y0=null, dy=0;
  const setInd=(d)=>{const t=Math.min(d,110);ind.style.transform=`translateY(${t*.6-8}px)`;ind.style.opacity=Math.min(1,d/PULL);ind.classList.toggle('ready',d>=PULL)};
  // Ngón tay bắt đầu trong một khung cuộn riêng (danh sách diễn biến, bảng...) thì đó là cuộn khung, không phải kéo tải lại
  const trongKhungCuon=el=>{for(;el&&el!==ov;el=el.parentElement){const o=getComputedStyle(el).overflowY;if((o==='auto'||o==='scroll')&&el.scrollHeight>el.clientHeight+1)return true}return false};
  const reset=()=>{y0=null;dy=0;ind.style.transition='transform .2s, opacity .2s';setInd(0);setTimeout(()=>ind.style.transition='',220)};
  ov.addEventListener('touchstart',e=>{
    if(midRun||running||submitting||ov.scrollTop>0||e.touches.length!==1||$('xStage')||trongKhungCuon(e.target)){y0=null;return}
    y0=e.touches[0].clientY; dy=0; ind.style.transition='';
  },{passive:true});
  ov.addEventListener('touchmove',e=>{
    if(y0==null) return;
    if(ov.scrollTop>0){reset();return}
    dy=Math.max(0,(e.touches[0].clientY-y0)*.55); setInd(dy);
  },{passive:true});
  ov.addEventListener('touchend',()=>{
    if(y0==null) return;
    if(dy>=PULL&&!midRun&&!running){ind.classList.remove('ready');ind.classList.add('spin');ind.style.transform='translateY(40px)';ind.style.opacity=1;setTimeout(()=>location.reload(),150)}
    else reset();
  });
  ov.addEventListener('touchcancel',reset);
})();

/* ================= Giao diện sáng / tối ================= */
let theme='auto';
try{theme=localStorage.getItem('mqbk-theme')||'auto'}catch(e){}
function applyTheme(t){
  theme=t; const r=document.documentElement;
  if(t==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',t);
  try{localStorage.setItem('mqbk-theme',t)}catch(e){}
  const dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]').setAttribute('content',dark?'#11161F':'#1B3A6B');
  document.querySelectorAll('.theme button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===theme));
}
const themeHTML=()=>`<div class="theme" role="group" aria-label="${tl('Giao diện','Theme')}"><span>${tl('Giao diện','Theme')}</span>${[['light',tl('Sáng','Light')],['dark',tl('Tối','Dark')],['auto',tl('Theo máy','Auto')]].map(([k,n])=>`<button type="button" data-t="${k}" aria-pressed="${k===theme}">${n}</button>`).join('')}</div>`;
document.addEventListener('click',e=>{const b=e.target.closest('.theme button');if(b)applyTheme(b.dataset.t)});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(theme==='auto')applyTheme('auto')})}catch(e){}

/* Bản 2.23.0: lượt chơi bị server đánh dấu (bản ghi không khớp kết quả nộp, hoặc thiếu bản ghi) thì người đó
   tạm ẩn khỏi bảng xếp hạng chờ chủ game duyệt; báo cho chính người chơi biết trên màn chính. */
async function duyetCard(){
  const slot=$('duyetSlot'); if(!slot||!sb||!user) return;
  try{const {data,error}=await sb.rpc('bi_an_bxh',{p_uid:user.id}); if(error||data!==true||!$('duyetSlot')) return;
    $('duyetSlot').innerHTML=`<p class="msg">${tl('Một vài lượt chơi của bạn đang chờ kiểm tra nên bạn tạm thời không hiện trên bảng xếp hạng. Nếu bạn nghĩ đây là nhầm lẫn, hãy nhắn người làm game ở mục Liên hệ.','Some of your runs are being reviewed, so you are hidden from the leaderboard for now. If you think this is a mistake, message the developer from Contact.')}</p>`;
  }catch(e){}
}
