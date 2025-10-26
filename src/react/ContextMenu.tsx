/**
 * Context Menu Component
 *
 * A customizable context menu that appears on right-click
 * Supports both viewer-level and annotation-level context menus
 */

import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  /** Position where the context menu should appear */
  position: ContextMenuPosition | null;

  /** Context menu content */
  children: ReactNode;

  /** Callback when menu should close */
  onClose?: () => void;

  /** Optional custom class name for styling */
  className?: string;

  /** Z-index for the menu (default: 10000) */
  zIndex?: number;
}

/**
 * Context Menu Component
 *
 * IMPORTANT: This component is minimally styled.
 * You should add your own CSS to style the menu container and items.
 *
 * Example usage:
 * ```tsx
 * <ContextMenu
 *   position={menuPosition}
 *   onClose={() => setMenuPosition(null)}
 *   className="my-context-menu"
 * >
 *   <div className="menu-item" onClick={handleDelete}>Delete</div>
 *   <div className="menu-item" onClick={handleEdit}>Edit</div>
 * </ContextMenu>
 * ```
 */
export function ContextMenu({
  position,
  children,
  onClose,
  className = '',
  zIndex = 10000,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    // Add listeners with a small delay to avoid immediate closing
    // from the same event that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (!position || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }
    if (adjustedY < 10) {
      adjustedY = 10;
    }

    // Apply adjusted position
    if (adjustedX !== position.x || adjustedY !== position.y) {
      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [position]);

  if (!position) {
    return null;
  }

  return (
    <>
      {/* Overlay - clicking outside closes the menu */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: zIndex - 1,
          pointerEvents: 'auto',
        }}
        onClick={onClose}
        onContextMenu={(e: MouseEvent) => {
          // Don't prevent default or close - let the right-click event
          // bubble up so a new context menu can be shown
          e.stopPropagation();
        }}
      />
      {/* Menu */}
      <div
        ref={menuRef}
        className={`annota-context-menu ${className}`}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex,
          backgroundColor: 'var(--annota-context-menu-bg, #ffffff)',
          color: 'var(--annota-context-menu-text, #000000)',
          border: '1px solid var(--annota-context-menu-border, #e0e0e0)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          padding: '4px 0',
          minWidth: '150px',
          pointerEvents: 'auto',
        }}
        onClick={(e: MouseEvent) => {
          // Stop propagation to prevent closing when clicking inside menu
          e.stopPropagation();
        }}
        onContextMenu={(e: MouseEvent) => {
          // Prevent nested context menus
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </>
  );
}

/**
 * Context Menu Item Component
 *
 * A pre-styled menu item component for common use cases
 */
export interface ContextMenuItemProps {
  /** Item label */
  label: string;

  /** Click handler */
  onClick?: () => void;

  /** Icon (optional) */
  icon?: ReactNode;

  /** Disabled state */
  disabled?: boolean;

  /** Danger/destructive action styling */
  danger?: boolean;

  /** Custom class name */
  className?: string;
}

export function ContextMenuItem({
  label,
  onClick,
  icon,
  disabled = false,
  danger = false,
  className = '',
}: ContextMenuItemProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`annota-context-menu-item ${className}`}
      onClick={handleClick}
      style={{
        padding: '8px 16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        color: danger ? 'var(--annota-context-menu-danger, #dc3545)' : 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        userSelect: 'none',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = danger
            ? 'var(--annota-context-menu-danger-hover, rgba(220, 53, 69, 0.1))'
            : 'var(--annota-context-menu-hover, rgba(0, 0, 0, 0.05))';
        }
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon && <span className="menu-item-icon">{icon}</span>}
      <span className="menu-item-label">{label}</span>
    </div>
  );
}

/**
 * Context Menu Divider Component
 */
export function ContextMenuDivider() {
  return (
    <div
      className="annota-context-menu-divider"
      style={{
        height: '1px',
        backgroundColor: 'var(--annota-context-menu-divider, rgba(0, 0, 0, 0.1))',
        margin: '4px 0',
      }}
    />
  );
}
