/**
 * Utilities for loading and managing SAM image embeddings
 */

import * as ort from 'onnxruntime-web';
import npyjs from 'npyjs';

/**
 * Load precomputed SAM embedding from .npy file
 *
 * SAM image embeddings are typically saved as NumPy arrays with shape [1, 256, 64, 64]
 * and dtype float32.
 *
 * @param url - URL to the .npy file
 * @returns ONNX tensor containing the embedding
 *
 * @example
 * ```typescript
 * const embedding = await loadNpyEmbedding('/embeddings/image_001.npy');
 * ```
 */
export async function loadNpyEmbedding(url: string): Promise<ort.Tensor> {
  try {
    // Let npyjs handle fetching + parsing directly (robust to content-type, gzip)
    const npyLoader = new npyjs();
    const npyData: any = await npyLoader.load(url);
    const data = npyData.data as Float32Array;
    const shape = npyData.shape as number[];

    // Validate shape [1, 256, 64, 64]
    if (
      shape.length !== 4 ||
      shape[0] !== 1 ||
      shape[1] !== 256 ||
      shape[2] !== 64 ||
      shape[3] !== 64
    ) {
      throw new Error(
        `Invalid embedding shape: expected [1, 256, 64, 64], got [${shape.join(', ')}]`
      );
    }

    // Validate data type (accept common float32 codes from npyjs)
    const dt = String(npyData.dtype).toLowerCase();
    const okDtypes = new Set(['float32', '<f4', '>f4', 'f4']);
    if (!okDtypes.has(dt)) {
      throw new Error(`Invalid embedding dtype: expected float32, got ${npyData.dtype}`);
    }

    // Create ONNX tensor
    return new ort.Tensor('float32', data, shape);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load .npy embedding from ${url}: ${msg}`);
  }
}

/**
 * Create a dummy embedding for testing
 *
 * Generates a random embedding tensor with the correct shape [1, 256, 64, 64].
 * This is useful for testing the SAM tool without needing actual precomputed embeddings.
 *
 * **Note**: Dummy embeddings will produce random/poor segmentation results.
 * Use real embeddings for production.
 *
 * @returns ONNX tensor with random values
 *
 * @example
 * ```typescript
 * const dummyEmbedding = createDummyEmbedding();
 * const samTool = new SamTool({
 *   decoderModelUrl: '/models/sam_decoder.onnx',
 *   embedding: dummyEmbedding,
 *   imageWidth: 1024,
 *   imageHeight: 1024
 * });
 * ```
 */
export function createDummyEmbedding(): ort.Tensor {
  const shape = [1, 256, 64, 64];
  const size = shape.reduce((a, b) => a * b, 1);
  const data = new Float32Array(size);

  // Fill with random values (mean 0, std 1)
  for (let i = 0; i < size; i++) {
    data[i] = (Math.random() - 0.5) * 2;
  }

  return new ort.Tensor('float32', data, shape);
}

/**
 * Load embedding from raw Float32Array data
 *
 * Useful when embeddings are stored in custom formats or generated dynamically.
 *
 * @param data - Float32Array containing embedding data
 * @param shape - Shape of the tensor (default: [1, 256, 64, 64])
 * @returns ONNX tensor
 *
 * @example
 * ```typescript
 * const data = new Float32Array(1 * 256 * 64 * 64);
 * // ... fill data ...
 * const embedding = loadRawEmbedding(data);
 * ```
 */
export function loadRawEmbedding(
  data: Float32Array,
  shape: number[] = [1, 256, 64, 64]
): ort.Tensor {
  const expectedSize = shape.reduce((a, b) => a * b, 1);

  if (data.length !== expectedSize) {
    throw new Error(
      `Data size mismatch: expected ${expectedSize}, got ${data.length}`
    );
  }

  return new ort.Tensor('float32', data, shape);
}

/**
 * Cache for storing loaded embeddings to avoid re-fetching
 */
class EmbeddingCache {
  private cache = new Map<string, ort.Tensor>();
  private maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  get(key: string): ort.Tensor | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: ort.Tensor): void {
    // Simple LRU: if cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Global embedding cache instance
 */
export const embeddingCache = new EmbeddingCache(10);

/**
 * Load embedding with caching
 *
 * Automatically caches loaded embeddings to avoid re-fetching the same file.
 *
 * @param url - URL to the .npy file
 * @param useCache - Whether to use cache (default: true)
 * @returns ONNX tensor
 *
 * @example
 * ```typescript
 * // First call: fetches from network
 * const embedding1 = await loadNpyEmbeddingCached('/embeddings/img1.npy');
 *
 * // Second call: returns from cache
 * const embedding2 = await loadNpyEmbeddingCached('/embeddings/img1.npy');
 * ```
 */
export async function loadNpyEmbeddingCached(
  url: string,
  useCache = true
): Promise<ort.Tensor> {
  if (useCache && embeddingCache.has(url)) {
    const cached = embeddingCache.get(url);
    if (cached) {
      return cached;
    }
  }

  const embedding = await loadNpyEmbedding(url);

  if (useCache) {
    embeddingCache.set(url, embedding);
  }

  return embedding;
}
