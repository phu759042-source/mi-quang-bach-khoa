"""Chụp lại ảnh README (bản 2.17.0) bằng dữ liệu minh hoạ, Supabase giả, chặn mạng ngoài.
Dùng: python3 shots2.py <repo> <thư mục ra>"""
import sys, subprocess, time, os
from playwright.sync_api import sync_playwright

REPO, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '-d', REPO], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

STUB = r"""
(() => {
  try{ localStorage.setItem('mqbk-push-later', String(Date.now()+864e6)) }catch(e){}
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const yest = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(Date.now()-864e5));
  const KHOA = [{id:'cntt',ten:'Công nghệ Thông tin'},{id:'ck',ten:'Cơ khí'},{id:'dien',ten:'Điện'},{id:'xd',ten:'Xây dựng Dân dụng'},
    {id:'dtvt',ten:'Điện tử và trí tuệ nhân tạo'},{id:'hoa',ten:'Hóa'},{id:'kt',ten:'Kiến trúc'},{id:'mt',ten:'Môi trường'}];
  const kid = n => KHOA.find(k=>k.ten===n)?.id ?? null;
  const SV = [['Lê Minh Anh','23T_DT1','Công nghệ Thông tin',24800,9,1532],['Phạm Gia Huy','24DT2','Điện tử và trí tuệ nhân tạo',23150,4,1410],
    ['Trần Thảo Vy','23KT1','Kiến trúc',21900,12,1288],['Nguyễn Hải Đăng',null,null,19850,0,1365],['Ngô Khánh Linh','24T_KHDL','Công nghệ Thông tin',18700,3,1250],
    ['Đặng Hữu Phước','23D2','Điện',17600,0,1190],['Bùi Ngọc Hân','22H5','Hóa',16550,2,1215],['Hoàng Đức Tài','24X1A','Xây dựng Dân dụng',15400,1,1176],
    ['Sinh viên Demo','26T_ATTT','Công nghệ Thông tin',14200,3,1236],['Huỳnh Mỹ Duyên','23MT','Môi trường',13100,0,1200]];
  let sv=0;
  const BXH = SV.map((r,i)=>({id:i===8?'demo':'u'+i,ten:r[0],lop:r[1],khoa:r[2],khoa_id:kid(r[2]),sinh_vien:!!r[1],diem:r[3],hang:i+1,
    hang_sv:r[1]?++sv:null,chuoi:r[4],avatar_url:null,elo:r[5],solo_thang:i%4+1,solo_thua:i%3,solo_hoa:i%2,so_luot:5}));
  const LOP = [['23T_DT1','cntt',14,16200],['24DT2','dtvt',11,14880],['23KT1','kt',10,14020],['22C1A','ck',12,12750],['24T_KHDL','cntt',9,11900],['23D2','dien',10,11040]]
    .map((r,i)=>({lop:r[0],khoa_id:r[1],so_nguoi:r[2],diem:r[3],hang:i+1}));
  const BKH = [['Công nghệ Thông tin',142,13880],['Điện tử và trí tuệ nhân tạo',87,12150],['Kiến trúc',54,11020],['Cơ khí',96,10400],['Điện',71,9870],['Hóa',40,8600]]
    .map((r,i)=>({khoa:r[0],khoa_id:kid(r[0]),so_nguoi:r[1],diem:r[2],hang:i+1}));
  const PROFILE = {id:'demo',ten:'Sinh viên Demo',khoa_id:'cntt',lop:'26T_ATTT',sinh_vien:true,diem:14200,so_luot:23,ngay_xa_nhat:7,chuoi:3,ngay_chuoi:yest,chuoi_dai_nhat:6,
    avatar_url:null,avatar_khung:null,elo:1236,solo_thang:4,solo_thua:2,solo_hoa:1};
  function q(table){
    const f=[]; let single=false;
    const b={select(){return b},order(){return b},limit(){return b},range(){return b},in(k,v){f.push([k,'in',v]);return b},or(){return b},gt(k,v){f.push([k,'gt',v]);return b},
      gte(){return b},lte(){return b},neq(){return b},is(){return b},not(){return b},
      eq(k,v){f.push([k,'eq',v]);return b},maybeSingle(){single=true;return b},single(){single=true;return b},
      then(ok,no){let d=[];
        const ev=k=>f.find(x=>x[0]===k)?.[2];
        if(table==='khoa') d=KHOA;
        else if(table==='profiles'){ if(single) d=PROFILE; else { d=BXH.map(x=>({...x})); if(ev('sinh_vien')!==undefined) d=d.filter(x=>x.sinh_vien===ev('sinh_vien')); d.sort((a,b)=>b.elo-a.elo) } }
        else if(table==='bxh_sinh_vien'){ if(single) d={hang:9,hang_sv:8}; else { d=BXH; if(ev('sinh_vien')!==undefined) d=d.filter(x=>x.sinh_vien===ev('sinh_vien')) } }
        else if(table==='bxh_lop') d=LOP; else if(table==='bxh_khoa') d=BKH;
        else if(single) d=null;
        return Promise.resolve({data:d,error:null}).then(ok,no)}};
    return b;
  }
  const rpc = async (fn,args)=>{
    if(fn==='ghi_luot_truy_cap') return {data:{luot:18452,nguoi:3176,hom_nay:214,tong:18452},error:null};
    if(fn==='bat_dau_luot') return {data:101,error:null};
    if(fn==='nop_ket_qua') return {data:{delta:929,diem:15129,hang:8,chuoi:4,chuoi_moi:true,chuoi_dai_nhat:6},error:null};
    return {data:null,error:null};
  };
  const ch=()=>{const c=new Proxy({},{get:(t,k)=>{ if(k==='then') return undefined; if(k==='presenceState') return ()=>({});
    return (...a)=>{ if(k==='subscribe'){const cb=a[0]; if(typeof cb==='function') setTimeout(()=>cb('SUBSCRIBED'),0); return c}
      if(['send','track','untrack','unsubscribe'].includes(k)) return Promise.resolve('ok'); return c } }}); return c};
  window.supabase = {createClient:()=>({
    from:q, rpc, channel:ch, removeChannel(){}, getChannels:()=>[],
    auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}, getSession:async()=>({data:{session:window.__guest?null:{user:{id:'demo',email:'demo@example.com'}}}}), signOut:async()=>({})},
    storage:{from:()=>({upload:async()=>({}),remove:async()=>({}),getPublicUrl:()=>({data:{publicUrl:''}})})}
  })};
})();
"""
FONTS = ":root{--display:'Inter',system-ui,sans-serif!important;--body:'Inter',system-ui,sans-serif!important}"


