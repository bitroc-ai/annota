import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",

          // Variants
          variant === "default" && "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200",
          variant === "ghost" && "hover:bg-slate-100 dark:hover:bg-slate-800",
          variant === "secondary" && "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",

          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-3 text-sm",
          size === "icon" && "h-10 w-10",

          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
