"""Sinh supabase/fair-play-chat-2.25.0.sql: phần viết tay (fair-play-chat-2.25.0.tay.sql) + các hàm cũ
được chép từ schema.sql và chèn thêm dòng chặn tài khoản bị ban. Chạy: python3 supabase/_tao_2.25.0.py"""
import re, os
D = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(D, 'schema.sql'), encoding='utf-8').read()
CHAN = ['bat_dau_luot', 'gui_thach_dau', 'tra_loi_thach_dau', 'gui_ket_ban', 'luu_ho_so', 'luu_avatar']
out = []
for name in CHAN:
    i = [m.start() for m in re.finditer(r'(?i)create or replace function public\.' + name + r'\(', s)][-1]
    m = re.compile(r'(\$function\$|\$\$);').search(s, s.index('AS $function$' if s[i:i+400].find('AS $function$') >= 0 else 'as $$', i) + 8)
    blk = s[i:m.end()]
    a = re.search(r"Chưa đăng nhập'; end if;\n", blk)
    assert a, name
    blk = blk[:a.end()] + "  perform public._kiem_ban();   -- bản 2.25.0: tài khoản bị ban không làm được gì\n" + blk[a.end():]
    out.append(blk)
tay = open(os.path.join(D, 'fair-play-chat-2.25.0.tay.sql'), encoding='utf-8').read()
open(os.path.join(D, 'fair-play-chat-2.25.0.sql'), 'w', encoding='utf-8').write(
    tay.replace('-- @@CHEN_KIEM_BAN@@', '\n\n'.join(out)))
print('xong')
