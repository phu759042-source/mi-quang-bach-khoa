"""Kiểm thử giao diện Mì Quảng Bách Khoa bằng 2 trình duyệt thật (Playwright + Chromium).

Chạy:   python3 tests/test_tro_choi.py            (ảnh chụp lưu ở tests/output/)
Cần:    pip install playwright && python3 -m playwright install chromium

- Không gọi Supabase thật. Lớp `Fake` bên dưới giả lập server với luật GIỐNG supabase/schema.sql
  (gửi/đồng ý/từ chối thách đấu, chống gian lận tiến độ, hết tim, xử thua khi rời trận, Elo K=32).
  Sửa luật trên server thì sửa cả ở đây.
- Mạng ra ngoài (font Google, thư viện CDN) bị chặn có chủ đích; game được thay `window.supabase` giả.
- Ngày bán rút còn 8 giây, cửa hàng solo 3 giây để chạy nhanh (khoảng 2–3 phút cả bài).
- Thoát với mã 1 nếu có kiểm tra hỏng hoặc lỗi JavaScript.

Các bước: tab Solo trước khi có trận, hiệu ứng thua + khoá nút ở chế độ thường, tìm bạn, chọn luật,
thông báo góc dưới phải có âm thanh, đếm ngược, thanh đối thủ, Sinh tồn, từ chối, Điểm cao 3 ngày,
bảng xếp hạng Solo, tải lại trang lúc đang chờ và giữa trận, xem lại, thống kê, trạng thái bận,
xem trực tiếp (trình duyệt thứ ba xem trận solo và lượt bán thường đến lúc chốt sổ), hồ sơ người khác."""
import sys, os, json, time, itertools, subprocess, threading
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(HERE)
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'output')
os.makedirs(OUT, exist_ok=True)
HS = {'thuong': 1, 'kho': 1.5, 'dianguc': 2.2, 'bk': 3}
now = lambda: datetime.now(timezone.utc)
iso = lambda d: d.isoformat()
lock = threading.Lock()

