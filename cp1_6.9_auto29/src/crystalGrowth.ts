import * as THREE from 'three';

export interface CrystalNode {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  parentId: number | null;
  childrenIds: number[];
  depth: number;
  thickness: number;
  opacity: number;
  color: THREE.Color;
  isActive: boolean;
  isBlinking: boolean;
  blinkPhase: number;
  noisePoints: THREE.Vector3[];
  isExploded: boolean;
}

export interface GrowthState {
  nodes: Map<number, CrystalNode>;
  activeTips: number[];
  totalBranches: number;
  growthTime: number;
  growthDuration: number;
  isGrowing: boolean;
  blinkingPhase: number;
  blinkStartTime: number;
  isBlinking: boolean;
}

const MAX_BRANCHES = 120;
const MIN_BRANCHES = 80;
const GROWTH_DURATION = 30;
const MIN_SEGMENT_LENGTH = 0.05;
const MAX_SEGMENT_LENGTH = 0.1;
const ANGLE_DEVIATION = (30 * Math.PI) / 180;
const BRANCH_PROBABILITY = 0.2;
const ROOT_THICKNESS = 0.08;
const TIP_THICKNESS = 0.02;
const ROOT_OPACITY = 0.9;
const TIP_OPACITY = 0.6;
const NOISE_DENSITY = 0.15;
const NOISE_SIZE = 0.01;

const COLOR_NORTH = new THREE.Color('#4A90D9');
const COLOR_SOUTH = new THREE.Color('#E74C3C');
const COLOR_WEST = new THREE.Color('#2ECC71');
const COLOR_EAST = new THREE.Color('#9B59B6');

let nextNodeId = 0;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getDirectionColor(direction: THREE.Vector3, depth: number, maxDepth: number): THREE.Color {
  const normalized = direction.clone().normalize();
  const color = new THREE.Color(0x000000);
  
  const y = normalized.y;
  const x = normalized.x;
  
  const northWeight = Math.max(0, y);
  const southWeight = Math.max(0, -y);
  const eastWeight = Math.max(0, x);
  const westWeight = Math.max(0, -x);
  
  const totalWeight = northWeight + southWeight + eastWeight + westWeight;
  
  if (totalWeight > 0) {
    color.r = (
      COLOR_NORTH.r * northWeight +
      COLOR_SOUTH.r * southWeight +
      COLOR_EAST.r * eastWeight +
      COLOR_WEST.r * westWeight
    ) / totalWeight;
    color.g = (
      COLOR_NORTH.g * northWeight +
      COLOR_SOUTH.g * southWeight +
      COLOR_EAST.g * eastWeight +
      COLOR_WEST.g * westWeight
    ) / totalWeight;
    color.b = (
      COLOR_NORTH.b * northWeight +
      COLOR_SOUTH.b * southWeight +
      COLOR_EAST.b * eastWeight +
      COLOR_WEST.b * westWeight
    ) / totalWeight;
  } else {
    color.copy(COLOR_NORTH);
  }
  
  const depthFactor = 1 - (depth / maxDepth) * 0.2;
  color.r = Math.min(1, color.r * depthFactor + 0.05);
  color.g = Math.min(1, color.g * depthFactor + 0.05);
  color.b = Math.min(1, color.b * depthFactor + 0.05);
  
  return color;
}

function deviateDirection(direction: THREE.Vector3): THREE.Vector3 {
  const result = direction.clone().normalize();
  
  const axis = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  
  const angle = randomRange(-ANGLE_DEVIATION, ANGLE_DEVIATION);
  result.applyAxisAngle(axis, angle);
  
  return result.normalize();
}

function generateNoisePoints(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segmentLength = start.distanceTo(end);
  const pointCount = Math.floor(segmentLength * NOISE_DENSITY * 100);
  
  for (let i = 0; i < pointCount; i++) {
    const t = Math.random();
    const base = new THREE.Vector3().lerpVectors(start, end, t);
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * NOISE_SIZE * 2,
      (Math.random() - 0.5) * NOISE_SIZE * 2,
      (Math.random() - 0.5) * NOISE_SIZE * 2
    );
    points.push(base.add(offset));
  }
  
  return points;
}

