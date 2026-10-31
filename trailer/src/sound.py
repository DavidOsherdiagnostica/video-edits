"""Synthesizes the trailer soundtrack (score + sound design) and mixes in the clips' own audio.

Usage: python3 sound.py <scene-clips-dir> <out.wav>
"""
import subprocess
import sys

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

import timeline as T

SR = 48000
RNG = np.random.default_rng(7)


# ---------- primitives ----------

def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def saw(freq, dur, phase=0.0):
    t = tvec(dur)
    return 2.0 * ((freq * t + phase) % 1.0) - 1.0


def supersaw(freq, dur, voices=3, cents=9):
    out = np.zeros(int(dur * SR))
    for i in range(voices):
        det = (i - (voices - 1) / 2) * cents
        out += saw(freq * 2 ** (det / 1200), dur, RNG.random())
    return out / voices


def env(n, attack=0.005, decay=0.3, sustain=0.0, release=0.05, hold=None):
    """Attack, exponential decay to sustain, optional hold length, linear release."""
    t = np.arange(n) / SR
    e = np.where(t < attack, t / max(attack, 1e-6), sustain + (1 - sustain) * np.exp(-(t - attack) / max(decay, 1e-6)))
    if hold is not None:
        rel_start = int(hold * SR)
        if rel_start < n:
            r = np.linspace(1, 0, min(n - rel_start, int(release * SR)))
            e[rel_start:rel_start + len(r)] *= r
            e[rel_start + len(r):] = 0
    return e


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def note(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    midi = 12 * (octave + 1) + names[pitch]
    return 440.0 * 2 ** ((midi - 69) / 12)


class Bus:
    def __init__(self, dur):
        self.x = np.zeros((int(dur * SR) + SR, 2))

    def add(self, sig, t0, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.stack([sig * l * 1.414, sig * r * 1.414], axis=1)
        i = int(round(t0 * SR))
        if i < 0:
            sig, i = sig[-i:], 0
        j = min(len(self.x), i + len(sig))
        self.x[i:j] += sig[: j - i] * gain


def reverb(x, seconds=2.4, mix=0.3, tone=5000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([lp(noise(seconds), tone) * np.exp(-t * 6.9 / seconds) for _ in range(2)], axis=1)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - mix) + wet * mix


# ---------- instruments ----------

def braam(dur=3.2, root="A1", minor=True):
    third = 3 if minor else 4
    f0 = note(root)
    tones = [f0, f0 * 2 ** (7 / 12), f0 * 2, f0 * 2 * 2 ** (third / 12)]
    body = sum(supersaw(f, dur, 4, 14) for f in tones)
    n = len(body)
    bright = hp(body, 700) * env(n, 0.01, 0.35)
    dark = lp(body, 520, 4) * env(n, 0.02, 1.3)
    sub = np.sin(2 * np.pi * f0 * tvec(dur)) * env(n, 0.01, 1.6)
    x = np.tanh(2.2 * (dark * 0.9 + bright * 0.5)) + sub * 0.8
    return x * 0.55


def sub_drop(dur=2.5, f_hi=90, f_lo=32):
    t = tvec(dur)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    thump = lp(noise(dur), 300) * env(len(t), 0.002, 0.07)
    return (np.sin(ph) * env(len(t), 0.003, 0.9) + thump * 0.6) * 0.9


def whoosh(dur=0.45, reverse=True):
    n = int(dur * SR)
    sweep = np.linspace(400, 5000, n)
    x = noise(dur)
    out = np.zeros(n)
    for k in range(0, n, 2400):
        seg = x[k:k + 2400]
        fc = sweep[min(k, n - 1)]
        out[k:k + len(seg)] = bp(seg, fc * 0.5, min(fc * 1.6, 20000))
    e = np.linspace(0, 1, n) ** 2.2
    return out * (e if reverse else e[::-1]) * 0.6


def riser(dur):
    t = tvec(dur)
    f = 180 * 2 ** (2.2 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR))
    air = hp(noise(dur), 2500)
    e = (t / dur) ** 2.5
    return (lp(tone, 3000) * 0.35 + air * 0.25) * e


def taiko(pitch=110, dur=0.9, gain=1.0):
    t = tvec(dur)
    f = pitch * 0.45 + pitch * 0.55 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.32)
    skin = lp(noise(dur), 900) * env(len(t), 0.0005, 0.035)
    return np.tanh(1.6 * (body + skin * 0.7)) * gain


