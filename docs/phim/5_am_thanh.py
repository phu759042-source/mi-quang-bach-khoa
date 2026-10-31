"""Bước 5: âm thanh (14,5 s, 48 kHz, stereo): gió nhẹ theo tốc độ lướt, whoosh 8,66 s và 9,80 s, tiếng chốt 9,97 s.
Tổng hợp bằng numpy/scipy, không dùng file âm thanh nào. Dùng: python3 docs/phim/5_am_thanh.py"""
import numpy as np
from scipy import signal
import wave, os
from chung import BUILD
os.makedirs(BUILD, exist_ok=True)
SR = 48000; DUR = 14.5; N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

def bp_sweep(noise, f_of_t, q, block=256):
    """lọc dải thông có tần số giữa thay đổi theo thời gian (biquad cập nhật từng khối)."""
    out = np.zeros_like(noise); zi = np.zeros(2)
    for s in range(0, len(noise), block):
        e = min(len(noise), s + block); fc = float(f_of_t((s + e) / 2 / SR))
        fc = min(max(fc, 40.0), SR * 0.45)
        b, a = signal.iirpeak(fc, q, fs=SR) if False else signal.butter(2, [fc / (1 + 0.5 / q), fc * (1 + 0.5 / q)], btype='band', fs=SR)
        if s == 0: zi = signal.lfilter_zi(b, a) * 0
        if len(zi) != max(len(a), len(b)) - 1: zi = np.zeros(max(len(a), len(b)) - 1)
        out[s:e], zi = signal.lfilter(b, a, noise[s:e], zi=zi)
    return out

def env(x, a, p, d, shape=2.0):
    """bao: lên từ a tới đỉnh p, xuống tới d."""
    y = np.zeros_like(x)
    m = (x >= a) & (x < p); y[m] = ((x[m] - a) / (p - a)) ** shape
    m = (x >= p) & (x < d); y[m] = (1 - (x[m] - p) / (d - p)) ** (shape * 0.8)
    return y

def place(sig, start, gain=1.0, pan=0.0):
    i0 = int(start * SR); e = min(N, i0 + len(sig)); sig = sig[:e - i0]
    gl = np.sqrt(0.5 * (1 - pan)); gr = np.sqrt(0.5 * (1 + pan))
    if np.ndim(pan) == 0:
        L[i0:e] += sig * gain * gl; R[i0:e] += sig * gain * gr

# 1) gió rất nhẹ theo tốc độ camera khi lướt (0 → 8,3 s)
def v_glide(x):
    y = np.zeros_like(x)
    y += np.where(x < 0.6, 0.5 * (3 * (x / 0.6) ** 2 - 2 * (x / 0.6) ** 3), 0)
    y += np.where((x >= 0.6) & (x < 1.25), 0.5, 0)
    u = np.clip((x - 1.25) / 0.35, 0, 1); y += np.where((x >= 1.25) & (x < 1.6), 0.5 + 0.5 * (3 * u ** 2 - 2 * u ** 3), 0)
    y += np.where((x >= 1.6) & (x < 7.3), 1.0, 0)
    u = np.clip((x - 7.3) / 1.0, 0, 1); y += np.where(x >= 7.3, 1 - 0.88 * (3 * u ** 2 - 2 * u ** 3), 0)
    return y
air = rng.standard_normal(N)
air = signal.sosfilt(signal.butter(2, [180, 1400], btype='band', fs=SR, output='sos'), air)
air2 = signal.sosfilt(signal.butter(2, [180, 1400], btype='band', fs=SR, output='sos'), rng.standard_normal(N))
g = v_glide(t) * np.clip(1 - (t - 8.3) / 0.5, 0, 1) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 1.0) ** 2)
L += air * g * 0.06; R += air2 * g * 0.06

# 2) whoosh: ồn trắng lọc dải quét, đỉnh tại thời điểm cho trước, lia trái → phải
def whoosh(center, pre, post, f0, f1, f2, q, gain, pan0, pan1):
    a = center - pre; d = center + post; n = int((d - a) * SR)
    x = a + np.arange(n) / SR
    fc = lambda tt: (f0 + (f1 - f0) * np.clip((tt - a) / pre, 0, 1) ** 1.5) if tt < center else (f1 + (f2 - f1) * np.clip((tt - center) / post, 0, 1) ** 0.7)
    nz = rng.standard_normal(n); nz2 = rng.standard_normal(n)
    s1 = bp_sweep(nz, lambda tt: fc(a + tt), q); s2 = bp_sweep(nz2, lambda tt: fc(a + tt) * 1.06, q)
    e = env(x, a, center, d, 2.2)
    pan = pan0 + (pan1 - pan0) * np.clip((x - a) / (d - a), 0, 1)
    gl = np.sqrt(0.5 * (1 - pan)); gr = np.sqrt(0.5 * (1 + pan))
    i0 = int(a * SR); i1 = min(N, i0 + n); k = i1 - i0
    L[i0:i1] += (s1 * e * gl)[:k] * gain; R[i0:i1] += (s2 * e * gr)[:k] * gain
