# Mì Quảng Bách Khoa — ghi chú cho Claude

Game web (điện thoại + laptop) cho sinh viên Đại học Bách Khoa Đà Nẵng. Người chơi bán mì Quảng, cảm hứng từ quán Mì Quảng Bích (1-3 Đặng Dung, Hòa Khánh Bắc). Tác giả: Nguyễn Tấn Phú (26T_ATTT). Trả lời bằng tiếng Việt, ngắn gọn.

- Trang chạy: https://phu759042-source.github.io/mi-quang-bach-khoa/ (GitHub Pages, nhánh `main`, tự deploy 1–2 phút sau khi push)
- Repo: `phu759042-source/mi-quang-bach-khoa`
- Backend: Supabase project `fvacenxojembebqqxgfp` (https://fvacenxojembebqqxgfp.supabase.co). Thao tác DB bằng công cụ Supabase MCP, sandbox không gọi thẳng Supabase/CDN được.
- Email: Supabase Auth gửi qua SMTP Resend (smtp.resend.com:465, user `resend`, domain campusstreak.com).

## Cấu trúc file

- `index.html`: toàn bộ game trong một file (HTML + CSS + JS, ~1400 dòng). Supabase JS v2.45.4 qua jsDelivr. Số phiên bản hiện ở cuối màn chính (`Phiên bản x.y.z`). Mỗi lần sửa thì tăng số này và ghi vào commit.
- `manifest.webmanifest`, `icons/`: favicon, icon PWA, `ung-ho-qr.png` (mã VietQR ủng hộ).
- `emails/xac-nhan-email.html`, `emails/dat-lai-mat-khau.html`: mẫu email (biến `{{ .ConfirmationURL }}`). Người dùng tự dán vào Supabase › Auth › Templates, repo không tự đồng bộ.
- `README.md`, `docs/images/`: giới thiệu game để trình bày với nhà tuyển dụng, ảnh chụp bằng Playwright với dữ liệu minh hoạ (Supabase giả). Đổi giao diện hoặc luật chơi thì nhớ cập nhật README và chụp lại ảnh.

## Các phần chính trong `index.html` (tìm theo tên)

- Dữ liệu game: `ING` (nguyên liệu), `TOPS`, `KHACH`, `LINES`, `EVENTS`, `UPG` (14 nâng cấp: quat, phubep, noi, rau, bang, wifi, ban, the, ghe, fanpage, tv, combo, qr, chay).
- Độ khó `DIFF`: thuong hs1, kho 1.5, dianguc 2.2, bk 3. **Phải khớp hàm `he_so()` trên server.** Phạt mất tim = 15·hs².
- Mục tiêu doanh thu mỗi ngày: bảng `REF` (từ mô phỏng) + `target(d)`. Ngày dài `DAYLEN=75` giây. Giờ cao điểm `RUSH=[25,45]`.
- Vòng lặp: `newGame`, `startDay`, `spawn`, `seatQueue`, `loop`, `serve`, `endDay`, `angry`, `loseHeart`.
- Tim: tối đa 5, mua bằng tiền trong game `GIA_TIM=500` (500k). `buyHeart`, `reviveScreen`.
- Nộp điểm: `finishRun(why, cashOut)`, `rpcRetry`, lưu chờ trong localStorage `mqbk-pending` (`savePending`/`flushPending`) để chống lỗi "Load failed" trên iOS.
- Âm thanh: tổng hợp bằng Web Audio, không có file âm thanh. `SFX`, `tone()`, `noise()`, object `sfx` (add, remove, pour kiểu B 0,3s, cash, wrong, leave, heart, streak, closeStart/countStart/countStop/closeEnd/closeFail cho chốt sổ).
  - Chốt sổ: "cạch" khi xác nhận → tiếng đếm lặp suốt màn "Đang nộp điểm…" (hiện tối thiểu 0,8s) → `closeEnd` phát đúng lúc `showResult` hiện điểm.
- Streak kiểu Duolingo: `streakState`, `flameSVG`, `streakScreen`; khách lưu ở localStorage `mqbk-streak`, tài khoản tính trên server trong `nop_ket_qua` (ngày theo Asia/Ho_Chi_Minh).
- Tài khoản: `authScreen`, `forgotScreen`, `newPasswordScreen`, `profileScreen`, `afterLogin`, `logout`.
- Avatar (chỉ hiện ở bảng xếp hạng sinh viên): `avatarHTML`, `avatarEditor` (cắt/zoom), `chooseAvatar`, `readjustAvatar`, `removeAvatar`; bucket Storage `avatars`.
- Màn khác: `home`, `showShop`/`drawShop`, `leaderboard`, `contactScreen` (`CONTACT`), `donateScreen`, `ruleText`.
- Bộ đếm truy cập kiểu Facemash: `countVisit` (hiện lượt + người).
- Giao diện: theme sáng/tối/tự động (`applyTheme`, `data-theme`, localStorage), phím tắt laptop (1–8, Space, Q/W/E/R, X), kéo để tải lại (tắt khi đang chơi).

## Supabase

Client chỉ đọc được (RLS). Mọi thao tác ghi đi qua RPC `SECURITY DEFINER`.

- Bảng: `khoa(id, ten)`, `profiles(id, ten, khoa_id, lop, diem, so_luot, ngay_xa_nhat, chuoi, chuoi_dai_nhat, ngay_chuoi, avatar_url, avatar_khung)`, `runs(id, user_id, do_kho, trang_thai, so_ngay, doanh_thu, tim_mat, delta, diem_sau, bat_dau, ket_thuc)`, `luot_truy_cap(khach, ngay)`, `khach_ghe(khach, lan_dau, lan_cuoi, so_lan)`, `thong_ke(ten, gia_tri)`.
- View xếp hạng: `bxh_sinh_vien`, `bxh_lop`, `bxh_khoa`.
- RPC: `bat_dau_luot(p_do_kho)`, `nop_ket_qua(p_run_id, p_so_ngay, p_doanh_thu, p_tim_mat)` → json (delta, diem, hang, chuoi, chuoi_moi, chuoi_dai_nhat), `luu_ho_so(p_ten, p_khoa_id, p_lop)`, `luu_avatar(p_url, p_khung)`, `ghi_luot_truy_cap(p_khach)` → json (luot, nguoi, hom_nay, tong), `_xu_ly_bo_cuoc(p_uid)`, `he_so(p_do_kho)`.
- Luật chống gian lận trên server: doanh thu tối đa 5000/ngày; số tim mất ≤ 5 + doanh_thu/500.
- Điểm ĐBK của một lượt = doanh_thu·hs/10 − tim_mat·15·hs².

## Cách làm việc

- Kiểm tra cú pháp: tách phần `<script>` ra rồi chạy `node --check`. Test giao diện bằng Playwright (Python), chặn mạng ra ngoài.
- Sửa xong thì tăng phiên bản, commit tiếng Việt kiểu "Mô tả thay đổi (bản x.y.z)", push lên `main`.
- Reset streak để test: `update profiles set chuoi=0, chuoi_dai_nhat=0, ngay_chuoi=null where chuoi>0 or chuoi_dai_nhat>0 or ngay_chuoi is not null;`
