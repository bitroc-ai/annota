Models directory
================

This folder is used at runtime by the docs/playground to host model files for SAM (Segment Anything).

What to put here
- ONNX decoders (small, safe to commit):
  - Example: `sam_onnx_quantized_example.onnx`
  - Optional alternates: `sam_vit_b_decoder.onnx`, `sam_vit_h_decoder.onnx`

- PyTorch checkpoints (HUGE, DO NOT COMMIT):
  - Example: `sam_vit_b_01ec64.pth`, `sam_vit_h_4b8939.pth`
  - These are used only to generate image embeddings offline (or server‑side).
  - They are ignored by git via the root `.gitignore` rule `**/*.pth`.

Generating embeddings
- Use the helper script to produce `[1, 256, 64, 64]` float32 `.npy` embeddings:

  ```bash
  # Quick wrapper (uses `uv run` with deps)
  bash scripts/gen_sam_embeddings.sh -m vit_b

  # Or specify inputs/outputs explicitly
  bash scripts/gen_sam_embeddings.sh -m vit_h \
    -i docs/public/playground/images/test \
    -o docs/public/playground/embeddings/test

  # If you prefer Python directly:
  uv run --python 3.11 --with numpy --with opencv-python --with torch --with torchvision -- \
    python scripts/generate_sam_embeddings.py \
      --checkpoint docs/public/models/sam_vit_b_01ec64.pth \
      --model-type vit_b \
      --images docs/public/playground/images/test \
      --out docs/public/playground/embeddings/test
  ```

Important: Backbone must match
- The decoder backbone (B/L/H) must match the checkpoint used to produce the embeddings.
- If you use a ViT‑B decoder, generate ViT‑B embeddings; mixing B/H will produce unusable masks.

Notes
- ONNX decoders are relatively small and can be versioned.
- `.pth` files can be several hundred MB to multiple GB; they are intentionally ignored.
