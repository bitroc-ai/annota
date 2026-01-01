import OpenSeadragon from "openseadragon";
import type { ToolHandler } from "../tools/types";
import { getAnnotator } from "./annotator";

interface ToolOptions {
  viewer: () => OpenSeadragon.Viewer | undefined;
  handler: () => ToolHandler | null;
  enabled: () => boolean;
}

export function tool({ viewer, handler, enabled }: ToolOptions): void {
  const getAnnotatorFn = getAnnotator();
  let initialized = false;

  $effect(() => {
    const v = viewer();
    const h = handler();
    const e = enabled();
    const annotator = getAnnotatorFn();

    if (!h || !v || !annotator) {
      if (initialized && h) {
        h.destroy();
        initialized = false;
      }
      return;
    }

    if (e && !initialized) {
      // init usually takes viewer and annotator.
      // Check types: ToolHandler.init(viewer, annotator)
      h.init(v, annotator);
      initialized = true;
    } else if (!e && initialized) {
      h.destroy();
      initialized = false;
    }

    h.enabled = e;

    return () => {
      if (initialized && h) {
        h.destroy();
        initialized = false;
      }
    };
  });
}
