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

// Mintlify-inspired theme overrides - maximum specificity
const mintlifyStyles = `
  /* Override Nextra's primary color - multiple selectors for specificity */
  :root, html, body, :host {
    --nextra-primary-hue: 158deg !important;
    --nextra-primary-saturation: 64% !important;
    --nextra-primary-lightness: 52% !important;
  }
  html.dark, html.dark body, .dark, body.dark {
    --nextra-primary-hue: 160deg !important;
    --nextra-primary-saturation: 84% !important;
    --nextra-primary-lightness: 45% !important;
  }
  
  /* NUCLEAR: Override ALL backgrounds on sidebar elements */
  html body aside,
  html body aside *,
  html body aside > div,
  html body [data-nextra-sidebar],
  html body [data-nextra-sidebar] * {
    background-color: #0f0f0f !important;
    background: #0f0f0f !important;
  }
  html body aside {
    border-right: 1px solid #262626 !important;
  }
  html.dark body aside,
  html.dark body aside *,
  html.dark body aside > div {
    background-color: #0a0a0a !important;
    background: #0a0a0a !important;
  }
  
  /* Force sidebar link colors */
  html body aside a,
  html body aside a span,
  html body [data-nextra-sidebar] a {
    color: #a3a3a3 !important;
  }
  html body aside a:hover,
  html body aside a:hover span {
    color: #ffffff !important;
    background: rgba(255,255,255,0.05) !important;
  }
  
  /* Active link - mint green */
  html body aside a[aria-current="page"],
  html body aside a[aria-current="page"] span,
  html body aside li.active a,
  html body aside li.active a span {
    color: #10b981 !important;
    background: rgba(16,185,129,0.1) !important;
  }
  html.dark body aside a[aria-current="page"],
  html.dark body aside a[aria-current="page"] span {
    color: #34d399 !important;
    background: rgba(52,211,153,0.1) !important;
  }
  
  /* Override x: prefixed classes for primary colors */
  [class*="text-primary"],
  [class*="x:text-primary"] {
    color: #10b981 !important;
  }
  .dark [class*="text-primary"],
  .dark [class*="x:text-primary"] {
    color: #34d399 !important;
  }
  
  [class*="bg-primary"],
  [class*="x:bg-primary"] {
    background-color: rgba(16,185,129,0.1) !important;
  }
  .dark [class*="bg-primary"],
  .dark [class*="x:bg-primary"] {
    background-color: rgba(52,211,153,0.1) !important;
  }
  
  /* Content links */
  html body main a:not(nav a):not(aside a) {
    color: #10b981 !important;
  }
  html.dark body main a:not(nav a):not(aside a) {
    color: #34d399 !important;
  }
  
  /* List markers */
  html body main li::marker {
    color: #10b981 !important;
  }
  html.dark body main li::marker {
    color: #34d399 !important;
  }
  
  /* Inline code */
  html body code:not(pre code) {
    background: rgba(16,185,129,0.1) !important;
    color: #047857 !important;
  }
  html.dark body code:not(pre code) {
    background: rgba(52,211,153,0.15) !important;
    color: #6ee7b7 !important;
  }
  
  /* Sidebar headers */
  html body aside h3,
  html body aside button > span:first-child {
    color: #525252 !important;
  }
`;

/**
 * Root layout - minimal HTML structure only.
 * Route-specific layouts are defined in route groups:
 * - (docs) for documentation pages with sidebar/navigation
 * - (bare) for standalone pages like iframe examples
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: mintlifyStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
