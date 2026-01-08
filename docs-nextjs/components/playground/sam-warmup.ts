/**
 * SAM API Warm-up Utilities
 *
 * Provides functions to warm up the SAM ONNX model on the server,
 * reducing latency for the first prediction request.
 */

export interface SamApiStatus {
  status: "ready" | "loading" | "unavailable";
  modelPath?: string;
  loadTimeMs?: number;
  error?: string;
}

/**
 * Check the current status of the SAM API
 */
export async function checkSamApiStatus(): Promise<SamApiStatus> {
  try {
    const response = await fetch("/api/sam");
    return await response.json();
  } catch (error) {
    return {
      status: "unavailable",
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Warm up the SAM API by triggering model initialization
 *
 * This is a fire-and-forget function that starts the warm-up process.
 * Use `waitForSamReady` if you need to wait for completion.
 */
export function warmUpSamApi(): void {
  fetch("/api/sam")
    .then((r) => r.json())
    .then((status: SamApiStatus) => {
      if (status.status === "ready") {
        console.log("[SAM] API ready", status.loadTimeMs ? `(${status.loadTimeMs}ms)` : "");
      } else if (status.status === "loading") {
        console.log("[SAM] API loading model...");
      } else {
        console.warn("[SAM] API unavailable:", status.error);
      }
    })
    .catch((err) => {
      console.warn("[SAM] Failed to warm up API:", err.message);
    });
}

/**
 * Wait for the SAM API to be ready
 *
 * Polls the API until the model is loaded or timeout is reached.
 *
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 30000)
 * @param pollIntervalMs - Interval between polls in milliseconds (default: 500)
 * @returns Promise that resolves to true if ready, false if timed out or unavailable
 *
 * @example
 * ```typescript
 * const ready = await waitForSamReady();
 * if (ready) {
 *   console.log("SAM model is ready!");
 * } else {
 *   console.log("SAM model failed to load");
 * }
 * ```
 */
export async function waitForSamReady(
  maxWaitMs = 30000,
  pollIntervalMs = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkSamApiStatus();

    if (status.status === "ready") {
      return true;
    }

    if (status.status === "unavailable") {
      console.warn("[SAM] API unavailable:", status.error);
      return false;
    }

    // status === "loading", wait and retry
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.warn("[SAM] Timed out waiting for API to be ready");
  return false;
}

/**
 * React hook-friendly warm-up function
 *
 * Call this in a useEffect to warm up the SAM API when the component mounts.
 * Returns a cleanup function that can be used to cancel pending requests.
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   return initSamWarmup((ready) => {
 *     if (ready) setSamReady(true);
 *   });
 * }, []);
 * ```
 */
export function initSamWarmup(
  onReady?: (ready: boolean) => void
): () => void {
  let cancelled = false;

  (async () => {
    const ready = await waitForSamReady();
    if (!cancelled && onReady) {
      onReady(ready);
    }
  })();

  return () => {
    cancelled = true;
  };
}
