/* Mì Quảng Bách Khoa · js/cau-hinh.js: Cấu hình, dữ liệu game (nguyên liệu, khách, nâng cấp, độ khó) và biến trạng thái dùng chung.
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
const PHIEN_BAN='2.19.1';   // nhớ đổi cả ?v= trong index.html
/* ================= Cấu hình ================= */
const SB_URL = 'https://fvacenxojembebqqxgfp.supabase.co';
const SB_KEY = 'sb_publishable_w4bY8tj9UT-6sFUlXBlOdA_XBEH76qD'; // khoá công khai, an toàn khi để ở client
let sb = null;
try { sb = window.supabase.createClient(SB_URL, SB_KEY); } catch (e) { sb = null; }
// Tiếng Anh: dịch thông báo lỗi của server, giữ bản gốc ở error.vi để code so khớp (ngon-ngu.js)
if(sb && EN){ const rpc0 = sb.rpc.bind(sb);
  sb.rpc = (...a) => { const q = rpc0(...a), th = q.then.bind(q);
    q.then = (ok, no) => th(r => { if(r && r.error && r.error.message){ r.error.vi = r.error.message; r.error.message = tLoi(r.error.message) } return r }).then(ok, no);
    return q } }

/* ================= Dữ liệu game ================= */
const ING = {
  // Mì Quảng: sợi bánh phở dẹt, to bản, màu trắng ngà (bản 2.17.0; trước đây vẽ sợi vàng nhỏ trông như mì tôm)
  mi:{n:tl('Mì','Noodles'),s:'<g fill="none" stroke-linecap="round"><path d="M5 12c6-4 11 4 15 0s9 4 15 0 M5 20.5c6-4 11 4 15 0s9 4 15 0 M5 29c6-4 11 4 15 0s9 4 15 0" stroke="#B49D74" stroke-width="9"/><path d="M5 12c6-4 11 4 15 0s9 4 15 0 M5 20.5c6-4 11 4 15 0s9 4 15 0 M5 29c6-4 11 4 15 0s9 4 15 0" stroke="#FFFDF5" stroke-width="6.6"/><path d="M9 10.6c2.5-1.3 4.5-1.1 6.5 0M9 19.1c2.5-1.3 4.5-1.1 6.5 0M9 27.6c2.5-1.3 4.5-1.1 6.5 0" stroke="#fff" stroke-width="1.3"/></g>'},
  tom:{n:tl('Tôm','Shrimp'),s:'<path d="M11 27a10 10 0 1 1 17-13" fill="none" stroke="#E8622C" stroke-width="7" stroke-linecap="round"/><path d="M13 19l5 2M17 13l3 4M23 11l1 5" stroke="#F6A57E" stroke-width="1.6" stroke-linecap="round"/><path d="M28 14l7-4-2 9z" fill="#E8622C"/><circle cx="12" cy="25" r="1.6" fill="#3a1d10"/>'},
  thit:{n:tl('Thịt heo','Pork'),s:'<rect x="5" y="12" width="30" height="16" rx="6" fill="#D98B7A" stroke="#8a4a3a" stroke-width="1.5"/><path d="M9 17h22" stroke="#F6E3D6" stroke-width="3" stroke-linecap="round"/>'},
  ga:{n:tl('Gà ta','Chicken'),s:'<ellipse cx="16" cy="17" rx="11" ry="9" fill="#B8692E"/><path d="M24 23l7 7" stroke="#F3E6CF" stroke-width="4" stroke-linecap="round"/><circle cx="33" cy="30" r="2.8" fill="#F3E6CF"/><circle cx="30" cy="33" r="2.8" fill="#F3E6CF"/>'},
  trung:{n:tl('Trứng cút','Quail egg'),s:'<ellipse cx="20" cy="21" rx="10" ry="12" fill="#F4ECDC" stroke="#9b8466" stroke-width="1.5"/><circle cx="16" cy="16" r="1.8" fill="#6b5236"/><circle cx="23" cy="23" r="2.2" fill="#6b5236"/><circle cx="17" cy="27" r="1.4" fill="#6b5236"/><circle cx="24" cy="15" r="1.2" fill="#6b5236"/>'},
  dau:{n:tl('Đậu phộng','Peanuts'),s:'<circle cx="14" cy="20" r="7" fill="#D9A45B"/><circle cx="26" cy="20" r="7" fill="#D9A45B"/><path d="M14 14v12M26 14v12" stroke="#a8743a" stroke-width="1.2"/>'},
  banhtrang:{n:tl('Bánh tráng','Rice cracker'),s:'<circle cx="20" cy="20" r="14" fill="#EFD39A" stroke="#c99a4b" stroke-width="1.5"/><g fill="#2b2118"><ellipse cx="14" cy="15" rx="1.4" ry=".8"/><ellipse cx="24" cy="13" rx="1.4" ry=".8"/><ellipse cx="27" cy="22" rx="1.4" ry=".8"/><ellipse cx="17" cy="25" rx="1.4" ry=".8"/><ellipse cx="21" cy="19" rx="1.4" ry=".8"/><ellipse cx="12" cy="21" rx="1.4" ry=".8"/></g>'},
  rau:{n:tl('Rau sống','Herbs'),s:'<path d="M7 33C7 17 19 6 34 6c0 15-11 27-27 27z" fill="#4E9A3F"/><path d="M8 32L30 10" stroke="#2F6B3A" stroke-width="2" stroke-linecap="round"/>'}
};
const TOPS=['tom','thit','ga','trung','dau','banhtrang','rau'];
const POS={tom:[52,26],thit:[92,20],ga:[134,22],trung:[170,32],dau:[70,44],banhtrang:[110,40],rau:[148,46]};
const KHACH=[
  [tl('CNTT','IT'),tl('Công nghệ thông tin','IT'),'#1B3A6B'],[tl('CK','ME'),tl('Cơ khí','Mechanical'),'#6B4A2B'],[tl('Điện','EE'),tl('Điện','Electrical'),'#C8321E'],
  [tl('XD','CE'),tl('Xây dựng','Civil'),'#5A6270'],[tl('Hóa','Chem'),tl('Hóa','Chemistry'),'#2F6B3A'],[tl('ĐTVT','ECE'),tl('Điện tử viễn thông','Electronics'),'#7B3F8C'],
  [tl('KT','Arch'),tl('Kiến trúc','Architecture'),'#B5651D'],[tl('MT','Env'),tl('Môi trường','Environment'),'#2E7D7A'],[tl('GT','TE'),tl('Cơ khí giao thông','Transport Eng.'),'#8A2E4B']];
