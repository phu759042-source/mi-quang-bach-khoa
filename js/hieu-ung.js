/* Mì Quảng Bách Khoa · js/hieu-ung.js: Hiệu ứng kết thúc thắng/thua và khoá nút chống bấm nhầm.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Hiệu ứng kết thúc + khoá nút chống bấm nhầm =================
   Khi thắng/thua: dừng màn hình ~2 giây, chặn mọi lần chạm, chạy hiệu ứng
   (thắng: pháo giấy bắn từ dưới lên; thua: màn xám, mưa rơi, rung nhẹ), rồi mới hiện kết quả.
   Nút trên màn kết quả bị khoá thêm một lúc để ngón tay đang bấm liên tục không bấm trúng. */
function lockButtons(root,ms=900){
  if(!root) return;
  const bs=[...root.querySelectorAll('button')];
  bs.forEach(b=>{b.dataset.lk=b.disabled?'1':'0';b.disabled=true;b.classList.add('locked')});
  setTimeout(()=>bs.forEach(b=>{if(b.dataset.lk==='0')b.disabled=false;b.classList.remove('locked');delete b.dataset.lk}),ms);
}
function particles(cv,kind){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||kind==='draw'||!cv.getContext) return ()=>{};
  const r=cv.getBoundingClientRect(), W=r.width, H=r.height, dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=W*dpr; cv.height=H*dpr; const g=cv.getContext('2d'); g.scale(dpr,dpr);
  const ps=[]; let raf=0, last=performance.now(), alive=true;
  if(kind==='win'){
    const cols=['#FFFFFF','#FFFDF8','#FFF4D6','#E8A317','#C8321E','#2F6B3A','#1B3A6B','#F59A2A'];
    const burst=(x,n,spread)=>{for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*spread, v=H*(1.15+Math.random()*.65);
      ps.push({x:x+(Math.random()-.5)*30,y:H+12,vx:Math.cos(a)*v,vy:Math.sin(a)*v,w:7+Math.random()*7,h:10+Math.random()*9,
        rot:Math.random()*6,vr:(Math.random()-.5)*12,f:Math.random()*6,vf:6+Math.random()*8,c:cols[(Math.random()*cols.length)|0]})}};
    burst(W*.12,60,.8); burst(W*.88,60,.8);
    setTimeout(()=>alive&&burst(W*.5,80,1.3),240); setTimeout(()=>alive&&(burst(W*.3,30,.7),burst(W*.7,30,.7)),520);
  } else {
    for(let i=0;i<Math.max(40,W/7);i++) ps.push({x:Math.random()*W*1.2,y:-Math.random()*H,vy:H*(1+Math.random()*.6),l:12+Math.random()*18});
  }
  const step=now=>{
    const dt=Math.min(.05,(now-last)/1000); last=now; g.clearRect(0,0,W,H);
    if(kind==='win'){
      for(const p of ps){
        p.vy+=H*1.5*dt; if(p.vy>H*.22) p.vy=H*.22;              // giấy rơi chậm như bay
        p.vx*=1-1.6*dt; p.f+=p.vf*dt; p.rot+=p.vr*dt;
        p.x+=(p.vx+Math.sin(p.f)*40)*dt; p.y+=p.vy*dt;
        g.save(); g.translate(p.x,p.y); g.rotate(p.rot); g.scale(1,Math.cos(p.f));
        g.fillStyle=p.c; g.strokeStyle='rgba(42,33,24,.18)'; g.lineWidth=1;
        g.fillRect(-p.w/2,-p.h/2,p.w,p.h); g.strokeRect(-p.w/2,-p.h/2,p.w,p.h); g.restore();
      }
    } else {
      g.strokeStyle='rgba(205,215,230,.55)'; g.lineWidth=1.6; g.beginPath();
      for(const p of ps){p.y+=p.vy*dt; p.x-=p.vy*.18*dt; if(p.y>H+20){p.y=-20;p.x=Math.random()*W*1.2}
        g.moveTo(p.x,p.y); g.lineTo(p.x+p.l*.18,p.y-p.l)}
      g.stroke();
    }
    if(alive) raf=requestAnimationFrame(step);
  };
  raf=requestAnimationFrame(step);
  return ()=>{alive=false;cancelAnimationFrame(raf)};
}
// kind: win | lose | draw. next() vẽ màn kết quả.
function endFx(kind,title,sub,next,ms){
  const app=$('app'); document.querySelectorAll('.fx,.toast').forEach(x=>x.remove());
  if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();
  const fx=document.createElement('div'); fx.className='fx '+kind;
  fx.setAttribute('role','status'); fx.setAttribute('aria-live','assertive');
  fx.innerHTML=`<canvas aria-hidden="true"></canvas><div class="ttl">${esc(title)}${sub?`<small>${esc(sub)}</small>`:''}</div>`;
  const eat=e=>{e.preventDefault();e.stopPropagation()};
  ['pointerdown','pointerup','click','touchstart','touchend','mousedown'].forEach(ev=>fx.addEventListener(ev,eat,{passive:false}));
  app.appendChild(fx); app.classList.add('fx-'+kind);
  const stop=particles(fx.querySelector('canvas'),kind);
  (kind==='win'?sfx.win:kind==='lose'?sfx.lose:sfx.draw).call(sfx);
  try{navigator.vibrate&&navigator.vibrate(kind==='win'?[60,50,60,50,140]:kind==='lose'?[350]:[80])}catch(e){}
  setTimeout(()=>{
    app.classList.remove('fx-win','fx-lose','fx-draw');
    if(next) next();
    lockButtons($('ov'),900);
    fx.classList.add('out'); fx.style.pointerEvents='none';
    setTimeout(()=>{stop();fx.remove()},kind==='win'?1800:450);
  },ms||(kind==='win'?2100:1800));
}
// Pháo giấy nhẹ không chặn màn (chốt sổ có lời ở chế độ thường)
function confetti(){
  const app=$('app'), fx=document.createElement('div'); fx.className='fx win pass'; fx.innerHTML='<canvas aria-hidden="true"></canvas>';
  fx.style.pointerEvents='none'; app.appendChild(fx);
  const stop=particles(fx.querySelector('canvas'),'win');
  setTimeout(()=>fx.classList.add('out'),1900); setTimeout(()=>{stop();fx.remove()},2600);
}
