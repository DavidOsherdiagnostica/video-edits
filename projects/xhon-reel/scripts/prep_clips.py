"""Cut the interview clips listed in data/clips.json into public/clips/.

Talking-head clips get a face-centred 9:16 crop (above the TV lower third),
upscaled to 1080x1920, plus a person cut-out (VP9 with alpha) for
text-behind-subject shots. Clips whose source shot is a TV split-screen get
audio only, since the reel covers them with its own graphics.

Run with the venv that has opencv-python-headless and rembg installed.
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.environ.get('XHON_SRC') or os.path.join(ROOT, '..', '..', 'raw materials', 'ראיון עם דני רופ - הדבר הבא - עותק אתר.mp4')
OUT = os.path.join(ROOT, 'public', 'clips')
AUDIO_ONLY = {'hook', 'inject', 'sure', 'seconds', 'nothours', 'skeletons'}
_cap = cv2.VideoCapture(SRC)
SRC_W = int(_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
SRC_H = int(_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
_cap.release()
CLEAN_H = round(845 / 1080 * SRC_H / 2) * 2  # rows above the burned-in lower third
CROP_W = round(CLEAN_H * 9 / 16 / 2) * 2

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def face_center(a, b):
    cap = cv2.VideoCapture(SRC)
    xs, ys = [], []
    for t in np.linspace(a + 0.1, b - 0.1, 8):
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            continue
        gray = cv2.cvtColor(frame[:CLEAN_H, :int(SRC_W * 0.835)], cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 6, minSize=(SRC_H // 12, SRC_H // 12))
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            xs.append(x + w / 2)
            ys.append(y + h / 2)
    cap.release()
    if not xs:
        return SRC_W / 2, SRC_H * 0.28
    return float(np.median(xs)), float(np.median(ys))


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def cut_video(a, b, x0, path):
    vf = (f'crop={CROP_W}:{CLEAN_H}:{x0}:0,hqdn3d=0.8:0.8:3:3,'
          f'scale=1080:1920:flags=lanczos,unsharp=5:5:0.75:5:5:0.0,setsar=1')
    run(['ffmpeg', '-y', '-ss', f'{a:.3f}', '-i', SRC, '-t', f'{b - a:.3f}', '-vf', vf,
         '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9', '-ar', '48000',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '256k', path])


def cut_audio(a, b, path):
    run(['ffmpeg', '-y', '-ss', f'{a:.3f}', '-i', SRC, '-t', f'{b - a:.3f}', '-vn',
         '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9', '-ar', '48000', path])


def cutout(video, path, session):
    from rembg import remove
    from PIL import Image
    cap = cv2.VideoCapture(video)
    proc = subprocess.Popen(
        ['ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-r', '30', '-i', '-',
         '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '28', '-row-mt', '1',
         '-deadline', 'realtime', '-cpu-used', '8', '-auto-alt-ref', '0', path],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        small = Image.fromarray(cv2.resize(rgb, (540, 960), interpolation=cv2.INTER_AREA))
        mask = np.array(remove(small, session=session, only_mask=True))
        mask = cv2.resize(mask, (1080, 1920), interpolation=cv2.INTER_CUBIC)
        mask = cv2.GaussianBlur(mask, (5, 5), 0)
        proc.stdin.write(np.dstack([rgb, mask]).astype(np.uint8).tobytes())
    proc.stdin.close()
    proc.wait()


def main():
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    clips = json.load(open(os.path.join(ROOT, 'data', 'clips.json')))
    from rembg import new_session
    session = new_session('u2net_human_seg')
    meta = []
    meta_path = os.path.join(ROOT, 'data', 'clips-meta.json')
    old = {f"{m['clip']}_{m['part']}": m for m in json.load(open(meta_path))} if os.path.exists(meta_path) else {}
    for c in clips:
        for k, (a, b) in enumerate(c['parts']):
            name = f"{c['id']}_{k}"
            entry = {'clip': c['id'], 'part': k, 'dur': round(b - a, 3), 'spk': c['spk']}
            if only and c['id'] not in only:
                entry = old.get(name, entry)
            elif c['id'] in AUDIO_ONLY:
                cut_audio(a, b, os.path.join(OUT, name + '.wav'))
            else:
                cx, cy = face_center(a, b)
                x0 = int(min(max(cx - CROP_W / 2, 0), SRC_W - CROP_W)) // 2 * 2
                entry.update({'faceX': round(cx), 'faceY': round(cy), 'x0': x0})
                mp4 = os.path.join(OUT, name + '.mp4')
                cut_video(a, b, x0, mp4)
                cutout(mp4, os.path.join(OUT, name + '-fg.webm'), session)
            entry['audioOnly'] = c['id'] in AUDIO_ONLY
            entry['dur'] = round(b - a, 3)
            meta.append(entry)
            print(name, entry, flush=True)
    json.dump(meta, open(os.path.join(ROOT, 'data', 'clips-meta.json'), 'w'), indent=1)


main()
