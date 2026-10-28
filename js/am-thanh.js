/* Mì Quảng Bách Khoa · js/am-thanh.js: Âm thanh tổng hợp bằng Web Audio.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Âm thanh (tạo bằng Web Audio, không cần file) ================= */
const SFX={on:true,ctx:null,out:null};
const POUR_KIEU='B';
try{SFX.on=localStorage.getItem('mqbk-sound')!=='off'}catch(e){}
function ac(){
  if(!SFX.on) return null;
  if(!SFX.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    SFX.ctx=new C(); const comp=SFX.ctx.createDynamicsCompressor(); SFX.out=SFX.ctx.createGain(); SFX.out.gain.value=.55;
    SFX.out.connect(comp); comp.connect(SFX.ctx.destination)}
  if(SFX.ctx.state==='suspended'&&!SFX.offline) SFX.ctx.resume();
  return SFX.ctx;
}
// trình duyệt chỉ cho phát tiếng sau khi người dùng chạm/bấm lần đầu
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{if(SFX.on)ac()},{once:true,capture:true}));
function tone(f,dur,{type='sine',vol=.3,at=0,to=null,attack=.005}={}){
  const c=ac(); if(!c) return; const t=c.currentTime+at, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); if(to) o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t+dur+.02);
}
function noise(dur,{vol=.25,at=0,type='bandpass',f=1000,to=null,q=1,attack=.01}={}){
  const c=ac(); if(!c) return; const t=c.currentTime+at, n=Math.ceil(c.sampleRate*dur), buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const s=c.createBufferSource(), fl=c.createBiquadFilter(), g=c.createGain(); s.buffer=buf;
  fl.type=type; fl.Q.value=q; fl.frequency.setValueAtTime(f,t); if(to) fl.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(fl); fl.connect(g); g.connect(SFX.out); s.start(t); s.stop(t+dur+.02);
}
const sfx={
  // bỏ nguyên liệu: tiếng "lộp" nhỏ, mỗi món một cao độ; mì là tiếng sột soạt
  add(k){ if(k==='mi'){noise(.16,{f:2400,q:.7,vol:.18});tone(300,.1,{to:180,vol:.12})}
          else {const i=TOPS.indexOf(k);tone(420+i*55,.09,{to:820+i*70,vol:.22});noise(.04,{f:3000,vol:.06})}},
  remove(){tone(700,.08,{to:380,vol:.14})},
  // chan nước lèo: tiếng nước rót + vài bong bóng
  // chan nước lèo: tiếng nước đổ của bản 2.5, rút gọn còn ~0,3 giây.
  // dày = nhiều tiếng nước dồn lại (A), mỏng = ít hơn, mượt hơn (B)
  pour(v=POUR_KIEU){const D=.3, n=v==='B'?12:24;
    noise(.08,{type:'lowpass',f:1200,vol:.1,attack:.003});                          // nước chạm đáy tô
    noise(D,{type:'lowpass',f:380,q:.3,vol:.035,attack:.03});                       // dòng nước chảy
    noise(D,{type:'bandpass',f:380,to:1100,q:22,vol:.3,attack:.03});                // tô đầy dần, tiếng cao lên
    for(let i=0;i<n;i++){const at=.01+Math.random()*(D-.06), f=520+Math.random()*1200;
      tone(f,.02+Math.random()*.03,{to:f*(1.5+Math.random()*.6),vol:.04+Math.random()*.06,at,attack:.002})}},
  // chốt sổ, phần 1 — đúng lúc bấm xác nhận: một tiếng "cạch" ngắn của két
  closeStart(){tone(150,.1,{to:70,vol:.35});noise(.04,{type:'highpass',f:2500,vol:.2})},
  // chốt sổ, phần 2 — phát ngay khi màn "Đang nộp điểm" hiện, lặp đều cho tới khi màn đổi
  countStart(){this.countStop(); let k=0;
    const tick=()=>{noise(.05,{type:'bandpass',f:2600+Math.random()*900,q:1.2,vol:.13,attack:.004});   // tờ tiền "soạt"
      if(k%3===2) tone(3000+Math.random()*1500,.08,{type:'triangle',vol:.05});                       // xu kêu
      k++};
    tick(); SFX.countT=setInterval(tick,120)},
  countStop(){clearInterval(SFX.countT);SFX.countT=null},
  // chốt sổ, phần 3 — phát cùng lúc con số điểm nảy lên, gọn ~0,5 giây
  closeEnd(){this.countStop(); tone(1760,.35,{type:'triangle',vol:.22});tone(2637,.3,{vol:.1});
    for(let i=0;i<5;i++) tone(2800+Math.random()*2000,.1,{type:'triangle',vol:.06,at:.05+i*.04});
    tone(1046,.45,{type:'triangle',vol:.12,at:.08});tone(1568,.4,{type:'triangle',vol:.1,at:.08})},
  closeFail(){this.countStop();tone(330,.18,{type:'triangle',vol:.16});tone(247,.3,{type:'triangle',vol:.16,at:.17})},
  // bán thành công: tiếng két tiền "ka-ching" + leng keng đồng xu
  cash(big){tone(1318,.09,{type:'triangle',vol:.22});noise(.05,{type:'highpass',f:5000,vol:.12});
            tone(1760,.45,{type:'triangle',vol:.22,at:.08});tone(2637,.4,{vol:.12,at:.08});
            noise(.25,{type:'highpass',f:7000,vol:.08,at:.1});if(big)tone(3136,.35,{vol:.1,at:.18})},
  // sai món: hai tiếng "è è" trầm
  wrong(){tone(233,.16,{type:'square',vol:.12});tone(185,.24,{type:'square',vol:.12,at:.17})},
  // khách chờ lâu bỏ về: tiếng huýt buồn trượt xuống + tiếng bước đi
  leave(){tone(620,.55,{to:230,type:'triangle',vol:.2});noise(.06,{f:500,vol:.12,at:.45});noise(.06,{f:450,vol:.1,at:.62})},
  heart(){[784,988,1318].forEach((f,i)=>tone(f,.2,{type:'triangle',vol:.16,at:i*.07}))},
  // thắp lửa chuỗi: gió hút vào, "phừng" bùng lửa, lách tách, rồi chuông vui
  streak(){noise(.6,{type:'lowpass',f:200,to:2800,vol:.22,attack:.45});
           tone(140,.5,{to:55,vol:.4,at:.62});noise(.5,{type:'lowpass',f:1600,to:300,vol:.38,at:.62,attack:.02});
           for(let i=0;i<9;i++) noise(.03,{type:'highpass',f:3500,vol:.12,at:.8+Math.random()*1.1});
           [1046,1318,1568,2093].forEach((f,i)=>tone(f,.5,{type:'triangle',vol:.16,at:.95+i*.09}))},
  num(){tone(880,.12,{to:1320,type:'triangle',vol:.18})},
  // có lời thách đấu: gõ bàn "cốc cốc" rồi chuông leng keng đi lên
  challenge(){noise(.06,{type:'bandpass',f:700,q:4,vol:.45,attack:.002});noise(.06,{type:'bandpass',f:640,q:4,vol:.45,at:.16,attack:.002});
    tone(523,.6,{vol:.1,at:.36});[1046,1568,2093].forEach((f,i)=>tone(f,.34,{type:'triangle',vol:.2,at:.36+i*.11}))},
  // thắng: tiếng nổ pháo giấy + kèn đi lên + hợp âm sáng
  win(){[0,.12,.22].forEach(t=>{noise(.12,{type:'highpass',f:1800,vol:.35,at:t,attack:.002});tone(180,.08,{to:60,vol:.25,at:t})});
    [523,659,784,1046].forEach((f,i)=>tone(f,.18,{type:'triangle',vol:.2,at:.3+i*.1}));
    [1046,1318,1568].forEach(f=>tone(f,.9,{type:'triangle',vol:.13,at:.72}));
    for(let i=0;i<8;i++) tone(2600+Math.random()*2400,.12,{type:'triangle',vol:.05,at:.75+i*.07})},
  // thua: kèn "wah wah wah waaah" đi xuống
  lose(){[[392,370],[370,349],[349,330]].forEach(([a,b],i)=>tone(a,.32,{to:b,type:'sawtooth',vol:.07,at:i*.36,attack:.02}));
    tone(330,1,{to:220,type:'sawtooth',vol:.08,at:1.08,attack:.02});tone(165,1,{to:110,type:'triangle',vol:.12,at:1.08})},
  draw(){tone(660,.25,{type:'triangle',vol:.15});tone(660,.4,{type:'triangle',vol:.15,at:.28})},
  // lên hạng / danh hiệu mới (bản 2.19.0): tiếng vút lên, trống, kèn hiệu đi lên rồi chuông lấp lánh
  rankUp(){noise(.7,{type:'bandpass',f:400,to:3200,q:2,vol:.2,attack:.5});
    [0,.12].forEach(t=>tone(110,.25,{to:55,vol:.35,at:.62+t}));
    [523,659,784].forEach((f,i)=>tone(f,.16,{type:'triangle',vol:.2,at:.7+i*.12}));
    [1046,1318,1568,2093].forEach(f=>tone(f,1.2,{type:'triangle',vol:.1,at:1.06}));
    for(let i=0;i<10;i++) tone(2400+Math.random()*2600,.14,{type:'triangle',vol:.05,at:1.1+i*.08})},
  // xuống hạng: hai nốt trượt xuống, nhẹ, không quá buồn
  rankDown(){tone(523,.35,{to:440,type:'triangle',vol:.16});tone(440,.6,{to:330,type:'triangle',vol:.14,at:.32});tone(196,.7,{type:'sine',vol:.1,at:.32})}
};
function setSound(on){SFX.on=on;try{localStorage.setItem('mqbk-sound',on?'on':'off')}catch(e){}
  if(on){ac();tone(880,.08,{vol:.15})}
  document.querySelectorAll('.snd').forEach(b=>{b.setAttribute('aria-pressed',on);b.innerHTML=sndIcon(on)+(b.dataset.label?`<span>${on?tl('Âm thanh: bật','Sound: on'):tl('Âm thanh: tắt','Sound: off')}</span>`:'')})}
const sndIcon=on=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on?'<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>':'<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
const soundBtn=(label)=>`<button type="button" class="snd${label?' snd-l':''}" ${label?'data-label="1"':''} aria-pressed="${SFX.on}" aria-label="${tl('Bật hoặc tắt âm thanh','Toggle sound')}">${sndIcon(SFX.on)}${label?`<span>${SFX.on?tl('Âm thanh: bật','Sound: on'):tl('Âm thanh: tắt','Sound: off')}</span>`:''}</button>`;
document.addEventListener('click',e=>{if(e.target.closest('.snd'))setSound(!SFX.on)});
