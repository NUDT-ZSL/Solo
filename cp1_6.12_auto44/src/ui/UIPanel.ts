import Phaser from 'phaser';
import { RuneElement, RUNE_DEFINITIONS, WeaponRecipe, UpgradedRune, getRuneColor } from '../game/RuneData';
import { BattleManager, PlayerState } from '../battle/BattleManager';
import { createRoundedRect, createRoundedRectWithStroke } from '../game/GraphicsUtil';

export interface UIPanelEvents {
  onForgeRequested: () => void;
  onResetRequested: () => void;
}

interface BarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: number;
  fillColor: number;
  glowColor: number;
}

export class UIPanel {
  private scene: Phaser.Scene;
  private events: UIPanelEvents;
  private container: Phaser.GameObjects.Container;

  private hpBarGraphics!: Phaser.GameObjects.Graphics;
  private mpBarGraphics!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
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

  constructor(scene: Phaser.Scene, events: UIPanelEvents) {
    this.scene = scene;
    this.events = events;
    this.container = this.scene.add.container(0, 0).setDepth(100);
    this.createPanel();
    this.scene.events.on('update', this.update, this);
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private createPanel() {
    this.createTopBar();
    this.createWeaponSlot();
    this.createButtons();
    this.createDecorations();
  }

  private createTopBar() {
    const isMobile = this.scene.scale.width < 768;
    const barWidth = isMobile ? this.scene.scale.width * 0.9 : this.scene.scale.width * 0.6;
    const barHeight = 18;
    const centerX = this.scene.scale.width / 2;
    const startY = 50;

    this.hpBarConfig = {
      x: centerX - barWidth / 2,
      y: startY,
      width: barWidth,
      height: barHeight,
      bgColor: 0x1a1a2e,
      fillColor: 0x8b0000,
      glowColor: 0xff4757,
    };

    this.mpBarConfig = {
      x: centerX - barWidth / 2,
      y: startY + barHeight + 10,
      width: barWidth,
      height: barHeight,
      bgColor: 0x1a1a2e,
      fillColor: 0x0984e3,
      glowColor: 0x74b9ff,
    };

    this.hpBarGraphics = this.scene.add.graphics();
    this.mpBarGraphics = this.scene.add.graphics();
    this.container.add([this.hpBarGraphics, this.mpBarGraphics]);

    const hpLabel = this.scene.add.text(this.hpBarConfig.x - 50, this.hpBarConfig.y + 2, 'HP', {
      fontSize: '14px',
      color: '#ff4757',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.container.add(hpLabel);

    this.hpText = this.scene.add.text(
      this.hpBarConfig.x + this.hpBarConfig.width + 8,
      this.hpBarConfig.y + 2,
      '100/100',
      { fontSize: '12px', color: '#ffffff', fontFamily: 'Arial' }
    );
    this.container.add(this.hpText);

    const mpLabel = this.scene.add.text(this.mpBarConfig.x - 50, this.mpBarConfig.y + 2, 'MP', {
      fontSize: '14px',
      color: '#74b9ff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.container.add(mpLabel);

    this.mpText = this.scene.add.text(
      this.mpBarConfig.x + this.mpBarConfig.width + 8,
      this.mpBarConfig.y + 2,
      '50/50',
      { fontSize: '12px', color: '#ffffff', fontFamily: 'Arial' }
    );
    this.container.add(this.mpText);

    this.waveText = this.scene.add.text(centerX, 15, 'Wave 1', {
      fontSize: '20px',
      color: '#C9A96E',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.waveText);

    this.turnText = this.scene.add.text(centerX, 35, '', {
      fontSize: '12px',
      color: '#8B0000',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.container.add(this.turnText);

    this.drawHpBar(1);
    this.drawMpBar(1);
  }

  private drawHpBar(ratio: number) {
    this.hpBarGraphics.clear();
    const cfg = this.hpBarConfig;

    this.hpBarGraphics.fillStyle(cfg.bgColor, 1);
    this.hpBarGraphics.fillRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, 9);

    const fillWidth = cfg.width * Math.max(0, Math.min(1, ratio));
    if (fillWidth > 0) {
      this.hpBarGraphics.fillStyle(cfg.fillColor, 1);
      this.hpBarGraphics.fillRoundedRect(cfg.x, cfg.y, fillWidth, cfg.height, 9);

      this.hpBarGraphics.fillStyle(cfg.glowColor, 0.5);
      if (fillWidth > 0 && cfg.height / 2 > 0) {
        this.hpBarGraphics.fillRoundedRect(cfg.x, cfg.y, fillWidth, cfg.height / 2, 4);
      }
    }
  }

  private drawMpBar(ratio: number) {
    this.mpBarGraphics.clear();
    const cfg = this.mpBarConfig;

    this.mpBarGraphics.fillStyle(cfg.bgColor, 1);
    this.mpBarGraphics.fillRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, 9);

    const fillWidth = cfg.width * Math.max(0, Math.min(1, ratio));
    if (fillWidth > 0) {
      this.mpBarGraphics.fillStyle(cfg.fillColor, 1);
      this.mpBarGraphics.fillRoundedRect(cfg.x, cfg.y, fillWidth, cfg.height, 9);

      this.mpBarGraphics.fillStyle(cfg.glowColor, 0.5);
      if (fillWidth > 0 && cfg.height / 2 > 0) {
        this.mpBarGraphics.fillRoundedRect(cfg.x, cfg.y, fillWidth, cfg.height / 2, 4);
      }
    }
  }

  private createWeaponSlot() {
    const x = this.scene.scale.width - 100;
    const y = 90;

    this.weaponSlot = this.scene.add.container(x, y);

    this.weaponSlotBg = createRoundedRectWithStroke(
      this.scene, 0, 0, 80, 80, 8,
      0x1e1e2e, 1,
      0xC9A96E, 1, 2
    );
    this.weaponSlot.add(this.weaponSlotBg);

    const label = this.scene.add.text(0, -24, '武器', {
      fontSize: '10px',
      color: '#C9A96E',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.weaponSlot.add(label);

    this.weaponText = this.scene.add.text(0, 0, '空', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);
    this.weaponSlot.add(this.weaponText);

    this.container.add(this.weaponSlot);
  }

  private createButtons() {
    const btnY = this.scene.scale.height - 40;

    this.forgeButton = this.createButton('锻造', this.scene.scale.width / 2 - 70, btnY, () => {
      this.events.onForgeRequested();
    });
    this.container.add(this.forgeButton);

    this.resetButton = this.createButton('重置', this.scene.scale.width / 2 + 70, btnY, () => {
      this.events.onResetRequested();
    });
    this.container.add(this.resetButton);
  }

  private createButton(label: string, x: number, y: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = createRoundedRect(this.scene, 0, 0, 80, 32, 6, 0xC9A96E, 1);
    container.add(bg);

    const text = this.scene.add.text(0, 0, label, {
      fontSize: '14px',
      color: '#2D1B4E',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(80, 32);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
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
    this.turnText.setText(`回合 ${turn}`);
  }

  public updateWeapon(recipe: WeaponRecipe | null) {
    if (recipe) {
      this.weaponText.setText(recipe.name.charAt(0));
      this.weaponText.setColor('#ffffff');
      this.weaponText.setFontSize('20px');

      const def = RUNE_DEFINITIONS[recipe.elementType];
      if (this.weaponSlotBg) {
        this.weaponSlotBg.clear();
        this.weaponSlotBg.fillStyle(0x1e1e2e, 1);
        this.weaponSlotBg.fillRoundedRect(-40, -40, 80, 80, 8);
        this.weaponSlotBg.lineStyle(2, def.glowColor, 1);
        this.weaponSlotBg.strokeRoundedRect(-40, -40, 80, 80, 8);
      }
    } else {
      this.weaponText.setText('空');
      this.weaponText.setColor('#888888');
      this.weaponText.setFontSize('14px');
    }
  }

  public showDamageNumber(damage: number, x: number, y: number, color: string = '#ff4757') {
    const text = this.scene.add.text(x, y, `-${damage}`, {
      fontSize: '24px',
      color: color,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    this.damageTexts.push(text);

    this.scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
        const idx = this.damageTexts.indexOf(text);
        if (idx >= 0) this.damageTexts.splice(idx, 1);
      },
    });
  }

  public showHealNumber(amount: number, x: number, y: number) {
    this.showDamageNumber(-amount, x, y, '#00b894');
  }

  public showFloatingText(text: string, x: number, y: number, color: string = '#C9A96E') {
    const floatingText = this.scene.add.text(x, y, text, {
      fontSize: '18px',
      color: color,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: floatingText,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => floatingText.destroy(),
    });
  }

  public flashManaInsufficient() {
    const flash = this.scene.add.rectangle(
      this.mpBarConfig.x + this.mpBarConfig.width / 2,
      this.mpBarConfig.y + this.mpBarConfig.height / 2,
      this.mpBarConfig.width,
      this.mpBarConfig.height,
      0xff0000,
      0.5
    ).setDepth(200);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => flash.destroy(),
    });
  }

  public showGameOver() {
    const overlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0.7
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
      }
    ).setOrigin(0.5).setDepth(301);
  }

  private update() {
    const lerpSpeed = 0.08;

    if (Math.abs(this.currentHpRatio - this.targetHpRatio) > 0.001) {
      this.currentHpRatio += (this.targetHpRatio - this.currentHpRatio) * lerpSpeed;
      this.drawHpBar(this.currentHpRatio);
    }

    if (Math.abs(this.currentMpRatio - this.targetMpRatio) > 0.001) {
      this.currentMpRatio += (this.targetMpRatio - this.currentMpRatio) * lerpSpeed;
      this.drawMpBar(this.currentMpRatio);
    }
  }

  private handleResize() {
    this.container.removeAll(true);
    this.damageTexts = [];
    this.createPanel();
  }
}
