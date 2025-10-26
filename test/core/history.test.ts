/**
 * Tests for History Management System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAnnotationStore } from '../../src/core/store';
import {
  createHistoryManager,
  CreateCommand,
  UpdateCommand,
  DeleteCommand,
  BatchCommand,
  type HistoryManager,
  type HistoryStateEvent,
} from '../../src/core/history';
import type { Annotation } from '../../src/core/types';

describe('History Manager', () => {
  let store: ReturnType<typeof createAnnotationStore>;
  let history: HistoryManager;

  beforeEach(() => {
    store = createAnnotationStore();
    history = createHistoryManager();
  });

  describe('CreateCommand', () => {
    it('should create an annotation', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const command = new CreateCommand(store, annotation);
      command.execute();

      expect(store.get('test-1')).toEqual(annotation);
    });

    it('should undo annotation creation', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const command = new CreateCommand(store, annotation);
      command.execute();
      command.undo();

      expect(store.get('test-1')).toBeUndefined();
    });

    it('should redo annotation creation', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const command = new CreateCommand(store, annotation);
      command.execute();
      command.undo();
      command.redo();

      expect(store.get('test-1')).toEqual(annotation);
    });
  });

  describe('UpdateCommand', () => {
    it('should update an annotation', () => {
      const oldAnnotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const newAnnotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      store.add(oldAnnotation);

      const command = new UpdateCommand(store, oldAnnotation, newAnnotation);
      command.execute();

      expect(store.get('test-1')).toEqual(newAnnotation);
    });

    it('should undo annotation update', () => {
      const oldAnnotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const newAnnotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      store.add(oldAnnotation);

      const command = new UpdateCommand(store, oldAnnotation, newAnnotation);
      command.execute();
      command.undo();

      expect(store.get('test-1')).toEqual(oldAnnotation);
    });

    it('should merge consecutive updates to the same annotation', () => {
      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const annotation3: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 200, y: 300 },
          bounds: { minX: 200, minY: 300, maxX: 200, maxY: 300 },
        },
      };

      const cmd1 = new UpdateCommand(store, annotation1, annotation2);
      const cmd2 = new UpdateCommand(store, annotation2, annotation3);

      const merged = cmd1.merge(cmd2);
      expect(merged).toBe(true);
    });

    it('should not merge updates to different annotations', () => {
      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-2',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const cmd1 = new UpdateCommand(store, annotation1, annotation1);
      const cmd2 = new UpdateCommand(store, annotation2, annotation2);

      const merged = cmd1.merge(cmd2);
      expect(merged).toBe(false);
    });
  });

  describe('DeleteCommand', () => {
    it('should delete an annotation', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      store.add(annotation);

      const command = new DeleteCommand(store, annotation);
      command.execute();

      expect(store.get('test-1')).toBeUndefined();
    });

    it('should undo annotation deletion', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      store.add(annotation);

      const command = new DeleteCommand(store, annotation);
      command.execute();
      command.undo();

      expect(store.get('test-1')).toEqual(annotation);
    });
  });

  describe('BatchCommand', () => {
    it('should execute multiple commands', () => {
      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-2',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const commands = [
        new CreateCommand(store, annotation1),
        new CreateCommand(store, annotation2),
      ];

      const batch = new BatchCommand(commands, 'Create annotations');
      batch.execute();

      expect(store.get('test-1')).toEqual(annotation1);
      expect(store.get('test-2')).toEqual(annotation2);
    });

    it('should undo multiple commands in reverse order', () => {
      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-2',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const commands = [
        new CreateCommand(store, annotation1),
        new CreateCommand(store, annotation2),
      ];

      const batch = new BatchCommand(commands, 'Create annotations');
      batch.execute();
      batch.undo();

      expect(store.get('test-1')).toBeUndefined();
      expect(store.get('test-2')).toBeUndefined();
    });
  });

  describe('HistoryManager', () => {
    it('should execute and record commands', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const command = new CreateCommand(store, annotation);
      history.execute(command);

      expect(store.get('test-1')).toEqual(annotation);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should undo commands', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const command = new CreateCommand(store, annotation);
      history.execute(command);
      history.undo();

      expect(store.get('test-1')).toBeUndefined();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('should redo commands', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const command = new CreateCommand(store, annotation);
      history.execute(command);
      history.undo();
      history.redo();

      expect(store.get('test-1')).toEqual(annotation);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should clear redo stack when new command is executed', () => {
      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-2',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      history.execute(new CreateCommand(store, annotation1));
      history.undo();
      expect(history.canRedo()).toBe(true);

      history.execute(new CreateCommand(store, annotation2));
      expect(history.canRedo()).toBe(false);
    });

    it('should respect history size limit', () => {
      const limitedHistory = createHistoryManager({ maxHistorySize: 2 });

      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-2',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const annotation3: Annotation = {
        id: 'test-3',
        shape: {
          type: 'point',
          point: { x: 200, y: 300 },
          bounds: { minX: 200, minY: 300, maxX: 200, maxY: 300 },
        },
      };

      limitedHistory.execute(new CreateCommand(store, annotation1));
      limitedHistory.execute(new CreateCommand(store, annotation2));
      limitedHistory.execute(new CreateCommand(store, annotation3));

      expect(limitedHistory.getUndoSize()).toBe(2);
    });

    it('should support batch operations', () => {
      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-2',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      history.beginBatch('Create multiple annotations');
      history.execute(new CreateCommand(store, annotation1));
      history.execute(new CreateCommand(store, annotation2));
      history.endBatch();

      expect(store.get('test-1')).toEqual(annotation1);
      expect(store.get('test-2')).toEqual(annotation2);
      expect(history.getUndoSize()).toBe(1);

      history.undo();
      expect(store.get('test-1')).toBeUndefined();
      expect(store.get('test-2')).toBeUndefined();
    });

    it('should support disabling history', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      history.disable();
      history.execute(new CreateCommand(store, annotation));
      history.enable();

      expect(store.get('test-1')).toEqual(annotation);
      expect(history.canUndo()).toBe(false);
    });

    it('should notify observers on state changes', () => {
      const observer = vi.fn();
      history.observe(observer);

      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      history.execute(new CreateCommand(store, annotation));

      expect(observer).toHaveBeenCalled();
      const event: HistoryStateEvent = observer.mock.calls[0][0];
      expect(event.canUndo).toBe(true);
      expect(event.canRedo).toBe(false);
      expect(event.undoSize).toBe(1);
      expect(event.redoSize).toBe(0);
    });

    it('should stop notifying after unobserve', () => {
      const observer = vi.fn();
      history.observe(observer);
      history.unobserve(observer);

      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      history.execute(new CreateCommand(store, annotation));

      expect(observer).not.toHaveBeenCalled();
    });

    it('should clear all history', () => {
      const annotation: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      history.execute(new CreateCommand(store, annotation));
      history.undo();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.getUndoSize()).toBe(0);
      expect(history.getRedoSize()).toBe(0);
    });

    it('should merge consecutive similar commands when enabled', () => {
      const historyWithMerging = createHistoryManager({ enableMerging: true });

      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const annotation3: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 200, y: 300 },
          bounds: { minX: 200, minY: 300, maxX: 200, maxY: 300 },
        },
      };

      store.add(annotation1);

      historyWithMerging.execute(new UpdateCommand(store, annotation1, annotation2));
      historyWithMerging.execute(new UpdateCommand(store, annotation2, annotation3));

      // Should have merged into one command
      expect(historyWithMerging.getUndoSize()).toBe(1);

      // Undoing should go back to the original state
      historyWithMerging.undo();
      expect(store.get('test-1')).toEqual(annotation1);
    });

    it('should not merge when merging is disabled', () => {
      const historyWithoutMerging = createHistoryManager({ enableMerging: false });

      const annotation1: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 100, y: 200 },
          bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
        },
      };

      const annotation2: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 150, y: 250 },
          bounds: { minX: 150, minY: 250, maxX: 150, maxY: 250 },
        },
      };

      const annotation3: Annotation = {
        id: 'test-1',
        shape: {
          type: 'point',
          point: { x: 200, y: 300 },
          bounds: { minX: 200, minY: 300, maxX: 200, maxY: 300 },
        },
      };

      store.add(annotation1);

      historyWithoutMerging.execute(new UpdateCommand(store, annotation1, annotation2));
      historyWithoutMerging.execute(new UpdateCommand(store, annotation2, annotation3));

      // Should have 2 separate commands
      expect(historyWithoutMerging.getUndoSize()).toBe(2);
    });
  });
});
