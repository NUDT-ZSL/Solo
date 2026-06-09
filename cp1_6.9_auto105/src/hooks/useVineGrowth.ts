import { useRef, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';
import {
  Vine, VineNode, Seed, CollisionEvent, SplitParticle, TrailParticle, GridFlash,
  generateId, getSeedColor, calculateBranchDirection, randomBranchAngle,
  checkCollision, calculateRepulsionDirection, getSunPosition,
  calculateLightIntensity, calculateLightBiasDirection, applyLightToColor,
  calculateVineThickness, offsetHue, easeOutCubic, getAnimationProgress,
  GROWTH_SPEED, BRANCH_LENGTH, MAX_VINES, MAX_NODES_PER_VINE,
  COLLISION_DISTANCE, COLLISION_OFFSET, COLLISION_DURATION, HALO_DURATION,
  INITIAL_VINE_RADIUS
} from '../utils/vineUtils';

export interface VineGrowthState {
  seeds: Seed[];
  vines: Vine[];
  collisions: CollisionEvent[];
  splitParticles: SplitParticle[];
  trailParticles: TrailParticle[];
  gridFlash: GridFlash | null;
  sunPosition: THREE.Vector3;
  totalVineCount: number;
  growthTime: number;
}

export function useVineGrowth() {
  const stateRef = useRef<VineGrowthState>({
    seeds: [],
    vines: [],
    collisions: [],
    splitParticles: [],
    trailParticles: [],
    gridFlash: null,
    sunPosition: new THREE.Vector3(100, 50, 0),
    totalVineCount: 0,
    growthTime: 0
  });

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const startTimeRef = useRef<number>(performance.now() / 1000);
  const lastFrameTimeRef = useRef<number>(performance.now() / 1000);
  const branchTrackerRef = useRef<Map<string, number>>(new Map());

  const placeSeed = useCallback((worldX: number, worldZ: number) => {
    const now = performance.now() / 1000;
    const { color, hue } = getSeedColor(worldX, worldZ);
    const seed: Seed = {
      id: generateId(),
      position: new THREE.Vector3(worldX, 0, worldZ),
      color,
      baseHue: hue,
      plantedAt: now,
      vineStarted: false
    };
    stateRef.current.seeds.push(seed);
    stateRef.current.gridFlash = { startTime: now, duration: 0.3 };
    forceUpdate();
  }, [forceUpdate]);

  const createVine = useCallback((
    seed: Seed,
    startPosition: THREE.Vector3,
    startDirection: THREE.Vector3,
    baseHue: number,
    radius: number = INITIAL_VINE_RADIUS
  ): Vine | null => {
    if (stateRef.current.vines.length >= MAX_VINES) return null;

    const now = performance.now() / 1000;
    const vineId = generateId();

    const firstNode: VineNode = {
      id: generateId(),
      position: startPosition.clone(),
      direction: startDirection.clone().normalize(),
      radius,
      color: applyLightToColor(baseHue, 0.5),
      baseHue,
      createdAt: now,
      vineId
    };

    const vine: Vine = {
      id: vineId,
      seedId: seed.id,
      nodes: [firstNode],
      direction: startDirection.clone().normalize(),
      startPosition: startPosition.clone(),
      baseHue,
      length: 0,
      maxNodes: MAX_NODES_PER_VINE,
      active: true,
      growthStarted: true,
      startDelay: 0,
      startTime: now,
      radius
    };

    stateRef.current.vines.push(vine);
    stateRef.current.totalVineCount++;
    branchTrackerRef.current.set(vineId, 0);
    return vine;
  }, []);

  const addVineNode = useCallback((vine: Vine, deltaTime: number, sunPos: THREE.Vector3) => {
    if (!vine.active || vine.nodes.length >= vine.maxNodes) return;

    const lastNode = vine.nodes[vine.nodes.length - 1];
    const growthAmount = GROWTH_SPEED * deltaTime * 60;
    vine.length += growthAmount;

    const biasedDir = calculateLightBiasDirection(lastNode.direction, sunPos, lastNode.position);

    const lightIntensity = calculateLightIntensity(lastNode.position, biasedDir, sunPos);
    const newRadius = calculateVineThickness(lightIntensity, vine.radius);
    const newColor = applyLightToColor(vine.baseHue, lightIntensity);

    const newPosition = lastNode.position
      .clone()
      .add(biasedDir.clone().multiplyScalar(growthAmount));

    if (newPosition.y < 0) {
      newPosition.y = 0;
    }

    const now = performance.now() / 1000;
    const newNode: VineNode = {
      id: generateId(),
      position: newPosition,
      direction: biasedDir,
      radius: newRadius,
      color: newColor,
      baseHue: vine.baseHue,
      createdAt: now,
      vineId: vine.id
    };

    vine.nodes.push(newNode);

    for (let i = 0; i < 3; i++) {
      stateRef.current.trailParticles.push({
        id: generateId(),
        position: newPosition.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        )),
        color: newColor.clone(),
        radius: 0.2,
        startTime: now,
        duration: 0.5
      });
    }

    const currentBranches = branchTrackerRef.current.get(vine.id) || 0;
    const expectedBranches = Math.floor(vine.length / BRANCH_LENGTH);
    if (expectedBranches > currentBranches && vine.radius >= 0.5) {
      branchTrackerRef.current.set(vine.id, expectedBranches);
      const branchAngle = randomBranchAngle();
      const branchDir = calculateBranchDirection(biasedDir, branchAngle);
      const branchHue = offsetHue(vine.baseHue, 20);
      const branchRadius = vine.radius * 0.5;

      const seed = stateRef.current.seeds.find(s => s.id === vine.seedId);
      if (seed) {
        createVine(seed, newPosition.clone(), branchDir, branchHue, branchRadius);
      }
    }
  }, [createVine]);

  const checkAllCollisions = useCallback(() => {
    const now = performance.now() / 1000;
    const allNodes: VineNode[] = [];

    for (const vine of stateRef.current.vines) {
      for (const node of vine.nodes) {
        allNodes.push(node);
      }
    }

    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const nodeA = allNodes[i];
        const nodeB = allNodes[j];

        if (nodeA.vineId === nodeB.vineId) continue;

        if (checkCollision(nodeA, nodeB, COLLISION_DISTANCE)) {
          const collisionExists = stateRef.current.collisions.some(
            c => ((c.nodeAId === nodeA.id && c.nodeBId === nodeB.id) ||
              (c.nodeAId === nodeB.id && c.nodeBId === nodeA.id)) &&
              (now - c.startTime) < HALO_DURATION
          );

          if (!collisionExists) {
            stateRef.current.collisions.push({
              id: generateId(),
              nodeAId: nodeA.id,
              nodeBId: nodeB.id,
              positionA: nodeA.position.clone(),
              positionB: nodeB.position.clone(),
              startTime: now,
              duration: HALO_DURATION
            });
          }

          const repulseDir = calculateRepulsionDirection(nodeA.position, nodeB.position);
          const collisionRecord = stateRef.current.collisions.find(
            c => ((c.nodeAId === nodeA.id && c.nodeBId === nodeB.id) ||
              (c.nodeAId === nodeB.id && c.nodeBId === nodeA.id))
          );
          const collisionStart = collisionRecord ? collisionRecord.startTime : now;
          const progress = Math.min(1, (now - collisionStart) / COLLISION_DURATION);
          const offsetAmount = COLLISION_OFFSET * easeOutCubic(Math.max(0, 1 - progress));

          nodeA.position.add(repulseDir.clone().multiplyScalar(offsetAmount * 0.1));
          nodeB.position.add(repulseDir.clone().multiplyScalar(-offsetAmount * 0.1));
        }
      }
    }
  }, []);

  const splitNode = useCallback((nodeId: string) => {
    const now = performance.now() / 1000;

    let targetNode: VineNode | null = null;
    let targetVine: Vine | null = null;

    for (const vine of stateRef.current.vines) {
      for (const node of vine.nodes) {
        if (node.id === nodeId) {
          targetNode = node;
          targetVine = vine;
          break;
        }
      }
      if (targetNode) break;
    }

    if (!targetNode || !targetVine) return;

    const vine = targetVine;
    const node = targetNode;

    for (let i = 0; i < 10; i++) {
      const velocity = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize().multiplyScalar(5 + Math.random() * 5);

      stateRef.current.splitParticles.push({
        id: generateId(),
        position: node.position.clone(),
        velocity,
        color: node.color.clone(),
        radius: 0.3,
        startTime: now,
        duration: 1
      });
    }

    const parentDir = node.direction.clone();
    const seed = stateRef.current.seeds.find(s => s.id === vine.seedId);
    if (!seed) return;

    const leftDir = calculateBranchDirection(parentDir, -30);
    const rightDir = calculateBranchDirection(parentDir, 30);
    const splitHue = offsetHue(vine.baseHue, 10);

    const splitRadius = vine.radius * 0.8;

    createVine(seed, node.position.clone(), leftDir, splitHue, splitRadius);
    createVine(seed, node.position.clone(), rightDir, splitHue, splitRadius);

    stateRef.current.gridFlash = { startTime: now, duration: 0.3 };
    forceUpdate();
  }, [createVine, forceUpdate]);

  const update = useCallback(() => {
    const now = performance.now() / 1000;
    const elapsed = now - startTimeRef.current;
    stateRef.current.growthTime = elapsed;

    const sunPos = getSunPosition(elapsed);
    stateRef.current.sunPosition = sunPos;

    for (const seed of stateRef.current.seeds) {
      if (!seed.vineStarted && now - seed.plantedAt >= 1) {
        seed.vineStarted = true;
        const initialDir = new THREE.Vector3(
          Math.random() - 0.5,
          1,
          Math.random() - 0.5
        ).normalize();
        createVine(seed, seed.position.clone(), initialDir, seed.baseHue, INITIAL_VINE_RADIUS);
      }
    }

    const deltaTime = Math.min(now - lastFrameTimeRef.current, 0.1);
    lastFrameTimeRef.current = now;

    for (const vine of stateRef.current.vines) {
      addVineNode(vine, deltaTime, sunPos);
    }

    checkAllCollisions();

    const activeCollisions: CollisionEvent[] = [];
    for (const c of stateRef.current.collisions) {
      if (now - c.startTime < Math.max(c.duration, COLLISION_DURATION)) {
        activeCollisions.push(c);
      }
    }
    stateRef.current.collisions = activeCollisions;

    const activeSplitParticles: SplitParticle[] = [];
    for (const p of stateRef.current.splitParticles) {
      const progress = getAnimationProgress(p.startTime, p.duration, now);
      if (progress < 1) {
        p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
        activeSplitParticles.push(p);
      }
    }
    stateRef.current.splitParticles = activeSplitParticles;

    const activeTrailParticles: TrailParticle[] = [];
    for (const p of stateRef.current.trailParticles) {
      if (now - p.startTime < p.duration) {
        activeTrailParticles.push(p);
      }
    }
    stateRef.current.trailParticles = activeTrailParticles;

    if (stateRef.current.gridFlash) {
      if (now - stateRef.current.gridFlash.startTime >= stateRef.current.gridFlash.duration) {
        stateRef.current.gridFlash = null;
      }
    }

    forceUpdate();
  }, [addVineNode, checkAllCollisions, createVine, forceUpdate]);

  useEffect(() => {
    let frameId: number;
    let running = true;

    const animate = () => {
      if (!running) return;
      update();
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, [update]);

  return {
    state: stateRef.current,
    placeSeed,
    splitNode
  };
}
