"use client";

import dynamic from "next/dynamic";

const PlaygroundApp = dynamic(
  () =>
    import("@/components/playground/app").then((mod) => ({
      default: mod.PlaygroundApp,
    })),
  { ssr: false }
);

export default function PlaygroundPage() {
  return <PlaygroundApp />;
}
