"""Averages sub-frame renders (fNNNN_sK.png) into motion-blurred RGBA frames (fNNNN.png).

Usage: python3 blur.py <dir>
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

d = Path(sys.argv[1])
groups = defaultdict(list)
for p in sorted(d.glob("f*_s*.png")):
    groups[re.match(r"(f\d+)_s\d+", p.stem).group(1)].append(p)

for name, parts in groups.items():
    acc = None
    for p in parts:
        a = np.asarray(Image.open(p).convert("RGBA")).astype(np.float32) / 255
        a[..., :3] *= a[..., 3:4]  # premultiply so transparent edges blur correctly
        acc = a if acc is None else acc + a
        p.unlink()
    acc /= len(parts)
    alpha = acc[..., 3:4]
    rgb = np.where(alpha > 1e-4, acc[..., :3] / np.maximum(alpha, 1e-4), 0)
    out = np.concatenate([rgb, alpha], axis=2)
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA").save(d / f"{name}.png")
print(f"blurred {len(groups)} frames in {d}")
