"""Day Gomes logo: dark background removed by luminance, edges feathered."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SRC = Path(r"c:\Users\gabri\yopdevs\public\projetos\daygomes\logo-src.png")
OUT = Path(r"c:\Users\gabri\yopdevs\public\projetos\daygomes\logo.png")

im = Image.open(SRC).convert("RGBA")
w, h = im.size

# Flood the background from the borders: pixels connected to the edge and close to the dark bg.
bg = Image.new("L", (w, h), 0)
src = im.convert("RGB")
seen = bytearray(w * h)
stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
bpx = bg.load()
spx = src.load()
while stack:
    x, y = stack.pop()
    i = y * w + x
    if seen[i]:
        continue
    seen[i] = 1
    r, g, b = spx[x, y]
    if max(r, g, b) > 48:
        continue
    bpx[x, y] = 255
    if x > 0:
        stack.append((x - 1, y))
    if x < w - 1:
        stack.append((x + 1, y))
    if y > 0:
        stack.append((x, y - 1))
    if y < h - 1:
        stack.append((x, y + 1))

mask = Image.eval(bg, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(1.2))
im.putalpha(mask)

bbox = mask.point(lambda v: 255 if v > 20 else 0).getbbox()
if bbox:
    pad = 6
    im = im.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
im.save(OUT, "PNG", optimize=True)
print(f"logo -> {OUT} {im.size}")

prev = Image.new("RGBA", (im.width * 2 + 30, im.height + 20), (7, 13, 36, 255))
ImageDraw.Draw(prev).rectangle((im.width + 20, 0, prev.width, prev.height), fill=(20, 24, 32, 255))
prev.alpha_composite(im, (10, 10))
prev.alpha_composite(im, (im.width + 20, 10))
prev.save(Path(__import__("tempfile").gettempdir()) / "dg_preview.png")
