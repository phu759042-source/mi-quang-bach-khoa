-- =====================================================================
-- Mì Quảng Bách Khoa · Cấu trúc database (Supabase / Postgres)
-- Xuất từ project fvacenxojembebqqxgfp ngày 2026-10-26, sau bản 2.9.1; thêm xin hoà ở bản 2.10.0, bản ghi xem lại ở 2.11.0.
--
-- Dựng lại database trống: Supabase › SQL Editor › dán cả file › Run.
-- Chạy trên project MỚI (chưa có bảng). File KHÔNG chứa dữ liệu người chơi
-- và KHÔNG chứa khoá bí mật; khoá đẩy thông báo tạo riêng (xem supabase/README.md).
--
-- Khi sửa database: sửa trên Supabase xong thì sửa luôn file này cho khớp,
-- rồi chạy tests/kiem_tra_schema.sh để chắc file vẫn dựng lại được.
-- =====================================================================

create extension if not exists pg_net with schema extensions;   -- gọi Edge Function từ trigger
-- supabase_vault có sẵn trên mọi project Supabase.

-- ---------------------------------------------------------------------
-- 1. Bảng
-- ---------------------------------------------------------------------
create table public.khoa (
  id  text primary key,
  ten text not null
);

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  ten            text not null check (char_length(ten) >= 2 and char_length(ten) <= 40),
  khoa_id        text references public.khoa(id),
  lop            text check (lop ~ '^[0-9]{2}[A-Z0-9_]{1,14}$'),
  diem           integer not null default 0 check (diem >= 0),
  so_luot        integer not null default 0,
  ngay_xa_nhat   integer not null default 0,
  created_at     timestamptz not null default now(),
  chuoi          integer not null default 0,
  chuoi_dai_nhat integer not null default 0,
  ngay_chuoi     date,
  avatar_url     text,
  avatar_khung   jsonb,
  elo            integer not null default 1200,
  solo_thang     integer not null default 0,
  solo_thua      integer not null default 0,
  solo_hoa       integer not null default 0,
  -- bản 2.17.0: sinh viên BKĐN thì bắt buộc có khoa + lớp; người ngoài thì để trống cả hai
  sinh_vien      boolean not null default true,
  constraint profiles_sinh_vien_chk check (case when sinh_vien then khoa_id is not null and lop is not null
                                                else khoa_id is null and lop is null end)
);
create index profiles_khoa_idx on public.profiles (khoa_id);
create index profiles_diem_idx on public.profiles (diem desc);
create index profiles_lop_idx  on public.profiles (lop);

create table public.runs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  do_kho     text not null check (do_kho in ('thuong','kho','dianguc','bk')),
  trang_thai text not null default 'dang_choi' check (trang_thai in ('dang_choi','xong','bo_cuoc')),
  so_ngay    integer,
  doanh_thu  integer,
  tim_mat    integer,
  delta      integer,
  diem_sau   integer,
  bat_dau    timestamptz not null default now(),
  ket_thuc   timestamptz
);
create index runs_user_idx on public.runs (user_id, bat_dau desc);

-- Bộ đếm truy cập kiểu Facemash
create table public.luot_truy_cap (
  khach uuid not null,
  ngay  date not null default ((now() at time zone 'Asia/Ho_Chi_Minh'))::date,
  primary key (khach, ngay)
);
create table public.khach_ghe (
  khach    uuid primary key,
  lan_dau  timestamptz not null default now(),
  lan_cuoi timestamptz not null default now(),
  so_lan   integer not null default 1
);
-- bản 2.15.3: mã băm địa chỉ mạng của người mới, để giới hạn 20 người mới / giờ / mạng (xoá sau 1 ngày)
create table public.khach_moi (
  ip  text not null,
  luc timestamptz not null default now()
);
create index khach_moi_ip_idx on public.khach_moi (ip, luc);
create table public.thong_ke (
  ten     text primary key,
  gia_tri bigint not null default 0
);

-- Solo: lời thách và trận đấu
create table public.thach_dau (
  id         bigint generated always as identity primary key,
  a          uuid not null references public.profiles(id) on delete cascade,   -- người thách
  b          uuid not null references public.profiles(id) on delete cascade,   -- người được thách
  do_kho     text not null check (do_kho in ('thuong','kho','dianguc','bk')),
  che_do     text not null check (che_do in ('sinh_ton','diem')),
  trang_thai text not null default 'cho' check (trang_thai in ('cho','tu_choi','huy','het_han','dang_dau','xong')),
  tao_luc    timestamptz not null default now(),
  het_han    timestamptz not null default now() + interval '60 seconds',
  bat_dau    timestamptz, ket_thuc timestamptz,
  a_ngay integer not null default 0, a_doanh_thu integer not null default 0, a_tim_mat integer not null default 0,
  a_xong boolean not null default false, a_ping timestamptz, a_het_tim_luc timestamptz,
  b_ngay integer not null default 0, b_doanh_thu integer not null default 0, b_tim_mat integer not null default 0,
  b_xong boolean not null default false, b_ping timestamptz, b_het_tim_luc timestamptz,
  thang uuid, ly_do text,
  elo_a integer, elo_b integer, doi_a integer, doi_b integer,
  xin_hoa_boi uuid, xin_hoa_luc timestamptz,                         -- lời xin hoà đang chờ (20 giây)
  a_xin_hoa integer not null default 0, b_xin_hoa integer not null default 0,  -- tối đa 3 lần mỗi người
  check (a <> b)
);
create index thach_dau_a_idx on public.thach_dau (a, trang_thai);
create index thach_dau_b_idx on public.thach_dau (b, trang_thai);

