import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Annota - High-Performance Annotation Framework",
  description: "A high-performance annotation framework for whole slide imaging and digital pathology applications",
  icons: {
    icon: "/favicon.svg",
  },
};

/**
 * Root layout - minimal HTML structure only.
 * Route-specific layouts are defined in route groups:
 * - (docs) for documentation pages with sidebar/navigation
 * - (bare) for standalone pages like iframe examples
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
