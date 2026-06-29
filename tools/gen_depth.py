#!/usr/bin/env python3
"""
gen_depth.py — generador LOCAL de mapas de profundidad para el diorama.
NO se sirve en produccion. Tooling de preparacion de assets.

Convencion de salida: depth.png en escala de grises 8-bit, donde CERCA = CLARO (255)
y LEJOS = OSCURO (0). El diorama lee este PNG para el parallax 2.5D.

----------------------------------------------------------------------------
USO
----------------------------------------------------------------------------
    python tools/gen_depth.py                          # AGS-7 por defecto, modelo real
    python tools/gen_depth.py ruta/foto.jpg            # genera foto-depth.png al lado
    python tools/gen_depth.py foto.jpg salida.png      # ruta de salida explicita
    python tools/gen_depth.py --model heuristic foto.jpg   # sin IA (fallback)

Modelo real (recomendado): Depth-Anything via transformers.
    pip install torch transformers pillow numpy
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PHOTO = os.path.join(REPO, "diorama", "assets", "AGS-7", "photo.jpg")


def heuristic_depth(img: Image.Image) -> Image.Image:
    """Fallback sin ML: prior de plano de suelo + deteccion de cielo. cerca = claro."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = rgb.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    sat = np.where(maxc > 1e-5, (maxc - minc) / np.maximum(maxc, 1e-5), 0.0)
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    ground = np.repeat(yy, w, axis=1)
    vert = np.clip(1.0 - yy * 2.0, 0.0, 1.0)
    sky = np.clip((luma - 0.55) / 0.45, 0.0, 1.0) * (1.0 - np.clip(sat / 0.35, 0.0, 1.0))
    sky = sky * np.repeat(vert, w, axis=1)
    depth = ground * 0.85 + luma * 0.15
    depth = depth * (1.0 - sky)
    depth = (depth - depth.min()) / max(depth.max() - depth.min(), 1e-5)
    out = Image.fromarray((depth * 255.0).astype(np.uint8), mode="L")
    return out.filter(ImageFilter.GaussianBlur(radius=max(1, w // 400)))


def midas_depth(img: Image.Image) -> Image.Image:
    """Depth real con Depth-Anything (transformers). cerca = claro."""
    import torch  # noqa
    from transformers import pipeline

    pipe = pipeline(task="depth-estimation", model="LiheYoung/depth-anything-small-hf")
    depth = np.asarray(pipe(img.convert("RGB"))["depth"], dtype=np.float32)
    depth = (depth - depth.min()) / max(depth.max() - depth.min(), 1e-5)
    return Image.fromarray((depth * 255.0).astype(np.uint8), mode="L")


def main() -> None:
    ap = argparse.ArgumentParser(description="Genera depth.png (cerca = claro).")
    ap.add_argument("photo", nargs="?", default=DEFAULT_PHOTO, help="foto de entrada")
    ap.add_argument("out", nargs="?", help="depth de salida (def: <foto sin ext>-depth.png o depth.png)")
    ap.add_argument("--model", choices=["heuristic", "midas"], default="midas")
    args = ap.parse_args()

    if not os.path.exists(args.photo):
        sys.exit(f"No existe la foto: {args.photo}")
    out = args.out
    if not out:
        d = os.path.dirname(args.photo)
        out = os.path.join(d, "depth.png") if d.endswith("AGS-7") else os.path.splitext(args.photo)[0] + "-depth.png"

    img = Image.open(args.photo)
    if args.model == "midas":
        try:
            depth = midas_depth(img)
            tag = "Depth-Anything"
        except Exception as e:  # noqa
            print(f"[WARN] modelo no disponible ({e}); uso heuristico", file=sys.stderr)
            depth = heuristic_depth(img)
            tag = "heuristico (fallback)"
    else:
        depth = heuristic_depth(img)
        tag = "heuristico"

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    depth.save(out)
    print(f"[OK] {out} ({tag}, {depth.size[0]}x{depth.size[1]})")


if __name__ == "__main__":
    main()
