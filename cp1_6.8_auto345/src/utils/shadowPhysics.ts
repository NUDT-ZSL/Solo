export interface ShadowCalcInput {
  characters: {
    id: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    width: number;
    height: number;
    silhouettePath: number[][];
  }[];
  lightX: number;
  lightY: number;
  stageWidth: number;
  stageHeight: number;
}

export interface ShadowResult {
  id: string;
  shadowPath: number[][];
  shadowOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
  shadowSkewX: number;
  shadowSkewY: number;
  blurRadius: number;
}

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  scale: number;
}

const FRICTION = 0.92;
const ROTATION_FRICTION = 0.88;
const MIN_VELOCITY = 0.1;

export function applyInertia(state: PhysicsState, dt: number): PhysicsState {
  const factor = dt / 16;
  let vx = state.vx * Math.pow(FRICTION, factor);
  let vy = state.vy * Math.pow(FRICTION, factor);
  let vr = state.vr * Math.pow(ROTATION_FRICTION, factor);

  if (Math.abs(vx) < MIN_VELOCITY) vx = 0;
  if (Math.abs(vy) < MIN_VELOCITY) vy = 0;
  if (Math.abs(vr) < MIN_VELOCITY) vr = 0;

  return {
    x: state.x + vx * factor,
    y: state.y + vy * factor,
    vx,
    vy,
    rotation: state.rotation + vr * factor,
    vr,
    scale: state.scale,
  };
}

export function calculateShadow(
  charX: number,
  charY: number,
  charWidth: number,
  charHeight: number,
  lightX: number,
  lightY: number,
  stageWidth: number,
  stageHeight: number,
): {
  offsetX: number;
  offsetY: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  blurRadius: number;
} {
  const dx = charX - lightX;
  const dy = charY - lightY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight);

  const normalizedDist = Math.min(dist / maxDist, 1);
  const shadowLength = 30 + normalizedDist * 80;
  const angle = Math.atan2(dy, dx);

  const offsetX = Math.cos(angle) * shadowLength;
  const offsetY = Math.sin(angle) * shadowLength;

  const opacity = Math.max(0.15, 0.6 - normalizedDist * 0.45);

  const distanceFactor = 1 + normalizedDist * 0.5;
  const scaleX = distanceFactor;
  const scaleY = 1 + normalizedDist * 0.15;

  const heightRatio = dy / (stageHeight || 1);
  const skewX = heightRatio * 0.3;
  const skewY = 0;

  const blurRadius = 3 + normalizedDist * 15;

  return { offsetX, offsetY, opacity, scaleX, scaleY, skewX, skewY, blurRadius };
}

export function computeAllShadows(input: ShadowCalcInput): ShadowResult[] {
  const results: ShadowResult[] = [];

  for (const char of input.characters) {
    const shadow = calculateShadow(
      char.x, char.y,
      char.width, char.height,
      input.lightX, input.lightY,
      input.stageWidth, input.stageHeight,
    );

    const transformedPath: number[][] = [];
    const centerX = char.x;
    const centerY = char.y;

    for (const point of char.silhouettePath) {
      const localX = (point[0] - char.width / 2) * char.scale;
      const localY = (point[1] - char.height / 2) * char.scale;

      const cos = Math.cos(char.rotation);
      const sin = Math.sin(char.rotation);
      const rotX = localX * cos - localY * sin + centerX;
      const rotY = localX * sin + localY * cos + centerY;

      const sDx = rotX - input.lightX;
      const sDy = rotY - input.lightY;
      const sDist = Math.sqrt(sDx * sDx + sDy * sDy);
      const sAngle = Math.atan2(sDy, sDx);

      const stretch = 1 + (sDist / input.stageWidth) * 0.4;
      const shadowX = rotX + Math.cos(sAngle) * 20 * stretch;
      const shadowY = rotY + Math.sin(sAngle) * 20 * stretch;

      transformedPath.push([shadowX, shadowY]);
    }

    results.push({
      id: char.id,
      shadowPath: transformedPath,
      shadowOpacity: shadow.opacity,
      shadowOffsetX: shadow.offsetX,
      shadowOffsetY: shadow.offsetY,
      shadowScale: shadow.scaleX,
      shadowSkewX: shadow.skewX,
      shadowSkewY: shadow.skewY,
      blurRadius: shadow.blurRadius,
    });
  }

  return results;
}

