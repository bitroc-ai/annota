# Annota benchmark

`pnpm build && pnpm benchmark` runs a fixed-seed 1k/10k/50k workload. It records normalized
initial load time, 100 spatial-query mean/P95 samples, 1,000 updates, and Node heap usage.

`pnpm benchmark:ci` runs 1k/10k with deliberately wide regression limits. Browser frame time,
long tasks, GPU memory, pan, zoom, selection, and destruction depend on a fixed browser/device
runner and are not represented as universal FPS claims. Publish hardware results only with the
browser version, device, viewport, dataset seed, and raw output.
