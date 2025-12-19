/**
 * Utilities for loading SAM image embeddings
 *
 * For remote SAM inference, embeddings are typically just paths passed to the backend.
 * These utilities are provided for advanced use cases where you need to load
 * embedding data client-side.
 */

import npyjs from 'npyjs';

/**
 * SAM embedding data structure
 */
export interface SamEmbedding {
  /** Float32Array of embedding values */
  data: Float32Array;
  /** Shape of the embedding, typically [1, 256, 64, 64] */
  shape: number[];
}

/**
 * Load precomputed SAM embedding from .npy file
 *
 * SAM image embeddings are typically saved as NumPy arrays with shape [1, 256, 64, 64]
 * and dtype float32.
 *
 * @param url - URL to the .npy file
 * @returns Embedding data as Float32Array with shape info
 *
 * @example
 * ```typescript
 * const embedding = await loadNpyEmbedding('/embeddings/image_001.npy');
 * console.log(embedding.shape); // [1, 256, 64, 64]
 * console.log(embedding.data.length); // 1048576
 * ```
 */
export async function loadNpyEmbedding(url: string): Promise<SamEmbedding> {
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

    return { data, shape };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load .npy embedding from ${url}: ${msg}`);
  }
}

/**
 * Cache for storing loaded embeddings to avoid re-fetching
 */
class EmbeddingCache {
  private cache = new Map<string, SamEmbedding>();
  private maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  get(key: string): SamEmbedding | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: SamEmbedding): void {
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
 * @returns Embedding data
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
): Promise<SamEmbedding> {
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
