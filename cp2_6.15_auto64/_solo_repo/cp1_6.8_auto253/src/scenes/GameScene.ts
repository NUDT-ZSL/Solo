import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, PLAYER, FRAGMENT,
  WATER_FLOW, VORTEX, UNDERCURRENT, LEVELS, TRANSITION, UI,
  LevelConfig,
} from '../config';

interface MazeCell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

interface VortexTrap {
  sprite: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  baseAngle: number;
}

interface UndercurrentTrap {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  length: number;
  angle: number;
  speed: number;
  timer: Phaser.Time.TimerEvent;
}

export class GameScene extends Phaser.Scene {
  private currentLevel = 0;
  private levelConfig!: LevelConfig;
  private mazeGrid: MazeCell[][] = [];
  private mazeOffsetX = 0;
  private mazeOffsetY = 0;
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private waterGraphics!: Phaser.GameObjects.Graphics;

  private player!: Phaser.GameObjects.Arc;
  private playerGlow!: Phaser.GameObjects.Arc;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private targetPos: { x: number; y: number } | null = null;
  private lives = PLAYER.maxLives;
  private invincible = false;
  private invincibleTimer = 0;

  private fragments: Phaser.GameObjects.Arc[] = [];
  private fragmentsCollected = 0;
  private fragmentGlows: Phaser.GameObjects.Arc[] = [];

  private vortexTraps: VortexTrap[] = [];
  private undercurrentTraps: UndercurrentTrap[] = [];

  private exitDoor!: Phaser.GameObjects.Arc;
  private exitUnlocked = false;

  private levelText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private pulseGraphics!: Phaser.GameObjects.Graphics;

