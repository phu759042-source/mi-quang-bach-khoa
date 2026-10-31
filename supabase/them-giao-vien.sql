-- ---------------------------------------------------------------------
-- 12. Giáo viên, giảng viên (bản 2.22.0)
--   - profiles.giang_vien: giáo viên/giảng viên của một trường (kể cả BKĐN). Không được vừa là sinh viên BKĐN vừa là giáo viên.
--   - Giáo viên bắt buộc chọn trường, không có khoa/lớp. Điểm của giáo viên tính vào bảng Trường như sinh viên trường đó,
--     đua trên bảng Cá nhân với mọi người; bảng Lớp, Khoa vẫn chỉ tính sinh viên BKĐN.
-- Chạy lại nhiều lần không lỗi.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists giang_vien boolean not null default false;
alter table public.profiles drop constraint if exists profiles_truong_chk;
alter table public.profiles add constraint profiles_truong_chk check (
  case when sinh_vien then truong_id = 'dut' and not giang_vien
       when giang_vien then truong_id is not null
       else truong_id is distinct from 'dut' end);

drop function if exists public.luu_ho_so(text, text, text, boolean, text);
create or replace function public.luu_ho_so(p_ten text, p_khoa_id text default null, p_lop text default null,
                                            p_sinh_vien boolean default true, p_truong_id text default null,
                                            p_giang_vien boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_gv boolean := coalesce(p_giang_vien, false);
  v_sv boolean := coalesce(p_sinh_vien, true) and not v_gv;
  v_khoa text := case when v_sv then nullif(btrim(p_khoa_id), '') end;
  v_lop text := case when v_sv then nullif(upper(btrim(p_lop)), '') end;
  v_truong text := case when v_sv then 'dut' else nullif(btrim(p_truong_id), '') end;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if v_sv and (v_khoa is null or v_lop is null) then raise exception 'Sinh viên Bách Khoa cần chọn khoa và nhập lớp'; end if;
  if v_gv and v_truong is null then raise exception 'Giáo viên cần chọn trường'; end if;
  if not v_sv and not v_gv and v_truong = 'dut' then raise exception 'Sinh viên Bách Khoa cần chọn khoa và nhập lớp'; end if;
  if v_truong is not null and not exists (select 1 from public.truong where id = v_truong) then
    raise exception 'Trường không có trong danh sách'; end if;
  insert into public.profiles (id, ten, khoa_id, lop, sinh_vien, truong_id, giang_vien)
  values (v_uid, btrim(p_ten), v_khoa, v_lop, v_sv, v_truong, v_gv)
  on conflict (id) do update set ten = excluded.ten, khoa_id = excluded.khoa_id, lop = excluded.lop,
    sinh_vien = excluded.sinh_vien, truong_id = excluded.truong_id, giang_vien = excluded.giang_vien;
end $$;

-- Bảng cá nhân: thêm giang_vien (cột mới ở cuối)
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
    t.ten_ngan AS truong,
    p.giang_vien
   FROM profiles p
     LEFT JOIN khoa k ON k.id = p.khoa_id
     LEFT JOIN truong t ON t.id = p.truong_id
  WHERE p.so_luot > 0;

-- Bảng trường: thêm số giáo viên (giáo viên tính chung vào top 30 của trường)
drop view if exists public.bxh_truong;
create view public.bxh_truong with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.truong_id,
            profiles.diem,
            profiles.giang_vien,
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
    rank() OVER (ORDER BY (sum(x.diem) FILTER (WHERE x.rn <= 30)) DESC) AS hang,
    count(*) FILTER (WHERE x.giang_vien) AS so_gv
   FROM x
     JOIN truong t ON t.id = x.truong_id
  GROUP BY t.id, t.ten, t.ten_ngan, t.tinh;
revoke all on public.bxh_sinh_vien, public.bxh_truong from anon, authenticated;
grant select on public.bxh_sinh_vien, public.bxh_truong to anon, authenticated;

drop function if exists public.tim_nguoi_choi(text);
create or replace function public.tim_nguoi_choi(p_q text)
returns table(id uuid, ten text, lop text, khoa text, diem int, elo int, avatar_url text, sinh_vien boolean, truong_id text, truong text, giang_vien boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.ten, p.lop, k.ten, p.diem, p.elo, p.avatar_url, p.sinh_vien, p.truong_id, t.ten_ngan, p.giang_vien
  from public.profiles p left join public.khoa k on k.id = p.khoa_id left join public.truong t on t.id = p.truong_id
  where p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and length(trim(coalesce(p_q,''))) >= 1
    and (p.ten ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or p.lop ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or t.ten_ngan ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%')
  order by p.elo desc, p.diem desc limit 20
$$;

revoke all on function public.luu_ho_so(text, text, text, boolean, text, boolean), public.tim_nguoi_choi(text) from public, anon;
grant execute on function public.luu_ho_so(text, text, text, boolean, text, boolean), public.tim_nguoi_choi(text) to authenticated;
