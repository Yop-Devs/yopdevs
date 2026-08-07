"""Blur only PII on Fenix screenshots (names/phones); keep values and UI visible."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(r"c:\Users\gabri\yopdevs\public\projetos\prints\fenix")
RAW = ROOT / "raw"
OUT = ROOT / "safe"
OUT.mkdir(parents=True, exist_ok=True)

RAW_MAP: dict[str, Path] = {}
for p in RAW.glob("*.png"):
    name = p.name.lower()
    if "crm" in name:
        RAW_MAP["crm"] = p
    elif "ranking" in name:
        RAW_MAP["ranking"] = p
    elif "processos" in name:
        RAW_MAP["processos"] = p
    elif "cartas" in name:
        RAW_MAP["cartas"] = p
    elif "vendas" in name:
        RAW_MAP["vendas"] = p
    elif "documentos" in name or "edicao" in name:
        RAW_MAP["docs"] = p
    elif "login" in name:
        RAW_MAP["login"] = p
    elif "inicial" in name:
        RAW_MAP["inicial"] = p


def blur_box(im: Image.Image, box: tuple[float, float, float, float], radius: int = 10) -> None:
    """box = (x0, y0, x1, y1) as fractions 0..1 of image size. Soft privacy blur."""
    w, h = im.size
    x0, y0, x1, y1 = [int(v * s) for v, s in zip(box, (w, h, w, h))]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    if x1 <= x0 or y1 <= y0:
        return
    region = im.crop((x0, y0, x1, y1))
    # Milder pixelate — enough to hide names, not wash the whole UI
    small = region.resize(
        (max(1, region.width // 10), max(1, region.height // 8)),
        Image.Resampling.BILINEAR,
    )
    pixel = small.resize(region.size, Image.Resampling.NEAREST)
    blurred = pixel.filter(ImageFilter.GaussianBlur(radius=radius))
    im.paste(blurred, (x0, y0))


def process(key: str, boxes: list[tuple[float, float, float, float]]) -> Image.Image | None:
    src = RAW_MAP.get(key)
    if not src:
        print(f"missing {key}")
        return None
    im = Image.open(src).convert("RGB")
    for b in boxes:
        blur_box(im, b)
    out = OUT / f"{key}.png"
    im.save(out, "PNG", optimize=True)
    print(f"saved {out.name} {im.size} ({len(boxes)} regions)")
    return im


# Only PII: names, phones, personal notes. Keep R$ values, KPIs, status, UI.
SAFE: dict[str, list[tuple[float, float, float, float]]] = {
    # CRM: NOME + CONTATO + OBSERVAÇÃO (notas pessoais)
    "crm": [
        (0.195, 0.38, 0.34, 0.98),
        (0.34, 0.38, 0.46, 0.98),
        (0.62, 0.38, 0.78, 0.98),
    ],
    # Ranking: só nomes (individual + duplas); valores em verde ficam
    "ranking": [
        (0.205, 0.48, 0.42, 0.98),
        (0.54, 0.48, 0.74, 0.98),
    ],
    # Processos: só faixa do nome em cada coluna do kanban
    "processos": [
        (0.20, 0.28, 0.38, 0.88),
        (0.39, 0.28, 0.57, 0.88),
        (0.58, 0.28, 0.76, 0.88),
        (0.77, 0.28, 0.96, 0.88),
    ],
    # Cartas: só "Resp.:" no rodapé dos cards — valores ficam
    "cartas": [
        (0.20, 0.52, 0.42, 0.58),
        (0.44, 0.52, 0.66, 0.58),
        (0.68, 0.52, 0.90, 0.58),
        (0.20, 0.88, 0.42, 0.94),
        (0.44, 0.88, 0.66, 0.94),
        (0.68, 0.88, 0.90, 0.94),
    ],
    # Vendas: só CLIENTE + VENDEDOR — VALOR/COMISSÃO ficam
    "vendas": [
        (0.195, 0.48, 0.36, 0.98),
        (0.68, 0.48, 0.84, 0.98),
    ],
    # Login: CNPJ
    "login": [
        (0.28, 0.88, 0.72, 0.98),
    ],
    "docs": [],
    "inicial": [],
}

images: dict[str, Image.Image] = {}
for key, boxes in SAFE.items():
    im = process(key, boxes)
    if im:
        images[key] = im

for key in ("docs", "inicial"):
    if key not in images and key in RAW_MAP:
        im = Image.open(RAW_MAP[key]).convert("RGB")
        im.save(OUT / f"{key}.png", "PNG", optimize=True)
        images[key] = im
        print(f"saved {key}.png (no blur)")

print(f"done — {len(images)} panels ready for cover rebuild")
