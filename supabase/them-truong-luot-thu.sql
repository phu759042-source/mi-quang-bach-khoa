-- ---------------------------------------------------------------------
-- 11. Mở cho mọi trường + nhận lượt chơi thử (bản 2.21.0)
--   - Bảng truong: danh sách trường đại học, cao đẳng. BKĐN có id 'dut'.
--   - profiles.truong_id: sinh viên BKĐN (sinh_vien = true) luôn là 'dut';
--     người ngoài BKĐN chọn trường của mình, hoặc để trống nếu không đi học.
--   - View bxh_truong: điểm trường = tổng ĐBK 30 bạn cao nhất trường / 30.
--   - nhan_luot_thu: người mới chơi thử trước rồi mới tạo tài khoản thì được
--     tính lượt chơi thử đó (chỉ một lần, khi tài khoản chưa có lượt nào).
-- Chạy lại nhiều lần không lỗi.
-- ---------------------------------------------------------------------
create table if not exists public.truong (
  id       text primary key,
  ten      text not null unique,
  ten_ngan text not null,
  tinh     text not null
);
alter table public.truong enable row level security;
drop policy if exists "doc truong" on public.truong;
create policy "doc truong" on public.truong for select to anon, authenticated using (true);
revoke all on public.truong from anon, authenticated;
grant select on public.truong to anon, authenticated;

