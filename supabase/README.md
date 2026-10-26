# Backend Supabase

Thư mục này giữ **toàn bộ phần server** của game, để nếu project Supabase bị mất hoặc cần chuyển sang project khác thì vẫn dựng lại được.

| File | Nội dung |
|---|---|
| `schema.sql` | Bảng, ràng buộc, quyền đọc (RLS), view xếp hạng, 23 hàm RPC, trigger, realtime, bucket ảnh đại diện, danh sách khoa |
| `functions/thong-bao-thach-dau/index.ts` | Edge Function gửi thông báo đẩy khi có lời thách |

`schema.sql` được xuất từ project `fvacenxojembebqqxgfp` ngày 26/10/2026 (sau bản 2.9.1) và đã đối chiếu mã băm: cả 23 hàm và 4 view khớp với server (chỉ khác khoảng trắng đầu dòng).

**Không có trong repo**, và cũng không được đưa vào: dữ liệu người chơi, mật khẩu, khoá bí mật trong Vault.

## Dựng lại trên một project Supabase mới

1. Tạo project mới trên supabase.com.
2. **Sửa địa chỉ project cũ** (`fvacenxojembebqqxgfp`) thành địa chỉ project mới ở 4 chỗ:
   - `supabase/schema.sql`: hàm `luu_avatar` (đường dẫn ảnh) và hàm `_bao_thach_dau` (địa chỉ Edge Function).
   - `js/cau-hinh.js`: `SB_URL` và `SB_KEY` (lấy ở Project Settings › API, dùng **publishable key**, không dùng secret key).
3. **SQL Editor** › dán toàn bộ `schema.sql` › Run.
4. **Edge Function**: tạo hàm tên `thong-bao-thach-dau` với nội dung `functions/thong-bao-thach-dau/index.ts`, **tắt** "Verify JWT" (hàm tự kiểm tra mã bí mật).
5. **Khoá thông báo đẩy**: tạo cặp khoá VAPID mới (`npx web-push generate-vapid-keys`) và một chuỗi ngẫu nhiên làm mã cho trigger, rồi lưu vào Vault bằng SQL Editor:
   ```sql
   select vault.create_secret('<khoá public>',  'vapid_public');
   select vault.create_secret('<khoá private>', 'vapid_private');
   select vault.create_secret('<chuỗi ngẫu nhiên>', 'push_hook_secret');
   ```
   Sau đó sửa `PUSH_PUB` trong `js/thong-bao.js` thành khoá public mới. **Không** commit khoá private hay chuỗi ngẫu nhiên vào repo.
6. **Authentication**:
   - URL Configuration: Site URL và Redirect URL là địa chỉ trang game.
   - SMTP: dùng Resend (`smtp.resend.com`, cổng 465, user `resend`, mật khẩu là API key Resend).
   - Email Templates: dán `emails/xac-nhan-email.html` và `emails/dat-lai-mat-khau.html`.

## Khi sửa database

Sửa trên Supabase xong thì **sửa luôn `schema.sql` cho khớp**, rồi chạy:

```bash
bash tests/kiem_tra_schema.sh
```

Script dựng một Postgres trống, chạy `schema.sql`, rồi thử các luật chính của server: chống gian lận khi nộp điểm, quyền đọc trận solo, Elo, trigger gửi thông báo. Cần Postgres 15 trở lên cài trên máy (GitHub Actions có sẵn).

Muốn kiểm tra `schema.sql` còn khớp với server không: chạy `bash tests/kiem_tra_schema.sh --md5` để in mã băm từng hàm và view, rồi chạy câu sau trong SQL Editor của Supabase và so hai kết quả:

```sql
select json_object_agg(k, h order by k) from (
  select 'f:'||p.proname k, md5(btrim(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g'))) h
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  union all select 'v:'||c.relname, md5(btrim(regexp_replace(pg_get_viewdef(c.oid,true), '\s+', ' ', 'g')))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v') x;
```

## Lưu ý gói miễn phí

Project Supabase gói miễn phí **tự tạm dừng sau 7 ngày không có hoạt động** (ví dụ kỳ nghỉ không ai chơi). Khi đó vào Dashboard bấm **Resume project**; dữ liệu được giữ tới 1 năm sau khi tạm dừng.
