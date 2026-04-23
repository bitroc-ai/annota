import React, { useEffect, useMemo, useState } from "react";
import type OpenSeadragon from "openseadragon";
import { AnnotaProvider, AnnotaViewer, Annotator, useAnnotator } from "annota";

const DEMO_IMAGE = "/playground/images/test/0.png";
const DEMO_ANNOTATION_IDS = [
  "hero-ann-primary-roi",
  "hero-ann-secondary-roi",
  "hero-ann-focus-point",
] as const;

function createDemoAnnotations(width: number, height: number) {
  const primaryRoi = {
    x: width * 0.58,
    y: height * 0.52,
    width: width * 0.2,
    height: height * 0.24,
  };

  const secondaryPolygonPoints = [
    { x: width * 0.24, y: height * 0.34 },
    { x: width * 0.4, y: height * 0.28 },
    { x: width * 0.46, y: height * 0.42 },
    { x: width * 0.34, y: height * 0.5 },
    { x: width * 0.22, y: height * 0.46 },
  ];

  const secondaryBounds = {
    minX: Math.min(...secondaryPolygonPoints.map((point) => point.x)),
    minY: Math.min(...secondaryPolygonPoints.map((point) => point.y)),
    maxX: Math.max(...secondaryPolygonPoints.map((point) => point.x)),
    maxY: Math.max(...secondaryPolygonPoints.map((point) => point.y)),
  };

  const focusPoint = {
    x: width * 0.7,
    y: height * 0.4,
  };

  return [
    {
      id: DEMO_ANNOTATION_IDS[0],
      shape: {
        type: "rectangle" as const,
        x: primaryRoi.x,
        y: primaryRoi.y,
        width: primaryRoi.width,
        height: primaryRoi.height,
        bounds: {
          minX: primaryRoi.x,
          minY: primaryRoi.y,
          maxX: primaryRoi.x + primaryRoi.width,
          maxY: primaryRoi.y + primaryRoi.height,
        },
      },
      properties: {
        label: "Tumor ROI",
      },
      style: {
        stroke: "#f97316",
        strokeWidth: 3,
        strokeOpacity: 0.96,
        fill: "#f97316",
        fillOpacity: 0.16,
      },
    },
    {
      id: DEMO_ANNOTATION_IDS[1],
      shape: {
        type: "polygon" as const,
        points: secondaryPolygonPoints,
        bounds: secondaryBounds,
      },
      properties: {
        label: "Stroma region",
      },
      style: {
        stroke: "#22d3ee",
        strokeWidth: 3,
        strokeOpacity: 0.96,
        fill: "#22d3ee",
        fillOpacity: 0.14,
      },
    },
    {
      id: DEMO_ANNOTATION_IDS[2],
      shape: {
        type: "point" as const,
        point: focusPoint,
        bounds: {
          minX: focusPoint.x,
          minY: focusPoint.y,
          maxX: focusPoint.x,
          maxY: focusPoint.y,
        },
      },
      properties: {
        label: "Cell focus",
      },
      style: {
        fill: "#facc15",
        stroke: "#f8fafc",
        strokeWidth: 2,
        fillOpacity: 1,
        strokeOpacity: 1,
      },
    },
  ];
}

function DemoAnnotations({
  viewer,
}: {
  viewer: OpenSeadragon.Viewer | undefined;
}) {
  const annotator = useAnnotator();
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  }>();

  useEffect(() => {
    if (!viewer) return;

    const syncImageSize = () => {
      const image = viewer.world.getItemAt(0);
      if (!image) return;
      const size = image.getContentSize();
      if (!size.x || !size.y) return;
      setImageSize({ width: size.x, height: size.y });
    };

    syncImageSize();
    viewer.addHandler("open", syncImageSize);

    return () => {
      viewer.removeHandler("open", syncImageSize);
    };
  }, [viewer]);

  useEffect(() => {
    if (!annotator || !imageSize) return;

    const existingIds = new Set(
      annotator.getAnnotations().map((annotation) => annotation.id)
    );
    const missingIds = DEMO_ANNOTATION_IDS.filter((id) => !existingIds.has(id));
    if (missingIds.length === 0) return;

    const demoAnnotations = createDemoAnnotations(
      imageSize.width,
      imageSize.height
    );
    annotator.addAnnotations(
      demoAnnotations.filter((annotation) => missingIds.includes(annotation.id))
    );
  }, [annotator, imageSize]);

  return null;
}

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
    <AnnotaProvider>
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
        <AnnotaViewer
          className="h-full w-full"
          options={viewerOptions}
          onViewerReady={(instance) => {
            setViewer(instance);
          }}
        />

        {viewer && (
          <Annotator viewer={viewer}>
            <DemoAnnotations viewer={viewer} />
          </Annotator>
        )}

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
    </AnnotaProvider>
  );
}