const LINES=EN?['Calculus 2 exam this afternoon, need fuel!','Project deadline, hurry please','Just got out of class in building H','Coded all night, starving','Just back from football on campus','Library right after this','Going home Sunday, last bowl for now','Extra chili please','Lab until 9 pm, need a snack','Heard this is the best bowl in Lien Chieu']
  :['Chiều thi Giải tích 2, ăn cho tỉnh!','Chạy deadline đồ án, nhanh giúp em','Vừa học xong ở khu H','Code xuyên đêm, đói quá chú ơi','Mới đá bóng ở sân trường về','Ăn xong lên thư viện ôn bài','Chủ nhật về quê, nay ăn bữa chót','Cho em xin thêm ớt nha','Lab tới 9 giờ tối, ăn lót dạ','Nghe nói tô ở đây ngon nhất Liên Chiểu'];
const EVENTS=[
  {n:tl('Ngày thường','Normal day'),d:tl('Khách đến đều đều.','Customers arrive steadily.'),spawn:1,pat:1,tip:1},
  {n:tl('Giờ tan học','After class'),d:tl('Khách đông hơn một chút.','A bit busier than usual.'),spawn:.8,pat:1,tip:1},
  {n:tl('Tuần thi cuối kỳ','Finals week'),d:tl('Khách đông gấp rưỡi và rất vội.','50% more customers, all in a hurry.'),spawn:.62,pat:.8,tip:1},
  {n:tl('Mưa bão miền Trung','Central storm'),d:tl('Ít khách, nhưng ai ghé cũng tip gấp đôi.','Few customers, but everyone tips double.'),spawn:1.5,pat:1.2,tip:2}];
