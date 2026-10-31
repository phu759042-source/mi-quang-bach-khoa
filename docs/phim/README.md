# Phim giới thiệu 14,5 giây

Phim bay qua trang [miquangbk.com/gioi-thieu/](https://miquangbk.com/gioi-thieu/), 1440×1152, 60 khung/giây, H.264.
Camera đi một mạch không cắt cảnh: lướt thấp trên trang theo một đường cong tốc độ, bay lên nhìn toàn trang thành một dải, rồi lặn xuống đặt phần hero thành thẻ dưới câu kết "Mở quán thôi. / *Cả trường đang chờ.*".

| Giây | Diễn biến |
|---|---|
| 0–8,2 | Lướt xuống trang, nghiêng 56°, tiêu cự 1880 px, khoảng cách 1360 → 1700 px. Mảnh nổi (thẻ, chip, ảnh, điện thoại, câu than của khách) nhấc lên và dựng đứng khi camera đi qua |
| 1,6 | Tiêu đề "Đua điểm cho lớp, cho khoa" đi qua giữa khung |
| 5,45–6,3 | Thẻ câu than của khách nâng 22 → 112 px, lộ mép trắng dày |
| 8,0 | Tiêu đề cuối trang nét |
| 7,75–9,25 | Bay lên, zoom ra đều theo thang log, đáy trang giữ cách đáy khung 42 px |
| 9,25–9,47 | Cả trang thành một dải giữa khung |
| 9,47–9,97 | Lặn xuống, phần hero thành thẻ rộng 1018 px, góc 38 px |
| 9,97–14,5 | Câu kết hiện từng chữ, thẻ nhích gần thêm 2% |

## Dựng lại

Cần Python 3 với `playwright`, `numpy`, `scipy`, `pillow`, `fonttools`, `opencv-python`, cùng `ffmpeg` và `git`. Các file sinh ra nằm trong `docs/phim/_build/` (không đưa vào git).

```bash
python3 docs/phim/1_chuan_bi.py      # tải font từ google/fonts, dựng font tĩnh, 4 ô logo
python3 docs/phim/2_chup_trang.py    # chụp trang: nền + từng mảnh data-layer + vị trí (JSON)
python3 docs/phim/3_anh_tinh.py 0,1.6,2.5,5,6.5,9.3,11      # xem vài khung trước
python3 docs/phim/4_render.py 30 0 435 docs/phim/_build/xem-nhanh-30fps.mp4 24 16
python3 docs/phim/6_do_luong.py docs/phim/_build/xem-nhanh-30fps.mp4   # tốc độ không tụt, không zoom vào khi bay
python3 docs/phim/4_render.py 60     # bản chính
python3 docs/phim/5_am_thanh.py      # âm thanh tổng hợp
ffmpeg -i docs/phim/_build/phim-60fps.mp4 -i docs/phim/_build/am-thanh.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart phim.mp4
```

Máy không có GPU thì Chromium dùng SwiftShader (chậm, khoảng 2 giây một khung). Máy có card đồ hoạ: đặt `PHIM_GPU=1`.

## Cách trang phim vẽ một khung (`film/`)

- `_timeline.js`: camera tính từ một đường cong tốc độ (tích phân thành vị trí), lịch nhấc của từng mảnh, đường bay của 5 ô logo, tiêu điểm theo thứ đi qua giữa khung.
- `_gl.js`: WebGL2. Sàn và tờ trang vẽ bằng một lượt toàn màn hình (tia từ camera cắt mặt phẳng trang, mipmap + lọc dị hướng 16×). Mỗi mảnh là một tấm phẳng dựng đứng quanh trục giữa, có bóng `#1a2133` dời (0,10z; 4+0,36z), nhoè 7+0,5z, 26%. Mỗi điểm ảnh ghi kèm vận tốc màn hình trong 0,7 khung để làm nhoè chuyển động.
- Độ sâu trường ảnh: bán kính nhoè 75·(tiêu cự − độ sâu)/độ sâu phía trước, 6·(độ sâu − tiêu cự)/độ sâu phía sau, tối đa 120 px, 40 mẫu trên đĩa góc vàng, mỗi mẫu đọc ở mức mip hợp với độ nhoè.
- `_overlay.js`: chữ màn cuối vẽ bằng canvas 2D (Geist 500 và Newsreader Italic, vì Instrument Serif không có dấu tiếng Việt).
- `_frame.js`: ghép các lượt, `FILM.frame(t)` trả về ảnh của khung tại thời điểm t. Không có timer hay CSS transition nào.

Sửa bố cục trang giới thiệu (thêm bớt mục, đổi chiều cao) thì chạy lại từ bước 2: tốc độ lướt được tính lại để tiêu đề mục 2 qua giữa khung lúc 1,6 s và tiêu đề cuối trang lúc 8,0 s.
