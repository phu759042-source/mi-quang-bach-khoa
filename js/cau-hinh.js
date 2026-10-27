/* Mì Quảng Bách Khoa · js/cau-hinh.js: Cấu hình, dữ liệu game (nguyên liệu, khách, nâng cấp, độ khó) và biến trạng thái dùng chung.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
const PHIEN_BAN='2.17.0';   // nhớ đổi cả ?v= trong index.html
/* ================= Cấu hình ================= */
const SB_URL = 'https://fvacenxojembebqqxgfp.supabase.co';
const SB_KEY = 'sb_publishable_w4bY8tj9UT-6sFUlXBlOdA_XBEH76qD'; // khoá công khai, an toàn khi để ở client
let sb = null;
try { sb = window.supabase.createClient(SB_URL, SB_KEY); } catch (e) { sb = null; }

/* ================= Dữ liệu game ================= */
const ING = {
  // Mì Quảng: sợi bánh phở dẹt, to bản, màu trắng ngà (bản 2.17.0; trước đây vẽ sợi vàng nhỏ trông như mì tôm)
  mi:{n:'Mì',s:'<g fill="none" stroke-linecap="round"><path d="M5 12c6-4 11 4 15 0s9 4 15 0 M5 20.5c6-4 11 4 15 0s9 4 15 0 M5 29c6-4 11 4 15 0s9 4 15 0" stroke="#B49D74" stroke-width="9"/><path d="M5 12c6-4 11 4 15 0s9 4 15 0 M5 20.5c6-4 11 4 15 0s9 4 15 0 M5 29c6-4 11 4 15 0s9 4 15 0" stroke="#FFFDF5" stroke-width="6.6"/><path d="M9 10.6c2.5-1.3 4.5-1.1 6.5 0M9 19.1c2.5-1.3 4.5-1.1 6.5 0M9 27.6c2.5-1.3 4.5-1.1 6.5 0" stroke="#fff" stroke-width="1.3"/></g>'},
  tom:{n:'Tôm',s:'<path d="M11 27a10 10 0 1 1 17-13" fill="none" stroke="#E8622C" stroke-width="7" stroke-linecap="round"/><path d="M13 19l5 2M17 13l3 4M23 11l1 5" stroke="#F6A57E" stroke-width="1.6" stroke-linecap="round"/><path d="M28 14l7-4-2 9z" fill="#E8622C"/><circle cx="12" cy="25" r="1.6" fill="#3a1d10"/>'},
  thit:{n:'Thịt heo',s:'<rect x="5" y="12" width="30" height="16" rx="6" fill="#D98B7A" stroke="#8a4a3a" stroke-width="1.5"/><path d="M9 17h22" stroke="#F6E3D6" stroke-width="3" stroke-linecap="round"/>'},
  ga:{n:'Gà ta',s:'<ellipse cx="16" cy="17" rx="11" ry="9" fill="#B8692E"/><path d="M24 23l7 7" stroke="#F3E6CF" stroke-width="4" stroke-linecap="round"/><circle cx="33" cy="30" r="2.8" fill="#F3E6CF"/><circle cx="30" cy="33" r="2.8" fill="#F3E6CF"/>'},
  trung:{n:'Trứng cút',s:'<ellipse cx="20" cy="21" rx="10" ry="12" fill="#F4ECDC" stroke="#9b8466" stroke-width="1.5"/><circle cx="16" cy="16" r="1.8" fill="#6b5236"/><circle cx="23" cy="23" r="2.2" fill="#6b5236"/><circle cx="17" cy="27" r="1.4" fill="#6b5236"/><circle cx="24" cy="15" r="1.2" fill="#6b5236"/>'},
  dau:{n:'Đậu phộng',s:'<circle cx="14" cy="20" r="7" fill="#D9A45B"/><circle cx="26" cy="20" r="7" fill="#D9A45B"/><path d="M14 14v12M26 14v12" stroke="#a8743a" stroke-width="1.2"/>'},
  banhtrang:{n:'Bánh tráng',s:'<circle cx="20" cy="20" r="14" fill="#EFD39A" stroke="#c99a4b" stroke-width="1.5"/><g fill="#2b2118"><ellipse cx="14" cy="15" rx="1.4" ry=".8"/><ellipse cx="24" cy="13" rx="1.4" ry=".8"/><ellipse cx="27" cy="22" rx="1.4" ry=".8"/><ellipse cx="17" cy="25" rx="1.4" ry=".8"/><ellipse cx="21" cy="19" rx="1.4" ry=".8"/><ellipse cx="12" cy="21" rx="1.4" ry=".8"/></g>'},
  rau:{n:'Rau sống',s:'<path d="M7 33C7 17 19 6 34 6c0 15-11 27-27 27z" fill="#4E9A3F"/><path d="M8 32L30 10" stroke="#2F6B3A" stroke-width="2" stroke-linecap="round"/>'}
};
const TOPS=['tom','thit','ga','trung','dau','banhtrang','rau'];
const POS={tom:[52,26],thit:[92,20],ga:[134,22],trung:[170,32],dau:[70,44],banhtrang:[110,40],rau:[148,46]};
const KHACH=[
  ['CNTT','Công nghệ thông tin','#1B3A6B'],['CK','Cơ khí','#6B4A2B'],['Điện','Điện','#C8321E'],
  ['XD','Xây dựng','#5A6270'],['Hóa','Hóa','#2F6B3A'],['ĐTVT','Điện tử viễn thông','#7B3F8C'],
  ['KT','Kiến trúc','#B5651D'],['MT','Môi trường','#2E7D7A'],['GT','Cơ khí giao thông','#8A2E4B']];
