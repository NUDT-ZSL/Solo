import Phaser from 'phaser';
import { Player } from './Player';
import { SoundWave } from './SoundWave';
import { GAME_WIDTH, GAME_HEIGHT } from './main';

const TILE = 32;
const MAP_COLS = 80;
const MAP_ROWS = 60;
const MAP_WIDTH = MAP_COLS * TILE;
const MAP_HEIGHT = MAP_ROWS * TILE;

const CRYSTAL_HP = 3;
const MAX_PARTICLES = 300;
const SPIRIT_FOLLOW_SPEED = 160;
const SPIRIT_FOLLOW_DIST = 50;

interface LevelConfig {
  level: number;
  timeLimit: number;
  requiredSpirits: number;
  roomCount: number;
  crystalCount: number;
  spiritCount: number;
}

const LEVELS: LevelConfig[] = [
  { level: 1, timeLimit: 90, requiredSpirits: 3, roomCount: 5, crystalCount: 6, spiritCount: 4 },
  { level: 2, timeLimit: 80, requiredSpirits: 4, roomCount: 6, crystalCount: 8, spiritCount: 5 },
  { level: 3, timeLimit: 70, requiredSpirits: 5, roomCount: 7, crystalCount: 10, spiritCount: 6 },
];

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

interface SpiritFollower {
  sprite: Phaser.Physics.Arcade.Sprite;
  glow: Phaser.GameObjects.Ellipse;
  target: { x: number; y: number };
  index: number;
  awakened: boolean;
}

