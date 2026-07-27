import type { Annotation, AnnotationProperties } from './types';
import type { Layer } from './layer';

export type ChangeSource = 'user' | 'api' | 'tool' | 'history' | 'loader';

export interface ChangeContext {
  source: ChangeSource;
  transactionId?: string;
  transient: boolean;
}

export interface AnnotatorNotification {
  type: 'info' | 'warning' | 'error';
  message: string;
  cause?: unknown;
}

export interface AnnotatorEventMap<P extends AnnotationProperties = AnnotationProperties> {
  'annotation:create': { annotation: Annotation<P>; context: ChangeContext };
  'annotation:update': {
    previous: Annotation<P>;
    annotation: Annotation<P>;
    context: ChangeContext;
  };
  'annotation:delete': { annotation: Annotation<P>; context: ChangeContext };
  'selection:change': { previous: string[]; current: string[]; context: ChangeContext };
  'layer:create': { layer: Layer; context: ChangeContext };
  'layer:update': { layer: Layer; context: ChangeContext };
  'layer:delete': { layer: Layer; context: ChangeContext };
  notification: AnnotatorNotification;
}

export interface AnnotatorEvents<
  EventMap = AnnotatorEventMap
> {
  on<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void
  ): () => void;
  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void;
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
  clear(): void;
}

export function createTypedEvents<
  EventMap = AnnotatorEventMap
>(
  reportError: (error: unknown) => void = error => {
    console.error('Error in annotator event handler:', error);
  }
): AnnotatorEvents<EventMap> {
  const handlers = new Map<keyof EventMap, Set<(payload: EventMap[keyof EventMap]) => void>>();

  return {
    on(event, handler) {
      let eventHandlers = handlers.get(event);
      if (!eventHandlers) {
        eventHandlers = new Set();
        handlers.set(event, eventHandlers);
      }
      const typedHandler = handler as (payload: EventMap[keyof EventMap]) => void;
      eventHandlers.add(typedHandler);
      return () => eventHandlers?.delete(typedHandler);
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler as (payload: EventMap[keyof EventMap]) => void);
    },
    emit(event, payload) {
      handlers.get(event)?.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          reportError(error);
        }
      });
    },
    clear() {
      handlers.clear();
    },
  };
}

let transactionCounter = 0;
export function createTransactionId(prefix = 'annota'): string {
  transactionCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${transactionCounter.toString(36)}`;
}

export function changeContext(
  source: ChangeSource,
  options?: { transactionId?: string; transient?: boolean }
): ChangeContext {
  return {
    source,
    transactionId: options?.transactionId ?? createTransactionId(source),
    transient: options?.transient ?? false,
  };
}