const LINES=['Chiều thi Giải tích 2, ăn cho tỉnh!','Chạy deadline đồ án, nhanh giúp em','Vừa học xong ở khu H','Code xuyên đêm, đói quá chú ơi','Mới đá bóng ở sân trường về','Ăn xong lên thư viện ôn bài','Chủ nhật về quê, nay ăn bữa chót','Cho em xin thêm ớt nha','Lab tới 9 giờ tối, ăn lót dạ','Nghe nói tô ở đây ngon nhất Liên Chiểu'];
const EVENTS=[
  {n:'Ngày thường',d:'Khách đến đều đều.',spawn:1,pat:1,tip:1},
  {n:'Giờ tan học',d:'Khách đông hơn một chút.',spawn:.8,pat:1,tip:1},
  {n:'Tuần thi cuối kỳ',d:'Khách đông gấp rưỡi và rất vội.',spawn:.62,pat:.8,tip:1},
  {n:'Mưa bão miền Trung',d:'Ít khách, nhưng ai ghé cũng tip gấp đôi.',spawn:1.5,pat:1.2,tip:2}];
/* Nâng cấp: mỗi món có 1 hoặc nhiều cấp; S.upg[id] = cấp đang có */
const UPG=[
  {id:'quat',lv:[
    {n:'Quạt máy',d:'Khách chờ lâu hơn 15%',c:150},
    {n:'Quạt hơi nước',d:'Khách chờ lâu hơn 30%',c:300},
    {n:'Máy lạnh',d:'Khách chờ lâu hơn 45%',c:550}]},
  {id:'phubep',lv:[{n:'Phụ bếp',d:'Tô nào cũng có sẵn vắt mì',c:250}]},
  {id:'noi',lv:[{n:'Nồi nước lèo 50 lít',d:'Tự chan nước lèo khi bưng ra, bớt một thao tác',c:350}]},
  {id:'rau',lv:[{n:'Rổ rau sống trên bàn',d:'Khách tự lấy rau, không cần cho rau vào tô',c:200}]},
  {id:'bang',lv:[
    {n:'Bảng hiệu Bách Khoa',d:'Giá +10%, khách đến nhanh hơn 6%',c:200},
    {n:'Bảng đèn LED',d:'Giá +20%, khách đến nhanh hơn 12%',c:450}]},
  {id:'wifi',lv:[{n:'Wifi miễn phí',d:'Sinh viên ngồi lâu, tip nhiều hơn 50%',c:300}]},
  {id:'ban',lv:[{n:'Thêm bàn thứ 4',d:'Phục vụ 4 khách cùng lúc',c:400}]},
  {id:'the',lv:[{n:'Thẻ tích điểm sinh viên',d:'Mỗi ngày giữ chân 1 khách sắp bỏ về, không mất tim',c:500}]},
  {id:'ghe',lv:[
    {n:'Ghế chờ có mái che',d:'Hàng chờ thêm 2 chỗ, khách xếp hàng kiên nhẫn hơn 25%',c:300},
    {n:'Trà đá miễn phí cho hàng chờ',d:'Khách xếp hàng kiên nhẫn hơn 50%',c:550}]},
  {id:'fanpage',lv:[
    {n:'Fanpage quán',d:'Khách đến nhanh hơn 10%',c:250},
    {n:'Video TikTok viral',d:'Khách đến nhanh hơn 20%, tip thêm 20%',c:600}]},
  {id:'tv',lv:[{n:'TV chiếu LMHT, Valorant',d:'Giờ cao điểm khách kiên nhẫn hơn 30%',c:300}]},
  {id:'combo',lv:[{n:'Thực đơn combo sinh viên',d:'Một nửa số khách gọi bớt 1 món, giá tô giảm 5k',c:350}]},
  {id:'qr',lv:[{n:'Thanh toán QR',d:'Khách trả nhanh, mỗi tô thêm 3k',c:200}]},
  {id:'chay',lv:[{n:'Nhân viên chạy bàn',d:'Chan nước lèo xong, tô tự bưng tới khách gọi đúng món',c:700}]}];
