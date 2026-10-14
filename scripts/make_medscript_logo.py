"""MedScript logo for dark backgrounds: black -> white, red preserved, trimmed."""
from pathlib import Path
from PIL import Image

SRC = Path(r"c:\Users\gabri\yopdevs\public\projetos\medscript\logo-src.png")
OUT = Path(r"c:\Users\gabri\yopdevs\public\projetos\medscript\logo.png")

im = Image.open(SRC).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        if r > 235 and g > 235 and b > 235:
            px[x, y] = (0, 0, 0, 0)
            continue
        is_red = r > 120 and r > g * 1.6 and r > b * 1.6
        if not is_red:
            lum = (r + g + b) // 3
            alpha = int(a * max(0.0, min(1.0, (255 - lum) / 200)))
            px[x, y] = (255, 255, 255, alpha)

bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)
im.save(OUT, "PNG", optimize=True)
print(f"logo -> {OUT} {im.size}")
