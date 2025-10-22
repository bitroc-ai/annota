'use client';

import dynamic from 'next/dynamic';

const DynamicDemo = dynamic(
  () => import('@/components/demo-app').then(mod => ({ default: mod.DemoApp })),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Annota Demo...</div>
          <div className="text-sm text-neutral-400">Initializing viewer</div>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <DynamicDemo />;
}
