import { Painting } from './painting';

interface VortexParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  hue: number;
}

interface DoorState {
  crackProgress: number;
  openProgress: number;
  visible: boolean;
  vortexParticles: VortexParticle[];
}

export class Puzzle {
  private ctx: CanvasRenderingContext2D;
  private paintings: Painting[];
  private leftCollected: number;
  private rightCollected: number;
  private totalCollected: number;
  private leftComplete: boolean;
  private rightComplete: boolean;
  private allComplete: boolean;
  
  private canvasWidth: number;
  private canvasHeight: number;
  
  private vanishX: number;
  private vanishY: number;
  private focalLength: number;
  private corridorHalfWidth: number;
  
  private door: DoorState;
  private endCandles: {
    left: { x: number; y: number; blue: boolean; blueProgress: number };
    right: { x: number; y: number; blue: boolean; blueProgress: number };
  };
  
  private time: number;
  private audioContext: AudioContext | null;

  constructor(ctx: CanvasRenderingContext2D, paintings: Painting[], canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.paintings = paintings;
    this.leftCollected = 0;
    this.rightCollected = 0;
    this.totalCollected = 0;
    this.leftComplete = false;
    this.rightComplete = false;
    this.allComplete = false;
    
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    this.vanishX = canvasWidth / 2;
    this.vanishY = canvasHeight * 0.35;
    this.focalLength = 500;
    this.corridorHalfWidth = 280;
    
    this.door = {
      crackProgress: 0,
      openProgress: 0,
      visible: false,
      vortexParticles: []
    };
    
    this.endCandles = {
      left: { x: 0, y: 0, blue: false, blueProgress: 0 },
      right: { x: 0, y: 0, blue: false, blueProgress: 0 }
    };
    
    this.time = 0;
    this.audioContext = null;
    
    this.initVortexParticles();
    this.setupPaintingCallbacks();
  }

  public setPerspective(vanishX: number, vanishY: number, focalLength: number, corridorHalfWidth: number): void {
    this.vanishX = vanishX;
    this.vanishY = vanishY;
    this.focalLength = focalLength;
    this.corridorHalfWidth = corridorHalfWidth;
  }

  private project3D(worldX: number, worldY: number, worldZ: number): { x: number; y: number; scale: number } {
    const scale = this.focalLength / (this.focalLength + worldZ);
    return {
      x: this.vanishX + worldX * scale,
      y: this.vanishY + worldY * scale,
      scale
    };
  }

  private setupPaintingCallbacks(): void {
    for (const painting of this.paintings) {
      painting.setOnCollect((p) => this.onPaintingCollected(p));
    }
  }

