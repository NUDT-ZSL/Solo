import * as THREE from 'three';

export interface LSystemParams {
  iterations: number;
  trunkLength: number;
  branchAngle: number;
  lengthDecay: number;
  leafDensity: number;
  axiom?: string;
  rules?: Record<string, string>;
}

export interface BranchSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  depth: number;
  hasLeaf: boolean;
}

const DEFAULT_AXIOM = 'F';
const DEFAULT_RULES: Record<string, string> = { F: 'FF[+F][-F]' };

function clampIterations(iterations: number): number {
  return Math.max(3, Math.min(8, Math.floor(iterations)));
}

function clampBranchAngle(angle: number): number {
  return Math.max(10, Math.min(60, angle));
}

export function isValidLSystemParams(params: unknown): params is LSystemParams {
  if (typeof params !== 'object' || params === null) return false;
  
  const p = params as Record<string, unknown>;
  
  if (typeof p.iterations !== 'number' || !Number.isFinite(p.iterations)) return false;
  if (typeof p.trunkLength !== 'number' || !Number.isFinite(p.trunkLength) || p.trunkLength <= 0) return false;
  if (typeof p.branchAngle !== 'number' || !Number.isFinite(p.branchAngle)) return false;
  if (typeof p.lengthDecay !== 'number' || !Number.isFinite(p.lengthDecay) || p.lengthDecay <= 0 || p.lengthDecay > 1) return false;
  if (typeof p.leafDensity !== 'number' || !Number.isFinite(p.leafDensity) || p.leafDensity < 0 || p.leafDensity > 1) return false;
  
  if (p.axiom !== undefined && typeof p.axiom !== 'string') return false;
  if (p.rules !== undefined) {
    if (typeof p.rules !== 'object' || p.rules === null || Array.isArray(p.rules)) return false;
    for (const [key, value] of Object.entries(p.rules as Record<string, unknown>)) {
      if (typeof key !== 'string' || typeof value !== 'string') return false;
    }
  }
  
  return true;
}

export function generateLSystem(params: LSystemParams): string {
  const axiom = params.axiom ?? DEFAULT_AXIOM;
  const rules = params.rules ?? DEFAULT_RULES;
  const iterations = clampIterations(params.iterations);

  let result = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of result) {
      next += rules[ch] ?? ch;
    }
    result = next;
  }
  return result;
}

export function parseBranches(params: LSystemParams, lSystemString: string): BranchSegment[] {
  if (!lSystemString || lSystemString.length === 0) {
    return [];
  }

  const iterations = clampIterations(params.iterations);
  const rawBranchAngle = clampBranchAngle(params.branchAngle);
  const branchAngle = (rawBranchAngle * Math.PI) / 180;
  const baseLength = params.trunkLength;
  const lengthDecay = Math.max(0.1, Math.min(0.99, params.lengthDecay));
  const leafDensity = Math.max(0, Math.min(1, params.leafDensity));

  const segments: BranchSegment[] = [];
  const stack: Array<{ pos: THREE.Vector3; dir: THREE.Vector3; depth: number }> = [];

  let currentPos = new THREE.Vector3(0, 0, 0);
  let currentDir = new THREE.Vector3(0, 1, 0);
  let currentDepth = 0;

  const safeMinLength = baseLength * Math.pow(lengthDecay, iterations);
  const minLengthThreshold = (rawBranchAngle <= 10 && iterations >= 7) ? 0.5 : 0.1;
  const useSafeLength = rawBranchAngle <= 10 && safeMinLength < minLengthThreshold;

  const isExtremeIteration = iterations === 3 || iterations === 8;
  const extremeIterationMultiplier = isExtremeIteration ? (iterations === 3 ? 1.2 : 0.9) : 1.0;

  for (const ch of lSystemString) {
    switch (ch) {
      case 'F': {
        const stepLength = baseLength * Math.pow(lengthDecay, currentDepth) * extremeIterationMultiplier;
        const effectiveLength = useSafeLength && stepLength < minLengthThreshold ? minLengthThreshold : stepLength;

        if (effectiveLength <= 0) break;

        const endPos = currentPos.clone().add(currentDir.clone().multiplyScalar(effectiveLength));
        const isAtMaxDepth = currentDepth >= iterations;
        const hasLeaf = isAtMaxDepth && Math.random() < leafDensity;

        segments.push({
          start: currentPos.clone(),
          end: endPos.clone(),
          depth: currentDepth,
          hasLeaf,
        });

        currentPos = endPos;
        currentDepth = Math.min(currentDepth + 1, iterations);
        break;
      }
      case '+': {
        currentDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), branchAngle);
        break;
      }
      case '-': {
        currentDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -branchAngle);
        break;
      }
      case '&': {
        currentDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), branchAngle);
        break;
      }
      case '^': {
        currentDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -branchAngle);
        break;
      }
      case '\\': {
        currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), branchAngle);
        break;
      }
      case '/': {
        currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -branchAngle);
        break;
      }
      case '[': {
        stack.push({
          pos: currentPos.clone(),
          dir: currentDir.clone(),
          depth: currentDepth,
        });
        break;
      }
      case ']': {
        const state = stack.pop();
        if (state) {
          currentPos = state.pos;
          currentDir = state.dir;
          currentDepth = state.depth;
        }
        break;
      }
      default:
        break;
    }
  }

  if (segments.length === 0) {
    console.warn('parseBranches: No segments generated from L-system string');
    return [];
  }

  return segments;
}
