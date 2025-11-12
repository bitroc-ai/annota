#!/usr/bin/env python3
"""
Create a simple synthetic PNG with solid filled circles for SAM testing.

Default output: docs/public/playground/images/test/synthetic.png

Usage:
  uv run --python 3.11 --with numpy --with opencv-python -- \
    python scripts/make_synthetic_image.py \
      --width 640 --height 480 --out docs/public/playground/images/test/synthetic.png

It also saves a JSON file next to the image with suggested positive
click points (circle centers) for quick decoder tests.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import random
import cv2
import numpy as np


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=480)
    ap.add_argument("--out", type=str, default="docs/public/playground/images/test/synthetic.png")
    ap.add_argument("--circles", type=int, default=5, help="number of circles")
    args = ap.parse_args()

    w, h = args.width, args.height
    img = np.full((h, w, 3), 240, dtype=np.uint8)  # light gray background

    rng = random.Random(42)
    points = []
    for i in range(args.circles):
        r = rng.randint(max(10, min(w, h)//20), max(20, min(w, h)//10))
        cx = rng.randint(r + 5, w - r - 5)
        cy = rng.randint(r + 5, h - r - 5)
        color = (rng.randint(0, 255), rng.randint(0, 255), rng.randint(0, 255))
        cv2.circle(img, (cx, cy), r, color, thickness=-1, lineType=cv2.LINE_AA)
        points.append({"x": float(cx), "y": float(cy), "label": 1})

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), img)

    with open(out_path.with_suffix(".json"), "w") as f:
        json.dump({"width": w, "height": h, "clicks": points}, f, indent=2)

    print(f"[OK] Wrote synthetic image: {out_path}")
    print(f"[OK] Suggested clicks: {out_path.with_suffix('.json')}")


if __name__ == "__main__":
    main()

