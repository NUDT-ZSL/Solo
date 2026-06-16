import * as THREE from 'three';
import { SceneRenderer, SegmentData, ParticleData } from './SceneRenderer';

export type PlantType = 'wheat' | 'corn' | 'sunflower';

export interface SimData {
  elapsedTime: number;
  mainRootLength: number;
  lateralRootCount: number;
  nutrientPercent: number;
  waterPercent: number;
  stopped: boolean;
}

interface RootTip {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  isMainRoot: boolean;
  nextBranchingLength: number;
  totalLengthFromBranch: number;
}

const GROWTH_SPEED_PER_SECOND = 0.02;
const MAX_GROWTH_TIME = 60;
const COLLISION_RADIUS = 0.08;
const SEGMENT_LENGTH_BASE = 0.02;

export class RootSimulator {
  private plantType: PlantType | null = null;
  private renderer: SceneRenderer;
  private running = false;
  private paused = false;
  private elapsedTime = 0;
  private rootTips: RootTip[] = [];
  private mainRootLength = 0;
  private lateralRootCount = 0;

  private plantConfig: Record<PlantType, {
    mainRootAngleJitter: number;
    lateralBranchInterval: number;
    lateralBranchAngleMin: number;
    lateralBranchAngleMax: number;
    maxLateralBranchDepth: number;
    segmentJitter: number;
  }> = {
    wheat: {
      mainRootAngleJitter: 0.05,
      lateralBranchInterval: 0.25,
      lateralBranchAngleMin: 30,
      lateralBranchAngleMax: 60,
      maxLateralBranchDepth: 2,
      segmentJitter: 0.1,
    },
    corn: {
      mainRootAngleJitter: 0.08,
      lateralBranchInterval: 0.2,
      lateralBranchAngleMin: 35,
      lateralBranchAngleMax: 55,
      maxLateralBranchDepth: 3,
      segmentJitter: 0.15,
    },
    sunflower: {
      mainRootAngleJitter: 0.12,
      lateralBranchInterval: 0.3,
      lateralBranchAngleMin: 30,
      lateralBranchAngleMax: 60,
      maxLateralBranchDepth: 2,
      segmentJitter: 0.18,
    },
  };

  private branchDepth: Map<number, number> = new Map();

  constructor(renderer: SceneRenderer) {
    this.renderer = renderer;
  }

  startTick(plantType: PlantType) {
    this.reset();
    this.plantType = plantType;
    this.running = true;
    this.paused = false;

    const seedPos = new THREE.Vector3(0, 0, 0);
    this.rootTips.push({
      position: seedPos.clone(),
      direction: new THREE.Vector3(0, -1, 0),
      isMainRoot: true,
      nextBranchingLength: this.plantConfig[plantType].lateralBranchInterval,
      totalLengthFromBranch: 0,
    });
    this.branchDepth.set(0, 0);
  }

  pauseTick() {
    this.paused = true;
  }

