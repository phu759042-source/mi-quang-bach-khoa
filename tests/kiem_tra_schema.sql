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
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d'), ('00000000-0000-0000-0000-00000000000e');

do $$
declare A uuid := '00000000-0000-0000-0000-00000000000a'; B uuid := '00000000-0000-0000-0000-00000000000b';
        C uuid := '00000000-0000-0000-0000-00000000000c'; v_id bigint; j json; n int; i int; ok boolean;
begin
  -- Hồ sơ
  perform pg_temp.dang_nhap(A); perform public.luu_ho_so('Người A', 'cntt', '26t_attt');
  perform pg_temp.dang_nhap(B); perform public.luu_ho_so('Người B', 'dtvt', '24DT2');
  perform pg_temp.dang_nhap(C); perform public.luu_ho_so('Người C', 'kt', '23KT1');
  begin perform public.luu_ho_so('X', 'cntt', '26T'); raise exception 'HONG: tên 1 ký tự vẫn lưu được';
  exception when check_violation then null; end;
  raise notice 'OK hồ sơ: lưu được, lớp tự viết hoa, chặn tên quá ngắn';
  -- Bản 2.17.0: người ngoài BKĐN không cần khoa/lớp; sinh viên thì bắt buộc
  perform pg_temp.dang_nhap('00000000-0000-0000-0000-00000000000d');
  begin perform public.luu_ho_so('Người D', null, null); raise exception 'HONG: sinh viên thiếu khoa/lớp vẫn lưu được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform public.luu_ho_so('Người D', 'cntt', '26T', false);
  if (select khoa_id is not null or lop is not null or sinh_vien from public.profiles where id = '00000000-0000-0000-0000-00000000000d')
    then raise exception 'HONG: người ngoài BK vẫn giữ khoa/lớp'; end if;
  if (select sinh_vien from public.profiles where id = A) is not true then raise exception 'HONG: mặc định phải là sinh viên'; end if;
  raise notice 'OK hồ sơ: người ngoài BKĐN không cần khoa/lớp, sinh viên thì bắt buộc';

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
  -- Bản 2.22.1: lượt 1 ngày nộp ngay 5000k (lỗ hổng đã bị lợi dụng) phải bị chặn
  begin perform public.nop_ket_qua(v_id, 1, 5000, 5); raise exception 'HONG: nộp 5000k sau 0 giây vẫn được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform pg_temp.dang_xuat(); update public.runs set bat_dau = now() - interval '20 seconds' where id = v_id; perform pg_temp.dang_nhap(A);
  begin perform public.nop_ket_qua(v_id, 1, 1600, 0); raise exception 'HONG: 1600k sau 20 giây vẫn được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  j := public.nop_ket_qua(v_id, 1, 1000, 1);
  if (j->>'delta')::int <> 150 - 34 then raise exception 'HONG: ĐBK sai, được %', j->>'delta'; end if;
  perform pg_temp.dang_xuat();                          -- thêm một lượt đang chơi: người khác không được thấy
  insert into public.runs (user_id, do_kho) values (A, 'thuong') returning id into v_id;
  perform pg_temp.dang_nhap(B);
  select count(*) into n from public.runs where user_id = A;
  if n <> 1 then raise exception 'HONG: người khác thấy % lượt của A (phải là 1 lượt đã xong)', n; end if;
  perform pg_temp.dang_xuat(); delete from public.runs where id = v_id;
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
  perform pg_temp.dang_nhap(C);
  select count(*) into n from public.thach_dau where id = v_id;
  if n <> 1 then raise exception 'HONG: trận đã xong mà người khác không xem được trong hồ sơ'; end if;
  perform pg_temp.dang_xuat();
  raise notice 'OK solo: trigger gọi hàm gửi thông báo, người ngoài không xem được trận đang chờ, chặn tiến độ vô lý, B hết tim → A thắng, Elo 1216 / 1184, trận xong thì công khai';

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
  if n <> 2 then raise exception 'HONG: người ngoài không xem lại được trận đã xong (thấy % bản ghi)', n; end if;
  begin perform public.luu_ban_ghi(v_id, null, '{"ev":[]}'); raise exception 'HONG: người ngoài gửi được bản ghi';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  raise notice 'OK bản ghi: người đã đăng nhập xem lại được, người ngoài trận không gửi được';

  -- Bạn bè: gửi, không gửi trùng, người ngoài không thấy, đồng ý, thông báo, mời ngược lại thì thành bạn luôn
  perform pg_temp.dang_nhap(A); j := public.gui_ket_ban(B);
  if j->>'trang_thai' <> 'da_gui' then raise exception 'HONG: gửi lời mời sai: %', j; end if;
  if public.gui_ket_ban(B)->>'trang_thai' <> 'da_gui' then raise exception 'HONG: gửi lại lời mời'; end if;
  begin perform public.gui_ket_ban(A); raise exception 'HONG: tự kết bạn với mình';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform pg_temp.dang_nhap(C);
  select count(*) into n from public.ban_be; if n <> 0 then raise exception 'HONG: người ngoài thấy lời mời kết bạn'; end if;
  select count(*) into n from public.thong_bao; if n <> 0 then raise exception 'HONG: người ngoài thấy thông báo'; end if;
  begin perform public.tra_loi_ket_ban(A, true); exception when others then null; end;
  perform pg_temp.dang_nhap(B);
  select count(*) into n from public.thong_bao where loai = 'loi_moi_ket_ban' and tu = A and not da_doc;
  if n <> 1 then raise exception 'HONG: B không nhận được thông báo lời mời (%)', n; end if;
  j := public.tra_loi_ket_ban(A, true);
  if j->>'trang_thai' <> 'ban' then raise exception 'HONG: đồng ý kết bạn sai: %', j; end if;
  perform pg_temp.dang_nhap(A);
  select count(*) into n from public.thong_bao where loai = 'dong_y_ket_ban' and tu = B;
  if n <> 1 then raise exception 'HONG: A không được báo B đã đồng ý'; end if;
  perform public.doc_thong_bao();
  if exists (select 1 from public.thong_bao where not da_doc) then raise exception 'HONG: đánh dấu đã đọc không chạy'; end if;
  perform public.huy_ket_ban(B);
  if exists (select 1 from public.ban_be) then raise exception 'HONG: huỷ kết bạn không xoá'; end if;
  perform pg_temp.dang_nhap(C); perform public.gui_ket_ban(A);
  perform pg_temp.dang_nhap(A); j := public.gui_ket_ban(C);
  if j->>'trang_thai' <> 'ban' then raise exception 'HONG: hai bên cùng mời mà chưa thành bạn: %', j; end if;
  perform pg_temp.dang_xuat();
  raise notice 'OK bạn bè: gửi, chống trùng, riêng tư, thông báo, đồng ý, huỷ, mời chéo thành bạn';

  -- Bộ đếm truy cập: một địa chỉ mạng tạo tối đa 20 người mới mỗi giờ, mạng khác vẫn đếm bình thường
  perform pg_temp.dang_xuat();
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.9, 10.0.0.1"}', false);
  perform set_config('role', 'anon', false);
  n := (public.ghi_luot_truy_cap(null)->>'nguoi')::int;
  for i in 1..25 loop perform public.ghi_luot_truy_cap(gen_random_uuid()); end loop;
  if (public.ghi_luot_truy_cap(null)->>'nguoi')::int <> n + 20 then raise exception 'HONG: giới hạn 20 người mới / giờ / mạng không chạy'; end if;
  perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.7"}', false);
  if (public.ghi_luot_truy_cap(gen_random_uuid())->>'nguoi')::int <> n + 21 then raise exception 'HONG: mạng khác bị chặn oan'; end if;
  perform set_config('request.headers', '', false);
  perform pg_temp.dang_xuat();
  if exists (select 1 from public.khach_moi where ip like '%203.0.113%') then raise exception 'HONG: lưu địa chỉ mạng dạng thô'; end if;
  raise notice 'OK bộ đếm: chặn một mạng tạo quá 20 người mới / giờ, không lưu IP thô';

  -- Xếp hạng
  if (select hang from public.bxh_sinh_vien where id = A) <> 1 then raise exception 'HONG: bảng xếp hạng sinh viên sai'; end if;
  if (select count(*) from public.bxh_khoa) <> 14 then raise exception 'HONG: bảng khoa không đủ 14 khoa'; end if;
  perform pg_temp.dang_xuat();
  update public.profiles set so_luot = 1, diem = 999999 where id = '00000000-0000-0000-0000-00000000000d';
  if (select hang from public.bxh_sinh_vien where id = '00000000-0000-0000-0000-00000000000d') <> 1
    or (select hang_sv from public.bxh_sinh_vien where id = '00000000-0000-0000-0000-00000000000d') is not null
    or (select hang_sv from public.bxh_sinh_vien where id = A) <> 1
    then raise exception 'HONG: hạng chung / hạng sinh viên sai khi có người ngoài BK'; end if;
  if exists (select 1 from public.bxh_lop where lop is null) or (select sum(so_nguoi) from public.bxh_khoa) <> (select count(*) from public.profiles where so_luot > 0 and sinh_vien)
    then raise exception 'HONG: người ngoài BK lọt vào bảng lớp/khoa'; end if;
  perform pg_temp.dang_nhap(A);
  if not exists (select 1 from public.tim_nguoi_choi('Người D')) then raise exception 'HONG: không tìm được người ngoài BK'; end if;
  perform pg_temp.dang_xuat();
  raise notice 'OK bảng xếp hạng sinh viên/lớp/khoa đọc được';
  -- Bản 2.18.0: tự xoá tài khoản, mọi dữ liệu biến mất khỏi bảng xếp hạng
  perform pg_temp.dang_nhap('00000000-0000-0000-0000-00000000000e');
  perform public.luu_ho_so('Người E', 'cntt', '25T1');
  perform pg_temp.dang_xuat();
  update public.profiles set so_luot = 2, diem = 500 where id = '00000000-0000-0000-0000-00000000000e';
  insert into public.ban_be (a, b, nguoi_gui, trang_thai) values (A, '00000000-0000-0000-0000-00000000000e', A, 'ban');
  perform pg_temp.dang_nhap('00000000-0000-0000-0000-00000000000e');
  begin perform public.xoa_tai_khoan('xoa'); raise exception 'HONG: chưa xác nhận đúng vẫn xoá được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform public.xoa_tai_khoan('XOA');
  perform pg_temp.dang_xuat();
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000e')
    or exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000e')
    or exists (select 1 from public.bxh_sinh_vien where id = '00000000-0000-0000-0000-00000000000e')
    or exists (select 1 from public.ban_be x where '00000000-0000-0000-0000-00000000000e' in (x.a, x.b))
    then raise exception 'HONG: xoá tài khoản còn sót dữ liệu'; end if;
  raise notice 'OK xoá tài khoản: phải xác nhận, xoá sạch hồ sơ, bạn bè, bảng xếp hạng';
  -- Bản 2.21.0: trường + nhận lượt chơi thử
  if (select truong_id from public.profiles where id = A) is distinct from 'dut' then raise exception 'HONG: sinh viên BKĐN phải có trường dut'; end if;
  insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000f');
  perform pg_temp.dang_nhap('00000000-0000-0000-0000-00000000000f');
  begin perform public.luu_ho_so('Người F', null, null, false, 'khong-co'); raise exception 'HONG: lưu được trường không có trong danh sách';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  begin perform public.luu_ho_so('Người F', null, null, false, 'dut'); raise exception 'HONG: người ngoài chọn được trường BKĐN';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform public.luu_ho_so('Người F', null, null, false, 'hust');
  begin perform public.nhan_luot_thu('thuong', 1, 300, 5); raise exception 'HONG: lượt thử bị trừ điểm vẫn nhận được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  begin perform public.nhan_luot_thu('thuong', 1, 9000, 0); raise exception 'HONG: lượt thử 9000k/ngày vẫn nhận được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  j := public.nhan_luot_thu('thuong', 3, 1500, 1);
  if (j->>'delta')::int <> 150 - 15 or (select so_luot from public.profiles where id = '00000000-0000-0000-0000-00000000000f') <> 1
    then raise exception 'HONG: nhận lượt thử sai điểm: %', j; end if;
  begin perform public.nhan_luot_thu('thuong', 3, 1500, 1); raise exception 'HONG: nhận lượt thử được hai lần';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  if not exists (select 1 from public.bxh_truong where truong_id = 'hust' and so_nguoi = 1 and diem = round(135 / 30.0))
    or not exists (select 1 from public.bxh_truong where truong_id = 'dut')
    then raise exception 'HONG: bảng trường sai'; end if;
  perform pg_temp.dang_nhap(A);
  if (select truong from public.tim_nguoi_choi('Người F') limit 1) is distinct from 'BK Hà Nội' then raise exception 'HONG: tìm người chơi thiếu trường'; end if;
  if not exists (select 1 from public.tim_nguoi_choi('BK Hà Nội')) then raise exception 'HONG: không tìm được theo tên trường'; end if;
  perform pg_temp.dang_xuat();
  raise notice 'OK trường: chọn trường, chặn trường lạ và BKĐN giả, bảng trường; lượt chơi thử nhận một lần, chỉ khi cộng điểm';
  -- Bản 2.22.0: giáo viên
  insert into auth.users (id) values ('00000000-0000-0000-0000-000000000010');
  perform pg_temp.dang_nhap('00000000-0000-0000-0000-000000000010');
  begin perform public.luu_ho_so('Thầy G', null, null, false, null, true); raise exception 'HONG: giáo viên không chọn trường vẫn lưu được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform public.luu_ho_so('Thầy G', 'cntt', '26T', true, 'dut', true);
  if (select sinh_vien or not giang_vien or truong_id <> 'dut' or khoa_id is not null or lop is not null
      from public.profiles where id = '00000000-0000-0000-0000-000000000010') then raise exception 'HONG: giáo viên BKĐN lưu sai'; end if;
  perform pg_temp.dang_xuat();
  update public.profiles set so_luot = 1, diem = 3000 where id = '00000000-0000-0000-0000-000000000010';
  if not exists (select 1 from public.bxh_truong where truong_id = 'dut' and so_gv = 1)
    or not (select giang_vien from public.bxh_sinh_vien where id = '00000000-0000-0000-0000-000000000010')
    or exists (select 1 from public.bxh_sinh_vien where id = '00000000-0000-0000-0000-000000000010' and hang_sv is not null)
    or (select sum(so_nguoi) from public.bxh_khoa) <> (select count(*) from public.profiles where so_luot > 0 and sinh_vien)
    then raise exception 'HONG: giáo viên trên bảng xếp hạng sai'; end if;
  perform pg_temp.dang_nhap(A);
  if not (select giang_vien from public.tim_nguoi_choi('Thầy G') limit 1) then raise exception 'HONG: tìm kiếm thiếu giang_vien'; end if;
  perform pg_temp.dang_xuat();
  raise notice 'OK giáo viên: bắt buộc chọn trường (kể cả BKĐN), không khoa/lớp, tính vào bảng Trường, không vào Lớp/Khoa';
  -- Bản 2.23.0: mức trần theo ngày, đối chiếu bản ghi, ẩn khỏi bảng xếp hạng chờ duyệt
  perform pg_temp.dang_nhap(B);
  v_id := public.bat_dau_luot('thuong');
  perform pg_temp.dang_xuat(); update public.runs set bat_dau = now() - interval '200 seconds' where id = v_id; perform pg_temp.dang_nhap(B);
  begin perform public.nop_ket_qua(v_id, 1, 3000, 0); raise exception 'HONG: 1 ngày 3000k vẫn được (trần 2670k)';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform public.nop_ket_qua(v_id, 1, 1000, 0);
  perform public.luu_ban_ghi(null, v_id, '{"ev":[[0,"D",1],[3000,"V",1,0,40,90]]}'::jsonb);
  perform pg_temp.dang_xuat();
  if (select nghi_ngo from public.runs where id = v_id) is null or not public.bi_an_bxh(B)
     or exists (select 1 from public.bxh_sinh_vien where id = B) then raise exception 'HONG: bản ghi bưng 40k nộp 1000k không bị ẩn'; end if;
  update public.profiles set cho_duyet = false where id = B; update public.runs set nghi_ngo = null where id = v_id;
  -- lượt thật: bản ghi khớp thì không sao
  perform pg_temp.dang_nhap(B);
  v_id := public.bat_dau_luot('thuong');
  perform pg_temp.dang_xuat(); update public.runs set bat_dau = now() - interval '200 seconds' where id = v_id; perform pg_temp.dang_nhap(B);
  perform public.nop_ket_qua(v_id, 1, 100, 0);
  perform public.luu_ban_ghi(null, v_id, '{"ev":[[0,"D",1],[3000,"V",1,0,60,90],[5000,"V",2,1,40,80]]}'::jsonb);
  perform pg_temp.dang_xuat();
  if (select nghi_ngo from public.runs where id = v_id) is not null or public.bi_an_bxh(B) then raise exception 'HONG: lượt thật bị đánh dấu nghi ngờ'; end if;
  -- lượt mới thiếu bản ghi quá 10 phút: ẩn
  update public.runs set ket_thuc = now() - interval '11 minutes', doanh_thu = 900 where id = v_id; delete from public.ban_ghi where run_id = v_id;
  if not public.bi_an_bxh(B) then raise exception 'HONG: lượt thiếu bản ghi không bị ẩn'; end if;
  update public.runs set can_ban_ghi = false where id = v_id;
  if public.bi_an_bxh(B) then raise exception 'HONG: lượt cũ không bắt buộc bản ghi mà vẫn bị ẩn'; end if;
  raise notice 'OK kiểm duyệt: trần theo ngày, bản ghi không khớp hoặc thiếu thì ẩn khỏi bảng xếp hạng';
  -- Bản 2.24.0: quản trị duyệt / huỷ lượt bất thường
  perform pg_temp.dang_nhap(B);
  v_id := public.bat_dau_luot('thuong');
  perform pg_temp.dang_xuat(); update public.runs set bat_dau = now() - interval '200 seconds' where id = v_id; perform pg_temp.dang_nhap(B);
  perform public.nop_ket_qua(v_id, 1, 1000, 0);
  perform public.luu_ban_ghi(null, v_id, '{"ev":[[0,"D",1],[3000,"V",1,0,40,90]]}'::jsonb);
  begin perform public.qt_danh_sach(); raise exception 'HONG: người thường xem được danh sách quản trị';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  begin perform public.qt_huy_luot(B); raise exception 'HONG: người thường tự huỷ lượt được';
  exception when raise_exception then if sqlerrm like 'HONG%' then raise; end if; end;
  perform pg_temp.dang_xuat();
  insert into public.quan_tri (user_id) values (A);
  perform pg_temp.dang_nhap(A);
  if not public.la_quan_tri() or json_array_length(public.qt_danh_sach()) <> 1 then raise exception 'HONG: quản trị không thấy người bị ẩn'; end if;
  j := public.qt_huy_luot(B);
  perform pg_temp.dang_xuat();
  if (j->>'so_luot_huy')::int <> 1 or public.bi_an_bxh(B) or not (select da_huy from public.runs where id = v_id)
     or (select diem from public.profiles where id = B) <> (j->>'diem_moi')::int or (j->>'diem_moi')::int >= (j->>'diem_cu')::int
     or exists (select 1 from public.ban_ghi where run_id = v_id)
     or not exists (select 1 from public.qt_nhat_ky where hanh_dong = 'huy_luot' and doi_tuong = B)
    then raise exception 'HONG: huỷ lượt sai: %', j; end if;
  raise notice 'OK quản trị: chỉ quản trị xem/duyệt được, huỷ lượt tính lại điểm, ghi nhật ký';
end $$;

select 'TẤT CẢ ĐỀU ĐÚNG' as ket_qua;
