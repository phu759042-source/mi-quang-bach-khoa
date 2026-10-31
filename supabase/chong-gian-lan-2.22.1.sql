-- Bản 2.22.1: chặn nộp doanh thu nhanh hơn thời gian chơi thật (lỗ hổng lượt 1 ngày nộp ngay 5000k)

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
  -- bản 2.22.1: tối đa 40 lượt mỗi giờ (một lượt thật ít nhất vài chục giây)
  if (select count(*) from public.runs where user_id = v_uid and bat_dau > now() - interval '1 hour') >= 40 then
    raise exception 'Bạn mở quán quá nhiều lần, nghỉ một lát rồi chơi tiếp';
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
      if p_doanh_thu > 60 * greatest(v_giay, 0) + 300 then raise exception 'Thời gian không khớp'; end if;   -- bản 2.22.1
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
  -- bản 2.22.1: lượt chơi thử không kiểm được thời gian thật nên giới hạn chặt: ≤ 10 ngày, ≤ 3000k/ngày, ≤ 1500 ĐBK
  if p_so_ngay > 10 or p_doanh_thu > p_so_ngay * 3000
     or round(p_doanh_thu * v_hs / 10) - round(p_tim_mat * 15 * v_hs ^ 2) > 1500 then
    raise exception 'Kết quả không hợp lệ'; end if;
  insert into public.runs (user_id, do_kho, bat_dau) values (v_uid, p_do_kho, now() - make_interval(secs => p_so_ngay * 75))
    returning id into v_id;
  return (public.nop_ket_qua(v_id, p_so_ngay, p_doanh_thu, p_tim_mat)::jsonb || jsonb_build_object('run_id', v_id))::json;
end $$;
