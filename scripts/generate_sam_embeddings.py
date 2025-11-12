#!/usr/bin/env python3
"""
Generate SAM image embeddings (.npy) for a folder of images.

Requirements:
  - Python 3.9+
  - torch, torchvision, numpy, opencv-python
  - segment-anything (pip install git+https://github.com/facebookresearch/segment-anything.git)

Example:
  python scripts/generate_sam_embeddings.py \
    --checkpoint /path/to/sam_vit_h_4b8939.pth \
    --model-type vit_h \
    --images docs/public/playground/images/test \
    --out docs/public/playground/embeddings/test

This writes one .npy per input image, named like the image basename.
The resulting arrays have shape [1, 256, 64, 64] (float32).
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
import torch


def load_sam(model_type: str, checkpoint: str):
    """Load SAM without requiring a pip install.

    If the Python package is not available, this function will try to
    clone the GitHub repository locally and import from the source tree.
    This avoids network access to PyPI (which can fail in locked envs).
    """
    try:
        from segment_anything import sam_model_registry, SamPredictor  # type: ignore
    except Exception:
        # Fallback: clone from GitHub into a local cache and import from there
        import sys
        import subprocess
        from pathlib import Path

        cache_dir = Path(".cache/segment-anything")
        src_dir = cache_dir / "segment-anything"
        try:
            cache_dir.mkdir(parents=True, exist_ok=True)
            if not src_dir.exists():
                subprocess.check_call([
                    "git",
                    "clone",
                    "--depth",
                    "1",
                    "https://github.com/facebookresearch/segment-anything.git",
                    str(src_dir),
                ])
            sys.path.insert(0, str(src_dir))
            from segment_anything import sam_model_registry, SamPredictor  # type: ignore
        except Exception as e:
            raise SystemExit(
                "Failed to import segment_anything. Either install via pip or allow git clone.\n"
                f"Error: {e}"
            ) from e

    if model_type not in ("vit_h", "vit_l", "vit_b"):
        raise SystemExit("--model-type must be one of: vit_h, vit_l, vit_b")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam = sam_model_registry[model_type](checkpoint=checkpoint)
    sam.to(device=device)
    predictor = SamPredictor(sam)
    return predictor, device


def iter_images(path: Path) -> Iterable[Path]:
    if path.is_file():
        yield path
        return
    exts = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
    for p in sorted(path.rglob("*")):
        if p.suffix.lower() in exts:
            yield p


def main():
    ap = argparse.ArgumentParser(description="Generate SAM image embeddings (.npy)")
    ap.add_argument("--checkpoint", required=True, help="Path to SAM .pth checkpoint")
    ap.add_argument("--model-type", required=True, choices=["vit_h", "vit_l", "vit_b"], help="Backbone type")
    ap.add_argument("--images", required=True, help="Image file or directory")
    ap.add_argument("--out", required=True, help="Output directory for .npy embeddings")
    args = ap.parse_args()

    images_path = Path(args.images)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    predictor, device = load_sam(args.model_type, args.checkpoint)

    count = 0
    for img_path in iter_images(images_path):
        img_bgr = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
        if img_bgr is None:
            print(f"[WARN] Skipping unreadable image: {img_path}")
            continue
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        predictor.set_image(img_rgb)
        with torch.no_grad():
            embedding = predictor.get_image_embedding()  # [1,256,64,64]
        npy = embedding.detach().cpu().numpy().astype(np.float32)

        out_file = out_dir / (img_path.stem + ".npy")
        np.save(out_file, npy)

        # Write sidecar metadata for verification at runtime
        try:
            import json, hashlib
            with open(img_path, 'rb') as f:
                img_bytes = f.read()
            sha = hashlib.sha256(img_bytes).hexdigest()
            meta = {
                "image": str(img_path.name),
                "width": int(img_rgb.shape[1]),
                "height": int(img_rgb.shape[0]),
                "sha256": sha,
                "model_type": args.model_type,
                "checkpoint": str(Path(args.checkpoint).name),
            }
            with open(out_dir / (img_path.stem + ".json"), 'w') as jf:
                json.dump(meta, jf, indent=2)
        except Exception as e:
            print(f"[WARN] Failed writing metadata json for {img_path.name}: {e}")
        count += 1
        print(f"[OK] {img_path.name} -> {out_file}")

    print(f"Done. Wrote {count} embedding(s) to {out_dir}")


if __name__ == "__main__":
    main()
