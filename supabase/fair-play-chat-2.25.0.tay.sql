-- ---------------------------------------------------------------------
-- 15. Fair play, trò chuyện, online (bản 2.25.0)
--   - Cảnh cáo: mỗi lần quản trị huỷ lượt gian lận (hoặc bấm Cảnh cáo) là +1 profiles.canh_cao và một thông báo.
--     Đủ 3 lần: bi_ban, email vào danh_sach_den (không đăng ký lại được), thông báo cho người đó
--     và cho mọi người từng solo với họ. Người bị ban vẫn hiện trên bảng Cá nhân/Solo với nhãn đỏ,
--     nhưng không tính vào bảng Lớp/Khoa/Trường và không chơi, solo, kết bạn, nhắn tin được nữa.
--   - Trò chuyện: tin_nhan (phòng 'chung' cho mọi người, 'dm:<uid nhỏ>:<uid lớn>' cho hai người), tin_doc (đã đọc đến đâu).
--   - profiles.lan_cuoi: lần cuối mở game (bao_online()); profiles.created_at đã có sẵn.
--   - so_lieu_bxh(): số người trên từng bảng xếp hạng.
-- Chạy lại nhiều lần không lỗi. Cần chạy sau phần 14.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists canh_cao integer not null default 0;
alter table public.profiles add column if not exists bi_ban boolean not null default false;
alter table public.profiles add column if not exists ban_luc timestamptz;
alter table public.profiles add column if not exists lan_cuoi timestamptz;

create table if not exists public.danh_sach_den (
  email   text primary key,
  user_id uuid,
  ly_do   text,
  luc     timestamptz not null default now()
);
alter table public.danh_sach_den enable row level security;
revoke all on public.danh_sach_den from anon, authenticated;

-- Thông báo: thêm loại của hệ thống và chi tiết
alter table public.thong_bao add column if not exists chi_tiet jsonb;
do $$ declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.thong_bao'::regclass and contype = 'c'
            and pg_get_constraintdef(oid) like '%loai%' loop
    execute format('alter table public.thong_bao drop constraint %I', c);
  end loop;
end $$;
alter table public.thong_bao add constraint thong_bao_loai_check
  check (loai in ('loi_moi_ket_ban', 'dong_y_ket_ban', 'canh_cao', 'bi_ban', 'doi_thu_bi_ban', 'go_ban'));

create or replace function public._thong_bao_he_thong(p_user uuid, p_loai text, p_tu uuid, p_chi_tiet jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.thong_bao (user_id, loai, tu, chi_tiet) values (p_user, p_loai, p_tu, p_chi_tiet);
  delete from public.thong_bao where user_id = p_user and id not in
    (select id from public.thong_bao where user_id = p_user order by tao_luc desc limit 100);
end $$;

-- Chặn tài khoản bị ban (gọi ở đầu các hàm ghi)
create or replace function public._kiem_ban()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and bi_ban) then
    raise exception 'Tài khoản đã bị khoá vì vi phạm fair play';
  end if;
end $$;

-- Email trong danh sách đen thì không đăng ký được
create or replace function public.email_bi_cam(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.danh_sach_den where email = lower(btrim(coalesce(p_email, ''))))
$$;
create or replace function public._chan_email_den()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and exists (select 1 from public.danh_sach_den where email = lower(new.email)) then
    raise exception 'Email này đã bị cấm vì vi phạm fair play';
  end if;
  return new;
end $$;
drop trigger if exists chan_email_den on auth.users;
create trigger chan_email_den before insert on auth.users for each row execute function public._chan_email_den();

