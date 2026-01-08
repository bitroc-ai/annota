"use client";

import dynamic from "next/dynamic";

const PointsExample = dynamic(
  () => import("@/components/examples/points").then((m) => m.PointsExample),
  { ssr: false }
);

/**
 * Standalone points example page for iframe embedding.
 * This page can be embedded in documentation using an iframe.
 */
export default function PointsExamplePage() {
  return <PointsExample height={typeof window !== 'undefined' ? window.innerHeight : 600} />;
}
