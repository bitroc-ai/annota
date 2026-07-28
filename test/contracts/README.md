# Manager capability contracts

`manager-capability-contracts.ts` is the reusable compatibility gate for custom
manager implementations. Each contract accepts only a factory for its public
capability, so an extension can run the same tests without depending on Annota's
concrete manager classes.

```ts
import {
  defineAnnotationStoreContract,
  defineHistoryManagerContract,
  defineLayerManagerContract,
  defineSelectionManagerContract,
} from './manager-capability-contracts';

defineAnnotationStoreContract('my store', () => new MyStore());
defineLayerManagerContract('my layers', () => new MyLayers());
defineSelectionManagerContract('my selection', () => new MySelection());
defineHistoryManagerContract('my history', options => new MyHistory(options));
```

The contracts intentionally cover observable behavior rather than internal data
structures:

- Store write modes, normalization, errors, batch atomicity, event
  classification, and spatial consistency.
- Layer defaults, stable creation ordering, control updates, assignment,
  protected operations, errors, observation, and frozen snapshot isolation for
  reads plus created/updated/reordered/deleted events.
- Selection set semantics, transition events, no-op behavior, and observation.
- History batching, failure-safe stacks (including failed merge candidates and
  redo invalidation after successful merges), undo/redo, options, disabled
  mode, and observation.

Built-in and independent memory implementations are registered against these
same exported functions in `test/core/manager-contracts.test.ts`. Do not fork or
weaken the suite for a custom implementation.
