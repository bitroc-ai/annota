import React, { useState } from 'react';

export interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, side = 'top', className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    const getSideClasses = () => {
      switch (side) {
        case 'top':
          return 'bottom-full mb-2';
        case 'right':
          return 'left-full ml-2';
        case 'bottom':
          return 'top-full mt-2';
        case 'left':
          return 'right-full mr-2';
        default:
          return 'bottom-full mb-2';
      }
    };

    return (
      <div
        ref={ref}
        className="relative inline-block"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        {...props}
      >
        {children}
        {visible && (
          <div
            className={`absolute z-50 px-2 py-1 text-sm bg-slate-900 text-white rounded-md whitespace-nowrap ${getSideClasses()} ${className}`}
          >
            {content}
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';
