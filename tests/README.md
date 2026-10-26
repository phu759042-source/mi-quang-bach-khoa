# Kiểm thử

Ba bài kiểm tra, chạy từ thư mục gốc của repo. GitHub Actions tự chạy cả ba mỗi lần push lên `main` (xem tab **Actions** trên GitHub).

| Lệnh | Kiểm tra gì | Cần cài |
|---|---|---|
| `bash tests/kiem_tra_cu_phap.sh` | Cú pháp JavaScript của `index.html`, `js/*.js` (từng file và ghép lại theo thứ tự nạp) và `sw.js`; `index.html` nạp đủ file, đúng phiên bản | Node.js |
| `bash tests/kiem_tra_schema.sh` | Dựng database trống từ `supabase/schema.sql` rồi thử luật server: chống gian lận khi nộp điểm, client không ghi thẳng vào bảng, người ngoài không đọc được trận solo, Elo, trigger gửi thông báo | Postgres 15+ |
| `python3 tests/test_tro_choi.py` | Chơi thật bằng 2 trình duyệt (một điện thoại, một laptop): hiệu ứng thắng/thua và khoá nút, tìm bạn, thách đấu, thông báo góc dưới phải, đấu Sinh tồn và Điểm cao, từ chối, bảng xếp hạng Solo, tải lại trang lúc chờ và giữa trận | `pip install playwright` rồi `python3 -m playwright install chromium` |

Bài test giao diện không gọi Supabase thật: lớp `Fake` trong `test_tro_choi.py` giả lập server với luật giống `schema.sql`. **Sửa luật trên server thì sửa cả ở `Fake`**, nếu không bài test vẫn đạt trong khi game thật chạy khác. Ảnh chụp từng bước lưu ở `tests/output/` (không đưa lên git).

Các file phụ:
- `supabase_gia.sql`: giả lập phần Supabase có sẵn (auth, vault, pg_net, storage, realtime) để chạy `schema.sql` trên Postgres thường. **Không** chạy file này trên Supabase thật.
- `kiem_tra_schema.sql`: các bước thử luật server, chạy sau `schema.sql`.
