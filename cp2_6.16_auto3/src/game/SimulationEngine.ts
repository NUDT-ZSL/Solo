export type ArchType = 'semicircular' | 'pointed' | 'horseshoe';

export interface Block {
  id: number;
  centerX: number;
  centerY: number;
  originalCenterX: number;
  originalCenterY: number;
  width: number;
  height: number;
  angle: number;
  originalAngle: number;
  axialForce: number;
  bendingMoment: number;
  shearForce: number;
  stressTop: number;
  stressBottom: number;
  maxStress: number;
  stressAngle: number;
  frictionForce: number;
  displacementX: number;
  displacementY: number;
  rotation: number;
  cracked: boolean;
  crackList: Crack[];
  failed: boolean;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  debris: Debris[];
}

export interface Crack {
  x: number;
  y: number;
  length: number;
  angle: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  angularVel: number;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export interface SimulationState {
  archType: ArchType;
  span: number;
  compressiveStrength: number;
  elasticModulus: number;
  load: number;
  blocks: Block[];
  collapseState: 'stable' | 'cracking' | 'collapsing' | 'collapsed';
  collapseTimer: number;
  consecutiveCracked: number;
  firstCrackedBlocks: number[];
  dustParticles: DustParticle[];
  displayLoad: number;
  displayDisplacement: number;
  displayRotation: number;
  displaySafetyFactor: number;
  testStartTime: number;
  theoreticalLimitLoad: number;
}

export interface SimulationSnapshot {
  archType: ArchType;
  span: number;
  compressiveStrength: number;
  elasticModulus: number;
  load: number;
  displacement: number;
  maxRotation: number;
  safetyFactor: number;
  collapsed: boolean;
  failureMode: string;
  crackedBlockCount: number;
  crackedBlockIds: number[];
  testDuration: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BASE_Y = 520;
const BLOCK_COUNT_BASE = 25;
const GRAVITY = 9.81;
const BLOCK_DENSITY = 2400;
const FRICTION_COEFFICIENT = 0.6;

export class SimulationEngine {
  private state: SimulationState;
  private audioContext: AudioContext | null = null;
  private canvasWidth: number = CANVAS_WIDTH;
  private canvasHeight: number = CANVAS_HEIGHT;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): SimulationState {
    return {
      archType: 'semicircular',
      span: 400,
      compressiveStrength: 50,
      elasticModulus: 30,
      load: 0,
      blocks: [],
      collapseState: 'stable',
      collapseTimer: 0,
      consecutiveCracked: 0,
      firstCrackedBlocks: [],
      dustParticles: [],
      displayLoad: 0,
      displayDisplacement: 0,
      displayRotation: 0,
      displaySafetyFactor: 1,
      testStartTime: 0,
      theoreticalLimitLoad: 0
    };
  }

  setArchType(type: ArchType): void {
    this.state.archType = type;
    this.resetLoadAndState();
    this.generateBlocks();
    this.calculateTheoreticalLimit();
  }

  setSpan(span: number): void {
    this.state.span = span;
    this.resetLoadAndState();
    this.generateBlocks();
    this.calculateTheoreticalLimit();
  }

  setCompressiveStrength(strength: number): void {
    this.state.compressiveStrength = strength;
    this.resetLoadAndState();
    this.generateBlocks();
    this.calculateTheoreticalLimit();
  }

  setElasticModulus(modulus: number): void {
    this.state.elasticModulus = modulus;
    this.resetLoadAndState();
    this.generateBlocks();
    this.calculateTheoreticalLimit();
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.generateBlocks();
    this.calculateTheoreticalLimit();
  }

  private resetLoadAndState(): void {
    this.state.load = 0;
    this.state.collapseState = 'stable';
    this.state.collapseTimer = 0;
    this.state.consecutiveCracked = 0;
    this.state.firstCrackedBlocks = [];
    this.state.dustParticles = [];
    this.state.testStartTime = 0;
  }

  reset(): void {
    this.resetLoadAndState();
    this.generateBlocks();
    this.calculateTheoreticalLimit();
  }