-- Cảnh cáo một người (lượt huỷ hoặc quản trị bấm). Đủ 3 lần thì ban.
create or replace function public._canh_cao(p_uid uuid, p_ly_do text, p_so_luot integer)
returns json language plpgsql security definer set search_path = '' as $$
declare v_cc int; v_ban boolean; v_email text; x record;
begin
  update public.profiles set canh_cao = canh_cao + 1 where id = p_uid returning canh_cao, bi_ban into v_cc, v_ban;
  if v_cc is null then return null; end if;
  perform public._thong_bao_he_thong(p_uid, 'canh_cao', null,
    jsonb_build_object('lan', v_cc, 'so_luot', p_so_luot, 'ly_do', p_ly_do));
  if v_cc >= 3 and not v_ban then
    update public.profiles set bi_ban = true, ban_luc = now() where id = p_uid;
    select lower(email) into v_email from auth.users where id = p_uid;
    if v_email is not null then
      insert into public.danh_sach_den (email, user_id, ly_do) values (v_email, p_uid, 'Cảnh cáo 3 lần vì gian lận')
      on conflict (email) do nothing;
    end if;
    perform public._thong_bao_he_thong(p_uid, 'bi_ban', null, jsonb_build_object('lan', v_cc));
    for x in select distinct case when a = p_uid then b else a end doi_thu from public.thach_dau
              where p_uid in (a, b) and trang_thai = 'xong' loop
      perform public._thong_bao_he_thong(x.doi_thu, 'doi_thu_bi_ban', p_uid, null);
    end loop;
    v_ban := true;
  end if;
  return json_build_object('canh_cao', v_cc, 'bi_ban', v_ban);
end $$;