  private initVortexParticles(): void {
    for (let i = 0; i < 50; i++) {
      this.door.vortexParticles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * 80,
        speed: 0.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 4,
        alpha: 0.3 + Math.random() * 0.7,
        hue: 260 + Math.random() * 40
      });
    }
  }

  private onPaintingCollected(painting: Painting): void {
    this.totalCollected++;
    
    if (painting.getSide() === 'left') {
      this.leftCollected++;
      if (this.leftCollected >= 8 && !this.leftComplete) {
        this.leftComplete = true;
        this.endCandles.left.blue = true;
        this.updateEndCandlesColor();
      }
    } else {
      this.rightCollected++;
      if (this.rightCollected >= 8 && !this.rightComplete) {
        this.rightComplete = true;
        this.endCandles.right.blue = true;
        this.updateEndCandlesColor();
      }
    }
    
    this.playCollectSound(painting);
    
    if (this.totalCollected >= 16 && !this.allComplete) {
      this.allComplete = true;
      this.door.visible = true;
      setTimeout(() => this.playDoorSound(), 500);
    }
  }

  private updateEndCandlesColor(): void {
    if (this.leftComplete) {
      const leftFarPainting = this.paintings
        .filter(p => p.getSide() === 'left')
        .sort((a, b) => b.getZDepth() - a.getZDepth())[0];
      if (leftFarPainting) {
        leftFarPainting.setCandleBlue(true);
      }
    }
    
    if (this.rightComplete) {
      const rightFarPainting = this.paintings
        .filter(p => p.getSide() === 'right')
        .sort((a, b) => b.getZDepth() - a.getZDepth())[0];
      if (rightFarPainting) {
        rightFarPainting.setCandleBlue(true);
      }
    }
  }

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playCollectSound(painting: Painting): void {
    try {
      this.initAudio();
      if (!this.audioContext) return;
      
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const paintingIndex = painting.getId();
      const baseFreq = 261.63 + (paintingIndex % 12) * 30;
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not available
    }
  }

  private playDoorSound(): void {
    try {
      this.initAudio();
      if (!this.audioContext) return;
      
      const ctx = this.audioContext;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 2);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 2);
    } catch (e) {
      // Audio not available
    }
  }

  public update(deltaTime: number, time: number): void {
    this.time = time;
    
    if (this.leftComplete) {
      this.endCandles.left.blueProgress = Math.min(1, this.endCandles.left.blueProgress + deltaTime * 1.5);
    }
    if (this.rightComplete) {
      this.endCandles.right.blueProgress = Math.min(1, this.endCandles.right.blueProgress + deltaTime * 1.5);
    }
    
    if (this.door.visible) {
      if (this.door.crackProgress < 1) {
        this.door.crackProgress = Math.min(1, this.door.crackProgress + deltaTime * 0.5);
      } else if (this.door.openProgress < 1) {
        this.door.openProgress = Math.min(1, this.door.openProgress + deltaTime * 0.5);
      }
      
      this.updateVortexParticles(deltaTime);
    }
  }

  private updateVortexParticles(deltaTime: number): void {
    const openProgress = this.door.openProgress;
    const baseRadius = 50 + openProgress * 150;
    
    for (const particle of this.door.vortexParticles) {
      particle.angle += particle.speed * deltaTime * 2;
      particle.radius = baseRadius * (0.3 + particle.alpha * 0.7);
      
      particle.hue = 260 + Math.sin(this.time + particle.angle) * 20;
    }
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.vanishX = width / 2;
    this.vanishY = height * 0.35;
  }

  public drawBackground(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(1, '#3D1C10');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  public drawFloor(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    
    const horizonY = this.vanishY;
    const vanishX = this.vanishX;
    const floorTop = horizonY;
    const floorBottom = h;
    
    const nearZ = 120;
    const farZ = 800;
    const corridorHalfWidth = this.corridorHalfWidth;
    
    const nearLeft = vanishX - corridorHalfWidth * (this.focalLength / (this.focalLength + nearZ));
    const nearRight = vanishX + corridorHalfWidth * (this.focalLength / (this.focalLength + nearZ));
    const farLeft = vanishX - corridorHalfWidth * (this.focalLength / (this.focalLength + farZ));
    const farRight = vanishX + corridorHalfWidth * (this.focalLength / (this.focalLength + farZ));
    
    ctx.save();
    
    const floorGradient = ctx.createLinearGradient(0, floorTop, 0, floorBottom);
    floorGradient.addColorStop(0, '#1a0f08');
    floorGradient.addColorStop(0.3, '#2C1810');
    floorGradient.addColorStop(0.7, '#3D2817');
    floorGradient.addColorStop(1, '#4E342E');
    
    ctx.fillStyle = floorGradient;
    ctx.beginPath();
    ctx.moveTo(farLeft, floorTop);
    ctx.lineTo(farRight, floorTop);
    ctx.lineTo(nearRight, floorBottom);
    ctx.lineTo(nearLeft, floorBottom);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.lineWidth = 1;
    
    const numPlanks = 15;
    for (let i = 0; i < numPlanks; i++) {
      const t = (i + 1) / (numPlanks + 1);
      const z = nearZ + (farZ - nearZ) * t;
      const perspectiveScale = this.focalLength / (this.focalLength + z);
      
      const y = horizonY + (h - horizonY) * t;
      const leftX = vanishX - corridorHalfWidth * perspectiveScale;
      const rightX = vanishX + corridorHalfWidth * perspectiveScale;
      
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();
    }
    
    const woodLines = 25;
    ctx.strokeStyle = 'rgba(90, 50, 20, 0.15)';
    for (let i = 0; i < woodLines; i++) {
      const t = (i + 0.5) / woodLines;
      const z = nearZ + (farZ - nearZ) * t;
      const perspectiveScale = this.focalLength / (this.focalLength + z);
      
      const y = horizonY + (h - horizonY) * t;
      const leftX = vanishX - corridorHalfWidth * perspectiveScale;
      const rightX = vanishX + corridorHalfWidth * perspectiveScale;
      const lineWidth = 0.5 + (1 - t) * 1.5;
      
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 0.2 + (1 - t) * 0.2;
      ctx.beginPath();
      ctx.moveTo(leftX + (rightX - leftX) * 0.3, y);
      ctx.lineTo(leftX + (rightX - leftX) * 0.7, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  public drawWalls(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    
    const horizonY = this.vanishY;
    const vanishX = this.vanishX;
    
    const nearZ = 120;
    const farZ = 800;
    const corridorHalfWidth = this.corridorHalfWidth;
    
    const nearLeft = vanishX - corridorHalfWidth * (this.focalLength / (this.focalLength + nearZ));
    const nearRight = vanishX + corridorHalfWidth * (this.focalLength / (this.focalLength + nearZ));
    const farLeft = vanishX - corridorHalfWidth * (this.focalLength / (this.focalLength + farZ));
    const farRight = vanishX + corridorHalfWidth * (this.focalLength / (this.focalLength + farZ));
    
    ctx.save();
    
    const leftWallGradient = ctx.createLinearGradient(0, 0, nearLeft, 0);
    leftWallGradient.addColorStop(0, '#1a0f08');
    leftWallGradient.addColorStop(0.5, '#2C1810');
    leftWallGradient.addColorStop(1, '#3D2817');
    
    ctx.fillStyle = leftWallGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(nearLeft, 0);
    ctx.lineTo(farLeft, horizonY);
    ctx.lineTo(nearLeft, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    
    const rightWallGradient = ctx.createLinearGradient(w, 0, nearRight, 0);
    rightWallGradient.addColorStop(0, '#1a0f08');
    rightWallGradient.addColorStop(0.5, '#2C1810');
    rightWallGradient.addColorStop(1, '#3D2817');
    
    ctx.fillStyle = rightWallGradient;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(nearRight, 0);
    ctx.lineTo(farRight, horizonY);
    ctx.lineTo(nearRight, h);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    
    this.drawWallTexture();
    
    ctx.restore();
  }

  private drawWallTexture(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    
    ctx.save();
    
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000';
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.4;
      const size = Math.random() * 3 + 1;
      
      ctx.fillRect(x, y, size, size);
    }
    
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#fff';
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.4;
      const size = Math.random() * 2 + 0.5;
      
      ctx.fillRect(x, y, size, size);
    }
    
    ctx.restore();
  }

  public drawEndWall(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    const horizonY = h * 0.35;
    
    const wallLeft = w * 0.4;
    const wallRight = w * 0.6;
    const wallTop = 0;
    const wallBottom = horizonY;
    
    ctx.save();
    
    const wallGradient = ctx.createLinearGradient(wallLeft, wallTop, wallRight, wallTop);
    wallGradient.addColorStop(0, '#2C1810');
    wallGradient.addColorStop(0.5, '#3D1C10');
    wallGradient.addColorStop(1, '#2C1810');
    
    ctx.fillStyle = wallGradient;
    ctx.fillRect(wallLeft, wallTop, wallRight - wallLeft, wallBottom);
    
    const frameLeft = wallLeft + (wallRight - wallLeft) * 0.15;
    const frameRight = wallRight - (wallRight - wallLeft) * 0.15;
    const frameTop = wallTop + (wallBottom - wallTop) * 0.1;
    const frameBottom = wallBottom - (wallBottom - wallTop) * 0.05;
    
    const frameWidth = 8;
    const frameGradient = ctx.createLinearGradient(frameLeft, frameTop, frameRight, frameBottom);
    frameGradient.addColorStop(0, '#6B4F0E');
    frameGradient.addColorStop(0.3, '#B8860B');
    frameGradient.addColorStop(0.5, '#DAA520');
    frameGradient.addColorStop(0.7, '#B8860B');
    frameGradient.addColorStop(1, '#6B4F0E');
    
    ctx.fillStyle = frameGradient;
    ctx.fillRect(frameLeft - frameWidth, frameTop - frameWidth, frameWidth, frameBottom - frameTop + frameWidth * 2);
    ctx.fillRect(frameRight, frameTop - frameWidth, frameWidth, frameBottom - frameTop + frameWidth * 2);
    ctx.fillRect(frameLeft - frameWidth, frameTop - frameWidth, frameRight - frameLeft + frameWidth * 2, frameWidth);
    ctx.fillRect(frameLeft - frameWidth, frameBottom, frameRight - frameLeft + frameWidth * 2, frameWidth);
    
    const muralGradient = ctx.createLinearGradient(frameLeft, frameTop, frameRight, frameBottom);
    muralGradient.addColorStop(0, '#1a0a05');
    muralGradient.addColorStop(0.5, '#2C1810');
    muralGradient.addColorStop(1, '#1a0a05');
    
    ctx.fillStyle = muralGradient;
    ctx.fillRect(frameLeft, frameTop, frameRight - frameLeft, frameBottom - frameTop);
    
    this.drawMuralPattern(frameLeft, frameTop, frameRight - frameLeft, frameBottom - frameTop);
    
    if (this.door.visible && this.door.crackProgress > 0) {
      this.drawDoorCrack(frameLeft, frameTop, frameRight - frameLeft, frameBottom - frameTop);
    }
    
    if (this.door.openProgress > 0) {
      this.drawVortexDoor(
        (frameLeft + frameRight) / 2,
        (frameTop + frameBottom) / 2,
        (frameRight - frameLeft) * 0.35,
        (frameBottom - frameTop) * 0.4
      );
    }
    
    ctx.restore();
  }

  private drawMuralPattern(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 5; i++) {
      const cx = x + w * (0.2 + i * 0.15);
      const cy = y + h * (0.3 + (i % 2) * 0.3);
      const radius = w * 0.08;
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 8; i++) {
      const lineY = y + h * (0.1 + i * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.bezierCurveTo(x + w * 0.3, lineY + 10, x + w * 0.7, lineY - 10, x + w, lineY);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  private drawDoorCrack(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const crackProgress = this.door.crackProgress;
    const centerX = x + w / 2;
    
    ctx.save();
    
    ctx.strokeStyle = 'rgba(142, 45, 226, 0.8)';
    ctx.lineWidth = 2 * crackProgress;
    ctx.shadowColor = '#8E2DE2';
    ctx.shadowBlur = 20 * crackProgress;
    
    ctx.beginPath();
    ctx.moveTo(centerX, y);
    ctx.lineTo(centerX, y + h * crackProgress);
    ctx.stroke();
    
    if (crackProgress > 0.3) {
      const branchProgress = (crackProgress - 0.3) / 0.7;
      
      ctx.strokeStyle = 'rgba(74, 0, 224, 0.6)';
      ctx.lineWidth = 1 * branchProgress;
      
      for (let i = 0; i < 6; i++) {
        const startY = y + h * (0.2 + i * 0.15);
        const branchLength = w * 0.15 * branchProgress;
        const direction = i % 2 === 0 ? 1 : -1;
        
        ctx.beginPath();
        ctx.moveTo(centerX, startY);
        ctx.quadraticCurveTo(
          centerX + direction * branchLength * 0.5,
          startY + 10,
          centerX + direction * branchLength,
          startY + 20
        );
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  private drawVortexDoor(cx: number, cy: number, w: number, h: number): void {
    const ctx = this.ctx;
    const openProgress = this.door.openProgress;
    
    ctx.save();
    
    ctx.translate(cx, cy);
    
    const glowSize = Math.max(w, h) * 0.8 * openProgress;
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glowGradient.addColorStop(0, `rgba(142, 45, 226, ${0.5 * openProgress})`);
    glowGradient.addColorStop(0.5, `rgba(74, 0, 224, ${0.3 * openProgress})`);
    glowGradient.addColorStop(1, 'rgba(74, 0, 224, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalCompositeOperation = 'lighter';
    
    for (const particle of this.door.vortexParticles) {
      const px = Math.cos(particle.angle) * particle.radius * openProgress;
      const py = Math.sin(particle.angle) * particle.radius * 0.6 * openProgress;
      const size = particle.size * (0.5 + particle.alpha * 0.5);
      
      ctx.fillStyle = `hsla(${particle.hue}, 80%, 60%, ${particle.alpha * openProgress})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
    
    const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5 * openProgress);
    innerGlow.addColorStop(0, `rgba(200, 150, 255, ${0.8 * openProgress})`);
    innerGlow.addColorStop(0.5, `rgba(142, 45, 226, ${0.5 * openProgress})`);
    innerGlow.addColorStop(1, 'rgba(74, 0, 224, 0)');
    
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5 * openProgress, h * 0.5 * openProgress, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  public getLeftCollected(): number {
    return this.leftCollected;
  }

  public getRightCollected(): number {
    return this.rightCollected;
  }

  public getTotalCollected(): number {
    return this.totalCollected;
  }

  public isAllComplete(): boolean {
    return this.allComplete;
  }

  public isLeftComplete(): boolean {
    return this.leftComplete;
  }

  public isRightComplete(): boolean {
    return this.rightComplete;
  }
}