export function createGrowthState(): GrowthState {
  const state: GrowthState = {
    nodes: new Map(),
    activeTips: [],
    totalBranches: 0,
    growthTime: 0,
    growthDuration: GROWTH_DURATION,
    isGrowing: true,
    blinkingPhase: 0,
    blinkStartTime: 0,
    isBlinking: false
  };
  
  const rootDirection = new THREE.Vector3(
    (Math.random() - 0.5) * 0.3,
    1,
    (Math.random() - 0.5) * 0.3
  ).normalize();
  
  const rootNode: CrystalNode = {
    id: nextNodeId++,
    start: new THREE.Vector3(0, 0, 0),
    end: new THREE.Vector3().copy(rootDirection).multiplyScalar(randomRange(MIN_SEGMENT_LENGTH, MAX_SEGMENT_LENGTH)),
    direction: rootDirection,
    parentId: null,
    childrenIds: [],
    depth: 0,
    thickness: ROOT_THICKNESS,
    opacity: ROOT_OPACITY,
    color: getDirectionColor(rootDirection, 0, 10),
    isActive: true,
    isBlinking: false,
    blinkPhase: 0,
    noisePoints: [],
    isExploded: false
  };
  
  rootNode.noisePoints = generateNoisePoints(rootNode.start, rootNode.end);
  
  state.nodes.set(rootNode.id, rootNode);
  state.activeTips.push(rootNode.id);
  state.totalBranches = 1;
  
  return state;
}