def new_page(b, w, h, scheme='light', guest=False):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, color_scheme=scheme, locale='vi-VN',
                        timezone_id='Asia/Ho_Chi_Minh', has_touch=w < 600, is_mobile=w < 600,
                        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36')
    ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://localhost:8766/') else r.abort())
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false});" + STUB + ("window.__guest=true;" if guest else ""))
    p = ctx.new_page()
    p.on('pageerror', lambda e: print('  LỖI JS', e))
    p.goto('http://localhost:8766/index.html')
    p.add_style_tag(content=FONTS)
    p.wait_for_timeout(1200)
    return p


GAME_SETUP = """() => {
  S.day=3; S.upg={quat:1,phubep:0,bang:1}; S.money=640; S.total=2350; S.rep=4; S.lost=1;
  startDay(); running=false;
  D.t=38; D.earned=410; D.served=9; D.rushSaid=true; D.ev=EVENTS[2];
  for(let k=0;k<5;k++) spawn();
  D.slots.forEach((c,i)=>{ if(c){ c.p=c.max*[0.85,0.45,0.18][i]; } });
  D.queue.forEach((c,i)=>{ c.q=c.qmax*(0.7-0.3*i) });
  const first=D.slots[0]; D.bowl.items=new Set(['mi',...first.order.filter(k=>k!=='mi').slice(0,2)]);
  renderAll(); updateBars();
}"""


def shoot(p, name):
    p.wait_for_timeout(400); p.screenshot(path=f'{OUT}/{name}.png'); print('saved', name)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = new_page(b, 1280, 800)
    p.evaluate(GAME_SETUP); shoot(p, 'desktop-gameplay')
    p.context.close()
    p = new_page(b, 390, 844)
    shoot(p, 'mobile-home')
    p.evaluate(GAME_SETUP); shoot(p, 'mobile-gameplay')
    p.evaluate("()=>{S.day=2;S.money=1180;S.total=2050;S.lost=1;S.upg={quat:1};D.earned=1240;D.served=27;D.lost=1;showShop()}")
    shoot(p, 'mobile-shop')
    p.evaluate("()=>{S.day=6;S.total=6420;S.lost=1;diff='kho';finishRun('Bạn dừng đúng lúc, giữ lại thành quả.',true)}")
    p.wait_for_timeout(2600)
    if p.locator('#sNext').count(): shoot(p, 'mobile-streak'); p.click('#sNext'); p.wait_for_timeout(5000)
    shoot(p, 'mobile-result')
    p.evaluate("()=>{try{localStorage.setItem('mqbk-loc','tat_ca')}catch(e){}; lbLoc='tat_ca'; leaderboard('sv')}"); p.wait_for_timeout(700); shoot(p, 'mobile-bxh-sv')
    p.click('[data-loc="sv"]'); p.wait_for_timeout(700); shoot(p, 'mobile-bxh-sv-loc')
    p.click('[data-loc="tat_ca"]'); p.wait_for_timeout(300)
    p.evaluate("()=>leaderboard('lop')"); p.wait_for_timeout(700); shoot(p, 'mobile-bxh-lop')
    p.evaluate("()=>leaderboard('khoa')"); p.wait_for_timeout(700); shoot(p, 'mobile-bxh-khoa')
    p.evaluate("()=>home()"); p.wait_for_timeout(400)
    p.evaluate("()=>profileScreen()"); p.wait_for_timeout(500); p.click('[data-sv="0"]'); shoot(p, 'mobile-ho-so-ngoai-bk')
    p.context.close()
    p = new_page(b, 390, 844, scheme='dark')
    shoot(p, 'mobile-home-dark')
    p.evaluate(GAME_SETUP); shoot(p, 'mobile-gameplay-dark')
    p.context.close()
    p = new_page(b, 390, 844, guest=True)
    shoot(p, 'mobile-login')
    p.context.close()
    b.close()
srv.terminate()