class Fake:
    def __init__(s):
        s.khoa = [{'id': 'cntt', 'ten': 'Công nghệ Thông tin'}, {'id': 'dtvt', 'ten': 'Điện tử Viễn thông'}]
        base = dict(diem=0, so_luot=3, ngay_xa_nhat=4, chuoi=0, ngay_chuoi=None, chuoi_dai_nhat=0, avatar_url=None,
                    avatar_khung=None, elo=1200, solo_thang=0, solo_thua=0, solo_hoa=0)
        s.prof = {'A': dict(base, id='A', ten='Nguyễn Tấn Phú', khoa_id='cntt', lop='26T_ATTT', diem=1420),
                  'B': dict(base, id='B', ten='Phạm Gia Huy', khoa_id='dtvt', lop='24DT2', diem=1300),
                  'C': dict(base, id='C', ten='Lê Minh Anh', khoa_id='cntt', lop='23T_DT1', diem=900)}
        s.rows, s.seq, s.q = {}, itertools.count(1), {'A': [], 'B': [], 'C': []}
        s.runs, s.run_seq, s.nop, s.bg, s.pres = {}, itertools.count(77), [], [], {}
        s.calls = []
        s.bcq = {}
        s.bb, s.tb, s.tb_seq = {}, [], itertools.count(1)      # bạn bè (khoá (a,b) với a<b), thông báo                                            # hàng đợi Realtime Broadcast theo người (giả lập kênh xem:<id>)

    def emit(s, r):
        for u in (r['a'], r['b']):
            s.q[u].append(dict(r))

    def score(s, dk, dt, tm):
        return round(dt * HS[dk] / 10) - round(tm * 15 * HS[dk] ** 2)

    def expire(s):
        for r in s.rows.values():
            if r['trang_thai'] == 'cho' and datetime.fromisoformat(r['het_han']) < now():
                r['trang_thai'] = 'het_han'; s.emit(r)

    def end(s, r, thang, why):
        if r['trang_thai'] != 'dang_dau': return
        pa, pb = s.prof[r['a']], s.prof[r['b']]
        ea = 1 / (1 + 10 ** ((pb['elo'] - pa['elo']) / 400))
        sa = 0.5 if thang is None else (1 if thang == r['a'] else 0)
        da = round(32 * (sa - ea))
        r.update(elo_a=pa['elo'], elo_b=pb['elo'], doi_a=da, doi_b=-da, trang_thai='xong', thang=thang, ly_do=why, ket_thuc=iso(now()))
        pa['elo'] += da; pb['elo'] -= da
        k = {1: ('solo_thang', 'solo_thua'), 0: ('solo_thua', 'solo_thang'), 0.5: ('solo_hoa', 'solo_hoa')}[sa]
        pa[k[0]] += 1; pb[k[1]] += 1

    def decide(s, r):
        if r['trang_thai'] != 'dang_dau': return
        sa, sb = (s.score(r['do_kho'], r[x + '_doanh_thu'], r[x + '_tim_mat']) for x in 'ab')
        ah, bh = r['a_het_tim_luc'], r['b_het_tim_luc']
        if r['che_do'] == 'sinh_ton' and (ah or bh):
            if ah and bh: s.end(r, r['b'] if ah < bh else r['a'] if bh < ah else None, 'het_tim')
            elif ah: s.end(r, r['b'], 'het_tim')
            else: s.end(r, r['a'], 'het_tim')
        elif r['a_xong'] and r['b_xong']:
            s.end(r, r['a'] if sa > sb else r['b'] if sb > sa else None, 'diem')

    def roi(s, r):
        if r['trang_thai'] != 'dang_dau' or now() < datetime.fromisoformat(r['bat_dau']): return
        t = time.time()
        ar = not r['a_xong'] and r['a_ping'] < t - 25
        br = not r['b_xong'] and r['b_ping'] < t - 25
        if ar and br: s.end(r, None, 'ca_hai_roi')
        elif ar: s.end(r, r['b'], 'roi_tran')
        elif br: s.end(r, r['a'], 'roi_tran')

    def bb_emit(s, r):                                        # realtime bảng ban_be cho hai người
        for x in (r['a'], r['b']): s.q[x].append(dict(r, _table='ban_be', _ev='UPDATE'))

    def tb_add(s, user, loai, tu):                            # giống _them_thong_bao
        s.tb = [t for t in s.tb if not (t['user_id'] == user and t['loai'] == loai and t['tu'] == tu)]
        t = dict(id=next(s.tb_seq), user_id=user, loai=loai, tu=tu, da_doc=False, tao_luc=iso(now()))
        s.tb.append(t); s.q[user].append(dict(t, _table='thong_bao', _ev='INSERT'))

    def rpc(s, u, fn, a):
        s.calls.append((u, fn))
        def err(m): return {'data': None, 'error': {'message': m}}
        if fn == 'ghi_luot_truy_cap': return {'data': {'luot': 321, 'nguoi': 45, 'hom_nay': 12, 'tong': 321}}
        if fn in ('gui_ket_ban', 'tra_loi_ket_ban', 'huy_ket_ban'):   # luật giống schema.sql phần 9
            o = a.get('p_b') or a.get('p_nguoi')
            if o == u: return err('Không thể tự kết bạn với mình')
            k = tuple(sorted((u, o))); r = s.bb.get(k)
            if fn == 'gui_ket_ban':
                if r and r['trang_thai'] == 'ban': return {'data': {'trang_thai': 'ban'}}
                if r and r['nguoi_gui'] == u: return {'data': {'trang_thai': 'da_gui'}}
                if r:
                    r['trang_thai'] = 'ban'; s.bb_emit(r); s.tb_add(o, 'dong_y_ket_ban', u); return {'data': {'trang_thai': 'ban'}}
                r = s.bb[k] = dict(a=k[0], b=k[1], nguoi_gui=u, trang_thai='cho', tao_luc=iso(now()), ket_ban_luc=None)
                s.bb_emit(r); s.tb_add(o, 'loi_moi_ket_ban', u); return {'data': {'trang_thai': 'da_gui'}}
            if fn == 'tra_loi_ket_ban':
                if not r or r['trang_thai'] != 'cho' or r['nguoi_gui'] != o: return {'data': {'trang_thai': r['trang_thai'] if r else 'khong'}}
                for t in s.tb:
                    if t['user_id'] == u and t['tu'] == o and t['loai'] == 'loi_moi_ket_ban': t['da_doc'] = True
                if a['p_dong_y']:
                    r['trang_thai'] = 'ban'; s.bb_emit(r); s.tb_add(o, 'dong_y_ket_ban', u); return {'data': {'trang_thai': 'ban'}}
                del s.bb[k]; s.bb_emit(dict(r, trang_thai='xoa')); return {'data': {'trang_thai': 'khong'}}
            if r: del s.bb[k]; s.bb_emit(dict(r, trang_thai='xoa'))
            s.tb = [t for t in s.tb if not (t['user_id'] == o and t['tu'] == u and t['loai'] == 'loi_moi_ket_ban')]
            return {'data': {'trang_thai': 'khong'}}
        if fn == 'doc_thong_bao':
            for t in s.tb:
                if t['user_id'] == u: t['da_doc'] = True
            return {'data': None}
        if fn == 'tim_nguoi_choi':
            q = a['p_q'].lower()
            res = [dict(id=p['id'], ten=p['ten'], lop=p['lop'], khoa=next(k['ten'] for k in s.khoa if k['id'] == p['khoa_id']),
                        diem=p['diem'], elo=p['elo'], avatar_url=None)
                   for p in s.prof.values() if p['id'] != u and (q in p['ten'].lower() or q in p['lop'].lower())]
            return {'data': res}
        if fn == 'bat_dau_luot':
            for k, v in s.runs.items():                       # giống _xu_ly_bo_cuoc: lượt cũ còn dở bị tính bỏ cuộc
                if v['trang_thai'] == 'dang_choi' and v['user_id'] == u: v.update(trang_thai='bo_cuoc', so_ngay=0, doanh_thu=0, tim_mat=5, delta=-75, ket_thuc=iso(now()))
            i = next(s.run_seq); s.runs[i] = dict(id=i, user_id=u, do_kho=a['p_do_kho'], trang_thai='dang_choi', so_ngay=None, doanh_thu=None, tim_mat=None, delta=None, ket_thuc=None)
            return {'data': i}
        if fn == 'nop_ket_qua':
            if (s.runs.get(a['p_run_id']) or {}).get('trang_thai') != 'dang_choi': return {'data': None, 'error': {'message': 'Lượt chơi không tồn tại hoặc đã nộp'}}
            if a['p_tim_mat'] > 5 + a['p_doanh_thu'] // 500: return {'data': None, 'error': {'message': 'Kết quả không hợp lệ'}}
            s.nop.append(dict(a))
            hs = HS[s.runs[a['p_run_id']]['do_kho']]
            s.runs[a['p_run_id']].update(trang_thai='xong', so_ngay=a['p_so_ngay'], doanh_thu=a['p_doanh_thu'], tim_mat=a['p_tim_mat'], ket_thuc=iso(now()),
                                         delta=round(a['p_doanh_thu'] * hs / 10) - round(a['p_tim_mat'] * 15 * hs ** 2))
            hs = 1; d = round(a['p_doanh_thu'] * hs / 10) - round(a['p_tim_mat'] * 15 * hs ** 2)
            return {'data': {'delta': d, 'diem': s.prof[u]['diem'] + d, 'hang': 2, 'chuoi': 1, 'chuoi_moi': False, 'chuoi_dai_nhat': 1}}
        if fn == 'luu_ban_ghi':                               # giống public.luu_ban_ghi
            td, rn = a['p_thach_dau'], a['p_run']
            if td: ok = (s.rows.get(td) or {}).get('trang_thai') == 'xong' and u in (s.rows[td]['a'], s.rows[td]['b'])
            else: ok = (s.runs.get(rn) or {}).get('user_id') == u and s.runs[rn]['trang_thai'] != 'dang_choi'
            if not ok or not isinstance(a['p_du_lieu'].get('ev'), list): return err('Không tìm thấy trận đã kết thúc')
            if not any(b['user_id'] == u and b['thach_dau_id'] == td and b['run_id'] == rn for b in s.bg):
                s.bg.append(dict(user_id=u, thach_dau_id=td, run_id=rn, du_lieu=a['p_du_lieu']))
            return {'data': len(s.bg)}
        s.expire()
        if fn == 'gui_thach_dau':
            b = a['p_b']
            if b == u: return err('Không thể tự thách đấu chính mình')
            if any(r['trang_thai'] == 'dang_dau' and b in (r['a'], r['b']) for r in s.rows.values()): return err('Người này đang solo với người khác')
            if any(r['a'] == u and r['trang_thai'] == 'cho' for r in s.rows.values()): return err('Bạn đang chờ một lời thách khác')
            i = next(s.seq)
            r = dict(id=i, a=u, b=b, do_kho=a['p_do_kho'], che_do=a['p_che_do'], trang_thai='cho', tao_luc=iso(now()),
                     het_han=iso(now() + timedelta(seconds=60)), bat_dau=None, ket_thuc=None, thang=None, ly_do=None,
                     elo_a=None, elo_b=None, doi_a=None, doi_b=None)
            for x in 'ab': r.update({x + '_ngay': 0, x + '_doanh_thu': 0, x + '_tim_mat': 0, x + '_xong': False, x + '_ping': 0, x + '_het_tim_luc': None, x + '_xin_hoa': 0})
            r.update(xin_hoa_boi=None, xin_hoa_luc=None, xh_t=0)
            s.rows[i] = r; s.emit(r); return {'data': i}
        r = s.rows.get(a.get('p_id'))
        if fn == 'tra_loi_thach_dau':
            if not r or r['b'] != u: return err('Không tìm thấy lời thách')
            if r['trang_thai'] != 'cho': return err('Lời thách đã hết hạn hoặc bị huỷ')
            if not a['p_dong_y']: r['trang_thai'] = 'tu_choi'
            else: r.update(trang_thai='dang_dau', bat_dau=iso(now() + timedelta(seconds=4)), a_ping=time.time() + 4, b_ping=time.time() + 4)
            s.emit(r); return {'data': dict(r)}
        if fn == 'huy_thach_dau':
            if r and r['a'] == u and r['trang_thai'] == 'cho': r['trang_thai'] = 'huy'; s.emit(r)
            return {'data': None}
        if not r or u not in (r['a'], r['b']): return err('Không tìm thấy trận')
        x = 'a' if u == r['a'] else 'b'
        if fn == 'cap_nhat_solo' and r['trang_thai'] == 'dang_dau':
            if not r[x + '_xong']:
                ng, dt, tm, xg = a['p_ngay'], a['p_doanh_thu'], a['p_tim_mat'], a['p_xong']
                if not (1 <= ng <= 3 and 0 <= tm <= 5 and 0 <= dt <= ng * 5000) or dt < r[x + '_doanh_thu'] or tm < r[x + '_tim_mat']:
                    return err('Tiến độ không hợp lệ')
                r.update({x + '_ngay': ng, x + '_doanh_thu': dt, x + '_tim_mat': tm, x + '_xong': xg or tm >= 5})
                if tm >= 5 and not r[x + '_het_tim_luc']: r[x + '_het_tim_luc'] = time.time()
            r[x + '_ping'] = time.time()
            s.decide(r); s.roi(r); s.emit(r)
        elif fn == 'kiem_tra_solo':
            s.roi(r); s.emit(r)
        elif fn == 'bo_tran_solo':
            s.end(r, r['b'] if x == 'a' else r['a'], 'bo_cuoc'); s.emit(r)
        elif fn in ('xin_hoa', 'tra_loi_hoa'):                    # giống public.xin_hoa / public.tra_loi_hoa
            if r['trang_thai'] != 'dang_dau':
                if fn == 'xin_hoa': return err('Trận đã kết thúc')
            elif fn == 'xin_hoa':
                con = r['xin_hoa_boi'] and r['xh_t'] > time.time() - 20
                if con and r['xin_hoa_boi'] != u: s.end(r, None, 'hoa_thoa_thuan')
                elif con: return err('Bạn vừa xin hoà, chờ đối thủ trả lời')
                elif r[x + '_xin_hoa'] >= 3: return err('Mỗi trận chỉ được xin hoà 3 lần')
                else: r.update(xin_hoa_boi=u, xin_hoa_luc=iso(now()), xh_t=time.time()); r[x + '_xin_hoa'] += 1
            else:
                if not r['xin_hoa_boi'] or r['xin_hoa_boi'] == u or r['xh_t'] < time.time() - 20: return err('Lời xin hoà đã hết hạn')
                if a['p_dong_y']: s.end(r, None, 'hoa_thoa_thuan')
                else: r.update(xin_hoa_boi=None, xin_hoa_luc=None)
            s.emit(r)
        return {'data': dict(r, **{k: None for k in ('a_ping', 'b_ping')}) | {'a_ping': None, 'b_ping': None}}

    def select(s, u, q):
        t, f = q['table'], q['filters']
        if t == 'ban_be': return {'data': [dict(r) for r in s.bb.values() if u in (r['a'], r['b'])]}       # RLS: của mình
        if t == 'thong_bao': return {'data': sorted([dict(x) for x in s.tb if x['user_id'] == u], key=lambda x: -x['id'])}
        if t == 'khoa': return {'data': s.khoa}
        if t == 'profiles':
            uid = next((v for k, op, v in f if k == 'id'), None)
            gt = next((v for k, op, v in f if op == 'gt'), None)
            if gt is not None: return {'data': [dict(p) for p in s.prof.values() if p['elo'] > gt]}
            if uid is None: return {'data': [dict(p) for p in s.prof.values()]}
            if isinstance(uid, list): return {'data': [dict(s.prof[x]) for x in uid if x in s.prof]}
            p = s.prof.get(uid)
            return {'data': dict(p) if p else None}
        if t == 'runs':                                       # RLS: của mình, hoặc lượt đã kết thúc của bất kỳ ai
            xem = lambda r: r['user_id'] == u or r['trang_thai'] != 'dang_choi'
            rid = next((v for k, op, v in f if k == 'id'), None)
            if rid is not None: return {'data': dict(s.runs[rid]) if rid in s.runs and xem(s.runs[rid]) else None}
            who = next((v for k, op, v in f if k == 'user_id'), u)
            rows = [dict(r) for r in s.runs.values() if r['user_id'] == who and r['trang_thai'] != 'dang_choi' and xem(r)]
            return {'data': sorted(rows, key=lambda r: r['ket_thuc'], reverse=not q.get('asc'))}
        if t == 'ban_ghi':                                    # RLS: người đã đăng nhập đọc được mọi bản ghi (chỉ có khi đã xong)
            rows = list(s.bg)
            for k, op, v in f:
                if k in ('thach_dau_id', 'run_id'): rows = [b for b in rows if (b[k] in v if op == 'in' else b[k] == v)]
            return {'data': [dict(b) for b in rows]}
        if t == 'thach_dau':
            rid = next((v for k, op, v in f if k == 'id'), None)
            xem = lambda r: u in (r['a'], r['b']) or r['trang_thai'] == 'xong'     # RLS: trận của mình, hoặc trận đã xong
            if rid is not None:
                r = s.rows.get(int(rid))
                return {'data': dict(r, a_ping=None, b_ping=None) if r and xem(r) else None}
            st = next((v if op == 'in' else [v] for k, op, v in f if k == 'trang_thai'), ['cho', 'dang_dau'])
            orf = next((v for k, op, v in f if op == 'or'), None)
            who = orf.split(',')[0].split('.eq.')[1] if orf else u
            rows = [dict(r, a_ping=None, b_ping=None) for r in s.rows.values() if who in (r['a'], r['b']) and r['trang_thai'] in st and xem(r)]
            if st == ['xong']: return {'data': sorted(rows, key=lambda r: r['ket_thuc'], reverse=not q.get('asc'))}
            return {'data': sorted(rows, key=lambda r: -r['id'])}
        if t == 'bxh_sinh_vien':
            if q.get('single'): return {'data': {'hang': 2}}
            ps = sorted(s.prof.values(), key=lambda p: -p['diem'])
            return {'data': [dict(id=p['id'], ten=p['ten'], lop=p['lop'], khoa=next(k['ten'] for k in s.khoa if k['id'] == p['khoa_id']),
                                  diem=p['diem'], hang=i + 1, chuoi=0, avatar_url=None) for i, p in enumerate(ps)]}
        if t == 'bxh_solo':
            ps = sorted([p for p in s.prof.values() if p['solo_thang'] + p['solo_thua'] + p['solo_hoa']], key=lambda p: -p['elo'])
            return {'data': [dict(p, khoa=next(k['ten'] for k in s.khoa if k['id'] == p['khoa_id']), hang=i + 1) for i, p in enumerate(ps)]}
        return {'data': []}


