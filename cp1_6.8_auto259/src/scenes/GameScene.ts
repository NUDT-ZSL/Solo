import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT,
  BIRD_GRAVITY, BIRD_FLAP_FORCE, BIRD_X,
  SPEED_TIERS, OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX,
  LIGHTPOINT_SPAWN_MIN, LIGHTPOINT_SPAWN_MAX,
  SKINS, BG_COLOR_TOP, BG_COLOR_BOTTOM,
  STORAGE_KEY_HIGHSCORE, STORAGE_KEY_LIGHTPOINTS,
} from '../config';

export class GameScene extends Phaser.Scene {
  private bird!: Phaser.GameObjects.Container;
  private birdBody!: Phaser.GameObjects.Graphics;
  private birdVelocity = 0;
  private score = 0;
  private lightPoints = 0;
  private currentSkinIndex = 0;
  private gameSpeed = SPEED_TIERS[0].speed;
  private isPaused = false;
  private isGameOver = false;

  private obstacles: Phaser.GameObjects.Container[] = [];
  private lightPointObjects: Phaser.GameObjects.Container[] = [];
  private trailParticles: Phaser.GameObjects.Arc[] = [];
  private bgClouds: Phaser.GameObjects.Graphics[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private lightPointsText!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Graphics;
  private pauseIcon!: Phaser.GameObjects.Text;

  private obstacleTimer!: Phaser.Time.TimerEvent;
  private lightPointTimer!: Phaser.Time.TimerEvent;
  private trailTimer!: Phaser.Time.TimerEvent;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private bgOffset = 0;

  private pauseOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.score = 0;
    this.lightPoints = this.loadLightPoints();
    this.gameSpeed = SPEED_TIERS[0].speed;
    this.birdVelocity = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.currentSkinIndex = this.resolveSkinIndex();
    this.obstacles = [];
    this.lightPointObjects = [];
    this.trailParticles = [];
    this.bgClouds = [];

    this.drawBackground();
    this.createBgClouds();
    this.createBird();
    this.createUI();
    this.setupInput();
    this.startSpawners();
  }

  update(_time: number, delta: number) {
    if (this.isPaused || this.isGameOver) return;
    const dt = delta / 16.667;

    this.updateBirdPhysics(dt);
    this.updateBgScroll(dt);
    this.updateObstacles(dt);
    this.updateLightPoints(dt);
    this.updateTrailParticles(dt);
    this.checkCollisions();
    this.updateSpeed();
  }

  private drawBackground() {
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.paintGradient();
  }

