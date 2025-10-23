'use client';

import dynamic from 'next/dynamic';

const DemoApp = dynamic(
  () => import('@/components/demo/demo-app').then(mod => ({ default: mod.DemoApp })),
  { ssr: false }
);

export default function DemoPage() {
  return <DemoApp />;
}
