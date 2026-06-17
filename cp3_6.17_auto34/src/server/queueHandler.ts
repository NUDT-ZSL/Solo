import type { PlayerAction } from './gameState';

export type QueuedMessage = {
  action: PlayerAction;
  receivedAt: number;
  processed: boolean;
};

export type RollbackInstruction = {
  type: 'rollback';
  toSequence: number;
  reason: string;
};

export type ProcessResult = {
  success: boolean;
  action?: PlayerAction;
  rollback?: RollbackInstruction;
  confirmation?: {
    sequence: number;
    timestamp: number;
  };
};

type MessageQueue = QueuedMessage[];

let queue: MessageQueue = [];
let expectedSequence = 0;
let lastProcessedSequence = -1;
const history: PlayerAction[] = [];

export const enqueue = (action: PlayerAction): void => {
  const message: QueuedMessage = {
    action,
    receivedAt: Date.now(),
    processed: false,
  };
  queue.push(message);
  queue.sort((a, b) => a.action.sequence - b.action.sequence);
};

export const checkConflicts = (): RollbackInstruction | null => {
  const pending = queue.filter((m) => !m.processed);
  if (pending.length === 0) return null;

  const firstPending = pending[0];
  if (firstPending.action.sequence !== expectedSequence) {
    const gap = expectedSequence;
    const hasOlderMessage = queue.some(
      (m) => m.action.sequence === expectedSequence && !m.processed
    );

    if (!hasOlderMessage) {
      return {
        type: 'rollback',
        toSequence: lastProcessedSequence,
        reason: `Missing sequence ${expectedSequence}, received ${firstPending.action.sequence}`,
      };
    }
  }

  const timeThreshold = 5000;
  const now = Date.now();
  const outOfOrder = pending.filter(
    (m) => m.action.sequence < expectedSequence
  );
  for (const msg of outOfOrder) {
    if (now - msg.receivedAt > timeThreshold) {
      return {
        type: 'rollback',
        toSequence: lastProcessedSequence,
        reason: `Stale message sequence ${msg.action.sequence}, expected ${expectedSequence}`,
      };
    }
  }

  return null;
};

export const processQueue = (
  validator: (action: PlayerAction) => boolean,
  applier: (action: PlayerAction) => void
): ProcessResult[] => {
  const results: ProcessResult[] = [];
  const conflict = checkConflicts();

  if (conflict) {
    queue = queue.filter((m) => m.action.sequence > lastProcessedSequence);
    expectedSequence = lastProcessedSequence + 1;
    results.push({
      success: false,
      rollback: conflict,
    });
    return results;
  }

  const processable = queue.filter(
    (m) => !m.processed && m.action.sequence === expectedSequence
  );

  for (const message of processable) {
    const { action } = message;
    const isValid = validator(action);

    if (isValid) {
      applier(action);
      message.processed = true;
      history.push(action);
      lastProcessedSequence = action.sequence;
      expectedSequence = action.sequence + 1;
      results.push({
        success: true,
        action,
        confirmation: {
          sequence: action.sequence,
          timestamp: Date.now(),
        },
      });
    } else {
      message.processed = true;
      lastProcessedSequence = action.sequence;
      expectedSequence = action.sequence + 1;
      results.push({
        success: false,
        action,
        rollback: {
          type: 'rollback',
          toSequence: action.sequence - 1,
          reason: 'Invalid action',
        },
      });
    }
  }

  queue = queue.filter((m) => !m.processed || m.action.sequence > lastProcessedSequence - 100);

  return results;
};

export const getQueueState = () => ({
  length: queue.length,
  expectedSequence,
  lastProcessedSequence,
  pendingCount: queue.filter((m) => !m.processed).length,
});