export function updateGrowth(state: GrowthState, deltaTime: number): void {
  if (state.isGrowing) {
    state.growthTime += deltaTime;
    const progress = state.growthTime / state.growthDuration;
    
    const maxDepth = 12;
    const segmentsPerFrame = Math.max(1, Math.ceil(3 * deltaTime * 60));
    
    for (let seg = 0; seg < segmentsPerFrame; seg++) {
      if (state.totalBranches >= MAX_BRANCHES) break;
      if (progress >= 1 && state.totalBranches >= MIN_BRANCHES) break;
      
      const newTips: number[] = [];
      const tipsToProcess = [...state.activeTips];
      
      for (const tipId of tipsToProcess) {
        const tip = state.nodes.get(tipId);
        if (!tip || !tip.isActive || tip.isExploded) continue;
        if (state.totalBranches >= MAX_BRANCHES) break;
        
        const newDirection = deviateDirection(tip.direction);
        const newLength = randomRange(MIN_SEGMENT_LENGTH, MAX_SEGMENT_LENGTH);
        const newStart = tip.end.clone();
        const newEnd = newStart.clone().add(newDirection.clone().multiplyScalar(newLength));
        
        const newDepth = tip.depth + 1;
        const depthFactor = Math.min(1, newDepth / maxDepth);
        const newThickness = ROOT_THICKNESS - (ROOT_THICKNESS - TIP_THICKNESS) * depthFactor;
        const newOpacity = ROOT_OPACITY - (ROOT_OPACITY - TIP_OPACITY) * depthFactor;
        const newColor = getDirectionColor(newDirection, newDepth, maxDepth);
        
        const newNode: CrystalNode = {
          id: nextNodeId++,
          start: newStart,
          end: newEnd,
          direction: newDirection,
          parentId: tipId,
          childrenIds: [],
          depth: newDepth,
          thickness: Math.max(TIP_THICKNESS, newThickness),
          opacity: Math.max(TIP_OPACITY, newOpacity),
          color: newColor,
          isActive: true,
          isBlinking: false,
          blinkPhase: 0,
          noisePoints: [],
          isExploded: false
        };
        
        newNode.noisePoints = generateNoisePoints(newNode.start, newNode.end);
        
        state.nodes.set(newNode.id, newNode);
        tip.childrenIds.push(newNode.id);
        state.totalBranches++;
        newTips.push(newNode.id);
        
        if (Math.random() < BRANCH_PROBABILITY && state.totalBranches < MAX_BRANCHES - 1 && newDepth < maxDepth - 1) {
          const branchDirection = deviateDirection(tip.direction);
          const perpAxis = new THREE.Vector3().crossVectors(newDirection, branchDirection).normalize();
          if (perpAxis.lengthSq() < 0.01) {
            perpAxis.set(1, 0, 0);
          }
          const finalBranchDirection = branchDirection.clone().applyAxisAngle(perpAxis, randomRange(-ANGLE_DEVIATION, ANGLE_DEVIATION)).normalize();
          
          const branchLength = randomRange(MIN_SEGMENT_LENGTH, MAX_SEGMENT_LENGTH);
          const branchEnd = newStart.clone().add(finalBranchDirection.clone().multiplyScalar(branchLength));
          
          const branchNode: CrystalNode = {
            id: nextNodeId++,
            start: newStart.clone(),
            end: branchEnd,
            direction: finalBranchDirection,
            parentId: tipId,
            childrenIds: [],
            depth: newDepth,
            thickness: Math.max(TIP_THICKNESS, newThickness * 0.9),
            opacity: Math.max(TIP_OPACITY, newOpacity),
            color: getDirectionColor(finalBranchDirection, newDepth, maxDepth),
            isActive: true,
            isBlinking: false,
            blinkPhase: 0,
            noisePoints: [],
            isExploded: false
          };
          
          branchNode.noisePoints = generateNoisePoints(branchNode.start, branchNode.end);
          
          state.nodes.set(branchNode.id, branchNode);
          tip.childrenIds.push(branchNode.id);
          state.totalBranches++;
          newTips.push(branchNode.id);
        }
        
        tip.isActive = false;
      }
      
      state.activeTips = state.activeTips.filter(id => {
        const node = state.nodes.get(id);
        return node && node.isActive && !node.isExploded;
      });
      state.activeTips.push(...newTips);
    }
    
    if (progress >= 1 || state.totalBranches >= MAX_BRANCHES) {
      if (state.totalBranches >= MIN_BRANCHES || progress >= 1.2) {
        state.isGrowing = false;
        state.isBlinking = true;
        state.blinkStartTime = state.growthTime;
        state.blinkingPhase = 0;
        
        for (const tipId of state.activeTips) {
          const tip = state.nodes.get(tipId);
          if (tip) {
            tip.isBlinking = true;
          }
        }
      }
    }
  }
  
  if (state.isBlinking) {
    const blinkElapsed = state.growthTime - state.blinkStartTime;
    const blinkCycle = 0.4;
    const totalBlinkTime = 3 * 0.4;
    
    if (blinkElapsed >= totalBlinkTime) {
      state.isBlinking = false;
      for (const tipId of state.activeTips) {
        const tip = state.nodes.get(tipId);
        if (tip) {
          tip.isBlinking = false;
          tip.blinkPhase = 0;
        }
      }
    } else {
      const phaseInCycle = (blinkElapsed % blinkCycle) / blinkCycle;
      const blinkOpacity = phaseInCycle < 0.5 
        ? 1.0 - (phaseInCycle / 0.5) * 0.7 
        : 0.3 + ((phaseInCycle - 0.5) / 0.5) * 0.7;
      
      for (const tipId of state.activeTips) {
        const tip = state.nodes.get(tipId);
        if (tip) {
          tip.blinkPhase = blinkOpacity;
        }
      }
    }
  }
}

export function getBranchesForRendering(state: GrowthState): CrystalNode[] {
  return Array.from(state.nodes.values()).filter(n => !n.isExploded);
}

export function getProgress(state: GrowthState): number {
  const timeProgress = state.growthTime / state.growthDuration;
  const branchProgress = state.totalBranches / ((MIN_BRANCHES + MAX_BRANCHES) / 2);
  return Math.min(1, Math.max(timeProgress, branchProgress));
}

export function markBranchExploded(state: GrowthState, nodeId: number): number[] {
  const explodedIds: number[] = [];
  const stack: number[] = [nodeId];
  
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const node = state.nodes.get(currentId);
    if (!node || node.isExploded) continue;
    
    node.isExploded = true;
    explodedIds.push(currentId);
    
    for (const childId of node.childrenIds) {
      stack.push(childId);
    }
  }
  
  state.activeTips = state.activeTips.filter(id => !explodedIds.includes(id));
  state.totalBranches = Array.from(state.nodes.values()).filter(n => !n.isExploded).length;
  
  return explodedIds;
}