  addLoad(amount: number): void {
    if (this.state.collapseState === 'collapsing' || this.state.collapseState === 'collapsed') {
      return;
    }
    if (this.state.testStartTime === 0) {
      this.state.testStartTime = performance.now();
    }
    this.state.load += amount;
  }

  private calculateTheoreticalLimit(): void {
    const halfSpan = this.state.span / 2000;
    const rise = this.calculateRise() / 1000;
    const strengthPa = this.state.compressiveStrength * 1e6;
    const blockArea = 0.035 * 0.05;
    const blockCount = BLOCK_COUNT_BASE;

    let archFactor: number;
    switch (this.state.archType) {
      case 'semicircular':
        archFactor = 1.0;
        break;
      case 'pointed':
        archFactor = 1.25;
        break;
      case 'horseshoe':
        archFactor = 0.85;
        break;
      default:
        archFactor = 1.0;
    }

    const totalBlockStrength = strengthPa * blockArea * blockCount * 0.3;
    const momentResistance = (strengthPa * blockArea * blockCount * 0.05) / halfSpan;
    const geometricFactor = rise / halfSpan;

    this.state.theoreticalLimitLoad =
      (totalBlockStrength * 0.4 + momentResistance * 0.6) *
      archFactor *
      (0.5 + geometricFactor * 0.5);
  }

  private generateBlocks(): void {
    const blocks: Block[] = [];
    const centerX = this.canvasWidth / 2;
    const baseY = BASE_Y;
    const span = this.state.span;
    const halfSpan = span / 2;
    const blockCount = BLOCK_COUNT_BASE;
    const rise = this.calculateRise();
    const blockHeight = 35;

    for (let i = 0; i < blockCount; i++) {
      const t = i / (blockCount - 1);
      const archPoint = this.getArchPoint(t, centerX, baseY, halfSpan, rise);
      const archPointPrev = this.getArchPoint(Math.max(0, t - 0.001), centerX, baseY, halfSpan, rise);
      const archPointNext = this.getArchPoint(Math.min(1, t + 0.001), centerX, baseY, halfSpan, rise);

      const tangentX = archPointNext.x - archPointPrev.x;
      const tangentY = archPointNext.y - archPointPrev.y;
      const tangentMag = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
      const normalX = -tangentY / tangentMag;
      const normalY = tangentX / tangentMag;

      const centerOffset = blockHeight / 2;
      const cx = archPoint.x + normalX * centerOffset;
      const cy = archPoint.y + normalY * centerOffset;
      const angle = Math.atan2(tangentY, tangentX);

      const archLength = this.calculateArchLength(halfSpan, rise);
      const blockWidth = archLength / blockCount + 2;

      blocks.push({
        id: i,
        centerX: cx,
        centerY: cy,
        originalCenterX: cx,
        originalCenterY: cy,
        width: blockWidth,
        height: blockHeight,
        angle: angle,
        originalAngle: angle,
        axialForce: 0,
        bendingMoment: 0,
        shearForce: 0,
        stressTop: 0,
        stressBottom: 0,
        maxStress: 0,
        stressAngle: angle,
        frictionForce: 0,
        displacementX: 0,
        displacementY: 0,
        rotation: 0,
        cracked: false,
        crackList: [],
        failed: false,
        velocityX: 0,
        velocityY: 0,
        angularVelocity: 0,
        debris: []
      });
    }

    this.state.blocks = blocks;
  }

  private calculateRise(): number {
    const halfSpan = this.state.span / 2;
    switch (this.state.archType) {
      case 'semicircular':
        return halfSpan;
      case 'pointed':
        return halfSpan * 1.3;
      case 'horseshoe':
        return halfSpan * 0.85;
      default:
        return halfSpan;
    }
  }