const workerCode = `
  import { computeAllShadows } from '${import.meta.url}';
`;

export function createShadowWorker(): Worker | null {
  try {
    const blob = new Blob(
      [
        `
        const FRICTION = 0.92;
        const ROTATION_FRICTION = 0.88;
        const MIN_VELOCITY = 0.1;

        function calculateShadow(charX, charY, charWidth, charHeight, lightX, lightY, stageWidth, stageHeight) {
          const dx = charX - lightX;
          const dy = charY - lightY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight);
          const normalizedDist = Math.min(dist / maxDist, 1);
          const shadowLength = 30 + normalizedDist * 80;
          const angle = Math.atan2(dy, dx);
          const offsetX = Math.cos(angle) * shadowLength;
          const offsetY = Math.sin(angle) * shadowLength;
          const opacity = Math.max(0.15, 0.6 - normalizedDist * 0.45);
          const distanceFactor = 1 + normalizedDist * 0.5;
          const scaleX = distanceFactor;
          const scaleY = 1 + normalizedDist * 0.15;
          const heightRatio = dy / (stageHeight || 1);
          const skewX = heightRatio * 0.3;
          const skewY = 0;
          const blurRadius = 3 + normalizedDist * 15;
          return { offsetX, offsetY, opacity, scaleX, scaleY, skewX, skewY, blurRadius };
        }

        self.onmessage = function(e) {
          const input = e.data;
          const results = [];

          for (const char of input.characters) {
            const shadow = calculateShadow(
              char.x, char.y, char.width, char.height,
              input.lightX, input.lightY,
              input.stageWidth, input.stageHeight
            );

            const transformedPath = [];
            const centerX = char.x;
            const centerY = char.y;

            for (const point of char.silhouettePath) {
              const localX = (point[0] - char.width / 2) * char.scale;
              const localY = (point[1] - char.height / 2) * char.scale;
              const cos = Math.cos(char.rotation);
              const sin = Math.sin(char.rotation);
              const rotX = localX * cos - localY * sin + centerX;
              const rotY = localX * sin + localY * cos + centerY;
              const sDx = rotX - input.lightX;
              const sDy = rotY - input.lightY;
              const sDist = Math.sqrt(sDx * sDx + sDy * sDy);
              const sAngle = Math.atan2(sDy, sDx);
              const stretch = 1 + (sDist / input.stageWidth) * 0.4;
              const shadowX = rotX + Math.cos(sAngle) * 20 * stretch;
              const shadowY = rotY + Math.sin(sAngle) * 20 * stretch;
              transformedPath.push([shadowX, shadowY]);
            }

            results.push({
              id: char.id,
              shadowPath: transformedPath,
              shadowOpacity: shadow.opacity,
              shadowOffsetX: shadow.offsetX,
              shadowOffsetY: shadow.offsetY,
              shadowScale: shadow.scaleX,
              shadowSkewX: shadow.skewX,
              shadowSkewY: shadow.skewY,
              blurRadius: shadow.blurRadius,
            });
          }

          self.postMessage(results);
        };
      `,
      ],
      { type: 'application/javascript' },
    );

    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch {
    return null;
  }
}

export function interpolateKeyframes(
  from: { x: number; y: number; rotation: number; scale: number },
  to: { x: number; y: number; rotation: number; scale: number },
  t: number,
): { x: number; y: number; rotation: number; scale: number } {
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  return {
    x: from.x + (to.x - from.x) * ease,
    y: from.y + (to.y - from.y) * ease,
    rotation: from.rotation + (to.rotation - from.rotation) * ease,
    scale: from.scale + (to.scale - from.scale) * ease,
  };
}