  resumeTick() {
    if (this.running) this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isRunning(): boolean {
    return this.running;
  }

  reset() {
    this.plantType = null;
    this.running = false;
    this.paused = false;
    this.elapsedTime = 0;
    this.rootTips = [];
    this.mainRootLength = 0;
    this.lateralRootCount = 0;
    this.branchDepth.clear();
    this.renderer.removeAllSegments();
    this.renderer.resetParticles();
  }

  private checkCollision(tip: THREE.Vector3, now: number): 'nutrient' | 'water' | null {
    const nearbyIndices = this.renderer.getNearbyParticles(tip);
    for (const idx of nearbyIndices) {
      const p = (this.renderer.getAllParticles() as ParticleData[])[idx];
      if (!p || !p.alive) continue;
      const dist = tip.distanceTo(p.position);
      if (dist < COLLISION_RADIUS) {
        this.renderer.absorbParticle(idx, now);
        this.renderer.setLastSegmentTipColor(
          p.type === 'nutrient' ? '#FFD700' : '#00BFFF',
          now + 500
        );
        return p.type;
      }
    }
    return null;
  }

  update(deltaTime: number) {
    if (!this.running || this.paused) return;
    if (!this.plantType) return;

    this.elapsedTime += deltaTime;
    if (this.elapsedTime >= MAX_GROWTH_TIME) {
      this.running = false;
      return;
    }

    const stepLength = GROWTH_SPEED_PER_SECOND * deltaTime;
    const config = this.plantConfig[this.plantType];
    const now = performance.now();

    const newTips: RootTip[] = [];
    const toRemove: number[] = [];

    for (let t = 0; t < this.rootTips.length; t++) {
      const tip = this.rootTips[t];
      if (!this.renderer.canAddSegment()) {
        this.running = false;
        break;
      }

      const jitterX = (Math.random() - 0.5) * config.segmentJitter;
      const jitterZ = (Math.random() - 0.5) * config.segmentJitter;
      const jitterY = (Math.random() - 0.5) * (tip.isMainRoot ? config.mainRootAngleJitter : 0.2);

      const growDir = tip.direction.clone().normalize();
      growDir.x += jitterX;
      growDir.z += jitterZ;
      growDir.y += jitterY;
      if (growDir.y > 0) growDir.y = -Math.abs(growDir.y) * 0.3;
      growDir.normalize();

      const startPos = tip.position.clone();
      const endPos = tip.position.clone().add(growDir.clone().multiplyScalar(stepLength));

      if (endPos.y < -2.95) {
        endPos.y = -2.95;
      }
      endPos.x = Math.max(-2.9, Math.min(2.9, endPos.x));
      endPos.z = Math.max(-2.9, Math.min(2.9, endPos.z));

      const segLen = startPos.distanceTo(endPos);

      const added = this.renderer.addSegment(startPos, endPos, now, tip.isMainRoot);
      if (!added) continue;

      if (tip.isMainRoot) {
        this.mainRootLength += segLen;
      }

      this.checkCollision(endPos, now);

      tip.position.copy(endPos);
      tip.direction.copy(growDir);
      tip.totalLengthFromBranch += segLen;

      const depth = this.branchDepth.get(t) || 0;
      if (
        tip.totalLengthFromBranch >= tip.nextBranchingLength &&
        depth < config.maxLateralBranchDepth
      ) {
        tip.totalLengthFromBranch = 0;
        tip.nextBranchingLength =
          config.lateralBranchInterval * (0.8 + Math.random() * 0.4);

        const branchAngle =
          ((config.lateralBranchAngleMin +
            Math.random() * (config.lateralBranchAngleMax - config.lateralBranchAngleMin)) *
            Math.PI) /
          180;

        const perp1 = new THREE.Vector3(1, 0, 0);
        if (Math.abs(growDir.dot(perp1)) > 0.9) {
          perp1.set(0, 1, 0);
        }
        const tangent = new THREE.Vector3().crossVectors(growDir, perp1).normalize();
        const bitangent = new THREE.Vector3().crossVectors(growDir, tangent).normalize();

        const rotAngle = Math.random() * Math.PI * 2;
        const radialDir = new THREE.Vector3()
          .addScaledVector(tangent, Math.cos(rotAngle))
          .addScaledVector(bitangent, Math.sin(rotAngle))
          .normalize();

        const branchDir = new THREE.Vector3()
          .addScaledVector(growDir, Math.cos(branchAngle))
          .addScaledVector(radialDir, Math.sin(branchAngle))
          .normalize();

        if (branchDir.y > 0) branchDir.y = -Math.abs(branchDir.y) * 0.2;
        branchDir.normalize();

        const newTipIdx = this.rootTips.length + newTips.length;
        newTips.push({
          position: endPos.clone(),
          direction: branchDir,
          isMainRoot: false,
          nextBranchingLength: config.lateralBranchInterval * 1.5,
          totalLengthFromBranch: 0,
        });
        this.branchDepth.set(newTipIdx, depth + 1);
        this.lateralRootCount++;
      }
    }

    this.rootTips = this.rootTips.concat(newTips);
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.rootTips.splice(toRemove[i], 1);
    }
  }

  getData(): SimData {
    const totalNutrient = this.renderer.getParticleCount('nutrient');
    const totalWater = this.renderer.getParticleCount('water');
    const absorbedNutrient = this.renderer.getAbsorbedParticleCount('nutrient');
    const absorbedWater = this.renderer.getAbsorbedParticleCount('water');

    const rawNutrientPct = totalNutrient > 0 ? (absorbedNutrient / totalNutrient) * 100 : 0;
    const rawWaterPct = totalWater > 0 ? (absorbedWater / totalWater) * 100 : 0;

    return {
      elapsedTime: this.elapsedTime,
      mainRootLength: this.mainRootLength,
      lateralRootCount: this.lateralRootCount,
      nutrientPercent: Math.min(100, rawNutrientPct),
      waterPercent: Math.min(100, rawWaterPct),
      stopped: !this.running,
    };
  }
}