  private getArchPoint(
    t: number,
    centerX: number,
    baseY: number,
    halfSpan: number,
    rise: number
  ): { x: number; y: number } {
    switch (this.state.archType) {
      case 'semicircular': {
        const r = halfSpan;
        const theta = Math.PI * t;
        return {
          x: centerX - r * Math.cos(theta),
          y: baseY - r * Math.sin(theta)
        };
      }
      case 'pointed': {
        const theta = Math.PI * t;
        if (t <= 0.5) {
          const r = halfSpan * 1.2071;
          const cx = centerX - halfSpan * 0.2071;
          return {
            x: cx - r * Math.cos(Math.PI * 0.5 + (theta - Math.PI * 0.25)),
            y: baseY + halfSpan * 0.2071 - r * Math.sin(Math.PI * 0.5 + (theta - Math.PI * 0.25))
          };
        } else {
          const r = halfSpan * 1.2071;
          const cx = centerX + halfSpan * 0.2071;
          return {
            x: cx - r * Math.cos(Math.PI * 0.5 - (Math.PI - theta - Math.PI * 0.25)),
            y: baseY + halfSpan * 0.2071 - r * Math.sin(Math.PI * 0.5 - (Math.PI - theta - Math.PI * 0.25))
          };
        }
      }
      case 'horseshoe': {
        const r = halfSpan * 1.1;
        const theta = Math.PI * t;
        return {
          x: centerX - r * Math.cos(theta) * 0.88,
          y: baseY - r * Math.sin(theta) - halfSpan * 0.12
        };
      }
      default:
        return { x: centerX, y: baseY };
    }
  }

  private calculateArchLength(halfSpan: number, _rise: number): number {
    switch (this.state.archType) {
      case 'semicircular':
        return Math.PI * halfSpan;
      case 'pointed':
        return Math.PI * halfSpan * 1.18;
      case 'horseshoe':
        return Math.PI * halfSpan * 0.97;
      default:
        return Math.PI * halfSpan;
    }
  }

  update(deltaTime: number): void {
    const smoothFactor = 1 - Math.exp(-deltaTime / 0.1);
    this.state.displayLoad += (this.state.load - this.state.displayLoad) * smoothFactor;

    if (this.state.collapseState === 'collapsing' || this.state.collapseState === 'collapsed') {
      this.updateCollapse(deltaTime);
      return;
    }

    this.calculateForces();
    this.calculateStress();
    this.calculateDeformation();
    this.checkCracks();

    const { displacement, maxRotation, safetyFactor } = this.calculateMetrics();
    this.state.displayDisplacement += (displacement - this.state.displayDisplacement) * smoothFactor;
    this.state.displayRotation += (maxRotation - this.state.displayRotation) * smoothFactor;
    this.state.displaySafetyFactor += (safetyFactor - this.state.displaySafetyFactor) * smoothFactor;
  }

  private calculateForces(): void {
    const blocks = this.state.blocks;
    const n = blocks.length;
    if (n === 0) return;

    const load = this.state.load;
    const midIndex = Math.floor(n / 2);
    const rise = this.calculateRise();
    const halfSpan = this.state.span / 2;
    const spanRatio = rise / halfSpan;

    const totalBlockWeight = blocks.length * BLOCK_DENSITY * GRAVITY * 0.035 * 0.05 * 0.05;
    const verticalReaction = (load + totalBlockWeight) / 2;
    const horizontalThrust = verticalReaction / (2 * spanRatio + 0.5);

    let verticalShear = verticalReaction;
    let axialCompression = horizontalThrust;

    for (let i = 0; i < n; i++) {
      const normalizedPos = i / (n - 1);
      const localAngle = blocks[i].originalAngle;

      const blockWeight = BLOCK_DENSITY * GRAVITY * blocks[i].width * blocks[i].height * 0.0001;
      const localLoad = i === midIndex ? load * 0.6 : load * (0.4 / (n - 1));
      const totalVertical = blockWeight + localLoad;

      const cosA = Math.cos(localAngle);
      const sinA = Math.sin(localAngle);

      const shearComponent = verticalShear * sinA;
      const axialComponent = verticalShear * cosA;
      const thrustAxial = horizontalThrust * sinA;

      blocks[i].axialForce = Math.abs(axialCompression + axialComponent + thrustAxial);
      blocks[i].shearForce = Math.abs(shearComponent - horizontalThrust * cosA);

      const distanceRatio = Math.sin(normalizedPos * Math.PI);
      blocks[i].bendingMoment = verticalShear * halfSpan * 0.05 * distanceRatio * (1 - normalizedPos) * 2;

      const maxFriction = FRICTION_COEFFICIENT * blocks[i].axialForce;
      blocks[i].frictionForce = Math.min(maxFriction, Math.abs(blocks[i].shearForce));

      if (normalizedPos < 0.5) {
        verticalShear -= totalVertical * 0.9;
        axialCompression += blockWeight * 0.1;
      } else {
        verticalShear -= totalVertical * 0.9;
        if (i === n - 1) verticalShear = -verticalReaction;
      }
    }

    const quarterPoints = [Math.floor(n * 0.25), Math.floor(n * 0.75)];
    for (const qp of quarterPoints) {
      blocks[qp].bendingMoment *= 1.4;
    }
    blocks[0].bendingMoment *= 1.2;
    blocks[n - 1].bendingMoment *= 1.2;
  }

