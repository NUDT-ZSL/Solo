import Phaser from 'phaser';
import { LightManager, LIGHT_MODES } from '../systems/LightManager';
import { ShadowSystem, Wall, ShadowPlatform } from '../systems/ShadowSystem';

interface MemoryFragment {
  x: number;
  y: number;
  collected: boolean;
  sprite: Phaser.GameObjects.Graphics;
  hue: number;
}

interface HintArrow {
  sprite: Phaser.GameObjects.Graphics;
  visible: boolean;
}

export class GameScene extends Phaser.Scene {
  private lightManager!: LightManager;
  private shadowSystem!: ShadowSystem;

  private player!: Phaser.GameObjects.Container;
  private playerGlow!: Phaser.GameObjects.Graphics;
  private playerBody!: Phaser.GameObjects.Arc;
  private playerVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private playerSpeed: number = 180;
  private playerRadius: number = 15;

  private walls: Wall[] = [];
  private platforms: ShadowPlatform[] = [];
  private fragments: MemoryFragment[] = [];
  private totalFragments: number = 12;
  private collectedFragments: number = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;

  private gameStartTime: number = 0;
  private lastFragmentTime: number = 0;
  private platformActivationCount: number = 0;
  private hintArrow: HintArrow | null = null;
  private hintBlinkTimer: number = 0;

  private hudText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private isVictory: boolean = false;
  private victoryContainer!: Phaser.GameObjects.Container;

  private flashOverlay!: Phaser.GameObjects.Rectangle;

  private initialWalls: Wall[] = [];
  private initialPlatforms: ShadowPlatform[] = [];
  private initialFragmentPositions: { x: number; y: number }[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {}

  create(): void {
    this.lightManager = new LightManager(this);
    this.shadowSystem = new ShadowSystem(this);
    this.shadowSystem.setDepth(5);

    this.generateMaze();
    this.storeInitialState();
    this.createPlayer();
    this.createFragments();
    this.createHUD();
    this.createVictoryScreen();
    this.createFlashOverlay();
    this.createHintArrow();

    this.setupInput();

    this.gameStartTime = this.time.now;
    this.lastFragmentTime = this.time.now;
  }

  private storeInitialState(): void {
    this.initialWalls = this.walls.map(w => ({
      x: w.x, y: w.y, width: w.width, height: w.height
    }));
    this.initialPlatforms = this.platforms.map(p => ({
      x: p.x, y: p.y, width: p.width, height: p.height,
      isActive: false, activeTimer: 0,
      sprite: p.sprite, glowSprite: p.glowSprite
    }));
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }

  private generateMaze(): void {
    const wallHeight = 32;
    const wallColor = 0x2ecc71;

    const outerWalls: Wall[] = [
      { x: 0, y: 0, width: 800, height: wallHeight },
      { x: 0, y: 600 - wallHeight, width: 800, height: wallHeight },
      { x: 0, y: 0, width: wallHeight, height: 600 },
      { x: 800 - wallHeight, y: 0, width: wallHeight, height: 600 }
    ];

    const innerWalls: Wall[] = [
      { x: 120, y: 80, width: wallHeight, height: 150 },
      { x: 250, y: 150, width: 180, height: wallHeight },
      { x: 480, y: 80, width: wallHeight, height: 200 },
      { x: 580, y: 200, width: 160, height: wallHeight },
      { x: 180, y: 300, width: wallHeight, height: 180 },
      { x: 320, y: 350, width: 200, height: wallHeight },
      { x: 560, y: 340, width: wallHeight, height: 160 },
      { x: 80, y: 450, width: 150, height: wallHeight },
      { x: 400, y: 480, width: wallHeight, height: 90 },
      { x: 600, y: 450, width: 150, height: wallHeight }
    ];

    const allWalls = [...outerWalls, ...innerWalls];

    for (const wall of allWalls) {
      const sprite = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        wallColor,
        0.7
      );
      sprite.setDepth(2);
      sprite.setStrokeStyle(2, 0x1abc9c, 0.5);
      wall.sprite = sprite;
      this.walls.push(wall);
    }

    const platformData = [
      { x: 180, y: 130, width: 60, height: 20 },
      { x: 360, y: 220, width: 70, height: 20 },
      { x: 540, y: 120, width: 65, height: 20 },
      { x: 660, y: 280, width: 60, height: 20 },
      { x: 130, y: 380, width: 55, height: 20 },
      { x: 420, y: 420, width: 70, height: 20 },
      { x: 260, y: 500, width: 60, height: 20 },
      { x: 680, y: 390, width: 65, height: 20 }
    ];

    for (const pd of platformData) {
      const glowSprite = this.add.rectangle(
        pd.x + pd.width / 2,
        pd.y + pd.height / 2,
        pd.width + 10,
        pd.height + 10,
        0x00ffff,
        0
      );
      glowSprite.setDepth(3);

      const sprite = this.add.rectangle(
        pd.x + pd.width / 2,
        pd.y + pd.height / 2,
        pd.width,
        pd.height,
        0x00ffff,
        0.2
      );
      sprite.setDepth(4);

      this.platforms.push({
        x: pd.x,
        y: pd.y,
        width: pd.width,
        height: pd.height,
        isActive: false,
        activeTimer: 0,
        sprite,
        glowSprite
      });
    }
  }

