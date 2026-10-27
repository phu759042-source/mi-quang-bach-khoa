import sys
from PIL import Image, ImageDraw
SRC, DST = sys.argv[1], sys.argv[2]
BG, FR = (251, 243, 227), (27, 58, 107)
K = 2  # vẽ ở 2x rồi thu nhỏ cho mịn
def phones(names, out, bg=BG):
    n = len(names); W, H = 40 + n * 380 + (n - 1) * 40 + 40, 879
    c = Image.new('RGB', (W * K, H * K), bg); d = ImageDraw.Draw(c)
    for i, nm in enumerate(names):
        x = 40 + i * 420
        d.rounded_rectangle([x * K, 40 * K, (x + 380) * K - 1, (40 + 799) * K - 1], radius=44 * K, fill=FR)
        im = Image.open(f'{SRC}/{nm}.png').convert('RGB').resize((360 * K, 779 * K), Image.LANCZOS)
        m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=34 * K, fill=255)
        c.paste(im, ((x + 10) * K, 50 * K), m)
    c.resize((W, H), Image.LANCZOS).save(f'{DST}/{out}.png', optimize=True); print('ghép', out)
def laptop(nm, out):
    Image.open(f'{SRC}/{nm}.png').convert('RGB').resize((1600, 1000), Image.LANCZOS).save(f'{DST}/{out}.png', optimize=True); print('ghép', out)
phones(['mobile-home', 'mobile-gameplay', 'mobile-result'], 'tong-quan-dien-thoai')
phones(['mobile-gameplay', 'mobile-shop'], 'choi-va-cua-hang')
phones(['mobile-home-dark', 'mobile-gameplay-dark'], 'giao-dien-toi', bg=(17, 22, 31))
phones(['mobile-login', 'mobile-home'], 'dang-nhap-va-man-chinh')
phones(['mobile-streak', 'mobile-result'], 'streak-va-ket-qua')
phones(['mobile-bxh-sv', 'mobile-bxh-lop', 'mobile-bxh-khoa'], 'bang-xep-hang')
phones(['mobile-ho-so-ngoai-bk', 'mobile-bxh-sv', 'mobile-bxh-sv-loc'], 'sinh-vien-hay-khong')
laptop('desktop-gameplay', 'laptop-gameplay')
