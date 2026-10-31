/* Mì Quảng Bách Khoa · js/hien-thi.js: Vẽ màn chơi: bàn, khách, tô mì, thanh trạng thái.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Render game ================= */
function renderAll(){renderStats();renderTables();renderBowl();renderPad();setPauseBtn()}
function renderStats(){
  $('sDay').textContent=S.day; $('sEarn').textContent=solo?`${D.earned}k`:`${D.earned}/${target(S.day)}k`;
  const hp=(on)=>`<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15.5 1 12 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 5-4 8.5-11 14z" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="2"/></svg>`;
  $('sRep').innerHTML=Array.from({length:TIM_MAX},(_,i)=>hp(i<S.rep)).join('');
  $('sRep').setAttribute('aria-label',tl(`Còn ${Math.max(0,S.rep)} trên 5 tim`,`${Math.max(0,S.rep)} of 5 hearts left`));
  const q=D.queue||[];
  const rush=inRush()?`<span class="tag rush">${tl('Giờ cao điểm','Rush hour')}</span>`:'';
  const queue=q.length?`<span class="queue" aria-label="${tl(`${q.length} khách đang xếp hàng`,`${q.length} customers in line`)}">${tl('Xếp hàng','Queue')} ${q.map(c=>`<i style="--c:${c.kh[2]}"></i>`).join('')}</span>`:'';
  $('sEvent').innerHTML=`<span class="tag" style="background:${DIFF[diff].color}">${DIFF[diff].n}</span>${rush}<span class="evn">${esc(D.ev.n)} · ${esc(D.ev.d)}</span>${queue}${soloHud()}`;
  if(solo&&running) soloPush();
}
function renderTables(){
  const t=$('tables'); t.style.setProperty('--n',D.slots.length);
  t.innerHTML=D.slots.map((c,i)=>{
    if(!c) return `<div class="cust empty">${tl('Bàn trống','Empty table')}</div>`;
    const name=c.teacher?tl(`Thầy khoa ${c.kh[1]}`,`${c.kh[1]} lecturer`):tl(`SV ${c.kh[1]}`,`${c.kh[1]} student`);
    return `<div class="cust${c.teacher?' teacher':''}" data-i="${i}" role="button" tabindex="0" aria-label="${tl('Phục vụ','Serve')} ${name}">
      <div class="ava" style="background:${c.kh[2]}">${c.teacher?tl('Thầy','Prof'):c.kh[0]}</div>
      <div class="who">${name}</div><div class="order">${c.order.map(icon).join('')}</div>
      <div class="quote">${c.line}</div><div class="pat"><i></i></div><kbd class="k-table">${'QWER'[i]}</kbd></div>`}).join('');
  updateBars(); hdVe();
}
function updateBars(){
  $('sTime').textContent=Math.max(0,Math.ceil(D.t))+'s';
  const qi=$('sEvent').querySelectorAll('.queue i');
  (D.queue||[]).forEach((c,k)=>{const r=c.q/c.qmax;if(qi[k])qi[k].style.boxShadow=`0 0 0 2px ${r>.5?'var(--leaf)':r>.25?'var(--turmeric)':'var(--chili)'}`});
  [...$('tables').children].forEach((el,i)=>{
    const c=D.slots[i]; if(!c) return; const r=Math.max(0,c.p/c.max);
    const bar=el.querySelector('.pat i'); bar.style.width=(r*100)+'%';
    bar.style.background=r>.5?'var(--leaf)':r>.25?'var(--turmeric)':'var(--chili)';
  });
}
// Vắt mì Quảng trong tô (bản 2.17.1): sợi dẹt to bản màu trắng ngà cuộn thành ổ, viền nâu nhạt và bóng mờ.
// Dựng một lần với số ngẫu nhiên cố định nên tô không đổi hình mỗi lần vẽ lại.
const MI_TO=(()=>{let q=9;const r=()=>(q=(q*1103515245+12345)&0x7fffffff)/0x7fffffff, RX=78, RY=20, W=7, ds=[];
  for(let i=0;i<18;i++){
    const sc=.12+.88*Math.sqrt(r()), cx=120+(r()-.5)*14, cy=56+(r()-.5)*5, t1=r()*Math.PI*2,
      span=(1.1+r()*1.6)*Math.PI*(r()<.5?1:-1), wob=2+r()*3, ph=r()*6;
    let d=''; for(let j=0;j<=28;j++){const t=t1+span*j/28, rr=1+.06*Math.sin(ph+t*3);
      d+=(j?'L':'M')+(cx+Math.cos(t)*RX*sc*rr).toFixed(1)+' '+(cy+Math.sin(t)*RY*sc*rr+Math.sin(ph+t*2)*wob*.3).toFixed(1)}
    ds.push({d,z:r(),c:['#FFFDF6','#FCF6E8','#F8EFDD'][Math.floor(r()*3)]});
  }
  ds.sort((a,b)=>a.z-b.z);
  return `<ellipse cx="120" cy="57" rx="${RX+4}" ry="${RY+3}" fill="#E3D5B8"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">`+
    ds.map(a=>`<path d="${a.d}" stroke="#A8957018" stroke-width="${W+5}" transform="translate(0 1.6)"/><path d="${a.d}" stroke="#C4B08A" stroke-width="${W+1.6}"/><path d="${a.d}" stroke="${a.c}" stroke-width="${W}"/>`).join('')+'</g>';
})();
function renderBowl(){
  const b=D.bowl;
  let s=`<defs><clipPath id="in"><ellipse cx="120" cy="52" rx="98" ry="29"/></clipPath></defs>
  <ellipse cx="120" cy="143" rx="62" ry="6" style="fill:var(--shade)"/>
  <path d="M18 52 Q26 138 120 138 Q214 138 222 52 Z" fill="#1B3A6B"/>
  <path d="M30 86 Q120 112 210 86" fill="none" stroke="#FBF3E3" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
  <path d="M40 106 Q120 128 200 106" fill="none" stroke="#5C7BB0" stroke-width="2"/>
  <ellipse cx="120" cy="52" rx="104" ry="33" fill="#FBF3E3" stroke="#1B3A6B" stroke-width="5"/><g clip-path="url(#in)">`;
  // Bản 2.17.1: nước lèo xâm xấp ở đáy (mì Quảng ít nước), vắt mì trắng cuộn thành ổ nằm trên
  if(b.broth) s+=`<ellipse cx="120" cy="56" rx="100" ry="27" fill="#E0A04A"/><ellipse cx="120" cy="56" rx="100" ry="27" fill="#C9772A" opacity=".35"/>`;
  if(b.items.has('mi')) s+=MI_TO;
  if(b.broth) s+=`<g fill="#F2C14E" opacity=".9"><circle cx="40" cy="58" r="2.2"/><circle cx="200" cy="54" r="1.8"/><circle cx="60" cy="72" r="1.6"/><circle cx="185" cy="70" r="2"/></g>`;
  s+=`</g>`;
  TOPS.forEach(k=>{if(b.items.has(k)){const [x,y]=POS[k];s+=`<g transform="translate(${x} ${y}) scale(.9)">${ING[k].s}</g>`}});
  if(!b.items.size) s+=`<text x="120" y="57" text-anchor="middle" font-family="Be Vietnam Pro, sans-serif" font-size="12" fill="#7A6A55">${tl('Tô trống','Empty bowl')}</text>`;
  $('bowl').innerHTML=s;
  $('hint').textContent=!b.items.has('mi')?tl('Bắt đầu bằng một vắt mì','Start with a portion of noodles'):!b.broth?(lv('noi')?tl('Thêm topping, rồi chạm vào khách. Nước lèo tự chan','Add toppings, then tap a customer. Broth is added automatically'):tl('Thêm topping, rồi chan nước lèo','Add toppings, then add the broth')):tl('Chạm vào khách để bưng ra','Tap a customer to serve');
  $('pour').disabled=!b.items.has('mi')||b.broth;
  hdVe();
}
function renderPad(){
  $('pad').innerHTML=Object.keys(ING).map((k,i)=>`<button class="ing${D.bowl.items.has(k)?' on':''}" data-k="${k}">${icon(k)}<span>${ING[k].n}</span><kbd>${i+1}</kbd></button>`).join('');
  hdVe();
}
