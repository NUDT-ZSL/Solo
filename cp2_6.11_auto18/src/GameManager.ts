export const COLORS = ['#ff3333', '#ff8833', '#ffcc33', '#33cc33', '#3366ff', '#9933ff'];
export const COLOR_NAMES = ['红', '橙', '黄', '绿', '蓝', '紫'];
export const POLE_RADIUS = 60;
export const LAYER_SPACING = 80;
export const GRIP_RADIUS = 15;

export interface GripPoint {
  angle: number;
  color: string;
  radius: number;
  glowRadius: number;
  scaleAnim: number;
  scaleAnimTimer: number;
}

export interface RingLayer {
  color: string;
  gripPoints: GripPoint[];
  y: number;
  layerIndex: number;
}

export interface Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  isFalling: boolean;
  fallSpeed: number;
  comboCount: number;
  isCombo: boolean;
  pulseTimer: number;
  shakeTimer: number;
  comboGlowTimer: number;
  attachedGripAngle: number;
  attachedLayerY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface GameState {
  score: number;
  layerIndex: number;
  targetColor: string;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  isGameOver: boolean;
  isRunning: boolean;
  layers: RingLayer[];
  player: Player;
  particles: Particle[];
  stars: Star[];
  cameraOffset: number;
  totalLayersClimbed: number;
  maxParticles: number;
  currentFps: number;
  restartBtnBounds: { x: number; y: number; w: number; h: number } | null;
}

const DEG_TO_RAD = Math.PI / 180;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function calcGripScreenPos(
  canvasWidth: number,
  cameraOffset: number,
  rotation: number,
  scale: number,
  layerY: number,
  gripAngle: number
): { x: number; y: number; visible: boolean; depth: number } {
  const centerX = canvasWidth / 2;
  const effectiveRadius = POLE_RADIUS * scale;
  const cosVal = Math.cos(gripAngle + rotation);
  const sinVal = Math.sin(gripAngle + rotation);
  const visible = cosVal > 0;
  const depth = cosVal;
  const x = centerX + effectiveRadius * sinVal;
  const y = layerY + cameraOffset;
  return { x, y, visible, depth };
}