export class GameScene extends Phaser.Scene {
  private currentLevel: number = 0;
  private levelConfig!: LevelConfig;
  private player!: Player;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private crystalGroup!: Phaser.Physics.Arcade.StaticGroup;
  private spiritGroup!: Phaser.Physics.Arcade.StaticGroup;
  private crystalHP: Map<Phaser.Physics.Arcade.Sprite, number> = new Map();
  private spiritAwakened: Map<Phaser.Physics.Arcade.Sprite, boolean> = new Map();
  private spiritFollowers: SpiritFollower[] = [];
  private awakenedCount: number = 0;
  private timeRemaining: number = 0;
  private timerText!: Phaser.GameObjects.Text;
  private spiritCountText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapBg!: Phaser.GameObjects.Rectangle;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private exploredTiles: Set<string> = new Set();
  private tileMap: number[][] = [];
  private rooms: Room[] = [];
  private particleCount: number = 0;
  private gameActive: boolean = false;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private fadeOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.currentLevel = 0;
    this.startLevel();
  }

  private startLevel(): void {
    this.cleanup();

    this.levelConfig = this.getLevelConfig(this.currentLevel);
    this.timeRemaining = this.levelConfig.timeLimit;
    this.awakenedCount = 0;

    this.createBackground();
    this.generateMap();
    this.createWallGroup();
    this.createCrystals();
    this.createSpirits();
    this.createPlayer();
    this.setupCamera();
    this.createUI();
    this.createMinimap();
    this.createFadeOverlay();

    this.gameActive = true;

    this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private getLevelConfig(level: number): LevelConfig {
    if (level < LEVELS.length) return { ...LEVELS[level] };
    return {
      level: level + 1,
      timeLimit: Math.max(50, 90 - level * 5),
      requiredSpirits: Math.min(8, 3 + level),
      roomCount: Math.min(10, 5 + level),
      crystalCount: Math.min(15, 6 + level * 2),
      spiritCount: Math.min(10, 4 + level),
    };
  }

  private cleanup(): void {
    this.crystalHP.clear();
    this.spiritAwakened.clear();
    this.spiritFollowers = [];
    this.exploredTiles.clear();
    this.particleCount = 0;
    this.rooms = [];
  }

  private createBackground(): void {
    if (this.bgGraphics) this.bgGraphics.destroy();
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);
    const grad = this.bgGraphics;
    for (let y = 0; y < MAP_HEIGHT; y += 8) {
      const t = y / MAP_HEIGHT;
      const r = Math.floor(5 + t * 10);
      const g = Math.floor(5 + t * 8);
      const b = Math.floor(30 + t * 20);
      grad.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      grad.fillRect(0, y, MAP_WIDTH, 8);
    }
  }

  private generateMap(): void {
    this.tileMap = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(1));
    this.rooms = [];

    for (let i = 0; i < this.levelConfig.roomCount * 3; i++) {
      if (this.rooms.length >= this.levelConfig.roomCount) break;
      const rw = Phaser.Math.Between(6, 12);
      const rh = Phaser.Math.Between(5, 9);
      const rx = Phaser.Math.Between(2, MAP_COLS - rw - 2);
      const ry = Phaser.Math.Between(2, MAP_ROWS - rh - 2);

      let overlap = false;
      for (const room of this.rooms) {
        if (
          rx < room.x + room.w + 2 &&
          rx + rw + 2 > room.x &&
          ry < room.y + room.h + 2 &&
          ry + rh + 2 > room.y
        ) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      this.rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) });

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          this.tileMap[y][x] = 0;
        }
      }
    }

    for (let i = 0; i < this.rooms.length - 1; i++) {
      const a = this.rooms[i];
      const b = this.rooms[i + 1];
      this.carveCorridor(a.cx, a.cy, b.cx, b.cy);
    }

    if (this.rooms.length > 2) {
      const a = this.rooms[this.rooms.length - 1];
      const b = this.rooms[0];
      this.carveCorridor(a.cx, a.cy, b.cx, b.cy);
    }
  }

  private carveCorridor(x1: number, y1: number, x2: number, y2: number): void {
    let cx = x1;
    let cy = y1;

    while (cx !== x2) {
      this.tileMap[cy][cx] = 0;
      if (cy > 0 && cy < MAP_ROWS - 1) {
        this.tileMap[cy - 1][cx] = 0;
        this.tileMap[cy + 1][cx] = 0;
      }
      cx += cx < x2 ? 1 : -1;
    }
    while (cy !== y2) {
      this.tileMap[cy][cx] = 0;
      if (cx > 0 && cx < MAP_COLS - 1) {
        this.tileMap[cy][cx - 1] = 0;
        this.tileMap[cy][cx + 1] = 0;
      }
      cy += cy < y2 ? 1 : -1;
    }
  }

  private createWallGroup(): void {
    this.wallGroup = this.physics.add.staticGroup();

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (this.tileMap[y][x] === 1) {
          const wall = this.wallGroup.create(x * TILE + TILE / 2, y * TILE + TILE / 2, 'wall') as Phaser.Physics.Arcade.Sprite;
          wall.setDepth(1);
          wall.setImmovable(true);
          const tint = Phaser.Display.Color.GetColor(
            10 + ((x * 7 + y * 13) % 15),
            10 + ((x * 11 + y * 3) % 12),
            40 + ((x * 5 + y * 9) % 30)
          );
          wall.setTint(tint);
        }
      }
    }

    this.wallGroup.refresh();
  }

  private createCrystals(): void {
    this.crystalGroup = this.physics.add.staticGroup();
    const openTiles = this.getOpenTiles();

    for (let i = 0; i < this.levelConfig.crystalCount && openTiles.length > 0; i++) {
      const idx = Phaser.Math.Between(0, openTiles.length - 1);
      const pos = openTiles.splice(idx, 1)[0];
      const crystal = this.crystalGroup.create(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, 'crystal') as Phaser.Physics.Arcade.Sprite;
      crystal.setDepth(3);
      crystal.setImmovable(true);
      this.crystalHP.set(crystal, CRYSTAL_HP);
    }

    this.crystalGroup.refresh();
  }

  private createSpirits(): void {
    this.spiritGroup = this.physics.add.staticGroup();
    const openTiles = this.getOpenTiles();

    for (let i = 0; i < this.levelConfig.spiritCount && openTiles.length > 0; i++) {
      const idx = Phaser.Math.Between(0, openTiles.length - 1);
      const pos = openTiles.splice(idx, 1)[0];
      const spirit = this.spiritGroup.create(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, 'spirit') as Phaser.Physics.Arcade.Sprite;
      spirit.setDepth(4);
      spirit.setImmovable(true);
      this.spiritAwakened.set(spirit, false);

      this.tweens.add({
        targets: spirit,
        alpha: 0.4,
        duration: 1200 + i * 200,
        yoyo: true,
        repeat: -1,
      });
    }

    this.spiritGroup.refresh();
  }

  private getOpenTiles(): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    for (const room of this.rooms) {
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (this.tileMap[y][x] === 0) {
            tiles.push({ x, y });
          }
        }
      }
    }
    return tiles;
  }

  private createPlayer(): void {
    const spawnRoom = this.rooms[0];
    const px = spawnRoom.cx * TILE;
    const py = spawnRoom.cy * TILE;

    this.player = new Player(this, px, py);
    this.player.setWallGroup(this.wallGroup);
    this.player.setCrystalGroup(this.crystalGroup);
    this.player.setSpiritGroup(this.spiritGroup);
    this.player.setOnHitCrystal(this.handleCrystalHit);
    this.player.setOnHitSpirit(this.handleSpiritHit);

    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.crystalGroup);
  }

  private handleCrystalHit = (wave: SoundWave, crystal: Phaser.Physics.Arcade.Sprite): void => {
    if (!this.crystalHP.has(crystal)) return;

    const hp = this.crystalHP.get(crystal)! - wave.getDamage();
    this.crystalHP.set(crystal, hp);

    this.cameras.main.shake(80, 0.003);

    if (hp <= 0) {
      this.shatterCrystal(crystal);
    } else {
      this.tweens.add({
        targets: crystal,
        alpha: 0.5,
        duration: 60,
        yoyo: true,
      });
      crystal.setTint(0x6644aa);
    }

    wave.kill();
  };

  private shatterCrystal(crystal: Phaser.Physics.Arcade.Sprite): void {
    this.crystalHP.delete(crystal);
    this.spawnBurstParticles(crystal.x, crystal.y, 0x6644cc, 20);
    this.tweens.add({
      targets: crystal,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => {
        crystal.destroy();
      },
    });
  }

  private handleSpiritHit = (wave: SoundWave, spirit: Phaser.Physics.Arcade.Sprite): void => {
    if (this.spiritAwakened.get(spirit)) return;

    this.spiritAwakened.set(spirit, true);
    this.awakenedCount++;
    this.player.addSpirit();

    this.spawnBurstParticles(spirit.x, spirit.y, 0x88aaff, 12);

    this.addSpiritFollower(spirit);

    wave.kill();

    if (this.awakenedCount >= this.levelConfig.requiredSpirits) {
      this.levelComplete();
    }
  };

  private addSpiritFollower(spirit: Phaser.Physics.Arcade.Sprite): void {
    const idx = this.spiritFollowers.length;
    const glow = this.add.ellipse(spirit.x, spirit.y, 40, 40, 0x4466ff, 0.25);
    glow.setDepth(8);

    const followerSprite = this.physics.add.sprite(spirit.x, spirit.y, 'spirit');
    (followerSprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (followerSprite.body as Phaser.Physics.Arcade.Body).setCircle(10, 2, 2);
    followerSprite.setDepth(9);
    followerSprite.setScale(1.2);

    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    spirit.destroy();

    this.spiritFollowers.push({
      sprite: followerSprite,
      glow,
      target: { x: spirit.x, y: spirit.y },
      index: idx,
      awakened: true,
    });
  }

  private updateSpiritFollowers(): void {
    for (let i = 0; i < this.spiritFollowers.length; i++) {
      const f = this.spiritFollowers[i];
      const leader = i === 0
        ? { x: this.player.x, y: this.player.y }
        : { x: this.spiritFollowers[i - 1].sprite.x, y: this.spiritFollowers[i - 1].sprite.y };

      const dx = leader.x - f.sprite.x;
      const dy = leader.y - f.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > SPIRIT_FOLLOW_DIST) {
        const speed = SPIRIT_FOLLOW_SPEED + i * 10;
        const body = f.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      } else {
        const body = f.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
      }

      f.glow.setPosition(f.sprite.x, f.sprite.y);
    }
  }

  private spawnBurstParticles(x: number, y: number, color: number, count: number): void {
    const toSpawn = Math.min(count, MAX_PARTICLES - this.particleCount);
    for (let i = 0; i < toSpawn; i++) {
      const p = this.add.image(x, y, 'particle');
      p.setTint(color);
      p.setDepth(7);
      this.particleCount++;

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const lifespan = 400 + Math.random() * 400;

      this.tweens.add({
        targets: p,
        x: x + vx * (lifespan / 1000),
        y: y + vy * (lifespan / 1000),
        alpha: 0,
        scale: 0.2,
        duration: lifespan,
        onComplete: () => {
          p.destroy();
          this.particleCount--;
        },
      });
    }
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
  }

  private createUI(): void {
    this.spiritCountText = this.add.text(20, 20, '', {
      fontSize: '20px',
      color: '#88aaff',
      fontFamily: 'monospace',
      stroke: '#000033',
      strokeThickness: 3,
    }).setDepth(100).setScrollFactor(0);

    this.timerText = this.add.text(20, 48, '', {
      fontSize: '20px',
      color: '#ff6644',
      fontFamily: 'monospace',
      stroke: '#000033',
      strokeThickness: 3,
    }).setDepth(100).setScrollFactor(0);

    this.levelText = this.add.text(GAME_WIDTH / 2, 20, '', {
      fontSize: '22px',
      color: '#aabbff',
      fontFamily: 'serif',
      stroke: '#000033',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    this.updateUIText();
  }

  private updateUIText(): void {
    this.spiritCountText.setText(`精灵: ${this.awakenedCount} / ${this.levelConfig.requiredSpirits}`);
    const mins = Math.floor(this.timeRemaining / 60);
    const secs = this.timeRemaining % 60;
    this.timerText.setText(`时间: ${mins}:${secs.toString().padStart(2, '0')}`);
    this.levelText.setText(`深渊层 ${this.levelConfig.level}`);
  }

  private createMinimap(): void {
    const mw = 160;
    const mh = 120;
    const mx = GAME_WIDTH - mw - 16;
    const my = GAME_HEIGHT - mh - 16;

    this.minimapContainer = this.add.container(mx, my).setDepth(100).setScrollFactor(0);

    this.minimapBg = this.add.rectangle(mw / 2, mh / 2, mw, mh, 0x0a0a30, 0.6);
    this.minimapBg.setStrokeStyle(1, 0x3355aa, 0.5);
    this.minimapContainer.add(this.minimapBg);

    this.minimapGraphics = this.add.graphics();
    this.minimapContainer.add(this.minimapGraphics);
  }

  private updateMinimap(): void {
    const mw = 160;
    const mh = 120;
    const scaleX = mw / MAP_COLS;
    const scaleY = mh / MAP_ROWS;

    const px = Math.floor(this.player.x / TILE);
    const py = Math.floor(this.player.y / TILE);
    const viewRadius = 8;

    for (let dy = -viewRadius; dy <= viewRadius; dy++) {
      for (let dx = -viewRadius; dx <= viewRadius; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        if (tx >= 0 && tx < MAP_COLS && ty >= 0 && ty < MAP_ROWS) {
          this.exploredTiles.add(`${tx},${ty}`);
        }
      }
    }

    this.minimapGraphics.clear();

    this.exploredTiles.forEach(key => {
      const [sx, sy] = key.split(',').map(Number);
      if (this.tileMap[sy] && this.tileMap[sy][sx] === 0) {
        this.minimapGraphics.fillStyle(0x1a1a50, 0.8);
      } else {
        this.minimapGraphics.fillStyle(0x0a0a30, 0.6);
      }
      this.minimapGraphics.fillRect(sx * scaleX, sy * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
    });

    this.minimapGraphics.fillStyle(0x4488ff, 1);
    this.minimapGraphics.fillCircle(px * scaleX, py * scaleY, 2);

    this.spiritAwakened.forEach((awakened, sprite) => {
      if (sprite.active) {
        const sx = Math.floor(sprite.x / TILE);
        const sy = Math.floor(sprite.y / TILE);
        if (this.exploredTiles.has(`${sx},${sy}`)) {
          this.minimapGraphics.fillStyle(awakened ? 0x88ff88 : 0xaabbff, 1);
          this.minimapGraphics.fillCircle(sx * scaleX, sy * scaleY, 1.5);
        }
      }
    });
  }

  private createFadeOverlay(): void {
    this.fadeOverlay = this.add.rectangle(
      MAP_WIDTH / 2, MAP_HEIGHT / 2,
      MAP_WIDTH, MAP_HEIGHT,
      0x000000, 1
    ).setDepth(200);
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 600,
    });
  }

  private tickTimer(): void {
    if (!this.gameActive) return;

    this.timeRemaining--;
    this.updateUIText();

    if (this.timeRemaining <= 10) {
      this.timerText.setColor('#ff2222');
    }

    if (this.timeRemaining <= 0) {
      this.levelFailed();
    }
  }

  private levelComplete(): void {
    this.gameActive = false;

    const text = this.add.text(
      this.player.x, this.player.y - 60,
      '深渊已回响...',
      { fontSize: '28px', color: '#88aaff', fontFamily: 'serif', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        this.tweens.add({
          targets: this.fadeOverlay,
          alpha: 1,
          duration: 600,
          onComplete: () => {
            this.currentLevel++;
            this.scene.restart();
          },
        });
      },
    });
  }

  private levelFailed(): void {
    this.gameActive = false;

    const text = this.add.text(
      this.player.x, this.player.y - 60,
      '回响消散于深渊...',
      { fontSize: '28px', color: '#ff4444', fontFamily: 'serif', stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: text,
      y: text.y - 20,
      duration: 2000,
    });

    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: this.fadeOverlay,
        alpha: 1,
        duration: 600,
        onComplete: () => {
          this.scene.restart();
        },
      });
    });
  }

  update(time: number, delta: number): void {
    if (!this.gameActive) return;

    if (this.player && this.player.active) {
      this.player.update();
    }

    this.updateSpiritFollowers();
    this.updateMinimap();
  }
}
