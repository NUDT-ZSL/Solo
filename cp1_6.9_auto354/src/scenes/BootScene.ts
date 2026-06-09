import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const progress = this.add.graphics();
    const progressBox = this.add.graphics();

    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    const loadingText = this.make.text({
      x: 400,
      y: 250,
      text: '加载中...',
      style: {
        font: '20px Microsoft YaHei',
        color: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.make.text({
      x: 400,
      y: 295,
      text: '0%',
      style: {
        font: '18px Microsoft YaHei',
        color: '#ffffff'
      }
    });
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      percentText.setText(Math.round(value * 100) + '%');
      progress.clear();
      progress.fillStyle(0x4a7c3f, 1);
      progress.fillRect(250, 280, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progress.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
  }

  create(): void {
    this.scene.start('PlayScene');
  }
}