  private calculateStress(): void {
    const blocks = this.state.blocks;
    const strengthPa = this.state.compressiveStrength * 1e6;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockArea = block.width * block.height * 0.0001;
      const sectionModulus = (block.width * block.height * block.height) * 0.000001 / 6;

      const axialStress = block.axialForce / blockArea;
      const bendingStress = sectionModulus > 0 ? Math.abs(block.bendingMoment) / sectionModulus : 0;
      const shearStress = 1.5 * block.shearForce / blockArea;

      block.stressTop = axialStress + bendingStress;
      block.stressBottom = axialStress - bendingStress;
      block.maxStress = Math.max(Math.abs(block.stressTop), Math.abs(block.stressBottom), shearStress);

      block.stressAngle = block.originalAngle + (block.stressTop > block.stressBottom ? Math.PI / 2 : -Math.PI / 2);

      blocks[i].stressTop = block.stressTop / strengthPa;
      blocks[i].stressBottom = block.stressBottom / strengthPa;
      blocks[i].maxStress = block.maxStress / strengthPa;
    }
  }

  private calculateDeformation(): void {
    const blocks = this.state.blocks;
    if (blocks.length === 0) return;

    const modulusFactor = 30 / this.state.elasticModulus;
    const loadFactor = this.state.theoreticalLimitLoad > 0
      ? this.state.load / this.state.theoreticalLimitLoad
      : this.state.load / 50000;
    const midIndex = Math.floor(blocks.length / 2);

    const archTypeFactor = this.getArchTypeFactor();

    for (let i = 0; i < blocks.length; i++) {
      const normalizedPos = Math.abs(i - midIndex) / (blocks.length / 2);
      const deflectionCurve = Math.pow(Math.cos(normalizedPos * Math.PI * 0.5), 1.5);
      const sideSign = i < midIndex ? -1 : 1;

      const stressDeformation = blocks[i].maxStress * 0.5;
      const axialDeformation = (blocks[i].axialForce / (this.state.elasticModulus * 1e9)) * 1000;

      const dy = (loadFactor * modulusFactor * 35 * deflectionCurve + stressDeformation * 8 + axialDeformation * 0.3) * archTypeFactor;
      const dx = sideSign * loadFactor * modulusFactor * 10 * normalizedPos * (1 - normalizedPos) * archTypeFactor;
      const rotation = sideSign * (loadFactor * modulusFactor * 4 * (1 - normalizedPos * 0.7) + blocks[i].bendingMoment * 0.002);

      blocks[i].displacementX = dx;
      blocks[i].displacementY = dy;
      blocks[i].rotation = rotation;

      blocks[i].centerX = blocks[i].originalCenterX + dx;
      blocks[i].centerY = blocks[i].originalCenterY + dy;
      blocks[i].angle = blocks[i].originalAngle + rotation;

      if (blocks[i].cracked) {
        blocks[i].displacementX *= 1.6;
        blocks[i].displacementY *= 1.6;
      }
    }
  }

