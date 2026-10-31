-- ---------------------------------------------------------------------
-- 13. Kiểm duyệt lượt chơi (bản 2.23.0)
--   - Mức trần doanh thu theo kỷ lục thật: tổng ≤ Σ(2500 + 170·ngày) (ngày 1: 2670k; kỷ lục 1 ngày là 1707k,
--     kỷ lục 20 ngày 76 977k ≤ 85 700k).
--   - Bản ghi phải khớp kết quả nộp: tổng tiền các lần bưng (sự kiện V) lệch ≤ 5% + 50k, mỗi tô ≤ 260k,
--     hai lần bưng cách nhau ≥ 250 ms, sự kiện cuối ≥ (số ngày − 1)·67,5 giây. Sai thì đánh dấu runs.nghi_ngo
--     và profiles.cho_duyet = true (ẩn khỏi bảng xếp hạng đến khi chủ game duyệt).
--   - Lượt mới (runs.can_ban_ghi) đã xong quá 10 phút, doanh thu > 500k mà không có bản ghi cũng bị ẩn.
--   - bi_an_bxh(uid): người này có đang bị ẩn không (dùng trong các view xếp hạng và màn chính).
-- Chạy lại nhiều lần không lỗi.
-- ---------------------------------------------------------------------
alter table public.runs add column if not exists nghi_ngo text;
-- lượt cũ (trước bản này) không bắt buộc bản ghi; lượt mới thì có
alter table public.runs add column if not exists can_ban_ghi boolean not null default false;
alter table public.runs alter column can_ban_ghi set default true;
alter table public.profiles add column if not exists cho_duyet boolean not null default false;

create or replace function public._tran_doanh_thu(p_so_ngay integer)
returns integer language sql immutable set search_path = '' as $$
  select 2500 * p_so_ngay + 85 * p_so_ngay * (p_so_ngay + 1)
$$;

create or replace function public._danh_dau_nghi_ngo(p_run bigint, p_ly_do text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.runs set nghi_ngo = case when nghi_ngo is null then p_ly_do
                                         when position(p_ly_do in nghi_ngo) > 0 then nghi_ngo
                                         else nghi_ngo || '; ' || p_ly_do end
   where id = p_run;
  update public.profiles set cho_duyet = true where id = (select user_id from public.runs where id = p_run);
end $$;

-- Có đang bị ẩn khỏi bảng xếp hạng không: chờ duyệt, hoặc có lượt mới thiếu bản ghi quá 10 phút
create or replace function public.bi_an_bxh(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select cho_duyet from public.profiles where id = p_uid), false)
      or exists (select 1 from public.runs r
                  where r.user_id = p_uid and r.can_ban_ghi and r.trang_thai = 'xong' and r.doanh_thu > 500
                    and r.nghi_ngo is null and r.ket_thuc < now() - interval '10 minutes'
                    and not exists (select 1 from public.ban_ghi b where b.run_id = r.id))
$$;

-- Nộp điểm: thêm mức trần theo ngày
CREATE OR REPLACE FUNCTION public.nop_ket_qua(p_run_id bigint, p_so_ngay integer, p_doanh_thu integer, p_tim_mat integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); r record; v_hs numeric; v_delta int; v_diem int; v_giay numeric; v_hang bigint;
        v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_chuoi int; v_ngay date; v_dai int; v_moi boolean := false;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into r from public.runs where id = p_run_id and user_id = v_uid and trang_thai = 'dang_choi' for update;
  if not found then raise exception 'Lượt chơi không tồn tại hoặc đã nộp'; end if;
  if p_so_ngay not between 1 and 200 or p_tim_mat < 0 or p_tim_mat > 5 + p_doanh_thu / 500
     or p_doanh_thu < 0 or p_doanh_thu > p_so_ngay * 5000 or p_doanh_thu > public._tran_doanh_thu(p_so_ngay) then
    raise exception 'Kết quả không hợp lệ';
  end if;
  v_giay := extract(epoch from now() - r.bat_dau);
  if v_giay < (p_so_ngay - 1) * 75 * 0.9 then
    raise exception 'Thời gian chơi không khớp với số ngày';
  end if;
  -- bản 2.22.1: doanh thu không vượt 60k mỗi giây chơi thật (người giỏi nhất ~47k/giây tính cả lúc mua nâng cấp)
  if p_doanh_thu > 60 * v_giay + 300 then
    raise exception 'Doanh thu không khớp với thời gian chơi';
  end if;
  v_hs := public.he_so(r.do_kho);
  v_delta := round(p_doanh_thu * v_hs / 10)::int - round(p_tim_mat * 15 * v_hs ^ 2)::int;

  select chuoi, ngay_chuoi, chuoi_dai_nhat into v_chuoi, v_ngay, v_dai from public.profiles where id = v_uid for update;
  if v_ngay is distinct from v_today then
    v_moi := true;
    v_chuoi := case when v_ngay = v_today - 1 then v_chuoi + 1 else 1 end;
    v_dai := greatest(v_dai, v_chuoi);
  end if;

  update public.profiles
     set diem = greatest(0, diem + v_delta), so_luot = so_luot + 1,
         ngay_xa_nhat = greatest(ngay_xa_nhat, p_so_ngay),
         chuoi = v_chuoi, ngay_chuoi = v_today, chuoi_dai_nhat = v_dai
   where id = v_uid returning diem into v_diem;
  update public.runs set trang_thai = 'xong', so_ngay = p_so_ngay, doanh_thu = p_doanh_thu,
     tim_mat = p_tim_mat, delta = v_delta, diem_sau = v_diem, ket_thuc = now() where id = p_run_id;
  select count(*) + 1 into v_hang from public.profiles where diem > v_diem;
  return json_build_object('delta', v_delta, 'diem', v_diem, 'hang', v_hang,
    'chuoi', v_chuoi, 'chuoi_moi', v_moi, 'chuoi_dai_nhat', v_dai);
