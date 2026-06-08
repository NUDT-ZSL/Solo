import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private clouds: Phaser.GameObjects.Graphics[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private floatingIslands: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.drawGradientSky();
    this.createClouds();
    this.createFloatingIslands();
    this.createTitle();
    this.createStartButton();

    this.tweens.add({
      targets: this.titleText,
      y: this.titleText.y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawGradientSky(): void {
    const g = this.add.graphics();
    const h = this.scale.height;
    const w = this.scale.width;
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const r = Math.floor(Phaser.Math.Linear(0xFF, 0x7E, t));
      const gr = Math.floor(Phaser.Math.Linear(0xD9, 0xC8, t));
      const b = Math.floor(Phaser.Math.Linear(0x3D, 0xE3, t));
      g.fillStyle((r << 16) | (gr << 8) | b, 1);
      g.fillRect(0, i, w, 1);
    }
    g.setDepth(-10);
  }

  private createClouds(): void {
    for (let i = 0; i < 8; i++) {
      const cloud = this.createCloudShape(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(20, this.scale.height * 0.5),
        Phaser.Math.FloatBetween(0.3, 0.7)
      );
      this.clouds.push(cloud);
      this.tweens.add({
        targets: cloud,
        x: `+=${this.scale.width + 200}`,
        duration: Phaser.Math.Between(30000, 60000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 20000),
        onRepeat: () => {
          cloud.x = -200;
        },
      });
    }
  }

  private createCloudShape(x: number, y: number, scale: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(0, 0, 30 * scale);
    g.fillCircle(25 * scale, -5 * scale, 25 * scale);
    g.fillCircle(-25 * scale, 0, 20 * scale);
    g.fillCircle(10 * scale, -15 * scale, 22 * scale);
    g.fillCircle(-10 * scale, -10 * scale, 18 * scale);
    g.setPosition(x, y);
    g.setDepth(-5);
    return g;
  }

  private createFloatingIslands(): void {
    const positions = [
      { x: 80, y: 380, w: 100 },
      { x: 300, y: 400, w: 70 },
      { x: 550, y: 370, w: 120 },
      { x: 700, y: 410, w: 80 },
    ];
    positions.forEach((pos) => {
      const g = this.add.graphics();
      g.fillStyle(0x7ED957, 1);
      g.fillRoundedRect(-pos.w / 2, -12, pos.w, 24, 12);
      g.fillStyle(0x9EF57A, 1);
      g.fillRoundedRect(-pos.w / 2 + 4, -10, pos.w - 8, 8, 8);
      g.setPosition(pos.x, pos.y);
      g.setDepth(-3);
      this.floatingIslands.push(g);
      this.tweens.add({
        targets: g,
        y: pos.y - 8,
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    });
  }

  private createTitle(): void {
    this.titleText = this.add.text(this.scale.width / 2, this.scale.height * 0.3, '天空岛屿跳跃', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#FFD93D',
      stroke: '#CC4477',
      strokeThickness: 6,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#553366',
        blur: 8,
        fill: true,
      },
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(10);
  }

  private createStartButton(): void {
    const btnW = 200;
    const btnH = 60;

    const bg = this.add.graphics();
    bg.fillStyle(0xFFD93D, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    bg.fillStyle(0xFFE87A, 1);
    bg.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 2, btnW - 8, btnH / 2 - 4, 12);
    bg.setDepth(10);

    const label = this.add.text(0, 2, '开始游戏', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#7A4400',
    });
    label.setOrigin(0.5);
    label.setDepth(11);

    this.startButton = this.add.container(this.scale.width / 2, this.scale.height * 0.6, [bg, label]);
    this.startButton.setDepth(10);
    this.startButton.setSize(btnW, btnH);
    this.startButton.setInteractive({ useHandCursor: true });

    this.startButton.on('pointerover', () => {
      this.tweens.add({ targets: this.startButton, scaleX: 1.1, scaleY: 1.1, duration: 150, ease: 'Back.easeOut' });
    });
    this.startButton.on('pointerout', () => {
      this.tweens.add({ targets: this.startButton, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeIn' });
    });
    this.startButton.on('pointerdown', () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    });
  }

  update(): void {
  }
}