export class GameManager {
  canvas: HTMLCanvasElement;
  state: GameState;
  private fpsFrameCount = 0;
  private fpsAccumTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const baseY = this.canvas.height - 100;
    return {
      score: 0,
      layerIndex: -1,
      targetColor: '',
      rotation: 0,
      rotationSpeed: 0.5,
      scale: 1.0,
      isGameOver: false,
      isRunning: true,
      layers: [],
      player: {
        x: this.canvas.width / 2,
        y: baseY,
        targetX: this.canvas.width / 2,
        targetY: baseY,
        radius: 12,
        isFalling: false,
        fallSpeed: 0,
        comboCount: 0,
        isCombo: false,
        pulseTimer: 0,
        shakeTimer: 0,
        comboGlowTimer: 0,
        attachedGripAngle: 0,
        attachedLayerY: baseY,
      },
      particles: [],
      stars: [],
      cameraOffset: 0,
      totalLayersClimbed: 0,
      maxParticles: 20,
      currentFps: 60,
      restartBtnBounds: null,
    };
  }

  init(): void {
    this.state = this.createInitialState();
    this.generateStars();
    this.generateTotemPole();
    this.setTargetColor();
    const baseY = this.canvas.height - 100;
    this.state.player.x = this.canvas.width / 2;
    this.state.player.y = baseY;
    this.state.player.targetX = this.state.player.x;
    this.state.player.targetY = baseY;
    this.state.player.attachedGripAngle = 0;
    this.state.player.attachedLayerY = baseY;
  }

  private generateStars(): void {
    this.state.stars = [];
    const count = 100;
    for (let i = 0; i < count; i++) {
      this.state.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: 0.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private generateTotemPole(): void {
    this.state.layers = [];
    const layerCount = randomInt(5, 8);
    let prevColor = '';

    for (let i = 0; i < layerCount; i++) {
      let layerColor: string;
      do {
        layerColor = randomChoice(COLORS);
      } while (layerColor === prevColor);
      prevColor = layerColor;

      const gripCount = randomInt(2, 4);
      const gripPoints: GripPoint[] = [];
      const angleStep = (2 * Math.PI) / gripCount;
      const startAngle = Math.random() * angleStep;

      for (let g = 0; g < gripCount; g++) {
        const angle = startAngle + g * angleStep + (Math.random() - 0.5) * 0.3;
        const gripColor = randomChoice(COLORS);
        gripPoints.push({
          angle,
          color: gripColor,
          radius: GRIP_RADIUS,
          glowRadius: GRIP_RADIUS * 1.8,
          scaleAnim: 1.0,
          scaleAnimTimer: 0,
        });
      }

      this.state.layers.push({
        color: layerColor,
        gripPoints,
        y: this.canvas.height - 100 - i * LAYER_SPACING,
        layerIndex: i,
      });
    }

    const allColors = new Set<string>();
    for (const layer of this.state.layers) {
      for (const gp of layer.gripPoints) {
        allColors.add(gp.color);
      }
    }
    if (allColors.size < 2 && this.state.layers.length > 0) {
      const firstLayer = this.state.layers[0];
      const existingColor = firstLayer.gripPoints[0].color;
      const otherColor = COLORS.find(c => c !== existingColor) || COLORS[1];
      if (firstLayer.gripPoints.length > 1) {
        firstLayer.gripPoints[1].color = otherColor;
      } else {
        firstLayer.gripPoints[0].color = otherColor;
      }
    }
  }

  private addNewLayer(): void {
    const topLayer = this.state.layers[this.state.layers.length - 1];
    const newIndex = topLayer ? topLayer.layerIndex + 1 : 0;
    const newY = topLayer ? topLayer.y - LAYER_SPACING : this.canvas.height - 100;

    let layerColor: string;
    do {
      layerColor = randomChoice(COLORS);
    } while (topLayer && layerColor === topLayer.color);

    const gripCount = randomInt(2, 4);
    const gripPoints: GripPoint[] = [];
    const angleStep = (2 * Math.PI) / gripCount;
    const startAngle = Math.random() * angleStep;

    for (let g = 0; g < gripCount; g++) {
      const angle = startAngle + g * angleStep + (Math.random() - 0.5) * 0.3;
      const gripColor = randomChoice(COLORS);
      gripPoints.push({
        angle,
        color: gripColor,
        radius: GRIP_RADIUS,
        glowRadius: GRIP_RADIUS * 1.8,
        scaleAnim: 1.0,
        scaleAnimTimer: 0,
      });
    }

    this.state.layers.push({
      color: layerColor,
      gripPoints,
      y: newY,
      layerIndex: newIndex,
    });
  }

  private setTargetColor(): void {
    const nextLayerIndex = this.state.layerIndex + 1;
    let candidateLayer = this.state.layers.find(l => l.layerIndex === nextLayerIndex);

    if (!candidateLayer) {
      this.addNewLayer();
      candidateLayer = this.state.layers[this.state.layers.length - 1];
    }

    const colorsOnLayer = candidateLayer.gripPoints.map(gp => gp.color);
    this.state.targetColor = randomChoice(colorsOnLayer);
  }

  update(dt: number): void {
    if (!this.state.isRunning) return;

    this.updateFps(dt);
    this.state.rotation += this.state.rotationSpeed * DEG_TO_RAD;
    this.state.rotationSpeed = 0.5 + (this.state.score / 100) * 0.1;
    this.state.scale = Math.max(0.7, 1.0 - this.state.totalLayersClimbed * 0.005);

    const glowFactor = Math.min(1.05 + this.state.totalLayersClimbed * 0.01, 1.15);
    for (const layer of this.state.layers) {
      for (const gp of layer.gripPoints) {
        gp.glowRadius = GRIP_RADIUS * 1.8 * glowFactor;
        if (gp.scaleAnimTimer > 0) {
          gp.scaleAnimTimer -= dt;
          if (gp.scaleAnimTimer <= 0) {
            gp.scaleAnim = 1.0;
            gp.scaleAnimTimer = 0;
          } else {
            const progress = 1 - gp.scaleAnimTimer / 0.1;
            gp.scaleAnim = progress < 0.5
              ? 1.0 + 0.2 * (progress / 0.5)
              : 1.2 - 0.2 * ((progress - 0.5) / 0.5);
          }
        }
      }
    }

    const player = this.state.player;

    if (player.isFalling) {
      player.fallSpeed += 800 * dt;
      player.y += player.fallSpeed * dt;
      player.x = lerp(player.x, this.canvas.width / 2, 0.02);

      if (Math.random() < 0.8) {
        this.spawnFallParticle(player.x, player.y);
      }

      const groundY = this.canvas.height - 50 + this.state.cameraOffset;
      if (player.y >= this.canvas.height - 50) {
        player.y = this.canvas.height - 50;
        this.state.isGameOver = true;
        this.state.isRunning = false;
      }
    } else {
      const pos = calcGripScreenPos(
        this.canvas.width,
        0,
        this.state.rotation,
        this.state.scale,
        player.attachedLayerY,
        player.attachedGripAngle
      );
      player.targetX = pos.x;
      player.targetY = player.attachedLayerY;
      player.x = lerp(player.x, player.targetX, 0.15);
      player.y = lerp(player.y, player.targetY, 0.15);
    }

    if (player.pulseTimer > 0) {
      player.pulseTimer -= dt;
    }
    if (player.comboGlowTimer > 0) {
      player.comboGlowTimer -= dt;
    }
    if (player.shakeTimer > 0) {
      player.shakeTimer -= dt;
    }

    this.updateParticles(dt);

    const targetCameraOffset = Math.max(0, this.canvas.height * 0.6 - player.y);
    this.state.cameraOffset = lerp(this.state.cameraOffset, targetCameraOffset, 0.08);

    const topLayer = this.state.layers[this.state.layers.length - 1];
    if (topLayer && this.state.layerIndex >= topLayer.layerIndex - 2) {
      this.addNewLayer();
    }
  }

  private updateFps(dt: number): void {
    this.fpsFrameCount++;
    this.fpsAccumTime += dt;
    if (this.fpsAccumTime >= 1.0) {
      this.state.currentFps = this.fpsFrameCount / this.fpsAccumTime;
      this.fpsFrameCount = 0;
      this.fpsAccumTime = 0;
      this.state.maxParticles = this.state.currentFps < 40 ? 8 : 20;
    }
  }

  private spawnFallParticle(x: number, y: number): void {
    if (this.state.particles.length >= this.state.maxParticles) return;
    this.state.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - Math.random() * 5,
      vx: (Math.random() - 0.5) * 60,
      vy: -Math.random() * 100 - 20,
      life: 1.0,
      maxLife: 1.0,
      color: '#ff3333',
      radius: 2 + Math.random() * 3,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  handleClick(screenX: number, screenY: number): void {
    if (this.state.isGameOver) {
      this.handleGameOverClick(screenX, screenY);
      return;
    }
    if (this.state.player.isFalling) return;

    let hitGrip: { gripPoint: GripPoint; layer: RingLayer } | null = null;
    let minDist = Infinity;

    for (const layer of this.state.layers) {
      if (layer.layerIndex <= this.state.layerIndex) continue;

      for (const gp of layer.gripPoints) {
        const pos = calcGripScreenPos(
          this.canvas.width,
          this.state.cameraOffset,
          this.state.rotation,
          this.state.scale,
          layer.y,
          gp.angle
        );

        if (!pos.visible) continue;

        const dx = screenX - pos.x;
        const dy = screenY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < gp.radius * gp.scaleAnim * 2 && dist < minDist) {
          minDist = dist;
          hitGrip = { gripPoint: gp, layer };
        }
      }
    }

    if (!hitGrip) return;

    const { gripPoint, layer } = hitGrip;

    if (gripPoint.color === this.state.targetColor) {
      this.handleCorrectClick(gripPoint, layer);
    } else {
      this.handleWrongClick();
    }
  }

  private handleCorrectClick(gripPoint: GripPoint, layer: RingLayer): void {
    const player = this.state.player;

    gripPoint.scaleAnim = 1.2;
    gripPoint.scaleAnimTimer = 0.1;

    if (player.isCombo) {
      this.state.score += 20;
      player.isCombo = false;
      player.comboCount = 0;
    } else {
      this.state.score += 10;
      player.comboCount++;
      if (player.comboCount >= 3) {
        player.isCombo = true;
        player.pulseTimer = 0.5;
        player.comboGlowTimer = 0.8;
      }
    }

    this.state.layerIndex = layer.layerIndex;
    this.state.totalLayersClimbed++;

    player.attachedGripAngle = gripPoint.angle;
    player.attachedLayerY = layer.y;

    if (this.state.totalLayersClimbed % 10 === 0) {
      this.addNewLayer();
    }

    this.setTargetColor();
  }

  private handleWrongClick(): void {
    const player = this.state.player;
    player.isFalling = true;
    player.fallSpeed = 0;
    player.comboCount = 0;
    player.isCombo = false;
    player.shakeTimer = 0.2;
  }

  private handleGameOverClick(screenX: number, screenY: number): void {
    const btn = this.state.restartBtnBounds;
    if (!btn) return;
    if (
      screenX >= btn.x &&
      screenX <= btn.x + btn.w &&
      screenY >= btn.y &&
      screenY <= btn.y + btn.h
    ) {
      this.restart();
    }
  }

  handleSwipe(dx: number): void {
    if (this.state.isGameOver || this.state.player.isFalling) return;
    this.state.player.attachedGripAngle += dx * 0.01;
  }

  setRestartBtnBounds(x: number, y: number, w: number, h: number): void {
    this.state.restartBtnBounds = { x, y, w, h };
  }

  isRestartButtonHovered(screenX: number, screenY: number): boolean {
    const btn = this.state.restartBtnBounds;
    if (!btn) return false;
    return screenX >= btn.x && screenX <= btn.x + btn.w &&
           screenY >= btn.y && screenY <= btn.y + btn.h;
  }

  private restart(): void {
    this.fpsFrameCount = 0;
    this.fpsAccumTime = 0;
    this.init();
  }
}
