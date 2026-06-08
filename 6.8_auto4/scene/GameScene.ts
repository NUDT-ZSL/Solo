import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Island } from '../objects/Island';

const WORLD_WIDTH = 4000;
const ENEMY_POOL_SIZE = 8;
const STAR_POOL_SIZE = 15;
const ISLAND_COUNT = 25;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private islands: Island[] = [];
  private enemies: Phaser.GameObjects.Container[] = [];
  private stars: Phaser.GameObjects.Container[] = [];
  private bgClouds: Phaser.GameObjects.Graphics[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private score: number = 0;
  private isGameOver: boolean = false;
  private gameOverOverlay: Phaser.GameObjects.Container | null = null;
  private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cameraFollowOffset: number = 0;
  private mobileLeftBtn: Phaser.GameObjects.Container | null = null;
  private mobileRightBtn: Phaser.GameObjects.Container | null = null;
  private mobileJumpBtn: Phaser.GameObjects.Container | null = null;
  private isMobile: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.score = 0;
    this.isGameOver = false;
    this.gameOverOverlay = null;

    this.cameras.main.fadeIn(600);
    this.drawGradientSky();
    this.createClouds();
    this.generateIslands();
    this.createPlayer();
    this.createEnemyPool();
    this.createStarPool();
    this.placeEnemies();
    this.placeStars();
    this.createHUD();
    this.setupCamera();
    this.detectMobile();
    this.createMobileControls();
    this.createParticleTexture();

    this.physics.add.collider(
      this.player as unknown as Phaser.GameObjects.GameObject,
      this.islands.map((i) => i as unknown as Phaser.GameObjects.GameObject),
      undefined,
      (player, island) => {
        const body = (player as unknown as Player).bodyRef;
        return body ? body.velocity.y >= 0 : true;
      },
      this
    );

    this.physics.add.overlap(
      this.player as unknown as Phaser.GameObjects.GameObject,
      this.stars.map((s) => s as unknown as Phaser.GameObjects.GameObject),
      this.collectStar,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player as unknown as Phaser.GameObjects.GameObject,
      this.enemies.map((e) => e as unknown as Phaser.GameObjects.GameObject),
      this.hitEnemy,
      undefined,
      this
    );
  }

  private drawGradientSky(): void {
    const g = this.add.graphics();
    const h = 2000;
    const w = WORLD_WIDTH;
    for (let i = 0; i < 800; i++) {
      const t = i / 800;
      const r = Math.floor(Phaser.Math.Linear(0xFF, 0x7E, t));
      const gr = Math.floor(Phaser.Math.Linear(0xD9, 0xC8, t));
      const b = Math.floor(Phaser.Math.Linear(0x3D, 0xE3, t));
      g.fillStyle((r << 16) | (gr << 8) | b, 1);
      g.fillRect(0, i, w, 1);
    }
    g.setDepth(-10);
    g.setScrollFactor(0.3, 0.1);
  }

  private createClouds(): void {
    for (let i = 0; i < 12; i++) {
      const cloud = this.createCloudShape(
        Phaser.Math.Between(0, WORLD_WIDTH),
        Phaser.Math.Between(20, 300),
        Phaser.Math.FloatBetween(0.4, 0.8)
      );
      this.bgClouds.push(cloud);
      this.tweens.add({
        targets: cloud,
        x: `+=${400}`,
        duration: Phaser.Math.Between(40000, 80000),
        repeat: -1,
        onRepeat: () => { cloud.x -= 400; },
      });
    }
  }

  private createCloudShape(x: number, y: number, scale: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(0, 0, 30 * scale);
    g.fillCircle(25 * scale, -5 * scale, 25 * scale);
    g.fillCircle(-25 * scale, 0, 20 * scale);
    g.fillCircle(10 * scale, -15 * scale, 22 * scale);
    g.setPosition(x, y);
    g.setDepth(-5);
    g.setScrollFactor(0.5, 0.2);
    return g;
  }

  private generateIslands(): void {
    this.islands = [];
    const firstIsland = new Island(this, 100, 350, 150);
    firstIsland.enablePhysics(this);
    this.islands.push(firstIsland);

    let lastX = 100;
    let lastY = 350;
    let lastWidth = 150;

    for (let i = 1; i < ISLAND_COUNT; i++) {
      const w = Phaser.Math.Between(70, 200);
      const gap = Math.floor(lastWidth * 0.5 + Phaser.Math.Between(40, 100));
      const x = lastX + gap;
      const y = Phaser.Math.Clamp(lastY + Phaser.Math.Between(-80, 80), 150, 420);

      const island = new Island(this, x, y, w);
      island.enablePhysics(this);
      this.islands.push(island);

      lastX = x;
      lastY = y;
      lastWidth = w;
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, 100, 300);
    this.player.lives = 3;
  }

  private createEnemyPool(): void {
    for (let i = 0; i < ENEMY_POOL_SIZE; i++) {
      const enemy = this.createEnemyShape(0, 0);
      enemy.setActive(false);
      enemy.setVisible(false);
      this.enemies.push(enemy);
    }
  }

  private createEnemyShape(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xE84545, 1);

    const points = 7;
    const outerR = 14;
    const innerR = 7;
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      path.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      g.lineTo(path[i].x, path[i].y);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(-4, -2, 3);
    g.fillCircle(4, -2, 3);
    g.fillStyle(0x333333, 1);
    g.fillCircle(-4, -2, 1.5);
    g.fillCircle(4, -2, 1.5);

    const container = this.add.container(x, y, [g]);
    container.setSize(28, 28);
    this.physics.add.existing(container as unknown as Phaser.GameObjects.GameObject);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(24, 24);

    return container;
  }

  private createStarPool(): void {
    for (let i = 0; i < STAR_POOL_SIZE; i++) {
      const star = this.createStarShape(0, 0);
      star.setActive(false);
      star.setVisible(false);
      this.stars.push(star);
    }
  }

  private createStarShape(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xFFD93D, 1);

    const points = 5;
    const outerR = 12;
    const innerR = 5;
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      path.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      g.lineTo(path[i].x, path[i].y);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(0xFFEE99, 0.6);
    g.fillCircle(0, 0, 4);

    const glow = this.add.graphics();
    glow.fillStyle(0xFFD93D, 0.15);
    glow.fillCircle(0, 0, 18);

    const container = this.add.container(x, y, [glow, g]);
    container.setSize(24, 24);
    this.physics.add.existing(container as unknown as Phaser.GameObjects.GameObject);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(20, 20);

    return container;
  }

  private placeEnemies(): void {
    const eligibleIslands = this.islands.filter((_, i) => i > 0 && i % 2 === 1);
    const count = Math.min(ENEMY_POOL_SIZE, eligibleIslands.length);

    for (let i = 0; i < count; i++) {
      const island = eligibleIslands[i];
      const enemy = this.enemies[i];
      enemy.setPosition(island.x, island.y - 24);
      enemy.setActive(true);
      enemy.setVisible(true);
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.reset(island.x, island.y - 24);

      const halfRange = island.islandWidth / 2 - 16;
      this.tweens.add({
        targets: enemy,
        x: island.x - halfRange,
        duration: Phaser.Math.Between(1000, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 500),
        onYoyo: () => { enemy.setScale(-1, 1); },
        onRepeat: () => { enemy.setScale(-1, 1); },
      });
    }
  }

  private placeStars(): void {
    const starIslands = this.islands.filter((_, i) => i > 0);
    const count = Math.min(STAR_POOL_SIZE, starIslands.length);

    for (let i = 0; i < count; i++) {
      const island = starIslands[i];
      const star = this.stars[i];
      star.setPosition(island.x + Phaser.Math.Between(-20, 20), island.y - 40);
      star.setActive(true);
      star.setVisible(true);
      const body = star.body as Phaser.Physics.Arcade.Body;
      body.reset(island.x + Phaser.Math.Between(-20, 20), island.y - 40);

      this.tweens.add({
        targets: star,
        y: star.y - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1000),
      });

      this.tweens.add({
        targets: (star.getAt(1) as Phaser.GameObjects.Graphics),
        angle: 360,
        duration: 3000,
        repeat: -1,
      });
    }
  }

  private createHUD(): void {
    this.scoreText = this.add.text(20, 16, '★ 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FFD93D',
      stroke: '#7A4400',
      strokeThickness: 3,
    });
    this.scoreText.setDepth(100);
    this.scoreText.setScrollFactor(0);

    this.livesText = this.add.text(this.scale.width - 20, 16, '♥♥♥', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FF6B9D',
      stroke: '#993355',
      strokeThickness: 3,
    });
    this.livesText.setOrigin(1, 0);
    this.livesText.setDepth(100);
    this.livesText.setScrollFactor(0);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, this.scale.height);
    this.cameras.main.startFollow(
      this.player as unknown as Phaser.GameObjects.GameObject,
      true,
      0.08,
      0.08
    );
    this.cameras.main.setFollowOffset(-100, 50);
  }

  private detectMobile(): void {
    this.isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) || this.scale.width < 600;
  }

  private createMobileControls(): void {
    if (!this.isMobile) return;

    const btnSize = 56;
    const padding = 20;

    this.mobileLeftBtn = this.createMobileButton(padding + btnSize / 2, this.scale.height - padding - btnSize / 2, btnSize, '◀', 0x7EC8E3);
    this.mobileRightBtn = this.createMobileButton(padding + btnSize * 1.7, this.scale.height - padding - btnSize / 2, btnSize, '▶', 0x7EC8E3);
    this.mobileJumpBtn = this.createMobileButton(this.scale.width - padding - btnSize / 2, this.scale.height - padding - btnSize / 2, btnSize, '▲', 0x7ED957);

    this.setupMobileButtonEvents(this.mobileLeftBtn, 'left');
    this.setupMobileButtonEvents(this.mobileRightBtn, 'right');
    this.setupMobileButtonEvents(this.mobileJumpBtn, 'jump');
  }

  private createMobileButton(x: number, y: number, size: number, label: string, color: number): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.5);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, 12);
    bg.fillStyle(color, 0.7);
    bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 2, size - 6, size / 2 - 4, 8);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    const container = this.add.container(x, y, [bg, text]);
    container.setSize(size, size);
    container.setDepth(200);
    container.setScrollFactor(0);
    container.setAlpha(0.8);
    return container;
  }

  private setupMobileButtonEvents(btn: Phaser.GameObjects.Container, action: string): void {
    btn.setInteractive({ useHandCursor: true });

    const setMobileInput = (left: boolean, right: boolean, jump: boolean) => {
      if (this.player) this.player.setMobileInput(left, right, jump);
    };

    btn.on('pointerdown', () => {
      switch (action) {
        case 'left': setMobileInput(true, false, false); break;
        case 'right': setMobileInput(false, true, false); break;
        case 'jump': setMobileInput(false, false, true); break;
      }
    });

    btn.on('pointerup', () => {
      switch (action) {
        case 'left': setMobileInput(false, this.player.mobileRight, false); break;
        case 'right': setMobileInput(this.player.mobileLeft, false, false); break;
        case 'jump': setMobileInput(this.player.mobileLeft, this.player.mobileRight, false); break;
      }
    });

    btn.on('pointerout', () => {
      switch (action) {
        case 'left': setMobileInput(false, this.player.mobileRight, false); break;
        case 'right': setMobileInput(this.player.mobileLeft, false, false); break;
        case 'jump': setMobileInput(this.player.mobileLeft, this.player.mobileRight, false); break;
      }
    });
  }

  private createParticleTexture(): void {
    if (!this.textures.exists('particle')) {
      const g = this.add.graphics();
      g.fillStyle(0xFFD93D, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('particle', 8, 8);
      g.destroy();
    }
  }

  private collectStar(_player: Phaser.GameObjects.GameObject, starObj: Phaser.GameObjects.GameObject): void {
    const star = starObj as Phaser.GameObjects.Container;
    if (!star.active) return;

    star.setActive(false);
    star.setVisible(false);
    this.tweens.killTweensOf(star);

    this.score += 10;
    this.scoreText.setText('★ ' + this.score);

    this.emitStarParticles(star.x, star.y);
    this.showScorePopup(star.x, star.y);
  }

  private emitStarParticles(x: number, y: number): void {
    if (this.particleEmitter) {
      this.particleEmitter.emitParticleAt(x, y, 15);
      return;
    }

    const particles = this.add.particles(x, y, 'particle', {
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: { min: 300, max: 600 },
      gravityY: 200,
      blendMode: 'ADD',
      emitting: false,
    });
    particles.setDepth(50);
    particles.emitParticleAt(x, y, 15);
    this.particleEmitter = particles.emitter;
  }

  private showScorePopup(x: number, y: number): void {
    const popup = this.add.text(x, y - 20, '+10', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFD93D',
      stroke: '#7A4400',
      strokeThickness: 2,
    });
    popup.setOrigin(0.5);
    popup.setDepth(60);

    this.tweens.add({
      targets: popup,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => { popup.destroy(); },
    });
  }

  private hitEnemy(_player: Phaser.GameObjects.GameObject, _enemy: Phaser.GameObjects.GameObject): void {
    if (!this.player.takeDamage()) return;

    this.updateLivesDisplay();

    if (this.player.bodyRef) {
      this.player.bodyRef.setVelocityY(-300);
    }

    if (this.player.lives <= 0) {
      this.gameOver();
    }
  }

  private updateLivesDisplay(): void {
    const hearts = '♥'.repeat(Math.max(0, this.player.lives)) + '♡'.repeat(Math.max(0, 3 - this.player.lives));
    this.livesText.setText(hearts);
  }

  private gameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.physics.pause();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.setDepth(300);
    overlay.setScrollFactor(0);

    const gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, '游戏结束', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#FF6B9D',
      stroke: '#993355',
      strokeThickness: 4,
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(301);
    gameOverText.setScrollFactor(0);

    const finalScore = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20, '得分: ' + this.score, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FFD93D',
      stroke: '#7A4400',
      strokeThickness: 3,
    });
    finalScore.setOrigin(0.5);
    finalScore.setDepth(301);
    finalScore.setScrollFactor(0);

    const retryBtn = this.createRetryButton();
    this.gameOverOverlay = this.add.container(0, 0, [overlay, gameOverText, finalScore, retryBtn]);
    this.gameOverOverlay.setDepth(300);
    this.gameOverOverlay.setScrollFactor(0);
  }

  private createRetryButton(): Phaser.GameObjects.Container {
    const btnW = 180;
    const btnH = 50;

    const bg = this.add.graphics();
    bg.fillStyle(0x7ED957, 1);
    bg.fillRoundedRect(this.scale.width / 2 - btnW / 2, this.scale.height / 2 + 60, btnW, btnH, 14);
    bg.fillStyle(0x9EF57A, 1);
    bg.fillRoundedRect(this.scale.width / 2 - btnW / 2 + 3, this.scale.height / 2 + 62, btnW - 6, btnH / 2 - 4, 10);

    const label = this.add.text(this.scale.width / 2, this.scale.height / 2 + 85, '再来一次', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#2D6622',
    });
    label.setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, label]);
    container.setSize(this.scale.width, this.scale.height);
    container.setDepth(302);

    const hitArea = this.add.rectangle(this.scale.width / 2, this.scale.height / 2 + 85, btnW, btnH, 0x000000, 0);
    hitArea.setDepth(303);
    hitArea.setScrollFactor(0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      this.scene.restart();
    });

    return container;
  }

  update(): void {
    if (this.isGameOver) return;

    this.player.update();

    if (this.player.y > this.scale.height + 50) {
      this.playerFallOff();
    }
  }

  private playerFallOff(): void {
    this.player.lives--;
    this.updateLivesDisplay();

    if (this.player.lives <= 0) {
      this.gameOver();
      return;
    }

    const firstIsland = this.islands[0];
    this.player.reset(firstIsland.x, firstIsland.y - 40);
    this.cameras.main.pan(firstIsland.x, this.cameras.main.worldView.centerY, 500);
  }
}