whoosh(8.66, 0.62, 0.55, 300, 2600, 700, 1.4, 1.2, -0.6, 0.55)     # đi lên: quét lên rồi xuống
whoosh(9.80, 0.38, 0.22, 2400, 900, 220, 1.6, 1.5, 0.5, -0.2)      # lặn xuống: quét từ cao xuống thấp

# 3) tiếng chốt 9,97 s: thịch trầm + tiếng gõ ngắn + chuông tô sứ ngân nhẹ (hợp âm trưởng, partial không hài hoà nhẹ)
hit = 9.97
n = int(2.6 * SR); x = np.arange(n) / SR
f_sub = 46 + 52 * np.exp(-x * 22)                         # quét 98 → 46 Hz
sub = np.sin(2 * np.pi * np.cumsum(f_sub) / SR) * np.exp(-x * 6.5) * 0.9
tock = signal.sosfilt(signal.butter(2, [1800, 5200], btype='band', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-x * 85) * 0.9
bell = np.zeros(n)
for f, amp, dec in [(659.3, 0.30, 2.6), (987.8, 0.20, 3.2), (1318.5, 0.13, 3.8), (1975.5, 0.06, 5.5), (2637.0, 0.035, 7.0), (1661.2, 0.05, 4.5)]:
    bell += amp * np.sin(2 * np.pi * f * x + rng.uniform(0, 6.28)) * np.exp(-x * dec)
bell *= (1 - np.exp(-x * 400))
chot = sub + tock + bell * 0.55
i0 = int(hit * SR); k = min(N, i0 + n) - i0
L[i0:i0 + k] += chot[:k] * 0.85; R[i0:i0 + k] += (sub + tock * 0.9 + bell * 0.6)[:k] * 0.85
# tiếng "tách" nhỏ cho từng chữ hiện ra (rất nhẹ)
for tw, p in [(10.12, -0.2), (10.18, 0.0), (10.24, 0.2), (10.36, -0.25), (10.41, -0.08), (10.46, 0.08), (10.51, 0.25)]:
    m = int(0.12 * SR); xx = np.arange(m) / SR
    s = np.sin(2 * np.pi * (2900 + 400 * p) * xx) * np.exp(-xx * 70) * 0.05
    i = int(tw * SR); gl_ = np.sqrt(0.5 * (1 - p)); gr_ = np.sqrt(0.5 * (1 + p))
    L[i:i + m] += s * gl_; R[i:i + m] += s * gr_

# 4) vang nhẹ: tích chập với đáp ứng xung tắt dần 1,1 s
ir_n = int(1.1 * SR); xi = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-xi * 5.2); irR = rng.standard_normal(ir_n) * np.exp(-xi * 5.2)
irL = signal.sosfilt(signal.butter(1, 4500, fs=SR, output='sos'), irL); irR = signal.sosfilt(signal.butter(1, 4500, fs=SR, output='sos'), irR)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
wetL = signal.fftconvolve(L, irL)[:N]; wetR = signal.fftconvolve(R, irR)[:N]
L = L + 0.22 * wetL; R = R + 0.22 * wetR
# lọc bỏ siêu trầm, làm mềm đầu/cuối, chuẩn hoá đỉnh -1 dBFS
hp = signal.butter(2, 28, btype='high', fs=SR, output='sos'); L = signal.sosfilt(hp, L); R = signal.sosfilt(hp, R)
fade = np.ones(N); fi = int(0.02 * SR); fade[:fi] = np.linspace(0, 1, fi); fo = int(0.6 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 2
L *= fade; R *= fade
pk = max(np.abs(L).max(), np.abs(R).max()); g = 10 ** (-1 / 20) / pk; L *= g; R *= g
st = np.stack([L, R], 1); pcm = (np.clip(st, -1, 1) * 32767).astype('<i2')
with wave.open(os.path.join(BUILD, 'am-thanh.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = lambda a, b: 20 * np.log10(np.sqrt(np.mean(st[int(a * SR):int(b * SR)] ** 2)) + 1e-9)
print('ok', 'rms gió(3-6s)', round(rms(3, 6), 1), 'dB | whoosh1', round(rms(8.4, 8.9), 1), '| whoosh2', round(rms(9.6, 9.9), 1), '| chốt', round(rms(9.97, 10.4), 1))
