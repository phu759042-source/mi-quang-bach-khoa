/* Mì Quảng Bách Khoa · js/man-hinh.js: Màn chính, cửa hàng, liên hệ, ủng hộ, bảng xếp hạng, điều khiển, giao diện sáng/tối.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Màn hình chính ================= */
function home(){
  nhoMan(null);
  setTimeout(syncPresence,0);
  setTimeout(refreshNotices,0); setTimeout(pushCard,0);
  const p=profile;
  const meCard=ranked&&p
    ?`<button type="button" class="me has-av me-btn" id="edit" aria-label="Sửa hồ sơ: tên, lớp, khoa, avatar"><span class="me-av-w">${avatarHTML(p.avatar_url,p.ten,48,'me-av')}<span class="me-pen" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></span></span><span class="nm">${esc(p.ten)}</span><span class="sub">${esc(p.lop)} · ${esc(khoaTen(p.khoa_id))} · Elo ${p.elo??1200}</span>
       <span class="pts">${p.diem}<small>ĐBK${myRank?` · hạng #${myRank}`:''}</small></span></button>`
    :`<div class="me"><div class="nm">Đang chơi thử</div><div class="sub">Không tính điểm${guestBest.day?` · kỷ lục ngày ${guestBest.day}`:''}</div>
       <div class="pts">—<small>ĐBK</small></div></div>`;
  const pill=streakPill();
  openOv(`<div class="split"><div class="split-a">
  <img class="hero-icon desk" src="icons/favicon.svg" alt="" width="88" height="88">
  <div class="home-top"><div class="eyebrow">Lấy cảm hứng từ Mì Quảng Bích · 1-3 Đặng Dung, Hòa Khánh Bắc</div>${ranked?chuongHTML():''}</div>
  <h1>Mì Quảng <em>Bách Khoa</em></h1>
  ${meCard}
  ${pill}
  ${ranked?'<div id="pushSlot"></div>':''}
  <ol class="steps desk"><li>Bấm <b>Mì</b>, thêm đúng topping khách gọi</li><li>Bấm <b>Chan nước lèo</b>, rồi bấm vào khách</li><li>Đủ doanh thu mỗi ngày để giữ mặt bằng. Chốt sổ lúc nào cũng được</li><li>Hết bàn thì khách xếp hàng. Để khách chờ lâu là mất tim, nhất là giờ cao điểm</li></ol>
  <p class="muted desk keys">Chơi bằng bàn phím: <kbd>1</kbd>–<kbd>8</kbd> chọn món, <kbd>Space</kbd> chan nước lèo, <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> bưng cho bàn 1–4, <kbd>X</kbd> đổ bỏ.</p>
  </div><div class="split-b">
  <div class="col"><div class="eyebrow">Chọn độ khó</div>
    <div class="diffs" id="diffs">${Object.entries(DIFF).map(([k,v])=>`<button class="diff d-${k}" data-d="${k}" aria-pressed="${k===diff}">
      <b>${v.n}</b><span class="x">×${v.hs}</span><small>Phạt ${phat(k)}/tim</small></button>`).join('')}</div>
    <p class="muted" id="dd"></p></div>
  <ol class="steps mob"><li>Bấm <b>Mì</b>, thêm đúng topping khách gọi</li><li>Bấm <b>Chan nước lèo</b>, rồi chạm vào khách</li><li>Đủ doanh thu mỗi ngày để giữ mặt bằng. Chốt sổ lúc nào cũng được</li><li>Hết bàn thì khách xếp hàng. Để khách chờ lâu là mất tim</li></ol>
  <div class="msg" id="msg"></div>
  <div class="col grow">
    <button class="btn" id="go">${ranked?'Mở quán':'Mở quán (chơi thử)'}</button>
    <button class="btn ghost" id="lb">Bảng xếp hạng</button>
    ${ranked?'<button class="btn warm" id="solo">Solo · thách đấu bạn bè</button><button class="btn ghost" id="hoso">Ván đấu &amp; thống kê</button><button class="btn ghost" id="banbe">Bạn bè <span class="bb-so" data-bb-badge="lm" hidden></span></button>':''}
    <div class="row">${ranked?`<button class="link" id="out">Đăng xuất</button>`
      :`<button class="link" id="login">Đăng nhập để tính điểm</button>`}</div>
    <div class="row"><button class="link" id="contact">Liên hệ người làm game</button><button class="link" id="donate">Ủng hộ game</button></div>
    <div class="row" style="align-items:center;gap:12px">${themeHTML()}${soundBtn(true)}</div>
    <div class="muted">Phiên bản ${PHIEN_BAN}</div>
  </div></div></div>`);
  const desc=()=>{$('dd').textContent=diff==='thuong'?'Khách kiên nhẫn, mục tiêu vừa phải. Phạt nhẹ khi mất tim.'
    :diff==='kho'?'Khách vội hơn, gọi nhiều món hơn. Điểm thưởng ×1.5, phạt gấp đôi.'
    :diff==='dianguc'?'Khách cực vội, tô nhiều topping. Thưởng ×2.2, nhưng mất 5 tim là bị trừ 363 điểm.'
    :'Mức cao nhất. Khách vội nhất, gần như tô nào cũng 4 món, hàng chờ ngắn. Thưởng ×3, mất 5 tim bị trừ 675 điểm.'};
  desc();
  $('diffs').onclick=e=>{const b=e.target.closest('.diff');if(!b)return;diff=b.dataset.d;try{localStorage.setItem('mqbk-diff',diff)}catch(e){}
    $('diffs').querySelectorAll('.diff').forEach(x=>x.setAttribute('aria-pressed',x.dataset.d===diff));desc()};
  $('go').onclick=startRun;
  $('lb').onclick=()=>leaderboard('sv');
  if(ranked){$('solo').onclick=()=>leaderboard('solo',true);$('hoso').onclick=()=>hoSoScreen('stats',null,home);
    $('banbe').onclick=()=>banBeScreen(bbSoLoiMoi()?'loi_moi':'ban',home);$('chuong').onclick=()=>thongBaoScreen(home);bbVe()}
  $('contact').onclick=()=>contactScreen(home);
  $('donate').onclick=()=>donateScreen(home);
  if(ranked){$('edit').onclick=profileScreen;$('out').onclick=logout}else $('login').onclick=()=>sb?authScreen():toast('Không kết nối được máy chủ');
}
async function startRun(){
  if(ranked){
    const msg=$('msg'); if(msg){msg.className='msg ok';msg.textContent='Đang mở quán…'}
    if(!(await flushPending())){ if(msg){msg.className='msg';msg.textContent='Còn một kết quả chưa nộp được do mạng. Kiểm tra mạng rồi bấm Mở quán lại.'} return }
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
  openOv(`<div class="eyebrow">Đóng quán · Ngày ${S.day} · ${DIFF[diff].n}</div><h2>Hết một ngày bán</h2>
  <div class="sum"><span>Doanh thu hôm nay</span><b>${D.earned}k</b>${solo?'':`<span>Mục tiêu</span><b>${target(S.day)}k</b>`}
  <span>Tô đã bán</span><b>${D.served}</b><span>Khách bỏ về</span><b>${D.lost}</b><span>Tiền trong két</span><b id="ket">${S.money}k</b>
  <span>${solo?'ĐBK của bạn':'Nếu chốt sổ bây giờ'}</span><b style="color:${now>=0?'var(--leaf)':'var(--chili)'}">${now>=0?'+':''}${now} ĐBK</b></div>
  <div id="hrWrap">${heartRow()}</div>
  <div class="eyebrow">Nâng cấp quán</div><p class="muted" style="margin-top:-8px">Tiền mua nâng cấp lấy từ két, không làm giảm doanh thu tính điểm.</p><div class="col" id="shop"></div>
  <p class="muted">Ngày mai: <b>${ev.n}</b>. ${ev.d} ${solo?'':`Mục tiêu ${target(S.day+1)}k.`}</p>
  <div class="col grow"><button class="btn" id="next">Mở quán ngày ${S.day+1}</button>
  <button class="btn ghost" id="cash">Chốt sổ, nghỉ bán</button></div>`);
  drawShop();
  const bindHeart=()=>{$('buyHeart').onclick=()=>{if(buyHeart()){$('hrWrap').innerHTML=heartRow();$('ket').textContent=S.money+'k';drawShop();bindHeart()}}};
  bindHeart();
  $('next').onclick=()=>{S.day++;startDay()};
  let armed=false;
  $('cash').onclick=e=>{ if(!armed){armed=true;e.target.textContent='Bấm lần nữa để chốt '+(now>=0?'+':'')+now+' ĐBK';return}
    sfx.closeStart(); finishRun('Bạn dừng đúng lúc, giữ lại thành quả.',true) };
  lockButtons($('ov'),800); saveRun('shop');
}
function drawShop(){
  $('shop').innerHTML=UPG.map(u=>{
    const have=lv(u.id), next=u.lv[have], cur=u.lv[have-1], max=u.lv.length;
    const tag=max>1?` <span class="muted">· cấp ${have}/${max}</span>`:'';
    if(!next) return `<div class="up"><strong>${cur.n}${tag}</strong><small>${cur.d}</small><button disabled>Đã có</button></div>`;
    return `<div class="up"><strong>${have?cur.n+' → '+next.n:next.n}${tag}</strong><small>${next.d}</small>
      <button data-u="${u.id}" ${S.money<next.c?'disabled':''}>${next.c}k</button></div>`}).join('');
  $('shop').querySelectorAll('button[data-u]').forEach(b=>b.onclick=()=>{
    const u=UPG.find(x=>x.id===b.dataset.u), next=u.lv[lv(u.id)];
    if(next&&S.money>=next.c){S.money-=next.c;S.upg[u.id]=lv(u.id)+1;rec('B',u.id,lv(u.id));saveRun('shop');$('ket').textContent=S.money+'k';toast('Đã mua '+next.n);drawShop();
      if($('hrWrap')){$('hrWrap').innerHTML=heartRow();$('buyHeart').onclick=()=>{if(buyHeart()){showShop()}}}}});
}

/* ================= Liên hệ ================= */
const CONTACT={ten:'Nguyễn Tấn Phú',lop:'26T_ATTT · Công nghệ Thông tin',email:'phu759042@gmail.com',sdt:'0905416772'};
function contactScreen(back){
  nhoMan('lienhe');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Liên hệ</div><button class="link" id="back">Đóng</button></div>
  <h2>Người làm game</h2>
  <div class="me"><div class="nm">${CONTACT.ten}</div><div class="sub">Sinh viên ${CONTACT.lop}, Bách Khoa Đà Nẵng</div><div class="pts"></div></div>
  <p class="muted">Gặp lỗi, muốn góp ý món mới, hay muốn thêm khoa hoặc sự kiện cho lớp mình? Nhắn mình qua email hoặc số điện thoại dưới đây.</p>
  <div class="list">
    <div class="li"><span class="rk">Mail</span><span class="nm"><a href="mailto:${CONTACT.email}" style="color:var(--heading)">${CONTACT.email}</a></span><button class="link" data-copy="${CONTACT.email}">Sao chép</button></div>
    <div class="li"><span class="rk">SĐT</span><span class="nm"><a href="tel:${CONTACT.sdt}" style="color:var(--heading)">${CONTACT.sdt.replace(/(\d{4})(\d{3})(\d{3})/,'$1 $2 $3')}</a></span><button class="link" data-copy="${CONTACT.sdt}">Sao chép</button></div>
  </div>
  <button class="btn warm" id="donate">Ủng hộ game</button>
  <p class="rule">Game lấy cảm hứng từ Mì Quảng Bích, 1-3 Đặng Dung, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng. Quán quen của sinh viên Bách Khoa.</p>`);
  $('back').onclick=back;
  $('donate').onclick=()=>donateScreen(()=>contactScreen(back));
  $('ov').querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    try{await navigator.clipboard.writeText(b.dataset.copy);toast('Đã sao chép')}catch(e){toast(b.dataset.copy)}
  });
}

/* ================= Ủng hộ ================= */
function donateScreen(back){
  nhoMan('ungho');
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Ủng hộ</div><button class="link" id="back">Đóng</button></div>
  <h2>Mời người làm game một tô mì</h2>
  <p>Mì Quảng Bách Khoa miễn phí và sẽ luôn miễn phí. Nếu bạn thấy game vui, có thể ủng hộ để mình trả tiền máy chủ, email và làm thêm tính năng mới.</p>
  <div class="donate">
    <img src="icons/ung-ho-qr.png" alt="Mã VietQR chuyển khoản MB Bank cho Nguyễn Tấn Phú, số tài khoản 0905416772" width="280" height="380">
    <div class="list">
      <div class="li"><span class="rk">NH</span><span class="nm">MB Bank (Quân đội)</span><span></span></div>
      <div class="li"><span class="rk">Tên</span><span class="nm">NGUYEN TAN PHU</span><span></span></div>
      <div class="li"><span class="rk">STK</span><span class="nm">0905416772</span><button class="link" data-copy="0905416772">Sao chép</button></div>
      <div class="li"><span class="rk">ND</span><span class="nm">Ung ho Mi Quang BK</span><button class="link" data-copy="Ung ho Mi Quang BK">Sao chép</button></div>
    </div>
  </div>
  <p class="rule">Quét mã bằng ứng dụng ngân hàng bất kỳ. Ủng hộ hoàn toàn tự nguyện, số tiền tuỳ bạn, và không đổi ra điểm, tim hay vật phẩm nào trong game. Cảm ơn bạn rất nhiều!</p>`);
  $('back').onclick=back;
  $('ov').querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    try{await navigator.clipboard.writeText(b.dataset.copy);toast('Đã sao chép')}catch(e){toast(b.dataset.copy)}
  });
}

