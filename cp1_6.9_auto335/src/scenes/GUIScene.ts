import Phaser from 'phaser';
import { GameData } from '../main';
import { createGearTexture } from '../utils/TextureFactory';

const UI_WIDTH = 800;
const UI_HEIGHT = 600;

export class GUIScene extends Phaser.Scene {
  private timeScaleLabel!: Phaser.GameObjects.Text;
  private timeScaleIcon!: Phaser.GameObjects.Image;
  private timeScaleContainer!: Phaser.GameObjects.Container;

  private progressBarBg!: Phaser.GameObjects.Graphics;
  private progressBarFill!: Phaser.GameObjects.Graphics;
  private progressGearLeft!: Phaser.GameObjects.Image;
  private progressGearRight!: Phaser.GameObjects.Image;
  private progressText!: Phaser.GameObjects.Text;
  private progressContainer!: Phaser.GameObjects.Container;

  private hintContainer!: Phaser.GameObjects.Container;

  private vignetteGraphics!: Phaser.GameObjects.Graphics;
  private currentTimeScale: number = 1;

  private physicsScene!: Phaser.Scene;

  constructor() {
    super({ key: 'GUIScene' });
  }

  create(): void {
    this.physicsScene = this.scene.get('PhysicsScene');

    createGearTexture(this, 'uiGear', 10, 12, 0x8d6e63, 0xbcaaa4);

    this.createTimeScaleDisplay();
    this.createProgressBar();
    this.createHelpHints();
    this.createVignette();

    this.physicsScene.events.on('timeScaleChanged', this.onTimeScaleChanged, this);
    this.physicsScene.events.on('progressChanged', this.onProgressChanged, this);

    this.scale.on('resize', this.onResize, this);
    this.events.on('resize', this.onResize, this);
  }

  private createTimeScaleDisplay(): void {
    this.timeScaleContainer = this.add.container(16, 16);
    this.timeScaleContainer.setDepth(100);
    this.timeScaleContainer.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.lineStyle(1, 0x8d6e63, 0.8);
    bg.fillRoundedRect(0, 0, 150, 44, 8);
    bg.strokeRoundedRect(0, 0, 150, 44, 8);

    const shadowBg = this.add.graphics();
    shadowBg.fillStyle(0x000000, 0.35);
    shadowBg.fillRoundedRect(2, 3, 150, 44, 8);
    shadowBg.setDepth(-1);

    this.timeScaleIcon = this.add.image(24, 22, 'uiGear');
    this.timeScaleIcon.setTint(0xffd700);
    this.timeScaleIcon.setScale(1.2);

    this.timeScaleLabel = this.add.text(52, 10, 'x1.0', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });

