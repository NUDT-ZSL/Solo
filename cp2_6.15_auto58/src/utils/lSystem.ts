import * as THREE from 'three';
import { generateId } from './animation';

export interface BranchData {
  id: string;
  parentId: string | null;
  level: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  baseLength: number;
  lengthFactor: number;
  radius: number;
  isLeaf: boolean;
  children: string[];
  growProgress: number;
  opacity: number;
  pruneProgress: number;
  isPruned: boolean;
  growDelay: number;
  initialLength: number;
}

interface GenerateOptions {
  maxDepth: number;
  branchAngle: number;
  randomStrength: number;
  baseLength?: number;
}

const rotateAroundAxis = (
  vector: THREE.Vector3,
  axis: THREE.Vector3,
  angle: number
): THREE.Vector3 => {
  const result = vector.clone();
  result.applyAxisAngle(axis, angle);
  return result;
};

const generateBranchRecursive = (
  parentId: string | null,
  level: number,
  start: THREE.Vector3,
  direction: THREE.Vector3,
  baseLength: number,
  options: GenerateOptions,
  branches: Map<string, BranchData>,
  parentChildren: string[] | null
): string | null => {
  if (level >= options.maxDepth) return null;

  const randomFactor = options.randomStrength * (Math.random() * 2 - 1);
  const lengthFactor = 1 + randomFactor;
  const actualLength = baseLength * lengthFactor;

  const end = start.clone().add(direction.clone().multiplyScalar(actualLength));

  const id = generateId();
  const isLeaf = level === options.maxDepth - 1;
  const radius = Math.max(0.02, 0.08 * Math.pow(0.7, level));

  const growDelay = level === 0 ? 0 : 0.2 + level * 0.15;

  const branch: BranchData = {
    id,
    parentId,
    level,
    start: start.clone(),
    end: end.clone(),
    baseLength: actualLength,
    lengthFactor,
    radius,
    isLeaf,
    children: [],
    growProgress: 0,
    opacity: 0,
    pruneProgress: 0,
    isPruned: false,
    growDelay,
    initialLength: actualLength,
  };

  branches.set(id, branch);

  if (parentChildren) {
    parentChildren.push(id);
  }

  if (level < options.maxDepth - 1) {
    const angleRad = (options.branchAngle * Math.PI) / 180;

    const randomAngleOffset = options.randomStrength * 0.3 * (Math.random() * 2 - 1);

    const right = new THREE.Vector3()
      .crossVectors(direction, new THREE.Vector3(0, 1, 0))
      .normalize();
    if (right.lengthSq() < 0.01) {
      right.set(1, 0, 0);
    }

    const up = new THREE.Vector3().crossVectors(right, direction).normalize();

    const leftDir1 = rotateAroundAxis(
      direction,
      right,
      angleRad + randomAngleOffset
    ).normalize();
    const rightDir1 = rotateAroundAxis(
      direction,
      right,
      -angleRad - randomAngleOffset
    ).normalize();

    const twistAngle = (Math.random() - 0.5) * Math.PI * 0.5;
    const leftDir = rotateAroundAxis(leftDir1, direction, twistAngle).normalize();
    const rightDir = rotateAroundAxis(rightDir1, direction, -twistAngle).normalize();

    const childLength = baseLength * 0.7;

    generateBranchRecursive(
      id,
      level + 1,
      end,
      leftDir,
      childLength,
      options,
      branches,
      branch.children
    );
    generateBranchRecursive(
      id,
      level + 1,
      end,
      rightDir,
      childLength,
      options,
      branches,
      branch.children
    );
  }

  return id;
};

export const generatePlant = (options: GenerateOptions): BranchData[] => {
  const branches = new Map<string, BranchData>();
  const start = new THREE.Vector3(0, -1.5, 0);
  const direction = new THREE.Vector3(0, 1, 0);
  const baseLength = options.baseLength ?? 1.2;

  generateBranchRecursive(null, 0, start, direction, baseLength, options, branches, null);

  return Array.from(branches.values());
};

export const getBranchAndChildren = (
  branchId: string,
  branches: BranchData[]
): BranchData[] => {
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const result: BranchData[] = [];

  const collect = (id: string) => {
    const branch = branchMap.get(id);
    if (branch) {
      result.push(branch);
      branch.children.forEach(collect);
    }
  };

  collect(branchId);
  return result;
};
