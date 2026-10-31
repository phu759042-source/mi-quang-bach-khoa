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

-- @@LUU_BAN_GHI@@

-- @@VIEW@@
revoke all on public.bxh_sinh_vien, public.bxh_lop, public.bxh_khoa, public.bxh_truong from anon, authenticated;
grant select on public.bxh_sinh_vien, public.bxh_lop, public.bxh_khoa, public.bxh_truong to anon, authenticated;

-- @@SO_LIEU@@

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
