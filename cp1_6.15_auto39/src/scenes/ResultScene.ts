import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from '../config/gameConfig';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: { distance: number; coins: number; score: number }) {
    const { distance, coins, score } = data;

    const bg = this.add.graphics();
    bg.fillStyle(0x87ceeb, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const blurOverlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5,
    );
    blurOverlay.setDepth(50);

    const panelW = 400;
    const panelH = 320;
    const panelX = GAME_WIDTH / 2 - panelW / 2;
    const panelY = GAME_HEIGHT / 2 - panelH / 2;

    const panel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      panelW,
      panelH,
      0xffffff,
      0.95,
    );
    panel.setDepth(51);
    panel.setStrokeStyle(3, 0x4a90d9);

    const cornerSize = 12;
    const corners = [
      { x: panelX, y: panelY },
      { x: panelX + panelW, y: panelY },
      { x: panelX, y: panelY + panelH },
      { x: panelX + panelW, y: panelY + panelH },
    ];
    for (const c of corners) {
      const dot = this.add.circle(c.x, c.y, cornerSize, 0x4a90d9);
      dot.setDepth(52);
    }

    const title = this.add.text(GAME_WIDTH / 2, panelY + 45, '游戏结束', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#e74c3c',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(52);

    const divider = this.add.rectangle(
      GAME_WIDTH / 2,
      panelY + 80,
      panelW - 60,
      2,
      0x4a90d9,
    );
    divider.setDepth(52);

    const scoreText = this.add.text(GAME_WIDTH / 2, panelY + 120, `得分: ${score}`, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#2c3e50',
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(52);

    const distanceText = this.add.text(GAME_WIDTH / 2, panelY + 165, `奔跑距离: ${distance} px`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#7f8c8d',
    });
    distanceText.setOrigin(0.5);
    distanceText.setDepth(52);

    const coinIcon = this.add.ellipse(GAME_WIDTH / 2 - 55, panelY + 210, 22, 22, 0xffd700);
    coinIcon.setStrokeStyle(2, 0xdaa520);
    coinIcon.setDepth(52);

    const coinText = this.add.text(GAME_WIDTH / 2, panelY + 210, `金币: ${coins}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#7f8c8d',
    });
    coinText.setOrigin(0.5);
    coinText.setDepth(52);

    const btnW = 200;
    const btnH = 50;
    const btnX = GAME_WIDTH / 2;
    const btnY = panelY + panelH - 55;

    const btn = this.add.rectangle(btnX, btnY, btnW, btnH, 0x4a90d9);
    btn.setDepth(52);
    btn.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(btnX, btnY, '重新开始', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5);
    btnText.setDepth(53);

    btn.on('pointerover', () => {
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: 'Back.easeOut',
      });
      btn.setFillStyle(0x5ba0e0);
    });

    btn.on('pointerout', () => {
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
      btn.setFillStyle(0x4a90d9);
    });

    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.scene.start('GameScene');
        },
      });
    });

    this.tweens.add({
      targets: panel,
      scaleY: { from: 0, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: [title, scoreText, distanceText, coinText, coinIcon, btn, btnText, divider],
      alpha: { from: 0, to: 1 },
      duration: 500,
      delay: 200,
    });
  }
}