    const labelShadow = this.add.text(54, 12, 'x1.0', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: 'rgba(0,0,0,0.5)',
      stroke: 'rgba(0,0,0,0.5)',
      strokeThickness: 2
    });
    labelShadow.setDepth(-1);

    const subLabel = this.add.text(52, 30, '时间倍率', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '11px',
      color: '#c9bdb6',
      stroke: '#000000',
      strokeThickness: 1
    });

    this.timeScaleContainer.add([shadowBg, bg, this.timeScaleIcon, labelShadow, this.timeScaleLabel, subLabel]);

    this.updateTimeScaleLabelRef = (val: string) => {
      this.timeScaleLabel.setText(val);
      labelShadow.setText(val);
    };
  }

  private updateTimeScaleLabelRef!: (val: string) => void;

  private createProgressBar(): void {
    this.progressContainer = this.add.container(UI_WIDTH / 2, 28);
    this.progressContainer.setDepth(100);
    this.progressContainer.setScrollFactor(0);

    const barWidth = 400;
    const barHeight = 20;

    this.progressGearLeft = this.add.image(-barWidth / 2 - 14, 0, 'uiGear');
    this.progressGearLeft.setScale(1);

    this.progressGearRight = this.add.image(barWidth / 2 + 14, 0, 'uiGear');
    this.progressGearRight.setScale(1);

    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x424242, 1);
    this.progressBarBg.lineStyle(2, 0x212121, 1);
    this.progressBarBg.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 4);
    this.progressBarBg.strokeRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 4);

    const progShadow = this.add.graphics();
    progShadow.fillStyle(0x000000, 0.4);
    progShadow.fillRoundedRect(-barWidth / 2 + 2, -barHeight / 2 + 3, barWidth, barHeight, 4);
    progShadow.setDepth(-1);

    this.progressBarFill = this.add.graphics();
    this.updateProgressFill(0, barWidth, barHeight);

    this.progressText = this.add.text(0, 0, '0%', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.progressText.setOrigin(0.5, 0.5);

    const progTextShadow = this.add.text(2, 2, '0%', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: 'rgba(0,0,0,0.5)',
      stroke: 'rgba(0,0,0,0.5)',
      strokeThickness: 2
    });
    progTextShadow.setOrigin(0.5, 0.5);
    progTextShadow.setDepth(-1);

    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x5d4037, 0.9);
    titleBg.fillRoundedRect(-70, -barHeight / 2 - 28, 140, 22, 6);

    const titleText = this.add.text(0, -barHeight / 2 - 17, '修复进度', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 1
    });
    titleText.setOrigin(0.5, 0.5);

    this.progressContainer.add([
      progShadow,
      this.progressGearLeft,
      this.progressGearRight,
      this.progressBarBg,
      this.progressBarFill,
      progTextShadow,
      this.progressText,
      titleBg,
      titleText
    ]);

    this.updateProgressTextRef = (val: string) => {
      this.progressText.setText(val);
      progTextShadow.setText(val);
    };
  }

  private updateProgressTextRef!: (val: string) => void;

  private updateProgressFill(progress: number, barWidth: number = 400, barHeight: number = 20): void {
    this.progressBarFill.clear();
    const fillWidth = (progress / 100) * (barWidth - 4);
    if (fillWidth <= 0) return;

    const color = this.getProgressColor(progress);
    this.progressBarFill.fillStyle(color, 1);
    this.progressBarFill.fillRoundedRect(
      -barWidth / 2 + 2,
      -barHeight / 2 + 2,
      fillWidth,
      barHeight - 4,
      3
    );

    const highlightAlpha = 0.3;
    this.progressBarFill.fillStyle(0xffffff, highlightAlpha);
    this.progressBarFill.fillRoundedRect(
      -barWidth / 2 + 2,
      -barHeight / 2 + 2,
      fillWidth,
      (barHeight - 4) / 2,
      3
    );
  }

  private getProgressColor(progress: number): number {
    const t = Math.min(1, Math.max(0, progress / 100));
    const r1 = 229, g1 = 57, b1 = 53;
    const r2 = 67, g2 = 160, b2 = 71;
    const r = Math.floor(r1 + (r2 - r1) * t);
    const g = Math.floor(g1 + (g2 - g1) * t);
    const b = Math.floor(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  private createHelpHints(): void {
    const posX = UI_WIDTH - 256;
    const posY = UI_HEIGHT - 124;
    this.hintContainer = this.add.container(posX, posY);
    this.hintContainer.setDepth(100);
    this.hintContainer.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.lineStyle(1, 0x8d6e63, 0.8);

    const boxW = 240;
    const boxH = 108;
    bg.fillRoundedRect(0, 0, boxW, boxH, 8);
    bg.strokeRoundedRect(0, 0, boxW, boxH, 8);

    const hintShadow = this.add.graphics();
    hintShadow.fillStyle(0x000000, 0.4);
    hintShadow.fillRoundedRect(2, 3, boxW, boxH, 8);
    hintShadow.setDepth(-1);

    const title = this.add.text(12, 10, '操作说明', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 1
    });

    const hints: { key: string; text: string; y: number }[] = [
      { key: 'Q / E', text: '加速 +1x / 减速 -1x', y: 32 },
      { key: 'WASD / 箭头', text: '跳跃到相邻平台', y: 52 },
      { key: '方向按钮', text: '点击箭头跳跃移动', y: 72 },
      { key: '+2x 撞击', text: '快速修复破碎发条', y: 92 }
    ];

    const hintItems: Phaser.GameObjects.GameObject[] = [];
    hints.forEach((h) => {
      const keyBg = this.add.graphics();
      keyBg.fillStyle(0x1a1a1a, 1);
      keyBg.fillRect(10, h.y - 1, Math.max(38, h.key.length * 8 + 8), 16);

      const keyLabel = this.add.text(14, h.y, h.key, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#4fc3f7'
      });

      const keyShadow = this.add.text(15, h.y + 1, h.key, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: 'rgba(0,0,0,0.4)'
      });
      keyShadow.setDepth(-1);

      const desc = this.add.text(90, h.y + 1, h.text, {
        fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
        fontSize: '11px',
        color: '#d7ccc8'
      });
      hintItems.push(keyBg, keyShadow, keyLabel, desc);
    });

    this.hintContainer.add([hintShadow, bg, title, ...hintItems]);
  }

  private createVignette(): void {
    this.vignetteGraphics = this.add.graphics();
    this.vignetteGraphics.setDepth(99);
    this.vignetteGraphics.setScrollFactor(0);
  }

  private onTimeScaleChanged(newScale: number): void {
    this.currentTimeScale = newScale;

    const displayText = newScale > 0 ? `x${newScale}.0` : `x${Math.abs(newScale)}.0`;
    if (this.updateTimeScaleLabelRef) {
      this.updateTimeScaleLabelRef(displayText);
    }

    if (newScale > 0) {
      this.timeScaleLabel.setColor('#ffd54f');
      this.timeScaleIcon.setTint(0xffd54f);
    } else if (newScale < 0) {
      this.timeScaleLabel.setColor('#4fc3f7');
      this.timeScaleIcon.setTint(0x80deea);
    } else {
      this.timeScaleLabel.setColor('#ffffff');
      this.timeScaleIcon.clearTint();
    }

    this.timeScaleContainer.setScale(1.15);
    this.tweens.add({
      targets: this.timeScaleContainer,
      scale: 1,
      duration: 300,
      ease: 'Back.Out'
    });

    this.showTimeVignette(newScale > 0);
  }

  private showTimeVignette(isAccelerate: boolean): void {
    const color = isAccelerate ? 0xffd54f : 0x4fc3f7;
    this.vignetteGraphics.clear();

    const thickness = 60;
    this.vignetteGraphics.fillStyle(color, 0.4);

    const w = UI_WIDTH;
    const h = UI_HEIGHT;
    this.vignetteGraphics.fillRect(0, 0, w, thickness);
    this.vignetteGraphics.fillRect(0, h - thickness, w, thickness);
    this.vignetteGraphics.fillRect(0, 0, thickness, h);
    this.vignetteGraphics.fillRect(w - thickness, 0, thickness, h);

    this.tweens.add({
      targets: this.vignetteGraphics,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.vignetteGraphics.clear();
        this.vignetteGraphics.setAlpha(1);
      }
    });
  }

  private onProgressChanged(progress: number): void {
    this.updateProgressFill(progress);
    if (this.updateProgressTextRef) {
      this.updateProgressTextRef(`${Math.floor(progress)}%`);
    }

    this.tweens.add({
      targets: this.progressContainer,
      scale: 1.08,
      duration: 200,
      ease: 'Quad.Out',
      yoyo: true
    });

    if (progress >= 100) {
      this.showVictoryMessage();
    }
  }

  private showVictoryMessage(): void {
    const victory = this.add.container(UI_WIDTH / 2, UI_HEIGHT / 2);
    victory.setDepth(200);
    victory.setScrollFactor(0);
    victory.setAlpha(0);
    victory.setScale(0.5);

    const bg = this.add.graphics();
    bg.fillStyle(0x3e2723, 0.95);
    bg.lineStyle(3, 0xffd700, 1);
    bg.fillRoundedRect(-180, -90, 360, 180, 16);
    bg.strokeRoundedRect(-180, -90, 360, 180, 16);

    const title = this.add.text(0, -40, '时间韵律恢复！', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3
    });
    title.setOrigin(0.5, 0.5);

    const desc = this.add.text(0, 5, '所有机关已成功修复！', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '16px',
      color: '#d7ccc8',
      stroke: '#000000',
      strokeThickness: 1
    });
    desc.setOrigin(0.5, 0.5);

    const tip = this.add.text(0, 40, '按 R 键重新开始', {
      fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
      fontSize: '13px',
      color: '#80deea'
    });
    tip.setOrigin(0.5, 0.5);

    victory.add([bg, title, desc, tip]);

    this.tweens.add({
      targets: victory,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Back.Out'
    });

    this.input.keyboard!.once('keydown-R', () => {
      this.tweens.add({
        targets: victory,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        ease: 'Cubic.In',
        onComplete: () => {
          victory.destroy();
          this.game.scene.stop('PhysicsScene');
          this.game.scene.stop('GUIScene');
          this.game.scene.start('PhysicsScene');
          this.game.scene.start('GUIScene');
        }
      });
    });
  }

  private onResize(): void {
  }

  update(_time: number, _delta: number): void {
    const rotSpeed = 0.5 + Math.abs(GameData.timeScale) * 0.3;
    const dir = GameData.timeScale >= 0 ? 1 : -1;
    this.progressGearLeft.angle += rotSpeed * dir;
    this.progressGearRight.angle -= rotSpeed * dir;
    this.timeScaleIcon.angle += rotSpeed * 1.5 * dir;
  }
}
