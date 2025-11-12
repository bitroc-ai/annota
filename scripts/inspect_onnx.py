#!/usr/bin/env python3
"""
Inspect an ONNX model and print useful identifiers.

Usage:
  python scripts/inspect_onnx.py path/to/model.onnx [--details]

What it prints:
  - Producer name/version and IR/opset
  - Custom metadata properties (model_type, etc.)
  - Inputs/outputs with tensor shapes
  - Node op histogram and parameter counts
  - A short fingerprint (sha256 over initializers' bytes)

Notes:
  - This does not tell you definitively whether the decoder came from
    a specific checkpoint (vit_b vs vit_h), because the decoder graphs
    are often structurally identical. If the exporter added metadata,
    it will show up here.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from collections import Counter
from typing import Iterable


def _fail(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description="Inspect an ONNX model")
    ap.add_argument("model", help="Path to .onnx file")
    ap.add_argument("--details", action="store_true", help="Print more verbose layer info")
    args = ap.parse_args()

    try:
        import onnx  # type: ignore
        from onnx import numpy_helper  # type: ignore
    except Exception:
        _fail(
            "onnx package not found. Install with\n  pip install onnx\n"
        )

    model = onnx.load(args.model)

    print("== Model Info ==")
    print("Path:", args.model)
    print("Producer:", getattr(model, "producer_name", ""), getattr(model, "producer_version", ""))
    print("IR version:", getattr(model, "ir_version", "?"))
    # Try to get highest opset
    opsets = getattr(model, "opset_import", [])
    if opsets:
        opset_str = ", ".join(f"{o.domain or 'ai.onnx'}:{o.version}" for o in opsets)
    else:
        opset_str = "?"
    print("Opset(s):", opset_str)

    if getattr(model, "metadata_props", None):
        print("\n== Metadata Props ==")
        for p in model.metadata_props:
            print(f"{p.key}: {p.value}")

    print("\n== IO Tensors ==")
    def _shape_str(t):
        if not t.type.tensor_type.shape.dim:
            return "[]"
        dims = []
        for d in t.type.tensor_type.shape.dim:
            if d.dim_param:
                dims.append(d.dim_param)
            else:
                dims.append(str(d.dim_value or "?"))
        return "[" + ", ".join(dims) + "]"

    for i in model.graph.input:
        el = i.type.tensor_type.elem_type
        print(f"Input:  {i.name:30s} shape={_shape_str(i)} dtype={el}")
    for o in model.graph.output:
        el = o.type.tensor_type.elem_type
        print(f"Output: {o.name:30s} shape={_shape_str(o)} dtype={el}")

    print("\n== Graph Stats ==")
    hist = Counter(n.op_type for n in model.graph.node)
    total_nodes = sum(hist.values())
    print("Nodes:", total_nodes)
    for k, v in sorted(hist.items(), key=lambda kv: (-kv[1], kv[0]))[:20]:
        print(f"  {k:20s} x {v}")

    # Parameter stats + fingerprint
    sha = hashlib.sha256()
    param_count = 0
    param_elems = 0
    for init in model.graph.initializer:
        arr = numpy_helper.to_array(init)
        param_count += 1
        param_elems += arr.size
        sha.update(arr.tobytes())
    print("Parameters:", param_count, f"({param_elems} elements)")
    print("Fingerprint (sha256 first 12):", sha.hexdigest()[:12])

    if args.details:
        print("\n== First 10 initializers ==")
        for init in list(model.graph.initializer)[:10]:
            arr = numpy_helper.to_array(init)
            print(f"  {init.name:30s} shape={arr.shape} dtype={arr.dtype}")


if __name__ == "__main__":
    main()

