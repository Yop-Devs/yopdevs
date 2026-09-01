"""Brighten M&B logo TRANSPORTES using measured coordinates from original."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

bak = Path(r"c:\Users\gabri\yopdevs\public\projetos\meb\logo.original.png")
out = Path(r"c:\Users\gabri\yopdevs\public\projetos\meb\logo.png")

im = Image.open(bak).convert("RGBA")
a = np.array(im)
h, w = a.shape[:2]

# Measured TRANSPORTES region on original (thin gold under MB, right side)
y0, y1 = 142, 155
x_left = int(w * 0.40)

region = a[y0 : y1 + 1, x_left:, :]
lum = region[:, :, 0].astype(np.int16) + region[:, :, 1] + region[:, :, 2]
# gold-ish: warm and not pure white truck lines
mask = (lum > 40) & (region[:, :, 3] > 20) & (region[:, :, 0] >= region[:, :, 2])
ys, xs = np.where(mask)
x_min = int(xs.min()) + x_left
x_max = int(xs.max()) + x_left
print("bbox", x_min, y0, x_max, y1, "pixels", mask.sum())

base = Image.fromarray(a.copy())
ImageDraw.Draw(base).rectangle([x_min - 1, y0 - 1, x_max + 1, y1 + 1], fill=(0, 0, 0, 255))

text = "TRANSPORTES"
target_w = x_max - x_min
target_h = y1 - y0 + 1
font_path = r"C:\Windows\Fonts\arialbd.ttf"

# Prefer width fit, slightly taller than original outline for legibility
size = 14
font = ImageFont.truetype(font_path, size=size)
for _ in range(30):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    if abs(tw - target_w) <= 2:
        break
    if tw < target_w:
        size += 1
    else:
        size -= 1
        break
    font = ImageFont.truetype(font_path, size=max(9, size))

bbox = font.getbbox(text)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
tx = x_min + (target_w - tw) // 2 - bbox[0]
# keep vertically near original, allow slight grow downward if needed
ty = y0 + max(0, (target_h - th) // 2) - bbox[1]
print("font", size, "tw/th", tw, th, "pos", tx, ty)

overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)
# soft outline + solid light gold fill
for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
    d.text((tx + ox, ty + oy), text, font=font, fill=(70, 52, 18, 140))
d.text((tx, ty), text, font=font, fill=(248, 222, 145, 255))

result = Image.alpha_composite(base, overlay)
result.save(out, "PNG", optimize=True)
print("saved", out)
