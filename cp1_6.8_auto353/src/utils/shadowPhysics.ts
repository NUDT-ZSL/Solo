import { ShadowData } from '../types';

const workerCode = `
self.onmessage = function(e) {
  const { puppets, lightX, lightY } = e.data;
  const results = puppets.map(function(puppet) {
    var dx = puppet.x - lightX;
    var dy = puppet.y - lightY;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var angle = Math.atan2(dy, dx);
    var referenceDist = 400;
    var factor = Math.min(dist / referenceDist, 2.5);
    var shadowOffsetX = dx * factor * 0.35;
    var shadowOffsetY = dy * factor * 0.35;
    var stretchX = 1.0 + Math.abs(Math.cos(angle)) * factor * 0.25;
    var stretchY = 1.0 + Math.abs(Math.sin(angle)) * factor * 0.25;
    var opacity = Math.max(0.08, Math.min(0.55, 0.6 - dist / 1000));
    var blur = Math.min(18, dist / 40);
    return {
      offsetX: shadowOffsetX,
      offsetY: shadowOffsetY,
      scaleX: stretchX,
      scaleY: stretchY,
      opacity: opacity,
      blur: blur
    };
  });
  self.postMessage(results);
};
`;

let workerInstance: Worker | null = null;
let pendingResolve: ((data: ShadowData[]) => void) | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    workerInstance = new Worker(url);
    workerInstance.onmessage = (e: MessageEvent<ShadowData[]>) => {
      if (pendingResolve) {
        pendingResolve(e.data);
        pendingResolve = null;
      }
    };
  }
  return workerInstance;
}

export function calculateShadowsAsync(
  puppets: Array<{ x: number; y: number; width: number; height: number }>,
  lightX: number,
  lightY: number
): Promise<ShadowData[]> {
  return new Promise((resolve) => {
    const w = getWorker();
    pendingResolve = resolve;
    w.postMessage({ puppets, lightX, lightY });
  });
}

export function calculateShadow(
  px: number,
  py: number,
  pw: number,
  ph: number,
  lightX: number,
  lightY: number
): ShadowData {
  const dx = px - lightX;
  const dy = py - lightY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const angle = Math.atan2(dy, dx);
  const referenceDist = 400;
  const factor = Math.min(dist / referenceDist, 2.5);

  return {
    offsetX: dx * factor * 0.35,
    offsetY: dy * factor * 0.35,
    scaleX: 1.0 + Math.abs(Math.cos(angle)) * factor * 0.25,
    scaleY: 1.0 + Math.abs(Math.sin(angle)) * factor * 0.25,
    opacity: Math.max(0.08, Math.min(0.55, 0.6 - dist / 1000)),
    blur: Math.min(18, dist / 40),
  };
}

export function applyInertia(
  vx: number,
  vy: number,
  friction: number = 0.92
): { vx: number; vy: number; stopped: boolean } {
  const newVx = vx * friction;
  const newVy = vy * friction;
  const stopped = Math.abs(newVx) < 0.15 && Math.abs(newVy) < 0.15;
  return {
    vx: stopped ? 0 : newVx,
    vy: stopped ? 0 : newVy,
    stopped,
  };
}

export function interpolateKeyframes(
  k1: { x: number; y: number; rotation: number; scale: number },
  k2: { x: number; y: number; rotation: number; scale: number },
  t: number
): { x: number; y: number; rotation: number; scale: number } {
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return {
    x: k1.x + (k2.x - k1.x) * ease,
    y: k1.y + (k2.y - k1.y) * ease,
    rotation: k1.rotation + (k2.rotation - k1.rotation) * ease,
    scale: k1.scale + (k2.scale - k1.scale) * ease,
  };
}
