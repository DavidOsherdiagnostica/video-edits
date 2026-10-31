"""Assembles the earnings-season trailer from the scene clips, rendered overlays and the score.

Usage: python3 build_video.py <scene-clips-dir> <build-dir> <out.mp4>
  <build-dir> must already hold: cards/*.png, flutter/f*.png, chat/f*.png, score.wav
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

import timeline as T

GRADE = (
    f"scale={T.W}:{T.H}:flags=lanczos,setsar=1,fps={T.FPS},"
    "eq=contrast=1.07:saturation=0.85:brightness=-0.015,"
    "colorbalance=bs=0.05:bm=0.02:rs=-0.02,"
    "vignette=PI/4.5,noise=alls=5:allf=t+u,unsharp=5:5:0.35"
)
BARS = (
    f"drawbox=x=0:y=0:w=iw:h={T.BAR}:color=black:t=fill,"
    f"drawbox=x=0:y=ih-{T.BAR}:w=iw:h={T.BAR}:color=black:t=fill"
)
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(T.FPS), "-an"]


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def frames(name):
    return round((T.END[name] - T.START[name]) * T.FPS)


def dur(name):
    return T.END[name] - T.START[name]


def card_overlay(png, fade_in, in_d, fade_out=None, out_d=0.4):
    chain = f"format=rgba,fade=t=in:st={fade_in}:d={in_d}:alpha=1"
    if fade_out is not None:
        chain += f",fade=t=out:st={fade_out}:d={out_d}:alpha=1"
    return ["-loop", "1", "-i", str(png)], chain


def black(name):
    return ["-f", "lavfi", "-i", f"color=c=black:s={T.W}x{T.H}:r={T.FPS}:d={dur(name)}"]


def build(clips, build_dir, out):
    clips, b = Path(clips), Path(build_dir)
    seg = b / "seg"
    seg.mkdir(exist_ok=True)
    cards = b / "cards"
    parts = []

    def out_for(name):
        p = seg / f"{len(parts):02d}_{name}.mp4"
        parts.append(p)
        return str(p)

    street = str(clips / "רחוב בתל אביב עם מסמכים עפים לכל עבר.mp4")
    stocks = str(clips / "מסך מניות עם שעון מתקתק.mp4")
    storm = str(clips / "תל אביב בסופת מסמכים.mp4")
    typing = str(clips / "ההקדלה.mp4")
    office = clips / "תמונה מאחורה של האדם במשרד.jpg"

    # 1. Opening card on black
    inp, ov = card_overlay(cards / "c1.png", 0.4, 0.8, 2.4, 0.55)
    run([*black("card_open"), *inp, "-filter_complex", f"[1]{ov}[c];[0][c]overlay=shortest=1",
         "-frames:v", str(frames("card_open")), *ENC, out_for("card_open")])

    # 2. Street with flying documents + "they come in droves"
    inp, ov = card_overlay(cards / "c2.png", 0.5, 0.5, 3.0, 0.4)
    run(["-ss", str(T.STREET_SRC), "-i", street, *inp, "-filter_complex",
         f"[0]{GRADE},fade=t=in:st=0:d=0.25,{BARS}[v];[1]{ov}[c];[v][c]overlay",
         "-frames:v", str(frames("street")), *ENC, out_for("street")])

    def flash(name, src):
        run(["-ss", str(src), "-i", storm, "-filter_complex",
             f"[0]{GRADE},fade=t=in:st=0:d=0.12:color=white,{BARS}",
             "-frames:v", str(frames(name)), *ENC, out_for(name)])

    # 3. Flash 1
    flash("flash1", 0.0)

    # 4. Stock wall + clock + "and the clock doesn't stop"
    inp, ov = card_overlay(cards / "c3.png", 0.55, 0.45, 3.4, 0.4)
    run(["-ss", str(T.STOCKS_SRC), "-i", stocks, *inp, "-filter_complex",
         f"[0]{GRADE},{BARS}[v];[1]{ov}[c];[v][c]overlay",
         "-frames:v", str(frames("stocks")), *ENC, out_for("stocks")])

    # 5–6. Flashes 2 and 3
    flash("flash2", T.FLASH)
    flash("flash3", 2 * T.FLASH)

    # 7. A breath of black
    run([*black("silence"), "-frames:v", str(frames("silence")), *ENC, out_for("silence")])

    # 8. Slow push-in on the lone analyst, accelerating toward the screen
    office_dir = b / "office"
    office_dir.mkdir(exist_ok=True)
    img = Image.open(office).convert("RGB")
    iw, ih = img.size
    n = frames("office")
    for i in range(n):
        u = i / (n - 1)
        e = u ** 2.4
        z = 1.0 + 1.15 * e
        bw, bh = ih * 16 / 9 / z, ih / z
        cx = iw * (0.5 + 0.005 * e)
        cy = ih * (0.5 - 0.13 * e)
        x0 = min(max(cx - bw / 2, 0), iw - bw)
        y0 = min(max(cy - bh / 2, 0), ih - bh)
        img.resize((T.W, T.H), Image.BICUBIC, box=(x0, y0, x0 + bw, y0 + bh)).save(office_dir / f"f{i:04d}.png")
    run(["-framerate", str(T.FPS), "-i", str(office_dir / "f%04d.png"), "-filter_complex",
         f"[0]{GRADE},fade=t=in:st=0:d=0.6,{BARS}",
         "-frames:v", str(n), *ENC, out_for("office")])

    # 9. Typing montage — four cuts, the epic loop rides on top
    trims = "".join(
        f"[0]trim=start={a}:end={e},setpts=PTS-STARTPTS[t{k}];" for k, (a, e) in enumerate(T.TYPING_CUTS))
    joins = "".join(f"[t{k}]" for k in range(len(T.TYPING_CUTS)))
    run(["-i", typing, "-filter_complex",
         f"{trims}{joins}concat=n={len(T.TYPING_CUTS)}:v=1:a=0,{GRADE},fade=t=in:st=0:d=0.1:color=white,{BARS}",
         "-frames:v", str(frames("typing")), *ENC, out_for("typing")])

    # 10. The xhon chat (letterbox opens inside the rendered frames)
    run(["-framerate", str(T.FPS), "-i", str(b / "chat" / "f%04d.png"),
         "-vf", "format=yuv420p", "-frames:v", str(frames("chat")), *ENC, out_for("chat")])

    # 11. End cards + the page that flutters away
    c1_in, c1_ov = card_overlay(cards / "c1.png", T.END_CARD1[0], 0.4, T.END_CARD1[1] - 0.4, 0.4)
    c5_in, c5_ov = card_overlay(cards / "c5.png", T.END_CARD2, 0.25)
    run([*black("cards_end"), *c1_in, *c5_in,
         "-framerate", str(T.FPS), "-itsoffset", str(T.FLUTTER), "-i", str(b / "flutter" / "f%04d.png"),
         "-filter_complex",
         f"[1]{c1_ov}[a];[2]{c5_ov}[c];[0][a]overlay[x];[x][c]overlay[y];[3]format=rgba[p];[y][p]overlay=eof_action=pass",
         "-frames:v", str(frames("cards_end")), *ENC, out_for("cards_end")])

    # 12. Logo
    lg_in, lg_ov = card_overlay(cards / "logo.png", 0.3, 0.8, 2.35, 0.6)
    run([*black("logo"), *lg_in, "-filter_complex", f"[1]{lg_ov}[c];[0][c]overlay=shortest=1",
         "-frames:v", str(frames("logo")), *ENC, out_for("logo")])

    # Concatenate and mux the score (normalized for social playback)
    lst = seg / "list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    run(["-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(b / "score.wav"),
         "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
         "-t", str(T.TOTAL), "-movflags", "+faststart", str(out)])
    print("wrote", out)


if __name__ == "__main__":
    build(*sys.argv[1:4])
