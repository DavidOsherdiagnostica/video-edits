"""Synthesizes the trailer soundtrack (score + sound design) and mixes in the clips' own audio.

Usage: python3 sound.py <scene-clips-dir> <out.wav>
"""
import subprocess
import sys
from pathlib import Path

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

def braam(dur=3.2, root="A1", minor=True, power=False):
    third = 3 if minor else 4
    f0 = note(root)
    top = f0 * 2 * 2 ** (7 / 12) if power else f0 * 2 * 2 ** (third / 12)  # power chord: no third
    tones = [f0, f0 * 2 ** (7 / 12), f0 * 2, top]
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


def dark_pulse(freq, dur=0.12, gain=1.0):
    """Short, low, filtered pulse note — the ticking engine under the montage."""
    x = supersaw(freq, dur, 2, 6) + 0.5 * np.sin(2 * np.pi * freq * tvec(dur))
    return lp(x, 650) * env(len(x), 0.002, 0.06) * gain


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
    n = int(dur * SR)
    t = tvec(dur)
    out = bp(noise(dur), 300, 2500) * 0.12 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t)) ** 2  # air moving past the sheet
    pos = 0.0
    while pos < dur - 0.05:
        rate = 9 + 14 * np.sin(np.pi * pos / dur)  # the sheet snaps fastest mid-flight
        k = int(pos * SR)
        m = int(RNG.uniform(0.012, 0.04) * SR)
        lo = RNG.uniform(700, 2200)
        crinkle = bp(RNG.standard_normal(m), lo, min(lo * RNG.uniform(2.5, 5), 16000)) * env(m, 0.001, RNG.uniform(0.004, 0.012))
        out[k:k + m] += crinkle * RNG.uniform(0.4, 1.0)
        pos += RNG.exponential(1 / rate)
    e = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.4)
    return out * e * 0.8


def flash_burst(dur=0.6):
    """Bright burst when the monitor floods the frame with white."""
    n = int(dur * SR)
    return (hp(noise(dur), 2000) * env(n, 0.003, 0.12) + lp(noise(dur), 400) * env(n, 0.002, 0.08)) * 0.8


# ---------- clip audio ----------

def clip_audio(path, start, dur, tempo=1.0):
    """Reads `dur` seconds of output audio starting at `start` in the source (sped up by `tempo`)."""
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur * tempo), "-i", path,
           "-af", f"atempo={tempo}", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    fade = int(0.03 * SR)
    x[:fade] *= np.linspace(0, 1, fade)[:, None]
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return x


def sample(path):
    """Loads an audio file as a stereo float array at the project rate."""
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


HEARTBEAT_GAIN = 1.15  # sits level with the night sequence in the phone-speaker range (>150 Hz)
HEARTBEAT_WAV = Path(__file__).resolve().parent.parent / "assets" / "heartbeat.wav"


def with_presence(x, drive=5.0, amount=0.8):
    """Adds a saturated 150–2500 Hz layer so a sub-heavy sound still reads on phone and laptop speakers."""
    knock = np.stack([lp(hp(np.tanh(drive * x[:, c]), 150, 4), 2500) for c in range(2)], axis=1)
    knock *= np.abs(x).max() / (np.abs(knock).max() + 1e-9)
    return x + amount * knock


# ---------- score ----------

