import type { HistoryEvent, WorkerMessage, WorkerResponse, CollisionResult, CollisionParams } from './types';
import { HISTORY_EVENTS } from './eventData';

const ctx: Worker = self as unknown as Worker;

ctx.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'loadEvents':
      setTimeout(() => {
        const response: WorkerResponse = { type: 'eventsLoaded', events: HISTORY_EVENTS };
        ctx.postMessage(response);
      }, 10);
      break;

    case 'detectCollisions':
      const yearToPixel = buildYearToPixel(msg.params);
      const results = computeCollisions(msg.events, yearToPixel, msg.params.collisionRadius);
      const response: WorkerResponse = { type: 'collisionsDetected', results };
      ctx.postMessage(response);
      break;
  }
});

function buildYearToPixel(params: CollisionParams): (year: number) => number {
  const { startYear, endYear, paddingLeft, timelineWidth, offsetX } = params;
  const yearSpan = endYear - startYear;
  return (year: number) => {
    const rel = (year - startYear) / yearSpan;
    return paddingLeft + rel * timelineWidth + offsetX;
  };
}

function computeCollisions(
  events: HistoryEvent[],
  yearToPixel: (year: number) => number,
  collisionRadius: number
): CollisionResult[] {
  const sorted = [...events].sort((a, b) => a.year - b.year);
  const results: CollisionResult[] = [];
  const placed: Array<{ x: number; y: number; eventId: string; side: 'top' | 'bottom' }> = [];

  for (const event of sorted) {
    const x = yearToPixel(event.year);
    let yOffset = 0;
    let side: 'top' | 'bottom' = 'bottom';
    let attempt = 0;
    let placedOk = false;
    const step = collisionRadius * 0.7;

    const tryPlace = (testY: number, testSide: 'top' | 'bottom'): boolean => {
      for (const p of placed) {
        const dx = x - p.x;
        const dy = testY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < collisionRadius * 2) return false;
      }
      return true;
    };

    while (!placedOk && attempt < 50) {
      if (attempt % 2 === 0) {
        side = 'bottom';
        yOffset = Math.floor(attempt / 2) * step;
      } else {
        side = 'top';
        yOffset = Math.floor(attempt / 2) * step + step * 0.5;
      }
      if (tryPlace(yOffset, side)) {
        placedOk = true;
      }
      attempt++;
    }

    results.push({ eventId: event.id, yOffset, side });
    placed.push({ x, y: yOffset, eventId: event.id, side });
  }

  return results;
}

export {};
