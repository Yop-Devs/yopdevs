"""Rebuild M&B Transportes portfolio cover: logo + mosaic."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

SAFE = Path(r"c:\Users\gabri\yopdevs\public\projetos\prints\meb\safe")
OUT = Path(r"c:\Users\gabri\yopdevs\public\projetos\prints\meb.png")
LOGO_SRC = Path(r"c:\Users\gabri\yopdevs\public\projetos\meb\logo.png")

logo = Image.open(LOGO_SRC).convert("RGBA")
print(f"logo src -> {logo.size} mode={logo.mode}")

order = ["login", "dashboard", "acompanhamento", "viagens", "manutencao", "financeiro", "recebimentos"]
panels = [Image.open(SAFE / f"{k}.png").convert("RGB") for k in order]

W, H = 1920, 1080
canvas = Image.new("RGB", (W, H), (6, 14, 40))

glow = Image.new("RGB", (W, H), (6, 14, 40))
gd = ImageDraw.Draw(glow)
gd.ellipse((-140, 80, 700, 980), fill=(20, 50, 120))
gd.ellipse((980, -120, 2100, 680), fill=(40, 70, 150))
gd.ellipse((700, 600, 1500, 1200), fill=(180, 140, 40))
glow = glow.filter(ImageFilter.GaussianBlur(150))
canvas = Image.blend(canvas, glow, 0.42)

grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(grid)
for x in range(0, W, 48):
    gdraw.line([(x, 0), (x, H)], fill=(90, 140, 220, 16))
for y in range(0, H, 48):
    gdraw.line([(0, y), (W, y)], fill=(90, 140, 220, 16))
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
bp.rounded_rectangle((0, 0, brand_w - 1, 879), radius=28, fill=(4, 12, 36, 240))
bp.rounded_rectangle((0, 0, brand_w - 1, 879), radius=28, outline=(200, 160, 60, 120), width=2)

# keep black logo background for brand contrast
lw = int(brand_w * 0.82)
lh = int(logo.height * (lw / max(1, logo.width)))
if lh > 380:
    lh = 380
    lw = int(logo.width * (lh / max(1, logo.height)))
logo_r = logo.resize((lw, lh), Image.Resampling.LANCZOS)
lx = (brand_w - lw) // 2
ly = (880 - lh) // 2 - 40
brand_panel.paste(logo_r, (lx, ly), logo_r)

bp.text((brand_w // 2, 790), "M&B TRANSPORTES", fill=(220, 190, 100, 230), anchor="mm")
bp.text((brand_w // 2, 828), "Gestão de frota e operações", fill=(160, 180, 210, 180), anchor="mm")

base.paste(brand_panel, (70, 100), brand_panel)

paste_panel(base, panels[0], (640, 90), (620, 340), 18)
paste_panel(base, panels[1], (1290, 90), (560, 340), 18)
paste_panel(base, panels[2], (640, 460), (400, 250), 14)
paste_panel(base, panels[3], (1065, 460), (400, 250), 14)
paste_panel(base, panels[4], (1490, 460), (360, 250), 14)
paste_panel(base, panels[5], (640, 740), (600, 250), 14)
paste_panel(base, panels[6], (1270, 740), (580, 250), 14)

final = ImageEnhance.Contrast(base.convert("RGB")).enhance(1.05)
final = ImageEnhance.Color(final).enhance(1.06)
final.save(OUT, "PNG", optimize=True)
final.save(SAFE / "cover.png", "PNG", optimize=True)
print(f"cover -> {OUT} {final.size}")
