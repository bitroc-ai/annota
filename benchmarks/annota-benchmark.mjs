import { performance } from 'node:perf_hooks';
import { createAnnotationStore } from '../dist/core.js';

const ci = process.argv.includes('--ci');
const sizes = ci ? [1000, 10000] : [1000, 10000, 50000];

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

for (const size of sizes) {
  const random = seeded(0xA6607A + size);
  const annotations = Array.from({ length: size }, (_, index) => {
    const x = random() * 100000;
    const y = random() * 100000;
    return {
      id: `benchmark-${index}`,
      shape: { type: 'rectangle', x, y, width: 20, height: 20 },
      layerId: index % 2 === 0 ? 'even' : 'odd',
      properties: { bucket: index % 10 },
    };
  });
  const store = createAnnotationStore();
  const started = performance.now();
  store.addAll(annotations, { mode: 'insert' });
  const loadMs = performance.now() - started;

  const querySamples = [];
  for (let index = 0; index < 100; index++) {
    const x = random() * 100000;
    const y = random() * 100000;
    const queryStarted = performance.now();
    store.search({ minX: x, minY: y, maxX: x + 1000, maxY: y + 1000 });
    querySamples.push(performance.now() - queryStarted);
  }

  const updateStarted = performance.now();
  for (let index = 0; index < Math.min(size, 1000); index++) {
    const annotation = store.get(`benchmark-${index}`);
    store.update(annotation.id, {
      ...annotation,
      shape: { ...annotation.shape, x: annotation.shape.x + 1 },
    });
  }
  const updateMs = performance.now() - updateStarted;
  const heapMb = process.memoryUsage().heapUsed / 1024 / 1024;
  const result = {
    size,
    loadMs: Number(loadMs.toFixed(2)),
    queryMeanMs: Number(
      (querySamples.reduce((sum, value) => sum + value, 0) / querySamples.length).toFixed(3)
    ),
    queryP95Ms: Number(percentile(querySamples, 0.95).toFixed(3)),
    updateMs: Number(updateMs.toFixed(2)),
    heapMb: Number(heapMb.toFixed(1)),
  };
  console.log(JSON.stringify(result));

  if (ci && (loadMs > 15000 || result.queryP95Ms > 100 || updateMs > 15000)) {
    throw new Error(`Benchmark regression threshold exceeded for ${size} annotations`);
  }
}
