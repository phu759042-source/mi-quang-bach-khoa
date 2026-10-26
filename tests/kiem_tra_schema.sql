-- Chạy sau schema.sql trên Postgres giả lập: thử các luật quan trọng của server.
-- Mỗi bước in "OK ..." hoặc dừng ngay với lỗi "HONG: ...".
\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.dang_nhap(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u)::text, false);
  select set_config('role', 'authenticated', false);
$$;
create or replace function pg_temp.dang_xuat() returns void language sql as $$
  select set_config('role', 'postgres', false);
  select set_config('request.jwt.claims', '', false);
$$;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');

do $$
declare A uuid := '00000000-0000-0000-0000-00000000000a'; B uuid := '00000000-0000-0000-0000-00000000000b';
        C uuid := '00000000-0000-0000-0000-00000000000c'; v_id bigint; j json; n int; ok boolean;
begin
  -- Hồ sơ
  perform pg_temp.dang_nhap(A); perform public.luu_ho_so('Người A', 'cntt', '26t_attt');
  perform pg_temp.dang_nhap(B); perform public.luu_ho_so('Người B', 'dtvt', '24DT2');
  perform pg_temp.dang_nhap(C); perform public.luu_ho_so('Người C', 'kt', '23KT1');
  begin perform public.luu_ho_so('X', 'cntt', '26T'); raise exception 'HONG: tên 1 ký tự vẫn lưu được';
  exception when check_violation then null; end;
  raise notice 'OK hồ sơ: lưu được, lớp tự viết hoa, chặn tên quá ngắn';

  -- Client không ghi thẳng vào bảng được
  ok := false;
  begin update public.profiles set diem = 99999; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'HONG: client sửa thẳng được điểm'; end if;
  raise notice 'OK client không sửa thẳng được bảng profiles';

  -- Lượt chơi thường + chống gian lận
  perform pg_temp.dang_nhap(A);
  v_id := public.bat_dau_luot('kho');
  begin perform public.nop_ket_qua(v_id, 1, 9000, 0); raise exception 'HONG: nộp 9000k/ngày vẫn được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  begin perform public.nop_ket_qua(v_id, 3, 3000, 0); raise exception 'HONG: nộp 3 ngày sau 0 giây vẫn được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  j := public.nop_ket_qua(v_id, 1, 1000, 1);
  if (j->>'delta')::int <> 150 - 34 then raise exception 'HONG: ĐBK sai, được %', j->>'delta'; end if;
  raise notice 'OK nộp điểm: chặn doanh thu vô lý, chặn sai thời gian, ĐBK = 1000×1.5/10 − 1×34 = 116';

  -- Solo: gửi, xem trộm, đồng ý, cập nhật, hết tim, Elo
  perform pg_temp.dang_xuat();
  insert into vault.secrets (name, secret) values ('push_hook_secret', 'thu');
  insert into public.push_sub (user_id, endpoint, p256dh, auth) values (B, 'https://push.example/b', 'k', 'a');
  perform pg_temp.dang_nhap(A);
  v_id := public.gui_thach_dau(B, 'thuong', 'sinh_ton');
  perform pg_temp.dang_xuat();
  select count(*) into n from net.goi where url like '%/functions/v1/thong-bao-thach-dau' and (body->>'id')::bigint = v_id and headers->>'x-hook-secret' = 'thu';
  if n <> 1 then raise exception 'HONG: trigger không gọi hàm gửi thông báo'; end if;
  perform pg_temp.dang_nhap(C);
  select count(*) into n from public.thach_dau;
  if n <> 0 then raise exception 'HONG: người ngoài đọc được trận của người khác'; end if;
  perform pg_temp.dang_nhap(B);
  j := public.tra_loi_thach_dau(v_id, true);
  if j->>'trang_thai' <> 'dang_dau' then raise exception 'HONG: đồng ý mà trận chưa bắt đầu'; end if;
  perform pg_temp.dang_xuat();
  update public.thach_dau set bat_dau = now() - interval '100 seconds' where id = v_id;
  perform pg_temp.dang_nhap(B);
  begin perform public.cap_nhat_solo(v_id, 1, 9999, 0, false); raise exception 'HONG: tiến độ vô lý vẫn nhận';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  j := public.cap_nhat_solo(v_id, 2, 800, 5, false);
  if j->>'trang_thai' <> 'xong' or (j->>'thang')::uuid <> A or (j->>'doi_a')::int <> 16 then
    raise exception 'HONG: kết thúc solo sai: %', j; end if;
  perform pg_temp.dang_xuat();
  if (select elo from public.profiles where id = A) <> 1216 or (select elo from public.profiles where id = B) <> 1184 then
    raise exception 'HONG: Elo sau trận sai'; end if;
  raise notice 'OK solo: trigger gọi hàm gửi thông báo, người ngoài không xem được trận, chặn tiến độ vô lý, B hết tim → A thắng, Elo 1216 / 1184';

  -- Xin hoà: tự đồng ý mình thì không được, bên kia từ chối, rồi đồng ý → hoà, Elo như ván hoà
  perform pg_temp.dang_xuat(); update public.profiles set elo = 1200 where id in (A, C);
  perform pg_temp.dang_nhap(A); v_id := public.gui_thach_dau(C, 'kho', 'diem');
  perform pg_temp.dang_nhap(C); perform public.tra_loi_thach_dau(v_id, true);
  perform pg_temp.dang_xuat(); update public.thach_dau set bat_dau = now() - interval '10 seconds' where id = v_id;
  perform pg_temp.dang_nhap(A); j := public.xin_hoa(v_id);
  if (j->>'xin_hoa_boi')::uuid <> A then raise exception 'HONG: xin hoà không ghi nhận'; end if;
  begin perform public.tra_loi_hoa(v_id, true); raise exception 'HONG: tự đồng ý lời xin hoà của mình';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform pg_temp.dang_nhap(C); j := public.tra_loi_hoa(v_id, false);
  if j->>'trang_thai' <> 'dang_dau' or j->>'xin_hoa_boi' is not null then raise exception 'HONG: từ chối hoà sai'; end if;
  perform pg_temp.dang_nhap(A); perform public.xin_hoa(v_id);
  perform pg_temp.dang_nhap(C); j := public.tra_loi_hoa(v_id, true);
  if j->>'trang_thai' <> 'xong' or j->>'thang' is not null or j->>'ly_do' <> 'hoa_thoa_thuan' or (j->>'doi_a')::int <> 0 then
    raise exception 'HONG: đồng ý hoà sai: %', j; end if;
  perform pg_temp.dang_xuat();
  if (select solo_hoa from public.profiles where id = A) <> 1 then raise exception 'HONG: không cộng số trận hoà'; end if;
  raise notice 'OK xin hoà: không tự đồng ý được, từ chối thì trận tiếp tục, đồng ý thì hoà, Elo ±0 khi bằng điểm Elo';

  -- Bỏ cuộc giữa trận: bên kia thắng
  perform pg_temp.dang_nhap(A); v_id := public.gui_thach_dau(C, 'thuong', 'sinh_ton');
  perform pg_temp.dang_nhap(C); perform public.tra_loi_thach_dau(v_id, true);
  perform pg_temp.dang_nhap(A); j := public.bo_tran_solo(v_id);
  if (j->>'thang')::uuid <> C or j->>'ly_do' <> 'bo_cuoc' then raise exception 'HONG: bỏ cuộc sai: %', j; end if;
  raise notice 'OK bỏ cuộc: người kia thắng';

  -- Bản ghi xem lại: chỉ người trong trận đọc được, không gửi cho trận người khác
  perform pg_temp.dang_nhap(A);
  perform public.luu_ban_ghi(v_id, null, '{"v":1,"ev":[[0,"D",1,0,3,0]]}');
  begin perform public.luu_ban_ghi(v_id, null, '{"ev":"x"}'); raise exception 'HONG: nhận bản ghi sai dạng';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform pg_temp.dang_nhap(C); perform public.luu_ban_ghi(v_id, null, '{"v":1,"ev":[]}');
  select count(*) into n from public.ban_ghi where thach_dau_id = v_id;
  if n <> 2 then raise exception 'HONG: C không thấy đủ 2 bản ghi trận mình (thấy %)', n; end if;
  perform pg_temp.dang_nhap(B);
  select count(*) into n from public.ban_ghi where thach_dau_id = v_id;
  if n <> 0 then raise exception 'HONG: người ngoài đọc được bản ghi trận người khác'; end if;
  begin perform public.luu_ban_ghi(v_id, null, '{"ev":[]}'); raise exception 'HONG: người ngoài gửi được bản ghi';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  raise notice 'OK bản ghi: hai người trong trận đọc được của nhau, người ngoài không đọc/ghi được';

  -- Xếp hạng
  if (select hang from public.bxh_sinh_vien where id = A) <> 1 then raise exception 'HONG: bảng xếp hạng sinh viên sai'; end if;
  if (select count(*) from public.bxh_khoa) <> 14 then raise exception 'HONG: bảng khoa không đủ 14 khoa'; end if;
  raise notice 'OK bảng xếp hạng sinh viên/lớp/khoa đọc được';
end $$;

select 'TẤT CẢ ĐỀU ĐÚNG' as ket_qua;
