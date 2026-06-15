import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number }): void {
    this.finalScore = data.score || 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x000000, 0.6);
    bgGraphics.fillRect(0, 0, width, height);

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.createStarField();

    const centerX = width / 2;
    const centerY = height / 2;

    const titleText = this.add.text(centerX, centerY - 80, '游戏结束', {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    const gradientTexture = this.createGoldenGradientTexture();
    titleText.setMask(new Phaser.Display.Masks.BitmapMask(this, gradientTexture));
    titleText.setShadow(0, 0, 20, '#ffaa00', true);

    const scoreLabel = this.add.text(centerX, centerY - 10, '最终得分', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#bbbbff'
    }).setOrigin(0.5);

    const scoreValue = this.add.text(centerX, centerY + 30, `${this.finalScore}`, {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    scoreValue.setShadow(0, 0, 15, '#8888ff', true);

    this.tweens.add({
      targets: scoreValue,
      scale: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Elastic.Out'
    });

    const restartText = this.add.text(centerX, centerY + 110, '按 空格键 重新开始', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    });
  }

  private createStarField(): void {
    const { width, height } = this.cameras.main;
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 2);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.6);

      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.8),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createGoldenGradientTexture(): Phaser.GameObjects.Image {
    const { width, height } = this.cameras.main;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fff8dc');
    gradient.addColorStop(0.3, '#ffd700');
    gradient.addColorStop(0.5, '#ffb347');
    gradient.addColorStop(0.7, '#ffd700');
    gradient.addColorStop(1, '#fff8dc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const textureKey = 'golden-grad-mask';
    this.textures.remove(textureKey);
    this.textures.addCanvas(textureKey, canvas);
    return this.add.image(width / 2, height / 2, textureKey).setVisible(false);
  }
}
