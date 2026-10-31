# Earnings-season trailer — build

Output: `out/earnings-season-trailer.mp4` (38.6s, 1080p24, −14 LUFS).

Requirements: ffmpeg, Node with Playwright (Chromium), Python 3 with numpy, scipy, Pillow.

```bash
cd trailer/src
B=/path/to/build-dir      # scratch folder for frames and segments
CLIPS="../../ההקדלה"

# 1. Title cards, logo, fluttering page and the xhon chat screen (HTML -> PNG frames)
node render_cards.js "$B/cards"
node capture.js overlays.html 1.8 24 "$B/flutter" 1 l=flutter
node capture.js chat.html 8 24 "$B/chat" 0

# 2. Score and sound design
python3 sound.py "$CLIPS" "$B/score.wav"

# 3. Edit, grade, letterbox, mux
python3 build_video.py "$CLIPS" "$B" ../out/earnings-season-trailer.mp4
```

All timings live in `src/timeline.py`; `chat.html` keeps its own copy of the chat timings (`window.TIMELINE`), so change both together.
