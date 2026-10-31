-- ---------------------------------------------------------------------
-- 16. Chống bot bấm tự động + bảng xếp hạng có cả người chưa bán (bản 2.26.0)
--   - _nhip_bat_thuong(bản ghi): nhịp bấm của người thật rất lộn xộn. Bot dùng hẹn giờ thì các lần bấm
--     cách nhau gần như y hệt (vụ 31/10/2026: 71–84% các lần bấm cách nhau đúng 250 ms; người thật cao nhất 25%),
--     hoặc nhanh hơn tay người (trung vị 36 ms; người thật nhanh nhất ~150 ms).
--     Đánh dấu khi ≥ 60 lần bấm và: ≥ 45% rơi vào cùng một ô 10 ms, hoặc trung vị < 60 ms.
--   - Bảng Cá nhân/Lớp/Khoa/Trường có cả tài khoản đã xác thực nhưng chưa bán lượt nào (0 ĐBK).
--   - profiles.lan_cuoi: điền sẵn từ lần đăng nhập gần nhất / lượt bán gần nhất cho tài khoản cũ.
-- Chạy lại nhiều lần không lỗi. Cần chạy sau phần 15.
-- ---------------------------------------------------------------------
create or replace function public._nhip_bat_thuong(p_du_lieu jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v_n int; v_mx int; v_o numeric; v_med numeric;
begin
  with e as (select (x->>0)::numeric ms from jsonb_array_elements(p_du_lieu->'ev') x
              where jsonb_typeof(x) = 'array' and x->>1 in ('A','R','P','X','V','W') and (x->>0) ~ '^[0-9.]+$'),
       g as (select ms - lag(ms) over (order by ms) gap from e)
  select percentile_cont(.5) within group (order by gap) into v_med from g where gap between 0 and 3000;
  with e as (select (x->>0)::numeric ms from jsonb_array_elements(p_du_lieu->'ev') x
              where jsonb_typeof(x) = 'array' and x->>1 in ('A','R','P','X','V','W') and (x->>0) ~ '^[0-9.]+$'),
       g as (select ms - lag(ms) over (order by ms) gap from e),
       h as (select floor(gap / 10) o, count(*) c from g where gap between 20 and 1500 group by 1)
  select sum(c), max(c), (select o from h order by c desc limit 1) into v_n, v_mx, v_o from h;
  if coalesce(v_n, 0) < 60 then return null; end if;
  if v_mx::numeric / v_n >= 0.45 then
    return format('nhịp bấm đều bất thường: %s%% số lần bấm cách nhau ~%s ms (bot?)', round(100.0 * v_mx / v_n), (v_o * 10)::int);
  end if;
  if v_med < 60 then return format('bấm nhanh hơn tay người: trung vị %s ms giữa hai lần bấm (bot?)', round(v_med)); end if;
  return null;
end $$;

create or replace function public.luu_ban_ghi(p_thach_dau bigint, p_run bigint, p_du_lieu jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id bigint; r record; v_tong numeric; v_max numeric; v_sat int; v_cuoi numeric; v_bot text;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if (p_thach_dau is null) = (p_run is null) then raise exception 'Bản ghi phải thuộc một trận hoặc một lượt'; end if;
  if jsonb_typeof(p_du_lieu->'ev') is distinct from 'array' then raise exception 'Bản ghi không hợp lệ'; end if;
  if pg_column_size(p_du_lieu) > 400000 then raise exception 'Bản ghi quá lớn'; end if;
  if p_thach_dau is not null then
    if not exists (select 1 from public.thach_dau where id = p_thach_dau and v_uid in (a, b) and trang_thai = 'xong') then
      raise exception 'Không tìm thấy trận đã kết thúc'; end if;
  else
    select * into r from public.runs where id = p_run and user_id = v_uid and trang_thai <> 'dang_choi';
    if not found then raise exception 'Không tìm thấy lượt chơi đã kết thúc'; end if;
    if exists (select 1 from public.ban_ghi where run_id = p_run and user_id = v_uid) then return null; end if;
    -- đối chiếu (bản 2.23.0)
    with v as (select (e->>0)::numeric ms, (e->>4)::numeric tien,
                      lag((e->>0)::numeric) over (order by (e->>0)::numeric) truoc
                 from jsonb_array_elements(p_du_lieu->'ev') e
                where jsonb_typeof(e) = 'array' and e->>1 = 'V'
                  and (e->>0) ~ '^[0-9.]+$' and (e->>4) ~ '^-?[0-9.]+$')
    select coalesce(sum(tien), 0), coalesce(max(tien), 0), count(*) filter (where ms - truoc < 250) into v_tong, v_max, v_sat from v;
    select coalesce(max((e->>0)::numeric), 0) into v_cuoi from jsonb_array_elements(p_du_lieu->'ev') e
     where jsonb_typeof(e) = 'array' and (e->>0) ~ '^[0-9.]+$';
    if r.trang_thai = 'xong' and r.doanh_thu > 0 then
      if abs(v_tong - r.doanh_thu) > r.doanh_thu * 0.05 + 50 then
        perform public._danh_dau_nghi_ngo(p_run, format('bản ghi bưng %sk, nộp %sk', v_tong, r.doanh_thu)); end if;
      if v_max > 260 then perform public._danh_dau_nghi_ngo(p_run, format('một tô %sk', v_max)); end if;
      if v_sat > 0 then perform public._danh_dau_nghi_ngo(p_run, format('%s lần bưng cách nhau dưới 0,25 giây', v_sat)); end if;
      if v_cuoi < (r.so_ngay - 1) * 67500 then perform public._danh_dau_nghi_ngo(p_run, 'bản ghi ngắn hơn số ngày'); end if;
      v_bot := public._nhip_bat_thuong(p_du_lieu);   -- bản 2.26.0: bot bấm tự động
      if v_bot is not null then perform public._danh_dau_nghi_ngo(p_run, v_bot); end if;
    end if;
  end if;
  insert into public.ban_ghi (user_id, thach_dau_id, run_id, du_lieu) values (v_uid, p_thach_dau, p_run, p_du_lieu)
    on conflict do nothing returning id into v_id;
  -- chỉ giữ 50 bản ghi lượt thường mới nhất của mỗi người (bản ghi solo giữ hết)
  delete from public.ban_ghi where user_id = v_uid and run_id is not null and id not in
    (select id from public.ban_ghi where user_id = v_uid and run_id is not null order by tao_luc desc limit 50);
  return v_id;
end $$;

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
    p.giang_vien,
    p.bi_ban
   FROM profiles p
     LEFT JOIN khoa k ON k.id = p.khoa_id
     LEFT JOIN truong t ON t.id = p.truong_id
  WHERE NOT public.bi_an_bxh(p.id);


create or replace view public.bxh_lop with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.lop,
            profiles.khoa_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.lop ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.sinh_vien AND NOT profiles.bi_ban AND NOT public.bi_an_bxh(profiles.id)
        )
 SELECT lop,
    max(khoa_id) AS khoa_id,
    count(*) AS so_nguoi,
    round(sum(diem) FILTER (WHERE rn <= 10)::numeric / 10.0)::integer AS diem,
    rank() OVER (ORDER BY (sum(diem) FILTER (WHERE rn <= 10)) DESC) AS hang
   FROM x
  GROUP BY lop;


create or replace view public.bxh_khoa with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.khoa_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.khoa_id ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.sinh_vien AND NOT profiles.bi_ban AND NOT public.bi_an_bxh(profiles.id)
        )
 SELECT k.id AS khoa_id,
    k.ten AS khoa,
    count(x.khoa_id) AS so_nguoi,
    COALESCE(round(sum(x.diem) FILTER (WHERE x.rn <= 30)::numeric / 30.0), 0::numeric)::integer AS diem,
    rank() OVER (ORDER BY (COALESCE(sum(x.diem) FILTER (WHERE x.rn <= 30), 0::bigint)) DESC) AS hang
   FROM khoa k
     LEFT JOIN x ON x.khoa_id = k.id
  GROUP BY k.id, k.ten;