F = Fake()

STUB = r"""
(() => {
  const call = (kind, payload) => window.__sb(kind, JSON.stringify(payload)).then(r => JSON.parse(r));
  function q(table){
    const st={table,filters:[],single:false};
    const b={select(){return b},order(k,o){if(o&&o.ascending)st.asc=true;return b},limit(){return b},range(){return b},neq(k,v){st.filters.push([k,'neq',v]);return b},
      eq(k,v){st.filters.push([k,'eq',v]);return b},gt(k,v){st.filters.push([k,'gt',v]);return b},in(k,v){st.filters.push([k,'in',v]);return b},or(x){st.filters.push(['_or','or',x]);return b},
      maybeSingle(){st.single=true;return b},
      then(ok,no){return call('select',st).then(ok,no)}};
    return b;
  }
  const subs=[], syncs=[], chans=[]; window.__pres={}; let presKey='';
  setInterval(async()=>{const evs=await call('events',{});evs.forEach(r=>subs.forEach(x=>{if((r._table||'thach_dau')===x.table)x.cb({eventType:r._ev||'UPDATE',new:r})}));
    const bcs=await call('bcs',{});bcs.forEach(m=>chans.forEach(ch=>{if(ch.name===m.topic&&ch.bc[m.event])ch.bc[m.event]({payload:m.payload})}));
    const pr=await call('presence',{}), k=JSON.stringify(pr); if(k!==presKey){presKey=k;window.__pres=pr;syncs.forEach(f=>f())}},150);
  window.__chal=0;
  window.supabase={createClient:()=>({
    from:q, rpc:(fn,args)=>call('rpc',{fn,args:args||{}}),
    channel(name){const ch={name,bc:{},on(type,filt,cb){if(type==='postgres_changes')subs.push({cb,table:filt.table});else if(type==='broadcast')ch.bc[filt.event]=cb;else{ch.sync=cb;syncs.push(cb)}return ch},
      send(m){call('bc',{topic:name,event:m.event,payload:m.payload})},
      subscribe(cb){cb&&setTimeout(()=>{cb('SUBSCRIBED');ch.sync&&ch.sync()},50);return ch},
      presenceState(){return Object.fromEntries(Object.entries(window.__pres).map(([k,v])=>[k,[v]]))},track(p){call('track',p)}};chans.push(ch);return ch},
    removeChannel(ch){const i=chans.indexOf(ch);if(i>=0)chans.splice(i,1)},
    auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:window.__uid}}}}),signOut:async()=>({})},
    storage:{from:()=>({upload:async()=>({}),remove:async()=>({})})}
  })};
})();
"""

srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '-d', REPO], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors = []


def make(b, uid, w, h, scheme='light'):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, color_scheme=scheme, locale='vi-VN',
                        timezone_id='Asia/Ho_Chi_Minh', has_touch=w < 600, is_mobile=w < 600)

    def route(r):
        u = r.request.url
        if u.startswith('http://localhost:8766/js/cau-hinh.js') or u.startswith('http://localhost:8766/js/solo.js'):
            f = u.split('8766/')[1].split('?')[0]                              # rút ngắn ngày bán / cửa hàng solo
            body = open(os.path.join(REPO, f), encoding='utf-8').read()
            body = body.replace('const DAYLEN=75;', 'const DAYLEN=8;').replace('SOLO_SHOP=20', 'SOLO_SHOP=3')
            assert 'DAYLEN=8' in body or 'SOLO_SHOP=3' in body, 'không rút ngắn được thời gian'
            return r.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=body)
        if u.startswith('http://localhost:8766/'): return r.continue_()
        return r.abort()
    ctx.route('**/*', route)

    def handler(source, kind, payload):
        a = json.loads(payload)
        with lock:
            if kind == 'events':
                ev, F.q[uid] = F.q[uid], []
                return json.dumps(ev)
            if kind == 'track': F.pres[uid] = a; return json.dumps(None)       # giả lập Supabase presence
            if kind == 'presence': return json.dumps(F.pres)
            if kind == 'bc':                                                   # broadcast: gửi cho mọi máy khác (self:false)
                for k, qq in F.bcq.items():
                    if k != uid: qq.append(a)
                return json.dumps(None)
            if kind == 'bcs':
                ev, F.bcq[uid] = F.bcq[uid], []
                return json.dumps(ev)
            if kind == 'rpc': return json.dumps(F.rpc(uid, a['fn'], a['args']))
            return json.dumps(F.select(uid, a))
    F.bcq[uid] = []
    ctx.expose_binding('__sb', handler)
    ctx.add_init_script(STUB + f"window.__uid='{uid}';")
    p = ctx.new_page()
    p.on('pageerror', lambda e: errors.append(f'{uid}: {e}'))
    p.on('console', lambda m: m.type == 'error' and 'net::ERR_FAILED' not in m.text and errors.append(f'{uid} console: {m.text}'))
    p.goto('http://localhost:8766/index.html')
    p.add_style_tag(content=":root{--display:'Inter',system-ui,sans-serif!important;--body:'Inter',system-ui,sans-serif!important}")
    p.evaluate("()=>{const o=sfx.challenge;sfx.challenge=()=>{window.__chal++;o.call(sfx)}}")
    p.wait_for_timeout(700)
    return p


