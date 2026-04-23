import React, { useEffect, useMemo, useState } from "react";
import type OpenSeadragon from "openseadragon";
import { AnnotaViewer } from "annota";

const DEMO_IMAGE = "/playground/images/test/0.png";

export default function HeroDemo() {
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer>();

  const viewerOptions = useMemo(
    () => ({
      tileSources: {
        type: "image" as const,
        url: DEMO_IMAGE,
      },
      showNavigationControl: false,
      visibilityRatio: 1,
      constrainDuringPan: true,
      homeFillsViewer: false,
      minZoomImageRatio: 1,
      minZoomLevel: 1,
      maxZoomLevel: 8,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: false,
        scrollToZoom: true,
      },
      prefixUrl:
        "https://cdn.jsdelivr.net/npm/openseadragon@4/build/openseadragon/images/",
    }),
    []
  );

  useEffect(() => {
    if (!viewer) return;

    const enforceConstraints = () => {
      if (!viewer.viewport) return;
      viewer.viewport.applyConstraints(true);
    };

    viewer.addHandler("zoom", enforceConstraints);
    viewer.addHandler("pan", enforceConstraints);
    viewer.addHandler("animation-finish", enforceConstraints);
    viewer.addHandler("open", enforceConstraints);
    viewer.addHandler("resize", enforceConstraints);
    viewer.viewport.goHome(true);

    return () => {
      viewer.removeHandler("zoom", enforceConstraints);
      viewer.removeHandler("pan", enforceConstraints);
      viewer.removeHandler("animation-finish", enforceConstraints);
      viewer.removeHandler("open", enforceConstraints);
      viewer.removeHandler("resize", enforceConstraints);
    };
  }, [viewer]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <AnnotaViewer
        className="h-full w-full"
        options={viewerOptions}
        onViewerReady={(instance) => {
          setViewer(instance);
        }}
      />

      <button
        type="button"
        aria-label="Reset demo view"
        onClick={() => viewer?.viewport.goHome(true)}
        style={{
          position: "absolute",
          top: "0.55rem",
          right: "0.55rem",
          zIndex: 2,
          borderRadius: "0.4rem",
          border: "1px solid rgba(148, 163, 184, 0.42)",
          background: "rgba(255, 255, 255, 0.78)",
          color: "#334155",
          fontSize: "0.68rem",
          fontWeight: 650,
          lineHeight: 1.2,
          padding: "0.24rem 0.42rem",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        Reset View
      </button>
    </div>
  );
}
