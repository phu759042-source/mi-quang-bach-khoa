import sys
from PIL import Image, ImageDraw, ImageFont
SRC, DST = sys.argv[1], sys.argv[2]
BG, FR, TX = (251, 243, 227), (27, 58, 107), (27, 58, 107)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 23)
def ghep(items, out):
    W, H = 1414, 765; c = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(c)
    for i, (title, nm) in enumerate(items):
        x = 30 + i * 346
        d.text((x + 4, 30), title, font=F, fill=TX)
        d.rectangle([x, 70, x + 315, 734], fill=FR)
        im = Image.open(f'{SRC}/{nm}.png').convert('RGB').resize((300, 649), Image.LANCZOS)
        m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 299, 648], radius=22, fill=255)
        c.paste(im, (x + 8, 78), m)
    c.save(f'{DST}/{out}.png', optimize=True); print('ghép', out)
ghep([('1. Nút Solo', 'solo-01-home'), ('2. Tìm bạn', 'solo-02-tim-kiem'), ('3. Chọn luật', 'solo-03-chon-luat'), ('4. Chờ trả lời', 'solo-04-cho-tra-loi')], 'solo-luong-thach-dau')
ghep([('5. Đếm ngược', 'solo-06-dem-nguoc'), ('6. Đang đấu', 'solo-07-dang-dau-dien-thoai'), ('7. Cửa hàng', 'solo-12-cua-hang'), ('8. Kết quả', 'solo-09-thang')], 'solo-tran-dau')
