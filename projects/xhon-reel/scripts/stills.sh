#!/usr/bin/env bash
# Render review stills at the given seconds into out/qc and tile them into out/qc/sheet.jpg
set -e
cd "$(dirname "$0")/.."
mkdir -p out/qc
rm -f out/qc/*.png
for t in "$@"; do
  fr=$(python3 -c "print(round($t*30))")
  npx remotion still out/bundle XhonReel "out/qc/$(printf '%06.2f' $t).png" --frame=$fr --log=error --scale=0.5 &
  while [ "$(jobs -r | wc -l)" -ge 3 ]; do sleep 1; done
done
wait
python3 - <<'PY'
from PIL import Image, ImageDraw
import glob
fs = sorted(glob.glob('out/qc/*.png'))
cols = 6
rows = (len(fs) + cols - 1) // cols
g = Image.new('RGB', (cols * 270, rows * 480), 'black')
for i, fn in enumerate(fs):
    im = Image.open(fn).convert('RGB').resize((270, 480))
    g.paste(im, ((i % cols) * 270, (i // cols) * 480))
    ImageDraw.Draw(g).text(((i % cols) * 270 + 6, (i // cols) * 480 + 6), fn.split('/')[-1][:-4], fill='yellow')
g.save('out/qc/sheet.jpg', quality=88)
PY