insert into public.truong (id, ten, ten_ngan, tinh) values
  -- Đà Nẵng
  ('dut',      'Trường Đại học Bách Khoa, Đại học Đà Nẵng', 'BK Đà Nẵng', 'Đà Nẵng'),
  ('due',      'Trường Đại học Kinh tế, Đại học Đà Nẵng', 'Kinh tế ĐN', 'Đà Nẵng'),
  ('ued',      'Trường Đại học Sư phạm, Đại học Đà Nẵng', 'Sư phạm ĐN', 'Đà Nẵng'),
  ('ufl',      'Trường Đại học Ngoại ngữ, Đại học Đà Nẵng', 'Ngoại ngữ ĐN', 'Đà Nẵng'),
  ('ute-dn',   'Trường Đại học Sư phạm Kỹ thuật, Đại học Đà Nẵng', 'SPKT ĐN', 'Đà Nẵng'),
  ('vku',      'Trường Đại học CNTT và Truyền thông Việt - Hàn, Đại học Đà Nẵng', 'VKU', 'Đà Nẵng'),
  ('smp',      'Trường Y Dược, Đại học Đà Nẵng', 'Y Dược ĐHĐN', 'Đà Nẵng'),
  ('vnuk',     'Viện Nghiên cứu và Đào tạo Việt - Anh, Đại học Đà Nẵng', 'VNUK', 'Đà Nẵng'),
  ('dtu',      'Trường Đại học Duy Tân', 'Duy Tân', 'Đà Nẵng'),
  ('fpt-dn',   'Trường Đại học FPT Đà Nẵng', 'FPT ĐN', 'Đà Nẵng'),
  ('donga',    'Trường Đại học Đông Á', 'Đông Á', 'Đà Nẵng'),
  ('dau',      'Trường Đại học Kiến trúc Đà Nẵng', 'Kiến trúc ĐN', 'Đà Nẵng'),
  ('dhktyd',   'Trường Đại học Kỹ thuật Y - Dược Đà Nẵng', 'KTYD ĐN', 'Đà Nẵng'),
  ('cdcn-dn',  'Trường Cao đẳng FPT Polytechnic Đà Nẵng', 'Poly ĐN', 'Đà Nẵng'),
  -- Miền Trung, Tây Nguyên
  ('qnu-qnam', 'Trường Đại học Quảng Nam', 'ĐH Quảng Nam', 'Đà Nẵng'),
  ('pdu',      'Trường Đại học Phạm Văn Đồng', 'Phạm Văn Đồng', 'Quảng Ngãi'),
  ('hue-sci',  'Trường Đại học Khoa học, Đại học Huế', 'Khoa học Huế', 'Huế'),
  ('hue-edu',  'Trường Đại học Sư phạm, Đại học Huế', 'Sư phạm Huế', 'Huế'),
  ('hue-med',  'Trường Đại học Y - Dược, Đại học Huế', 'Y Dược Huế', 'Huế'),
  ('hue-hce',  'Trường Đại học Kinh tế, Đại học Huế', 'Kinh tế Huế', 'Huế'),
  ('qnu',      'Trường Đại học Quy Nhơn', 'Quy Nhơn', 'Gia Lai'),
  ('ntu',      'Trường Đại học Nha Trang', 'Nha Trang', 'Khánh Hòa'),
  ('dlu',      'Trường Đại học Đà Lạt', 'Đà Lạt', 'Lâm Đồng'),
  ('ttn',      'Trường Đại học Tây Nguyên', 'Tây Nguyên', 'Đắk Lắk'),
  ('vinh',     'Trường Đại học Vinh', 'ĐH Vinh', 'Nghệ An'),
  -- Hà Nội và miền Bắc
  ('hust',     'Đại học Bách khoa Hà Nội', 'BK Hà Nội', 'Hà Nội'),
  ('uet',      'Trường Đại học Công nghệ, ĐHQG Hà Nội', 'UET', 'Hà Nội'),
  ('hus',      'Trường Đại học Khoa học Tự nhiên, ĐHQG Hà Nội', 'KHTN Hà Nội', 'Hà Nội'),
  ('ussh-hn',  'Trường Đại học Khoa học Xã hội và Nhân văn, ĐHQG Hà Nội', 'Nhân văn HN', 'Hà Nội'),
  ('ulis',     'Trường Đại học Ngoại ngữ, ĐHQG Hà Nội', 'ULIS', 'Hà Nội'),
  ('ueb',      'Trường Đại học Kinh tế, ĐHQG Hà Nội', 'UEB', 'Hà Nội'),
  ('neu',      'Trường Đại học Kinh tế Quốc dân', 'NEU', 'Hà Nội'),
  ('ftu',      'Trường Đại học Ngoại thương', 'Ngoại thương', 'Hà Nội'),
  ('ptit',     'Học viện Công nghệ Bưu chính Viễn thông', 'PTIT', 'Hà Nội'),
  ('huce',     'Trường Đại học Xây dựng Hà Nội', 'Xây dựng HN', 'Hà Nội'),
  ('utc',      'Trường Đại học Giao thông Vận tải', 'Giao thông VT', 'Hà Nội'),
  ('tmu',      'Trường Đại học Thương mại', 'Thương mại', 'Hà Nội'),
  ('hvnh',     'Học viện Ngân hàng', 'HV Ngân hàng', 'Hà Nội'),
  ('aof',      'Học viện Tài chính', 'HV Tài chính', 'Hà Nội'),
  ('hmu',      'Trường Đại học Y Hà Nội', 'Y Hà Nội', 'Hà Nội'),
  ('hnue',     'Trường Đại học Sư phạm Hà Nội', 'Sư phạm HN', 'Hà Nội'),
  ('hanu',     'Trường Đại học Hà Nội', 'HANU', 'Hà Nội'),
  ('tlu',      'Trường Đại học Thủy lợi', 'Thủy lợi', 'Hà Nội'),
  ('humg',     'Trường Đại học Mỏ - Địa chất', 'Mỏ - Địa chất', 'Hà Nội'),
  ('haui',     'Trường Đại học Công nghiệp Hà Nội', 'Công nghiệp HN', 'Hà Nội'),
  ('epu',      'Trường Đại học Điện lực', 'Điện lực', 'Hà Nội'),
  ('hlu',      'Trường Đại học Luật Hà Nội', 'Luật HN', 'Hà Nội'),
  ('phenikaa', 'Trường Đại học Phenikaa', 'Phenikaa', 'Hà Nội'),
  ('fpt-hn',   'Trường Đại học FPT Hà Nội', 'FPT HN', 'Hà Nội'),
  ('actvn',    'Học viện Kỹ thuật Mật mã', 'KMA', 'Hà Nội'),
  ('tnu',      'Đại học Thái Nguyên', 'ĐH Thái Nguyên', 'Thái Nguyên'),
  ('vmu',      'Trường Đại học Hàng hải Việt Nam', 'Hàng hải', 'Hải Phòng'),
  -- TP. Hồ Chí Minh và miền Nam
  ('hcmut',    'Trường Đại học Bách khoa, ĐHQG TP.HCM', 'BK TP.HCM', 'TP.HCM'),
  ('hcmus',    'Trường Đại học Khoa học Tự nhiên, ĐHQG TP.HCM', 'KHTN TP.HCM', 'TP.HCM'),
  ('uit',      'Trường Đại học Công nghệ Thông tin, ĐHQG TP.HCM', 'UIT', 'TP.HCM'),
  ('ussh-hcm', 'Trường Đại học Khoa học Xã hội và Nhân văn, ĐHQG TP.HCM', 'Nhân văn TP.HCM', 'TP.HCM'),
  ('uel',      'Trường Đại học Kinh tế - Luật, ĐHQG TP.HCM', 'UEL', 'TP.HCM'),
  ('iu',       'Trường Đại học Quốc tế, ĐHQG TP.HCM', 'Quốc tế IU', 'TP.HCM'),
  ('ueh',      'Đại học Kinh tế TP.HCM', 'UEH', 'TP.HCM'),
  ('hcmute',   'Trường Đại học Sư phạm Kỹ thuật TP.HCM', 'SPKT TP.HCM', 'TP.HCM'),
  ('tdtu',     'Trường Đại học Tôn Đức Thắng', 'Tôn Đức Thắng', 'TP.HCM'),
  ('hcmue',    'Trường Đại học Sư phạm TP.HCM', 'Sư phạm TP.HCM', 'TP.HCM'),
  ('ump',      'Đại học Y Dược TP.HCM', 'Y Dược TP.HCM', 'TP.HCM'),
  ('iuh',      'Trường Đại học Công nghiệp TP.HCM', 'IUH', 'TP.HCM'),
  ('vlu',      'Trường Đại học Văn Lang', 'Văn Lang', 'TP.HCM'),
  ('hutech',   'Trường Đại học Công nghệ TP.HCM', 'HUTECH', 'TP.HCM'),
  ('rmit',     'Đại học RMIT Việt Nam', 'RMIT', 'TP.HCM'),
  ('fpt-hcm',  'Trường Đại học FPT TP.HCM', 'FPT TP.HCM', 'TP.HCM'),
  ('hub',      'Trường Đại học Ngân hàng TP.HCM', 'Ngân hàng TP.HCM', 'TP.HCM'),
  ('hcmulaw',  'Trường Đại học Luật TP.HCM', 'Luật TP.HCM', 'TP.HCM'),
  ('ut-hcm',   'Trường Đại học Giao thông Vận tải TP.HCM', 'GTVT TP.HCM', 'TP.HCM'),
  ('hcmuaf',   'Trường Đại học Nông Lâm TP.HCM', 'Nông Lâm', 'TP.HCM'),
  ('ou',       'Trường Đại học Mở TP.HCM', 'ĐH Mở TP.HCM', 'TP.HCM'),
  ('sgu',      'Trường Đại học Sài Gòn', 'ĐH Sài Gòn', 'TP.HCM'),
  ('ctu',      'Trường Đại học Cần Thơ', 'Cần Thơ', 'Cần Thơ'),
  ('khac',     'Trường khác', 'Trường khác', 'Khác')
