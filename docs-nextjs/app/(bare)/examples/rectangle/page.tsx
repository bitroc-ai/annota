"use client";

import dynamic from "next/dynamic";

const RectangleExample = dynamic(
  () => import("@/components/examples/rectangle").then((m) => m.RectangleExample),
  { ssr: false }
);

/**
 * Standalone rectangle example page for iframe embedding.
 * This page can be embedded in documentation using an iframe.
 */
export default function RectangleExamplePage() {
  return <RectangleExample height={typeof window !== 'undefined' ? window.innerHeight : 600} />;
}
