/**
 * Annota Core - History Management
 * Command pattern based undo/redo system for annotation operations
 */

import type { Annotation } from './types';
import type { AnnotationStore } from './store';

// ============================================
// Command Interface
// ============================================

/**
 * Reversible command interface
 */
export interface Command {
  /** Execute the command (apply the change) */
  execute(): void;
  /** Undo the command (reverse the change) */
  undo(): void;
  /** Redo the command (re-apply after undo) */
  redo(): void;
  /** Optional: merge with another command if they're similar */
  merge?(cmd: Command): boolean;
}

// ============================================
// Command Implementations
// ============================================

/**
 * Create annotation command
 */
export class CreateCommand implements Command {
  constructor(
    private store: AnnotationStore,
    private annotation: Annotation
  ) {}

  execute(): void {
    this.store.add(this.annotation);
  }

  undo(): void {
    this.store.delete(this.annotation.id);
  }

  redo(): void {
    this.store.add(this.annotation);
  }
}

/**
 * Update annotation command
 */
export class UpdateCommand implements Command {
  constructor(
    private store: AnnotationStore,
    private oldAnnotation: Annotation,
    private newAnnotation: Annotation
  ) {}

  execute(): void {
    this.store.update(this.newAnnotation.id, this.newAnnotation);
  }

  undo(): void {
    this.store.update(this.oldAnnotation.id, this.oldAnnotation);
  }

  redo(): void {
    this.store.update(this.newAnnotation.id, this.newAnnotation);
  }

  /**
   * Merge consecutive updates to the same annotation
   */
  merge(cmd: Command): boolean {
    if (!(cmd instanceof UpdateCommand)) return false;
    if (this.newAnnotation.id !== cmd.newAnnotation.id) return false;

    // Merge by updating our new state, keeping the old state
    this.newAnnotation = cmd.newAnnotation;
    return true;
  }
}

/**
 * Delete annotation command
 */
export class DeleteCommand implements Command {
  constructor(
    private store: AnnotationStore,
    private annotation: Annotation
  ) {}

  execute(): void {
    this.store.delete(this.annotation.id);
  }

  undo(): void {
    this.store.add(this.annotation);
  }

  redo(): void {
    this.store.delete(this.annotation.id);
  }
}

/**
 * Batch command for grouping multiple commands
 */
export class BatchCommand implements Command {
  constructor(
    private commands: Command[],
    private description?: string
  ) {}

  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  redo(): void {
    this.commands.forEach(cmd => cmd.redo());
  }

  getDescription(): string | undefined {
    return this.description;
  }
}

// ============================================
// History State Events
// ============================================

export interface HistoryStateEvent {
  canUndo: boolean;
  canRedo: boolean;
  undoSize: number;
  redoSize: number;
}

export type HistoryObserver = (event: HistoryStateEvent) => void;

// ============================================
// History Manager Interface
// ============================================

export interface HistoryManager {
  /** Execute and record a command */
  execute(command: Command): void;

  /** Undo the last command */
  undo(): void;

  /** Redo the last undone command */
  redo(): void;

  /** Check if undo is available */
  canUndo(): boolean;

  /** Check if redo is available */
  canRedo(): boolean;

  /** Clear all history */
  clear(): void;

  /** Get undo stack size */
  getUndoSize(): number;

  /** Get redo stack size */
  getRedoSize(): number;

  /** Begin a batch operation */
  beginBatch(description?: string): void;

  /** End a batch operation */
  endBatch(): void;

  /** Disable history recording temporarily */
  disable(): void;

  /** Re-enable history recording */
  enable(): void;

  /** Check if history is enabled */
  isEnabled(): boolean;

  /** Observe history state changes */
  observe(callback: HistoryObserver): void;

  /** Stop observing history state changes */
  unobserve(callback: HistoryObserver): void;
}

// ============================================
// History Manager Options
// ============================================

export interface HistoryManagerOptions {
  /** Maximum number of commands to keep in history (default: 100) */
  maxHistorySize?: number;
  /** Enable command merging for consecutive similar commands (default: true) */
  enableMerging?: boolean;
}

// ============================================
// History Manager Implementation
// ============================================

class HistoryManagerImpl implements HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private observers: HistoryObserver[] = [];
  private maxHistorySize: number;
  private enableMerging: boolean;
  private enabled: boolean = true;
  private batchCommands: Command[] | null = null;
  private batchDescription?: string;

  constructor(options: HistoryManagerOptions = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.enableMerging = options.enableMerging ?? true;
  }

  private emit(): void {
    const event: HistoryStateEvent = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoSize: this.undoStack.length,
      redoSize: this.redoStack.length,
    };

    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in history observer:', error);
      }
    });
  }

  execute(command: Command): void {
    if (!this.enabled) {
      // If history is disabled, just execute without recording
      command.execute();
      return;
    }

    // If we're in a batch, collect commands
    if (this.batchCommands) {
      this.batchCommands.push(command);
      command.execute();
      return;
    }

    // Try to merge with last command if merging is enabled
    if (this.enableMerging && this.undoStack.length > 0) {
      const lastCommand = this.undoStack[this.undoStack.length - 1];
      if (lastCommand.merge && lastCommand.merge(command)) {
        // Command was merged, just execute the new one
        command.execute();
        this.emit();
        return;
      }
    }

    // Execute the command
    command.execute();

    // Add to undo stack
    this.undoStack.push(command);

    // Enforce history size limit
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // Clear redo stack when a new command is executed
    this.redoStack = [];

    this.emit();
  }

  undo(): void {
    if (!this.canUndo()) return;

    const command = this.undoStack.pop()!;

    // Temporarily disable history while undoing
    const wasEnabled = this.enabled;
    this.enabled = false;

    try {
      command.undo();
      this.redoStack.push(command);
      this.emit();
    } finally {
      this.enabled = wasEnabled;
    }
  }

  redo(): void {
    if (!this.canRedo()) return;

    const command = this.redoStack.pop()!;

    // Temporarily disable history while redoing
    const wasEnabled = this.enabled;
    this.enabled = false;

    try {
      command.redo();
      this.undoStack.push(command);
      this.emit();
    } finally {
      this.enabled = wasEnabled;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
  }

  getUndoSize(): number {
    return this.undoStack.length;
  }

  getRedoSize(): number {
    return this.redoStack.length;
  }

  beginBatch(description?: string): void {
    this.batchCommands = [];
    this.batchDescription = description;
  }

  endBatch(): void {
    if (!this.batchCommands) return;

    if (this.batchCommands.length > 0) {
      const batch = new BatchCommand(this.batchCommands, this.batchDescription);

      // Add batch to undo stack without executing (already executed)
      this.undoStack.push(batch);

      // Enforce history size limit
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      // Clear redo stack
      this.redoStack = [];
    }

    this.batchCommands = null;
    this.batchDescription = undefined;
    this.emit();
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  observe(callback: HistoryObserver): void {
    if (!this.observers.includes(callback)) {
      this.observers.push(callback);
    }
  }

  unobserve(callback: HistoryObserver): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new history manager
 */
export function createHistoryManager(options?: HistoryManagerOptions): HistoryManager {
  return new HistoryManagerImpl(options);
}
