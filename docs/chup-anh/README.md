# Chụp lại ảnh cho README

Ảnh trong `docs/images/` chụp bằng Playwright với dữ liệu minh hoạ (Supabase giả, chặn mạng ngoài).

```bash
python3 docs/chup-anh/chup.py . /tmp/anh              # chụp từng màn (điện thoại 390×844, laptop 1280×800, @2x)
python3 docs/chup-anh/ghep.py /tmp/anh docs/images    # ghép khung điện thoại: tong-quan, choi-va-cua-hang, giao-dien-toi, bang-xep-hang, ...
python3 tests/test_tro_choi.py                        # tạo tests/output/*.png cho phần solo, xem lại
python3 docs/chup-anh/ghep_solo.py tests/output docs/images   # solo-luong-thach-dau, solo-tran-dau
```

Ảnh laptop của solo / xem lại (`solo-thong-bao`, `van-solo-laptop`, `xem-lai-laptop`) là ảnh `tests/output` tương ứng thu về 1600×1000.