-- Huỷ lượt gian lận: như bản 2.24.0, thêm một lần cảnh cáo khi có lượt bị huỷ
create or replace function public.qt_huy_luot(p_uid uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_ids bigint[]; r record; d int := 0; n int := 0; xa int := 0; v_cu int; v_cc json;
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới làm được'; end if;
  select array_agg(x) into v_ids from public._luot_bat_thuong(p_uid) x;
  select diem into v_cu from public.profiles where id = p_uid;
  delete from public.ban_ghi where run_id = any(coalesce(v_ids, '{}'));
  update public.runs set da_huy = true, nghi_ngo = coalesce(nghi_ngo, 'Không có bản ghi'),
         doanh_thu = 0, tim_mat = 0, delta = 0 where id = any(coalesce(v_ids, '{}'));
  for r in select id, delta, so_ngay, da_huy from public.runs
            where user_id = p_uid and trang_thai <> 'dang_choi' order by coalesce(ket_thuc, bat_dau), id loop
    if not r.da_huy then
      d := greatest(0, d + coalesce(r.delta, 0)); n := n + 1; xa := greatest(xa, coalesce(r.so_ngay, 0));
    end if;
    update public.runs set diem_sau = d where id = r.id;
  end loop;
  update public.profiles set diem = d, so_luot = n, ngay_xa_nhat = xa, cho_duyet = false where id = p_uid;
  if coalesce(array_length(v_ids, 1), 0) > 0 then
    v_cc := public._canh_cao(p_uid, 'Lượt bán bất thường đã bị huỷ', array_length(v_ids, 1));
  end if;
  insert into public.qt_nhat_ky (quan_tri, hanh_dong, doi_tuong, chi_tiet)
  values (auth.uid(), 'huy_luot', p_uid, jsonb_build_object('luot', v_ids, 'diem_cu', v_cu, 'diem_moi', d, 'canh_cao', v_cc));
  return json_build_object('so_luot_huy', coalesce(array_length(v_ids, 1), 0), 'diem_cu', v_cu, 'diem_moi', d,
    'canh_cao', (v_cc->>'canh_cao')::int, 'bi_ban', coalesce((v_cc->>'bi_ban')::boolean, false));
end $$;

-- Quản trị cảnh cáo tay, gỡ ban, xem danh sách vi phạm
create or replace function public.qt_canh_cao(p_uid uuid, p_ly_do text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare v json;
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới làm được'; end if;
  v := public._canh_cao(p_uid, coalesce(nullif(btrim(p_ly_do), ''), 'Vi phạm fair play'), 0);
  insert into public.qt_nhat_ky (quan_tri, hanh_dong, doi_tuong, chi_tiet) values (auth.uid(), 'canh_cao', p_uid, v::jsonb);
  return v;
end $$;
create or replace function public.qt_go_ban(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới làm được'; end if;
  update public.profiles set bi_ban = false, ban_luc = null, canh_cao = 0 where id = p_uid;
  delete from public.danh_sach_den where user_id = p_uid;
  perform public._thong_bao_he_thong(p_uid, 'go_ban', null, null);
  insert into public.qt_nhat_ky (quan_tri, hanh_dong, doi_tuong) values (auth.uid(), 'go_ban', p_uid);
end $$;
create or replace function public.qt_ds_vi_pham()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới xem được'; end if;
  return coalesce((select json_agg(json_build_object('id', p.id, 'ten', p.ten, 'canh_cao', p.canh_cao, 'bi_ban', p.bi_ban,
      'ban_luc', p.ban_luc, 'diem', p.diem, 'email', u.email) order by p.bi_ban desc, p.canh_cao desc)
    from public.profiles p left join auth.users u on u.id = p.id where p.canh_cao > 0 or p.bi_ban), '[]'::json);
end $$;

-- Lần cuối mở game
create or replace function public.bao_online()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set lan_cuoi = now()
   where id = auth.uid() and (lan_cuoi is null or lan_cuoi < now() - interval '1 minute')
$$;

-- Bảng xếp hạng: thêm bi_ban; người bị ban không tính vào Lớp/Khoa/Trường
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
  WHERE p.so_luot > 0 AND NOT public.bi_an_bxh(p.id);

create or replace view public.bxh_lop with (security_invoker = on) as
 WITH x AS (
         SELECT profiles.lop,
            profiles.khoa_id,
            profiles.diem,
            row_number() OVER (PARTITION BY profiles.lop ORDER BY profiles.diem DESC) AS rn
           FROM profiles
          WHERE profiles.so_luot > 0 AND profiles.sinh_vien AND NOT profiles.bi_ban AND NOT public.bi_an_bxh(profiles.id)
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
          WHERE profiles.so_luot > 0 AND profiles.sinh_vien AND NOT profiles.bi_ban AND NOT public.bi_an_bxh(profiles.id)
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

-- Số người trên từng bảng (p_truong: trường của người xem, để đếm bộ lọc "Trường mình")
create or replace function public.so_lieu_bxh(p_truong text default null)
returns json language sql stable security definer set search_path = '' as $$
  with ca as (select p.* from public.profiles p where p.so_luot > 0 and not public.bi_an_bxh(p.id))
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

-- ---------------- Trò chuyện ----------------
create table if not exists public.tin_nhan (
  id         bigint generated always as identity primary key,
  phong      text not null,
  nguoi_gui  uuid not null references public.profiles(id) on delete cascade,
  nguoi_nhan uuid references public.profiles(id) on delete cascade,
  noi_dung   text not null check (char_length(noi_dung) between 1 and 500),
  da_xoa     boolean not null default false,
  tao_luc    timestamptz not null default now(),
  check ((phong = 'chung' and nguoi_nhan is null) or (phong like 'dm:%' and nguoi_nhan is not null))
);
create index if not exists tin_nhan_phong_idx on public.tin_nhan (phong, id desc);
create index if not exists tin_nhan_gui_idx on public.tin_nhan (nguoi_gui, tao_luc desc);
create index if not exists tin_nhan_nhan_idx on public.tin_nhan (nguoi_nhan);
create table if not exists public.tin_doc (
  user_id uuid not null references public.profiles(id) on delete cascade,
  phong   text not null,
  doc_den bigint not null default 0,
  primary key (user_id, phong)
);
alter table public.tin_nhan enable row level security;
alter table public.tin_doc  enable row level security;
drop policy if exists "doc tin nhan" on public.tin_nhan;
create policy "doc tin nhan" on public.tin_nhan for select to authenticated
  using (phong = 'chung' or (select auth.uid()) in (nguoi_gui, nguoi_nhan));
drop policy if exists "doc tin doc cua minh" on public.tin_doc;
create policy "doc tin doc cua minh" on public.tin_doc for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.tin_nhan, public.tin_doc from anon, authenticated;
grant select on public.tin_nhan, public.tin_doc to authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tin_nhan') then
    alter publication supabase_realtime add table public.tin_nhan; end if;
end $$;

create or replace function public.phong_dm(p_a uuid, p_b uuid)
returns text language sql immutable set search_path = '' as $$
  select 'dm:' || least(p_a, p_b)::text || ':' || greatest(p_a, p_b)::text
$$;

-- Gửi tin: p_toi = null là phòng chung. Tối đa 1 tin / 0,7 giây và 15 tin / phút.
create or replace function public.gui_tin_nhan(p_toi uuid, p_noi_dung text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_nd text := btrim(coalesce(p_noi_dung, '')); v_phong text; v_id bigint;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  perform public._kiem_ban();
  if not exists (select 1 from public.profiles where id = v_uid) then raise exception 'Chưa có hồ sơ'; end if;
  if char_length(v_nd) = 0 then raise exception 'Tin nhắn trống'; end if;
  if char_length(v_nd) > 500 then raise exception 'Tin nhắn dài quá 500 ký tự'; end if;
  if exists (select 1 from public.tin_nhan where nguoi_gui = v_uid and tao_luc > now() - interval '700 milliseconds')
     or (select count(*) from public.tin_nhan where nguoi_gui = v_uid and tao_luc > now() - interval '1 minute') >= 15 then
    raise exception 'Bạn gửi nhanh quá, đợi một chút nhé';
  end if;
  if p_toi is null then v_phong := 'chung';
  else
    if p_toi = v_uid then raise exception 'Không thể tự nhắn cho mình'; end if;
    if not exists (select 1 from public.profiles where id = p_toi) then raise exception 'Không tìm thấy người này'; end if;
    v_phong := public.phong_dm(v_uid, p_toi);
  end if;
  insert into public.tin_nhan (phong, nguoi_gui, nguoi_nhan, noi_dung) values (v_phong, v_uid, p_toi, v_nd) returning id into v_id;
  insert into public.tin_doc (user_id, phong, doc_den) values (v_uid, v_phong, v_id)
  on conflict (user_id, phong) do update set doc_den = greatest(public.tin_doc.doc_den, excluded.doc_den);
  return (select row_to_json(t) from public.tin_nhan t where id = v_id);
end $$;

create or replace function public.doc_tin(p_phong text, p_den bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if p_phong <> 'chung' and position(v_uid::text in p_phong) = 0 then return; end if;
  insert into public.tin_doc (user_id, phong, doc_den) values (v_uid, p_phong, p_den)
  on conflict (user_id, phong) do update set doc_den = greatest(public.tin_doc.doc_den, excluded.doc_den);
end $$;

-- Danh sách hội thoại: phòng chung + các cuộc nhắn riêng (mới nhất trước), kèm số tin chưa đọc
create or replace function public.ds_hoi_thoai()
returns json language sql stable security definer set search_path = '' as $$
  with toi as (select auth.uid() u),
  dm as (
    select distinct on (t.phong) t.phong, t.id, t.noi_dung, t.da_xoa, t.tao_luc, t.nguoi_gui,
           case when t.nguoi_gui = (select u from toi) then t.nguoi_nhan else t.nguoi_gui end nguoi
      from public.tin_nhan t
     where t.phong like 'dm:%' and (select u from toi) in (t.nguoi_gui, t.nguoi_nhan)
     order by t.phong, t.id desc),
  chung as (select id, noi_dung, da_xoa, tao_luc, nguoi_gui from public.tin_nhan where phong = 'chung' order by id desc limit 1)
  select json_build_object(
    'chung', (select json_build_object('id', c.id, 'noi_dung', case when c.da_xoa then null else c.noi_dung end, 'tao_luc', c.tao_luc,
               'ten', (select ten from public.profiles where id = c.nguoi_gui),
               'chua_doc', (select count(*) from public.tin_nhan x where x.phong = 'chung' and x.nguoi_gui <> (select u from toi)
                             and x.id > coalesce((select doc_den from public.tin_doc where user_id = (select u from toi) and phong = 'chung'), 0)))
              from chung c),
    'rieng', coalesce((select json_agg(json_build_object('phong', d.phong, 'nguoi', d.nguoi, 'ten', p.ten, 'avatar_url', p.avatar_url,
               'bi_ban', p.bi_ban, 'noi_dung', case when d.da_xoa then null else d.noi_dung end, 'tao_luc', d.tao_luc,
               'cua_minh', d.nguoi_gui = (select u from toi),
               'chua_doc', (select count(*) from public.tin_nhan x where x.phong = d.phong and x.nguoi_gui <> (select u from toi)
                             and x.id > coalesce((select doc_den from public.tin_doc where user_id = (select u from toi) and phong = d.phong), 0)))
               order by d.id desc)
              from dm d join public.profiles p on p.id = d.nguoi), '[]'::json))
$$;

-- Quản trị xoá tin nhắn
create or replace function public.qt_xoa_tin(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới làm được'; end if;
  update public.tin_nhan set da_xoa = true where id = p_id;
  insert into public.qt_nhat_ky (quan_tri, hanh_dong, chi_tiet) values (auth.uid(), 'xoa_tin', jsonb_build_object('tin', p_id));
end $$;

-- Tìm người chơi: trả thêm bi_ban
drop function if exists public.tim_nguoi_choi(text);
create or replace function public.tim_nguoi_choi(p_q text)
returns table(id uuid, ten text, lop text, khoa text, diem int, elo int, avatar_url text, sinh_vien boolean, truong_id text, truong text, giang_vien boolean, bi_ban boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.ten, p.lop, k.ten, p.diem, p.elo, p.avatar_url, p.sinh_vien, p.truong_id, t.ten_ngan, p.giang_vien, p.bi_ban
  from public.profiles p left join public.khoa k on k.id = p.khoa_id left join public.truong t on t.id = p.truong_id
  where p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    and length(trim(coalesce(p_q,''))) >= 1
    and (p.ten ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or p.lop ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%'
      or t.ten_ngan ilike '%' || replace(replace(trim(p_q),'%','\%'),'_','\_') || '%')
  order by p.elo desc, p.diem desc limit 20
$$;
revoke all on function public.tim_nguoi_choi(text) from public, anon;
grant execute on function public.tim_nguoi_choi(text) to authenticated;

-- Thêm dòng chặn tài khoản bị ban vào các hàm ghi cũ
-- @@CHEN_KIEM_BAN@@

revoke all on function public._thong_bao_he_thong(uuid, text, uuid, jsonb), public._kiem_ban(), public.email_bi_cam(text),
  public._chan_email_den(), public._canh_cao(uuid, text, integer), public.qt_huy_luot(uuid), public.qt_canh_cao(uuid, text),
  public.qt_go_ban(uuid), public.qt_ds_vi_pham(), public.bao_online(), public.so_lieu_bxh(text), public.phong_dm(uuid, uuid),
  public.gui_tin_nhan(uuid, text), public.doc_tin(text, bigint), public.ds_hoi_thoai(), public.qt_xoa_tin(bigint)
  from public, anon, authenticated;
grant execute on function public.email_bi_cam(text), public.so_lieu_bxh(text), public.phong_dm(uuid, uuid) to anon, authenticated;
grant execute on function public.qt_huy_luot(uuid), public.qt_canh_cao(uuid, text), public.qt_go_ban(uuid), public.qt_ds_vi_pham(),
  public.bao_online(), public.gui_tin_nhan(uuid, text), public.doc_tin(text, bigint), public.ds_hoi_thoai(), public.qt_xoa_tin(bigint)
  to authenticated;

-- Cảnh cáo lần 1 cho hai tài khoản gian lận tối 31/10/2026 (đã bị huỷ lượt), chỉ chạy một lần
do $$ declare x record;
begin
  for x in select p.id from public.profiles p
            where p.canh_cao = 0 and exists (select 1 from public.runs r where r.user_id = p.id and r.da_huy)
              and not exists (select 1 from public.thong_bao t where t.user_id = p.id and t.loai = 'canh_cao') loop
    perform public._canh_cao(x.id, 'Lượt bán bất thường đã bị huỷ', (select count(*)::int from public.runs where user_id = x.id and da_huy));
  end loop;
end $$;
