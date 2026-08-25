#!/usr/bin/env python3
"""Génère les icônes PNG de Baliball, thème Bali (à lancer depuis la racine).

Usage : python3 tools/gen_icons.py
Dépendance : pip install pillow
"""
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")

WATER_TOP = (47, 174, 159)
WATER_BOTTOM = (167, 236, 220)
SAND = (240, 224, 182)
SILHOUETTE = (18, 74, 68)
COCO_BASE = (122, 82, 48)
COCO_DARK = (85, 54, 28)
COCO_LIGHT = (163, 121, 78)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon(size, margin_ratio):
    img = Image.new("RGB", (size, size), WATER_TOP)
    d = ImageDraw.Draw(img)

    # dégradé du lagon
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(WATER_TOP, WATER_BOTTOM, y / size))

    m = int(size * margin_ratio)
    inner = size - 2 * m

    # plage en bas (arc doux)
    beach_top = m + int(inner * 0.78)
    d.ellipse([-size * 0.3, beach_top, size * 1.3, size * 2], fill=SAND)
    # écume
    d.arc([-size * 0.3, beach_top - size * 0.012, size * 1.3, size * 2],
          180, 360, fill=WHITE, width=max(2, size // 90))

    # temple meru en silhouette (droite)
    tx = m + int(inner * 0.66)
    base_w = int(inner * 0.26)
    ty = beach_top + int(inner * 0.02)
    tiers = 4
    for i in range(tiers):
        w = int(base_w * (1 - i * 0.2))
        h = int(inner * 0.075)
        x0 = tx + (base_w - w) // 2
        y0 = ty - (i + 1) * int(h * 1.35)
        d.rectangle([x0, y0, x0 + w, y0 + h], fill=SILHOUETTE)
        d.polygon([
            (x0 - w * 0.14, y0), (x0 + w * 1.14, y0),
            (x0 + w * 0.86, y0 - h * 0.8), (x0 + w * 0.14, y0 - h * 0.8),
        ], fill=SILHOUETTE)

    # noix de coco au centre avec anneau d'écume
    cx = m + int(inner * 0.38)
    cy = m + int(inner * 0.45)
    r = int(inner * 0.23)
    ring = int(r * 1.35)
    d.ellipse([cx - ring, cy - ring, cx + ring, cy + ring],
              outline=WHITE, width=max(3, size // 60))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=COCO_BASE,
              outline=COCO_DARK, width=max(2, size // 80))
    # reflet
    hr = int(r * 0.45)
    d.ellipse([cx - int(r * 0.55) - hr // 2, cy - int(r * 0.55) - hr // 2,
               cx - int(r * 0.55) + hr, cy - int(r * 0.55) + hr], fill=COCO_LIGHT)
    # les trois yeux
    er = max(2, int(r * 0.13))
    for ex, ey in [(-0.2, -0.05), (0.1, -0.25), (0.18, 0.12)]:
        px, py = cx + int(r * ex), cy + int(r * ey)
        d.ellipse([px - er, py - er, px + er, py + er], fill=COCO_DARK)

    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    specs = [
        ("icon-180.png", 180, 0.06),
        ("icon-192.png", 192, 0.06),
        ("icon-512.png", 512, 0.06),
        ("icon-512-maskable.png", 512, 0.16),
    ]
    for name, size, margin in specs:
        img = draw_icon(size, margin)
        path = os.path.join(OUT, name)
        img.save(path, "PNG")
        print("écrit", path)


if __name__ == "__main__":
    main()