/* Nâng cấp: mỗi món có 1 hoặc nhiều cấp; S.upg[id] = cấp đang có */
const UPG=[
  {id:'quat',lv:[
    {n:tl('Quạt máy','Electric fan'),d:tl('Khách chờ lâu hơn 15%','Customers wait 15% longer'),c:150},
    {n:tl('Quạt hơi nước','Mist fan'),d:tl('Khách chờ lâu hơn 30%','Customers wait 30% longer'),c:300},
    {n:tl('Máy lạnh','Air conditioner'),d:tl('Khách chờ lâu hơn 45%','Customers wait 45% longer'),c:550}]},
  {id:'phubep',lv:[{n:tl('Phụ bếp','Kitchen helper'),d:tl('Tô nào cũng có sẵn vắt mì','Every bowl starts with noodles'),c:250}]},
  {id:'noi',lv:[{n:tl('Nồi nước lèo 50 lít','50-litre broth pot'),d:tl('Tự chan nước lèo khi bưng ra, bớt một thao tác','Broth is added automatically when serving, one less step'),c:350}]},
  {id:'rau',lv:[{n:tl('Rổ rau sống trên bàn','Herb basket on tables'),d:tl('Khách tự lấy rau, không cần cho rau vào tô','Customers take their own herbs, no need to add them'),c:200}]},
  {id:'bang',lv:[
    {n:tl('Bảng hiệu Bách Khoa','Bach Khoa sign'),d:tl('Giá +10%, khách đến nhanh hơn 6%','Price +10%, customers arrive 6% faster'),c:200},
    {n:tl('Bảng đèn LED','LED sign'),d:tl('Giá +20%, khách đến nhanh hơn 12%','Price +20%, customers arrive 12% faster'),c:450}]},
  {id:'wifi',lv:[{n:tl('Wifi miễn phí','Free wifi'),d:tl('Sinh viên ngồi lâu, tip nhiều hơn 50%','Students stay longer, tips +50%'),c:300}]},
  {id:'ban',lv:[{n:tl('Thêm bàn thứ 4','4th table'),d:tl('Phục vụ 4 khách cùng lúc','Serve 4 customers at once'),c:400}]},
  {id:'the',lv:[{n:tl('Thẻ tích điểm sinh viên','Student loyalty card'),d:tl('Mỗi ngày giữ chân 1 khách sắp bỏ về, không mất tim','Once a day, keep a leaving customer, no heart lost'),c:500}]},
  {id:'ghe',lv:[
    {n:tl('Ghế chờ có mái che','Covered waiting seats'),d:tl('Hàng chờ thêm 2 chỗ, khách xếp hàng kiên nhẫn hơn 25%','2 more queue spots, queue patience +25%'),c:300},
    {n:tl('Trà đá miễn phí cho hàng chờ','Free iced tea for the queue'),d:tl('Khách xếp hàng kiên nhẫn hơn 50%','Queue patience +50%'),c:550}]},
  {id:'fanpage',lv:[
    {n:tl('Fanpage quán','Shop fanpage'),d:tl('Khách đến nhanh hơn 10%','Customers arrive 10% faster'),c:250},
    {n:tl('Video TikTok viral','Viral TikTok video'),d:tl('Khách đến nhanh hơn 20%, tip thêm 20%','Customers arrive 20% faster, tips +20%'),c:600}]},
  {id:'tv',lv:[{n:tl('TV chiếu LMHT, Valorant','TV showing LoL, Valorant'),d:tl('Giờ cao điểm khách kiên nhẫn hơn 30%','Rush hour patience +30%'),c:300}]},
  {id:'combo',lv:[{n:tl('Thực đơn combo sinh viên','Student combo menu'),d:tl('Một nửa số khách gọi bớt 1 món, giá tô giảm 5k','Half of customers order 1 item less, bowl price −5k'),c:350}]},
  {id:'qr',lv:[{n:tl('Thanh toán QR','QR payment'),d:tl('Khách trả nhanh, mỗi tô thêm 3k','Faster payment, +3k per bowl'),c:200}]},
  {id:'chay',lv:[{n:tl('Nhân viên chạy bàn','Waiter'),d:tl('Chan nước lèo xong, tô tự bưng tới khách gọi đúng món','After adding broth, the bowl goes to the customer who ordered it'),c:700}]}];
const lv=id=>S.upg[id]||0;
/* Độ khó: phải khớp hàm he_so() trên server */
const DIFF={
  thuong:{n:tl('Thường','Normal'),hs:1,  pat:1,   spawn:1,   top:0,   tgt:1,   color:'#2F6B3A'},
  kho:   {n:tl('Khó','Hard'),   hs:1.5,pat:.8,  spawn:.85, top:.6,  tgt:1.15,color:'#C99A1E'},
  dianguc:{n:tl('Địa ngục','Hell'),hs:2.2,pat:.62,spawn:.7,top:1.2, tgt:1.3, color:'#C8321E'},
  bk:    {n:tl('Bách Khoa','Bach Khoa'),hs:3, pat:.52, spawn:.6, top:1.6, tgt:1.4, color:'#1B3A6B'}};
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
