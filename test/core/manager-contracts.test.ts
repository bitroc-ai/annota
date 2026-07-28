import { createAnnotationStore } from '../../src/core/store';
import { createLayerManager } from '../../src/core/layer';
import { createSelectionManager } from '../../src/core/selection';
import { createHistoryManager } from '../../src/core/history';
import {
  MemoryAnnotationStore,
  MemoryHistoryManager,
  MemoryLayerManager,
  MemorySelectionManager,
} from '../helpers/custom-managers';
import {
  defineAnnotationStoreContract,
  defineHistoryManagerContract,
  defineLayerManagerContract,
  defineSelectionManagerContract,
} from '../contracts/manager-capability-contracts';

defineAnnotationStoreContract('built-in', createAnnotationStore);
defineAnnotationStoreContract('independent memory implementation', () => new MemoryAnnotationStore());

defineLayerManagerContract('built-in', createLayerManager);
defineLayerManagerContract('independent memory implementation', () => new MemoryLayerManager());

defineSelectionManagerContract('built-in', createSelectionManager);
defineSelectionManagerContract(
  'independent memory implementation',
  () => new MemorySelectionManager()
);

defineHistoryManagerContract('built-in', createHistoryManager);
defineHistoryManagerContract(
  'independent memory implementation',
  options => new MemoryHistoryManager(options)
);
