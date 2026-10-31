-- ---------------------------------------------------------------------
-- 14. Quản trị (bản 2.24.0): màn duyệt lượt bất thường cho chủ game
--   - quan_tri(user_id): ai là quản trị. Mặc định là tài khoản phu759042@gmail.com.
--   - qt_nhat_ky: ghi lại mọi lần duyệt / huỷ.
--   - la_quan_tri(), qt_danh_sach(), qt_cho_qua(uid), qt_huy_luot(uid): chỉ quản trị gọi được.
--   - runs.da_huy: lượt bị quản trị huỷ (doanh thu, điểm về 0, bản ghi bị xoá).
-- Chạy lại nhiều lần không lỗi. Cần chạy sau phần 13 (kiem-duyet-2.23.0.sql).
-- ---------------------------------------------------------------------
create table if not exists public.quan_tri (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tao_luc timestamptz not null default now()
);
create table if not exists public.qt_nhat_ky (
  id        bigint generated always as identity primary key,
  quan_tri  uuid,
  hanh_dong text not null,
  doi_tuong uuid,
  chi_tiet  jsonb,
  luc       timestamptz not null default now()
);
alter table public.quan_tri   enable row level security;
alter table public.qt_nhat_ky enable row level security;
revoke all on public.quan_tri, public.qt_nhat_ky from anon, authenticated;
insert into public.quan_tri (user_id) select id from auth.users where email = 'phu759042@gmail.com' on conflict do nothing;

alter table public.runs add column if not exists da_huy boolean not null default false;

create or replace function public.la_quan_tri()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quan_tri where user_id = auth.uid())
$$;

-- Các lượt đang làm người này bị ẩn: bị đánh dấu nghi ngờ, hoặc lượt mới thiếu bản ghi quá 10 phút
create or replace function public._luot_bat_thuong(p_uid uuid)
returns setof bigint language sql stable security definer set search_path = '' as $$
  select r.id from public.runs r
   where r.user_id = p_uid and r.trang_thai = 'xong' and not r.da_huy
     and (r.nghi_ngo is not null
          or (r.can_ban_ghi and r.doanh_thu > 500 and r.ket_thuc < now() - interval '10 minutes'
              and not exists (select 1 from public.ban_ghi b where b.run_id = r.id)))
$$;

create or replace function public.qt_danh_sach()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới xem được'; end if;
  return coalesce((
    select json_agg(x order by x.moi_nhat desc) from (
      select p.id, p.ten, p.diem, p.so_luot, p.cho_duyet, p.sinh_vien, p.giang_vien, p.lop, t.ten_ngan truong,
             (select max(r.ket_thuc) from public.runs r where r.id in (select public._luot_bat_thuong(p.id))) moi_nhat,
             (select coalesce(json_agg(json_build_object(
                'id', r.id, 'do_kho', r.do_kho, 'so_ngay', r.so_ngay, 'doanh_thu', r.doanh_thu, 'tim_mat', r.tim_mat,
                'delta', r.delta, 'ket_thuc', r.ket_thuc, 'giay', round(extract(epoch from r.ket_thuc - r.bat_dau)),
                'ly_do', coalesce(r.nghi_ngo, 'Không có bản ghi'),
                'co_ban_ghi', exists (select 1 from public.ban_ghi b where b.run_id = r.id)) order by r.ket_thuc desc), '[]'::json)
                from public.runs r where r.id in (select public._luot_bat_thuong(p.id))) luot
        from public.profiles p left join public.truong t on t.id = p.truong_id
       where public.bi_an_bxh(p.id)) x), '[]'::json);
end $$;

-- Cho qua: lượt thật, bỏ nghi ngờ (lượt thiếu bản ghi thì không bắt bản ghi nữa)
create or replace function public.qt_cho_qua(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ids bigint[];
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới làm được'; end if;
  select array_agg(x) into v_ids from public._luot_bat_thuong(p_uid) x;
  update public.runs set nghi_ngo = null, can_ban_ghi = false where id = any(coalesce(v_ids, '{}'));
  update public.profiles set cho_duyet = false where id = p_uid;
  insert into public.qt_nhat_ky (quan_tri, hanh_dong, doi_tuong, chi_tiet)
  values (auth.uid(), 'cho_qua', p_uid, jsonb_build_object('luot', v_ids));
end $$;

-- Huỷ lượt gian lận: doanh thu và điểm của các lượt đó về 0, xoá bản ghi, tính lại điểm từ các lượt còn lại
create or replace function public.qt_huy_luot(p_uid uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_ids bigint[]; r record; d int := 0; n int := 0; xa int := 0; v_cu int;
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
  insert into public.qt_nhat_ky (quan_tri, hanh_dong, doi_tuong, chi_tiet)
  values (auth.uid(), 'huy_luot', p_uid, jsonb_build_object('luot', v_ids, 'diem_cu', v_cu, 'diem_moi', d));
  return json_build_object('so_luot_huy', coalesce(array_length(v_ids, 1), 0), 'diem_cu', v_cu, 'diem_moi', d);
end $$;

-- Lượt đã huỷ không làm người đó bị ẩn nữa (bi_an_bxh bỏ qua runs.da_huy)
create or replace function public.bi_an_bxh(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select cho_duyet from public.profiles where id = p_uid), false)
      or exists (select 1 from public.runs r
                  where r.user_id = p_uid and r.can_ban_ghi and not r.da_huy and r.trang_thai = 'xong' and r.doanh_thu > 500
                    and r.nghi_ngo is null and r.ket_thuc < now() - interval '10 minutes'
                    and not exists (select 1 from public.ban_ghi b where b.run_id = r.id))
$$;

revoke all on function public.la_quan_tri(), public._luot_bat_thuong(uuid), public.qt_danh_sach(),
  public.qt_cho_qua(uuid), public.qt_huy_luot(uuid), public.bi_an_bxh(uuid) from public, anon, authenticated;
grant execute on function public.bi_an_bxh(uuid) to anon, authenticated;
grant execute on function public.la_quan_tri(), public.qt_danh_sach(), public.qt_cho_qua(uuid), public.qt_huy_luot(uuid) to authenticated;
