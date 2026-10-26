# Mì Quảng Bách Khoa — ghi chú cho Claude

Game web (điện thoại + laptop) cho sinh viên Đại học Bách Khoa Đà Nẵng. Người chơi bán mì Quảng, cảm hứng từ quán Mì Quảng Bích (1-3 Đặng Dung, Hòa Khánh Bắc). Tác giả: Nguyễn Tấn Phú (26T_ATTT). Trả lời bằng tiếng Việt, ngắn gọn.

- Trang chạy: https://phu759042-source.github.io/mi-quang-bach-khoa/ (GitHub Pages, nhánh `main`, tự deploy 1–2 phút sau khi push)
- Repo: `phu759042-source/mi-quang-bach-khoa`
- Backend: Supabase project `fvacenxojembebqqxgfp` (https://fvacenxojembebqqxgfp.supabase.co). Thao tác DB bằng công cụ Supabase MCP, sandbox không gọi thẳng Supabase/CDN được.
- Email: Supabase Auth gửi qua SMTP Resend (smtp.resend.com:465, user `resend`, domain campusstreak.com).

## Cấu trúc file

- `index.html`: toàn bộ game trong một file (HTML + CSS + JS, ~1400 dòng). Supabase JS v2.45.4 qua jsDelivr. Số phiên bản hiện ở cuối màn chính (`Phiên bản x.y.z`). Mỗi lần sửa thì tăng số này và ghi vào commit.
- `ban-ghi.js` (bản 2.11.0, nạp trước script chính bằng `?v=<phiên bản>`; đổi phiên bản thì đổi cả số này): bộ ghi thao tác, màn xem lại, Hồ sơ (Thống kê · Ván solo · Lượt bán) và biểu đồ SVG. Chỉ khai báo hàm, dùng biến của index.html.
- `sw.js`: service worker chỉ để nhận Web Push lời thách (không cache). Bấm thông báo mở `?thach=<id>` hoặc gửi postMessage cho tab đang mở.
- `manifest.webmanifest`, `icons/`: favicon, icon PWA, `ung-ho-qr.png` (mã VietQR ủng hộ).
- `emails/xac-nhan-email.html`, `emails/dat-lai-mat-khau.html`: mẫu email (biến `{{ .ConfirmationURL }}`). Người dùng tự dán vào Supabase › Auth › Templates, repo không tự đồng bộ.
- `supabase/schema.sql`: toàn bộ cấu trúc database (xuất 26/10/2026, đã đối chiếu mã băm với server). `supabase/functions/thong-bao-thach-dau/index.ts`: mã Edge Function. `supabase/README.md`: cách dựng lại. **Sửa database trên Supabase thì sửa luôn schema.sql.**
- `tests/`: `kiem_tra_cu_phap.sh`, `kiem_tra_schema.sh` (Postgres trống + `supabase_gia.sql` giả lập auth/vault/net/storage, rồi `kiem_tra_schema.sql`), `test_tro_choi.py` (Playwright 2 trình duyệt, lớp `Fake` giả lập server cùng luật với schema.sql; ngày 8s, cửa hàng solo 3s). GitHub Actions `.github/workflows/kiem-tra.yml` chạy cả ba khi push.
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
- Solo (bản 2.7.0, kiểu chess.com): `soloConnect` (Realtime postgres_changes trên `thach_dau` + presence `online`), `showNotice` (thông báo góc dưới phải, `sfx.challenge`, nháy tiêu đề tab), `challengeScreen` (chọn độ khó + luật `sinh_ton`/`diem`), `waitScreen`, `startSolo` (đếm ngược theo `bat_dau` của server), `soloPush` (gửi tiến độ, ping mỗi 4s), `soloShop` (cửa hàng 20s, không mua tim), `soloFinish`, `soloEnd` (Elo). Trận 3 ngày (`SOLO_NGAY`). Bảng xếp hạng có ô tìm kiếm (`searchPlayers`) và tab Solo; bấm tên để thách.
- Thông báo đẩy (bản 2.8.0): `PUSH_PUB` (khoá VAPID công khai), `swInit`, `pushState` (on/off/denied/ios/unsupported), `pushCard` (thẻ mời bật trên màn chính, "Để sau" 7 ngày trong localStorage `mqbk-push-later`), `enablePush`/`disablePush`, `pushResync` (sau đăng nhập), `pushUnlink` (khi đăng xuất), `iosGuide`, `deniedGuide`, `openThach`. iPhone chỉ nhận khi đã thêm vào Màn hình chính.
- Hiệu ứng kết thúc (bản 2.9.0): `endFx(kind win|lose|draw, title, sub, next)` dừng ~2s, chặn mọi lần chạm, `particles` vẽ pháo giấy/mưa trên canvas, `sfx.win/lose/draw`, rồi gọi `next()` và `lockButtons($('ov'),900)`. `finishRun` thua (không phải chốt sổ) chạy `endFx('lose','Quán đóng cửa')` trước (lưu `savePending` ngay), `soloEnd` chạy hiệu ứng theo thắng/thua/hoà. `confetti()` không chặn màn, dùng khi chốt sổ có lời. `lockButtons` còn dùng ở `showResult`, `streakScreen`, `reviveScreen`, `showShop`.
- Vào lại sau khi tải trang (bản 2.9.1): `soloPoll(true)` lúc đăng nhập tìm lời thách mình gửi còn hạn → `waitScreen` (dùng `het_han` của server), hoặc trận `dang_dau` máy này không giữ → `soloResume`: khôi phục `S` từ server (ngày, doanh thu, tim; nâng cấp mất, két = doanh thu), ping ngay để không bị xử thua, màn "Vào lại trận" / "Bỏ trận". `soloRow` cũng gọi `soloResume` khi lời thách cũ được đồng ý. Gửi thách bị chặn vì đang có trận thì tự tìm lại. Không còn tự huỷ lời thách hay tự bỏ trận khi tải lại.
- Giữ quán khi tải lại (bản 2.10.0): `saveRun(phase)` lưu `{runId, solo, diff, phase day|shop|revive|wait, S, D(t, earned…)}` vào localStorage `mqbk-run` mỗi giây và ở mỗi lần đổi màn; `clearRun` ở `finishRun`/`soloEnd`. Mở game: `afterLogin` → `soloBoot` (bản lưu là trận solo → `soloResume`) → `resumeRun` (lượt thường, kiểm tra `runs.trang_thai='dang_choi'`) → `resumeScreen` tự bán tiếp sau 3 giây. `mkD` dựng lại ngày (giữ giờ còn lại, khách đang chờ thì bỏ). CSS `overscroll-behavior:none` chặn kéo-để-tải-lại của trình duyệt.
- Nút `#pauseBtn` (class `pz`, không dùng class `snd` vì click `.snd` sẽ bật/tắt âm thanh): chế độ thường → `pauseMenu` (dừng đồng hồ) → `closeShopConfirm` (đóng quán, tim còn lại tính là mất: `S.lost += S.rep`, nộp qua `nop_ket_qua`); solo → `soloMenu` (không dừng trận): Xin hoà (`xin_hoa`) / Bỏ cuộc (`bo_tran_solo`, bấm 2 lần). Lời xin hoà của đối thủ: `soloDrawWatch` → `showDrawOffer` (bảng phía trên, 20 giây, khoá nút 0,8s). Phím Esc/P mở menu.
- Ghi và xem lại (bản 2.11.0, `ban-ghi.js`): `REC={v,kind,diff,md,t0,ev:[[ms,mã,...]],cid}`; `recStart` ở `newGame`/`soloBegin`, `rec(mã,…)` ở các điểm trong vòng chơi. Mã: D mở ngày(day,ev,n,target) · S khách đến(id,khIdx,thầy,orderDigits,max,qmax,price,lineIdx,slot|-1) · T ngồi(id,slot) · A/R thêm/bớt món(idx ING) · P chan · X đổ · V bưng(id,slot,gain,%kiên nhẫn) · W sai(id,slot) · L bỏ bàn(id,slot) · J bỏ hàng(id) · G thẻ giữ chân(id,isQueue) · H tim(rep,lost) · E hết ngày(earned) · B mua(id,lv) · K mua tim · Z tạm dừng · U bán tiếp(rem,n) · Y tải lại · O kết thúc. `REC` đi kèm bản lưu `mqbk-run`. Gửi bằng `recUpload` (RPC `luu_ban_ghi`) sau `nop_ket_qua` thành công / ở `soloEnd`; lỗi mạng giữ ở `mqbk-rec-cho`, `recFlush` lúc đăng nhập. Xem lại: `replayScreen({thach_dau|run})` dựng trạng thái bằng `rpApply`, thanh kiên nhẫn nội suy từ thời điểm ngồi và `max`. Nút "Ván đấu & thống kê" trên màn chính → `hoSoScreen`. Màu thắng/hoà/thua: token `--win/--even/--loss` (xanh dương/xám/đỏ, đã kiểm tra mù màu).
- Tab Solo của bảng xếp hạng đọc thẳng `profiles` (mọi người, sắp theo elo, hạng = 1 + số người elo cao hơn), không dùng view `bxh_solo` nữa.
- Bộ đếm truy cập kiểu Facemash: `countVisit` (hiện lượt + người).
- Giao diện: theme sáng/tối/tự động (`applyTheme`, `data-theme`, localStorage), phím tắt laptop (1–8, Space, Q/W/E/R, X), kéo để tải lại (tắt khi đang chơi).

## Supabase

Client chỉ đọc được (RLS). Mọi thao tác ghi đi qua RPC `SECURITY DEFINER`.

- Bảng: `khoa(id, ten)`, `profiles(id, ten, khoa_id, lop, diem, so_luot, ngay_xa_nhat, chuoi, chuoi_dai_nhat, ngay_chuoi, avatar_url, avatar_khung)`, `runs(id, user_id, do_kho, trang_thai, so_ngay, doanh_thu, tim_mat, delta, diem_sau, bat_dau, ket_thuc)`, `luot_truy_cap(khach, ngay)`, `khach_ghe(khach, lan_dau, lan_cuoi, so_lan)`, `thong_ke(ten, gia_tri)`.
- `profiles` có thêm `elo` (mặc định 1200), `solo_thang`, `solo_thua`, `solo_hoa`. Bảng `thach_dau(a, b, do_kho, che_do, trang_thai cho|tu_choi|huy|het_han|dang_dau|xong, het_han 60s, bat_dau, a_/b_ ngay·doanh_thu·tim_mat·xong·ping·het_tim_luc, thang, ly_do, elo_a, elo_b, doi_a, doi_b)`, RLS chỉ đọc trận của mình, đã thêm vào publication `supabase_realtime`.
- View xếp hạng: `bxh_sinh_vien`, `bxh_lop`, `bxh_khoa`, `bxh_solo`.
- RPC: `bat_dau_luot(p_do_kho)`, `nop_ket_qua(p_run_id, p_so_ngay, p_doanh_thu, p_tim_mat)` → json (delta, diem, hang, chuoi, chuoi_moi, chuoi_dai_nhat), `luu_ho_so(p_ten, p_khoa_id, p_lop)`, `luu_avatar(p_url, p_khung)`, `ghi_luot_truy_cap(p_khach)` → json (luot, nguoi, hom_nay, tong), `_xu_ly_bo_cuoc(p_uid)`, `he_so(p_do_kho)`.
- Bản ghi (bản 2.11.0): bảng `ban_ghi(user_id, thach_dau_id | run_id, du_lieu jsonb, tao_luc)`, unique theo (user, trận)/(user, lượt); RLS đọc: của mình hoặc người trong trận solo; RPC `luu_ban_ghi(p_thach_dau, p_run, p_du_lieu)` (trận phải xong / lượt phải kết thúc, ≤ 400KB, giữ 50 bản ghi lượt thường mới nhất).
- Xin hoà (bản 2.10.0): cột `thach_dau.xin_hoa_boi`, `xin_hoa_luc`, `a_xin_hoa`, `b_xin_hoa`; RPC `xin_hoa(p_id)` (tối đa 3 lần mỗi người, hai bên cùng xin trong 20s thì hoà luôn), `tra_loi_hoa(p_id, p_dong_y)`; hoà → `_ket_thuc_solo(p_id, null, 'hoa_thoa_thuan')`.
- RPC solo: `gui_thach_dau(p_b, p_do_kho, p_che_do)`, `tra_loi_thach_dau(p_id, p_dong_y)`, `huy_thach_dau`, `cap_nhat_solo(p_id, p_ngay, p_doanh_thu, p_tim_mat, p_xong)`, `kiem_tra_solo`, `bo_tran_solo`, `tim_nguoi_choi(p_q)`; nội bộ `_ket_thuc_solo` (Elo K=32), `_xu_ly_solo`, `_kiem_tra_roi_tran` (im lặng 25s = thua, trận quá 10 phút thì so điểm).
- Push: bảng `push_sub(user_id, endpoint unique, p256dh, auth)`, RPC `luu_push`, `xoa_push`; trigger `thach_dau_bao` (after insert `thach_dau`) → `net.http_post` tới Edge Function `thong-bao-thach-dau` (verify_jwt tắt, tự kiểm header `x-hook-secret`). Khoá trong Vault: `vapid_public`, `vapid_private`, `push_hook_secret`, Edge Function đọc qua RPC `_push_cau_hinh` (chỉ service_role). Không bao giờ ghi khoá riêng vào repo hay migration.
- Luật chống gian lận trên server: doanh thu tối đa 5000/ngày; số tim mất ≤ 5 + doanh_thu/500.
- Điểm ĐBK của một lượt = doanh_thu·hs/10 − tim_mat·15·hs².

## Cách làm việc

- Trước khi push chạy: `bash tests/kiem_tra_cu_phap.sh`, `bash tests/kiem_tra_schema.sh` (nếu đụng database), `python3 tests/test_tro_choi.py` (nếu đụng giao diện/solo). Thêm tính năng thì thêm bước kiểm tra vào test; đổi luật server thì sửa cả `schema.sql`, `kiem_tra_schema.sql` và lớp `Fake`.
- Thay đổi DDL qua công cụ MCP hay bị huỷ (người dùng duyệt trên điện thoại): soạn file SQL để người dùng dán vào SQL Editor, rồi kiểm tra lại bằng truy vấn đọc.
- Sửa xong thì tăng phiên bản, commit tiếng Việt kiểu "Mô tả thay đổi (bản x.y.z)", push lên `main`.
- Reset streak để test: `update profiles set chuoi=0, chuoi_dai_nhat=0, ngay_chuoi=null where chuoi>0 or chuoi_dai_nhat>0 or ngay_chuoi is not null;`