def shot(p, name): p.wait_for_timeout(250); p.screenshot(path=f'{OUT}/{name}.png'); print('  ảnh', name)
def check(cond, msg): print(('  OK   ' if cond else '  LỖI  ') + msg); cond or errors.append(f'kiểm tra (bước {buoc[0].split(".")[0]}): ' + msg)

CI = bool(os.environ.get('GITHUB_ACTIONS'))
buoc = ['']
_print = print
def print(*a, **k):                                   # ghi lại bước đang chạy để báo lỗi trên GitHub Actions
    if a and isinstance(a[0], str) and __import__('re').match(r'\d+b?\. ', a[0]): buoc[0] = a[0]
    _print(*a, **k)
def _hook(t, v, tb):
    import traceback; traceback.print_exception(t, v, tb)
    if CI: _print(f"::error::{buoc[0]} → {t.__name__}: {str(v).splitlines()[0] if str(v) else ''}")
    srv.terminate()
sys.excepthook = _hook

with sync_playwright() as pw:
    b = pw.chromium.launch()
    A = make(b, 'A', 390, 844)        # Phú trên điện thoại
    A.wait_for_selector('.push-card', timeout=3000); A.click('#pushLater'); A.wait_for_timeout(200)
    print('0. Tab Solo trước khi có trận nào: hiện mọi người ở 1200')
    A.click('#lb'); A.wait_for_timeout(300); A.click('[data-t="solo"]'); A.wait_for_timeout(600)
    check(A.locator('.pod').count() == 3 and 'chưa đấu trận nào' in A.inner_text('#lbBody'), 'hiện 3 người, ghi "chưa đấu trận nào"')
    shot(A, 'fx-00-bxh-solo-moi'); A.click('#back'); A.wait_for_timeout(200)
    print('0b. Chế độ thường: hết tim → hiệu ứng thua, chặn bấm, rồi mới hiện kết quả')
    A.click('#go'); A.wait_for_function('running===true', timeout=5000)
    A.evaluate("()=>{S.money=0;S.rep=1;loseHeart('Khách bỏ đi vì chờ lâu')}")
    A.wait_for_selector('.fx.lose', timeout=3000); A.wait_for_timeout(700)
    check(A.locator('.fx.lose .ttl').inner_text().startswith('Quán đóng cửa'), 'hiện chữ "Quán đóng cửa"')
    shot(A, 'fx-01-thua-thuong')
    A.mouse.click(195, 780); A.mouse.click(195, 760)                     # bấm liên tục như đang chơi
    check(A.locator('#again').count() == 0, 'bấm trong lúc hiệu ứng không làm gì')
    A.wait_for_selector('#ov #again', timeout=8000)
    check(A.locator('#again').is_disabled(), 'nút "Chơi lại/Chơi lượt mới" bị khoá ngay khi hiện')
    A.wait_for_timeout(1000)
    check(A.locator('#again').is_enabled(), 'nút mở lại sau khoảng 1 giây')
    shot(A, 'fx-02-ket-qua-thuong'); A.click('#home'); A.wait_for_timeout(300)
    B = make(b, 'B', 1280, 800)       # Huy trên laptop
    print('1. Màn chính có nút Solo và Elo')
    check(A.locator('#solo').count() == 1, 'nút Solo hiện trên màn chính')
    check('Elo 1200' in A.inner_text('.me'), 'thẻ người chơi hiện Elo')
    shot(A, 'solo-01-home')

    print('2. A tìm B bằng thanh tìm kiếm')
    A.click('#solo'); A.wait_for_timeout(300)
    A.fill('#q', 'huy'); A.wait_for_timeout(700)
    check(A.locator('.li .act').count() == 1, 'tìm "huy" ra đúng 1 người')
    shot(A, 'solo-02-tim-kiem')
    A.click('.li .act'); A.wait_for_timeout(300)
    A.click('.diff.d-kho'); A.click('.mode[data-m="sinh_ton"]')
    check('+16' in A.inner_text('#ov'), 'hiện Elo dự kiến +16 khi hai bên cùng 1200')
    shot(A, 'solo-03-chon-luat')
    A.click('#send'); A.wait_for_timeout(500)
    shot(A, 'solo-04-cho-tra-loi')

    print('3. B nhận thông báo ở góc dưới bên phải')
    B.wait_for_selector('.notice', timeout=3000)
    box = B.locator('.notice').bounding_box()
    check(box['x'] + box['width'] > 1280 - 40 and box['y'] + box['height'] > 800 - 120, f'thông báo nằm góc dưới phải ({int(box["x"])},{int(box["y"])})')
    check(B.evaluate('window.__chal') == 1, 'phát âm thanh thách đấu đúng 1 lần')
    check('Nguyễn Tấn Phú' in B.inner_text('.notice') and 'Khó' in B.inner_text('.notice'), 'thông báo ghi tên, độ khó')
    shot(B, 'solo-05-thong-bao-laptop')

    print('4. B đồng ý → hai bên đếm ngược')
    B.click('.notice [data-yes]')
    A.wait_for_selector('#cd', timeout=3000); B.wait_for_selector('#cd', timeout=3000)
    check(True, 'cả hai thấy màn đếm ngược')
    shot(A, 'solo-06-dem-nguoc')
    A.wait_for_function('running===true', timeout=8000); B.wait_for_function('running===true', timeout=8000)
    check(True, 'cả hai vào trận cùng lúc')

    print('5. Đang đấu: thanh đối thủ cập nhật')
    A.evaluate("()=>{S.total+=420;S.money+=420;D.earned+=420;renderStats()}")
    B.evaluate("()=>{S.total+=180;S.money+=180;D.earned+=180;loseHeart('Khách bỏ đi vì chờ lâu')}")
    A.wait_for_timeout(1800); B.wait_for_timeout(300)
    hudA = A.inner_text('.opp'); hudB = B.inner_text('.opp')
    check('180k' in hudA, f'A thấy doanh thu của Huy: {hudA!r}')
    check('420k' in hudB, f'B thấy doanh thu của Phú: {hudB!r}')
    shot(A, 'solo-07-dang-dau-dien-thoai'); shot(B, 'solo-08-dang-dau-laptop')

    print('6. Sinh tồn: B hết tim → A thắng')
    B.evaluate("()=>{for(let i=0;i<4;i++)loseHeart('Sai món')}")
    A.wait_for_selector('.fx.win', timeout=5000); B.wait_for_selector('.fx.lose', timeout=5000)
    A.wait_for_timeout(650); B.wait_for_timeout(100)
    check(A.locator('#re').count() == 0 and B.locator('#re').count() == 0, 'đang hiệu ứng: chưa có nút nào trên màn')
    shot(A, 'fx-03-thang-solo'); shot(B, 'fx-04-thua-solo-laptop')
    A.mouse.click(195, 1500); A.mouse.click(195, 1450)
    A.wait_for_selector('#ov >> text=Bạn thắng!', timeout=5000); B.wait_for_selector('#ov >> text=Bạn thua rồi', timeout=5000)
    check(A.locator('#re').is_disabled() and A.locator('#lbs').is_disabled(), 'nút Tái đấu / Bảng xếp hạng bị khoá lúc mới hiện')
    shot(A, 'fx-05-ket-qua-solo-co-phao-giay')
    check('+16' in A.inner_text('#ov') and '16' in B.inner_text('#ov'), 'A +16 Elo, B −16 Elo')
    check(F.prof['A']['elo'] == 1216 and F.prof['B']['elo'] == 1184, 'Elo trên server: 1216 / 1184')
    check(A.evaluate('running')==False and A.evaluate('solo')==None, 'A dừng trận, dọn trạng thái')
    shot(A, 'solo-09-thang'); shot(B, 'solo-10-thua')

    print('7. Từ chối lời thách')
    B.click('#home'); A.click('#home'); A.wait_for_timeout(200)
    A.click('#solo'); A.fill('#q', 'Phạm'); A.wait_for_timeout(700); A.click('.li .act'); A.wait_for_timeout(300)
    A.click('.mode[data-m="diem"]'); A.click('#send')
    B.wait_for_selector('.notice', timeout=3000)
    B.click('.notice [data-no]')
    A.wait_for_selector('text=đã từ chối', timeout=5000)
    check(B.locator('.notice').count() == 0 or B.locator('.notice.out').count() == 1, 'thông báo bên B biến mất')
    shot(A, 'solo-11-tu-choi')

    print('8. Điểm cao: chơi đủ 3 ngày (8 giây/ngày), so ĐBK')
    A.click('#again'); A.wait_for_timeout(300); A.click('#send')
    B.wait_for_selector('.notice [data-yes]', timeout=3000); B.wait_for_timeout(300); B.click('.notice [data-yes]')
    A.wait_for_function('running===true', timeout=8000)
    A.evaluate("()=>{S.total+=900;S.money+=900;D.earned+=900;renderStats()}")
    B.evaluate("()=>{S.total+=600;S.money+=600;D.earned+=600;renderStats()}")
    A.wait_for_selector('#oppShop', timeout=12000)
    check(A.locator('#buyHeart').is_hidden() and 'Bỏ trận' in A.inner_text('#cash'), 'cửa hàng solo: không mua tim, có nút bỏ trận')
    shot(A, 'solo-12-cua-hang')
    A.wait_for_selector('#ov >> text=Bạn thắng!', timeout=45000); B.wait_for_selector('#ov >> text=Bạn thua rồi', timeout=8000)
    r = list(F.rows.values())[-1]
    check(r['ly_do'] == 'diem' and r['a_ngay'] == 3 and r['b_ngay'] == 3, f"thắng theo điểm sau 3 ngày ({r['a_doanh_thu']}k vs {r['b_doanh_thu']}k)")
    check(A.evaluate('diff') == 'thuong', 'độ khó của A trả về như cũ sau trận')

    print('9. Bảng xếp hạng Solo')
    A.click('#lbs'); A.wait_for_timeout(600)
    check('Elo' in A.inner_text('#rule') and A.locator('.pod').count() >= 2, 'tab Solo hiện 2 người theo Elo')
    check(A.locator('.pod .ten-elo.r-pupil').count() >= 2 and 'Legendary Grandmaster' in A.inner_text('#rule'), 'tab Solo: tên tô màu theo danh hiệu, luật có bảng danh hiệu')
    shot(A, 'solo-13-bxh-solo')

    def reload(P):
        P.reload(); P.add_style_tag(content=":root{--display:'Inter',system-ui,sans-serif!important;--body:'Inter',system-ui,sans-serif!important}")
    print('10. Gửi lời thách rồi lỡ tải lại trang')
    A.click('#back'); A.wait_for_timeout(300); B.click('#home'); B.wait_for_timeout(300)
    A.click('#solo'); A.fill('#q', 'huy'); A.wait_for_timeout(700); A.click('.li .act'); A.wait_for_timeout(300)
    A.click('.mode[data-m="sinh_ton"]'); A.click('#send'); A.wait_for_selector('#wLeft', timeout=3000)
    reload(A)
    A.wait_for_selector('#wLeft', timeout=6000)
    check('Đang chờ' in A.inner_text('#ov'), 'sau khi tải lại, A quay về màn "Đang chờ Huy trả lời"')
    check(list(F.rows.values())[-1]['trang_thai'] == 'cho', 'lời thách không bị huỷ khi tải lại')
    shot(A, 'resume-01-cho-sau-tai-lai')
    B.wait_for_selector('.notice [data-yes]', timeout=4000); B.wait_for_timeout(300); B.click('.notice [data-yes]')
    A.wait_for_function('running===true', timeout=9000); B.wait_for_function('running===true', timeout=9000)
    check(True, 'B đồng ý → A vào trận bình thường')

    print('11. Tải lại trang giữa trận → vào lại trận')
    A.evaluate("()=>{S.total+=300;S.money+=300;D.earned+=300;renderStats()}"); A.wait_for_timeout(1500)
    reload(A)
    A.wait_for_selector('#rejoin', timeout=6000)
    t = A.inner_text('#ov')
    check('Đang vào lại trận solo' in t and '300k' in t, 'hiện màn "Đang vào lại trận solo" với 300k đã bán')
    r = list(F.rows.values())[-1]
    check(r['trang_thai'] == 'dang_dau', 'trận không bị xử thua sau khi tải lại')
    shot(A, 'resume-02-vao-lai-tran')
    A.wait_for_function('running===true', timeout=6000)
    check(A.evaluate('S.total') == 300 and A.evaluate('!!solo'), 'vào lại trận, giữ nguyên 300k')
    A.evaluate("()=>{S.total+=50;S.money+=50;D.earned+=50;renderStats()}"); A.wait_for_timeout(1500)
    check(r['a_doanh_thu'] == 350, f"server nhận tiếp tiến độ sau khi vào lại ({r['a_doanh_thu']}k)")
    B.evaluate("()=>{for(let i=0;i<5;i++)loseHeart('Sai món')}")
    A.wait_for_selector('#ov >> text=Bạn thắng!', timeout=8000)
    check(True, 'trận kết thúc bình thường, A thắng')

    print('12. Chế độ thường: tải lại trang giữa ngày → tự quay lại quán')
    A.click('#home'); A.wait_for_timeout(300); B.click('#home'); B.wait_for_timeout(300)
    A.click('#go'); A.wait_for_function('running===true', timeout=5000)
    run1 = A.evaluate('runId')
    A.evaluate("()=>{S.total+=200;S.money+=200;D.earned+=200;S.upg={quat:1};renderStats()}"); A.wait_for_timeout(1300)
    reload(A)
    A.wait_for_selector('text=Quán đang mở dở', timeout=6000)
    shot(A, 'giu-quan-01-sau-tai-lai')
    A.wait_for_function('running===true', timeout=5000)
    check(A.evaluate('S.total') == 200 and A.evaluate('S.upg.quat') == 1 and A.evaluate('runId') == run1,
          'tự bán tiếp sau 3 giây, giữ 200k, nâng cấp và đúng lượt chơi cũ')
    check(F.runs[run1]['trang_thai'] == 'dang_choi', 'lượt chơi không bị tính bỏ cuộc')

    print('13. Tạm dừng → Đóng quán: tim còn lại bị tính là mất')
    A.click('#pauseBtn'); A.wait_for_selector('text=Quán đang tạm nghỉ', timeout=3000)
    check(A.evaluate('running') is False, 'tạm dừng thì đồng hồ dừng')
    check(A.evaluate('SFX.on') is True, 'bấm Tạm dừng không làm tắt âm thanh')
    A.click('#close'); A.wait_for_selector('#ok', timeout=3000)
    t = A.inner_text('#ov')
    check('5 tim còn lại sẽ bị tính là mất hết' in t, 'màn xác nhận báo rõ 5 tim còn lại bị mất')
    shot(A, 'giu-quan-02-xac-nhan-dong-quan')
    A.click('#ok'); A.wait_for_selector('#ov #again', timeout=10000)
    n = F.nop[-1]
    check(n['p_tim_mat'] == 5 and n['p_doanh_thu'] == 200 and n['p_run_id'] == run1, f"nộp điểm với 5 tim mất, 200k ({n})")
    check(A.evaluate("localStorage.getItem('mqbk-run')") is None, 'xoá bản lưu sau khi đóng quán')

    def vao_tran(md='diem'):
        A.click('#home'); A.wait_for_timeout(300)
        A.click('#solo'); A.fill('#q', 'huy'); A.wait_for_timeout(700); A.click('.li .act'); A.wait_for_timeout(300)
        A.click(f'.mode[data-m="{md}"]'); A.click('#send')
        B.wait_for_selector('.notice [data-yes]', timeout=4000); B.wait_for_timeout(300); B.click('.notice [data-yes]')
        A.wait_for_function('running===true', timeout=9000); B.wait_for_function('running===true', timeout=9000)

    print('14. Solo: xin hoà, bên kia đồng ý')
    vao_tran()
    A.click('#pauseBtn'); A.wait_for_selector('#smDraw', timeout=2000)
    check(A.evaluate('running') is True, 'mở bảng bỏ cuộc/hoà không dừng trận')
    check(A.evaluate('SFX.on') is True and 'Bỏ cuộc' in A.inner_text('#pauseBtn'), 'nút vẫn ghi "Bỏ cuộc · Hoà", âm thanh vẫn bật')
    shot(A, 'solo-hoa-01-bang')
    A.click('#smDraw')
    B.wait_for_selector('#drawOffer', timeout=4000)
    shot(B, 'solo-hoa-02-loi-xin-hoa-laptop')
    B.click('#drawOffer [data-yes]')
    A.wait_for_selector('#ov >> text=Hoà!', timeout=8000); B.wait_for_selector('#ov >> text=Hoà!', timeout=8000)
    check('Hai bạn đồng ý hoà' in A.inner_text('#ov'), 'cả hai thấy "Hoà!" với lý do đồng ý hoà')

    print('15. Solo: tải lại giữa trận → tự vào lại, giữ nâng cấp')
    B.click('#home'); B.wait_for_timeout(300)
    vao_tran('sinh_ton')
    A.evaluate("()=>{S.total+=150;S.money+=150;D.earned+=150;S.upg={phubep:1};renderStats()}"); A.wait_for_timeout(1500)
    reload(A)
    A.wait_for_selector('text=Đang vào lại trận solo', timeout=6000)
    shot(A, 'solo-vao-lai-giu-nang-cap')
    A.wait_for_function('running===true', timeout=6000)
    check(A.evaluate('S.total') == 150 and A.evaluate('S.upg.phubep') == 1, 'tự vào lại trận sau 3 giây, giữ 150k và nâng cấp')

    print('16. Solo: bỏ cuộc')
    A.click('#pauseBtn'); A.click('#smQuit'); A.wait_for_timeout(450); A.click('#smQuit')
    A.wait_for_selector('#ov >> text=Bạn thua rồi', timeout=8000); B.wait_for_selector('#ov >> text=Bạn thắng!', timeout=8000)
    check('Bạn đã bỏ cuộc' in A.inner_text('#ov'), 'bỏ cuộc: A thua, B thắng')

    print('17. Bản ghi được gửi lên khi kết thúc')
    A.wait_for_timeout(800)
    last = max(F.rows)
    bg = [b for b in F.bg if b['thach_dau_id'] == last]
    check(len(bg) == 2, f'cả hai bên gửi bản ghi trận cuối ({len(bg)} bản)')
    ev = bg[0]['du_lieu']['ev'] if bg else []
    codes = {e[1] for e in ev}
    check({'D', 'S', 'O'} <= codes and all(ev[k][0] <= ev[k + 1][0] for k in range(len(ev) - 1)), f'bản ghi có mở ngày, khách đến, kết thúc, thời gian tăng dần ({len(ev)} sự kiện)')
    check(any(b['run_id'] for b in F.bg), 'lượt bán thường cũng có bản ghi')

    print('18. Xem lại trận: hai bên, phát, tua')
    A.click('#xemlai'); A.wait_for_selector('#rpStage .rp-view', timeout=5000)
    check(A.locator('#rpStage .rp-view').count() == 2, 'hiện hai quán: mình và đối thủ')
    A.click('.rp-speed [data-s="8"]'); A.wait_for_timeout(1500)
    t1 = A.evaluate('RP.T'); check(t1 > 3000, f'đang phát, tốc độ 8× ({t1} ms)')
    A.evaluate('rpPause()'); A.evaluate('rpSeek(RP.dur*0.5)'); A.wait_for_timeout(200)
    check(A.locator('#rpMoves .rp-mv.done').count() > 0, 'tua giữa trận: danh sách diễn biến đánh dấu phần đã qua')
    check('Bàn 1' in A.inner_text('#rpv0') or A.locator('#rpv0 .rp-c').count() >= 3, 'quán được dựng lại với các bàn')
    shot(A, 'xem-lai-01-dien-thoai')
    check(A.locator('#rpKet').is_hidden(), 'giữa trận chưa hiện kết quả')
    A.click('#rpCuoi'); A.wait_for_timeout(400)
    check(A.evaluate('RP.T===RP.dur && !RP.playing'), 'nút "Đến cuối" nhảy tới hết trận và dừng phát')
    t = A.inner_text('#rpKet')
    check(A.locator('#rpKet').is_visible() and 'Huy thắng' in t and 'Phú thua' in t and 'Elo' in t, f'tua đến cuối: hiện ai thắng ai thua ({t!r})')
    check(A.locator('#rpStage .rp-kq.win').count() == 1 and A.locator('#rpStage .rp-kq.loss').count() == 1, 'mỗi quán có nhãn Thắng / Thua')
    A.evaluate('rpStage.scrollIntoView()'); shot(A, 'xem-lai-03-ket-qua-cuoi')
    A.click('#rpDau'); A.wait_for_timeout(200)
    check(A.evaluate('RP.T') == 0, 'nút "Về đầu" quay về 0:00')
    check(A.locator('#rpKet').is_hidden() and A.locator('.rp-kq').count() == 0, 'tua về đầu thì ẩn kết quả')
    B.click('#home'); B.wait_for_timeout(300); B.click('#hoso'); B.wait_for_timeout(800); B.click('[data-t="games"]'); B.wait_for_timeout(900)
    check(B.locator('#gList .li.game').count() >= 3, f"B thấy danh sách ván ({B.locator('#gList .li.game').count()} ván)")
    check(B.locator('#gList .kq.win').count() >= 1 and B.locator('#gList .kq.loss').count() >= 1 and B.locator('#gList .kq.even').count() >= 1,
          'có đủ biểu tượng thắng, thua, hoà')
    shot(B, 'ho-so-02-van-solo-laptop')
    B.click('#gList .li.game'); B.wait_for_selector('#rpStage .rp-view', timeout=5000); B.wait_for_timeout(1200)
    B.evaluate('rpPause()'); B.evaluate('rpSeek(RP.dur*0.3)'); B.wait_for_timeout(200)
    shot(B, 'xem-lai-02-laptop')

    print('19. Thống kê')
    A.click('#back'); A.wait_for_timeout(300); A.click('#hoso'); A.wait_for_selector('#hsBody .card-s', timeout=5000); A.wait_for_timeout(500)
    t = A.inner_text('#hsBody')
    nA = sum(1 for r in F.rows.values() if r['trang_thai'] == 'xong' and 'A' in (r['a'], r['b']))
    check(f'Số trận\n{nA}' in t, f'đúng số trận solo ({nA})')
    check(A.locator('#cElo svg .ln').count() == 1 and A.locator('#cRuns svg path').count() >= 1, 'có biểu đồ Elo và biểu đồ ĐBK từng lượt')
    check('Trụ lâu nhất' in t and 'ngày liên tiếp hiện tại' in t, 'có ngày trụ lâu nhất và chuỗi ngày')
    A.hover('#cElo svg'); A.wait_for_timeout(200)
    shot(A, 'ho-so-01-thong-ke')
    A.click('[data-t="runs"]'); A.wait_for_selector('#rList .li.game', timeout=4000)
    check(A.locator('#rList .li.game').count() >= 2, 'tab Lượt bán liệt kê các lượt')
    shot(A, 'ho-so-03-luot-ban')

    print('20. Trạng thái "Đang solo": nút đổi thành "Xem trận", xem trực tiếp, hết trận thì thách được')
    C = make(b, 'C', 390, 844)
    A.click('#back'); A.wait_for_timeout(300); B.click('#back'); B.wait_for_timeout(400); B.click('#back'); B.wait_for_timeout(300)
    A.click('#solo'); A.fill('#q', 'huy'); A.wait_for_timeout(700); A.click('.li .act'); A.wait_for_timeout(300); A.click('#send')
    B.wait_for_selector('.notice [data-yes]', timeout=4000); B.wait_for_timeout(300); B.click('.notice [data-yes]')
    A.wait_for_function('running===true', timeout=9000)
    C.click('#solo'); C.fill('#q', 'huy'); C.wait_for_timeout(900)
    btn = C.locator('.li .act[data-uid="B"]')
    check(C.locator('[data-st="B"]').inner_text() == 'Đang solo' and C.locator('[data-st="B"]').is_visible() and btn.is_enabled() and btn.inner_text() == 'Xem trận',
          'C thấy Huy "Đang solo", nút đổi thành "Xem trận"')
    shot(C, 'trang-thai-01-dang-solo')
    btn.click(); C.wait_for_function("document.querySelectorAll('#xStage .rp-view').length===2", timeout=6000)
    C.wait_for_timeout(1500)
    check(' vs ' in C.inner_text('#xTitle') and 'Phú' in C.inner_text('#xTitle'), f"xem trực tiếp: tiêu đề {C.inner_text('#xTitle')!r}")
    check(C.locator('#rpv0 .rp-c').count() >= 3 and C.locator('#rpv1 .rp-c').count() >= 3, 'dựng được quán của cả hai người')
    A.evaluate("()=>{rec('V',999,0,120,80);S.total+=120;S.money+=120;D.earned+=120;renderStats()}"); C.wait_for_timeout(1800)
    check('120k' in C.inner_text('#xStage'), 'thấy tiền bán của Phú cập nhật gần như ngay')
    shot(C, 'xem-truc-tiep-01-solo')
    A.click('#pauseBtn'); A.click('#smQuit'); A.wait_for_timeout(450); A.click('#smQuit')
    A.wait_for_selector('#ov >> text=Bạn thua rồi', timeout=8000)
    C.wait_for_selector('#xEnd .xem-ket', timeout=8000)
    check('Huy thắng' in C.inner_text('#xEnd') and 'bỏ cuộc' in C.inner_text('#xEnd'), f"hết trận: báo kết quả ({C.inner_text('#xEnd')!r})")
    check(C.locator('[data-thach-xem="B"]').count() == 1 and C.locator('[data-thach-xem="A"]').count() == 1, 'có nút thách đấu cả hai người')
    C.wait_for_timeout(800); shot(C, 'xem-truc-tiep-02-ket-qua')
    C.click('[data-thach-xem="B"]'); C.wait_for_selector('#send', timeout=3000)
    check('Thách đấu Huy' in C.inner_text('#ov') and C.locator('#send').is_enabled(), 'bấm "Thách đấu Huy" mở màn thách, gửi được')
    C.click('#back'); C.wait_for_timeout(400)

    print('21. Xem trực tiếp Phú bán thường đến lúc chốt sổ')
    A.click('#home'); A.wait_for_timeout(300); A.click('#go'); A.wait_for_function('running===true', timeout=5000)
    C.click('#back'); C.wait_for_timeout(300); C.click('#solo'); C.fill('#q', 'phú'); C.wait_for_timeout(900)
    check(C.locator('[data-st="A"]').inner_text() == 'Đang bán', 'C thấy Phú "Đang bán"')
    C.click('.li[data-prof="A"] .nm'); C.wait_for_selector('#hsXem', state='visible', timeout=4000)
    check('Nguyễn Tấn Phú' in C.inner_text('.me') and C.locator('#hsThach').count() == 1, 'bấm tên mở hồ sơ Phú, có nút Thách đấu và Xem trực tiếp')
    C.click('#hsXem'); C.wait_for_selector('#xStage .rp-view .rp-c', timeout=6000)
    try: C.wait_for_function("document.getElementById('xTitle').textContent.includes('đang bán')", timeout=5000)
    except Exception: pass
    check('đang bán' in C.inner_text('#xTitle'), f"tiêu đề {C.inner_text('#xTitle')!r}")
    A.evaluate("()=>{rec('V',998,1,2000,70);S.total+=2000;S.money+=2000;D.earned+=2000;renderStats()}"); C.wait_for_timeout(1500)
    shot(C, 'xem-truc-tiep-03-ban-thuong')
    A.wait_for_selector('#cash', timeout=15000); A.wait_for_timeout(300); A.click('#cash'); A.click('#cash')
    C.wait_for_selector('#xEnd .xem-ket', timeout=10000)
    t = C.inner_text('#xEnd')
    check('đã chốt sổ' in t and 'ĐBK' in t and C.locator('[data-thach-xem="A"]').count() == 1, f'biết Phú chốt sổ, có nút thách ({t!r})')
    shot(C, 'xem-truc-tiep-04-chot-so')

    print('22. Hồ sơ người khác: thống kê, ván solo, lượt bán, xem lại')
    C.click('#xHoSo'); C.wait_for_selector('#hsBody .card-s', timeout=5000); C.wait_for_timeout(400)
    check(C.locator('.me .hang-logo').count() == 1 and C.locator('.me .elo-t').count() == 1 and C.locator('#hsBody .hang-the .hang-bar').count() == 1,
          'hồ sơ: huy hiệu hạng ĐBK, danh hiệu Elo, thanh tiến độ lên hạng')
    eA = F.prof['A']['elo']; hE = 1 + sum(1 for p in F.prof.values() if p['elo'] > eA)
    hd = C.inner_text('.me')
    check(f"{F.prof['A']['diem']}" in hd and 'hạng #2' in hd and f'{eA}' in hd and f'Elo · hạng #{hE}' in hd, f'đầu hồ sơ có ĐBK + hạng và Elo + hạng ({hd!r})')
    nA = sum(1 for r in F.rows.values() if r['trang_thai'] == 'xong' and 'A' in (r['a'], r['b']))
    check(f'Số trận\n{nA}' in C.inner_text('#hsBody'), f'thống kê đúng số trận solo của Phú ({nA})')
    shot(C, 'ho-so-nguoi-khac-01-thong-ke')
    C.click('[data-t="games"]'); C.wait_for_selector('#gList .li.game', timeout=4000)
    check(C.locator('#gList .li.game').count() == nA, 'tab Ván solo liệt kê trận của Phú, không lẫn trận người khác')
    C.click('#gList .li.game'); C.wait_for_selector('#rpStage .rp-view', timeout=5000); C.wait_for_timeout(400)
    check('Phú' in C.inner_text('#rpv0 .rp-head'), 'xem lại: quán của Phú ở bên trái')
    C.click('#back'); C.wait_for_selector('#gList', timeout=4000)
    C.click('[data-t="runs"]'); C.wait_for_selector('#rList .li.game', timeout=4000)
    check(C.locator('#rList .li.game').count() >= 2, 'tab Lượt bán của Phú')
    shot(C, 'ho-so-nguoi-khac-02-luot-ban')

    print('22b. Tải lại trang vẫn ở đúng màn: hồ sơ người khác, xem lại, bảng xếp hạng')
    C.click('[data-t="games"]'); C.wait_for_selector('#gList .li.game', timeout=4000)
    reload(C); C.wait_for_selector('#gList .li.game', timeout=8000)
    check('Nguyễn Tấn Phú' in C.inner_text('.me') and C.locator('[data-t="games"][aria-selected="true"]').count() == 1, 'tải lại: vẫn ở tab Ván solo trong hồ sơ Phú')
    C.click('#gList .li.game'); C.wait_for_selector('#rpStage .rp-view', timeout=5000)
    reload(C); C.wait_for_selector('#rpStage .rp-view', timeout=8000)
    check(C.locator('#rpStage .rp-view').count() == 2, 'tải lại: vẫn ở màn xem lại trận')
    C.click('#back'); C.wait_for_selector('#gList', timeout=5000)
    check('Nguyễn Tấn Phú' in C.inner_text('.me'), 'Đóng màn xem lại (sau khi tải lại) về hồ sơ Phú')
    C.click('#back'); C.wait_for_selector('#lbBody', timeout=5000); C.click('[data-t="khoa"]'); C.wait_for_timeout(500)
    reload(C); C.wait_for_selector('#lbBody', timeout=8000)
    check(C.locator('[data-t="khoa"][aria-selected="true"]').count() == 1, 'tải lại: vẫn ở bảng xếp hạng tab Khoa')
    C.click('#back'); C.wait_for_selector('#go', timeout=4000)
    reload(C); C.wait_for_selector('#go', timeout=8000)
    check(C.locator('#lbBody').count() == 0, 'về màn chính rồi tải lại thì ở màn chính')

    print('23. Màn chính: bấm thẻ tên/avatar để sửa hồ sơ')
    A.click('#home'); A.wait_for_selector('#edit', timeout=4000)
    check(A.locator('text=Sửa hồ sơ').count() == 0, 'không còn dòng "Sửa hồ sơ" ở cuối màn chính')
    check(A.locator('#edit .me-pen').count() == 1, 'avatar có biểu tượng bút chì')
    ids = A.evaluate("[...document.querySelectorAll('.split-b .col.grow > .btn')].map(b=>b.id)")
    check(ids[:3] == ['go', 'solo', 'lb'], f'thứ tự nút: Mở quán, Solo, Bảng xếp hạng ({ids})')
    check(A.locator('#edit .hang-logo').count() == 1 and 'Đồng' in A.inner_text('#edit') and A.locator('#edit .elo-t').count() == 1,
          f"thẻ tên có huy hiệu hạng ĐBK và danh hiệu Elo ({A.inner_text('#edit')!r})")
    shot(A, 'sua-ho-so-01-man-chinh')
    A.click('#edit .me-av-w'); A.wait_for_selector('#f #ten', timeout=3000)
    check(A.input_value('#ten') == 'Nguyễn Tấn Phú' and A.locator('#pClose').count() == 1, 'bấm avatar mở màn Sửa hồ sơ, có nút Đóng')
    A.click('#pClose'); A.wait_for_selector('#edit', timeout=3000)
    check(True, 'Đóng quay về màn chính')

    print('24. Kết bạn: gửi lời mời, chuông thông báo, đồng ý, danh sách bạn bè')
    C.click('#banbe'); C.wait_for_selector('#bbQ', timeout=4000)
    check('Chưa có bạn bè nào' in C.inner_text('#bbBody'), 'chưa có bạn bè')
    C.fill('#bbQ', 'huy'); C.wait_for_selector('[data-kb="gui"][data-kb-id="B"]', timeout=4000)
    C.click('[data-kb="gui"][data-kb-id="B"]'); C.wait_for_selector('[data-kb="huy"][data-kb-id="B"]', timeout=4000)
    check(F.bb.get(('B', 'C'), {}).get('trang_thai') == 'cho', 'gửi lời mời: server có lời mời đang chờ, nút đổi thành "Đã gửi lời mời · Huỷ"')
    shot(C, 'ban-be-01-tim-va-gui')
    B.evaluate('home()'); B.wait_for_selector('#chuong .bb-so:not([hidden])', timeout=5000)
    check(B.inner_text('#chuong .bb-so') == '1' and B.inner_text('#banbe .bb-so') == '1', 'B: chuông có số 1, nút Bạn bè có 1 lời mời')
    shot(B, 'ban-be-02-chuong-laptop')
    B.click('#chuong'); B.wait_for_selector('.tb-li', timeout=4000)
    check('Lê Minh Anh' in B.inner_text('#tbBody') and 'gửi lời mời kết bạn' in B.inner_text('#tbBody'), 'màn thông báo hiện lời mời của Minh Anh')
    shot(B, 'ban-be-03-thong-bao-laptop')
    B.click('[data-kb="dong_y"][data-kb-id="C"]'); B.wait_for_timeout(900)
    check(F.bb[('B', 'C')]['trang_thai'] == 'ban' and 'đã là bạn bè' in B.inner_text('#tbBody'), 'B đồng ý: hai người thành bạn bè')
    check(all(t['da_doc'] for t in F.tb if t['user_id'] == 'B'), 'mở chuông thì thông báo được đánh dấu đã đọc')
    C.wait_for_timeout(800); C.fill('#bbQ', ''); C.wait_for_timeout(700)
    check('Phạm Gia Huy' in C.inner_text('#bbBody') and C.locator('#bbBody .act[data-uid="B"]').count() == 1, 'C: danh sách bạn bè có Huy, có nút thách đấu')
    shot(C, 'ban-be-04-danh-sach')
    C.click('#back'); C.wait_for_selector('#chuong .bb-so:not([hidden])', timeout=5000)
    C.click('#chuong'); C.wait_for_selector('.tb-li', timeout=4000)
    check('đã đồng ý kết bạn' in C.inner_text('#tbBody'), 'C được báo Huy đã đồng ý')
    C.click('#back'); C.wait_for_timeout(300)

    print('25. Hồ sơ người khác có nút kết bạn; xem lại trận của người khác có nút thách đấu')
    C.evaluate("hoSoScreen('games','A',home)"); C.wait_for_selector('#gList .li.game', timeout=5000)
    check(C.locator('.hs-act [data-kb="gui"][data-kb-id="A"]').count() == 1, 'hồ sơ Phú có nút "Kết bạn"')
    C.click('#gList .li.game'); C.wait_for_selector('[data-rp-thach="A"]', timeout=5000)
    check('Thách đấu Phú' in C.inner_text('.rp-act') and C.locator('.rp-act [data-kb="gui"][data-kb-id="A"]').count() == 1, 'màn xem lại có "Thách đấu Phú" và "Kết bạn"')
    shot(C, 'xem-lai-04-nut-thach-dau')
    C.click('#rpv1 .rp-who'); C.wait_for_selector('.me .nm', timeout=5000)
    check('Phạm Gia Huy' in C.inner_text('.me'), 'bấm tên/avatar trong màn xem lại mở hồ sơ người đó')
    check(C.locator('.hs-act .kb-on').count() == 1 and C.inner_text('.hs-act [data-kb="bo"]') == 'Huỷ kết bạn', 'hồ sơ bạn bè: hiện "Đã là bạn bè" và nút "Huỷ kết bạn" riêng')
    C.click('.hs-act [data-kb="bo"]'); C.wait_for_timeout(200)
    check('Bấm lần nữa' in C.inner_text('.hs-act [data-kb="bo"]') and F.bb[('B', 'C')]['trang_thai'] == 'ban', 'bấm 1 lần chỉ hỏi lại, chưa huỷ')
    C.wait_for_timeout(1200); check('Bấm lần nữa' in C.inner_text('.hs-act [data-kb="bo"]'), 'lời hỏi lại không bị vẽ lại mất')
    shot(C, 'ban-be-05-huy-ket-ban')
    C.click('#back'); C.wait_for_selector('[data-rp-thach="A"]', timeout=5000)
    check(True, 'Đóng hồ sơ quay lại màn xem lại')
    C.click('[data-rp-thach="A"]'); C.wait_for_selector('#send', timeout=4000)
    check('Thách đấu Phú' in C.inner_text('#ov'), 'bấm mở màn thách đấu Phú')
    C.click('#back'); C.wait_for_selector('#rpStage', timeout=5000)
    check(True, 'Đóng màn thách quay lại màn xem lại')

    print('26. Biểu đồ: dòng số liệu phía trên, rê/kéo ngang để xem từng cột')
    A.click('#hoso'); A.wait_for_selector('#cRuns .cread', timeout=5000); A.wait_for_timeout(300)
    A.evaluate("document.querySelector('#cRuns').scrollIntoView({block:'center'})"); A.wait_for_timeout(300)
    box = A.locator('#cRuns svg').bounding_box()
    t1 = A.inner_text('#cRuns .cread')
    cdp = A.context.new_cdp_session(A); y = box['y'] + box['height'] / 2           # kéo ngang bằng ngón tay thật (touch)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width'] - 6, 'y': y}]})
    for k in range(1, 11): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': box['x'] + box['width'] - 6 - k * (box['width'] - 50) / 10, 'y': y}]})
    A.wait_for_timeout(150); t2 = A.inner_text('#cRuns .cread')
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); A.wait_for_timeout(150)
    check(t1 and t2 and t1 != t2 and 'ĐBK' in t2, f'kéo ngang bằng ngón tay: số liệu đổi theo cột ({t1!r} → {t2!r})')
    check(A.inner_text('#cRuns .cread') == t2, 'thả tay vẫn giữ cột đã chọn')
    ry = A.locator('#cRuns .cread').bounding_box()['y']
    check(ry < box['y'], 'dòng số liệu nằm phía trên biểu đồ, ngón tay không che')
    A.locator('#cRuns svg').focus(); A.keyboard.press('End'); t3 = A.inner_text('#cRuns .cread')
    check(t3 == t1, 'phím End về lượt mới nhất')
    A.keyboard.press('ArrowLeft'); A.locator('#cRuns svg').blur(); shot(A, 'bieu-do-01-keo-ngang')
    C.close(); B.close(); A.close(); b.close()
srv.terminate()
print('\nLỗi JavaScript / kiểm tra hỏng:', len(errors))
for e in errors: print(' -', e); CI and _print(f'::error::{e}')
sys.exit(1 if errors else 0)