-- Đăng ký nhận thông báo đẩy của từng máy
create table public.push_sub (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh   text not null,
  auth     text not null,
  tao_luc  timestamptz not null default now()
);
create index push_sub_user_idx on public.push_sub (user_id);

-- Bản ghi thao tác để xem lại (bản 2.11.0): mỗi người một bản cho mỗi trận solo / lượt thường
create table if not exists public.ban_ghi (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  thach_dau_id bigint references public.thach_dau(id) on delete cascade,
  run_id       bigint references public.runs(id) on delete cascade,
  du_lieu      jsonb not null,
  tao_luc      timestamptz not null default now(),
  check ((thach_dau_id is null) <> (run_id is null)),
  unique (user_id, thach_dau_id),
  unique (user_id, run_id)
);
create index if not exists ban_ghi_thach_dau_idx on public.ban_ghi (thach_dau_id);
create index if not exists ban_ghi_run_idx on public.ban_ghi (run_id);
create index if not exists ban_ghi_user_idx on public.ban_ghi (user_id, tao_luc desc);

-- ---------------------------------------------------------------------
-- 2. Quyền đọc: client chỉ được ĐỌC, mọi thao tác ghi đi qua hàm RPC ở mục 4
-- ---------------------------------------------------------------------
alter table public.khoa          enable row level security;
alter table public.profiles      enable row level security;
alter table public.runs          enable row level security;
alter table public.luot_truy_cap enable row level security;
alter table public.khach_ghe     enable row level security;
alter table public.khach_moi     enable row level security;
alter table public.thong_ke      enable row level security;
alter table public.thach_dau     enable row level security;
alter table public.push_sub      enable row level security;

create policy "doc khoa"          on public.khoa      for select to anon, authenticated using (true);
create policy "doc ho so"         on public.profiles  for select to anon, authenticated using (true);
create policy "doc luot cua minh" on public.runs      for select to authenticated using (user_id = (select auth.uid()));
create policy "doc tran cua minh" on public.thach_dau for select to authenticated using ((select auth.uid()) in (a, b));
-- Hồ sơ công khai (bản 2.12.0): người đã đăng nhập xem được trận/lượt ĐÃ KẾT THÚC của người khác.
-- Trận đang đấu, lời thách đang chờ và lượt đang chơi vẫn chỉ người trong cuộc đọc được.
create policy "doc tran da xong"  on public.thach_dau for select to authenticated using (trang_thai = 'xong');
create policy "doc luot da xong"  on public.runs      for select to authenticated using (trang_thai <> 'dang_choi');

-- Supabase tự cấp mọi quyền cho anon/authenticated trên bảng mới: thu lại hết, chỉ cấp quyền đọc cần thiết
revoke all on public.khach_moi from anon, authenticated;
revoke all on public.khoa, public.profiles, public.runs, public.luot_truy_cap, public.khach_ghe,
              public.thong_ke, public.thach_dau, public.push_sub, public.ban_ghi from anon, authenticated;
grant select on public.khoa, public.profiles to anon, authenticated;
grant select on public.runs, public.thach_dau, public.ban_ghi to authenticated;

alter table public.ban_ghi enable row level security;
drop policy if exists "doc ban ghi" on public.ban_ghi;
-- Bản ghi chỉ được gửi khi trận/lượt đã kết thúc (luu_ban_ghi), nên người đã đăng nhập đều xem lại được
create policy "doc ban ghi" on public.ban_ghi for select to authenticated using (true);

-- Realtime cho lời thách và tiến độ trận solo (RLS ở trên vẫn áp dụng)
alter publication supabase_realtime add table public.thach_dau;

-- ---------------------------------------------------------------------
-- 3. Bảng xếp hạng (view chạy với quyền người xem, nên RLS vẫn áp dụng)
-- ---------------------------------------------------------------------
create view public.bxh_sinh_vien with (security_invoker = on) as
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
        END AS hang_sv
   FROM profiles p
     LEFT JOIN khoa k ON k.id = p.khoa_id
  WHERE p.so_luot > 0;

-- Điểm lớp = tổng ĐBK 10 bạn cao nhất / 10
create view public.bxh_lop with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.lop,
            profiles.khoa_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.lop ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.so_luot > 0 AND profiles.sinh_vien
        )
 SELECT lop,
    max(khoa_id) AS khoa_id,
    count(*) AS so_nguoi,
    round(sum(diem) FILTER (WHERE rn <= 10)::numeric / 10.0)::integer AS diem,
    rank() OVER (ORDER BY (sum(diem) FILTER (WHERE rn <= 10)) DESC) AS hang
   FROM x
  GROUP BY lop;

-- Điểm khoa = tổng ĐBK 30 bạn cao nhất / 30
create view public.bxh_khoa with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.khoa_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.khoa_id ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.so_luot > 0 AND profiles.sinh_vien
        )
 SELECT k.id AS khoa_id,
    k.ten AS khoa,
    count(x.khoa_id) AS so_nguoi,
    COALESCE(round(sum(x.diem) FILTER (WHERE x.rn <= 30)::numeric / 30.0), 0::numeric)::integer AS diem,
    rank() OVER (ORDER BY (COALESCE(sum(x.diem) FILTER (WHERE x.rn <= 30), 0::bigint)) DESC) AS hang
   FROM khoa k
     LEFT JOIN x ON x.khoa_id = k.id
  GROUP BY k.id, k.ten;

-- Không còn được game dùng từ bản 2.9.0 (tab Solo đọc thẳng profiles), giữ lại cho khớp server
create view public.bxh_solo with (security_invoker = on) as
 SELECT p.id,
    p.ten,
    p.lop,
    p.khoa_id,
    k.ten AS khoa,
    p.elo,
    p.solo_thang,
    p.solo_thua,
    p.solo_hoa,
    p.avatar_url,
    rank() OVER (ORDER BY p.elo DESC) AS hang
   FROM profiles p
     LEFT JOIN khoa k ON k.id = p.khoa_id
  WHERE (p.solo_thang + p.solo_thua + p.solo_hoa) > 0;