def snare(dur=0.35, gain=1.0):
    n = int(dur * SR)
    tone = np.sin(2 * np.pi * 190 * tvec(dur)) * env(n, 0.001, 0.05)
    rattle = bp(noise(dur), 1500, 9000) * env(n, 0.001, 0.12)
    return (tone * 0.6 + rattle) * gain * 0.7


def crash(dur=2.5, gain=1.0):
    n = int(dur * SR)
    return hp(noise(dur), 4500) * env(n, 0.002, 0.8) * gain * 0.35


def tick(freq=2600, dur=0.05, gain=1.0):
    n = int(dur * SR)
    return (np.sin(2 * np.pi * freq * tvec(dur)) * 0.5 + hp(noise(dur), 3000) * 0.5) * env(n, 0.0005, 0.008) * gain


def key_click(gain=1.0):
    dur = 0.04
    n = int(dur * SR)
    x = bp(noise(dur), 1800, 7000) * env(n, 0.0003, 0.006)
    x += np.sin(2 * np.pi * RNG.uniform(400, 600) * tvec(dur)) * env(n, 0.0005, 0.01) * 0.3
    return x * gain


def blip(freq, dur=0.12, gain=1.0):
    n = int(dur * SR)
    t = tvec(dur)
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)) * env(n, 0.002, 0.04) * gain


def brass_chord(names, dur, attack=0.18, decay=0.9, sustain=0.7, cutoff=1600):
    x = sum(supersaw(note(nm), dur, 3, 8) for nm in names) / len(names)
    n = len(x)
    e = env(n, attack, decay, sustain, release=0.12, hold=dur - 0.12)
    return np.tanh(1.8 * lp(x, cutoff, 2) * 1.6) * e


def string_pluck(freq, dur=0.11, gain=1.0):
    x = supersaw(freq, dur, 2, 6)
    n = len(x)
    return lp(x, 1400) * env(n, 0.002, 0.07, 0.0) * gain


def heartbeat(gain=1.0):
    a = taiko(70, 0.5, 1.0)
    b = taiko(62, 0.5, 0.7)
    out = np.zeros(int(0.8 * SR))
    out[: len(a)] += a
    k = int(0.22 * SR)
    out[k:k + len(b)] += b
    return lp(out, 220) * gain


def drone(dur, root=55.0):
    t = tvec(dur)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t)
    tone = (np.sin(2 * np.pi * root * t) + 0.5 * np.sin(2 * np.pi * root * 1.5 * t) + 0.25 * supersaw(root * 2, dur, 3, 15)) * lfo
    wind = lp(noise(dur), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + 1))
    return lp(tone, 700) * 0.45 + wind * 0.25


def tremolo_cluster(dur, notes_, rise=1.0):
    t = tvec(dur)
    x = np.zeros(len(t))
    for i, nm in enumerate(notes_):
        f = note(nm) * (1 + 0.02 * rise * t / dur)
        x += supersaw(f, dur, 2, 10) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (13 + i) * t)))
    return lp(x / len(notes_), 2500) * (t / dur) ** 1.8


def paper_flutter(dur):
    t = tvec(dur)
    flap = 0.5 + 0.5 * np.sin(2 * np.pi * (14 + 6 * np.sin(2 * np.pi * 0.8 * t)) * t)
    x = bp(noise(dur), 900, 6000) * flap ** 3
    e = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.5)
    return x * e * 0.5


# ---------- clip audio ----------

def clip_audio(path, start, dur):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", path,
           "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    fade = int(0.03 * SR)
    x[:fade] *= np.linspace(0, 1, fade)[:, None]
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return x


# ---------- score ----------

