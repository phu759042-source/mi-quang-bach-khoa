"""Sinh supabase/chong-bot-2.26.0.sql: lấy view / hàm đang dùng từ các file trước rồi sửa. Chạy: python3 supabase/_tao_2.26.0.py"""
import re, os
D = os.path.dirname(os.path.abspath(__file__))
doc = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
tay25, kd23 = doc('fair-play-chat-2.25.0.tay.sql'), doc('kiem-duyet-2.23.0.sql')
def khoi(s, dau, cuoi):
    i = s.index(dau); j = s.index(cuoi, i) + len(cuoi); return s[i:j]
views = [khoi(tay25, f'create or replace view public.{v} ', ';\n') for v in ('bxh_sinh_vien', 'bxh_lop', 'bxh_khoa', 'bxh_truong')]
views = [v.replace('WHERE p.so_luot > 0 AND ', 'WHERE ').replace('profiles.so_luot > 0 AND ', '') for v in views]
assert not any('so_luot > 0' in v for v in views)
sl = khoi(tay25, 'create or replace function public.so_lieu_bxh', '$$;')
sl = sl.replace('where p.so_luot > 0 and not public.bi_an_bxh(p.id)', 'where not public.bi_an_bxh(p.id)')
lbg = khoi(kd23, 'create or replace function public.luu_ban_ghi', 'end $$;')
cu = "      if v_cuoi < (r.so_ngay - 1) * 67500 then perform public._danh_dau_nghi_ngo(p_run, 'bản ghi ngắn hơn số ngày'); end if;\n"
assert cu in lbg
lbg = lbg.replace("declare v_uid uuid := auth.uid(); v_id bigint; r record; v_tong numeric; v_max numeric; v_sat int; v_cuoi numeric;",
                  "declare v_uid uuid := auth.uid(); v_id bigint; r record; v_tong numeric; v_max numeric; v_sat int; v_cuoi numeric; v_bot text;")
lbg = lbg.replace(cu, cu + "      v_bot := public._nhip_bat_thuong(p_du_lieu);   -- bản 2.26.0: bot bấm tự động\n      if v_bot is not null then perform public._danh_dau_nghi_ngo(p_run, v_bot); end if;\n")
tay = doc('chong-bot-2.26.0.tay.sql')
out = tay.replace('-- @@VIEW@@', '\n\n'.join(views)).replace('-- @@SO_LIEU@@', sl).replace('-- @@LUU_BAN_GHI@@', lbg)
open(os.path.join(D, 'chong-bot-2.26.0.sql'), 'w', encoding='utf-8').write(out)
print('xong')
