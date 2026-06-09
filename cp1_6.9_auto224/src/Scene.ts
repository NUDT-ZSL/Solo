import Phaser from 'phaser';
import Player from './Player';
import UI, { THEMES } from './UI';

interface Platform {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  border: Phaser.GameObjects.Graphics;
  z: number;
  width: number;
  height: number;
  laneIndex: number;
  hasGapLeft: boolean;
  hasGapRight: boolean;
  gapWidthLeft: number;
  gapWidthRight: number;
}

interface Obstacle {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  z: number;
  lane: number;
  rotation: number;
  rotationSpeed: number;
  alive: boolean;
}

interface Shard {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  z: number;
  lane: number;
  bobPhase: number;
  rotation: number;
  collected: boolean;
  targetPlayer: boolean;
  collectProgress: number;
}

interface SkyPoint {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface ImpactRing {
  graphics: Phaser.GameObjects.Graphics;
  radius: number;
  alpha: number;
  maxRadius: number;
  color: number;
}

const PLATFORM_DEPTH = 1;
const PLATFORM_SIZE = 300;
const LANE_WIDTH = 120;
const PERSPECTIVE = 500;

export default class MainScene extends Phaser.Scene {
  player!: Player;
  ui!: UI;

  platforms: Platform[] = [];
  obstacles: Obstacle[] = [];
  shards: Shard[] = [];
  skyPoints: SkyPoint[] = [];
  impactRings: ImpactRing[] = [];

  currentZ: number = 0;
  platformSpacing: number = 380;
  moveSpeed: number = 5;
  baseMoveSpeed: number = 5;
  speedMultiplier: number = 1;

  currentThemeIndex: number = 0;
  themeTimer: number = 0;
  themeDuration: number = 20000;
  checkpointsPassed: number = 0;
  lastCheckpointZ: number = 0;
  checkpointInterval: number = 3000;

  gameActive: boolean = true;
  distanceScore: number = 0;
  fragmentScore: number = 0;
  audioCtx: AudioContext | null = null;

  perspectiveCenterX: number = 0;
  perspectiveCenterY: number = 0;
  horizonY: number = 0;

  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keyA!: Phaser.Input.Keyboard.Key;
  keyD!: Phaser.Input.Keyboard.Key;
  keyE!: Phaser.Input.Keyboard.Key;
  keySpace!: Phaser.Input.Keyboard.Key;

  shardPickupGainNode!: GainNode;

  constructor() {
    super({ key: 'MainScene' });
  }

  init() {
    this.platforms = [];
    this.obstacles = [];
    this.shards = [];
    this.skyPoints = [];
    this.impactRings = [];
    this.currentZ = 0;
    this.themeTimer = 0;
    this.checkpointsPassed = 0;
    this.lastCheckpointZ = 0;
    this.gameActive = true;
    this.distanceScore = 0;
    this.fragmentScore = 0;
    this.moveSpeed = this.baseMoveSpeed;
    this.speedMultiplier = 1;
    this.currentThemeIndex = 0;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.perspectiveCenterX = w / 2;
    this.perspectiveCenterY = h * 0.55;
    this.horizonY = h * 0.3;

    this.initAudio();
    this.createSkyPoints();

    const playerX = this.perspectiveCenterX;
    const playerY = h * 0.72;

    this.player = new Player(this, { x: playerX, y: playerY });
    this.ui = new UI(this);

    this.ui.onRestart = () => this.restartGame();
    this.player.onEnergyChange = (e, m, r) => this.ui.updateEnergyDisplay(e, m, r);
    this.player.onImpact = () => this.triggerImpactEffect();
    this.player.onDeath = () => this.handleDeath();

    this.ui.onTouchLeft = () => this.player.moveLeft();
    this.ui.onTouchRight = () => this.player.moveRight();
    this.ui.onTouchJump = () => this.player.jump();
    this.ui.onTouchJump2 = () => this.player.tryImpact();

    this.setupInput();
    this.generateInitialPlatforms();
    this.scale.on('resize', this.onResize, this);
  }

  initAudio() {
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.shardPickupGainNode = this.audioCtx.createGain();
      this.shardPickupGainNode.gain.value = 0.15;
      this.shardPickupGainNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Audio not supported');
    }
  }

  playShardSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  createSkyPoints() {
    const theme = THEMES[this.currentThemeIndex];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics();
      const size = 1 + Math.random() * 3;
      const sp: SkyPoint = {
        sprite: g,
        x: Math.random() * this.scale.width,
        y: Math.random() * this.horizonY,
        speed: 0.2 + Math.random() * 0.8,
        size: size
      };
      this.skyPoints.push(sp);
      this.updateSkyPointVisual(sp, theme);
    }
  }

  updateSkyPointVisual(sp: SkyPoint, theme: typeof THEMES[0]) {
    sp.sprite.clear();
    sp.sprite.setDepth(2);
    sp.sprite.setBlendMode(Phaser.BlendModes.ADD);
    sp.sprite.fillStyle(theme.accent, 0.6 + Math.random() * 0.4);
    sp.sprite.fillCircle(sp.x, sp.y, sp.size);
  }

  setupInput() {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.keyA.on('down', () => { if (this.gameActive) this.player.moveLeft(); });
    this.keyD.on('down', () => { if (this.gameActive) this.player.moveRight(); });
    this.cursors.left.on('down', () => { if (this.gameActive) this.player.moveLeft(); });
    this.cursors.right.on('down', () => { if (this.gameActive) this.player.moveRight(); });
    this.keySpace.on('down', () => { if (this.gameActive) this.player.jump(); });
    this.cursors.up.on('down', () => { if (this.gameActive) this.player.jump(); });
    this.keyE.on('down', () => { if (this.gameActive) this.player.tryImpact(); });
  }

  generateInitialPlatforms() {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const z = i * this.platformSpacing;
      this.generatePlatform(z, i < 3);
    }
  }

  generatePlatform(z: number, safe: boolean = false) {
    const container = this.add.container(this.perspectiveCenterX, this.perspectiveCenterY);
    container.setDepth(PLATFORM_DEPTH);

    const graphics = this.add.graphics();
    const border = this.add.graphics();
    container.add([graphics, border]);

    const hasGapLeft = !safe && Math.random() < 0.3;
    const hasGapRight = !safe && Math.random() < 0.3 && !hasGapLeft;
    const gapWidthLeft = hasGapLeft ? 0.3 + Math.random() * 0.3 : 0;
    const gapWidthRight = hasGapRight ? 0.3 + Math.random() * 0.3 : 0;
    const laneIndex = Math.floor(z / this.platformSpacing);

    const platform: Platform = {
      container,
      graphics,
      border,
      z,
      width: PLATFORM_SIZE,
      height: 40,
      laneIndex,
      hasGapLeft,
      hasGapRight,
      gapWidthLeft,
      gapWidthRight
    };

    this.platforms.push(platform);
    this.updatePlatformVisual(platform);

    if (!safe) {
      this.maybeGenerateObstacles(z);
      this.maybeGenerateShards(z);
    }
  }

  maybeGenerateObstacles(z: number) {
    const obstacleChance = 0.5 + (this.currentThemeIndex * 0.1);
    if (Math.random() > obstacleChance) return;

    const numObstacles = 1 + Math.floor(Math.random() * (1 + this.currentThemeIndex));
    const usedLanes = new Set<number>();

    for (let i = 0; i < numObstacles; i++) {
      let lane = Math.floor(Math.random() * 3);
      let attempts = 0;
      while (usedLanes.has(lane) && attempts < 5) {
        lane = Math.floor(Math.random() * 3);
        attempts++;
      }
      if (usedLanes.size >= 2) break;
      usedLanes.add(lane);

      this.createObstacle(z, lane);
    }
  }

  createObstacle(z: number, lane: number): Obstacle {
    const container = this.add.container(this.perspectiveCenterX, this.perspectiveCenterY);
    container.setDepth(PLATFORM_DEPTH + 1);

    const graphics = this.add.graphics();
    container.add(graphics);

    const obstacle: Obstacle = {
      container,
      graphics,
      z: z + Math.random() * 50 - 25,
      lane,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.06,
      alive: true
    };

    this.obstacles.push(obstacle);
    this.updateObstacleVisual(obstacle);
    return obstacle;
  }

  maybeGenerateShards(z: number) {
    const shardChance = 0.7;
    if (Math.random() > shardChance) return;

    const numShards = 1 + Math.floor(Math.random() * 3);
    const usedLanes = new Set<number>();

    for (let i = 0; i < numShards; i++) {
      let lane = Math.floor(Math.random() * 3);
      let attempts = 0;
      while (usedLanes.has(lane) && attempts < 5) {
        lane = Math.floor(Math.random() * 3);
        attempts++;
      }
      usedLanes.add(lane);
      this.createShard(z, lane);
    }
  }

  createShard(z: number, lane: number): Shard {
    const container = this.add.container(this.perspectiveCenterX, this.perspectiveCenterY);
    container.setDepth(PLATFORM_DEPTH + 2);

    const glow = this.add.graphics();
    const graphics = this.add.graphics();
    container.add([glow, graphics]);

    const shard: Shard = {
      container,
      graphics,
      glow,
      z: z + Math.random() * 100,
      lane,
      bobPhase: Math.random() * Math.PI * 2,
      rotation: 0,
      collected: false,
      targetPlayer: false,
      collectProgress: 0
    };

    this.shards.push(shard);
    this.updateShardVisual(shard);
    return shard;
  }

  getThemeTransition(): { theme: typeof THEMES[0]; blend: number } {
    const nextIndex = Math.min(this.currentThemeIndex + 1, THEMES.length - 1);
    const current = THEMES[this.currentThemeIndex];
    const next = THEMES[nextIndex];
    const blend = Math.min(1, this.themeTimer / this.themeDuration);
    if (this.currentThemeIndex >= THEMES.length - 1) {
      return { theme: current, blend: 0 };
    }
    const easedBlend = blend * blend * (3 - 2 * blend);
    return { theme: this.lerpTheme(current, next, easedBlend), blend: easedBlend };
  }

  lerpTheme(a: typeof THEMES[0], b: typeof THEMES[0], t: number): typeof THEMES[0] {
    return {
      name: t < 0.5 ? a.name : b.name,
      primary: Phaser.Display.Color.GetColor(
        this.lerpColorComponent(a.primary, b.primary, t, 16),
        this.lerpColorComponent(a.primary, b.primary, t, 8),
        this.lerpColorComponent(a.primary, b.primary, t, 0)
      ),
      secondary: Phaser.Display.Color.GetColor(
        this.lerpColorComponent(a.secondary, b.secondary, t, 16),
        this.lerpColorComponent(a.secondary, b.secondary, t, 8),
        this.lerpColorComponent(a.secondary, b.secondary, t, 0)
      ),
      accent: Phaser.Display.Color.GetColor(
        this.lerpColorComponent(a.accent, b.accent, t, 16),
        this.lerpColorComponent(a.accent, b.accent, t, 8),
        this.lerpColorComponent(a.accent, b.accent, t, 0)
      ),
      bg: a.bg
    };
  }

  lerpColorComponent(a: number, b: number, t: number, shift: number): number {
    const ac = (a >> shift) & 0xff;
    const bc = (b >> shift) & 0xff;
    return Math.round(ac + (bc - ac) * t);
  }

  updatePlatformVisual(p: Platform) {
    const { theme } = this.getThemeTransition();
    const w = this.scale.width;
    const h = this.scale.height;
    const proj = this.project3D(p.z, 0, 0);

    const scale = proj.scale;
    const perspectiveW = p.width * scale;
    const perspectiveH = p.height * scale;

    p.container.setPosition(proj.x, proj.y);

    p.graphics.clear();
    p.border.clear();

    let startLane = 0;
    let endLane = 3;

    const gapStartXLeft = -perspectiveW / 2;
    const gapEndXLeft = gapStartXLeft + perspectiveW * p.gapWidthLeft;
    const gapStartXRight = perspectiveW / 2 - perspectiveW * p.gapWidthRight;
    const gapEndXRight = perspectiveW / 2;

    const segments: [number, number][] = [];
    let segStart = -perspectiveW / 2;

    if (p.hasGapLeft) {
      segments.push([segStart, gapEndXLeft]);
      segStart = gapEndXLeft + perspectiveW * 0.08;
    }
    if (p.hasGapRight) {
      segments.push([segStart, gapStartXRight]);
    } else {
      segments.push([segStart, perspectiveW / 2]);
    }

    for (const [sx, ex] of segments) {
      const segW = ex - sx;
      if (segW < 10 * scale) continue;

      p.graphics.fillStyle(theme.primary, 0.6);
      p.graphics.fillRoundedRect(sx, -perspectiveH / 2, segW, perspectiveH, 8 * scale);

      p.graphics.fillStyle(theme.secondary, 0.35);
      p.graphics.fillRoundedRect(sx + 4 * scale, -perspectiveH / 2 + 4 * scale, segW - 8 * scale, perspectiveH - 8 * scale, 6 * scale);

      p.border.lineStyle(Math.max(1, 3 * scale), theme.accent, 0.85);
      p.border.strokeRoundedRect(sx, -perspectiveH / 2, segW, perspectiveH, 8 * scale);

      p.border.lineStyle(Math.max(1, 2 * scale), theme.accent, 0.5);
      p.border.beginPath();
      p.border.moveTo(sx + 10 * scale, -perspectiveH / 2 + perspectiveH / 2);
      p.border.lineTo(ex - 10 * scale, -perspectiveH / 2 + perspectiveH / 2);
      p.border.strokePath();
    }
  }

  updateObstacleVisual(o: Obstacle) {
    const proj = this.project3D(o.z, (o.lane - 1) * LANE_WIDTH, -40);
    const scale = proj.scale;

    o.container.setPosition(proj.x, proj.y);

    o.graphics.clear();
    if (!o.alive) return;

    const size = 30 * scale;
    const height = 60 * scale;

    o.graphics.save();
    o.graphics.rotate(o.rotation);

    o.graphics.fillStyle(0xff3344, 0.85);
    o.graphics.fillTriangle(-size, -height / 2, size, -height / 2, 0, -height / 2 - size * 0.7);

    o.graphics.fillStyle(0xdd2233, 0.95);
    o.graphics.fillRoundedRect(-size * 0.8, -height / 2, size * 1.6, height, 4 * scale);

    o.graphics.fillStyle(0xff5566, 0.7);
    o.graphics.fillTriangle(-size, height / 2, size, height / 2, 0, height / 2 + size * 0.7);

    o.graphics.lineStyle(Math.max(1, 2 * scale), 0xffaaaa, 0.8);
    o.graphics.strokeRoundedRect(-size * 0.8, -height / 2, size * 1.6, height, 4 * scale);

    o.graphics.fillStyle(0xffddaa, 0.9);
    o.graphics.fillCircle(0, 0, size * 0.3);

    o.graphics.restore();
  }

  updateShardVisual(s: Shard) {
    const proj = this.project3D(s.z, (s.lane - 1) * LANE_WIDTH, -80 + Math.sin(s.bobPhase) * 15);
    const scale = proj.scale;

    s.container.setPosition(proj.x, proj.y);

    s.glow.clear();
    s.graphics.clear();
    if (s.collected) return;

    const size = 14 * scale;

    s.glow.fillStyle(0xffdd44, 0.3 * scale);
    s.glow.fillCircle(0, 0, size * 3);
    s.glow.fillStyle(0xffaa22, 0.2 * scale);
    s.glow.fillCircle(0, 0, size * 5);

    s.graphics.save();
    s.graphics.rotate(s.rotation);

    s.graphics.fillStyle(0xffdd44, 1);
    s.graphics.fillTriangle(0, -size, size * 0.9, size * 0.6, -size * 0.9, size * 0.6);

    s.graphics.fillStyle(0xffff88, 1);
    s.graphics.fillTriangle(0, -size * 0.7, size * 0.5, size * 0.2, -size * 0.5, size * 0.2);

    s.graphics.lineStyle(Math.max(1, 1.5 * scale), 0xffffaa, 0.9);
    s.graphics.strokeTriangle(0, -size, size * 0.9, size * 0.6, -size * 0.9, size * 0.6);

    s.graphics.restore();
  }

  project3D(z: number, offsetX: number, offsetY: number): { x: number; y: number; scale: number } {
    const effectiveZ = Math.max(0.1, z);
    const scale = PERSPECTIVE / (PERSPECTIVE + effectiveZ);
    const x = this.perspectiveCenterX + offsetX * scale;
    const horizonY = this.horizonY;
    const groundY = this.scale.height * 0.95;
    const y = horizonY + (groundY - horizonY) * scale + offsetY * scale;
    return { x, y, scale };
  }

  update(time: number, delta: number) {
    if (!this.gameActive) {
      this.ui.update(time, delta);
      return;
    }

    const dt = delta / 16.66;
    const speed = this.moveSpeed * this.speedMultiplier * dt;
    this.currentZ += speed;

    this.themeTimer += delta * this.speedMultiplier;
    if (this.themeTimer >= this.themeDuration && this.currentThemeIndex < THEMES.length - 1) {
      this.advanceTheme();
    }

    this.distanceScore = Math.floor(this.currentZ / 10);
    this.ui.setScore(this.distanceScore + this.fragmentScore);

    if (this.currentZ - this.lastCheckpointZ >= this.checkpointInterval) {
      this.lastCheckpointZ = this.currentZ;
      this.checkpointsPassed++;
      if (this.checkpointsPassed % 3 === 0 && this.currentThemeIndex < THEMES.length - 1) {
      }
    }

    this.updatePlatforms(speed);
    this.updateObstacles(speed, time);
    this.updateShards(speed, time);
    this.updateSkyPoints(dt);
    this.updateImpactRings(dt);

    this.checkCollisions();
    this.updateThemeVisuals();

    this.player.update(time, delta);
    this.ui.update(time, delta);
  }

  updatePlatforms(speed: number) {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      p.z -= speed;
      this.updatePlatformVisual(p);

      if (p.z < -200) {
        p.container.destroy();
        this.platforms.splice(i, 1);
      }
    }

    const maxZ = this.platforms.length > 0 ? Math.max(...this.platforms.map(p => p.z)) : 0;
    while (maxZ < this.currentZ + 12 * this.platformSpacing) {
      const newZ = (this.platforms.length > 0 ? Math.max(...this.platforms.map(p => p.z)) : 0) + this.platformSpacing;
      this.generatePlatform(newZ);
      if (this.platforms.length > 0 && Math.max(...this.platforms.map(p => p.z)) >= this.currentZ + 12 * this.platformSpacing) break;
    }
  }

  updateObstacles(speed: number, time: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.z -= speed;
      o.rotation += o.rotationSpeed;

      if (o.alive) {
        this.updateObstacleVisual(o);
      }

      if (o.z < -200 || !o.alive) {
        o.container.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  updateShards(speed: number, time: number) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];

      if (s.targetPlayer) {
        s.collectProgress += 0.08;
        const t = s.collectProgress;
        const startProj = this.project3D(0, (s.lane - 1) * LANE_WIDTH, 0);
        const startX = startProj.x;
        const startY = startProj.y - 100;

        const easeT = t * t * (3 - 2 * t);
        const px = this.player.container.x;
        const py = this.player.container.y;

        s.container.x = startX + (px - startX) * easeT + Math.sin(t * Math.PI * 4) * 30 * (1 - t);
        s.container.y = startY + (py - startY) * easeT + Math.cos(t * Math.PI * 4) * 20 * (1 - t);

        const scale = 1 - t * 0.5;
        s.container.setScale(scale);

        if (t >= 1) {
          this.collectShardComplete(s);
          s.container.destroy();
          this.shards.splice(i, 1);
          continue;
        }
      } else {
        s.z -= speed;
        s.rotation += 0.03;
        s.bobPhase += 0.05;
        this.updateShardVisual(s);
      }

      if (s.z < -200) {
        s.container.destroy();
        this.shards.splice(i, 1);
      }
    }
  }

  collectShardComplete(s: Shard) {
    if (s.collected) return;
    s.collected = true;
    this.player.collectShard();
    this.fragmentScore += 10;
    this.playShardSound();
  }

  updateSkyPoints(dt: number) {
    const { theme } = this.getThemeTransition();
    for (const sp of this.skyPoints) {
      sp.x -= sp.speed * dt * 0.3;
      if (sp.x < -10) {
        sp.x = this.scale.width + 10;
        sp.y = Math.random() * this.horizonY;
      }
      this.updateSkyPointVisual(sp, theme);
    }
  }

  updateImpactRings(dt: number) {
    for (let i = this.impactRings.length - 1; i >= 0; i--) {
      const r = this.impactRings[i];
      r.radius += 25 * dt;
      r.alpha -= 0.025 * dt;

      r.graphics.clear();
      if (r.alpha > 0) {
        r.graphics.lineStyle(8, r.color, r.alpha * 0.7);
        r.graphics.strokeCircle(this.player.container.x, this.player.container.y, r.radius);
        r.graphics.lineStyle(4, 0xffffff, r.alpha * 0.5);
        r.graphics.strokeCircle(this.player.container.x, this.player.container.y, r.radius * 0.9);
      }

      if (r.alpha <= 0) {
        r.graphics.destroy();
        this.impactRings.splice(i, 1);
      }
    }
  }

  checkCollisions() {
    const playerLane = this.player.currentLane;
    const jumpHeight = this.player.getJumpHeightRatio();
    const playerWorldZ = this.currentZ;

    for (const o of this.obstacles) {
      if (!o.alive) continue;
      const dz = o.z - playerWorldZ;
      if (Math.abs(dz) < 120 && o.lane === playerLane && jumpHeight < 0.5) {
        this.gameOver();
        return;
      }
    }

    const nearestPlatform = this.platforms.find(p => {
      const dz = p.z - playerWorldZ;
      return dz > -50 && dz < 200;
    });

    if (nearestPlatform && jumpHeight < 0.3) {
      const dz = nearestPlatform.z - playerWorldZ;
      if (dz < 100 && dz > -30) {
        const gapLeft = nearestPlatform.hasGapLeft && playerLane === 0;
        const gapRight = nearestPlatform.hasGapRight && playerLane === 2;
        const gapMid = playerLane === 1 && nearestPlatform.hasGapLeft && nearestPlatform.hasGapRight;
        if ((gapLeft || gapRight || gapMid) && jumpHeight < 0.15) {
          this.gameOver();
          return;
        }
      }
    }

    for (const s of this.shards) {
      if (s.collected || s.targetPlayer) continue;
      const dz = s.z - playerWorldZ;
      if (Math.abs(dz) < 100 && s.lane === playerLane) {
        s.targetPlayer = true;
        s.collectProgress = 0;
      }
    }
  }

  updateThemeVisuals() {
    const { theme } = this.getThemeTransition();
    this.ui.updateThemeDisplay(theme);
    this.speedMultiplier = 1 + (this.currentThemeIndex / 3) * 0.3;
  }

  advanceTheme() {
    if (this.currentThemeIndex < THEMES.length - 1) {
      this.currentThemeIndex++;
      this.themeTimer = 0;
      this.speedMultiplier = 1 + (this.currentThemeIndex / 3) * 0.3;

      this.cameras.main.flash(500, 255, 255, 255, true);
    }
  }

  triggerImpactEffect() {
    const colors = [0xffdd44, 0xff8844, 0xff44aa, 0x88ff88, 0x44ddff];
    for (let i = 0; i < 4; i++) {
      const g = this.add.graphics();
      g.setDepth(150);
      g.setBlendMode(Phaser.BlendModes.ADD);
      this.impactRings.push({
        graphics: g,
        radius: 10 + i * 20,
        alpha: 1 - i * 0.15,
        maxRadius: 500,
        color: colors[i % colors.length]
      });
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (Math.abs(o.z - this.currentZ) < 1200) {
        o.alive = false;
      }
    }

    for (const p of this.platforms) {
      if (Math.abs(p.z - this.currentZ) < 800) {
        p.hasGapLeft = false;
        p.hasGapRight = false;
        p.gapWidthLeft = 0;
        p.gapWidthRight = 0;
        this.updatePlatformVisual(p);
      }
    }
  }

  gameOver() {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.player.die();
    this.time.delayedCall(1000, () => {
      this.ui.showDeath();
    });
  }

  handleDeath() {
  }

  restartGame() {
    for (const p of this.platforms) p.container.destroy();
    for (const o of this.obstacles) o.container.destroy();
    for (const s of this.shards) s.container.destroy();
    for (const r of this.impactRings) r.graphics.destroy();

    this.platforms = [];
    this.obstacles = [];
    this.shards = [];
    this.impactRings = [];

    this.init();
    this.generateInitialPlatforms();
    this.player.reset();
    this.ui.setScore(0);
    this.ui.updateEnergyDisplay(0, 30, false);
    this.ui.updateThemeDisplay(THEMES[0]);
    this.cameras.main.resetFX();
  }

  onResize = () => {
    const w = this.scale.width;
    const h = this.scale.height;
    this.perspectiveCenterX = w / 2;
    this.perspectiveCenterY = h * 0.55;
    this.horizonY = h * 0.3;

    const playerX = this.perspectiveCenterX;
    const playerY = h * 0.72;
    this.player.setPosition(playerX, playerY);
    this.player.baseX = playerX;
    this.player.baseY = playerY;
    this.player.targetX = playerX;
    this.player.targetY = playerY;

    for (const p of this.platforms) this.updatePlatformVisual(p);
    for (const o of this.obstacles) this.updateObstacleVisual(o);
    for (const s of this.shards) this.updateShardVisual(s);

    this.ui.onResize();
  };
}
