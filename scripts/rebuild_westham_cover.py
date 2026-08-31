"""Rebuild Westham Sport Club portfolio cover: logo + mosaic."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

SAFE = Path(r"c:\Users\gabri\yopdevs\public\projetos\prints\westham\safe")
OUT = Path(r"c:\Users\gabri\yopdevs\public\projetos\prints\westham.png")
LOGO_SRC = Path(r"c:\Users\gabri\yopdevs\public\projetos\westham\logo.png")

logo = Image.open(LOGO_SRC).convert("RGBA")
print(f"logo src -> {logo.size} mode={logo.mode}")

order = ["home", "projetos", "jogos", "admin-home", "admin-jogadores", "admin-noticias", "admin-jogos"]
panels = [Image.open(SAFE / f"{k}.png").convert("RGB") for k in order]

W, H = 1920, 1080
canvas = Image.new("RGB", (W, H), (8, 6, 4))

glow = Image.new("RGB", (W, H), (8, 6, 4))
gd = ImageDraw.Draw(glow)
gd.ellipse((-120, 100, 720, 980), fill=(160, 55, 10))
gd.ellipse((900, -100, 2100, 700), fill=(50, 20, 10))
glow = glow.filter(ImageFilter.GaussianBlur(140))
canvas = Image.blend(canvas, glow, 0.5)

grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(grid)
for x in range(0, W, 48):
    gdraw.line([(x, 0), (x, H)], fill=(255, 100, 30, 14))
for y in range(0, H, 48):
    gdraw.line([(0, y), (W, y)], fill=(255, 100, 30, 14))
canvas = Image.alpha_composite(canvas.convert("RGBA"), grid).convert("RGB")


def rounded(im: Image.Image, size: tuple[int, int], radius: int = 16) -> Image.Image:
    thumb = im.resize(size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(thumb, (0, 0))
    out.putalpha(mask)
    return out


def paste_panel(base: Image.Image, im: Image.Image, xy: tuple[int, int], size: tuple[int, int], radius: int = 16):
    panel = rounded(im, size, radius)
    plate = Image.new("RGBA", (size[0] + 6, size[1] + 6), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle((0, 0, size[0] + 5, size[1] + 5), radius=radius + 2, fill=(0, 0, 0, 120))
    base.paste(plate, (xy[0] - 3, xy[1] - 3), plate)
    base.paste(panel, xy, panel)


base = canvas.convert("RGBA")

brand_w = 520
brand_panel = Image.new("RGBA", (brand_w, 880), (0, 0, 0, 0))
bp = ImageDraw.Draw(brand_panel)
bp.rounded_rectangle((0, 0, brand_w - 1, 879), radius=28, fill=(0, 0, 0, 235))
bp.rounded_rectangle((0, 0, brand_w - 1, 879), radius=28, outline=(255, 90, 20, 120), width=2)

# Remove near-black bg from crest if present
pixels = logo.load()
for y in range(logo.height):
    for x in range(logo.width):
        r, g, b, a = pixels[x, y]
        if a > 0 and r < 18 and g < 18 and b < 18:
            pixels[x, y] = (0, 0, 0, 0)

lw = int(brand_w * 0.62)
lh = int(logo.height * (lw / max(1, logo.width)))
if lh > 420:
    lh = 420
    lw = int(logo.width * (lh / max(1, logo.height)))
logo_r = logo.resize((lw, lh), Image.Resampling.LANCZOS)
lx = (brand_w - lw) // 2
ly = (880 - lh) // 2 - 36
brand_panel.paste(logo_r, (lx, ly), logo_r)

bp.text((brand_w // 2, 790), "WESTHAM SPORT CLUB", fill=(255, 120, 40, 230), anchor="mm")
bp.text((brand_w // 2, 828), "Site e painel do clube", fill=(200, 180, 160, 180), anchor="mm")

base.paste(brand_panel, (70, 100), brand_panel)

paste_panel(base, panels[0], (640, 90), (620, 340), 18)
paste_panel(base, panels[1], (1290, 90), (560, 340), 18)
paste_panel(base, panels[2], (640, 460), (520, 250), 14)
paste_panel(base, panels[3], (1185, 460), (320, 250), 14)
paste_panel(base, panels[4], (1530, 460), (320, 250), 14)
paste_panel(base, panels[5], (640, 740), (600, 250), 14)
paste_panel(base, panels[6], (1270, 740), (580, 250), 14)

final = ImageEnhance.Contrast(base.convert("RGB")).enhance(1.05)
final = ImageEnhance.Color(final).enhance(1.08)
final.save(OUT, "PNG", optimize=True)
final.save(SAFE / "cover.png", "PNG", optimize=True)
print(f"cover -> {OUT} {final.size}")
