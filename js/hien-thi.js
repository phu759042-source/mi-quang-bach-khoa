/* Mì Quảng Bách Khoa · js/hien-thi.js: Vẽ màn chơi: bàn, khách, tô mì, thanh trạng thái.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Render game ================= */
function renderAll(){renderStats();renderTables();renderBowl();renderPad();setPauseBtn()}
function renderStats(){
  $('sDay').textContent=S.day; $('sEarn').textContent=solo?`${D.earned}k`:`${D.earned}/${target(S.day)}k`;
  const hp=(on)=>`<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15.5 1 12 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 5-4 8.5-11 14z" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="2"/></svg>`;
  $('sRep').innerHTML=Array.from({length:TIM_MAX},(_,i)=>hp(i<S.rep)).join('');
  $('sRep').setAttribute('aria-label',`Còn ${Math.max(0,S.rep)} trên 5 tim`);
  const q=D.queue||[];
  const rush=inRush()?`<span class="tag rush">Giờ cao điểm</span>`:'';
  const queue=q.length?`<span class="queue" aria-label="${q.length} khách đang xếp hàng">Xếp hàng ${q.map(c=>`<i style="--c:${c.kh[2]}"></i>`).join('')}</span>`:'';
  $('sEvent').innerHTML=`<span class="tag" style="background:${DIFF[diff].color}">${DIFF[diff].n}</span>${rush}<span class="evn">${esc(D.ev.n)} · ${esc(D.ev.d)}</span>${queue}${soloHud()}`;
  if(solo&&running) soloPush();
}
function renderTables(){
  const t=$('tables'); t.style.setProperty('--n',D.slots.length);
  t.innerHTML=D.slots.map((c,i)=>{
    if(!c) return `<div class="cust empty">Bàn trống</div>`;
    const name=c.teacher?`Thầy khoa ${c.kh[1]}`:`SV ${c.kh[1]}`;
    return `<div class="cust${c.teacher?' teacher':''}" data-i="${i}" role="button" tabindex="0" aria-label="Phục vụ ${name}">
      <div class="ava" style="background:${c.kh[2]}">${c.teacher?'Thầy':c.kh[0]}</div>
      <div class="who">${name}</div><div class="order">${c.order.map(icon).join('')}</div>
      <div class="quote">${c.line}</div><div class="pat"><i></i></div><kbd class="k-table">${'QWER'[i]}</kbd></div>`}).join('');
  updateBars();
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
function renderBowl(){
  const b=D.bowl;
  let s=`<defs><clipPath id="in"><ellipse cx="120" cy="52" rx="98" ry="29"/></clipPath></defs>
  <ellipse cx="120" cy="143" rx="62" ry="6" style="fill:var(--shade)"/>
  <path d="M18 52 Q26 138 120 138 Q214 138 222 52 Z" fill="#1B3A6B"/>
  <path d="M30 86 Q120 112 210 86" fill="none" stroke="#FBF3E3" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
  <path d="M40 106 Q120 128 200 106" fill="none" stroke="#5C7BB0" stroke-width="2"/>
  <ellipse cx="120" cy="52" rx="104" ry="33" fill="#FBF3E3" stroke="#1B3A6B" stroke-width="5"/><g clip-path="url(#in)">`;
  // Mì Quảng: sợi dẹt to bản màu trắng ngà, có viền mảnh để nổi trên lòng tô màu kem
  if(b.items.has('mi')){let d='';for(let y=25,i=0;y<88;y+=10,i++) d+=`M${4+(i%2)*14} ${y} q14 -5 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 `;
    s+=`<g fill="none" stroke-linecap="round"><path d="${d}" stroke="#B49D74" stroke-width="11"/><path d="${d}" stroke="#FFFDF5" stroke-width="8.4"/></g>`}
  if(b.broth) s+=`<ellipse cx="120" cy="58" rx="100" ry="26" fill="#D9822B" opacity=".55"/><ellipse cx="90" cy="44" rx="30" ry="4" fill="#fff" opacity=".25"/>`;
  s+=`</g>`;
  TOPS.forEach(k=>{if(b.items.has(k)){const [x,y]=POS[k];s+=`<g transform="translate(${x} ${y}) scale(.9)">${ING[k].s}</g>`}});
  if(!b.items.size) s+=`<text x="120" y="57" text-anchor="middle" font-family="Be Vietnam Pro, sans-serif" font-size="12" fill="#7A6A55">Tô trống</text>`;
  $('bowl').innerHTML=s;
  $('hint').textContent=!b.items.has('mi')?'Bắt đầu bằng một vắt mì':!b.broth?(lv('noi')?'Thêm topping, rồi chạm vào khách. Nước lèo tự chan':'Thêm topping, rồi chan nước lèo'):'Chạm vào khách để bưng ra';
  $('pour').disabled=!b.items.has('mi')||b.broth;
}
function renderPad(){
  $('pad').innerHTML=Object.keys(ING).map((k,i)=>`<button class="ing${D.bowl.items.has(k)?' on':''}" data-k="${k}">${icon(k)}<span>${ING[k].n}</span><kbd>${i+1}</kbd></button>`).join('');
}
