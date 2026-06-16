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
  stress: number;
  stressAngle: number;
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
      testStartTime: 0
    };
  }

  setArchType(type: ArchType): void {
    this.state.archType = type;
    this.resetLoadAndState();
    this.generateBlocks();
  }

  setSpan(span: number): void {
    this.state.span = span;
    this.resetLoadAndState();
    this.generateBlocks();
  }

  setCompressiveStrength(strength: number): void {
    this.state.compressiveStrength = strength;
    this.resetLoadAndState();
    this.generateBlocks();
  }

  setElasticModulus(modulus: number): void {
    this.state.elasticModulus = modulus;
    this.resetLoadAndState();
    this.generateBlocks();
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.generateBlocks();
  }

  private resetLoadAndState(): void {
    this.state.load = 0;
    this.state.collapseState = 'stable';
    this.state.collapseTimer = 0;
    this.state.consecutiveCracked = 0;
    this.state.firstCrackedBlocks = [];
    this.state.dustParticles = [];
    this.state.testStartTime = performance.now();
  }

  reset(): void {
    this.resetLoadAndState();
    this.generateBlocks();
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

      const archWidth = this.calculateArchLength(halfSpan, rise);
      const blockWidth = archWidth / blockCount + 2;

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
        stress: 0,
        stressAngle: angle,
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
    const angle = Math.PI * t;
    switch (this.state.archType) {
      case 'semicircular': {
        const r = halfSpan;
        return {
          x: centerX - r * Math.cos(angle),
          y: baseY - r * Math.sin(angle)
        };
      }
      case 'pointed': {
        const r1 = halfSpan * 1.1;
        const offsetX = halfSpan * 0.2;
        if (t < 0.5) {
          const localAngle = Math.PI * 0.5 + (angle - Math.PI * 0.5);
          return {
            x: centerX + offsetX - r1 * Math.cos(localAngle + Math.PI * 0.3),
            y: baseY - r1 * Math.sin(localAngle + Math.PI * 0.3) + (r1 - rise) * 0.3
          };
        } else {
          const localAngle = Math.PI * 0.5 + (angle - Math.PI * 0.5);
          return {
            x: centerX - offsetX + r1 * Math.cos(localAngle - Math.PI * 1.3),
            y: baseY - r1 * Math.sin(localAngle - Math.PI * 1.3) + (r1 - rise) * 0.3
          };
        }
      }
      case 'horseshoe': {
        const r = halfSpan * 1.1;
        const centerOffset = halfSpan * 0.3;
        return {
          x: centerX - r * Math.cos(angle) * 0.9,
          y: baseY - centerOffset - r * Math.sin(angle) + centerOffset
        };
      }
      default:
        return { x: centerX, y: baseY };
    }
  }

  private calculateArchLength(halfSpan: number, rise: number): number {
    switch (this.state.archType) {
      case 'semicircular':
        return Math.PI * halfSpan;
      case 'pointed':
        return Math.PI * halfSpan * 1.15;
      case 'horseshoe':
        return Math.PI * halfSpan * 0.95;
      default:
        return Math.PI * halfSpan;
    }
  }

  update(deltaTime: number): void {
    const smoothFactor = 1 - Math.exp(-deltaTime / 0.1);
    this.state.displayLoad += (this.state.load - this.state.displayLoad) * smoothFactor;

    if (this.state.collapseState === 'collapsing') {
      this.updateCollapse(deltaTime);
      return;
    }

    if (this.state.collapseState === 'collapsed') {
      this.updateCollapse(deltaTime);
      return;
    }

    this.calculateStress();
    this.calculateDeformation();
    this.checkCracks();

    const { displacement, maxRotation, safetyFactor } = this.calculateMetrics();
    this.state.displayDisplacement += (displacement - this.state.displayDisplacement) * smoothFactor;
    this.state.displayRotation += (maxRotation - this.state.displayRotation) * smoothFactor;
    this.state.displaySafetyFactor += (safetyFactor - this.state.displaySafetyFactor) * smoothFactor;
  }

  private calculateStress(): void {
    const blocks = this.state.blocks;
    if (blocks.length === 0) return;

    const load = this.state.load;
    const midIndex = Math.floor(blocks.length / 2);
    const totalStrength = this.state.compressiveStrength * 1e6;

    for (let i = 0; i < blocks.length; i++) {
      const distFromTop = Math.abs(i - midIndex);
      const normalizedDist = distFromTop / (blocks.length / 2);

      const edgeFactor = Math.max(0.2, 1 - normalizedDist * 0.5);
      const quarterFactor = 1 + Math.sin(normalizedDist * Math.PI) * 0.8;

      const stressPa = (load * 2.5) / (blocks[i].width * blocks[i].height * 0.001) * edgeFactor * quarterFactor;
      blocks[i].stress = Math.min(stressPa / totalStrength, 2.5);
      blocks[i].stressAngle = blocks[i].originalAngle;
    }

    const endIndices = [0, blocks.length - 1, Math.floor(blocks.length * 0.25), Math.floor(blocks.length * 0.75)];
    for (const idx of endIndices) {
      if (idx >= 0 && idx < blocks.length) {
        blocks[idx].stress *= 1.3;
      }
    }
  }

  private calculateDeformation(): void {
    const blocks = this.state.blocks;
    if (blocks.length === 0) return;

    const modulusFactor = 30 / this.state.elasticModulus;
    const loadFactor = this.state.load / 50000;
    const midIndex = Math.floor(blocks.length / 2);

    for (let i = 0; i < blocks.length; i++) {
      const normalizedPos = Math.abs(i - midIndex) / (blocks.length / 2);
      const deflectionCurve = Math.cos(normalizedPos * Math.PI * 0.5);
      const archFactor = this.getArchTypeFactor();

      const dy = loadFactor * modulusFactor * 30 * deflectionCurve * archFactor;
      const sideFactor = (i - midIndex) / (blocks.length / 2);
      const dx = loadFactor * modulusFactor * 8 * sideFactor * (1 - normalizedPos) * archFactor;
      const rotation = loadFactor * modulusFactor * 3 * sideFactor * (1 - normalizedPos * 0.5);

      blocks[i].displacementX = dx;
      blocks[i].displacementY = dy;
      blocks[i].rotation = rotation;

      blocks[i].centerX = blocks[i].originalCenterX + dx;
      blocks[i].centerY = blocks[i].originalCenterY + dy;
      blocks[i].angle = blocks[i].originalAngle + rotation;

      if (blocks[i].cracked) {
        blocks[i].displacementX *= 1.5;
        blocks[i].displacementY *= 1.5;
      }
    }
  }

  private getArchTypeFactor(): number {
    switch (this.state.archType) {
      case 'semicircular':
        return 1.0;
      case 'pointed':
        return 0.85;
      case 'horseshoe':
        return 1.15;
      default:
        return 1.0;
    }
  }

  private checkCracks(): void {
    const blocks = this.state.blocks;
    let crackedThisFrame = 0;

    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].cracked && blocks[i].stress >= 1.0) {
        blocks[i].cracked = true;
        crackedThisFrame++;

        const crackCount = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < crackCount; c++) {
          const crackAngle = blocks[i].stressAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          blocks[i].crackList.push({
            x: (Math.random() - 0.5) * blocks[i].width * 0.6,
            y: (Math.random() - 0.5) * blocks[i].height * 0.6,
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
    for (let i = 0; i < blocks.length; i++) {
      const side = i < blocks.length / 2 ? -1 : 1;
      blocks[i].velocityX = side * (30 + Math.random() * 50);
      blocks[i].velocityY = -20 - Math.random() * 40;
      blocks[i].angularVelocity = side * (1 + Math.random() * 3);
      blocks[i].failed = true;

      const debrisCount = 3 + Math.floor(Math.random() * 4);
      for (let d = 0; d < debrisCount; d++) {
        blocks[i].debris.push({
          x: blocks[i].centerX,
          y: blocks[i].centerY,
          vx: side * (20 + Math.random() * 80),
          vy: -50 - Math.random() * 80,
          size: 3 + Math.random() * 6,
          rotation: Math.random() * Math.PI * 2,
          angularVel: (Math.random() - 0.5) * 8
        });
      }
    }

    for (let p = 0; p < 50; p++) {
      this.state.dustParticles.push({
        x: this.canvasWidth / 2 + (Math.random() - 0.5) * this.state.span,
        y: BASE_Y - this.calculateRise() * 0.5 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 60,
        vy: -20 - Math.random() * 40,
        size: 8 + Math.random() * 15,
        life: 0,
        maxLife: 1.5 + Math.random(),
        alpha: 0.5 + Math.random() * 0.3
      });
    }
  }

  private updateCollapse(deltaTime: number): void {
    this.state.collapseTimer += deltaTime;

    if (this.state.collapseTimer >= 2.0) {
      this.state.collapseState = 'collapsed';
    }

    const gravity = 400;
    const blocks = this.state.blocks;

    for (let i = 0; i < blocks.length; i++) {
      blocks[i].velocityY += gravity * deltaTime;
      blocks[i].centerX += blocks[i].velocityX * deltaTime;
      blocks[i].centerY += blocks[i].velocityY * deltaTime;
      blocks[i].angle += blocks[i].angularVelocity * deltaTime;
      blocks[i].rotation = blocks[i].angle - blocks[i].originalAngle;

      if (blocks[i].centerY > BASE_Y + 50) {
        blocks[i].velocityY *= -0.3;
        blocks[i].velocityX *= 0.8;
        blocks[i].centerY = BASE_Y + 50;
      }

      for (const d of blocks[i].debris) {
        d.vy += gravity * 1.2 * deltaTime;
        d.x += d.vx * deltaTime;
        d.y += d.vy * deltaTime;
        d.rotation += d.angularVel * deltaTime;
      }
    }

    for (let i = this.state.dustParticles.length - 1; i >= 0; i--) {
      const p = this.state.dustParticles[i];
      p.life += deltaTime;
      p.vy += 30 * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.alpha = Math.max(0, p.alpha * (1 - p.life / p.maxLife));

      if (p.life >= p.maxLife) {
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
      maxStress = Math.max(maxStress, b.stress);
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
      const duration = 0.15;
      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 30) * (1 - t / duration);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500 + Math.random() * 1000;
      filter.Q.value = 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

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
      if (block.stress <= 0.05) continue;

      ctx.save();
      ctx.translate(block.centerX, block.centerY);
      ctx.rotate(block.angle);

      const stressNorm = Math.min(block.stress, 1.5);
      let color: string;
      if (stressNorm < 0.33) {
        const t = stressNorm / 0.33;
        color = `rgba(100, 150, 255, ${0.1 + t * 0.2})`;
      } else if (stressNorm < 0.66) {
        const t = (stressNorm - 0.33) / 0.33;
        color = `rgba(100, ${Math.floor(200 + t * 55)}, 100, ${0.2 + t * 0.15})`;
      } else {
        const t = (stressNorm - 0.66) / 0.34;
        color = `rgba(${Math.floor(200 + t * 55)}, ${Math.floor(200 - t * 150)}, 80, ${0.25 + t * 0.2})`;
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
      const arrowSize = Math.min(40, 15 + this.state.displayLoad / 2000);

      ctx.strokeStyle = '#58a6ff';
      ctx.fillStyle = '#58a6ff';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY - arrowSize);
      ctx.lineTo(arrowX, arrowY + 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY + 18);
      ctx.lineTo(arrowX - 10, arrowY + 5);
      ctx.lineTo(arrowX + 10, arrowY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e6edf3';
      ctx.fillText(`${Math.round(this.state.displayLoad)} N`, arrowX, arrowY - arrowSize - 10);
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

      for (const crack of block.crackList) {
        ctx.save();
        ctx.translate(crack.x, crack.y);
        ctx.rotate(crack.angle - block.angle);
        ctx.beginPath();
        ctx.moveTo(-crack.length / 2, 0);
        ctx.lineTo(crack.length / 2, 0);
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
        ctx.strokeStyle = '#0d1117';
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
      ctx.fillStyle = `rgba(180, 170, 160, ${p.alpha * 0.5})`;
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
        if (position < 20) {
          failureMode = '左拱脚处砌块开裂导致连锁破坏';
        } else if (position > 80) {
          failureMode = '右拱脚处砌块开裂导致连锁破坏';
        } else if (position >= 40 && position <= 60) {
          failureMode = '拱顶区域砌块开裂导致连锁破坏';
        } else {
          failureMode = `约${position}%位置砌块开裂导致连锁破坏`;
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

  getCollapseProgress(): number {
    return Math.min(1, this.state.collapseTimer / 2.0);
  }
}
