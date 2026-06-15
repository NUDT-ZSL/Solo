import Phaser from 'phaser';

interface GameResult {
  totalScore: number;
  crystalCount: number;
  survivalTime: number;
  crystalScore: number;
  survivalScore: number;
}

export class GameOverScene extends Phaser.Scene {
  private static readonly GAME_WIDTH = 800;
  private static readonly GAME_HEIGHT = 600;

  private result!: GameResult;
  private auroraIcon!: Phaser.GameObjects.Container;
  private rankingItems: Phaser.GameObjects.Text[] = [];
  private restartButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameResult): void {
    this.result = data;
  }

  create(): void {
    this.createBackground();
    this.createAuroraIcon();
    this.createTitle();
    this.createScoreDisplay();
    this.createRankingAnimation();
    this.createRestartButton();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      0x0d1b2a, 0x0d1b2a,
      0x1a0a2e, 0x1a0a2e,
      1, 1, 1, 1
    );
    bg.fillRect(0, 0, GameOverScene.GAME_WIDTH, GameOverScene.GAME_HEIGHT);

    this.createAmbientParticles();
  }

  private createAmbientParticles(): void {
    const colors = [0x00e5ff, 0x9c27b0, 0x00ff88];

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * GameOverScene.GAME_WIDTH;
      const y = Math.random() * GameOverScene.GAME_HEIGHT;
      const size = 1.5 + Math.random() * 3;
      const alpha = 0.2 + Math.random() * 0.4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const period = 3000 + Math.random() * 4000;
      const amplitude = 10 + Math.random() * 20;

      const particle = this.add.circle(x, y, size, color, alpha);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(-10);

      const baseY = y;
      const phase = Math.random() * Math.PI * 2;

      this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const time = this.time.now;
          const sinPhase = ((time % period) / period) * Math.PI * 2 + phase;
          particle.y = baseY + Math.sin(sinPhase) * amplitude;
          particle.x -= 0.3;
          if (particle.x < -10) {
            particle.x = GameOverScene.GAME_WIDTH + 10;
          }
        }
      });
    }
  }

  private createAuroraIcon(): void {
    this.auroraIcon = this.add.container(GameOverScene.GAME_WIDTH / 2, 130);
    this.auroraIcon.setDepth(10);

    const circleLayers = [
      { radius: 65, color: 0x00e5ff, alpha: 0.15, width: 4 },
      { radius: 55, color: 0x64b5f6, alpha: 0.25, width: 3 },
      { radius: 45, color: 0x9c27b0, alpha: 0.35, width: 3 },
      { radius: 35, color: 0xba68c8, alpha: 0.45, width: 2 },
      { radius: 25, color: 0x00ff88, alpha: 0.55, width: 2 },
      { radius: 15, color: 0x00e5ff, alpha: 0.7, width: 2 }
    ];

    circleLayers.forEach((layer, i) => {
      const ring = this.add.graphics();
      ring.lineStyle(layer.width, layer.color, layer.alpha);
      ring.strokeCircle(0, 0, layer.radius);
      ring.name = `ring_${i}`;
      ring.setBlendMode(Phaser.BlendModes.ADD);
      this.auroraIcon.add(ring);
    });

    const centerGlow = this.add.graphics();
    centerGlow.fillStyle(0x00e5ff, 0.3);
    centerGlow.fillCircle(0, 0, 12);
    centerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.auroraIcon.add(centerGlow);

    this.animateAuroraIcon(circleLayers);
  }

  private animateAuroraIcon(circleLayers: { radius: number; color: number; alpha: number; width: number }[]): void {
    const startTime = this.time.now;

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const elapsed = this.time.now - startTime;

        this.auroraIcon.rotation += 0.003;

        circleLayers.forEach((layer, i) => {
          const ring = this.auroraIcon.getByName(`ring_${i}`) as Phaser.GameObjects.Graphics;
          if (!ring) return;

          const phase = (elapsed % 2000) / 2000;
          const pulse = 1 + Math.sin(phase * Math.PI * 2 + i * 0.5) * 0.12;
          const alphaVar = layer.alpha * (0.7 + Math.sin(phase * Math.PI * 2 + i * 0.3) * 0.3);

          ring.clear();
          ring.lineStyle(
            layer.width * (0.8 + Math.sin(phase * Math.PI * 2 + i * 0.7) * 0.2),
            layer.color,
            alphaVar
          );
          ring.strokeCircle(0, 0, layer.radius * pulse);
        });
      }
    });
  }

  private createTitle(): void {
    const title = this.add.text(GameOverScene.GAME_WIDTH / 2, 240, '记忆抵达核心', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '28px',
      color: '#00e5ff'
    });
    title.setOrigin(0.5);
    title.setShadow(4, 4, 'rgba(156, 39, 176, 0.8)', 0, true, true);
    title.setDepth(20);
    title.setAlpha(0);
    title.setScale(0.8);

    this.tweens.add({
      targets: title,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      y: { from: 260, to: 240 },
      duration: 800,
      ease: 'Back.easeOut',
      delay: 300
    });
  }

  private createScoreDisplay(): void {
    const startY = 310;
    const lineHeight = 42;

    const items = [
      {
        label: '水晶收集数',
        value: `${this.result.crystalCount} 颗`,
        subValue: `+${this.result.crystalScore}分`,
        labelColor: '#ba68c8',
        valueColor: '#ffffff'
      },
      {
        label: '生存时间',
        value: `${this.result.survivalTime} 秒`,
        subValue: `+${this.result.survivalScore}分`,
        labelColor: '#64b5f6',
        valueColor: '#ffffff'
      },
      {
        label: '',
        value: '',
        subValue: '',
        labelColor: '',
        valueColor: '',
        isDivider: true
      },
      {
        label: '最终得分',
        value: `${this.result.totalScore}`,
        subValue: '',
        labelColor: '#ffd700',
        valueColor: '#ffd700',
        isTotal: true
      }
    ];

    let currentY = startY;
    let delay = 600;

    items.forEach((item, index) => {
      if (item.isDivider) {
        const divider = this.add.graphics();
        divider.lineStyle(2, 0x9c27b0, 0.5);
        divider.lineBetween(200, currentY, 600, currentY);
        divider.setDepth(20);
        divider.setAlpha(0);

        this.tweens.add({
          targets: divider,
          alpha: { from: 0, to: 1 },
          duration: 500,
          delay
        });

        currentY += lineHeight * 0.6;
        delay += 200;
        return;
      }

      const fontSize = item.isTotal ? '24px' : '14px';

      const labelText = this.add.text(220, currentY, item.label, {
        fontFamily: '"Press Start 2P", cursive',
        fontSize,
        color: item.labelColor
      });
      labelText.setOrigin(0, 0.5);
      labelText.setDepth(20);
      labelText.setAlpha(0);
      labelText.setX(180);

      const valueText = this.add.text(600, currentY, item.value, {
        fontFamily: '"Press Start 2P", cursive',
        fontSize,
        color: item.valueColor
      });
      valueText.setOrigin(1, 0.5);
      valueText.setDepth(20);
      valueText.setAlpha(0);
      valueText.setX(640);

      if (item.isTotal) {
        valueText.setShadow(3, 3, 'rgba(255, 215, 0, 0.5)', 0, true, true);
        labelText.setShadow(3, 3, 'rgba(255, 215, 0, 0.3)', 0, true, true);
      }

      this.tweens.add({
        targets: labelText,
        alpha: { from: 0, to: 1 },
        x: { from: 180, to: 220 },
        duration: 600,
        ease: 'Power2.easeOut',
        delay
      });

      this.tweens.add({
        targets: valueText,
        alpha: { from: 0, to: 1 },
        x: { from: 640, to: 600 },
        duration: 600,
        ease: 'Power2.easeOut',
        delay: delay + 100
      });

      if (item.subValue) {
        const subText = this.add.text(600, currentY + 18, item.subValue, {
          fontFamily: '"Press Start 2P", cursive',
          fontSize: '10px',
          color: '#00e5ff'
        });
        subText.setOrigin(1, 0.5);
        subText.setDepth(20);
        subText.setAlpha(0);

        this.tweens.add({
          targets: subText,
          alpha: { from: 0, to: 1 },
          duration: 400,
          delay: delay + 400
        });
      }

      currentY += lineHeight;
      delay += 250;
    });
  }

  private createRankingAnimation(): void {
    const ranks = this.getRankings(this.result.totalScore);

    const containerX = GameOverScene.GAME_WIDTH / 2;
    const containerY = 495;
    const visibleHeight = 60;
    const itemHeight = 22;

    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(
      containerX - 180,
      containerY - visibleHeight / 2,
      360,
      visibleHeight
    );
    const mask = new Phaser.Display.Masks.GeometryMask(this, maskGraphics);
    mask.setInvertAlpha(false);

    const rankingContainer = this.add.container(containerX, containerY);
    rankingContainer.setDepth(30);
    rankingContainer.setMask(mask);

    ranks.forEach((rank, index) => {
      const y = -ranks.length * itemHeight / 2 + index * itemHeight;

      const isPlayer = rank.isPlayer;
      const text = this.add.text(-160, y, `${rank.rank}. ${rank.name}`, {
        fontFamily: '"Press Start 2P", cursive',
        fontSize: isPlayer ? '14px' : '12px',
        color: isPlayer ? '#ffd700' : (index < 3 ? '#00e5ff' : '#9c27b0')
      });
      text.setOrigin(0, 0.5);

      const scoreText = this.add.text(160, y, `${rank.score}`, {
        fontFamily: '"Press Start 2P", cursive',
        fontSize: isPlayer ? '14px' : '12px',
        color: isPlayer ? '#ffd700' : '#ffffff'
      });
      scoreText.setOrigin(1, 0.5);

      if (isPlayer) {
        text.setShadow(2, 2, 'rgba(255, 215, 0, 0.5)', 0, true, true);
        scoreText.setShadow(2, 2, 'rgba(255, 215, 0, 0.5)', 0, true, true);
      }

      this.rankingItems.push(text, scoreText);
      rankingContainer.add([text, scoreText]);
    });

    const titleText = this.add.text(containerX, containerY - visibleHeight / 2 - 15, '★ 排行榜 ★', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '12px',
      color: '#ffd700'
    });
    titleText.setOrigin(0.5, 1);
    titleText.setDepth(30);
    titleText.setAlpha(0);

    this.tweens.add({
      targets: titleText,
      alpha: { from: 0, to: 1 },
      duration: 500,
      delay: 2000
    });

    this.tweens.add({
      targets: rankingContainer,
      y: {
        from: containerY + ranks.length * itemHeight * 0.5,
        to: containerY - ranks.length * itemHeight * 0.5 + itemHeight * 3
      },
      duration: 5000,
      ease: 'Linear',
      delay: 2200,
      onComplete: () => {
        rankingContainer.y = containerY + ranks.length * itemHeight * 0.5 - itemHeight * 3;
        this.tweens.add({
          targets: rankingContainer,
          y: {
            from: containerY + ranks.length * itemHeight * 0.5 - itemHeight * 3,
            to: containerY - itemHeight
          },
          duration: 3000,
          ease: 'Linear',
          hold: 1000,
          repeat: -1,
          repeatDelay: 1000
        });
      }
    });
  }

  private getRankings(playerScore: number): { rank: number; name: string; score: number; isPlayer: boolean }[] {
    const fakeRankings = [
      { name: '极光守护灵', score: 1250 },
      { name: '星辰旅人', score: 980 },
      { name: '月华使者', score: 860 },
      { name: '梦境织者', score: 720 },
      { name: '碎光拾荒者', score: 650 },
      { name: '深渊探者', score: 580 },
      { name: '飞羽少年', score: 450 },
      { name: '迷途小鸟', score: 320 },
      { name: '极光学徒', score: 200 },
      { name: '初见之羽', score: 120 }
    ];

    const rankings = fakeRankings.map(r => ({
      name: r.name,
      score: r.score,
      isPlayer: false
    }));

    rankings.push({
      name: '你',
      score: playerScore,
      isPlayer: true
    });

    rankings.sort((a, b) => b.score - a.score);

    return rankings.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      isPlayer: r.isPlayer
    }));
  }

  private createRestartButton(): void {
    const buttonX = GameOverScene.GAME_WIDTH / 2;
    const buttonY = GameOverScene.GAME_HEIGHT - 55;

    this.restartButton = this.add.container(buttonX, buttonY);
    this.restartButton.setDepth(50);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x1a1a3e, 0.9);
    buttonBg.lineStyle(3, 0x00e5ff, 0.8);
    buttonBg.fillRoundedRect(-130, -22, 260, 44, 8);
    buttonBg.strokeRoundedRect(-130, -22, 260, 44, 8);

    const buttonText = this.add.text(0, 0, '重新启程', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '18px',
      color: '#00e5ff'
    });
    buttonText.setOrigin(0.5);

    this.restartButton.add([buttonBg, buttonText]);
    this.restartButton.setSize(260, 44);
    this.restartButton.setInteractive({ useHandCursor: true });
    this.restartButton.setAlpha(0);

    this.tweens.add({
      targets: this.restartButton,
      alpha: { from: 0, to: 1 },
      y: { from: buttonY + 30, to: buttonY },
      duration: 600,
      ease: 'Back.easeOut',
      delay: 2500
    });

    this.restartButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.restartButton,
        scale: { from: this.restartButton.scale, to: 1.05 },
        duration: 200,
        ease: 'Power2.easeOut'
      });

      buttonBg.clear();
      buttonBg.fillStyle(0x2a2a5e, 0.95);
      buttonBg.lineStyle(3, 0xffd700, 1);
      buttonBg.fillRoundedRect(-130, -22, 260, 44, 8);
      buttonBg.strokeRoundedRect(-130, -22, 260, 44, 8);

      buttonText.setColor('#ffd700');
    });

    this.restartButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.restartButton,
        scale: { from: this.restartButton.scale, to: 1 },
        duration: 200,
        ease: 'Power2.easeOut'
      });

      buttonBg.clear();
      buttonBg.fillStyle(0x1a1a3e, 0.9);
      buttonBg.lineStyle(3, 0x00e5ff, 0.8);
      buttonBg.fillRoundedRect(-130, -22, 260, 44, 8);
      buttonBg.strokeRoundedRect(-130, -22, 260, 44, 8);

      buttonText.setColor('#00e5ff');
    });

    this.restartButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.restartButton,
        scale: { from: 1.05, to: 0.95 },
        duration: 100,
        ease: 'Power2.easeIn'
      });
    });

    this.restartButton.on('pointerup', () => {
      this.tweens.add({
        targets: this.restartButton,
        scale: { from: 0.95, to: 1 },
        duration: 100,
        ease: 'Power2.easeOut'
      });

      this.fadeOutAndRestart();
    });
  }

  private fadeOutAndRestart(): void {
    const fadeOverlay = this.add.rectangle(
      GameOverScene.GAME_WIDTH / 2,
      GameOverScene.GAME_HEIGHT / 2,
      GameOverScene.GAME_WIDTH,
      GameOverScene.GAME_HEIGHT,
      0x0d1b2a,
      0
    );
    fadeOverlay.setDepth(10000);

    this.cameras.main.fadeOut(500, 13, 27, 42);

    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
    });
  }

  update(): void {}
}
