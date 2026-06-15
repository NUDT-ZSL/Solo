import Phaser from 'phaser';

export const THEMES = [
  { name: '星陨·深蓝', primary: 0x3344aa, secondary: 0x6677ff, accent: 0x88aaff, bg: '0x0a0a2e' },
  { name: '星陨·暗红', primary: 0xaa2233, secondary: 0xff4455, accent: 0xff8899, bg: '0x2e0a14' },
  { name: '星陨·翠绿', primary: 0x22aa55, secondary: 0x44dd77, accent: 0x88ffaa, bg: '0x0a2e14' },
  { name: '星陨·金章', primary: 0xcc9922, secondary: 0xffdd44, accent: 0xffff88, bg: '0x2e240a' }
];

export default class UI {
  scene: Phaser.Scene;

  container!: Phaser.GameObjects.Container;
  scoreBg!: Phaser.GameObjects.Graphics;
  scoreText!: Phaser.GameObjects.Text;
  scoreValue: number = 0;

  energyBg!: Phaser.GameObjects.Graphics;
  energyDots!: Phaser.GameObjects.Graphics[];
  energyLabel!: Phaser.GameObjects.Text;
  energyReady: boolean = false;

  themeBg!: Phaser.GameObjects.Graphics;
  themeText!: Phaser.GameObjects.Text;

  deathOverlay!: Phaser.GameObjects.Graphics;
  deathText!: Phaser.GameObjects.Text;
  deathHint!: Phaser.GameObjects.Text;
  isGameOver: boolean = false;

  touchControls!: Phaser.GameObjects.Container;
  touchLeft!: Phaser.GameObjects.Graphics;
  touchRight!: Phaser.GameObjects.Graphics;
  touchJump!: Phaser.GameObjects.Graphics;
  touchJump2!: Phaser.GameObjects.Graphics;

  screenLeft: number = 0;
  screenRight: number = 0;
  screenTop: number = 0;
  screenBottom: number = 0;
  gameAreaLeft: number = 0;
  gameAreaRight: number = 0;
  isMobile: boolean = false;