on conflict (id) do update set ten = excluded.ten, ten_ngan = excluded.ten_ngan, tinh = excluded.tinh;

alter table public.profiles add column if not exists truong_id text references public.truong(id);
create index if not exists profiles_truong_idx on public.profiles (truong_id);
update public.profiles set truong_id = 'dut' where sinh_vien and truong_id is distinct from 'dut';
alter table public.profiles drop constraint if exists profiles_truong_chk;
alter table public.profiles add constraint profiles_truong_chk
  check (case when sinh_vien then truong_id = 'dut' else truong_id is distinct from 'dut' end);

-- Hồ sơ: thêm p_truong_id (người ngoài BKĐN). Bỏ bản 4 tham số cũ để gọi theo tên không bị trùng.
drop function if exists public.luu_ho_so(text, text, text, boolean);
create or replace function public.luu_ho_so(p_ten text, p_khoa_id text default null, p_lop text default null,
                                            p_sinh_vien boolean default true, p_truong_id text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_sv boolean := coalesce(p_sinh_vien, true);
  v_khoa text := case when v_sv then nullif(btrim(p_khoa_id), '') end;
  v_lop text := case when v_sv then nullif(upper(btrim(p_lop)), '') end;
  v_truong text := case when v_sv then 'dut' else nullif(btrim(p_truong_id), '') end;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if v_sv and (v_khoa is null or v_lop is null) then raise exception 'Sinh viên Bách Khoa cần chọn khoa và nhập lớp'; end if;
  if not v_sv and v_truong = 'dut' then raise exception 'Sinh viên Bách Khoa cần chọn khoa và nhập lớp'; end if;
  if v_truong is not null and not exists (select 1 from public.truong where id = v_truong) then
    raise exception 'Trường không có trong danh sách'; end if;
  insert into public.profiles (id, ten, khoa_id, lop, sinh_vien, truong_id)
  values (v_uid, btrim(p_ten), v_khoa, v_lop, v_sv, v_truong)
  on conflict (id) do update set ten = excluded.ten, khoa_id = excluded.khoa_id, lop = excluded.lop,
    sinh_vien = excluded.sinh_vien, truong_id = excluded.truong_id;
end $$;

-- Bảng cá nhân: thêm trường (cột mới ở cuối nên create or replace được)
create or replace view public.bxh_sinh_vien with (security_invoker = on) as
 SELECT p.id,
    p.ten,
    p.lop,
    p.khoa_id,
    k.ten AS khoa,
    p.diem,
    p.so_luot,
    p.ngay_xa_nhat,
    rank() OVER (ORDER BY p.diem DESC) AS hang,
        CASE
            WHEN p.ngay_chuoi >= ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text)::date - 1) THEN p.chuoi
            ELSE 0
        END AS chuoi,
    p.avatar_url,
    p.sinh_vien,
        CASE
            WHEN p.sinh_vien THEN rank() OVER (PARTITION BY p.sinh_vien ORDER BY p.diem DESC)
            ELSE NULL::bigint
        END AS hang_sv,
    p.truong_id,
    t.ten_ngan AS truong
   FROM profiles p
     LEFT JOIN khoa k ON k.id = p.khoa_id
     LEFT JOIN truong t ON t.id = p.truong_id
  WHERE p.so_luot > 0;