  private isPaused = false;
  private pauseOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { level: number }): void {
    this.currentLevel = data.level ?? 0;
    this.lives = PLAYER.maxLives;
    this.fragmentsCollected = 0;
    this.exitUnlocked = false;
    this.targetPos = null;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.isPaused = false;
    this.mazeGrid = [];
    this.fragments = [];
    this.fragmentGlows = [];
    this.vortexTraps = [];
    this.undercurrentTraps = [];
  }

  create(): void {
    this.levelConfig = LEVELS[Math.min(this.currentLevel, LEVELS.length - 1)];
    this.cameras.main.fadeIn(TRANSITION.fadeDuration, 0, 0, 0);

    this.createBackground();
    this.generateMaze();
    this.drawMaze();
    this.createWaterFlow();
    this.createExit();
    this.createPlayer();
    this.createFragments();
    this.createTraps();
    this.createUI();
    this.createPauseOverlay();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return;
      this.targetPos = { x: pointer.x, y: pointer.y };
    });
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;
    this.updatePlayerMovement(delta);
    this.updateTraps(time);
    this.updateWaterAnimation(time);
    this.checkFragmentCollision();
    this.checkTrapCollision(time, delta);
    this.checkExitCollision();
    this.updateInvincibility(delta);
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.setDepth(0);
  }

  private generateMaze(): void {
    const { mazeCols, mazeRows } = this.levelConfig;
    this.mazeGrid = [];
    for (let r = 0; r < mazeRows; r++) {
      this.mazeGrid[r] = [];
      for (let c = 0; c < mazeCols; c++) {
        this.mazeGrid[r][c] = {
          row: r, col: c,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        };
      }
    }

    const stack: MazeCell[] = [];
    const start = this.mazeGrid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      }
    }

    const mazeWidth = mazeCols * this.levelConfig.cellSize;
    const mazeHeight = mazeRows * this.levelConfig.cellSize;
    this.mazeOffsetX = (GAME_WIDTH - mazeWidth) / 2;
    this.mazeOffsetY = (GAME_HEIGHT - mazeHeight) / 2;
  }

  private getUnvisitedNeighbors(cell: MazeCell): MazeCell[] {
    const { mazeCols, mazeRows } = this.levelConfig;
    const n: MazeCell[] = [];
    const { row, col } = cell;
    if (row > 0 && !this.mazeGrid[row - 1][col].visited) n.push(this.mazeGrid[row - 1][col]);
    if (row < mazeRows - 1 && !this.mazeGrid[row + 1][col].visited) n.push(this.mazeGrid[row + 1][col]);
    if (col > 0 && !this.mazeGrid[row][col - 1].visited) n.push(this.mazeGrid[row][col - 1]);
    if (col < mazeCols - 1 && !this.mazeGrid[row][col + 1].visited) n.push(this.mazeGrid[row][col + 1]);
    return n;
  }

  private removeWallBetween(a: MazeCell, b: MazeCell): void {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    if (dr === -1) { a.walls.top = false; b.walls.bottom = false; }
    if (dr === 1) { a.walls.bottom = false; b.walls.top = false; }
    if (dc === -1) { a.walls.left = false; b.walls.right = false; }
    if (dc === 1) { a.walls.right = false; b.walls.left = false; }
  }

  private drawMaze(): void {
    this.wallGraphics = this.add.graphics();
    this.wallGraphics.setDepth(5);

    const { mazeCols, mazeRows, cellSize } = this.levelConfig;
    const ox = this.mazeOffsetX;
    const oy = this.mazeOffsetY;

    for (let r = 0; r < mazeRows; r++) {
      for (let c = 0; c < mazeCols; c++) {
        const cell = this.mazeGrid[r][c];
        const cx = ox + c * cellSize;
        const cy = oy + r * cellSize;

        this.wallGraphics.fillStyle(COLORS.wallFill, 0.5);
        this.wallGraphics.fillRect(cx, cy, cellSize, cellSize);

        this.wallGraphics.lineStyle(3, COLORS.wallStroke, 0.9);
        if (cell.walls.top) { this.wallGraphics.lineBetween(cx, cy, cx + cellSize, cy); }
        if (cell.walls.right) { this.wallGraphics.lineBetween(cx + cellSize, cy, cx + cellSize, cy + cellSize); }
        if (cell.walls.bottom) { this.wallGraphics.lineBetween(cx, cy + cellSize, cx + cellSize, cy + cellSize); }
        if (cell.walls.left) { this.wallGraphics.lineBetween(cx, cy, cx, cy + cellSize); }
      }
    }
  }

  private createWaterFlow(): void {
    this.waterGraphics = this.add.graphics();
    this.waterGraphics.setDepth(3).setAlpha(WATER_FLOW.alpha);
  }

  private updateWaterAnimation(time: number): void {
    const g = this.waterGraphics;
    g.clear();
    const { mazeCols, mazeRows, cellSize } = this.levelConfig;
    const ox = this.mazeOffsetX;
    const oy = this.mazeOffsetY;
    const speedMult = this.levelConfig.waterSpeedMult;

    for (let i = 0; i < WATER_FLOW.lineCount; i++) {
      const isHorizontal = i % 2 === 0;
      const t = time * 0.001 * speedMult;
      const color = i % 3 === 0 ? COLORS.waterBlue : i % 3 === 1 ? COLORS.waterCyan : COLORS.waterPurple;
      g.lineStyle(WATER_FLOW.lineWidth, color, 0.6);

      if (isHorizontal) {
        const baseY = oy + ((mazeRows * cellSize) / (WATER_FLOW.lineCount + 1)) * (i + 1);
        g.beginPath();
        g.moveTo(ox, baseY);
        for (let x = ox; x <= ox + mazeCols * cellSize; x += 8) {
          const yOff = Math.sin((x * 0.03) + t + i * 1.5) * 5 + Math.cos((x * 0.01) + t * 0.7) * 3;
          g.lineTo(x, baseY + yOff);
        }
        g.strokePath();
      } else {
        const baseX = ox + ((mazeCols * cellSize) / (WATER_FLOW.lineCount + 1)) * (i + 1);
        g.beginPath();
        g.moveTo(baseX, oy);
        for (let y = oy; y <= oy + mazeRows * cellSize; y += 8) {
          const xOff = Math.sin((y * 0.03) + t + i * 1.5) * 5 + Math.cos((y * 0.01) + t * 0.7) * 3;
          g.lineTo(baseX + xOff, y);
        }
        g.strokePath();
      }
    }
  }

  private getCellCenter(row: number, col: number): { x: number; y: number } {
    const cs = this.levelConfig.cellSize;
    return {
      x: this.mazeOffsetX + col * cs + cs / 2,
      y: this.mazeOffsetY + row * cs + cs / 2,
    };
  }

  private getPassableCells(): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    const { mazeCols, mazeRows } = this.levelConfig;
    for (let r = 0; r < mazeRows; r++) {
      for (let c = 0; c < mazeCols; c++) {
        const cell = this.mazeGrid[r][c];
        if (!cell.walls.top || !cell.walls.right || !cell.walls.bottom || !cell.walls.left) {
          if (!(r === 0 && c === 0) && !(r === mazeRows - 1 && c === mazeCols - 1)) {
            cells.push({ row: r, col: c });
          }
        }
      }
    }
    return cells;
  }

  private createPlayer(): void {
    const pos = this.getCellCenter(0, 0);

    this.playerGlow = this.add.circle(pos.x, pos.y, PLAYER.radius + 6, COLORS.playerGlow, 0.3);
    this.playerGlow.setDepth(20);

    this.player = this.add.circle(pos.x, pos.y, PLAYER.radius, COLORS.playerCore, 1);
    this.player.setDepth(21);

    this.createTrailEmitter();
  }

  private createTrailEmitter(): void {
    const canvas = this.textures.createCanvas('trailParticle', 8, 8)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#44aaee';
    ctx.beginPath();
    ctx.arc(4, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();

    this.trailEmitter = this.add.particles(this.player.x, this.player.y, 'trailParticle', {
      lifespan: PLAYER.trailLifespan,
      quantity: PLAYER.trailQuantity,
      frequency: 30,
      scale: PLAYER.trailScale,
      alpha: PLAYER.trailAlpha,
      blendMode: 'ADD',
      emitting: false,
    });
    this.trailEmitter.setDepth(19);
  }

  private createFragments(): void {
    const passable = this.getPassableCells();
    const shuffled = Phaser.Utils.Array.Shuffle(passable);
    const count = Math.min(this.levelConfig.fragmentCount, shuffled.length);

    for (let i = 0; i < count; i++) {
      const pos = this.getCellCenter(shuffled[i].row, shuffled[i].col);
      const glow = this.add.circle(pos.x, pos.y, FRAGMENT.radius + 6, COLORS.fragmentGlow, 0.3);
      glow.setDepth(14);

      const frag = this.add.circle(pos.x, pos.y, FRAGMENT.radius, COLORS.fragmentCore, 1);
      frag.setDepth(15);

      this.tweens.add({
        targets: frag,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: FRAGMENT.pulseSpeed,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.15,
        duration: FRAGMENT.pulseSpeed * 0.7,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.fragments.push(frag);
      this.fragmentGlows.push(glow);
    }
  }

  private createTraps(): void {
    const passable = this.getPassableCells();
    const shuffled = Phaser.Utils.Array.Shuffle(passable);
    const trapMult = this.levelConfig.trapSpeedMult;
    let idx = 0;

    for (let i = 0; i < this.levelConfig.vortexCount && idx < shuffled.length; i++, idx++) {
      const pos = this.getCellCenter(shuffled[idx].row, shuffled[idx].col);
      const radius = Phaser.Math.Between(VORTEX.radiusMin, VORTEX.radiusMax);

      const ring = this.add.circle(pos.x, pos.y, radius, COLORS.vortexRing, 0.25);
      ring.setDepth(12);

      const sprite = this.add.circle(pos.x, pos.y, radius * 0.5, COLORS.vortexCore, 0.7);
      sprite.setDepth(13);

      this.vortexTraps.push({
        sprite, ring, x: pos.x, y: pos.y, radius,
        baseAngle: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < this.levelConfig.undercurrentCount && idx < shuffled.length; i++, idx++) {
      const pos = this.getCellCenter(shuffled[idx].row, shuffled[idx].col);
      const length = Phaser.Math.Between(UNDERCURRENT.lengthMin, UNDERCURRENT.lengthMax);
      const speed = Phaser.Math.Between(UNDERCURRENT.speedMin, UNDERCURRENT.speedMax) * trapMult;
      const angle = Math.random() * Math.PI * 2;

      const g = this.add.graphics();
      g.setDepth(12);
      const uc: UndercurrentTrap = {
        graphics: g, x: pos.x, y: pos.y, length, angle, speed,
        timer: this.time.addEvent({
          delay: UNDERCURRENT.directionChangeInterval,
          loop: true,
          callback: () => {
            uc.angle = Math.random() * Math.PI * 2;
            uc.speed = Phaser.Math.Between(UNDERCURRENT.speedMin, UNDERCURRENT.speedMax) * trapMult;
          },
        }),
      };
      this.undercurrentTraps.push(uc);
    }
  }

  private updateTraps(time: number): void {
    for (const v of this.vortexTraps) {
      const angle = v.baseAngle + time * 0.003 * this.levelConfig.trapSpeedMult;
      v.ring.setRotation(angle);
      v.sprite.setRotation(angle * 1.5);
    }

    for (const uc of this.undercurrentTraps) {
      uc.graphics.clear();
      uc.graphics.lineStyle(UNDERCURRENT.width, COLORS.undercurrent, 0.35);
      const dx = Math.cos(uc.angle) * uc.length * 0.5;
      const dy = Math.sin(uc.angle) * uc.length * 0.5;
      uc.graphics.beginPath();
      uc.graphics.moveTo(uc.x - dx, uc.y - dy);
      uc.graphics.lineTo(uc.x + dx, uc.y + dy);
      uc.graphics.strokePath();

      uc.graphics.lineStyle(UNDERCURRENT.width * 0.4, COLORS.waterCyan, 0.5);
      const t = time * 0.001 * uc.speed * 0.02;
      for (let s = 0; s < 3; s++) {
        const frac = ((t + s * 0.33) % 1);
        const sx = uc.x - dx + dx * 2 * frac;
        const sy = uc.y - dy + dy * 2 * frac;
        uc.graphics.fillStyle(COLORS.waterCyan, 0.4 * (1 - Math.abs(frac - 0.5) * 2));
        uc.graphics.fillCircle(sx, sy, 4);
      }
    }
  }

  private createExit(): void {
    const pos = this.getCellCenter(this.levelConfig.mazeRows - 1, this.levelConfig.mazeCols - 1);
    this.exitDoor = this.add.circle(pos.x, pos.y, 16, COLORS.exitLocked, 0.6);
    this.exitDoor.setDepth(14);

    this.add.text(pos.x, pos.y + 26, '出口', {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeSmall, color: '#888899',
    }).setOrigin(0.5).setDepth(14);
  }

  private updatePlayerMovement(delta: number): void {
    if (!this.targetPos) {
      this.trailEmitter.emitting = false;
      return;
    }

    const dx = this.targetPos.x - this.player.x;
    const dy = this.targetPos.y - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      this.targetPos = null;
      this.trailEmitter.emitting = false;
      return;
    }

    const step = PLAYER.speed * (delta / 1000);
    const moveX = (dx / dist) * Math.min(step, dist);
    const moveY = (dy / dist) * Math.min(step, dist);

    const nextX = this.player.x + moveX;
    const nextY = this.player.y + moveY;

    if (!this.isWallCollision(nextX, nextY)) {
      this.player.x = nextX;
      this.player.y = nextY;
      this.playerGlow.x = nextX;
      this.playerGlow.y = nextY;
      this.trailEmitter.setPosition(nextX, nextY);
      this.trailEmitter.emitting = true;
    } else {
      const nextXOnly = this.player.x + moveX;
      const nextYOnly = this.player.y + moveY;
      let moved = false;
      if (!this.isWallCollision(nextXOnly, this.player.y)) {
        this.player.x = nextXOnly;
        this.playerGlow.x = nextXOnly;
        moved = true;
      }
      if (!this.isWallCollision(this.player.x, nextYOnly)) {
        this.player.y = nextYOnly;
        this.playerGlow.y = nextYOnly;
        moved = true;
      }
      this.trailEmitter.setPosition(this.player.x, this.player.y);
      this.trailEmitter.emitting = moved;
    }
  }

  private isWallCollision(px: number, py: number): boolean {
    const { mazeCols, mazeRows, cellSize } = this.levelConfig;
    const ox = this.mazeOffsetX;
    const oy = this.mazeOffsetY;
    const r = PLAYER.radius * 0.8;

    const checkPoints = [
      { x: px - r, y: py - r }, { x: px + r, y: py - r },
      { x: px - r, y: py + r }, { x: px + r, y: py + r },
    ];

    for (const pt of checkPoints) {
      const col = Math.floor((pt.x - ox) / cellSize);
      const row = Math.floor((pt.y - oy) / cellSize);

      if (row < 0 || row >= mazeRows || col < 0 || col >= mazeCols) return true;

      const cell = this.mazeGrid[row][col];
      const cellLeft = ox + col * cellSize;
      const cellRight = cellLeft + cellSize;
      const cellTop = oy + row * cellSize;
      const cellBottom = cellTop + cellSize;

      if (cell.walls.top && pt.y < cellTop + 3 && py > cellTop - r) return true;
      if (cell.walls.bottom && pt.y > cellBottom - 3 && py < cellBottom + r) return true;
      if (cell.walls.left && pt.x < cellLeft + 3 && px > cellLeft - r) return true;
      if (cell.walls.right && pt.x > cellRight - 3 && px < cellRight + r) return true;
    }

    return false;
  }

  private checkFragmentCollision(): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, frag.x, frag.y);
      if (dist < PLAYER.radius + FRAGMENT.radius) {
        this.collectFragment(i);
      }
    }
  }

  private collectFragment(index: number): void {
    const frag = this.fragments[index];
    const glow = this.fragmentGlows[index];

    this.createBurstParticles(frag.x, frag.y);

    this.tweens.add({
      targets: [frag, glow],
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => {
        frag.destroy();
        glow.destroy();
      },
    });

    this.fragments.splice(index, 1);
    this.fragmentGlows.splice(index, 1);
    this.fragmentsCollected++;

    this.updateProgressText();

    if (this.fragmentsCollected >= FRAGMENT.requiredCount) {
      this.unlockExit();
    }
  }

  private createBurstParticles(x: number, y: number): void {
    const canvas = this.textures.createCanvas('burstParticle', 8, 8)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();

    const emitter = this.add.particles(x, y, 'burstParticle', {
      lifespan: FRAGMENT.burstLifespan,
      quantity: FRAGMENT.burstQuantity,
      speed: FRAGMENT.burstSpeed,
      scale: FRAGMENT.burstScale,
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(25);
    emitter.explode(FRAGMENT.burstQuantity);

    this.time.delayedCall(FRAGMENT.burstLifespan + 100, () => {
      emitter.destroy();
    });
  }

  private unlockExit(): void {
    this.exitUnlocked = true;
    this.tweens.add({
      targets: this.exitDoor,
      alpha: 1,
      duration: 500,
    });
    this.tweens.add({
      targets: this.exitDoor,
      fillColor: COLORS.exitUnlocked,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private checkTrapCollision(time: number, delta: number): void {
    if (this.invincible) return;

    for (const v of this.vortexTraps) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y);
      if (dist < v.radius + PLAYER.radius * 0.5) {
        const pull = VORTEX.pullStrength * this.levelConfig.trapSpeedMult * (delta / 1000);
        const angle = Math.atan2(v.y - this.player.y, v.x - this.player.x);
        this.player.x += Math.cos(angle) * pull;
        this.player.y += Math.sin(angle) * pull;
        this.playerGlow.x = this.player.x;
        this.playerGlow.y = this.player.y;

        if (dist < PLAYER.radius + v.radius * 0.4) {
          this.onTrapHit();
          return;
        }
      }
    }

    for (const uc of this.undercurrentTraps) {
      const dx = Math.cos(uc.angle);
      const dy = Math.sin(uc.angle);
      const toPlayerX = this.player.x - uc.x;
      const toPlayerY = this.player.y - uc.y;
      const projLen = toPlayerX * dx + toPlayerY * dy;
      if (projLen < 0 || projLen > uc.length) continue;

      const closestX = uc.x + dx * projLen;
      const closestY = uc.y + dy * projLen;
      const perpDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, closestX, closestY);

      if (perpDist < UNDERCURRENT.width * 0.5 + PLAYER.radius) {
        const push = uc.speed * (delta / 1000);
        this.player.x += dx * push;
        this.player.y += dy * push;
        this.playerGlow.x = this.player.x;
        this.playerGlow.y = this.player.y;

        this.onTrapHit();
        return;
      }
    }
  }

  private onTrapHit(): void {
    if (this.invincible) return;
    this.lives--;
    this.invincible = true;
    this.invincibleTimer = PLAYER.invincibleDuration;

    this.showPulseEffect();

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 5,
    });

    if (this.lives <= 0) {
      this.time.delayedCall(600, () => {
        this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameOverScene', {
            level: this.currentLevel,
            won: false,
            score: this.fragmentsCollected * 100,
          });
        });
      });
    }
  }

  private showPulseEffect(): void {
    if (!this.pulseGraphics) {
      this.pulseGraphics = this.add.graphics();
      this.pulseGraphics.setDepth(30);
    }
    this.pulseGraphics.clear();
    this.pulseGraphics.fillStyle(COLORS.pulseDamage, 0.3);
    this.pulseGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.tweens.add({
      targets: this.pulseGraphics,
      alpha: 0,
      duration: 400,
      onComplete: () => this.pulseGraphics.clear(),
    });
  }

  private updateInvincibility(delta: number): void {
    if (!this.invincible) return;
    this.invincibleTimer -= delta;
    if (this.invincibleTimer <= 0) {
      this.invincible = false;
      this.player.setAlpha(1);
    }
  }

  private checkExitCollision(): void {
    if (!this.exitUnlocked) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.exitDoor.x, this.exitDoor.y
    );
    if (dist < PLAYER.radius + 16) {
      this.goToNextLevel();
    }
  }

  private goToNextLevel(): void {
    const nextLevel = this.currentLevel + 1;
    if (nextLevel >= LEVELS.length) {
      this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameOverScene', {
          level: this.currentLevel,
          won: true,
          score: (this.currentLevel + 1) * 500 + this.lives * 200,
        });
      });
    } else {
      this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { level: nextLevel });
      });
    }
  }

  private createUI(): void {
    const levelLabel = this.currentLevel < LEVELS.length
      ? `第 ${this.currentLevel + 1} 层`
      : `第 ${LEVELS.length} 层`;
    this.levelText = this.add.text(20, 16, levelLabel, {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeMedium, color: '#88bbee',
      stroke: '#112244', strokeThickness: 2,
    });
    this.levelText.setDepth(50);

    this.progressText = this.add.text(20, 44, `碎片: 0 / ${FRAGMENT.requiredCount}`, {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeSmall, color: '#aaccdd',
      stroke: '#112244', strokeThickness: 2,
    });
    this.progressText.setDepth(50);

    const livesText = this.add.text(20, 68, `❤ ${this.lives}`, {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeSmall, color: '#ff6688',
      stroke: '#112244', strokeThickness: 2,
    });
    livesText.setDepth(50);
    this.registry.set('livesText', livesText);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a1a3a, UI.panelAlpha);
    panelBg.fillRoundedRect(GAME_WIDTH - 130, GAME_HEIGHT - 60, 120, 50, UI.panelRadius);
    panelBg.lineStyle(1, COLORS.waterCyan, 0.3);
    panelBg.strokeRoundedRect(GAME_WIDTH - 130, GAME_HEIGHT - 60, 120, 50, UI.panelRadius);
    panelBg.setDepth(49);

    const resetBtn = this.add.text(GAME_WIDTH - 100, GAME_HEIGHT - 36, '重置', {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeSmall, color: '#88bbee',
    }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { level: this.currentLevel });
      });
    });

    const pauseBtn = this.add.text(GAME_WIDTH - 42, GAME_HEIGHT - 36, '暂停', {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeSmall, color: '#88bbee',
    }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerdown', () => this.togglePause());
  }

  private updateProgressText(): void {
    this.progressText.setText(`碎片: ${this.fragmentsCollected} / ${FRAGMENT.requiredCount}`);
    const livesText = this.registry.get('livesText') as Phaser.GameObjects.Text;
    if (livesText) livesText.setText(`❤ ${this.lives}`);
  }

  private createPauseOverlay(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x000011, 0.7);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(80);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '已暂停', {
      fontFamily: UI.fontFamily, fontSize: '36px', color: '#88bbee',
    }).setOrigin(0.5).setDepth(81);

    const resumeBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, '继续', {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeLarge, color: '#aaeeff',
    }).setOrigin(0.5).setDepth(81).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerdown', () => this.togglePause());

    this.pauseOverlay = this.add.container(0, 0, [bg, title, resumeBtn]);
    this.pauseOverlay.setDepth(80).setVisible(false);
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.pauseOverlay.setVisible(this.isPaused);
    if (this.isPaused) {
      this.physics?.world?.pause();
    } else {
      this.physics?.world?.resume();
    }
  }
}