  onTouchLeft?: () => void;
  onTouchRight?: () => void;
  onTouchJump?: () => void;
  onTouchJump2?: () => void;
  onRestart?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.calculateScreenBounds();
    this.create();
  }

  calculateScreenBounds() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.screenLeft = 0;
    this.screenRight = w;
    this.screenTop = 0;
    this.screenBottom = h;
    this.gameAreaLeft = w * 0.1;
    this.gameAreaRight = w * 0.9;
    this.isMobile = w < 768 || Math.max(w, h) / Math.min(w, h) > 1.7;
  }

  create() {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);

    this.createScoreUI();
    this.createEnergyUI();
    this.createThemeUI();
    this.createDeathOverlay();
    if (this.isMobile) {
      this.createTouchControls();
    }

    this.scene.scale.on('resize', this.onResize, this);
  }

  createScoreUI() {
    this.scoreBg = this.scene.add.graphics();
    this.scoreText = this.scene.add.text(0, 0, '0', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreText.setOrigin(0.5, 0.5);
    this.container.add([this.scoreBg, this.scoreText]);
    this.updateScorePosition();
  }

  updateScorePosition() {
    const cx = (this.screenLeft + this.screenRight) / 2;
    const cy = this.screenTop + 50;

    this.scoreBg.clear();
    this.scoreBg.fillStyle(0x000000, 0.3);
    this.scoreBg.fillRoundedRect(cx - 100, cy - 28, 200, 56, 14);
    this.scoreBg.lineStyle(1, 0xffffff, 0.2);
    this.scoreBg.strokeRoundedRect(cx - 100, cy - 28, 200, 56, 14);
    this.scoreBg.fillStyle(0x66aaff, 0.15);
    this.scoreBg.fillRoundedRect(cx - 100, cy - 28, 200, 56, 14);

    this.scoreText.setPosition(cx, cy);
  }

  createEnergyUI() {
    this.energyBg = this.scene.add.graphics();
    this.energyLabel = this.scene.add.text(0, 0, 'E  能量', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '14px',
      color: '#aaccff',
      fontStyle: 'bold'
    });
    this.energyLabel.setOrigin(0, 0.5);

    this.energyDots = [];
    for (let i = 0; i < 3; i++) {
      const dot = this.scene.add.graphics();
      this.energyDots.push(dot);
    }

    this.container.add([this.energyBg, this.energyLabel, ...this.energyDots]);
    this.updateEnergyPosition();
    this.updateEnergyDisplay(0, 30, false);
  }

  updateEnergyPosition() {
    const x = this.screenLeft + 30;
    const y = this.screenTop + 60;

    this.energyBg.clear();
    this.energyBg.fillStyle(0x000000, 0.3);
    this.energyBg.fillRoundedRect(x - 10, y - 30, 180, 60, 12);
    this.energyBg.lineStyle(1, 0xffffff, 0.15);
    this.energyBg.strokeRoundedRect(x - 10, y - 30, 180, 60, 12);
    this.energyBg.fillStyle(0x66aaff, 0.08);
    this.energyBg.fillRoundedRect(x - 10, y - 30, 180, 60, 12);

    this.energyLabel.setPosition(x + 5, y - 15);

    for (let i = 0; i < 3; i++) {
      const dotX = x + 20 + i * 50;
      const dotY = y + 10;
      this.energyDots[i].setPosition(dotX, dotY);
    }
  }

  updateEnergyDisplay(energy: number, maxEnergy: number, ready: boolean) {
    this.energyReady = ready;
    const perCell = maxEnergy / 3;
    for (let i = 0; i < 3; i++) {
      const dot = this.energyDots[i];
      const filled = energy >= (i + 1) * perCell;
      const progress = Math.min(1, Math.max(0, (energy - i * perCell) / perCell));

      dot.clear();

      if (ready) {
        this.energyBg.fillStyle(0xffdd44, 0.15);
        this.energyBg.fillRoundedRect(-10, -30, 180, 60, 12);
      }

      dot.fillStyle(0x333344, 0.6);
      dot.fillCircle(0, 0, 16);

      if (progress > 0) {
        const fillColor = ready ? 0xffdd44 : 0x4488ff;
        const accentColor = ready ? 0xffffaa : 0x88ccff;
        dot.fillStyle(fillColor, Math.min(1, progress + 0.3));
        dot.fillCircle(0, 0, 16 * Math.min(1, progress * 1.2));

        if (filled) {
          dot.fillStyle(accentColor, 0.6);
          dot.fillCircle(0, 0, 20);
        }
      }

      dot.lineStyle(1, 0xffffff, 0.3);
      dot.strokeCircle(0, 0, 16);
    }
  }

  createThemeUI() {
    this.themeBg = this.scene.add.graphics();
    this.themeText = this.scene.add.text(0, 0, '星陨·深蓝', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
      fontSize: '16px',
      color: '#88aaff',
      fontStyle: 'bold'
    });
    this.themeText.setOrigin(0, 0.5);
    this.container.add([this.themeBg, this.themeText]);
    this.updateThemePosition();
    this.updateThemeDisplay(THEMES[0]);
  }

  updateThemePosition() {
    const x = this.screenLeft + 30;
    const y = this.screenBottom - 40;

    this.themeBg.clear();
    this.themeBg.fillStyle(0x000000, 0.3);
    this.themeBg.fillRoundedRect(x - 10, y - 22, 150, 44, 10);
    this.themeBg.lineStyle(1, 0xffffff, 0.15);
    this.themeBg.strokeRoundedRect(x - 10, y - 22, 150, 44, 10);

    this.themeText.setPosition(x + 10, y);
  }

  updateThemeDisplay(theme: typeof THEMES[0]) {
    const hex = '#' + theme.secondary.toString(16).padStart(6, '0');
    this.themeText.setColor(hex);
    this.themeText.setText(theme.name);

    this.themeBg.clear();
    const x = this.screenLeft + 30;
    const y = this.screenBottom - 40;
    this.themeBg.fillStyle(0x000000, 0.3);
    this.themeBg.fillRoundedRect(x - 10, y - 22, 150, 44, 10);
    this.themeBg.lineStyle(2, theme.secondary, 0.5);
    this.themeBg.strokeRoundedRect(x - 10, y - 22, 150, 44, 10);
    this.themeBg.fillStyle(theme.primary, 0.12);
    this.themeBg.fillRoundedRect(x - 10, y - 22, 150, 44, 10);
  }

  createDeathOverlay() {
    this.deathOverlay = this.scene.add.graphics();
    this.deathOverlay.setDepth(2000);

    this.deathText = this.scene.add.text(0, 0, '星寂', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
      fontSize: '72px',
      color: '#ff4455',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    });
    this.deathText.setOrigin(0.5, 0.5);
    this.deathText.setAlpha(0);
    this.deathText.setDepth(2001);

    this.deathHint = this.scene.add.text(0, 0, '点击任意键重新开始', {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.deathHint.setOrigin(0.5, 0.5);
    this.deathHint.setAlpha(0);
    this.deathHint.setDepth(2001);
  }

  showDeath() {
    this.isGameOver = true;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1000,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const v = tween.getValue();
        this.deathOverlay.clear();
        this.deathOverlay.fillStyle(0xff0000, v * 0.5);
        this.deathOverlay.fillRect(0, 0, w, h);
        this.deathText.setAlpha(v);
        this.deathText.setPosition(w / 2, h / 2 - 20);
        this.deathHint.setAlpha(v * 0.8);
        this.deathHint.setPosition(w / 2, h / 2 + 60);
      }
    });

    this.scene.time.delayedCall(1500, () => {
      this.scene.input.keyboard?.once('keydown', () => this.restartHandler());
      this.scene.input.once('pointerdown', () => this.restartHandler());
    });
  }

  restartHandler() {
    this.isGameOver = false;
    this.deathOverlay.clear();
    this.deathText.setAlpha(0);
    this.deathHint.setAlpha(0);
    if (this.onRestart) {
      this.onRestart();
    }
  }

  createTouchControls() {
    this.touchControls = this.scene.add.container(0, 0);
    this.touchControls.setDepth(1500);

    const y = this.screenBottom - 140;

    this.touchLeft = this.createTouchButton(this.screenLeft + 80, y, 0x66aaff, '◀');
    this.touchRight = this.createTouchButton(this.screenLeft + 200, y, 0x66aaff, '▶');
    this.touchJump = this.createTouchButton(this.screenRight - 200, y, 0xffdd44, '跳');
    this.touchJump2 = this.createTouchButton(this.screenRight - 80, y + 10, 0xffaa44, 'E');
    this.touchJump2.setScale(0.8);

    this.touchControls.add([this.touchLeft, this.touchRight, this.touchJump, this.touchJump2]);
    this.container.add(this.touchControls);

    this.setupTouchInteraction(this.touchLeft, () => this.onTouchLeft?.(), 0x66aaff);
    this.setupTouchInteraction(this.touchRight, () => this.onTouchRight?.(), 0x66aaff);
    this.setupTouchInteraction(this.touchJump, () => this.onTouchJump?.(), 0xffdd44);
    this.setupTouchInteraction(this.touchJump2, () => this.onTouchJump2?.(), 0xffaa44);
  }

  createTouchButton(x: number, y: number, color: number, label: string): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.setPosition(x, y);

    g.fillStyle(0x000000, 0.4);
    g.fillCircle(0, 0, 55);
    g.lineStyle(2, color, 0.7);
    g.strokeCircle(0, 0, 55);
    g.fillStyle(color, 0.15);
    g.fillCircle(0, 0, 55);

    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    g.type;
    (g as any).labelText = text;
    (g as any).label = label;
    (g as any).baseColor = color;

    g.setInteractive(new Phaser.Geom.Circle(0, 0, 55), Phaser.Geom.Circle.Contains);

    return g;
  }

  setupTouchInteraction(btn: Phaser.GameObjects.Graphics, handler: () => void, color: number) {
    const btnAny = btn as any;
    btnAny.on('pointerdown', () => {
      this.animateButtonPress(btn, color, true);
      handler();
    });
    btnAny.on('pointerup', () => {
      this.animateButtonPress(btn, color, false);
    });
    btnAny.on('pointerout', () => {
      this.animateButtonPress(btn, color, false);
    });
  }

  animateButtonPress(btn: Phaser.GameObjects.Graphics, color: number, pressed: boolean) {
    const scale = pressed ? 0.9 : 1;
    this.scene.tweens.add({
      targets: btn,
      scaleX: scale,
      scaleY: scale,
      duration: 100,
      ease: 'Quad.easeOut'
    });

    btn.clear();
    btn.fillStyle(0x000000, pressed ? 0.6 : 0.4);
    btn.fillCircle(0, 0, 55);
    btn.lineStyle(2, color, pressed ? 1 : 0.7);
    btn.strokeCircle(0, 0, 55);
    btn.fillStyle(color, pressed ? 0.35 : 0.15);
    btn.fillCircle(0, 0, 55);
  }

  update(time: number, delta: number) {
    if (this.energyReady) {
      const pulse = 1 + Math.sin(time * 0.006) * 0.1;
      for (let i = 0; i < 3; i++) {
        this.energyDots[i].scaleX = pulse;
        this.energyDots[i].scaleY = pulse;
      }
    }
  }

  addScore(points: number) {
    this.scoreValue += points;
    this.scoreText.setText(this.scoreValue.toString());
  }

  setScore(points: number) {
    this.scoreValue = points;
    this.scoreText.setText(this.scoreValue.toString());
  }

  onResize() {
    this.calculateScreenBounds();
    this.updateScorePosition();
    this.updateEnergyPosition();
    this.updateThemePosition();
    if (this.isMobile && this.touchControls) {
      this.touchControls.removeAll(true);
      this.container.remove(this.touchControls);
      this.createTouchControls();
    }
  }
}