def build(clips, out):
    S = T.START
    E = T.END
    fx = Bus(T.TOTAL)      # sound design (gets its own reverb)
    mus = Bus(T.TOTAL)     # tonal/rhythmic score (gets its own reverb)
    dry = Bus(T.TOTAL)     # clip audio and UI sounds, no reverb

    # Act 1 — the threat. The street's own soundtrack starts on the very first frame, before we see it.
    street = f"{clips}/רחוב בתל אביב עם מסמכים עפים לכל עבר.mp4"
    dry.add(clip_audio(street, T.STREET_SRC - S["street"], E["street"]), 0.0, 1.5)
    fx.add(sub_drop(), 0.25, 0.5)
    fx.add(drone(S["night"]), 0.0, 0.3)
    fx.add(riser(E["street"] - S["street"] - 0.6), S["street"] + 0.6, 0.55)
    for name, g in (("flash1", 1.0), ("flash2", 1.0), ("flash3", 1.25)):
        fx.add(whoosh(0.4), S[name] - 0.4, 0.8, pan=-0.3)
        fx.add(braam(3.0, "A1"), S[name], g)
        fx.add(sub_drop(1.6, 70, 30), S[name], 0.7)
    dry.add(clip_audio(f"{clips}/מסך מניות עם שעון מתקתק.mp4", T.STOCKS_SRC, E["stocks"] - S["stocks"]), S["stocks"], 1.3)
    for k in range(4):
        fx.add(tick(1900, gain=0.5), S["stocks"] + 0.35 + k, 0.6, pan=0.2)
        fx.add(tick(1500, gain=0.4), S["stocks"] + 0.85 + k, 0.6, pan=-0.2)

    # Act 2 — the night. A dark engine pulse and a clock that speeds up, into the monitor's white.
    t0, t1 = S["night"], S["night"] + T.NIGHT_WHITE
    span = t1 - t0
    six = 0.125
    i = 0
    while t0 + i * six < t1:
        tt = t0 + i * six
        u = (tt - t0) / span
        root = note("D1") if (i // 32) % 2 == 0 else note("C1")
        octave = 2 if i % 4 in (2, 3) else 1
        accent = 1.0 if i % 4 == 0 else 0.55
        mus.add(dark_pulse(root * octave, gain=accent), tt, 0.35 + 0.55 * u)
        i += 1
    tt, gap = t0, 0.5
    k = 0
    while tt < t1:
        fx.add(tick(1700 if k % 2 == 0 else 1250, gain=0.6), tt, 0.35 + 0.4 * (tt - t0) / span, pan=0.25 if k % 2 == 0 else -0.25)
        tt += gap
        gap = max(0.11, gap * 0.955)
        k += 1
    mus.add(tremolo_cluster(span, ["D4", "Eb4", "A4", "D5"], rise=2.0), t0, 0.3)
    cut = t0
    for clip, a, b in T.NIGHT_CUTS:  # a taiko on every picture cut
        mus.add(taiko(95 if clip == "office" else 110, 1.0, 1.0), cut, 0.75)
        mus.add(sub_drop(1.2, 70, 35), cut, 0.35)
        cut += b - a

    # The push-in's own swell runs straight through the cutaways, and the keyboard runs under all of it
    dry.add(clip_audio(f"{clips}/סרטון מאחורה של האדם במשרד.mp4", 0.0, T.NIGHT_WHITE), t0, 1.2)
    bed_len = T.TYPING_BED[1] - T.TYPING_BED[0]
    pos = t0
    while pos < t1:
        part = clip_audio(f"{clips}/ההקדלה.mp4", T.TYPING_BED[0], min(bed_len, t1 - pos + 0.2))
        dry.add(part, pos, 1.6)
        pos += bed_len - 0.2
    beat_t, beat_gap = t0 + span * 0.45, 0.95
    while beat_t < t1 - 0.15:
        fx.add(heartbeat(), beat_t, 0.55)
        beat_t += beat_gap
        beat_gap = max(0.42, beat_gap * 0.86)
    for bt in np.arange(t1 - 2.0, t1 - 0.05, 0.25):  # taiko drive in the last two seconds
        mus.add(taiko(100, 0.6, 0.7 + 0.3 * (bt - t1 + 2.0) / 2.0), bt, 0.7)
    fx.add(riser(span * 0.6), t1 - span * 0.6, 0.8)
    fx.add(whoosh(0.9), t1 - 0.9, 0.9)
    fx.add(flash_burst(), t1, 0.8)

    # Act 3 — the chat: everything stops dead in the white. Two beats only: the send, and the answer landing.
    c0 = S["chat"]
    dry.add(lp(noise(E["chat"] - c0), 800) * 0.01, c0, 1.0)
    fx.add(drone(T.CHAT_PRESS, 41.2) * np.linspace(0, 1, int(T.CHAT_PRESS * SR)) ** 2, c0, 0.35)
    press = c0 + T.CHAT_PRESS
    fx.add(whoosh(0.45), press - 0.45, 0.6)
    fx.add(sub_drop(2.4, 85, 30), press, 1.0)
    mus.add(taiko(85, 1.4, 1.2), press, 0.9)
    dry.add(key_click(1.6), press, 0.6)
    # A real heartbeat under the whole chat, phased so beats fall on the send and on the answer landing
    hb = with_presence(sample(HEARTBEAT_WAV))
    first = T.CHAT_PRESS % T.CHAT_HEARTBEAT
    tt = first
    while tt < E["chat"] - c0 - 0.3:
        dry.add(hb, c0 + tt, HEARTBEAT_GAIN)
        fx.add(hb, c0 + tt, HEARTBEAT_GAIN * 0.25)  # a touch of room
        tt += T.CHAT_HEARTBEAT
    landed = c0 + T.CHAT_TABLE
    fx.add(whoosh(0.35), landed - 0.35, 0.4)
    fx.add(sub_drop(2.0, 70, 32), landed, 0.75)
    mus.add(taiko(75, 1.2, 1.0), landed, 0.7)
    fx.add(drone(E["chat"] - landed, 41.2) * np.linspace(0.2, 1, int((E["chat"] - landed) * SR)), landed, 0.5)
    fx.add(riser(1.2), E["chat"] - 1.2, 0.35)

    # End cards
    k0 = S["cards_end"]
    fx.add(sub_drop(2.8), k0 + T.END_CARD1[0], 1.0)
    fx.add(drone(2.0, 55.0), k0, 0.25)
    fx.add(whoosh(0.4), k0 + T.END_CARD2 - 0.4, 0.8)
    hit = k0 + T.END_CARD2
    fx.add(braam(4.5, "D1", power=True), hit, 1.35)
    mus.add(taiko(90, 1.4, 1.2), hit, 1.0)
    mus.add(crash(3.5, 1.2), hit, 0.8)
    fx.add(sub_drop(3.0, 80, 28), hit, 1.0)
    dry.add(paper_flutter(T.FLUTTER_DURATION), k0 + T.FLUTTER, 1.0, pan=-0.3)
    fx.add(whoosh(0.5, reverse=False), k0 + T.FLUTTER + T.FLUTTER_DURATION - 0.6, 0.35, pan=-0.7)
    fx.add(drone(E["logo"] - S["logo"], 36.7) * np.linspace(1, 0, int((E["logo"] - S["logo"]) * SR)), S["logo"], 0.4)

    def gate(x, a, b, fade=0.03):
        i, j, f = int(a * SR), int(b * SR), int(fade * SR)
        x[i - f:i] *= np.linspace(1, 0, f)[:, None]
        x[i:j] = 0

    fxw = reverb(fx.x, 2.8, 0.35)
    musw = reverb(mus.x, 2.0, 0.22)
    # The deadpan cut: the score dies in the monitor's white flash; the chat plays in near silence
    gate(musw, t1 + 0.05, c0 + 0.02, fade=0.02)
    i = int((t1 + 0.5) * SR)
    fxw[i:int(c0 * SR)] *= 0.25

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
