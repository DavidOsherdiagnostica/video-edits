# Earnings-season trailer — build

Output: `out/earnings-season-trailer.mp4` (37.25s, 1080p24, −14 LUFS).

Requirements: ffmpeg, Node with Playwright (Chromium), Python 3 with numpy, scipy, Pillow.

```bash
cd trailer/src
B=/path/to/build-dir      # scratch folder for frames and segments
CLIPS="../../ההקדלה"

# 1. Title cards, logo, the closing page and the xhon chat screen (HTML -> PNG frames)
node render_cards.js "$B/cards"
node capture.js paper.html 2.0 24 "$B/flutter" 1 "" 12   # 3D page, 12 sub-frames per frame
python3 blur.py "$B/flutter"                                # merge sub-frames into motion blur
node capture.js chat.html 8 24 "$B/chat" 0

# 2. Score and sound design
python3 sound.py "$CLIPS" "$B/score.wav"

# 3. Edit, grade, letterbox, mux
python3 build_video.py "$CLIPS" "$B" ../out/earnings-season-trailer.mp4
```

All timings live in `src/timeline.py`; `chat.html` keeps its own copy of the chat timings (`window.TIMELINE`), so change both together.