/* ================= Bảng xếp hạng ================= */
async function leaderboard(tab,focus){
  nhoMan('bxh',tab);
  const canSolo=ranked&&!!sb;
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Vinh danh · Học kỳ 1, 2026–2027</div><button class="link" id="back">Đóng</button></div>
  <h2>Bảng xếp hạng</h2>
  ${canSolo?`<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    <input id="q" type="search" placeholder="Tìm bạn theo tên hoặc lớp để solo" autocomplete="off" enterkeyhint="search" aria-label="Tìm người chơi để thách đấu"></div>`:''}
  <div class="tabs t4" role="tablist">${[['sv','Sinh viên'],['lop','Lớp'],['khoa','Khoa'],['solo','Solo']].map(([k,n])=>`<button role="tab" data-t="${k}" aria-selected="${k===tab}">${n}</button>`).join('')}</div>
  <div class="col" id="lbBody"><div class="empty-state">Đang tải bảng xếp hạng…</div></div>
  <div class="rule" id="rule"></div>`);
  $('back').onclick=home;
  document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(b)leaderboard(b.dataset.t)};
  const hint=canSolo?' Bấm vào tên một bạn để xem hồ sơ, thách đấu solo, hoặc xem trực tiếp khi bạn ấy đang bán.':'';
  $('rule').innerHTML=tab==='sv'?ruleText()+(hint?`<p style="margin-top:6px">${hint.trim()}</p>`:''):tab==='lop'
    ?'Điểm lớp = tổng ĐBK của 10 bạn cao nhất lớp, chia 10. Lớp chưa đủ 10 người chơi thì phần thiếu tính là 0.'
    :tab==='khoa'?'Điểm khoa = tổng ĐBK của 30 bạn cao nhất khoa, chia 30.'
    :'Elo solo bắt đầu từ 1200. Thắng người Elo cao hơn mình được cộng nhiều, thua người Elo thấp hơn bị trừ nhiều (công thức Elo như cờ vua, K = 32). Ai chưa đấu trận nào đứng ở 1200. Solo không ảnh hưởng ĐBK.'+hint;
  if(!sb){$('lbBody').innerHTML='<div class="empty-state">Không kết nối được máy chủ bảng xếp hạng.</div>';return}
  const lbBack=()=>leaderboard(tab);
  $('lbBody').onclick=e=>{
    const b=e.target.closest('.act[data-uid]');
    if(b){const p=lbPeople.get(b.dataset.uid); if(!p) return;
      if(onlineSt.get(p.id)==='solo') return watchScreen(p.id,lbBack);
      return challengeScreen(p,lbBack)}
    const el=e.target.closest('[data-prof]'); if(el) hoSoScreen('stats',el.dataset.prof,lbBack)};
  const q=$('q');
  if(q){ if(focus) setTimeout(()=>q.focus(),60);
    let t; q.oninput=()=>{clearTimeout(t); const v=q.value.trim(); t=setTimeout(()=>v?searchPlayers(v):loadBoard(tab,canSolo),300)} }
  loadBoard(tab,canSolo);
}
async function loadBoard(tab,canSolo){
  let rows=[],err=null;
  if(tab==='sv'){({data:rows,error:err}=await sb.from('bxh_sinh_vien').select('id,ten,lop,khoa,diem,hang,chuoi,avatar_url').order('diem',{ascending:false}).limit(50))}
  else if(tab==='lop'){({data:rows,error:err}=await sb.from('bxh_lop').select('lop,khoa_id,so_nguoi,diem,hang').order('hang').limit(50))}
  else if(tab==='khoa'){({data:rows,error:err}=await sb.from('bxh_khoa').select('khoa_id,khoa,so_nguoi,diem,hang').order('hang'))}
  else {({data:rows,error:err}=await sb.from('profiles').select('id,ten,lop,khoa_id,diem,elo,solo_thang,solo_thua,solo_hoa,avatar_url').order('elo',{ascending:false}).limit(300));
    if(rows){const all=rows, tr=x=>x.solo_thang+x.solo_thua+x.solo_hoa;
      all.sort((x,y)=>y.elo-x.elo||tr(y)-tr(x)||y.diem-x.diem);
      rows=all.slice(0,50).map(x=>({...x,khoa:khoaTen(x.khoa_id),hang:1+all.filter(z=>z.elo>x.elo).length}))}}
  const body=$('lbBody'); if(!body||($('q')&&$('q').value.trim())) return;
  if(err){body.innerHTML=`<div class="empty-state">Không tải được: ${esc(err.message)}</div>`;return}
  rows=rows||[];
  const norm=rows.map(r=>tab==='sv'
    ?{rk:r.hang,nm:r.ten,sb:`${r.lop} · ${r.khoa}${r.chuoi>0?` · ${r.chuoi} ngày liên tiếp`:''}`,pt:r.diem,mine:user&&r.id===user.id,av:r.avatar_url,hasAv:true,uid:r.id,p:{id:r.id,ten:r.ten,lop:r.lop,avatar_url:r.avatar_url}}
    :tab==='lop'?{rk:r.hang,nm:r.lop,sb:`${khoaTen(r.khoa_id)} · ${r.so_nguoi} người chơi`,pt:r.diem,mine:profile&&r.lop===profile.lop}
    :tab==='khoa'?{rk:r.hang,nm:r.khoa,sb:`${r.so_nguoi} người chơi`,pt:r.diem,mine:profile&&r.khoa_id===profile.khoa_id}
    :{rk:r.hang,nm:r.ten,sb:r.solo_thang+r.solo_thua+r.solo_hoa?`${r.lop} · ${r.solo_thang} thắng ${r.solo_thua} thua${r.solo_hoa?` ${r.solo_hoa} hoà`:''}`:`${r.lop} · chưa đấu trận nào`,pt:r.elo,mine:user&&r.id===user.id,av:r.avatar_url,hasAv:true,uid:r.id,p:{id:r.id,ten:r.ten,lop:r.lop,avatar_url:r.avatar_url,elo:r.elo}});
  norm.forEach(r=>{if(r.p)lbPeople.set(r.uid,r.p)});
  if(!norm.length){body.innerHTML=tab==='solo'
    ?`<div class="empty-state">Chưa có trận solo nào.${canSolo?' Tìm một bạn ở ô phía trên và thách đấu để mở màn.':' Đăng nhập để thách đấu bạn bè.'}</div>`
    :`<div class="empty-state">Chưa có ai trên bảng. Chơi một lượt để ghi tên ${tab==='lop'?'lớp bạn':'mình'} đầu tiên.</div>`;return}
  const tap=r=>canSolo&&r.uid?` data-prof="${r.uid}" role="button" tabindex="0" aria-label="Xem hồ sơ ${esc(r.nm)}"`:'';
  const dot=r=>r.uid?`<span class="dot" data-online="${r.uid}" ${onlineSet.has(r.uid)?'':'hidden'}></span>`:'';
  const stb=r=>r.uid&&!r.mine?stBadge(r.uid):'';
  const top=norm.slice(0,3), rest=norm.slice(3);
  const pod=(r,i)=>r?`<div class="pod r${i+1}${r.mine?' mine':''}"${tap(r)}>${r.hasAv?avatarHTML(r.av,r.nm,i===0?60:46,'pod-av'):''}<div class="rk">${r.rk}</div><div class="nm">${dot(r)}${esc(r.nm)}</div>${stb(r)}<div class="sb">${esc(r.sb)}</div><div class="pt">${r.pt}</div></div>`:'<div></div>';
  let html=`<div class="podium">${pod(top[1],1)}${pod(top[0],0)}${pod(top[2],2)}</div>`;
  if(rest.length) html+=`<div class="list">${rest.map(r=>`<div class="li${r.mine?' mine':''}"${tap(r)}><span class="rk">#${r.rk}</span><span class="nm${r.hasAv?' with-av':''}">${r.hasAv?avatarHTML(r.av,r.nm,34):''}<span>${dot(r)}${esc(r.nm)} ${stb(r)}<span class="sb">${esc(r.sb)}</span></span></span><span class="pt">${r.pt}</span></div>`).join('')}</div>`;
  if(tab==='sv'&&profile&&myRank&&!norm.some(r=>r.mine)) html+=`<div class="list"><div class="li mine"><span class="rk">#${myRank}</span><span class="nm with-av">${avatarHTML(profile.avatar_url,profile.ten,34)}<span>${esc(profile.ten)}<span class="sb">Bạn</span></span></span><span class="pt">${profile.diem}</span></div></div>`;
  body.innerHTML=html;
  body.querySelectorAll('[data-prof][role=button]').forEach(el=>el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}});
}
function ruleText(){
  return `<b>Cách tính ĐBK mỗi lượt:</b> doanh thu × hệ số ÷ 10, trừ số tim mất × mức phạt. Bỏ dở lượt giữa chừng tính như mất cả 5 tim.
  <div style="overflow-x:auto;margin-top:6px"><table class="tb"><tr><th>Độ khó</th><th>Hệ số</th><th>Phạt/tim</th><th>Mất 5 tim</th></tr>
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
  if(D.bowl.broth){toast('Đã chan nước, đổ bỏ để làm lại');return}
  if(k!=='mi'&&!it.has('mi')){toast('Cho mì vào trước đã');return}
  if(it.has(k)){if(k==='mi'&&it.size>1){toast('Bỏ topping trước khi bỏ mì');return}it.delete(k);rec('R',recIng(k));sfx.remove()}else{it.add(k);rec('A',recIng(k));sfx.add(k)}
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
  const reset=()=>{y0=null;dy=0;ind.style.transition='transform .2s, opacity .2s';setInd(0);setTimeout(()=>ind.style.transition='',220)};
  ov.addEventListener('touchstart',e=>{
    if(midRun||running||submitting||ov.scrollTop>0||e.touches.length!==1){y0=null;return}
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
const themeHTML=()=>`<div class="theme" role="group" aria-label="Giao diện"><span>Giao diện</span>${[['light','Sáng'],['dark','Tối'],['auto','Theo máy']].map(([k,n])=>`<button type="button" data-t="${k}" aria-pressed="${k===theme}">${n}</button>`).join('')}</div>`;
document.addEventListener('click',e=>{const b=e.target.closest('.theme button');if(b)applyTheme(b.dataset.t)});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(theme==='auto')applyTheme('auto')})}catch(e){}
