/**
 * SAM API Warm-up Utilities
 */

export interface SamApiStatus {
  status: "ready" | "loading" | "unavailable";
  modelPath?: string;
  loadTimeMs?: number;
  error?: string;
}

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

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.warn("[SAM] Timed out waiting for API to be ready");
  return false;
}

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