end $function$;

-- Lượt chơi thử không có bản ghi: không bắt buộc bản ghi
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
  if p_so_ngay > 10 or p_doanh_thu > p_so_ngay * 3000
     or round(p_doanh_thu * v_hs / 10) - round(p_tim_mat * 15 * v_hs ^ 2) > 1500 then
    raise exception 'Kết quả không hợp lệ'; end if;
  insert into public.runs (user_id, do_kho, bat_dau, can_ban_ghi) values (v_uid, p_do_kho, now() - make_interval(secs => p_so_ngay * 75), false)
    returning id into v_id;
  return (public.nop_ket_qua(v_id, p_so_ngay, p_doanh_thu, p_tim_mat)::jsonb || jsonb_build_object('run_id', v_id))::json;
end $$;

-- Lưu bản ghi: với lượt thường, đối chiếu bản ghi với kết quả đã nộp
create or replace function public.luu_ban_ghi(p_thach_dau bigint, p_run bigint, p_du_lieu jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id bigint; r record; v_tong numeric; v_max numeric; v_sat int; v_cuoi numeric;
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
    end if;
  end if;
  insert into public.ban_ghi (user_id, thach_dau_id, run_id, du_lieu) values (v_uid, p_thach_dau, p_run, p_du_lieu)
    on conflict do nothing returning id into v_id;
  -- chỉ giữ 50 bản ghi lượt thường mới nhất của mỗi người (bản ghi solo giữ hết)
  delete from public.ban_ghi where user_id = v_uid and run_id is not null and id not in
    (select id from public.ban_ghi where user_id = v_uid and run_id is not null order by tao_luc desc limit 50);
  return v_id;
end $$;

-- Bảng xếp hạng: bỏ người đang bị ẩn
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
  WHERE p.so_luot > 0 AND NOT public.bi_an_bxh(p.id);

create or replace view public.bxh_lop with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.lop,
            profiles.khoa_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.lop ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.so_luot > 0 AND profiles.sinh_vien AND NOT public.bi_an_bxh(profiles.id)
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
          WHERE profiles.so_luot > 0 AND profiles.sinh_vien AND NOT public.bi_an_bxh(profiles.id)
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
          WHERE profiles.so_luot > 0 AND profiles.truong_id IS NOT NULL AND profiles.truong_id <> 'khac'
            AND NOT public.bi_an_bxh(profiles.id)
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
revoke all on function public._tran_doanh_thu(integer), public._danh_dau_nghi_ngo(bigint, text), public.bi_an_bxh(uuid),
  public.nop_ket_qua(bigint, integer, integer, integer), public.nhan_luot_thu(text, integer, integer, integer),
  public.luu_ban_ghi(bigint, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.bi_an_bxh(uuid) to anon, authenticated;
grant execute on function public.nop_ket_qua(bigint, integer, integer, integer), public.nhan_luot_thu(text, integer, integer, integer),
  public.luu_ban_ghi(bigint, bigint, jsonb) to authenticated;

-- Đánh dấu ngay các lượt cũ có bản ghi không khớp (đã thấy 2 lượt: bưng 0k mà nộp 1000k / 5000k)
do $$
declare x record;
begin
  for x in select r.id, r.doanh_thu,
             (select coalesce(sum((e->>4)::numeric), 0) from jsonb_array_elements(b.du_lieu->'ev') e where e->>1 = 'V') tong
             from public.runs r join public.ban_ghi b on b.run_id = r.id
            where r.trang_thai = 'xong' and r.doanh_thu > 0 and r.nghi_ngo is null loop
    if abs(x.tong - x.doanh_thu) > x.doanh_thu * 0.05 + 50 then
      perform public._danh_dau_nghi_ngo(x.id, format('bản ghi bưng %sk, nộp %sk', x.tong, x.doanh_thu));
    end if;
  end loop;
end $$;
