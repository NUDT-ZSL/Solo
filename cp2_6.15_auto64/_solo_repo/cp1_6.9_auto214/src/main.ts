import Phaser from 'phaser';
import { Player } from './Player';
import { EnemyManager, EnemyType } from './Enemy';
import { Tunnel } from './Tunnel';
import { UIManager } from './UI';

export class GameScene extends Phaser.Scene {
  public player!: Player;
  public enemyManager!: EnemyManager;
  public tunnel!: Tunnel;
  public uiManager!: UIManager;

  public score: number = 0;
  public lives: number = 3;
  public gameTime: number = 0;
  public baseScrollSpeed: number = 250;
  public scrollSpeed: number = 250;
  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public isShockwaveActive: boolean = false;

  public bullets!: Phaser.Physics.Arcade.Group;
  public particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;

  private shockwaveGraphics!: Phaser.GameObjects.Graphics;
  private hitFlashGraphics!: Phaser.GameObjects.Graphics;
  private hitFlashTimer: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.createBackground(width, height);

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 50,
      runChildUpdate: true
    });

    this.particles = this.add.particles(0, 0, null, { lifespan: 2000 });
    this.particles.setDepth(100);

    this.tunnel = new Tunnel(this);
    this.player = new Player(this);
    this.enemyManager = new EnemyManager(this);
    this.uiManager = new UIManager(this);

    this.shockwaveGraphics = this.add.graphics();
    this.shockwaveGraphics.setDepth(90);

    this.hitFlashGraphics = this.add.graphics();
    this.hitFlashGraphics.setDepth(95);
    this.hitFlashGraphics.fillStyle(0xff3333, 0);
    this.hitFlashGraphics.fillRect(0, 0, width, height);

    this.setupCollisions();
    this.setupInput();
    this.setupCamera(width, height);

    this.physics.world.setBounds(0, 60, width, height - 120);
  }

  private createBackground(width: number, height: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const radial = ctx.createRadialGradient(
      width * 0.3, height * 0.5, 0,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.8
    );
    radial.addColorStop(0, '#120a2e');
    radial.addColorStop(0.4, '#0a0820');
    radial.addColorStop(0.7, '#0d0520');
    radial.addColorStop(1, '#050210');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    const textureKey = 'bg-gradient-' + Date.now();
    this.textures.addCanvas(textureKey, canvas);

    const bgImage = this.add.image(width / 2, height / 2, textureKey);
    bgImage.setDepth(-5);
    bgImage.setScrollFactor(0);

    const edgeGlow = this.add.graphics();
    edgeGlow.setDepth(-3);
    edgeGlow.setScrollFactor(0);
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = 80;
    edgeCanvas.height = height;
    const ectx = edgeCanvas.getContext('2d')!;
    const edgeGrad = ectx.createLinearGradient(0, 0, 80, 0);
    edgeGrad.addColorStop(0, 'rgba(68, 136, 255, 0.25)');
    edgeGrad.addColorStop(0.4, 'rgba(34, 68, 170, 0.12)');
    edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ectx.fillStyle = edgeGrad;
    ectx.fillRect(0, 0, 80, height);
    const edgeTexKey = 'edge-glow-' + Date.now();
    this.textures.addCanvas(edgeTexKey, edgeCanvas);
    const edgeImg = this.add.image(40, height / 2, edgeTexKey);
    edgeImg.setDepth(-3);
    edgeImg.setScrollFactor(0);

    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.setDepth(-4);
      star.setScrollFactor(Phaser.Math.FloatBetween(0.1, 0.4));
    }
  }

  private setupCamera(width: number, height: number): void {
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.isPaused && !this.isGameOver && this.player.energy >= 100) {
        this.triggerShockwave();
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isGameOver) {
        this.togglePause();
      }
    });
  }

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.bullets,
      this.enemyManager.enemyGroup,
      this.handleBulletEnemyCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.enemyManager.enemyGroup,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player.sprite,
      this.tunnel.obstacleGroup,
      this.handlePlayerObstacleCollision,
      undefined,
      this
    );
  }

  private handleBulletEnemyCollision(
    bulletObj: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ): void {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;

    bullet.disableBody(true, true);
    (this.bullets as Phaser.Physics.Arcade.Group).killAndHide(bullet);

    const isLowEnergy = this.player.energy < 20;
    const damage = isLowEnergy ? 0.5 : 1;

    const enemyData = enemy.getData('enemyData') as {
      hp: number;
      type: EnemyType;
      color: number;
    };
    enemyData.hp -= damage;

    if (enemyData.hp <= 0) {
      this.enemyManager.killEnemy(enemy);
      this.score += 100;
      this.uiManager.updateScore(this.score);
      this.player.addEnergy(15);
    }
  }

  private handlePlayerEnemyCollision(
    _playerObj: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ): void {
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;
    this.enemyManager.killEnemy(enemy);
    this.playerHit();
  }

  private handlePlayerObstacleCollision(
    _playerObj: Phaser.GameObjects.GameObject,
    _obstacleObj: Phaser.GameObjects.GameObject
  ): void {
    if (this.hitFlashTimer <= 0) {
      this.triggerHitFlash();
      this.player.applySlowdown(0.5, 500);
    }
  }

  public playerHit(): void {
    this.lives--;
    this.uiManager.updateLives(this.lives);
    this.triggerHitFlash();
    this.cameras.main.shake(200, 0.008);

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  private triggerHitFlash(): void {
    this.hitFlashTimer = 0.5;
    this.tweens.add({
      targets: this.hitFlashGraphics,
      alpha: { from: 0.6, to: 0 },
      duration: 500,
      ease: 'Cubic.easeOut'
    });
  }

  public triggerShockwave(): void {
    if (this.isShockwaveActive) return;
    this.isShockwaveActive = true;
    this.player.energy = 0;
    this.uiManager.updateEnergy(0);

    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.flash(400, 255, 245, 200, true);
    this.cameras.main.shake(300, 0.01);

    const enemies = this.enemyManager.enemyGroup.getChildren() as Phaser.Physics.Arcade.Image[];
    enemies.forEach((enemy) => {
      if (enemy.active) {
        this.enemyManager.killEnemy(enemy);
        this.score += 50;
      }
    });
    this.uiManager.updateScore(this.score);

    let radius = 0;
    const maxRadius = Math.max(width, height) * 1.2;
    this.shockwaveGraphics.clear();

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 600,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const value = tween.getValue() as number;
        radius = value * maxRadius;
        this.shockwaveGraphics.clear();
        const alpha1 = 1 - value * 0.5;
        const alpha2 = (1 - value) * 0.8;
        const lineWidth1 = 12 * (1 - value);
        const lineWidth2 = 6 * (1 - value);

        this.shockwaveGraphics.lineStyle(lineWidth1, 0xffffff, alpha1);
        this.shockwaveGraphics.strokeCircle(
          this.player.sprite.x,
          this.player.sprite.y,
          radius
        );

        this.shockwaveGraphics.lineStyle(lineWidth2, 0xffdd66, alpha2);
        this.shockwaveGraphics.strokeCircle(
          this.player.sprite.x,
          this.player.sprite.y,
          radius * 0.7
        );

        this.shockwaveGraphics.lineStyle(lineWidth2 * 0.5, 0xff9944, alpha2 * 0.6);
        this.shockwaveGraphics.strokeCircle(
          this.player.sprite.x,
          this.player.sprite.y,
          radius * 0.45
        );
      },
      onComplete: () => {
        this.shockwaveGraphics.clear();
        this.isShockwaveActive = false;
      }
    });
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.physics.world.pause();
    if (this.isPaused) {
      this.tweens.pauseAll();
      this.uiManager.showPauseMenu();
    } else {
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.uiManager.hidePauseMenu();
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.uiManager.showGameOver(this.score);
  }

  public restartGame(): void {
    this.score = 0;
    this.lives = 3;
    this.gameTime = 0;
    this.scrollSpeed = this.baseScrollSpeed;
    this.isPaused = false;
    this.isGameOver = false;
    this.isShockwaveActive = false;
    this.hitFlashTimer = 0;

    this.bullets.clear(true, true);
    this.enemyManager.enemyGroup.clear(true, true);
    this.tunnel.obstacleGroup.clear(true, true);

    this.player.reset();
    this.uiManager.updateScore(0);
    this.uiManager.updateLives(3);
    this.uiManager.updateEnergy(0);
    this.uiManager.hidePauseMenu();
    this.uiManager.hideGameOver();

    this.physics.world.resume();
    this.tweens.resumeAll();
    try {
      this.cameras.main.resetPostPipeline();
    } catch (_e) {
      /* ignore */
    }

    this.tunnel.init();
    this.enemyManager.reset();
  }

  update(_time: number, delta: number): void {
    if (this.isPaused || this.isGameOver) return;

    const dt = delta / 1000;
    this.gameTime += dt;

    const speedMultiplier = 1 + Math.floor(this.gameTime / 30) * 0.1;
    this.scrollSpeed = this.baseScrollSpeed * speedMultiplier;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    this.player.update(delta);
    this.enemyManager.update(delta);
    this.tunnel.update(delta);
    this.uiManager.update(delta);

    this.cleanupBullets();
  }

  private cleanupBullets(): void {
    const width = this.scale.width;
    const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
    bullets.forEach((bullet) => {
      if (bullet.active && (bullet.x > width + 50 || bullet.x < -50)) {
        bullet.disableBody(true, true);
      }
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fps: 60
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [GameScene]
};

window.addEventListener('resize', () => {
  if (game) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

const game = new Phaser.Game(config);
