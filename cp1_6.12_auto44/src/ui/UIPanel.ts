import Phaser from 'phaser';
import { RuneElement, RUNE_DEFINITIONS, WeaponRecipe } from '../game/RuneData';
import { createRoundedRect, createRoundedRectWithStroke } from '../game/GraphicsUtil';

export const UI_EVENTS = {
  FORGE_REQUESTED: 'ui:forge',
  RESET_REQUESTED: 'ui:reset',
  MANA_REQUEST: 'ui:manaRequest',
} as const;

interface BarConfig {
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  startAngle: number;
  totalAngle: number;
  anticlockwise: boolean;
  bgColor: number;
  fillColor: number;
  glowColor: number;
  darkColor: number;
  label: string;
  labelColor: string;
}

export class UIPanel extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  private hpBarGraphics!: Phaser.GameObjects.Graphics;
  private mpBarGraphics!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private weaponIcon!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private damageTexts: Phaser.GameObjects.Text[] = [];
  private weaponSlot!: Phaser.GameObjects.Container;
  private weaponSlotBg!: Phaser.GameObjects.Graphics;
  private forgeButton!: Phaser.GameObjects.Container;
  private resetButton!: Phaser.GameObjects.Container;

  private hpBarConfig!: BarConfig;
  private mpBarConfig!: BarConfig;

  private currentHpRatio: number = 1;
  private currentMpRatio: number = 1;
  private targetHpRatio: number = 1;
  private targetMpRatio: number = 1;

  private isMobile: boolean = false;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.container = this.scene.add.container(0, 0).setDepth(100);
    this.isMobile = this.detectMobile();
    this.createPanel();
    this.scene.events.on('update', this.update, this);
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private detectMobile(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
    const isMobileUA = mobileKeywords.some(k => userAgent.includes(k));
    const isSmallScreen = this.scene.scale.width < 768;
    return isMobileUA || isSmallScreen;
  }

  private createPanel() {
    this.createTopBars();
    this.createWeaponSlot();
    this.createButtons();
    this.createDecorations();
  }

  private createTopBars() {
    const gaugeRadius = this.isMobile ? 45 : 55;
    const gaugeY = this.isMobile ? 70 : 80;
    const barThickness = 16;

    this.hpBarConfig = {
      cx: gaugeRadius + 20,
      cy: gaugeY,
      outerRadius: gaugeRadius,
      innerRadius: gaugeRadius - barThickness,
      startAngle: Math.PI / 2,
      totalAngle: Math.PI,
      anticlockwise: false,
      bgColor: 0x1a1a2e,
      fillColor: 0x8b0000,
      glowColor: 0xff4757,
      darkColor: 0x5c0000,
      label: 'HP',
      labelColor: '#ff4757',
    };

    this.mpBarConfig = {
      cx: this.scene.scale.width - gaugeRadius - 20,
      cy: gaugeY,
      outerRadius: gaugeRadius,
      innerRadius: gaugeRadius - barThickness,
      startAngle: Math.PI / 2,
      totalAngle: Math.PI,
      anticlockwise: true,
      bgColor: 0x1a1a2e,
      fillColor: 0x0984e3,
      glowColor: 0x74b9ff,
      darkColor: 0x0652a0,
      label: 'MP',
      labelColor: '#74b9ff',
    };

    this.hpBarGraphics = this.scene.add.graphics();
    this.mpBarGraphics = this.scene.add.graphics();
    this.container.add([this.hpBarGraphics, this.mpBarGraphics]);

    const hpLabel = this.scene.add.text(this.hpBarConfig.cx, this.hpBarConfig.cy - 8, 'HP', {
      fontSize: '12px',
      color: '#ff4757',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(hpLabel);

    this.hpText = this.scene.add.text(this.hpBarConfig.cx, this.hpBarConfig.cy + 10, '100/100', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(this.hpText);

    const mpLabel = this.scene.add.text(this.mpBarConfig.cx, this.mpBarConfig.cy - 8, 'MP', {
      fontSize: '12px',
      color: '#74b9ff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(mpLabel);

    this.mpText = this.scene.add.text(this.mpBarConfig.cx, this.mpBarConfig.cy + 10, '50/50', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(this.mpText);

    this.waveText = this.scene.add.text(this.scene.scale.width / 2, 25, 'Wave 1', {
      fontSize: '24px',
      color: '#C9A96E',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.waveText);

    this.turnText = this.scene.add.text(this.scene.scale.width / 2, 52, '', {
      fontSize: '13px',
      color: '#C9A96E',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.container.add(this.turnText);

    this.drawArcBar(this.hpBarGraphics, this.hpBarConfig, 1);
    this.drawArcBar(this.mpBarGraphics, this.mpBarConfig, 1);
  }

  private drawArcBar(graphics: Phaser.GameObjects.Graphics, cfg: BarConfig, ratio: number) {
    graphics.clear();

    const { cx, cy, outerRadius, innerRadius, startAngle, totalAngle, anticlockwise } = cfg;
    const endAngle = anticlockwise ? startAngle - totalAngle : startAngle + totalAngle;

    graphics.fillStyle(cfg.bgColor, 1);
    graphics.beginPath();
    graphics.arc(cx, cy, outerRadius, startAngle, endAngle, anticlockwise);
    graphics.arc(cx, cy, innerRadius, endAngle, startAngle, !anticlockwise);
    graphics.closePath();
    graphics.fillPath();

    const safeRatio = Math.max(0, Math.min(1, ratio));
    if (safeRatio > 0.001) {
      const fillEndAngle = anticlockwise
        ? startAngle - totalAngle * safeRatio
        : startAngle + totalAngle * safeRatio;

      graphics.fillStyle(cfg.darkColor, 1);
      graphics.beginPath();
      graphics.arc(cx, cy, outerRadius, startAngle, fillEndAngle, anticlockwise);
      graphics.arc(cx, cy, innerRadius, fillEndAngle, startAngle, !anticlockwise);
      graphics.closePath();
      graphics.fillPath();

      const midRadius = (outerRadius + innerRadius) / 2;
      const glowOuter = midRadius + 3;
      const glowInner = midRadius - 3;

      graphics.fillStyle(cfg.fillColor, 1);
      graphics.beginPath();
      graphics.arc(cx, cy, glowOuter, startAngle, fillEndAngle, anticlockwise);
      graphics.arc(cx, cy, glowInner, fillEndAngle, startAngle, !anticlockwise);
      graphics.closePath();
      graphics.fillPath();

      graphics.fillStyle(cfg.glowColor, 0.5);
      const glowThinOuter = midRadius + 1;
      const glowThinInner = midRadius - 1;
      graphics.beginPath();
      graphics.arc(cx, cy, glowThinOuter, startAngle, fillEndAngle, anticlockwise);
      graphics.arc(cx, cy, glowThinInner, fillEndAngle, startAngle, !anticlockwise);
      graphics.closePath();
      graphics.fillPath();
    }

    graphics.lineStyle(2, 0xC9A96E, 0.5);
    graphics.beginPath();
    graphics.arc(cx, cy, outerRadius, startAngle, endAngle, anticlockwise);
    graphics.strokePath();

    graphics.beginPath();
    graphics.arc(cx, cy, innerRadius, startAngle, endAngle, anticlockwise);
    graphics.strokePath();
  }

  private createWeaponSlot() {
    const x = this.scene.scale.width - 75;
    const y = this.isMobile ? 150 : 175;

    this.weaponSlot = this.scene.add.container(x, y);

    this.weaponSlotBg = createRoundedRectWithStroke(
      this.scene, 0, 0, 70, 70, 8,
      0x1e1e2e, 1,
      0xC9A96E, 1, 2
    );
    this.weaponSlot.add(this.weaponSlotBg);

    this.weaponIcon = this.scene.add.text(0, -6, '', {
      fontSize: '28px',
      align: 'center',
    }).setOrigin(0.5);
    this.weaponSlot.add(this.weaponIcon);

    const label = this.scene.add.text(0, -28, '武器', {
      fontSize: '10px',
      color: '#C9A96E',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.weaponSlot.add(label);

    this.weaponText = this.scene.add.text(0, 20, '空', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);
    this.weaponSlot.add(this.weaponText);

    this.container.add(this.weaponSlot);
  }

  private createButtons() {
    const btnY = this.scene.scale.height - 50;

    this.forgeButton = this.createButton('锻造', this.scene.scale.width / 2 - 75, btnY, () => {
      this.emit(UI_EVENTS.FORGE_REQUESTED);
    });
    this.container.add(this.forgeButton);

    this.resetButton = this.createButton('重置', this.scene.scale.width / 2 + 75, btnY, () => {
      this.emit(UI_EVENTS.RESET_REQUESTED);
    });
    this.container.add(this.resetButton);
  }

  private createButton(label: string, x: number, y: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = createRoundedRect(this.scene, 0, 0, 90, 36, 8, 0xC9A96E, 1);
    container.add(bg);

    const text = this.scene.add.text(0, 0, label, {
      fontSize: '15px',
      color: '#2D1B4E',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(90, 36);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: Phaser.Math.Easing.Power1.Out,
        onComplete: callback,
      });
    });

    return container;
  }

  private createDecorations() {
    if (this.scene.scale.width > 1024) {
      const leftBorder = this.scene.add.graphics();
      leftBorder.fillStyle(0xC9A96E, 0.15);
      leftBorder.fillRect(0, 0, 20, this.scene.scale.height);

      for (let i = 0; i < 8; i++) {
        const symbolY = 60 + i * 80;
        leftBorder.fillStyle(0xC9A96E, 0.3);
        leftBorder.fillCircle(10, symbolY, 6);
      }

      const rightBorder = this.scene.add.graphics();
      rightBorder.fillStyle(0xC9A96E, 0.15);
      rightBorder.fillRect(this.scene.scale.width - 20, 0, 20, this.scene.scale.height);

      for (let i = 0; i < 8; i++) {
        const symbolY = 60 + i * 80;
        rightBorder.fillStyle(0xC9A96E, 0.3);
        rightBorder.fillCircle(this.scene.scale.width - 10, symbolY, 6);
      }

      this.container.add([leftBorder, rightBorder]);
    }
  }

  public updateHpBar(hp: number, maxHp: number) {
    this.targetHpRatio = hp / maxHp;
    this.hpText.setText(`${hp}/${maxHp}`);
  }

  public updateMpBar(mp: number, maxMp: number) {
    this.targetMpRatio = mp / maxMp;
    this.mpText.setText(`${mp}/${maxMp}`);
  }

  public updateWave(wave: number) {
    this.waveText.setText(`Wave ${wave}`);
  }

  public updateTurn(turn: number) {
    this.turnText.setText(`第 ${turn} 回合`);
  }

  public updateWeapon(recipe: WeaponRecipe | null) {
    if (recipe) {
      this.weaponIcon.setText(recipe.symbol);
      this.weaponText.setText(recipe.name);
      this.weaponText.setColor('#ffffff');
      this.weaponText.setFontSize('10px');

      const def = RUNE_DEFINITIONS[recipe.elementType];
      if (this.weaponSlotBg) {
        this.weaponSlotBg.clear();
        this.weaponSlotBg.fillStyle(0x1e1e2e, 1);
        this.weaponSlotBg.fillRoundedRect(-35, -35, 70, 70, 8);
        this.weaponSlotBg.lineStyle(2, def.glowColor, 1);
        this.weaponSlotBg.strokeRoundedRect(-35, -35, 70, 70, 8);
      }
    } else {
      this.weaponIcon.setText('');
      this.weaponText.setText('空');
      this.weaponText.setColor('#888888');
    }
  }

  public showDamageNumber(damage: number, x: number, y: number, color: string = '#ff4757') {
    const text = this.scene.add.text(x, y, `-${damage}`, {
      fontSize: '26px',
      color: color,
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.damageTexts.push(text);

    this.scene.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 800,
      ease: Phaser.Math.Easing.Power2.Out,
      onComplete: () => {
        text.destroy();
        const idx = this.damageTexts.indexOf(text);
        if (idx >= 0) this.damageTexts.splice(idx, 1);
      },
    });
  }

  public showHealNumber(amount: number, x: number, y: number) {
    const text = this.scene.add.text(x, y, `+${amount}`, {
      fontSize: '24px',
      color: '#00b894',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: Phaser.Math.Easing.Power2.Out,
      onComplete: () => text.destroy(),
    });
  }

  public showFloatingText(text: string, x: number, y: number, color: string = '#C9A96E') {
    const floatingText = this.scene.add.text(x, y, text, {
      fontSize: '18px',
      color: color,
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1200,
      ease: Phaser.Math.Easing.Power2.Out,
      onComplete: () => floatingText.destroy(),
    });
  }

  public flashManaInsufficient() {
    const { cx, cy, outerRadius } = this.mpBarConfig;

    const flashGfx = this.scene.add.graphics().setDepth(200);
    const startAngle = this.mpBarConfig.startAngle;
    const totalAngle = this.mpBarConfig.totalAngle;
    const anticlockwise = this.mpBarConfig.anticlockwise;
    const endAngle = anticlockwise ? startAngle - totalAngle : startAngle + totalAngle;
    const innerRadius = this.mpBarConfig.innerRadius;

    flashGfx.fillStyle(0xff0000, 0.4);
    flashGfx.beginPath();
    flashGfx.arc(cx, cy, outerRadius + 2, startAngle, endAngle, anticlockwise);
    flashGfx.arc(cx, cy, innerRadius - 2, endAngle, startAngle, !anticlockwise);
    flashGfx.closePath();
    flashGfx.fillPath();

    this.scene.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 150,
      yoyo: true,
      repeat: 3,
      onComplete: () => flashGfx.destroy(),
    });
  }

  public showGameOver() {
    const overlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0.75
    ).setDepth(300);

    const gameOverText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2 - 30,
      '战斗失败',
      {
        fontSize: '48px',
        color: '#8B0000',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(301);

    const restartText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2 + 40,
      '点击重置按钮重新开始',
      {
        fontSize: '18px',
        color: '#C9A96E',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setDepth(301);
  }

  private update = () => {
    const lerpSpeed = 0.08;

    if (Math.abs(this.currentHpRatio - this.targetHpRatio) > 0.001) {
      this.currentHpRatio += (this.targetHpRatio - this.currentHpRatio) * lerpSpeed;
      this.drawArcBar(this.hpBarGraphics, this.hpBarConfig, this.currentHpRatio);
    }

    if (Math.abs(this.currentMpRatio - this.targetMpRatio) > 0.001) {
      this.currentMpRatio += (this.targetMpRatio - this.currentMpRatio) * lerpSpeed;
      this.drawArcBar(this.mpBarGraphics, this.mpBarConfig, this.currentMpRatio);
    }
  }

  private handleResize = () => {
    this.isMobile = this.detectMobile();
    this.container.removeAll(true);
    this.damageTexts = [];
    this.createPanel();
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
