import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="system"
      style={{
        '--sonner-color-success': '#10b981',
        '--sonner-color-error': '#ef4444',
        '--sonner-color-info': '#3b82f6',
        '--sonner-color-warning': '#f59e0b',
      } as React.CSSProperties}
    />
  );
};
