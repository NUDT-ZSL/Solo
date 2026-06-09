import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/gameConfig';
import { ELEMENTS } from '../config/elements';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    const bgGrad = this.add.graphics();
    bgGrad.fillGradientStyle(0x1a0a2e, 0x3d0a0a, 0x2d0a1e, 0x1a0a2e, 1);
    bgGrad.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const starGraphics = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = Math.random() * CANVAS_HEIGHT;
      const s = Math.random() * 1.5 + 0.5;
      const a = Math.random() * 0.7 + 0.3;
      starGraphics.fillStyle(i % 7 === 0 ? 0xffd700 : 0xffffff, a);
      starGraphics.fillCircle(x, y, s);
    }

    const title = this.add.text(cx, cy - 120, '灵 契 召 唤', {
      fontSize: '56px',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      color: '#ffdd88',
      fontStyle: 'bold',
      stroke: '#440066',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    title.setShadow(4, 4, 'rgba(255,100,50,0.6)', 0, true, true);

    this.tweens.add({
      targets: title,
      scale: { from: 0.9, to: 1.08 },
      alpha: { from: 0.6, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    const subtitle = this.add.text(cx, cy - 55, 'Lingqi Summon · 守护灵塔防', {
      fontSize: '22px',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      color: '#ccbbff',
      fontStyle: 'italic'
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0.9);

    const elements = Object.keys(ELEMENTS) as (keyof typeof ELEMENTS)[];
    elements.forEach((el, i) => {
      const cfg = ELEMENTS[el];
      const ex = cx - 180 + i * 120;
      const ey = cy + 20;
      const circle = this.add.circle(ex, ey, 28, cfg.color, 0.2);
      circle.setStrokeStyle(3, cfg.color, 0.8);
      const icon = this.add.text(ex, ey + 2, cfg.icon, { fontSize: '30px', fontFamily: 'sans-serif' });
      icon.setOrigin(0.5);
      this.tweens.add({
        targets: [circle, icon],
        y: ey + 6,
        duration: 700 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: i * 150
      });
      this.tweens.add({
        targets: circle,
        alpha: { from: 0.2, to: 0.45 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    });

    const barWidth = 360;
    const barHeight = 18;
    const barX = cx - barWidth / 2;
    const barY = cy + 120;

    const barBg = this.add.rectangle(cx, barY + barHeight / 2, barWidth, barHeight, 0x000000, 0.7);
    barBg.setStrokeStyle(2, 0x6633aa, 0.9);
    const barFill = this.add.rectangle(barX, barY + barHeight / 2, 0, barHeight, 0xff7722, 0.95);
    barFill.setOrigin(0, 0.5);
    barFill.setAlpha(0.9);

    const loadingText = this.add.text(cx, barY + 44, '正在凝聚灵契之力...', {
      fontSize: '18px',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      color: '#ddaaff'
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      const w = Math.max(2, barWidth * value);
      barFill.width = w;
      const hue = (1 - value) * 40;
      barFill.setFillStyle(Phaser.Display.Color.HSVToRGB(value * 0.08 + 0.02, 1, 1).color, 0.95);
      loadingText.setText(`凝聚灵契之力... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('✦ 灵契就绪 ✦');
      loadingText.setColor('#88ff88');
      this.time.delayedCall(800, () => {
        this.scene.start('GameScene');
      });
    });

    for (let i = 0; i < 10; i++) {
      const key = `particle_dummy_${i}`;
      this.load.image(key, this._create1x1Texture());
    }
  }

  private _create1x1Texture(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillRect(0, 0, 4, 4);
    }
    return canvas.toDataURL('image/png');
  }

  create(): void {
    this.load.start();
  }
}
