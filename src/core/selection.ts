/**
 * Annota Core - Selection Management
 * Manages annotation selection state with observable pattern
 */

// ============================================
// Selection Change Events
// ============================================

export interface SelectionChangeEvent {
  /** Previously selected annotation IDs */
  previous: string[];
  /** Currently selected annotation IDs */
  current: string[];
}

export type SelectionObserver = (event: SelectionChangeEvent) => void;

// ============================================
// Selection Manager Interface
// ============================================

export interface SelectionManager {
  // Selection operations
  select(ids: string | string[]): void;
  toggle(id: string): void;
  add(ids: string | string[]): void;
  remove(ids: string | string[]): void;
  clear(): void;

  // Selection queries
  getSelected(): string[];
  isSelected(id: string): boolean;
  hasSelection(): boolean;
  getSelectionCount(): number;

  // Observable
  observe(callback: SelectionObserver): void;
  unobserve(callback: SelectionObserver): void;
}

// ============================================
// Selection Manager Implementation
// ============================================

class SelectionManagerImpl implements SelectionManager {
  private selected: Set<string>;
  private observers: SelectionObserver[];

  constructor() {
    this.selected = new Set();
    this.observers = [];
  }

  /**
   * Replace current selection with new IDs
   */
  select(ids: string | string[]): void {
    const newIds = Array.isArray(ids) ? ids : [ids];
    const previous = this.getSelected();

    // Check if selection changed
    if (this.hasChanged(previous, newIds)) {
      this.selected = new Set(newIds);
      this.notify(previous, newIds);
    }
  }

  /**
   * Toggle annotation in selection
   */
  toggle(id: string): void {
    const previous = this.getSelected();

    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }

    const current = this.getSelected();
    this.notify(previous, current);
  }

  /**
   * Add IDs to current selection
   */
  add(ids: string | string[]): void {
    const newIds = Array.isArray(ids) ? ids : [ids];
    const previous = this.getSelected();

    newIds.forEach(id => this.selected.add(id));

    const current = this.getSelected();
    if (this.hasChanged(previous, current)) {
      this.notify(previous, current);
    }
  }

  /**
   * Remove IDs from current selection
   */
  remove(ids: string | string[]): void {
    const removeIds = Array.isArray(ids) ? ids : [ids];
    const previous = this.getSelected();

    removeIds.forEach(id => this.selected.delete(id));

    const current = this.getSelected();
    if (this.hasChanged(previous, current)) {
      this.notify(previous, current);
    }
  }

  /**
   * Clear all selections
   */
  clear(): void {
    if (this.selected.size > 0) {
      const previous = this.getSelected();
      this.selected.clear();
      this.notify(previous, []);
    }
  }

  /**
   * Get currently selected annotation IDs
   */
  getSelected(): string[] {
    return Array.from(this.selected);
  }

  /**
   * Check if annotation is selected
   */
  isSelected(id: string): boolean {
    return this.selected.has(id);
  }

  /**
   * Check if any annotations are selected
   */
  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  /**
   * Get count of selected annotations
   */
  getSelectionCount(): number {
    return this.selected.size;
  }

  /**
   * Subscribe to selection changes
   */
  observe(callback: SelectionObserver): void {
    this.observers.push(callback);
  }

  /**
   * Unsubscribe from selection changes
   */
  unobserve(callback: SelectionObserver): void {
    this.observers = this.observers.filter(obs => obs !== callback);
  }

  /**
   * Check if selection has changed
   */
  private hasChanged(previous: string[], current: string[]): boolean {
    if (previous.length !== current.length) return true;

    // Check if all IDs are the same (order-independent)
    const prevSet = new Set(previous);
    return !current.every(id => prevSet.has(id));
  }

  /**
   * Notify observers of selection change
   */
  private notify(previous: string[], current: string[]): void {
    const event: SelectionChangeEvent = { previous, current };
    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in selection observer:', error);
      }
    });
  }
}

/**
 * Create a new selection manager
 */
export function createSelectionManager(): SelectionManager {
  return new SelectionManagerImpl();
}