const lv=id=>S.upg[id]||0;
/* Độ khó: phải khớp hàm he_so() trên server */
const DIFF={
  thuong:{n:'Thường',hs:1,  pat:1,   spawn:1,   top:0,   tgt:1,   color:'#2F6B3A'},
  kho:   {n:'Khó',   hs:1.5,pat:.8,  spawn:.85, top:.6,  tgt:1.15,color:'#C99A1E'},
  dianguc:{n:'Địa ngục',hs:2.2,pat:.62,spawn:.7,top:1.2, tgt:1.3, color:'#C8321E'},
  bk:    {n:'Bách Khoa',hs:3, pat:.52, spawn:.6, top:1.6, tgt:1.4, color:'#1B3A6B'}};
const phat=k=>Math.round(15*DIFF[k].hs**2);
const DAYLEN=75;

/* ================= Trạng thái ================= */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=k=>`<svg viewBox="0 0 40 40">${ING[k].s}</svg>`;
let S,D,last=0,running=false;
let user=null, profile=null, myRank=null, khoaList=[], diff='thuong', runId=null, ranked=false, submitting=false;
try{ diff=localStorage.getItem('mqbk-diff')||'thuong'; if(!DIFF[diff]) diff='thuong'; }catch(e){}
let guestBest={day:0,money:0};
try{guestBest=JSON.parse(localStorage.getItem('mqbk-best'))||guestBest}catch(e){}

/* Mục tiêu: doanh thu chuẩn mỗi ngày, lấy từ mô phỏng 2.000 ván của người chơi khá
   (trung bình giữa người chơi giỏi và trung bình, có mua nâng cấp dần), nhân tỉ lệ 75% ở ngày 1, +3% mỗi ngày, tối đa 100% */
const REF={
  thuong:[820,1130,1630,1040,1540,2190,2550,2160,2380,2550,2440,2740],
  kho:[1000,1300,1690,1270,1760,2290,2490,2470,2430,2460,2310,2910],
  dianguc:[1160,1470,1660,1550,1970,2260,2330,2740,2390,2320,1920,2850],
  bk:[1230,1490,1450,1750,2010,2110,2030,2840,2250,2130,1670,2710]};
function target(d){
  const r=REF[diff]||REF.thuong;
  const ref=d<=12?r[d-1]:r[8+((d-1)%4)]*(1+.06*(d-12));
  return Math.round(ref*Math.min(1,.75+.03*(d-1))/10)*10;
}
const RUSH=[25,45]; // giờ cao điểm: khi đồng hồ còn 45s → 25s, khách đến gấp đôi
const inRush=()=>D&&D.t<=RUSH[1]&&D.t>RUSH[0];
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