revoke all on public.bxh_sinh_vien, public.bxh_lop, public.bxh_khoa, public.bxh_solo from anon, authenticated;
grant select on public.bxh_sinh_vien, public.bxh_lop, public.bxh_khoa, public.bxh_solo to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Hàm (RPC). SECURITY DEFINER + search_path rỗng; tự kiểm tra auth.uid()
-- ---------------------------------------------------------------------
-- 4a. Chế độ thường, hồ sơ, avatar, bộ đếm truy cập
CREATE OR REPLACE FUNCTION public.he_so(p_do_kho text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_do_kho when 'thuong' then 1.0 when 'kho' then 1.5 when 'dianguc' then 2.2 when 'bk' then 3.0 end
$function$;

CREATE OR REPLACE FUNCTION public._xu_ly_bo_cuoc(p_uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; v_delta int; v_diem int;
begin
  for r in select id, do_kho from public.runs
           where user_id = p_uid and trang_thai = 'dang_choi'
           order by bat_dau for update loop
    v_delta := -round(5 * 15 * public.he_so(r.do_kho) ^ 2)::int;
    update public.profiles set diem = greatest(0, diem + v_delta), so_luot = so_luot + 1
      where id = p_uid returning diem into v_diem;
    update public.runs set trang_thai = 'bo_cuoc', so_ngay = 0, doanh_thu = 0, tim_mat = 5,
      delta = v_delta, diem_sau = v_diem, ket_thuc = now() where id = r.id;
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.bat_dau_luot(p_do_kho text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_id bigint;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_do_kho not in ('thuong','kho','dianguc','bk') then raise exception 'Độ khó không hợp lệ'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'Chưa có hồ sơ'; end if;
  if exists (select 1 from public.runs where user_id = v_uid and bat_dau > now() - interval '5 seconds') then
    raise exception 'Thao tác quá nhanh, thử lại sau vài giây';
  end if;
  perform public._xu_ly_bo_cuoc(v_uid);
  insert into public.runs (user_id, do_kho) values (v_uid, p_do_kho) returning id into v_id;
  return v_id;
end $function$;

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
     or p_doanh_thu < 0 or p_doanh_thu > p_so_ngay * 5000 then
    raise exception 'Kết quả không hợp lệ';
  end if;
  v_giay := extract(epoch from now() - r.bat_dau);
  if v_giay < (p_so_ngay - 1) * 75 * 0.9 then
    raise exception 'Thời gian chơi không khớp với số ngày';
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

-- bản 2.17.0: thêm p_sinh_vien. Không phải sinh viên BKĐN thì bỏ qua khoa và lớp.
CREATE OR REPLACE FUNCTION public.luu_ho_so(p_ten text, p_khoa_id text DEFAULT NULL, p_lop text DEFAULT NULL, p_sinh_vien boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_sv boolean := coalesce(p_sinh_vien, true);
  v_khoa text := case when v_sv then nullif(btrim(p_khoa_id), '') end;
  v_lop text := case when v_sv then nullif(upper(btrim(p_lop)), '') end;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if v_sv and (v_khoa is null or v_lop is null) then raise exception 'Sinh viên Bách Khoa cần chọn khoa và nhập lớp'; end if;
  insert into public.profiles (id, ten, khoa_id, lop, sinh_vien)
  values (v_uid, btrim(p_ten), v_khoa, v_lop, v_sv)
  on conflict (id) do update set ten = excluded.ten, khoa_id = excluded.khoa_id, lop = excluded.lop, sinh_vien = excluded.sinh_vien;
end $function$;

CREATE OR REPLACE FUNCTION public.luu_avatar(p_url text, p_khung jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_prefix text;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  v_prefix := 'https://fvacenxojembebqqxgfp.supabase.co/storage/v1/object/public/avatars/' || v_uid::text || '/';
  if p_url is not null and left(p_url, length(v_prefix)) <> v_prefix then raise exception 'Link avatar không hợp lệ'; end if;
  update public.profiles set avatar_url = p_url, avatar_khung = p_khung where id = v_uid;
end $function$;

create or replace function public.ghi_luot_truy_cap(p_khach uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_cuoi timestamptz; v_h json; v_ip text; n int;
begin
  if p_khach is not null then
    select lan_cuoi into v_cuoi from public.khach_ghe where khach = p_khach for update;
    if not found then
      -- người mới: giới hạn theo địa chỉ mạng để một máy không tạo hàng loạt mã giả
      begin v_h := nullif(current_setting('request.headers', true), '')::json; exception when others then v_h := null; end;
      v_ip := nullif(trim(split_part(coalesce(v_h->>'cf-connecting-ip', v_h->>'x-forwarded-for', ''), ',', 1)), '');
      if v_ip is not null then
        v_ip := md5(v_ip || ':mqbk');
        delete from public.khach_moi where luc < now() - interval '1 day';
        select count(*) into n from public.khach_moi where ip = v_ip and luc > now() - interval '1 hour';
        if n >= 20 then p_khach := null; else insert into public.khach_moi (ip) values (v_ip); end if;
      end if;
      if p_khach is not null then
        insert into public.khach_ghe (khach) values (p_khach);
        update public.thong_ke set gia_tri = gia_tri + 1 where ten = 'luot_mo_trang';
      end if;
    elsif v_cuoi < now() - interval '10 seconds' then
      -- chống bấm tải lại liên tục để đẩy số: cùng trình duyệt, cách nhau dưới 10 giây thì không tính thêm
      update public.khach_ghe set lan_cuoi = now(), so_lan = so_lan + 1 where khach = p_khach;
      update public.thong_ke set gia_tri = gia_tri + 1 where ten = 'luot_mo_trang';
    end if;
    if p_khach is not null then
      insert into public.luot_truy_cap (khach, ngay) values (p_khach, v_ngay) on conflict do nothing;
    end if;
  end if;
  return json_build_object(
    'luot', (select gia_tri from public.thong_ke where ten = 'luot_mo_trang'),
    'nguoi', (select count(*) from public.khach_ghe),
    'hom_nay', (select count(*) from public.luot_truy_cap where ngay = v_ngay),
    'tong', (select count(*) from public.luot_truy_cap));
end $$;

-- 4b. Solo: thách đấu, cập nhật trận, tính Elo (K = 32)
create or replace function public._diem_solo(p_do_kho text, p_doanh_thu int, p_tim_mat int)
returns int language sql immutable set search_path = '' as $$
  select (round(p_doanh_thu * public.he_so(p_do_kho) / 10) - round(p_tim_mat * 15 * public.he_so(p_do_kho) ^ 2))::int
$$;

create or replace function public._het_han_thach_dau()
returns void language sql security definer set search_path = '' as $$
  update public.thach_dau set trang_thai = 'het_han' where trang_thai = 'cho' and het_han < now();
$$;

create or replace function public._ket_thuc_solo(p_id bigint, p_thang uuid, p_ly_do text)
returns void language plpgsql security definer set search_path = '' as $$
declare t record; ra int; rb int; ea numeric; sa numeric; da int;
begin
  select * into t from public.thach_dau where id = p_id for update;
  if t.trang_thai <> 'dang_dau' then return; end if;
  select elo into ra from public.profiles where id = t.a for update;
  select elo into rb from public.profiles where id = t.b for update;
  ea := 1 / (1 + power(10::numeric, (rb - ra) / 400.0));
  sa := case when p_thang is null then 0.5 when p_thang = t.a then 1 else 0 end;
  da := round(32 * (sa - ea))::int;
  update public.profiles set elo = greatest(100, elo + da),
    solo_thang = solo_thang + (sa = 1)::int, solo_thua = solo_thua + (sa = 0)::int, solo_hoa = solo_hoa + (sa = 0.5)::int
    where id = t.a;
  update public.profiles set elo = greatest(100, elo - da),
    solo_thang = solo_thang + (sa = 0)::int, solo_thua = solo_thua + (sa = 1)::int, solo_hoa = solo_hoa + (sa = 0.5)::int
    where id = t.b;
  update public.thach_dau set trang_thai = 'xong', ket_thuc = now(), thang = p_thang, ly_do = p_ly_do,
    elo_a = ra, elo_b = rb, doi_a = da, doi_b = -da where id = p_id;
end $$;

create or replace function public._xu_ly_solo(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare t record; sa int; sb int;
begin
  select * into t from public.thach_dau where id = p_id for update;
  if t.trang_thai <> 'dang_dau' then return; end if;
  sa := public._diem_solo(t.do_kho, t.a_doanh_thu, t.a_tim_mat);
  sb := public._diem_solo(t.do_kho, t.b_doanh_thu, t.b_tim_mat);
  if t.che_do = 'sinh_ton' and (t.a_het_tim_luc is not null or t.b_het_tim_luc is not null) then
    if t.a_het_tim_luc is not null and t.b_het_tim_luc is not null then
      perform public._ket_thuc_solo(p_id,
        case when t.a_het_tim_luc < t.b_het_tim_luc then t.b when t.b_het_tim_luc < t.a_het_tim_luc then t.a end, 'het_tim');
    elsif t.a_het_tim_luc is not null then perform public._ket_thuc_solo(p_id, t.b, 'het_tim');
    else perform public._ket_thuc_solo(p_id, t.a, 'het_tim'); end if;
  elsif t.a_xong and t.b_xong then
    perform public._ket_thuc_solo(p_id, case when sa > sb then t.a when sb > sa then t.b end, 'diem');
  end if;
end $$;

create or replace function public._kiem_tra_roi_tran(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare t record; a_roi boolean; b_roi boolean;
begin
  select * into t from public.thach_dau where id = p_id for update;
  if t.trang_thai <> 'dang_dau' or now() < t.bat_dau then return; end if;
  a_roi := not t.a_xong and t.a_ping < now() - interval '25 seconds';
  b_roi := not t.b_xong and t.b_ping < now() - interval '25 seconds';
  if a_roi and b_roi then perform public._ket_thuc_solo(p_id, null, 'ca_hai_roi');
  elsif a_roi then perform public._ket_thuc_solo(p_id, t.b, 'roi_tran');
  elsif b_roi then perform public._ket_thuc_solo(p_id, t.a, 'roi_tran');
  elsif now() > t.bat_dau + interval '10 minutes' then
    update public.thach_dau set a_xong = true, b_xong = true where id = p_id;
    perform public._xu_ly_solo(p_id);
  end if;
end $$;

create or replace function public.gui_thach_dau(p_b uuid, p_do_kho text, p_che_do text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id bigint;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_b = v_uid then raise exception 'Không thể tự thách đấu chính mình'; end if;
  if p_do_kho not in ('thuong','kho','dianguc','bk') then raise exception 'Độ khó không hợp lệ'; end if;
  if p_che_do not in ('sinh_ton','diem') then raise exception 'Chế độ không hợp lệ'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'Chưa có hồ sơ'; end if;
  if not exists (select 1 from public.profiles where id = p_b) then raise exception 'Không tìm thấy người chơi'; end if;
  perform public._het_han_thach_dau();
  if exists (select 1 from public.thach_dau where trang_thai = 'dang_dau' and v_uid in (a, b)) then
    raise exception 'Bạn đang trong một trận solo'; end if;
  if exists (select 1 from public.thach_dau where trang_thai = 'dang_dau' and p_b in (a, b)) then
    raise exception 'Người này đang solo với người khác'; end if;
  if exists (select 1 from public.thach_dau where a = v_uid and trang_thai = 'cho') then
    raise exception 'Bạn đang chờ một lời thách khác'; end if;
  if (select count(*) from public.thach_dau where a = v_uid and tao_luc > now() - interval '10 minutes') >= 10 then
    raise exception 'Bạn thách đấu nhiều quá, thử lại sau ít phút'; end if;
  insert into public.thach_dau (a, b, do_kho, che_do) values (v_uid, p_b, p_do_kho, p_che_do) returning id into v_id;
  return v_id;
end $$;

create or replace function public.tra_loi_thach_dau(p_id bigint, p_dong_y boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  perform public._het_han_thach_dau();
  select * into t from public.thach_dau where id = p_id and b = v_uid for update;
  if not found then raise exception 'Không tìm thấy lời thách'; end if;
  if t.trang_thai <> 'cho' then raise exception 'Lời thách đã hết hạn hoặc bị huỷ'; end if;
  if not p_dong_y then
    update public.thach_dau set trang_thai = 'tu_choi' where id = p_id;
  else
    if exists (select 1 from public.thach_dau where trang_thai = 'dang_dau' and (t.a in (a, b) or t.b in (a, b))) then
      raise exception 'Một trong hai người đang ở trận khác'; end if;
    update public.thach_dau set trang_thai = 'dang_dau', bat_dau = now() + interval '4 seconds',
      a_ping = now() + interval '4 seconds', b_ping = now() + interval '4 seconds' where id = p_id;
    update public.thach_dau set trang_thai = 'huy'
      where trang_thai = 'cho' and id <> p_id and (a in (t.a, t.b) or b in (t.a, t.b));
  end if;
  return (select row_to_json(x) from public.thach_dau x where id = p_id);
end $$;

create or replace function public.huy_thach_dau(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.thach_dau set trang_thai = 'huy' where id = p_id and a = auth.uid() and trang_thai = 'cho';
end $$;

create or replace function public.cap_nhat_solo(p_id bigint, p_ngay int, p_doanh_thu int, p_tim_mat int, p_xong boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t record; v_a boolean; v_giay numeric;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into t from public.thach_dau where id = p_id and v_uid in (a, b) for update;
  if not found then raise exception 'Không tìm thấy trận'; end if;
  if t.trang_thai = 'dang_dau' then
    v_a := (v_uid = t.a);
    if (v_a and t.a_xong) or (not v_a and t.b_xong) then
      update public.thach_dau set a_ping = case when v_a then now() else a_ping end,
        b_ping = case when v_a then b_ping else now() end where id = p_id;
    else
      if p_ngay not between 1 and 3 or p_tim_mat not between 0 and 5
         or p_doanh_thu < 0 or p_doanh_thu > p_ngay * 5000 then
        raise exception 'Tiến độ không hợp lệ'; end if;
      if p_doanh_thu < (case when v_a then t.a_doanh_thu else t.b_doanh_thu end)
         or p_tim_mat < (case when v_a then t.a_tim_mat else t.b_tim_mat end) then
        raise exception 'Tiến độ không hợp lệ'; end if;
      v_giay := extract(epoch from now() - t.bat_dau);
      if v_giay < (p_ngay - 1) * 75 * 0.9 then raise exception 'Thời gian không khớp'; end if;
      if p_xong and v_giay < p_ngay * 75 * 0.9 and p_tim_mat < 5 then raise exception 'Thời gian không khớp'; end if;
      if v_a then
        update public.thach_dau set a_ngay = p_ngay, a_doanh_thu = p_doanh_thu, a_tim_mat = p_tim_mat,
          a_xong = p_xong or p_tim_mat >= 5, a_ping = now(),
          a_het_tim_luc = case when p_tim_mat >= 5 then coalesce(a_het_tim_luc, now()) else a_het_tim_luc end
          where id = p_id;
      else
        update public.thach_dau set b_ngay = p_ngay, b_doanh_thu = p_doanh_thu, b_tim_mat = p_tim_mat,
          b_xong = p_xong or p_tim_mat >= 5, b_ping = now(),
          b_het_tim_luc = case when p_tim_mat >= 5 then coalesce(b_het_tim_luc, now()) else b_het_tim_luc end
          where id = p_id;
      end if;
    end if;
    perform public._xu_ly_solo(p_id);
    perform public._kiem_tra_roi_tran(p_id);
  end if;
  return (select row_to_json(x) from public.thach_dau x where id = p_id);
end $$;

create or replace function public.kiem_tra_solo(p_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.thach_dau where id = p_id and auth.uid() in (a, b)) then
    raise exception 'Không tìm thấy trận'; end if;
  perform public._het_han_thach_dau();
  perform public._kiem_tra_roi_tran(p_id);
  return (select row_to_json(x) from public.thach_dau x where id = p_id);
end $$;

create or replace function public.bo_tran_solo(p_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t record;
begin
  select * into t from public.thach_dau where id = p_id and v_uid in (a, b) for update;
  if not found then raise exception 'Không tìm thấy trận'; end if;
  if t.trang_thai = 'dang_dau' then
    perform public._ket_thuc_solo(p_id, case when v_uid = t.a then t.b else t.a end, 'bo_cuoc');
  end if;
  return (select row_to_json(x) from public.thach_dau x where id = p_id);
end $$;

create or replace function public.tim_nguoi_choi(p_q text)
returns table(id uuid, ten text, lop text, khoa text, diem int, elo int, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.ten, p.lop, k.ten, p.diem, p.elo, p.avatar_url
  from public.profiles p left join public.khoa k on k.id = p.khoa_id
  where p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and length(trim(coalesce(p_q,''))) >= 1
    and (p.ten ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or p.lop ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%')
  order by p.elo desc, p.diem desc limit 20
$$;

-- 4b'. Solo: xin hoà (bản 2.10.0). Bên kia đồng ý trong 20 giây thì hoà, Elo tính như ván hoà cờ vua
create or replace function public.xin_hoa(p_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t record; v_a boolean;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into t from public.thach_dau where id = p_id and v_uid in (a, b) for update;
  if not found then raise exception 'Không tìm thấy trận'; end if;
  if t.trang_thai <> 'dang_dau' then raise exception 'Trận đã kết thúc'; end if;
  if now() < t.bat_dau then raise exception 'Trận chưa bắt đầu'; end if;
  if t.xin_hoa_boi is not null and t.xin_hoa_luc > now() - interval '20 seconds' then
    if t.xin_hoa_boi <> v_uid then          -- đối thủ vừa xin hoà: coi như đồng ý luôn
      perform public._ket_thuc_solo(p_id, null, 'hoa_thoa_thuan');
      return (select row_to_json(x) from public.thach_dau x where id = p_id);
    end if;
    raise exception 'Bạn vừa xin hoà, chờ đối thủ trả lời';
  end if;
  v_a := (v_uid = t.a);
  if (case when v_a then t.a_xin_hoa else t.b_xin_hoa end) >= 3 then
    raise exception 'Mỗi trận chỉ được xin hoà 3 lần'; end if;
  update public.thach_dau set xin_hoa_boi = v_uid, xin_hoa_luc = now(),
    a_xin_hoa = a_xin_hoa + (v_a)::int, b_xin_hoa = b_xin_hoa + (not v_a)::int
    where id = p_id;
  return (select row_to_json(x) from public.thach_dau x where id = p_id);
end $$;

create or replace function public.tra_loi_hoa(p_id bigint, p_dong_y boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into t from public.thach_dau where id = p_id and v_uid in (a, b) for update;
  if not found then raise exception 'Không tìm thấy trận'; end if;
  if t.trang_thai <> 'dang_dau' then return (select row_to_json(x) from public.thach_dau x where id = p_id); end if;
  if t.xin_hoa_boi is null or t.xin_hoa_boi = v_uid or t.xin_hoa_luc < now() - interval '20 seconds' then
    raise exception 'Lời xin hoà đã hết hạn'; end if;
  if p_dong_y then
    perform public._ket_thuc_solo(p_id, null, 'hoa_thoa_thuan');
  else
    update public.thach_dau set xin_hoa_boi = null, xin_hoa_luc = null where id = p_id;
  end if;
  return (select row_to_json(x) from public.thach_dau x where id = p_id);
end $$;

-- 4b''. Bản ghi để xem lại (bản 2.11.0)
create or replace function public.luu_ban_ghi(p_thach_dau bigint, p_run bigint, p_du_lieu jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id bigint;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if (p_thach_dau is null) = (p_run is null) then raise exception 'Bản ghi phải thuộc một trận hoặc một lượt'; end if;
  if jsonb_typeof(p_du_lieu->'ev') is distinct from 'array' then raise exception 'Bản ghi không hợp lệ'; end if;
  if pg_column_size(p_du_lieu) > 400000 then raise exception 'Bản ghi quá lớn'; end if;
  if p_thach_dau is not null then
    if not exists (select 1 from public.thach_dau where id = p_thach_dau and v_uid in (a, b) and trang_thai = 'xong') then
      raise exception 'Không tìm thấy trận đã kết thúc'; end if;
  else
    if not exists (select 1 from public.runs where id = p_run and user_id = v_uid and trang_thai <> 'dang_choi') then
      raise exception 'Không tìm thấy lượt chơi đã kết thúc'; end if;
  end if;
  insert into public.ban_ghi (user_id, thach_dau_id, run_id, du_lieu) values (v_uid, p_thach_dau, p_run, p_du_lieu)
    on conflict do nothing returning id into v_id;
  -- chỉ giữ 50 bản ghi lượt thường mới nhất của mỗi người (bản ghi solo giữ hết)
  delete from public.ban_ghi where user_id = v_uid and run_id is not null and id not in
    (select id from public.ban_ghi where user_id = v_uid and run_id is not null order by tao_luc desc limit 50);
  return v_id;
end $$;

-- 4c. Thông báo đẩy. Khoá đọc từ Vault: vapid_public, vapid_private, push_hook_secret
create or replace function public.luu_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'Đăng ký thông báo không hợp lệ'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'Chưa có hồ sơ'; end if;
  insert into public.push_sub (user_id, endpoint, p256dh, auth) values (v_uid, p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, tao_luc = now();
  delete from public.push_sub where user_id = v_uid and id not in
    (select id from public.push_sub where user_id = v_uid order by tao_luc desc limit 10);
end $$;

create or replace function public.xoa_push(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_sub where endpoint = p_endpoint and user_id = auth.uid();
$$;

create or replace function public._push_cau_hinh()
returns json language sql security definer set search_path = '' as $$
  select json_build_object(
    'pub',  (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public'),
    'priv', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private'),
    'hook', (select decrypted_secret from vault.decrypted_secrets where name = 'push_hook_secret'));
$$;

create or replace function public._bao_thach_dau()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_hook_secret';
  if v_secret is null then return new; end if;
  if not exists (select 1 from public.push_sub where user_id = new.b) then return new; end if;
  perform net.http_post(
    url := 'https://fvacenxojembebqqxgfp.supabase.co/functions/v1/thong-bao-thach-dau',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 5. Trigger: có lời thách mới → gọi Edge Function gửi thông báo đẩy
-- ---------------------------------------------------------------------
create trigger thach_dau_bao after insert on public.thach_dau
  for each row execute function public._bao_thach_dau();

-- ---------------------------------------------------------------------
-- 6. Ai được gọi hàm nào (Supabase mặc định cho anon/authenticated gọi mọi hàm mới)
-- ---------------------------------------------------------------------
revoke all on all functions in schema public from public, anon, authenticated;
-- công khai
grant execute on function public.he_so(text)               to anon, authenticated;
grant execute on function public.ghi_luot_truy_cap(uuid)   to anon, authenticated;
-- người đã đăng nhập
grant execute on function
  public.luu_ho_so(text, text, text, boolean), public.luu_avatar(text, jsonb),
  public.bat_dau_luot(text), public.nop_ket_qua(bigint, integer, integer, integer),
  public.gui_thach_dau(uuid, text, text), public.tra_loi_thach_dau(bigint, boolean), public.huy_thach_dau(bigint),
  public.cap_nhat_solo(bigint, integer, integer, integer, boolean), public.kiem_tra_solo(bigint),
  public.bo_tran_solo(bigint), public.tim_nguoi_choi(text),
  public.xin_hoa(bigint), public.tra_loi_hoa(bigint, boolean), public.luu_ban_ghi(bigint, bigint, jsonb),
  public.luu_push(text, text, text), public.xoa_push(text)
  to authenticated;
-- nội bộ (_xu_ly_bo_cuoc, _diem_solo, _het_han_thach_dau, _ket_thuc_solo, _xu_ly_solo,
-- _kiem_tra_roi_tran, _bao_thach_dau): không cấp cho ai; _push_cau_hinh chỉ cho Edge Function
grant execute on function public._push_cau_hinh() to service_role;

-- ---------------------------------------------------------------------
-- 7. Ảnh đại diện (Storage): bucket công khai, mỗi người chỉ ghi trong thư mục <user id>/
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "avatar: tu doc" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: tu tai len" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: tu sua" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: tu xoa" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 8. Dữ liệu ban đầu
-- ---------------------------------------------------------------------
insert into public.khoa (id, ten) values
  ('ck',    'Cơ khí'),
  ('ckgt',  'Cơ khí Giao thông'),
  ('cntt',  'Công nghệ Thông tin'),
  ('dien',  'Điện'),
  ('dtvt',  'Điện tử – Viễn thông'),
  ('fast',  'Khoa học Công nghệ tiên tiến'),
  ('hoa',   'Hóa'),
  ('kt',    'Kiến trúc'),
  ('mt',    'Môi trường'),
  ('nhiet', 'Công nghệ Nhiệt – Điện lạnh'),
  ('qlda',  'Quản lý Dự án'),
  ('xdcd',  'Xây dựng Cầu đường'),
  ('xddd',  'Xây dựng Dân dụng & Công nghiệp'),
  ('xdtl',  'Xây dựng Công trình thủy');

insert into public.thong_ke (ten, gia_tri) values ('luot_mo_trang', 0);

-- ---------------------------------------------------------------------
-- 9. Bạn bè và thông báo (bản 2.14.0)
--    ban_be: mỗi cặp một dòng (a < b), 'cho' = đang chờ người kia đồng ý, 'ban' = đã là bạn.
--    thong_bao: chuông thông báo trong game (lời mời kết bạn, được đồng ý kết bạn).
--    Client chỉ đọc; mọi thay đổi qua RPC bên dưới.
-- ---------------------------------------------------------------------
create table if not exists public.ban_be (
  a          uuid not null references public.profiles(id) on delete cascade,
  b          uuid not null references public.profiles(id) on delete cascade,
  nguoi_gui  uuid not null,
  trang_thai text not null default 'cho' check (trang_thai in ('cho', 'ban')),
  tao_luc    timestamptz not null default now(),
  ket_ban_luc timestamptz,
  primary key (a, b),
  check (a < b),
  check (nguoi_gui in (a, b))
);
create index if not exists ban_be_b_idx on public.ban_be (b);

create table if not exists public.thong_bao (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  loai    text not null check (loai in ('loi_moi_ket_ban', 'dong_y_ket_ban')),
  tu      uuid references public.profiles(id) on delete cascade,
  da_doc  boolean not null default false,
  tao_luc timestamptz not null default now()
);
create index if not exists thong_bao_user_idx on public.thong_bao (user_id, tao_luc desc);
create index if not exists thong_bao_tu_idx on public.thong_bao (tu);

alter table public.ban_be    enable row level security;
alter table public.thong_bao enable row level security;
drop policy if exists "doc ban be cua minh" on public.ban_be;
create policy "doc ban be cua minh" on public.ban_be for select to authenticated using ((select auth.uid()) in (a, b));
drop policy if exists "doc thong bao cua minh" on public.thong_bao;
create policy "doc thong bao cua minh" on public.thong_bao for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.ban_be, public.thong_bao from anon, authenticated;
grant select on public.ban_be, public.thong_bao to authenticated;

-- Thêm một thông báo, giữ 100 thông báo mới nhất mỗi người
create or replace function public._them_thong_bao(p_user uuid, p_loai text, p_tu uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.thong_bao where user_id = p_user and loai = p_loai and tu = p_tu;   -- không hiện trùng
  insert into public.thong_bao (user_id, loai, tu) values (p_user, p_loai, p_tu);
  delete from public.thong_bao where user_id = p_user and id not in
    (select id from public.thong_bao where user_id = p_user order by tao_luc desc limit 100);
end $$;

-- Gửi lời mời. Nếu người kia đã mời mình trước thì thành bạn luôn.
create or replace function public.gui_ket_ban(p_b uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_x uuid; v_y uuid; r record; n int;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_b is null or p_b = v_uid then raise exception 'Không thể tự kết bạn với mình'; end if;
  if not exists (select 1 from public.profiles where id = p_b) then raise exception 'Không tìm thấy người chơi'; end if;
  v_x := least(v_uid, p_b); v_y := greatest(v_uid, p_b);
  select * into r from public.ban_be where a = v_x and b = v_y for update;
  if found then
    if r.trang_thai = 'ban' then return json_build_object('trang_thai', 'ban'); end if;
    if r.nguoi_gui = v_uid then return json_build_object('trang_thai', 'da_gui'); end if;
    update public.ban_be set trang_thai = 'ban', ket_ban_luc = now() where a = v_x and b = v_y;
    update public.thong_bao set da_doc = true where user_id = v_uid and loai = 'loi_moi_ket_ban' and tu = p_b;
    perform public._them_thong_bao(p_b, 'dong_y_ket_ban', v_uid);
    return json_build_object('trang_thai', 'ban');
  end if;
  select count(*) into n from public.ban_be where nguoi_gui = v_uid and trang_thai = 'cho';
  if n >= 50 then raise exception 'Bạn đang có quá nhiều lời mời chưa được trả lời'; end if;
  select count(*) into n from public.thong_bao where tu = v_uid and loai = 'loi_moi_ket_ban' and tao_luc > now() - interval '1 hour';
  if n >= 30 then raise exception 'Gửi lời mời nhanh quá, thử lại sau ít phút'; end if;
  insert into public.ban_be (a, b, nguoi_gui) values (v_x, v_y, v_uid);
  perform public._them_thong_bao(p_b, 'loi_moi_ket_ban', v_uid);
  return json_build_object('trang_thai', 'da_gui');
end $$;

-- Trả lời lời mời của p_nguoi
create or replace function public.tra_loi_ket_ban(p_nguoi uuid, p_dong_y boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_x uuid := least(auth.uid(), p_nguoi); v_y uuid := greatest(auth.uid(), p_nguoi); r record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into r from public.ban_be where a = v_x and b = v_y for update;
  if not found or r.trang_thai <> 'cho' or r.nguoi_gui <> p_nguoi then
    return json_build_object('trang_thai', coalesce(r.trang_thai, 'khong'));
  end if;
  update public.thong_bao set da_doc = true where user_id = v_uid and loai = 'loi_moi_ket_ban' and tu = p_nguoi;
  if p_dong_y then
    update public.ban_be set trang_thai = 'ban', ket_ban_luc = now() where a = v_x and b = v_y;
    perform public._them_thong_bao(p_nguoi, 'dong_y_ket_ban', v_uid);
    return json_build_object('trang_thai', 'ban');
  end if;
  delete from public.ban_be where a = v_x and b = v_y;
  return json_build_object('trang_thai', 'khong');
end $$;

-- Huỷ lời mời mình đã gửi, hoặc huỷ kết bạn
create or replace function public.huy_ket_ban(p_nguoi uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  delete from public.ban_be where a = least(v_uid, p_nguoi) and b = greatest(v_uid, p_nguoi);
  delete from public.thong_bao where user_id = p_nguoi and tu = v_uid and loai = 'loi_moi_ket_ban';
  return json_build_object('trang_thai', 'khong');
end $$;

-- Đánh dấu đã đọc mọi thông báo của mình
create or replace function public.doc_thong_bao()
returns void language sql security definer set search_path = '' as $$
  update public.thong_bao set da_doc = true where user_id = auth.uid() and not da_doc;
$$;

revoke all on function public._them_thong_bao(uuid, text, uuid), public.gui_ket_ban(uuid),
  public.tra_loi_ket_ban(uuid, boolean), public.huy_ket_ban(uuid), public.doc_thong_bao() from public, anon, authenticated;
grant execute on function public.gui_ket_ban(uuid), public.tra_loi_ket_ban(uuid, boolean),
  public.huy_ket_ban(uuid), public.doc_thong_bao() to authenticated;

-- Realtime: chuông và danh sách bạn bè cập nhật ngay (RLS ở trên vẫn áp dụng)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ban_be') then
    alter publication supabase_realtime add table public.ban_be; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'thong_bao') then
    alter publication supabase_realtime add table public.thong_bao; end if;
end $$;

-- ---------------------------------------------------------------------
-- 10. Xoá tài khoản (bản 2.18.0): người chơi tự xoá hẳn tài khoản của mình.
-- Xoá dòng auth.users, mọi thứ còn lại tự xoá theo (on delete cascade): hồ sơ, điểm, Elo,
-- lượt bán, trận solo (cả ở phía đối thủ), bản ghi, bạn bè, thông báo, đăng ký thông báo đẩy.
-- Ảnh đại diện trong Storage do trình duyệt xoá trước khi gọi hàm này (Supabase chặn xoá Storage bằng SQL).
-- ---------------------------------------------------------------------
create or replace function public.xoa_tai_khoan(p_xac_nhan text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_xac_nhan is distinct from 'XOA' then raise exception 'Chưa xác nhận xoá tài khoản'; end if;
  if exists (select 1 from public.thach_dau where v_uid in (a, b) and trang_thai = 'dang_dau') then
    raise exception 'Bạn đang có trận solo. Đấu xong hoặc bỏ trận rồi hãy xoá tài khoản'; end if;
  delete from auth.users where id = v_uid;
end $$;
revoke all on function public.xoa_tai_khoan(text) from public, anon, authenticated;
grant execute on function public.xoa_tai_khoan(text) to authenticated;
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
