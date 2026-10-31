/* Mì Quảng Bách Khoa · js/huong-dan.js: Người mới (bản 2.21.0): ngày khai trương dễ hơn, chỉ tay từng bước
   cho 3 tô đầu, khoá mềm độ khó cao, giữ lượt chơi thử để tính điểm khi tạo tài khoản.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */

/* Số lượt đã chơi xong trên máy này (cả chơi thử lẫn tính điểm) */
const SO_LUOT_KEY='mqbk-so-luot', THU_KEY='mqbk-luot-thu', HD_SO_TO=3;
const soLuotMay=()=>{try{return +localStorage.getItem(SO_LUOT_KEY)||0}catch(e){return 0}};
function demLuotMay(){try{localStorage.setItem(SO_LUOT_KEY,soLuotMay()+1)}catch(e){}}
/* Người mới: tài khoản chưa xong 2 lượt; chơi thử thì tính theo máy */
const laNguoiMoi=()=>ranked&&profile?(profile.so_luot||0)<2:soLuotMay()<2;

/* Ngày 1 của người mới: khách kiên nhẫn gấp rưỡi, gọi tối đa 2 topping, đến thưa hơn */
const khaiTruong=()=>!solo&&S&&S.moi&&S.day===1;
const HD_KIEN_NHAN=1.5, HD_THUA=1.25;

/* Chỉ tay: tô đang làm cho khách nào, còn thiếu gì, bấm nút nào tiếp */
const hdBat=()=>khaiTruong()&&D&&(D.hdN||0)<HD_SO_TO;
function hdVe(){
  document.querySelectorAll('#app .goi-y,#app .hd-dich').forEach(e=>e.classList.remove('goi-y','hd-dich'));
  const h=$('hint'); if(!h) return;
  h.classList.toggle('coach',hdBat());
  if(!hdBat()||!D.slots) return;
  let c=D.slots.find(x=>x&&x.id===D.hdId);
  if(!c){let bi=-1;D.slots.forEach((x,i)=>{if(x&&(bi<0||x.p/x.max<D.slots[bi].p/D.slots[bi].max))bi=i});c=bi>=0?D.slots[bi]:null;D.hdId=c?c.id:null}
  const so=`${(D.hdN||0)+1}/${HD_SO_TO}`;
  if(!c){h.textContent=tl(`Hướng dẫn ${so} · Chờ khách vào bàn nhé`,`Tutorial ${so} · Wait for a customer to sit down`);return}
  const b=D.bowl, i=D.slots.indexOf(c), ban=$('tables').children[i];
  const thua=[...b.items].find(k=>!c.order.includes(k)&&!(k==='rau'&&lv('rau'))), thieu=c.order.find(k=>!b.items.has(k));
  let el, msg;
  if(thua){el=$('trash');msg=tl(`Tô có ${ING[thua].n} mà khách không gọi. Bấm Đổ bỏ để làm lại`,`The bowl has ${ING[thua].n}, which was not ordered. Tap Dump to start over`)}
  else if(thieu==='mi'){el=$('pad').querySelector('[data-k="mi"]');msg=tl('Bấm Mì để cho vắt mì vào tô','Tap Noodles to put noodles in the bowl')}
  else if(thieu){el=$('pad').querySelector(`[data-k="${thieu}"]`);msg=tl(`Khách gọi thêm ${ING[thieu].n}. Bấm nút đang sáng`,`The customer also wants ${ING[thieu].n}. Tap the glowing button`)}
  else if(!b.broth){el=$('pour');msg=tl('Đủ món rồi! Bấm Chan nước lèo','All toppings in! Tap Add broth')}
  else{el=ban;msg=tl('Bấm vào khách đang sáng để bưng tô ra','Tap the glowing customer to serve')}
  if(ban) ban.classList.add('hd-dich');
  if(el) el.classList.add('goi-y');
  h.textContent=tl(`Hướng dẫn ${so} · `,`Tutorial ${so} · `)+msg;
}
/* Gọi khi bưng đúng một tô */
function hdXong(){
  if(!hdBat()) return;
  D.hdN=(D.hdN||0)+1; D.hdId=null;
  if(D.hdN>=HD_SO_TO){setTimeout(renderBowl,0);setTimeout(()=>toast(tl('Quen tay rồi đó! Giờ tự bán nhé','You got it! Keep selling on your own')),500)}
}

/* Lượt chơi thử có điểm dương được giữ 24 giờ: tạo tài khoản xong thì server tính (nhan_luot_thu) */
function giuLuotThu(est){
  if(ranked||est<=0) return;
  try{const cu=JSON.parse(localStorage.getItem(THU_KEY)||'null');
    if(cu&&Date.now()-cu.at<864e5&&cu.est>=est) return;
    localStorage.setItem(THU_KEY,JSON.stringify({v:1,diff,so_ngay:S.day,doanh_thu:S.total,tim_mat:S.lost||0,est,at:Date.now()}))}catch(e){}
}
function luotThuCho(){
  try{const r=JSON.parse(localStorage.getItem(THU_KEY)||'null');
    if(r&&Date.now()-r.at<864e5) return r; localStorage.removeItem(THU_KEY)}catch(e){}
  return null;
}
async function nhanLuotThu(){
  const r=luotThuCho();
  if(!r||!sb||!user||!profile||(profile.so_luot||0)>0) return;
  const {data,error}=await sb.rpc('nhan_luot_thu',{p_do_kho:r.diff,p_so_ngay:r.so_ngay,p_doanh_thu:r.doanh_thu,p_tim_mat:r.tim_mat});
  try{localStorage.removeItem(THU_KEY)}catch(e){}
  if(error||!data) return;
  await loadProfile();
  if(typeof home==='function'&&$('go')) home();
  toast(tl(`Đã tính lượt chơi thử: +${data.delta} ĐBK`,`Your trial run counted: +${data.delta} BKP`));
}
const thuHTML=()=>{const r=!ranked&&luotThuCho();
  return r?`<p class="thu-giu">${tl(`Lượt chơi thử vừa rồi được <b>+${r.est} ĐBK</b>. Tạo tài khoản trong 24 giờ để giữ số điểm này.`,`Your last trial run earned <b>+${r.est} BKP</b>. Create an account within 24 hours to keep it.`)}</p>`:''};

/* Màn chính: độ khó cao khoá mềm với người mới (bấm 2 lần mới chọn) */
const khoaMemKho=k=>k!=='thuong'&&laNguoiMoi();
