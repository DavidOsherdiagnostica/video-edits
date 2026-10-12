"""Synthesize the music bed (public/music.wav) to fit data/timeline.json.

120 BPM, A minor, i-VI-III-VII. Energy follows the scenes: an ambient
intro, a pulse build, the drop on the logo reveal, a breakdown for the
closing statement, and a final hit on the end card. Dialog ducks it.
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SR = 48000
tl = json.load(open(os.path.join(ROOT, 'data', 'timeline.json')))
BEAT = 60 / tl['bpm']
BAR = BEAT * 4
DUR = tl['duration'] + 1.5
N = int(DUR * SR)
rng = np.random.default_rng(3)
scene = {s['id']: s for s in tl['scenes']}

ENERGY = {'hook': 1, 'jaw': 2, 'count': 2, 'pdf': 2, 'army': 2, 'logo': 3, 'hero': 3, 'chat': 3,
          'twothings': 3, 'inject': 3, 'trust': 3, 'speed': 3, 'nothours': 3, 'skeletons': 3, 'deal': 3,
          'samesum': 3, 'usa': 2, 'info': 1, 'crazy': 2, 'end': 4}


def energy_at(t):
    for s in tl['scenes']:
        if s['start'] <= t < s['end']:
            return ENERGY[s['id']]
    return 0


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
ROOTS = [33, 29, 36, 31]


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def lp_sweep(x, cutoffs, block=512):
    """Low-pass whose cutoff follows `cutoffs` (per sample), applied block-wise."""
    out = np.empty_like(x)
    zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        fc = float(np.clip(cutoffs[min(i + block // 2, len(x) - 1)], 20, SR / 2 - 100))
        sos = butter(2, fc, 'low', fs=SR, output='sos')
        out[i:i + block], zi = sosfilt(sos, x[i:i + block], zi=zi)
    return out


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def saw(freq, t):
    return 2 * ((freq * t) % 1) - 1


L = np.zeros(N)
R = np.zeros(N)
side = np.ones(N)  # sidechain gain from the kick
tt = np.arange(N) / SR


def add(x, start, gain=1.0, pan=0.0):
    s = int(start * SR)
    if s >= N:
        return
    x = x[:N - s]
    L[s:s + len(x)] += x * gain * (1 - max(pan, 0))
    R[s:s + len(x)] += x * gain * (1 + min(pan, 0))


# --- pads (always on, filter opens with energy)
nbars = int(DUR / BAR) + 1
for b in range(nbars):
    t0 = b * BAR
    e = max(energy_at(t0 + 0.01), 1)
    d = BAR + 0.3
    t = np.arange(int(d * SR)) / SR
    x = np.zeros_like(t)
    for n in CHORDS[b % 4]:
        for det in (-0.12, 0.0, 0.11):
            x += saw(midi(n + det) * 1.0, t + rng.random())
        x += 0.5 * saw(midi(n - 12), t)
    cutoff = {1: 700, 2: 1100, 3: 1800, 4: 2400}[e]
    x = lp(x, cutoff, 2)
    env = np.minimum(t / 0.25, 1) * np.minimum((d - t) / 0.3, 1)
    add(x * env, t0, 0.035)

# --- per-beat elements
nbeats = int(DUR / BEAT)
kick_t = np.arange(int(0.45 * SR)) / SR
kick = np.sin(2 * np.pi * np.cumsum(45 + 140 * np.exp(-kick_t * 30)) / SR) * np.exp(-kick_t * 7)
kick = np.tanh(kick * 2.5) + lp(rng.standard_normal(len(kick_t)), 4000) * np.exp(-kick_t * 120) * 0.3
hat_t = np.arange(int(0.07 * SR)) / SR
hat = hp(rng.standard_normal(len(hat_t)), 7000) * np.exp(-hat_t * 70)
ohat_t = np.arange(int(0.25 * SR)) / SR
ohat = hp(rng.standard_normal(len(ohat_t)), 6000) * np.exp(-ohat_t * 14)
clap_t = np.arange(int(0.3 * SR)) / SR
clap = lp(hp(rng.standard_normal(len(clap_t)), 900), 5000) * (np.exp(-clap_t * 22) + 0.6 * np.exp(-((clap_t - 0.012) % 0.011) * 400) * (clap_t < 0.035))

for i in range(nbeats):
    t0 = i * BEAT
    e = energy_at(t0 + 0.01)
    bar = int(t0 / BAR)
    beat_in_bar = i % 4
    root = ROOTS[bar % 4]
    if e >= 3:
        add(kick, t0, 0.55)
        s = int(t0 * SR)
        n = min(int(0.3 * SR), N - s)
        side[s:s + n] = np.minimum(side[s:s + n], 0.35 + 0.65 * np.linspace(0, 1, n) ** 0.6)
        if beat_in_bar in (1, 3):
            add(clap, t0, 0.18, 0.1)
        add(ohat, t0 + BEAT / 2, 0.05, -0.2)
    if e >= 2:
        for k in range(4 if e >= 3 else 2):
            add(hat, t0 + k * BEAT / (4 if e >= 3 else 2), 0.03 if k % 2 else 0.045, 0.3)
        # rolling sub bass in 8ths
        for k in range(2):
            d = BEAT / 2
            t = np.arange(int(d * SR)) / SR
            f = midi(root + (12 if (k == 1 and e >= 3) else 0))
            x = np.sin(2 * np.pi * f * t) + 0.35 * lp(saw(f, t), 600)
            x *= np.minimum(t / 0.005, 1) * np.exp(-t * 5)
            add(x, t0 + k * d, 0.16 if e >= 3 else 0.11)
    if e in (1, 2, 4) or e >= 3:
        # pluck arpeggio, 16ths
        chord = CHORDS[bar % 4]
        notes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
        for k in range(4):
            if e == 1 and k % 2:
                continue
            d = 0.22
            t = np.arange(int(d * SR)) / SR
            f = midi(notes[(i * 4 + k) % 4])
            x = lp(saw(f, t) + 0.5 * np.sign(np.sin(2 * np.pi * f * 2 * t)), 2600 if e >= 3 else 1800)
            x *= np.exp(-t * 18)
            add(x, t0 + k * BEAT / 4, 0.022 if e >= 3 else 0.028, 0.35 if k % 2 else -0.35)

# --- risers into the drop and into the end card
for sid, d in (('logo', 3.5), ('end', 2.5), ('jaw', 1.2)):
    if sid not in scene:
        continue
    end_t = scene[sid]['start']
    t = np.arange(int(d * SR)) / SR
    p = t / d
    x = lp_sweep(rng.standard_normal(len(t)), 300 + 8000 * p ** 2.5) * p ** 2.5
    x += 0.15 * saw(110 * 2 ** (p * 2), t) * p ** 2
    add(x, end_t - d, 0.12)

# --- final hit + long chord tail on the end card
if 'end' in scene:
    t0 = scene['end']['start']
    t = np.arange(int(4 * SR)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(32 + 90 * np.exp(-t * 10)) / SR) * np.exp(-t * 1.2)
    add(np.tanh(boom * 2), t0, 0.5)

# reverb-ish smear: a few short delays
mix_l = L * side
mix_r = R * side
for dl, g in ((0.031, 0.25), (0.057, 0.2), (0.089, 0.15), (BEAT * 0.75, 0.12)):
    d = int(dl * SR)
    mix_l[d:] += lp(mix_r[:-d], 3500) * g
    mix_r[d:] += lp(mix_l[:-d], 3500) * g

# ducking under dialog
duck = np.ones(N)
for seg in tl['segments']:
    s, e = int(seg['start'] * SR), int((seg['start'] + seg['dur']) * SR)
    duck[s:e] = 0.5
k = int(0.15 * SR)
duck = np.convolve(duck, np.ones(k) / k, mode='same')
# fade out
fade = np.ones(N)
fo = int(1.5 * SR)
fade[-fo:] = np.linspace(1, 0, fo) ** 2

out = np.stack([mix_l, mix_r], 1) * (duck * fade)[:, None]
out = hp(out.T, 25).T
out = np.tanh(out / np.max(np.abs(out)) * 1.4) * 0.85
with wave.open(os.path.join(ROOT, 'public', 'music.wav'), 'w') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('music', round(DUR, 2), 's')
