#!/usr/bin/env python3
"""Génère les icônes PNG de Baliball (à lancer depuis la racine du dépôt).

Usage : python3 tools/gen_icons.py
Dépendance : pip install pillow
"""
import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")

BG = (16, 16, 20)
GREEN = (139, 213, 44)
DARK_GREEN = (51, 168, 46)
WHITE = (255, 255, 255)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial Bold.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_icon(size, margin_ratio):
    """margin_ratio : marge de sécurité (plus grande pour l'icône maskable)."""
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)

    m = int(size * margin_ratio)
    inner = size - 2 * m
    # trois briques en haut
    gap = inner * 0.06
    bw = (inner - 2 * gap) / 3
    y0 = m + inner * 0.08
    font = load_font(int(bw * 0.5))
    for i, (color, label) in enumerate([(GREEN, "1"), (DARK_GREEN, "2"), (GREEN, "1")]):
        x0 = m + i * (bw + gap)
        d.rounded_rectangle(
            [x0, y0, x0 + bw, y0 + bw], radius=int(bw * 0.14), fill=color
        )
        bbox = d.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(
            (x0 + (bw - tw) / 2 - bbox[0], y0 + (bw - th) / 2 - bbox[1]),
            label,
            font=font,
            fill=WHITE,
        )

    # balle en bas avec traînée de visée
    ball_r = inner * 0.11
    bx = size / 2
    by = m + inner * 0.82
    for i in range(4):
        t = (i + 1) / 5.0
        dot_r = ball_r * 0.28
        dx = bx + inner * 0.28 * t
        dy = by - inner * 0.30 * t
        d.ellipse(
            [dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r],
            fill=(255, 255, 255, 160),
        )
    d.ellipse([bx - ball_r, by - ball_r, bx + ball_r, by + ball_r], fill=WHITE)

    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    specs = [
        ("icon-180.png", 180, 0.10),
        ("icon-192.png", 192, 0.10),
        ("icon-512.png", 512, 0.10),
        ("icon-512-maskable.png", 512, 0.18),
    ]
    for name, size, margin in specs:
        img = draw_icon(size, margin)
        path = os.path.join(OUT, name)
        img.save(path, "PNG")
        print("écrit", path)


if __name__ == "__main__":
    main()
