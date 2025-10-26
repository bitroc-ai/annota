import type { ReactNode } from "react";

/**
 * Minimal layout for bare pages (like example iframes).
 * Renders pages without any navigation, sidebar, or other documentation chrome.
 * Perfect for embedding in iframes.
 */
export default function BareLayout({ children }: { children: ReactNode }) {
  return <div className="w-full h-screen">{children}</div>;
}
