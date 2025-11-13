import { ReactNode } from "react";

interface BrowserWindowProps {
  /** Content to display inside the browser window */
  children: ReactNode;
  /** Optional title to display in the window header */
  title?: string;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Mock browser window component with window controls and title bar.
 * Provides a polished frame for demos and code examples.
 */
export function BrowserWindow({
  children,
  title,
  className = "",
}: BrowserWindowProps) {
  return (
    <div
      className={`rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-900 ${className}`}
    >
      {/* Window Header */}
      <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {/* Window Controls */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        {/* Title */}
        {title && (
          <div className="flex-1 text-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {title}
            </span>
          </div>
        )}
      </div>

      {/* Window Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