create or replace view public.bxh_truong with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.truong_id,
            profiles.diem,
            profiles.giang_vien,
            row_number() OVER (PARTITION BY profiles.truong_id ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.truong_id IS NOT NULL AND profiles.truong_id <> 'khac'
            AND NOT profiles.bi_ban AND NOT public.bi_an_bxh(profiles.id)
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

revoke all on public.bxh_sinh_vien, public.bxh_lop, public.bxh_khoa, public.bxh_truong from anon, authenticated;
grant select on public.bxh_sinh_vien, public.bxh_lop, public.bxh_khoa, public.bxh_truong to anon, authenticated;

create or replace function public.so_lieu_bxh(p_truong text default null)
returns json language sql stable security definer set search_path = '' as $$
  with ca as (select p.* from public.profiles p where not public.bi_an_bxh(p.id))
  select json_build_object(
    'ca_nhan', (select count(*) from ca),
    'sinh_vien', (select count(*) from ca where sinh_vien),
    'giao_vien', (select count(*) from ca where giang_vien),
    'truong_minh', (select count(*) from ca where p_truong is not null and truong_id = p_truong),
    'truong', (select count(distinct truong_id) from ca where truong_id is not null and truong_id <> 'khac' and not bi_ban),
    'lop', (select count(distinct lop) from ca where sinh_vien and not bi_ban),
    'khoa', (select count(distinct khoa_id) from ca where sinh_vien and not bi_ban),
    'solo', (select count(*) from public.profiles),
    'solo_da_dau', (select count(*) from public.profiles where solo_thang + solo_thua + solo_hoa > 0))
$$;

-- Lần cuối online cho tài khoản chưa mở game từ bản 2.25.0
update public.profiles p set lan_cuoi = x.luc
  from (select p2.id, greatest(u.last_sign_in_at, (select max(r.ket_thuc) from public.runs r where r.user_id = p2.id)) luc
          from public.profiles p2 join auth.users u on u.id = p2.id) x
 where x.id = p.id and x.luc is not null and (p.lan_cuoi is null or p.lan_cuoi < x.luc);

revoke all on function public._nhip_bat_thuong(jsonb), public.luu_ban_ghi(bigint, bigint, jsonb), public.so_lieu_bxh(text) from public, anon, authenticated;
grant execute on function public.luu_ban_ghi(bigint, bigint, jsonb) to authenticated;
grant execute on function public.so_lieu_bxh(text) to anon, authenticated;

-- Quét các bản ghi đã có: đánh dấu lượt có nhịp bấm của bot (chưa bị huỷ)
do $$ declare x record; v text;
begin
  for x in select r.id, b.du_lieu from public.runs r join public.ban_ghi b on b.run_id = r.id
            where r.trang_thai = 'xong' and not r.da_huy and r.doanh_thu > 0 loop
    v := public._nhip_bat_thuong(x.du_lieu);
    if v is not null then perform public._danh_dau_nghi_ngo(x.id, v); end if;
  end loop;
end $$;
