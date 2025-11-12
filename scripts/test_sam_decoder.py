#!/usr/bin/env python3
"""
Run the SAM ONNX decoder against a precomputed embedding and clicks,
and write the predicted 256x256 mask and a version scaled to the image size.

Usage (ViT-B example):
  uv run --python 3.11 --with numpy --with onnxruntime -- 
    python scripts/test_sam_decoder.py \
      --decoder docs/public/models/sam_onnx_quantized_vit_b.onnx \
      --embedding docs/public/playground/embeddings/test/synthetic.npy \
      --image-width 640 --image-height 480 \
      --click 320,240:1 --out out/mask

This script mirrors the inputs our TS code builds in SamOnnxModel.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import numpy as np
import onnxruntime as ort
from PIL import Image


def parse_click(s: str) -> tuple[float, float, int]:
    # format: x,y[:label] where label=1 (pos) or 0 (neg)
    if ":" in s:
        xy, lbl = s.split(":", 1)
        label = int(lbl)
    else:
        xy, label = s, 1
    x_str, y_str = xy.split(",")
    return float(x_str), float(y_str), label


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--decoder", required=True)
    ap.add_argument("--embedding", required=True)
    ap.add_argument("--image-width", type=int, required=True)
    ap.add_argument("--image-height", type=int, required=True)
    ap.add_argument("--click", action="append", default=[], help="x,y[:label]")
    ap.add_argument("--out", required=True, help="output path prefix")
    args = ap.parse_args()

    # Load
    sess = ort.InferenceSession(args.decoder, providers=["CPUExecutionProvider"])
    emb = np.load(args.embedding).astype(np.float32)

    # Prepare point tensors with uniform scaling (longest side -> 1024)
    sam_scale = 1024.0 / max(args.image_width, args.image_height)
    clicks = [parse_click(c) for c in args.click]
    if not clicks:
        # default center click
        clicks = [(args.image_width/2, args.image_height/2, 1)]

    point_coords = np.zeros((1, len(clicks) + 1, 2), dtype=np.float32)
    point_labels = np.zeros((1, len(clicks) + 1), dtype=np.float32)
    for i, (x, y, lbl) in enumerate(clicks):
        point_coords[0, i, 0] = x * sam_scale
        point_coords[0, i, 1] = y * sam_scale
        point_labels[0, i] = float(lbl)
    point_labels[0, len(clicks)] = -1.0  # padding point

    mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
    has_mask_input = np.array([0], dtype=np.float32)
    orig_im_size = np.array([args.image_height, args.image_width], dtype=np.float32)

    feeds = {
        "image_embeddings": emb,
        "point_coords": point_coords,
        "point_labels": point_labels,
        "mask_input": mask_input,
        "has_mask_input": has_mask_input,
        "orig_im_size": orig_im_size,
    }

    out = sess.run(None, feeds)
    # Try common output names
    # Usually: [masks, iou_predictions, low_res_masks]
    if isinstance(out, list) and len(out) >= 1:
        masks = out[0]
    else:
        masks = sess.run(["masks"], feeds)[0]

    mask = masks[0, 0]  # [H=256, W=256]
    binary = (mask > 0.0).astype(np.uint8) * 255

    out_prefix = Path(args.out)
    out_prefix.parent.mkdir(parents=True, exist_ok=True)

    # Save 256x256 mask
    Image.fromarray(binary).save(out_prefix.with_suffix(".png"))

    # Save scaled-to-image mask
    img_mask = Image.fromarray(binary).resize((args.image_width, args.image_height), Image.NEAREST)
    img_mask.save(out_prefix.with_suffix(".full.png"))

    print(f"[OK] Saved: {out_prefix.with_suffix('.png')} and {out_prefix.with_suffix('.full.png')}")


if __name__ == "__main__":
    main()