  private paintGradient() {
    this.bgGraphics.clear();
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const t = y / GAME_HEIGHT;
      const r = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(BG_COLOR_TOP),
        Phaser.Display.Color.IntegerToColor(BG_COLOR_BOTTOM),
        100,
        Math.round(t * 100)
      );
      this.bgGraphics.fillStyle(Phaser.Display.Color.GetColor(r.r, r.g, r.b), 1);
      this.bgGraphics.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  private updateBgScroll(dt: number) {
    this.bgOffset += this.gameSpeed * 0.3 * dt;
    this.bgClouds.forEach(c => {
      c.x -= this.gameSpeed * 0.3 * dt;
      if (c.x < -150) {
        c.x = GAME_WIDTH + 100;
        c.y = Phaser.Math.Between(30, GAME_HEIGHT - 80);
        c.setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));
      }
    });
  }

  private createBgClouds() {
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics().setDepth(1);
      const w = Phaser.Math.Between(80, 160);
      const h = Phaser.Math.Between(30, 50);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.setPosition(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(30, GAME_HEIGHT - 80));
      g.setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));
      g.setScale(Phaser.Math.FloatBetween(0.4, 0.9));
      this.bgClouds.push(g);
    }
  }

  private createBird() {
    const skin = SKINS[this.currentSkinIndex];
    this.birdBody = this.add.graphics().setDepth(20);

    this.birdBody.fillStyle(skin.color, 1);
    this.birdBody.fillCircle(0, 0, 14);
    this.birdBody.fillStyle(0xffffff, 0.9);
    this.birdBody.fillCircle(5, -3, 4.5);
    this.birdBody.fillStyle(0x222222, 1);
    this.birdBody.fillCircle(6, -3, 2.2);
    this.birdBody.fillStyle(Phaser.Display.Color.GetColor(
      Math.min(255, ((skin.color >> 16) & 0xff) + 40),
      Math.min(255, ((skin.color >> 8) & 0xff) + 40),
      Math.min(255, (skin.color & 0xff) + 40)
    ), 1);
    this.birdBody.fillTriangle(12, 0, 20, -2.5, 20, 2.5);
    this.birdBody.fillStyle(skin.color, 0.7);
    this.birdBody.fillTriangle(-7, -1, -20, -12, -3, -3);
    this.birdBody.fillTriangle(-7, 1, -20, 12, -3, 3);

    const glow = this.add.graphics().setDepth(19);
    glow.fillStyle(skin.color, 0.12);
    glow.fillCircle(0, 0, 28);
    glow.fillStyle(skin.color, 0.06);
    glow.fillCircle(0, 0, 42);

    this.bird = this.add.container(BIRD_X, GAME_HEIGHT / 2, [glow, this.birdBody]).setDepth(20);

    this.tweens.add({
      targets: glow,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createUI() {
    this.scoreText = this.add.text(GAME_WIDTH / 2, 36, '0', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#6a0dad',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.lightPointsText = this.add.text(GAME_WIDTH / 2, 68, `✦ ${this.lightPoints}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffec80',
      stroke: '#6a0dad',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(100);

    this.pauseBtn = this.add.graphics().setDepth(100);
    this.pauseBtn.fillStyle(0xffffff, 0.15);
    this.pauseBtn.fillRoundedRect(0, 0, 40, 40, 8);
    this.pauseBtn.setPosition(12, GAME_HEIGHT - 52);
    this.pauseBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 40, 40), Phaser.Geom.Rectangle.Contains);

    this.pauseIcon = this.add.text(32, GAME_HEIGHT - 32, '⏸', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(101);

    this.pauseBtn.on('pointerdown', () => this.togglePause());
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (this.isPaused) return;
      const px = pointer.x;
      const py = pointer.y;
      if (px >= 12 && px <= 52 && py >= GAME_HEIGHT - 52 && py <= GAME_HEIGHT - 12) return;
      this.flap();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.isGameOver || this.isPaused) return;
      this.flap();
    });
  }

  private flap() {
    this.birdVelocity = BIRD_FLAP_FORCE;
  }

  private updateBirdPhysics(dt: number) {
    this.birdVelocity += BIRD_GRAVITY * dt;
    this.bird.y += this.birdVelocity * dt;

    const angle = Phaser.Math.Clamp(this.birdVelocity * 3, -30, 60);
    this.bird.setAngle(angle);

    if (this.bird.y < 16) {
      this.bird.y = 16;
      this.birdVelocity = 0;
    }
    if (this.bird.y > GAME_HEIGHT - 16) {
      this.triggerGameOver();
    }
  }

  private startSpawners() {
    this.obstacleTimer = this.time.addEvent({
      delay: Phaser.Math.Between(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX),
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.lightPointTimer = this.time.addEvent({
      delay: Phaser.Math.Between(LIGHTPOINT_SPAWN_MIN, LIGHTPOINT_SPAWN_MAX),
      callback: this.spawnLightPoint,
      callbackScope: this,
      loop: true,
    });

    this.trailTimer = this.time.addEvent({
      delay: 40,
      callback: this.emitTrail,
      callbackScope: this,
      loop: true,
    });
  }

  private spawnObstacle() {
    if (this.isPaused || this.isGameOver) return;
    const type = Phaser.Math.Between(0, 2);
    let container: Phaser.GameObjects.Container;
    switch (type) {
      case 0: container = this.createCloudObstacle(); break;
      case 1: container = this.createVaneObstacle(); break;
      default: container = this.createOrbObstacle(); break;
    }

    container.setPosition(GAME_WIDTH + 60, Phaser.Math.Between(50, GAME_HEIGHT - 50));
    container.setDepth(10);
    this.obstacles.push(container);

    this.obstacleTimer.delay = Phaser.Math.Between(
      Math.max(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX - this.score * 8),
      OBSTACLE_SPAWN_MAX
    );
  }

  private createCloudObstacle(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    const w = Phaser.Math.Between(50, 80);
    const h = Phaser.Math.Between(30, 50);
    g.fillStyle(0xddeeff, 0.85);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w * 0.5, h * 0.5, (h * 0.5) / 2);

    (g as any)._hitW = w;
    (g as any)._hitH = h;
    (g as any)._obsType = 'cloud';

    return this.add.container(0, 0, [g]);
  }

  private createVaneObstacle(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0x8899aa, 1);
    g.fillRect(-2, -30, 4, 60);
    g.fillStyle(0xcc4444, 1);
    g.fillTriangle(-2, -30, -20, -10, -2, -10);
    g.fillStyle(0x4466cc, 1);
    g.fillTriangle(2, -30, 20, -10, 2, -10);

    (g as any)._hitW = 44;
    (g as any)._hitH = 60;
    (g as any)._obsType = 'vane';

    const container = this.add.container(0, 0, [g]);
    this.tweens.add({
      targets: g,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: 'Linear',
    });
    return container;
  }

  private createOrbObstacle(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0x9933ff, 0.7);
    g.fillCircle(0, 0, 20);
    g.fillStyle(0xcc66ff, 0.5);
    g.fillCircle(0, 0, 14);
    g.fillStyle(0xeeccff, 0.4);
    g.fillCircle(-4, -4, 6);

    (g as any)._hitW = 40;
    (g as any)._hitH = 40;
    (g as any)._obsType = 'orb';

    const container = this.add.container(0, 0, [g]);
    this.tweens.add({
      targets: g,
      angle: 360,
      duration: 1500,
      repeat: -1,
      ease: 'Linear',
    });

    this.tweens.add({
      targets: container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return container;
  }

  private spawnLightPoint() {
    if (this.isPaused || this.isGameOver) return;
    const g = this.add.graphics();
    g.fillStyle(0xffd700, 0.9);
    g.fillCircle(0, 0, 8);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(-2, -2, 3);

    const container = this.add.container(GAME_WIDTH + 20, Phaser.Math.Between(40, GAME_HEIGHT - 40), [g]).setDepth(12);

    this.tweens.add({
      targets: container,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.lightPointObjects.push(container);
  }

  private emitTrail() {
    if (this.isPaused || this.isGameOver) return;
    const skin = SKINS[this.currentSkinIndex];
    const p = this.add.circle(
      this.bird.x - 10 + Phaser.Math.Between(-3, 3),
      this.bird.y + Phaser.Math.Between(-3, 3),
      Phaser.Math.Between(2, 4),
      skin.trail,
      0.7
    ).setDepth(15);
    this.trailParticles.push(p);

    this.tweens.add({
      targets: p,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      x: p.x - this.gameSpeed * 4,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        p.destroy();
        const idx = this.trailParticles.indexOf(p);
        if (idx > -1) this.trailParticles.splice(idx, 1);
      },
    });
  }

  private updateObstacles(dt: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed * dt;
      if (obs.x < -80) {
        obs.destroy();
        this.obstacles.splice(i, 1);
        this.addScore();
      }
    }
  }

  private updateLightPoints(dt: number) {
    for (let i = this.lightPointObjects.length - 1; i >= 0; i--) {
      const lp = this.lightPointObjects[i];
      lp.x -= this.gameSpeed * dt;
      if (lp.x < -20) {
        lp.destroy();
        this.lightPointObjects.splice(i, 1);
      }
    }
  }

  private updateTrailParticles(dt: number) {
    this.trailParticles.forEach(p => {
      p.x -= this.gameSpeed * 0.5 * dt;
    });
  }

  private checkCollisions() {
    const bx = this.bird.x;
    const by = this.bird.y;
    const bRadius = 12;

    for (const obs of this.obstacles) {
      const ox = obs.x;
      const oy = obs.y;
      const g = obs.getAt(0) as Phaser.GameObjects.Graphics;
      const hw = ((g as any)._hitW || 50) / 2;
      const hh = ((g as any)._hitH || 50) / 2;

      const closestX = Phaser.Math.Clamp(bx, ox - hw, ox + hw);
      const closestY = Phaser.Math.Clamp(by, oy - hh, oy + hh);
      const dist = Phaser.Math.Distance.Between(bx, by, closestX, closestY);

      if (dist < bRadius) {
        this.triggerGameOver();
        return;
      }
    }

    for (let i = this.lightPointObjects.length - 1; i >= 0; i--) {
      const lp = this.lightPointObjects[i];
      const dist = Phaser.Math.Distance.Between(bx, by, lp.x, lp.y);
      if (dist < 22) {
        this.collectLightPoint(lp, i);
      }
    }
  }

  private collectLightPoint(lp: Phaser.GameObjects.Container, index: number) {
    this.lightPointObjects.splice(index, 1);
    const x = lp.x;
    const y = lp.y;
    lp.destroy();

    this.lightPoints++;
    this.score++;
    this.saveLightPoints(this.lightPoints);
    this.updateUI();
    this.burstCollectParticles(x, y);
    this.checkSkinUnlock();
  }

  private burstCollectParticles(x: number, y: number) {
    const colors = [0xffd700, 0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0xee82ee];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const speed = Phaser.Math.Between(60, 140);
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4),
        Phaser.Math.RND.pick(colors), 1
      ).setDepth(50);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(300, 600),
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private addScore() {
    this.score++;
    this.updateUI();
  }

  private updateUI() {
    this.scoreText.setText(`${this.score}`);
    this.lightPointsText.setText(`✦ ${this.lightPoints}`);
  }

  private updateSpeed() {
    for (let i = SPEED_TIERS.length - 1; i >= 0; i--) {
      if (this.score >= SPEED_TIERS[i].minScore) {
        this.gameSpeed = SPEED_TIERS[i].speed;
        break;
      }
    }
  }

  private checkSkinUnlock() {
    const newSkin = this.resolveSkinIndex();
    if (newSkin !== this.currentSkinIndex) {
      this.currentSkinIndex = newSkin;
      this.recolorBird();
    }
  }

  private resolveSkinIndex(): number {
    let idx = 0;
    for (let i = SKINS.length - 1; i >= 0; i--) {
      if (this.lightPoints >= SKINS[i].unlockAt) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  private recolorBird() {
    const skin = SKINS[this.currentSkinIndex];
    this.birdBody.clear();
    this.birdBody.fillStyle(skin.color, 1);
    this.birdBody.fillCircle(0, 0, 14);
    this.birdBody.fillStyle(0xffffff, 0.9);
    this.birdBody.fillCircle(5, -3, 4.5);
    this.birdBody.fillStyle(0x222222, 1);
    this.birdBody.fillCircle(6, -3, 2.2);
    this.birdBody.fillStyle(Phaser.Display.Color.GetColor(
      Math.min(255, ((skin.color >> 16) & 0xff) + 40),
      Math.min(255, ((skin.color >> 8) & 0xff) + 40),
      Math.min(255, (skin.color & 0xff) + 40)
    ), 1);
    this.birdBody.fillTriangle(12, 0, 20, -2.5, 20, 2.5);
    this.birdBody.fillStyle(skin.color, 0.7);
    this.birdBody.fillTriangle(-7, -1, -20, -12, -3, -3);
    this.birdBody.fillTriangle(-7, 1, -20, 12, -3, 3);
  }

  private togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics?.world?.pause?.();
      this.showPauseMenu();
    } else {
      this.physics?.world?.resume?.();
      this.hidePauseMenu();
    }
  }

  private showPauseMenu() {
    if (this.pauseOverlay) this.pauseOverlay.destroy();

    const bg = this.add.graphics().setDepth(200);
    bg.fillStyle(0x000000, 0.35);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const panelW = 240;
    const panelH = 180;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panel = this.add.graphics().setDepth(201);
    panel.fillStyle(0xffffff, 0.15);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
    panel.fillStyle(0xffffff, 0.08);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);

    const title = this.add.text(GAME_WIDTH / 2, panelY + 36, '暂停', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(202);

    const resumeBtn = this.add.text(GAME_WIDTH / 2, panelY + 90, '继续', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.15)',
      padding: { x: 28, y: 8 },
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    const replayBtn = this.add.text(GAME_WIDTH / 2, panelY + 140, '重玩', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.15)',
      padding: { x: 28, y: 8 },
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerdown', () => this.togglePause());
    replayBtn.on('pointerdown', () => {
      this.hidePauseMenu();
      this.isPaused = false;
      this.scene.restart();
    });

    this.pauseOverlay = this.add.container(0, 0, [bg, panel, title, resumeBtn, replayBtn]).setDepth(200);
  }

  private hidePauseMenu() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = undefined as any;
    }
  }

  private triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.obstacleTimer.remove();
    this.lightPointTimer.remove();
    this.trailTimer.remove();

    this.burstDeathParticles();

    this.tweens.add({
      targets: this.bird,
      alpha: 0,
      duration: 300,
    });

    const hs = this.loadHighScore();
    if (this.score > hs) {
      this.saveHighScore(this.score);
    }

    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        highScore: Math.max(this.score, hs),
        lightPoints: this.lightPoints,
      });
    });
  }

  private burstDeathParticles() {
    const skin = SKINS[this.currentSkinIndex];
    const bx = this.bird.x;
    const by = this.bird.y;

    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 / 24) * i + Phaser.Math.FloatBetween(-0.2, 0.2);
      const speed = Phaser.Math.Between(50, 180);
      const size = Phaser.Math.Between(3, 7);
      const color = Phaser.Math.RND.pick([skin.color, 0xffffff, skin.trail]);
      const p = this.add.circle(bx, by, size, color, 1).setDepth(50);

      const targetX = bx + Math.cos(angle) * speed;
      const targetY = by + Math.sin(angle) * speed;

      this.tweens.add({
        targets: p,
        x: targetX,
        y: targetY - 20,
        alpha: 0.6,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: p,
            y: targetY + 120,
            alpha: 0,
            angle: Phaser.Math.Between(90, 270),
            duration: Phaser.Math.Between(1500, 2500),
            ease: 'Sine.easeIn',
            onComplete: () => p.destroy(),
          });
        },
      });
    }
  }

  private loadHighScore(): number {
    const v = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
    return v ? parseInt(v, 10) : 0;
  }

  private saveHighScore(s: number) {
    localStorage.setItem(STORAGE_KEY_HIGHSCORE, String(s));
  }

  private loadLightPoints(): number {
    const v = localStorage.getItem(STORAGE_KEY_LIGHTPOINTS);
    return v ? parseInt(v, 10) : 0;
  }

  private saveLightPoints(lp: number) {
    localStorage.setItem(STORAGE_KEY_LIGHTPOINTS, String(lp));
  }
}