  private getArchTypeFactor(): number {
    switch (this.state.archType) {
      case 'semicircular':
        return 1.0;
      case 'pointed':
        return 0.82;
      case 'horseshoe':
        return 1.18;
      default:
        return 1.0;
    }
  }

  private checkCracks(): void {
    const blocks = this.state.blocks;
    let crackedThisFrame = 0;

    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].cracked && blocks[i].maxStress >= 1.0) {
        blocks[i].cracked = true;
        crackedThisFrame++;

        const crackCount = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < crackCount; c++) {
          const crackAngle = blocks[i].stressAngle + (Math.random() - 0.5) * 0.6;
          blocks[i].crackList.push({
            x: (Math.random() - 0.5) * blocks[i].width * 0.7,
            y: (Math.random() - 0.5) * blocks[i].height * 0.7,
            length: 10 + Math.random() * 10,
            angle: crackAngle
          });
        }

        if (this.state.firstCrackedBlocks.length < 3) {
          this.state.firstCrackedBlocks.push(i);
        }

        this.playCrackSound();
      }
    }

    if (crackedThisFrame > 0) {
      this.state.consecutiveCracked += crackedThisFrame;
      if (this.state.consecutiveCracked >= 3 && this.state.collapseState === 'stable') {
        this.startCollapse();
      }
    }
  }

  private startCollapse(): void {
    this.state.collapseState = 'collapsing';
    this.state.collapseTimer = 0;

    const blocks = this.state.blocks;
    const midIndex = Math.floor(blocks.length / 2);

    for (let i = 0; i < blocks.length; i++) {
      const distFromMid = Math.abs(i - midIndex) / (blocks.length / 2);
      const side = i < midIndex ? -1 : 1;
      const collapseWave = 1 - distFromMid * 0.4;

      blocks[i].velocityX = side * (20 + Math.random() * 60) * collapseWave;
      blocks[i].velocityY = -30 - Math.random() * 50 - (1 - collapseWave) * 30;
      blocks[i].angularVelocity = side * (1.5 + Math.random() * 4);
      blocks[i].failed = true;

      const debrisCount = 3 + Math.floor(Math.random() * 5);
      for (let d = 0; d < debrisCount; d++) {
        const dSide = Math.random() < 0.5 ? -1 : 1;
        blocks[i].debris.push({
          x: blocks[i].centerX + (Math.random() - 0.5) * blocks[i].width * 0.5,
          y: blocks[i].centerY + (Math.random() - 0.5) * blocks[i].height * 0.5,
          vx: dSide * (30 + Math.random() * 100) * collapseWave,
          vy: -40 - Math.random() * 100,
          size: 2 + Math.random() * 7,
          rotation: Math.random() * Math.PI * 2,
          angularVel: (Math.random() - 0.5) * 12
        });
      }
    }

    const rise = this.calculateRise();
    for (let p = 0; p < 80; p++) {
      this.state.dustParticles.push({
        x: this.canvasWidth / 2 + (Math.random() - 0.5) * this.state.span * 1.2,
        y: BASE_Y - rise * 0.4 + (Math.random() - 0.5) * rise,
        vx: (Math.random() - 0.5) * 80,
        vy: -10 - Math.random() * 50,
        size: 6 + Math.random() * 20,
        life: 0,
        maxLife: 1.2 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.4
      });
    }
  }

  private updateCollapse(deltaTime: number): void {
    this.state.collapseTimer += deltaTime;

    if (this.state.collapseTimer >= 2.0) {
      this.state.collapseState = 'collapsed';
    }

    const gravity = 450;
    const blocks = this.state.blocks;

    for (let i = 0; i < blocks.length; i++) {
      blocks[i].velocityY += gravity * deltaTime;
      blocks[i].velocityX *= 0.995;
      blocks[i].centerX += blocks[i].velocityX * deltaTime;
      blocks[i].centerY += blocks[i].velocityY * deltaTime;
      blocks[i].angle += blocks[i].angularVelocity * deltaTime;
      blocks[i].rotation = blocks[i].angle - blocks[i].originalAngle;

      if (blocks[i].centerY > BASE_Y + 40) {
        const impactVel = Math.abs(blocks[i].velocityY);
        blocks[i].velocityY *= -0.25;
        blocks[i].velocityX *= 0.7;
        blocks[i].angularVelocity *= 0.5;
        blocks[i].centerY = BASE_Y + 40;

        if (impactVel > 100) {
          for (let d = 0; d < 3; d++) {
            this.state.dustParticles.push({
              x: blocks[i].centerX + (Math.random() - 0.5) * 30,
              y: BASE_Y + 30,
              vx: (Math.random() - 0.5) * 40,
              vy: -20 - Math.random() * 30,
              size: 4 + Math.random() * 10,
              life: 0,
              maxLife: 0.8 + Math.random(),
              alpha: 0.3 + Math.random() * 0.3
            });
          }
        }
      }

      for (const d of blocks[i].debris) {
        d.vy += gravity * 1.3 * deltaTime;
        d.vx *= 0.99;
        d.x += d.vx * deltaTime;
        d.y += d.vy * deltaTime;
        d.rotation += d.angularVel * deltaTime;
      }
    }

    for (let i = this.state.dustParticles.length - 1; i >= 0; i--) {
      const p = this.state.dustParticles[i];
      p.life += deltaTime;
      p.vy += 20 * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.size += deltaTime * 15;
      p.alpha = Math.max(0, p.alpha * (1 - p.life / p.maxLife));

      if (p.life >= p.maxLife || p.alpha <= 0.01) {
        this.state.dustParticles.splice(i, 1);
      }
    }
  }

  private calculateMetrics(): {
    displacement: number;
    maxRotation: number;
    safetyFactor: number;
  } {
    const blocks = this.state.blocks;
    if (blocks.length === 0) {
      return { displacement: 0, maxRotation: 0, safetyFactor: 1 };
    }

    const midIndex = Math.floor(blocks.length / 2);
    const displacementMm = blocks[midIndex].displacementY * 0.5;

    let maxRotation = 0;
    let maxStress = 0;
    for (const b of blocks) {
      maxRotation = Math.max(maxRotation, Math.abs(b.rotation * 180 / Math.PI));
      maxStress = Math.max(maxStress, b.maxStress);
    }

    const safetyFactor = maxStress > 0 ? Math.max(0, 1 / maxStress) : 999;

    return {
      displacement: displacementMm,
      maxRotation,
      safetyFactor
    };
  }

  private playCrackSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const duration = 0.18;
      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const envelope = (Math.exp(-t * 25) * 0.6 + Math.exp(-t * 60) * 0.4) * (1 - t / duration);
        const crackle = (Math.random() * 2 - 1) * (Math.random() > 0.92 ? 1.5 : 1);
        data[i] = crackle * envelope * 0.35;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 1500;
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      source.stop(ctx.currentTime + duration);
    } catch (e) {
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawArch(ctx);
    this.drawStressOverlay(ctx);
    this.drawLoadIndicator(ctx);
    this.drawCracks(ctx);
    this.drawDebris(ctx);
    this.drawDust(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x <= this.canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= this.canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#2d333b';
    ctx.fillRect(0, BASE_Y + 20, this.canvasWidth, this.canvasHeight - BASE_Y - 20);
    ctx.fillStyle = '#3d444d';
    ctx.fillRect(0, BASE_Y + 15, this.canvasWidth, 8);

    const centerX = this.canvasWidth / 2;
    ctx.fillStyle = 'rgba(88, 166, 255, 0.08)';
    ctx.fillRect(centerX - this.state.span / 2, BASE_Y + 8, this.state.span, 10);
  }

  private getBlockColor(strength: number, modulus: number, cracked: boolean): string {
    if (cracked) {
      return '#ff4444';
    }
    const strengthNorm = (strength - 10) / 90;
    const modulusNorm = (modulus - 10) / 40;
    const t = (strengthNorm * 0.6 + modulusNorm * 0.4);

    const r = Math.floor(200 - t * 150);
    const g = Math.floor(200 - t * 100);
    const b = Math.floor(210 + t * 45);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawArch(ctx: CanvasRenderingContext2D): void {
    const blocks = this.state.blocks;
    const baseColor = this.getBlockColor(
      this.state.compressiveStrength,
      this.state.elasticModulus,
      false
    );

    for (const block of blocks) {
      ctx.save();
      ctx.translate(block.centerX, block.centerY);
      ctx.rotate(block.angle);

      const w = block.width;
      const h = block.height;

      if (block.cracked) {
        ctx.fillStyle = '#ff4444';
      } else {
        ctx.fillStyle = baseColor;
      }

      ctx.beginPath();
      const skew = 3;
      ctx.moveTo(-w / 2 + skew, -h / 2);
      ctx.lineTo(w / 2 - skew, -h / 2);
      ctx.lineTo(w / 2 + skew, h / 2);
      ctx.lineTo(-w / 2 - skew, h / 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = block.cracked ? '#cc3333' : '#0d1117';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!block.cracked) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 4, -h / 3);
        ctx.lineTo(w / 6, h / 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w / 5, -h / 4);
        ctx.lineTo(-w / 5, h / 5);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawStressOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.state.load < 100) return;

    const blocks = this.state.blocks;

    for (const block of blocks) {
      if (block.maxStress <= 0.05) continue;

      ctx.save();
      ctx.translate(block.centerX, block.centerY);
      ctx.rotate(block.angle);

      const stressNorm = Math.min(block.maxStress, 1.5);
      let color: string;
      if (stressNorm < 0.33) {
        const t = stressNorm / 0.33;
        color = `rgba(80, 140, 255, ${0.12 + t * 0.2})`;
      } else if (stressNorm < 0.66) {
        const t = (stressNorm - 0.33) / 0.33;
        color = `rgba(${Math.floor(80 + t * 120)}, ${Math.floor(180 + t * 50)}, ${Math.floor(140 - t * 80)}, ${0.22 + t * 0.18})`;
      } else {
        const t = (stressNorm - 0.66) / 0.34;
        color = `rgba(${Math.floor(200 + t * 55)}, ${Math.floor(180 - t * 130)}, ${Math.floor(60 - t * 20)}, ${0.28 + t * 0.25})`;
      }

      const w = block.width;
      const h = block.height;
      const skew = 3;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + skew, -h / 2);
      ctx.lineTo(w / 2 - skew, -h / 2);
      ctx.lineTo(w / 2 + skew, h / 2);
      ctx.lineTo(-w / 2 - skew, h / 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private drawLoadIndicator(ctx: CanvasRenderingContext2D): void {
    if (this.state.blocks.length === 0) return;

    const midIndex = Math.floor(this.state.blocks.length / 2);
    const topBlock = this.state.blocks[midIndex];
    const arrowX = topBlock.centerX;
    const arrowY = topBlock.centerY - topBlock.height / 2 - 30;

    if (this.state.displayLoad > 0) {
      const arrowSize = Math.min(45, 12 + this.state.displayLoad / 1500);

      ctx.strokeStyle = '#58a6ff';
      ctx.fillStyle = '#58a6ff';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY - arrowSize);
      ctx.lineTo(arrowX, arrowY + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY + 20);
      ctx.lineTo(arrowX - 11, arrowY + 5);
      ctx.lineTo(arrowX + 11, arrowY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e6edf3';
      const loadText = `${Math.round(this.state.displayLoad)} N`;
      ctx.fillText(loadText, arrowX, arrowY - arrowSize - 12);

      if (this.state.theoreticalLimitLoad > 0) {
        const ratio = this.state.displayLoad / this.state.theoreticalLimitLoad;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = ratio > 1 ? '#f85149' : '#8b949e';
        ctx.fillText(`极限: ${Math.round(this.state.theoreticalLimitLoad)}N`, arrowX, arrowY - arrowSize - 28);
      }
    }
  }

  private drawCracks(ctx: CanvasRenderingContext2D): void {
    const blocks = this.state.blocks;

    for (const block of blocks) {
      if (!block.cracked || block.crackList.length === 0) continue;

      ctx.save();
      ctx.translate(block.centerX, block.centerY);
      ctx.rotate(block.angle);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      for (const crack of block.crackList) {
        ctx.save();
        ctx.translate(crack.x, crack.y);
        ctx.rotate(crack.angle - block.angle);
        ctx.beginPath();
        ctx.moveTo(-crack.length / 2, 0);
        const midX = crack.length * (0.3 + Math.random() * 0.4) - crack.length / 2;
        ctx.quadraticCurveTo(midX, (Math.random() - 0.5) * 4, crack.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private drawDebris(ctx: CanvasRenderingContext2D): void {
    const blocks = this.state.blocks;
    const baseColor = this.getBlockColor(
      this.state.compressiveStrength,
      this.state.elasticModulus,
      false
    );

    for (const block of blocks) {
      for (const d of block.debris) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        ctx.fillStyle = block.cracked ? '#cc5555' : baseColor;
        ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
        ctx.strokeStyle = 'rgba(13, 17, 23, 0.8)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-d.size / 2, -d.size / 2, d.size, d.size);
        ctx.restore();
      }
    }
  }

  private drawDust(ctx: CanvasRenderingContext2D): void {
    for (const p of this.state.dustParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 170, 155, ${p.alpha * 0.55})`;
      ctx.fill();
    }
  }

  getState(): SimulationState {
    return this.state;
  }

  getSnapshot(): SimulationSnapshot {
    const blocks = this.state.blocks;
    const crackedIds = blocks.filter(b => b.cracked).map(b => b.id);
    const { displacement, maxRotation, safetyFactor } = this.calculateMetrics();

    let failureMode = '未发生破坏';
    if (this.state.collapseState === 'collapsed' || this.state.collapseState === 'collapsing') {
      if (this.state.firstCrackedBlocks.length > 0) {
        const firstId = this.state.firstCrackedBlocks[0];
        const totalBlocks = blocks.length;
        const position = Math.round((firstId / (totalBlocks - 1)) * 100);
        if (position < 15) {
          failureMode = '左拱脚处砌块开裂导致连锁破坏';
        } else if (position > 85) {
          failureMode = '右拱脚处砌块开裂导致连锁破坏';
        } else if (position >= 40 && position <= 60) {
          failureMode = '拱顶区域砌块压溃导致连锁破坏';
        } else if (position >= 20 && position < 40) {
          failureMode = `左${100 - position}%处（约四分之一跨）砌块开裂导致连锁破坏`;
        } else {
          failureMode = `右${position}%处（约四分之三跨）砌块开裂导致连锁破坏`;
        }
      }
    } else if (crackedIds.length > 0) {
      failureMode = `${crackedIds.length}个砌块出现裂缝，未发生整体倒塌`;
    }

    const testDuration = this.state.testStartTime > 0
      ? (performance.now() - this.state.testStartTime) / 1000
      : 0;

    return {
      archType: this.state.archType,
      span: this.state.span,
      compressiveStrength: this.state.compressiveStrength,
      elasticModulus: this.state.elasticModulus,
      load: this.state.load,
      displacement,
      maxRotation,
      safetyFactor,
      collapsed: this.state.collapseState === 'collapsed',
      failureMode,
      crackedBlockCount: crackedIds.length,
      crackedBlockIds: crackedIds,
      testDuration
    };
  }

  isCollapsed(): boolean {
    return this.state.collapseState === 'collapsed' || this.state.collapseState === 'collapsing';
  }

  isCollapsing(): boolean {
    return this.state.collapseState === 'collapsing';
  }

  getCollapseProgress(): number {
    return Math.min(1, this.state.collapseTimer / 2.0);
  }
}