def build(raw_dir, out):
    S = T.START
    E = T.END
    fx = Bus(T.TOTAL)      # sound design (gets its own reverb)
    mus = Bus(T.TOTAL)     # music (gets its own reverb)
    dry = Bus(T.TOTAL)     # clip audio and UI sounds, no reverb

    # Act 1 — the threat
    fx.add(drone(12.5), 0.0, 0.55)
    fx.add(sub_drop(), 0.25, 0.9)
    dry.add(clip_audio(f"{raw_dir}/רחוב בתל אביב עם מסמכים עפים לכל עבר.mp4", T.STREET_SRC, E["street"] - S["street"]), S["street"], 1.5)
    fx.add(riser(E["street"] - S["street"] - 0.6), S["street"] + 0.6, 0.55)
    for name, g in (("flash1", 1.0), ("flash2", 1.0), ("flash3", 1.25)):
        fx.add(whoosh(0.4), S[name] - 0.4, 0.8, pan=-0.3)
        fx.add(braam(3.0, "A1"), S[name], g)
        fx.add(sub_drop(1.6, 70, 30), S[name], 0.7)
    dry.add(clip_audio(f"{raw_dir}/מסך מניות עם שעון מתקתק.mp4", T.STOCKS_SRC, E["stocks"] - S["stocks"]), S["stocks"], 1.3)
    for k in range(4):
        fx.add(tick(1900, gain=0.5), S["stocks"] + 0.35 + k, 0.6, pan=0.2)
        fx.add(tick(1500, gain=0.4), S["stocks"] + 0.85 + k, 0.6, pan=-0.2)

    # Act 2 — the hero, alone in the office
    beats = [0.25, 1.15, 1.95, 2.6, 3.1, 3.5]
    for b in beats:
        fx.add(heartbeat(), S["office"] + b, 0.6)
    fx.add(drone(4.0, 49.0), S["office"], 0.35)
    mus.add(tremolo_cluster(4.0, ["D4", "A4", "D5", "Eb5"]), S["office"], 0.22)
    fx.add(riser(1.6), E["office"] - 1.6, 0.6)
    fx.add(whoosh(0.5), E["office"] - 0.5, 0.7)

    # Act 2b — superhero loop over the typing montage
    t0 = S["typing"]
    beat = 60 / T.BPM
    six = beat / 4
    bars = [("D2", ["D3", "F3", "A3", "D4"]), ("Bb1", ["Bb2", "D3", "F3", "Bb3"]),
            ("F2", ["F2", "A2", "C3", "F3"]), ("C2", ["C3", "E3", "G3", "C4"])]
    n_six = int((E["typing"] - t0) / six)
    pattern = [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 12, 0, 12, 12]
    for i in range(n_six):
        bar = min(i // 16, 3)
        root = note(bars[bar][0])
        acc = 1.0 if i % 4 == 0 else 0.6
        mus.add(string_pluck(root * 2 ** (pattern[i % 16] / 12), gain=acc), t0 + i * six, 0.5, pan=-0.25)
        mus.add(string_pluck(root * 2 * 2 ** (pattern[(i + 2) % 16] / 12), gain=acc * 0.6), t0 + i * six, 0.3, pan=0.25)
    for b in range(4):
        start = t0 + b * 4 * beat
        if start >= E["typing"]:
            break
        dur = min(4 * beat, E["typing"] - start) + 0.05
        mus.add(brass_chord(bars[b][1], dur, attack=0.12, cutoff=1300 + 500 * b), start, 0.55 + 0.08 * b)
        mus.add(brass_chord([bars[b][1][-1][:-1] + "5"], dur, attack=0.3, cutoff=3200), start, 0.12)
    kick_steps = [0, 3, 6, 8, 11, 12, 14]
    for i in range(n_six):
        s = i % 16
        bar = i // 16
        tt = t0 + i * six
        if s in kick_steps:
            mus.add(taiko(105 if s in (0, 8) else 90, gain=1.0 if s in (0, 8) else 0.75), tt, 0.85)
        if s in (4, 12):
            mus.add(snare(gain=0.9), tt, 0.7)
        if bar == 3 and s % 2 == 1:
            mus.add(snare(gain=0.4 + 0.04 * s), tt, 0.6)
    roll_start = E["typing"] - 1.4
    k = 0
    tt = roll_start
    while tt < E["typing"] - 0.02:
        mus.add(snare(0.2, gain=0.25 + 0.6 * (tt - roll_start) / 1.4), tt, 0.55)
        tt += max(0.035, 0.12 - 0.06 * (tt - roll_start))
        k += 1
    for c in (t0, t0 + 8 * beat):
        mus.add(crash(), c, 0.9)
    mus.add(sub_drop(2.0), t0, 0.8)
    melody = [("A4", 1), ("D5", 3), ("F5", 2), ("D5", 1), ("F5", 1), ("A5", 2), ("C6", 2), ("G5", 1.6)]
    mt = t0
    for nm, beats_ in melody:
        dur = beats_ * beat
        if mt >= E["typing"]:
            break
        dur = min(dur, E["typing"] - mt)
        mus.add(brass_chord([nm], dur, attack=0.05, decay=0.5, sustain=0.8, cutoff=2600), mt, 0.28)
        mt += beats_ * beat
    mus.add(riser(1.5), E["typing"] - 1.5, 0.45)
    typing_path = f"{raw_dir}/ההקדלה.mp4"
    pos = t0
    for a, b in T.TYPING_CUTS:
        seg = clip_audio(typing_path, a, b - a)
        dry.add(seg, pos, 1.4)
        pos += b - a

    # Act 3 — the chat: the music stops dead; only the room and the keys
    c0 = S["chat"]
    room = lp(noise(E["chat"] - c0), 800) * 0.01
    dry.add(room, c0, 1.0)
    for k in range(T.CHAT_QUERY_LEN):
        tt = c0 + T.CHAT_TYPE[0] + (T.CHAT_TYPE[1] - T.CHAT_TYPE[0]) * k / T.CHAT_QUERY_LEN + RNG.uniform(-0.012, 0.012)
        dry.add(key_click(RNG.uniform(0.6, 1.0)), tt, 0.9, pan=RNG.uniform(-0.2, 0.2))
    dry.add(key_click(1.4), c0 + T.CHAT_PRESS, 0.9)
    dry.add(blip(1320, gain=0.6), c0 + T.CHAT_PRESS + 0.01, 0.4)
    shimmer_d = T.CHAT_THINK[1] - T.CHAT_THINK[0]
    tt_ = tvec(shimmer_d)
    shimmer = sum(np.sin(2 * np.pi * note(nm) * tt_) for nm in ("D6", "A6", "E7")) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * tt_)) * env(len(tt_), 0.3, 1.0, 0.6) / 3
    mus.add(shimmer, c0 + T.CHAT_THINK[0], 0.08)
    fx.add(whoosh(0.3, reverse=True), c0 + T.CHAT_ANSWER - 0.3, 0.35)
    for i, r in enumerate(T.CHAT_ROWS):
        dry.add(blip(880 * 2 ** (i * 2 / 12), 0.1, 0.5), c0 + r, 0.35, pan=-0.3 + 0.15 * i)
    swell_start = c0 + T.CHAT_SOURCES
    mus.add(brass_chord(["D3", "F#3", "A3", "D4"], E["chat"] - swell_start, attack=1.4, decay=2.0, sustain=1.0, cutoff=900), swell_start, 0.22)
    fx.add(riser(1.2), E["chat"] - 1.2, 0.35)

    # End cards
    k0 = S["cards_end"]
    fx.add(sub_drop(2.8), k0 + T.END_CARD1[0], 1.0)
    fx.add(drone(2.0, 55.0), k0, 0.25)
    fx.add(whoosh(0.4), k0 + T.END_CARD2 - 0.4, 0.8)
    hit = k0 + T.END_CARD2
    mus.add(brass_chord(["D2", "A2", "D3", "F#3", "A3", "D4"], 4.5, attack=0.03, decay=1.6, sustain=0.35, cutoff=1800), hit, 0.95)
    mus.add(taiko(95, 1.2, 1.2), hit, 1.0)
    mus.add(crash(3.5, 1.2), hit, 0.9)
    fx.add(sub_drop(3.0, 80, 28), hit, 1.0)
    fx.add(paper_flutter(1.8), k0 + T.FLUTTER, 0.9, pan=-0.4)
    fx.add(whoosh(0.5, reverse=False), k0 + T.FLUTTER + 1.2, 0.4, pan=-0.7)
    mus.add(tremolo_cluster(3.0, ["D5", "A5"]) [::-1] * 0.5, S["logo"], 0.12)

    def gate(x, a, b, fade=0.03):
        i, j, f = int(a * SR), int(b * SR), int(fade * SR)
        x[i - f:i] *= np.linspace(1, 0, f)[:, None]
        x[i:j] = 0

    fxw = reverb(fx.x, 2.8, 0.35)
    musw = reverb(mus.x, 2.0, 0.22)
    # Hard cut to silence before the office shot
    gate(fxw, T.START["silence"], T.START["office"])
    gate(musw, T.START["silence"], T.START["office"])
    # The deadpan cut: the score stops dead the moment the chat appears
    gate(musw, T.END["typing"], T.START["chat"] + 0.02, fade=0.01)
    i = int(T.END["typing"] * SR)
    fxw[i:i + int(0.5 * SR)] *= 0.15

    mix = fxw * 0.9 + musw * 1.0 + dry.x
    mix = mix[: int(T.TOTAL * SR)]
    tail = int(1.2 * SR)
    mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
    mix = np.tanh(mix / (np.abs(mix).max() * 0.6)) * 0.9

    pcm = (mix * 32767).astype(np.int16)
    import wave
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", out, f"{len(mix) / SR:.2f}s")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
