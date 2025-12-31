"use client";

import dynamic from "next/dynamic";

const PolygonExample = dynamic(
  () => import("@/components/examples/polygon").then((m) => m.PolygonExample),
  { ssr: false }
);

/**
 * Standalone polygon example page for iframe embedding.
 * This page can be embedded in documentation using an iframe.
 */
export default function PolygonExamplePage() {
  return <PolygonExample height={typeof window !== 'undefined' ? window.innerHeight : 600} />;
}