-- Điểm trường = tổng ĐBK 30 bạn cao nhất trường / 30 (trường chưa đủ 30 người thì phần thiếu tính 0)
create or replace view public.bxh_truong with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.truong_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.truong_id ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.so_luot > 0 AND profiles.truong_id IS NOT NULL AND profiles.truong_id <> 'khac'
        )
 SELECT t.id AS truong_id,
    t.ten,
    t.ten_ngan,
    t.tinh,
    count(*) AS so_nguoi,
    round(sum(x.diem) FILTER (WHERE x.rn <= 30)::numeric / 30.0)::integer AS diem,
    rank() OVER (ORDER BY (sum(x.diem) FILTER (WHERE x.rn <= 30)) DESC) AS hang
   FROM x
     JOIN truong t ON t.id = x.truong_id
  GROUP BY t.id, t.ten, t.ten_ngan, t.tinh;
revoke all on public.bxh_sinh_vien, public.bxh_truong from anon, authenticated;
grant select on public.bxh_sinh_vien, public.bxh_truong to anon, authenticated;

-- Tìm người chơi: trả thêm trường để hiện nhãn trường thay cho "Ngoài BK"
drop function if exists public.tim_nguoi_choi(text);
create or replace function public.tim_nguoi_choi(p_q text)
returns table(id uuid, ten text, lop text, khoa text, diem int, elo int, avatar_url text, sinh_vien boolean, truong_id text, truong text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.ten, p.lop, k.ten, p.diem, p.elo, p.avatar_url, p.sinh_vien, p.truong_id, t.ten_ngan
  from public.profiles p left join public.khoa k on k.id = p.khoa_id left join public.truong t on t.id = p.truong_id
  where p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and length(trim(coalesce(p_q,''))) >= 1
    and (p.ten ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or p.lop ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or t.ten_ngan ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%')
  order by p.elo desc, p.diem desc limit 20
$$;

-- Lượt chơi thử trước khi có tài khoản: tính một lần cho tài khoản chưa có lượt nào.
-- Cùng giới hạn chống gian lận với nop_ket_qua (≤ 5000k/ngày, tim mất ≤ 5 + doanh thu/500),
-- thêm: tối đa 30 ngày, và chỉ khi lượt đó cộng điểm.
create or replace function public.nhan_luot_thu(p_do_kho text, p_so_ngay integer, p_doanh_thu integer, p_tim_mat integer)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id bigint; v_hs numeric;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_do_kho not in ('thuong','kho','dianguc','bk') then raise exception 'Độ khó không hợp lệ'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and so_luot = 0) or exists (select 1 from public.runs where user_id = v_uid) then
    raise exception 'Chỉ tài khoản mới được tính lượt chơi thử'; end if;
  if p_so_ngay not between 1 and 30 or p_tim_mat < 0 or p_tim_mat > 5 + p_doanh_thu / 500
     or p_doanh_thu < 0 or p_doanh_thu > p_so_ngay * 5000 then
    raise exception 'Kết quả không hợp lệ'; end if;
  v_hs := public.he_so(p_do_kho);
  if round(p_doanh_thu * v_hs / 10) - round(p_tim_mat * 15 * v_hs ^ 2) <= 0 then
    raise exception 'Lượt chơi thử không cộng điểm'; end if;
  insert into public.runs (user_id, do_kho, bat_dau) values (v_uid, p_do_kho, now() - make_interval(secs => p_so_ngay * 75))
    returning id into v_id;
  return (public.nop_ket_qua(v_id, p_so_ngay, p_doanh_thu, p_tim_mat)::jsonb || jsonb_build_object('run_id', v_id))::json;
end $$;

revoke all on function public.luu_ho_so(text, text, text, boolean, text), public.tim_nguoi_choi(text),
  public.nhan_luot_thu(text, integer, integer, integer) from public, anon;
grant execute on function public.luu_ho_so(text, text, text, boolean, text), public.tim_nguoi_choi(text),
  public.nhan_luot_thu(text, integer, integer, integer) to authenticated;