  private createPlayer(): void {
    this.player = this.add.container(100, 500);
    this.player.setDepth(10);

    this.playerGlow = this.add.graphics();
    this.drawGlow();
    this.player.add(this.playerGlow);

    this.playerBody = this.add.circle(0, 0, this.playerRadius, 0xfff176, 1);
    this.playerBody.setStrokeStyle(3, 0xffd700, 0.8);
    this.player.add(this.playerBody);

    const innerGlow = this.add.circle(0, 0, this.playerRadius * 0.6, 0xffffff, 0.6);
    this.player.add(innerGlow);
  }

  private drawGlow(): void {
    this.playerGlow.clear();
    const glowColor = 0xfff176;
    for (let i = 5; i >= 1; i--) {
      const alpha = 0.08 * i;
      const radius = this.playerRadius + i * 6;
      this.playerGlow.fillStyle(glowColor, alpha);
      this.playerGlow.fillCircle(0, 0, radius);
    }
  }

  private createFragments(): void {
    const positions = [
      { x: 180, y: 130 }, { x: 380, y: 100 }, { x: 560, y: 140 }, { x: 700, y: 110 },
      { x: 110, y: 260 }, { x: 340, y: 290 }, { x: 530, y: 280 }, { x: 690, y: 310 },
      { x: 150, y: 420 }, { x: 380, y: 450 }, { x: 520, y: 440 }, { x: 690, y: 480 }
    ];

    this.initialFragmentPositions = [...positions];

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const hue = (i / this.totalFragments) * 360;
      const graphics = this.createFragmentSprite(pos.x, pos.y, hue);
      graphics.setDepth(8);

      this.fragments.push({
        x: pos.x,
        y: pos.y,
        collected: false,
        sprite: graphics,
        hue: hue
      });
    }
  }

  private createFragmentSprite(x: number, y: number, baseHue: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics({ x, y });

    const draw = (gfx: Phaser.GameObjects.Graphics, h: number, size: number = 10, alpha: number = 1) => {
      gfx.clear();
      const color = Phaser.Display.Color.HSVToRGB(h / 360, 1, 1).color;

      for (let i = 4; i >= 1; i--) {
        const r = size + i * 2;
        const a = 0.1 * i * alpha;
        gfx.fillStyle(0xffffff, a);
        this.drawHexagon(gfx, 0, 0, r);
      }

      gfx.fillStyle(color, alpha);
      this.drawHexagon(gfx, 0, 0, size);
      gfx.lineStyle(2, 0xffffff, 0.8 * alpha);
      this.drawHexagon(gfx, 0, 0, size, true);
    };

    draw(g, baseHue);

    this.tweens.add({
      targets: g,
      scale: { from: 1, to: 1.15 },
      yoyo: true,
      repeat: -1,
      duration: 500,
      ease: 'Sine.easeInOut'
    });

    let t = 0;
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!g.scene) return;
        t += 0.05;
        const hue = (baseHue + (t * 180) % 360) % 360;
        draw(g, hue);
      }
    });

    return g;
  }

  private drawHexagon(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    stroke: boolean = false
  ): void {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push(new Phaser.Geom.Point(
        cx + r * Math.cos(angle),
        cy + r * Math.sin(angle)
      ));
    }

    if (stroke) {
      gfx.beginPath();
      gfx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i].x, points[i].y);
      }
      gfx.closePath();
      gfx.strokePath();
    } else {
      gfx.beginPath();
      gfx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i].x, points[i].y);
      }
      gfx.closePath();
      gfx.fillPath();
    }
  }

  private createHUD(): void {
    this.hudText = this.add.text(20, 568, '碎片: 0/12', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    this.hudText.setShadow(2, 2, 'rgba(0,0,0,0.8)', 4, true, true);
    this.hudText.setDepth(100);

    this.timeText = this.add.text(640, 568, '时间: 0秒', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    this.timeText.setShadow(2, 2, 'rgba(0,0,0,0.8)', 4, true, true);
    this.timeText.setDepth(100);
  }

  private createVictoryScreen(): void {
    this.victoryContainer = this.add.container(400, 300);
    this.victoryContainer.setDepth(200);
    this.victoryContainer.setVisible(false);

    const bg = this.add.rectangle(0, 0, 600, 400, 0x0a0a1a, 0.95);
    bg.setStrokeStyle(3, 0xf1c40f, 0.8);
    this.victoryContainer.add(bg);

    const title = this.add.text(0, -140, '🎉 恭喜通关！', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.victoryContainer.add(title);

    const timeLabel = this.add.text(0, -40, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff'
    });
    timeLabel.setOrigin(0.5);
    timeLabel.setName('timeLabel');
    this.victoryContainer.add(timeLabel);

    const platformLabel = this.add.text(0, 10, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff'
    });
    platformLabel.setOrigin(0.5);
    platformLabel.setName('platformLabel');
    this.victoryContainer.add(platformLabel);

    const restartBtn = this.add.rectangle(0, 100, 180, 60, 0x2ecc71, 1);
    restartBtn.setStrokeStyle(3, 0x27ae60, 1);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setFillStyle(0x27ae60, 1));
    restartBtn.on('pointerout', () => restartBtn.setFillStyle(0x2ecc71, 1));
    restartBtn.on('pointerdown', () => this.resetGame());
    this.victoryContainer.add(restartBtn);

    const btnText = this.add.text(0, 100, '重玩', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    btnText.setOrigin(0.5);
    this.victoryContainer.add(btnText);
  }

  private createFlashOverlay(): void {
    this.flashOverlay = this.add.rectangle(400, 300, 800, 600, 0xffffff, 0);
    this.flashOverlay.setDepth(150);
  }

  private createHintArrow(): void {
    const g = this.add.graphics();
    g.setDepth(60);
    g.setAlpha(0);
    this.hintArrow = { sprite: g, visible: false };
  }

  private drawHintArrow(fromX: number, fromY: number, toX: number, toY: number, pulse: number): void {
    if (!this.hintArrow) return;
    const g = this.hintArrow.sprite;
    g.clear();

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const px = -ny;
    const py = nx;

    const startX = fromX + nx * 35;
    const startY = fromY + ny * 35;
    const endX = startX + nx * 30;
    const endY = startY + ny * 30;

    const hue = 180 + 60 * pulse;
    const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 1).color;

    g.lineStyle(4, color, 0.4);
    g.beginPath();
    g.moveTo(startX, startY);
    g.lineTo(endX, endY);
    g.strokePath();

    g.fillStyle(color, 0.4);
    g.beginPath();
    g.moveTo(endX, endY);
    g.lineTo(endX - nx * 12 + px * 6, endY - ny * 12 + py * 6);
    g.lineTo(endX - nx * 12 - px * 6, endY - ny * 12 - py * 6);
    g.closePath();
    g.fillPath();
  }

  update(time: number, delta: number): void {
    if (this.isVictory) return;

    const dt = delta / 1000;

    this.lightManager.update(time, delta);
    this.updateWallColors();

    this.handleInput(dt);
    this.movePlayer(dt);
    this.checkCollisions();

    this.shadowSystem.setLightPosition(this.player.x, this.player.y);
    const prevActiveCount = this.platforms.filter(p => p.isActive).length;
    this.shadowSystem.updateShadows(this.walls, this.platforms);
    const nowActiveCount = this.platforms.filter(p => p.isActive).length;
    if (nowActiveCount > prevActiveCount) {
      this.platformActivationCount += (nowActiveCount - prevActiveCount);
    }

    this.checkFragmentCollection();
    this.updateHUD(time);
    this.updateHintSystem(time, dt);
  }

  private updateWallColors(): void {
    const mode = this.lightManager.getCurrentMode();
    const brightness = mode.brightness;
    const hue = mode.hue;

    for (const wall of this.walls) {
      if (!wall.sprite) continue;

      let fillColor: number;
      let strokeColor: number;
      let alpha: number;

      if (this.lightManager.isInTransition()) {
        fillColor = 0x8e44ad;
        strokeColor = 0x9b59b6;
        alpha = 0.8;
      } else if (brightness > 0.5) {
        fillColor = 0x2ecc71;
        strokeColor = 0x1abc9c;
        alpha = 0.7;
      } else {
        const wallHue = (hue + 120) % 360;
        fillColor = Phaser.Display.Color.HSVToRGB(wallHue / 360, 0.6, brightness * 1.2).color;
        strokeColor = 0x8e44ad;
        alpha = 0.6;
      }

      wall.sprite.setFillStyle(fillColor, alpha);
      wall.sprite.setStrokeStyle(2, strokeColor, 0.5);
    }
  }

  private handleInput(dt: number): void {
    let vx = 0;
    let vy = 0;

    if (this.wasdKeys) {
      if (this.wasdKeys.W.isDown || this.cursors.up.isDown) vy -= 1;
      if (this.wasdKeys.S.isDown || this.cursors.down.isDown) vy += 1;
      if (this.wasdKeys.A.isDown || this.cursors.left.isDown) vx -= 1;
      if (this.wasdKeys.D.isDown || this.cursors.right.isDown) vx += 1;
    }

    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.sqrt(2);
      vx *= inv;
      vy *= inv;
    }

    this.playerVelocity.set(vx * this.playerSpeed, vy * this.playerSpeed);
  }

  private movePlayer(dt: number): void {
    const newX = this.player.x + this.playerVelocity.x * dt;
    const newY = this.player.y + this.playerVelocity.y * dt;

    let finalX = this.player.x;
    let finalY = this.player.y;

    if (!this.checkWallCollision(newX, this.player.y)) {
      finalX = newX;
    }
    if (!this.checkWallCollision(finalX, newY)) {
      finalY = newY;
    }

    this.player.x = Phaser.Math.Clamp(finalX, 50, 750);
    this.player.y = Phaser.Math.Clamp(finalY, 50, 550);
  }

  private checkWallCollision(px: number, py: number): boolean {
    for (const wall of this.walls) {
      const closestX = Phaser.Math.Clamp(px, wall.x, wall.x + wall.width);
      const closestY = Phaser.Math.Clamp(py, wall.y, wall.y + wall.height);
      const distX = px - closestX;
      const distY = py - closestY;
      const distSq = distX * distX + distY * distY;
      if (distSq < this.playerRadius * this.playerRadius) {
        return true;
      }
    }
    return false;
  }

  private checkCollisions(): void {
    for (const platform of this.platforms) {
      if (!platform.isActive) continue;

      const closestX = Phaser.Math.Clamp(
        this.player.x,
        platform.x,
        platform.x + platform.width
      );
      const closestY = Phaser.Math.Clamp(
        this.player.y,
        platform.y,
        platform.y + platform.height
      );
      const distX = this.player.x - closestX;
      const distY = this.player.y - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < (this.playerRadius + 5) * (this.playerRadius + 5)) {
        if (distX !== 0 || distY !== 0) {
          const dist = Math.sqrt(distSq);
          const pushX = distX / dist * 2;
          const pushY = distY / dist * 2;
          this.player.x += pushX;
          this.player.y += pushY;
        }
      }
    }
  }

  private checkFragmentCollection(): void {
    for (const fragment of this.fragments) {
      if (fragment.collected) continue;

      const dx = this.player.x - fragment.x;
      const dy = this.player.y - fragment.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.playerRadius + 15) {
        this.collectFragment(fragment);
      }
    }
  }

  private collectFragment(fragment: MemoryFragment): void {
    fragment.collected = true;
    this.collectedFragments++;
    this.lastFragmentTime = this.time.now;

    this.playFragmentCollectAnimation(fragment);
    this.playFlashEffect();

    if (this.collectedFragments >= this.totalFragments) {
      this.time.delayedCall(800, () => this.showVictory());
    } else {
      this.lightManager.transitionToNextMode(() => {
        this.shuffleWalls();
      });
    }
  }

  private playFragmentCollectAnimation(fragment: MemoryFragment): void {
    const fx = fragment.x;
    const fy = fragment.y;

    this.tweens.add({
      targets: fragment.sprite,
      scale: 0,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        fragment.sprite.destroy();
      }
    });

    const ring = this.add.graphics();
    ring.setDepth(90);
    ring.lineStyle(4, 0xffffff, 1);
    ring.strokeCircle(fx, fy, 5);

    this.tweens.add({
      targets: ring,
      scale: { from: 0.1, to: 16 },
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });

    this.cameras.main.shake(80, 0.005);
  }

  private playFlashEffect(): void {
    this.flashOverlay.setAlpha(0.2);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut'
    });
  }

  private shuffleWalls(): void {
    const shuffledCount = Math.max(1, Math.floor(this.walls.length * 0.1));
    const innerWallIndices: number[] = [];

    for (let i = 4; i < this.walls.length; i++) {
      innerWallIndices.push(i);
    }

    Phaser.Utils.Array.Shuffle(innerWallIndices);

    for (let i = 0; i < Math.min(shuffledCount, innerWallIndices.length); i++) {
      const idx = innerWallIndices[i];
      const wall = this.walls[idx];
      if (!wall.sprite) continue;

      const attempts = 10;
      for (let j = 0; j < attempts; j++) {
        const newX = Phaser.Math.Between(80, 680);
        const newY = Phaser.Math.Between(80, 480);

        let valid = true;
        const tempWall = { x: newX, y: newY, width: wall.width, height: wall.height };
        for (let k = 0; k < this.walls.length; k++) {
          if (k === idx) continue;
          const other = this.walls[k];
          if (this.rectsOverlap(tempWall, other, 40)) {
            valid = false;
            break;
          }
        }

        if (valid) {
          wall.x = newX;
          wall.y = newY;
          wall.sprite.setPosition(newX + wall.width / 2, newY + wall.height / 2);
          break;
        }
      }
    }
  }

  private rectsOverlap(a: { x: number; y: number; width: number; height: number },
                       b: { x: number; y: number; width: number; height: number },
                       pad: number = 0): boolean {
    return !(
      a.x + a.width + pad < b.x ||
      b.x + b.width + pad < a.x ||
      a.y + a.height + pad < b.y ||
      b.y + b.height + pad < a.y
    );
  }

  private updateHUD(time: number): void {
    this.hudText.setText(`碎片: ${this.collectedFragments}/${this.totalFragments}`);
    const elapsed = Math.floor((time - this.gameStartTime) / 1000);
    this.timeText.setText(`时间: ${elapsed}秒`);
  }

  private updateHintSystem(time: number, dt: number): void {
    if (!this.hintArrow) return;

    const idleTime = (time - this.lastFragmentTime) / 1000;
    this.hintBlinkTimer += dt;

    if (idleTime > 10 && this.collectedFragments < this.totalFragments) {
      let nearestFrag: MemoryFragment | null = null;
      let nearestDist = Infinity;

      for (const f of this.fragments) {
        if (f.collected) continue;
        const dx = f.x - this.player.x;
        const dy = f.y - this.player.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) {
          nearestDist = d;
          nearestFrag = f;
        }
      }

      if (nearestFrag) {
        const blinkOn = Math.sin(this.hintBlinkTimer * Math.PI) > 0;
        const pulse = (Math.sin(this.hintBlinkTimer * 4 * Math.PI) + 1) / 2;

        if (blinkOn) {
          this.hintArrow.sprite.setAlpha(0.4);
          this.drawHintArrow(
            this.player.x, this.player.y,
            nearestFrag.x, nearestFrag.y,
            pulse
          );
        } else {
          this.hintArrow.sprite.setAlpha(0);
        }
      }
    } else {
      this.hintArrow.sprite.setAlpha(0);
      this.hintArrow.sprite.clear();
    }
  }

  private showVictory(): void {
    this.isVictory = true;

    const timeLabel = this.victoryContainer.getByName('timeLabel') as Phaser.GameObjects.Text;
    const platformLabel = this.victoryContainer.getByName('platformLabel') as Phaser.GameObjects.Text;

    const elapsed = Math.floor((this.time.now - this.gameStartTime) / 1000);
    timeLabel.setText(`总用时: ${elapsed} 秒`);
    platformLabel.setText(`激活平台次数: ${this.platformActivationCount} 次`);

    this.victoryContainer.setVisible(true);
    this.victoryContainer.setScale(0.1);
    this.tweens.add({
      targets: this.victoryContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });

    this.cameras.main.flash(1000, 255, 255, 200);
  }

  private resetGame(): void {
    this.spawnResetParticles();

    this.victoryContainer.setVisible(false);
    this.isVictory = false;
    this.collectedFragments = 0;
    this.platformActivationCount = 0;
    this.gameStartTime = this.time.now;
    this.lastFragmentTime = this.time.now;

    for (const f of this.fragments) {
      f.sprite.destroy();
    }
    this.fragments = [];

    for (let i = 4; i < this.walls.length; i++) {
      const wall = this.walls[i];
      const init = this.initialWalls[i];
      if (wall.sprite && init) {
        wall.x = init.x;
        wall.y = init.y;
        wall.sprite.setPosition(init.x + init.width / 2, init.y + init.height / 2);
      }
    }

    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      p.isActive = false;
      p.activeTimer = 0;
      p.sprite.setAlpha(0.2);
      p.glowSprite.setAlpha(0);
      p.sprite.setStrokeStyle(0, 0x00ffff, 0);
    }

    this.player.setPosition(100, 500);

    this.createFragments();

    this.lightManager.quickReset(300);
  }

  private spawnResetParticles(): void {
    const tempG = this.add.graphics();
    tempG.fillStyle(0xffffff, 1);
    tempG.fillCircle(4, 4, 4);
    tempG.generateTexture('reset_particle', 8, 8);
    tempG.destroy();

    const particles = this.add.particles(400, 300, 'reset_particle', {
      lifespan: 1000,
      speed: { min: 100, max: 200 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0xffffff
    });
    particles.setDepth(250);

    for (let i = 0; i < 200; i++) {
      const angle = (i / 200) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 150 + Math.random() * 150;
      particles.emitParticleAt(
        400 + Math.cos(angle) * 20,
        300 + Math.sin(angle) * 20,
        1
      );
      const aliveList: Phaser.GameObjects.Particles.Particle[] = [];
      particles.forEachAlive((p) => {
        aliveList.push(p);
      }, particles);
      for (const p of aliveList) {
        if (p.velocityX === 0 && p.velocityY === 0) {
          p.velocityX = Math.cos(angle) * speed;
          p.velocityY = Math.sin(angle) * speed;
          break;
        }
      }
    }

    this.time.delayedCall(1100, () => {
      particles.destroy();
      if (this.textures.exists('reset_particle')) {
        this.textures.remove('reset_particle');
      }
    });
  }
}
