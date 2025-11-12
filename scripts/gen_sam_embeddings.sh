#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper around the Python generator.
# Uses `uv run` with required deps so you don't need a local venv.
#
# Usage:
#   bash scripts/gen_sam_embeddings.sh -m vit_b
#   bash scripts/gen_sam_embeddings.sh -m vit_h -i docs/public/playground/images/test -o docs/public/playground/embeddings/test
#   # or, explicitly set checkpoint:
#   bash scripts/gen_sam_embeddings.sh -m vit_b -c docs/public/models/sam_vit_b_01ec64.pth
#
# Defaults:
#   - images: docs/public/playground/images/test
#   - out:    docs/public/playground/embeddings/test
#   - checkpoint (vit_b): docs/public/models/sam_vit_b_01ec64.pth
#   - checkpoint (vit_h): docs/public/models/sam_vit_h_4b8939.pth

MODEL=""
IMAGES="docs/public/playground/images/test"
OUT="docs/public/playground/embeddings/test"
CKPT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--model)
      MODEL="$2"; shift 2;;
    -i|--images)
      IMAGES="$2"; shift 2;;
    -o|--out)
      OUT="$2"; shift 2;;
    -c|--checkpoint)
      CKPT="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 -m vit_b|vit_h [-i <images_dir>] [-o <out_dir>] [-c <checkpoint>]"; exit 0;;
    *)
      echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -z "$MODEL" ]]; then
  echo "Error: --model (-m) is required (vit_b or vit_h)" >&2
  exit 1
fi

case "$MODEL" in
  vit_b)
    CKPT_DEFAULT="docs/public/models/sam_vit_b_01ec64.pth";;
  vit_h)
    CKPT_DEFAULT="docs/public/models/sam_vit_h_4b8939.pth";;
  *)
    echo "Error: model must be vit_b or vit_h" >&2; exit 1;;
esac

if [[ -z "${CKPT}" ]]; then
  CKPT="$CKPT_DEFAULT"
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "Error: 'uv' not found. Install from https://github.com/astral-sh/uv" >&2
  exit 1
fi

echo "Generating SAM embeddings"
echo "  model      : $MODEL"
echo "  checkpoint : $CKPT"
echo "  images     : $IMAGES"
echo "  out        : $OUT"

# Limit CPU threads for stability on laptops (optional)
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-4}"
export MKL_NUM_THREADS="${MKL_NUM_THREADS:-4}"

uv run --python 3.11 \
  --with numpy --with opencv-python --with torch --with torchvision -- \
  python scripts/generate_sam_embeddings.py \
    --checkpoint "$CKPT" \
    --model-type "$MODEL" \
    --images "$IMAGES" \
    --out "$OUT"

echo "Done. Embeddings written to $OUT"

