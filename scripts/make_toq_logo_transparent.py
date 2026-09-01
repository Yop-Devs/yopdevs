"""Remove navy background from TOQ logo; keep white wordmark only."""
from pathlib import Path

import numpy as np
from PIL import Image

src_jpg = Path(r"c:\Users\gabri\yopdevs\public\projetos\toq\logo.jpg")
out_png = Path(r"c:\Users\gabri\yopdevs\public\projetos\toq\logo.png")
bak = Path(r"c:\Users\gabri\yopdevs\public\projetos\toq\logo.with-bg.png")

im = Image.open(src_jpg).convert("RGBA")
if not bak.exists():
    im.save(bak)

a = np.array(im)
rgb = a[:, :, :3].astype(np.int16)
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

# White / light wordmark
is_white = (r > 200) & (g > 200) & (b > 200)

# Soft edge: near-white antialias pixels
is_edge = (r > 140) & (g > 140) & (b > 140) & ~is_white

alpha = np.zeros((a.shape[0], a.shape[1]), dtype=np.uint8)
alpha[is_white] = 255
# preserve some antialias strength based on brightness
edge_strength = np.clip(((r + g + b) / 3 - 140) / (200 - 140) * 255, 0, 255).astype(np.uint8)
alpha[is_edge] = edge_strength[is_edge]

# Force wordmark to pure white where opaque enough
out = np.zeros_like(a)
out[:, :, 0] = 255
out[:, :, 1] = 255
out[:, :, 2] = 255
out[:, :, 3] = alpha

# Crop to content with padding
ys, xs = np.where(alpha > 10)
y0, y1 = max(0, ys.min() - 24), min(a.shape[0], ys.max() + 25)
x0, x1 = max(0, xs.min() - 24), min(a.shape[1], xs.max() + 25)
cropped = Image.fromarray(out).crop((x0, y0, x1, y1))
cropped.save(out_png, "PNG", optimize=True)
print(f"saved {out_png} size={cropped.size} opaque={(alpha>10).sum()}")
