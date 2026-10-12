"""Synthesize the reel's sound effects into public/sfx/*.wav (48 kHz stereo)."""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sfx')
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be an array (time-varying)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def stereo(x, width=0.0):
    if width:
        d = int(SR * 0.012)
        r = np.concatenate([np.zeros(d), x[:-d]])
        return np.stack([x, x * (1 - width) + r * width], 1)
    return np.stack([x, x], 1)


def save(name, x, gain=0.9):
    if x.ndim == 1:
        x = stereo(x)
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + '.wav'), 'w') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def env(n, attack, release_curve=3.0):
    a = int(SR * attack)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[a:] = np.linspace(1, 0, n - a) ** release_curve
    return e


def whoosh(d=0.7, f0=300, f1=6000, peak=0.6):
    tt = t(d)
    n = len(tt)
    noise = rng.standard_normal(n)
    p = tt / d
    cutoff = f0 + (f1 - f0) * np.sin(np.pi * np.clip(p / (peak * 2), 0, 1)) ** 2
    x = lowpass(noise, cutoff)
    x = highpass(x, 120)
    e = np.where(p < peak, (p / peak) ** 2, ((1 - p) / (1 - peak)) ** 1.5)
    return stereo(x * e, 0.6)


def impact(d=1.8):
    tt = t(d)
    f = 38 + 120 * np.exp(-tt * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2)
    click = lowpass(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 40)
    tail = lowpass(rng.standard_normal(len(tt)), 700) * np.exp(-tt * 3) * 0.35
    return np.tanh((sub * 1.2 + click * 0.8 + tail) * 1.6)


def riser(d=2.0):
    tt = t(d)
    p = tt / d
    noise = lowpass(rng.standard_normal(len(tt)), 400 + 9000 * p ** 2)
    f = 180 * 2 ** (p * 3)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    e = p ** 2.2
    e[-int(SR * 0.02):] *= np.linspace(1, 0, int(SR * 0.02))
    return stereo((noise * 0.8 + tone) * e, 0.7)


def tick(d=0.06, f=2400):
    tt = t(d)
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 90) + lowpass(rng.standard_normal(len(tt)), 8000) * np.exp(-tt * 200) * 0.4


def key_click():
    tt = t(0.05)
    return highpass(rng.standard_normal(len(tt)), 1500) * np.exp(-tt * 140) + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 120) * 0.4


def glitch(d=0.35):
    n = int(SR * d)
    x = np.zeros(n)
    i = 0
    while i < n:
        seg = int(SR * rng.uniform(0.008, 0.04))
        kind = rng.integers(3)
        tt = np.arange(min(seg, n - i)) / SR
        if kind == 0:
            x[i:i + len(tt)] = np.sign(np.sin(2 * np.pi * rng.uniform(80, 1200) * tt)) * 0.6
        elif kind == 1:
            x[i:i + len(tt)] = rng.standard_normal(len(tt)) * 0.7
        i += seg
    return lowpass(x, 7000) * env(n, 0.002, 1.0)


def pop():
    tt = t(0.18)
    f = 900 * np.exp(-tt * 25) + 200
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 22)


def shimmer(d=1.6):
    tt = t(d)
    x = np.zeros(len(tt))
    for k, fr in enumerate([1318.5, 1760, 2093, 2637, 3136]):
        x += np.sin(2 * np.pi * fr * tt + k) * np.exp(-tt * (2.5 + k * 0.4)) * (0.9 ** k) * (tt > k * 0.04)
    return stereo(x, 0.8)


def sub_drop(d=1.4):
    tt = t(d)
    f = 90 * np.exp(-tt * 2.5) + 28
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6) * 2)


def paper(d=0.9):
    """Rustling paper flurry."""
    n = int(SR * d)
    x = np.zeros(n)
    for _ in range(40):
        s = rng.integers(0, n - 2000)
        L = rng.integers(400, 3000)
        b = highpass(rng.standard_normal(L), 1800) * np.hanning(L) * rng.uniform(0.2, 1)
        x[s:s + L] += b
    return stereo(x * env(n, 0.05, 1.2), 0.9)


save('whoosh', whoosh())
save('whoosh-fast', whoosh(0.4, 500, 8000, 0.5))
save('whoosh-long', whoosh(1.3, 200, 5000, 0.7))
save('impact', impact())
save('riser', riser())
save('riser-short', riser(1.0))
save('tick', tick())
save('key', key_click(), 0.6)
save('glitch', glitch())
save('pop', pop())
save('shimmer', shimmer(), 0.7)
save('subdrop', sub_drop())
save('paper', paper())
print('ok')
