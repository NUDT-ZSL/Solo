import Phaser from 'phaser';
import { GAME_CONFIG } from './main';
import { TowerType, TOWER_CONFIG, TOWER_COLORS } from './Tower';
import Tower from './Tower';

export interface UIEvents {
  onTowerSelect: (type: TowerType | null) => void;
  onPauseToggle: () => void;
  onUpgrade: () => void;
  onSell: () => void;
  onStartWave: () => void;
}

export default class UI {
  private scene: Phaser.Scene;
  private events: UIEvents;

  private container!: Phaser.GameObjects.Container;
  private topBarBg!: Phaser.GameObjects.Graphics;
  private waveLabel!: Phaser.GameObjects.Text;
  private enemyCountLabel!: Phaser.GameObjects.Text;
  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBarFill!: Phaser.GameObjects.Graphics;
  private energyLabel!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;
  private startWaveBtn!: Phaser.GameObjects.Container;

  private towerPanel!: Phaser.GameObjects.Container;
  private towerButtons: Map<TowerType, Phaser.GameObjects.Container> = new Map();
  private selectedTowerType: TowerType | null = null;

  private towerInfoPanel!: Phaser.GameObjects.Container;
  private selectedTower: Tower | null = null;
  private upgradeBtn!: Phaser.GameObjects.Container;
  private sellBtn!: Phaser.GameObjects.Container;
  private towerInfoLabel!: Phaser.GameObjects.Text;

  private baseWidth: number;
  private baseHeight: number;
  private audioCtx: AudioContext | null = null;

  constructor(scene: Phaser.Scene, events: UIEvents) {
    this.scene = scene;
    this.events = events;
    this.baseWidth = GAME_CONFIG.BASE_WIDTH;
    this.baseHeight = GAME_CONFIG.BASE_HEIGHT;

    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {}

    this.create();
  }

  private create(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    this.createTopBar();
    this.createTowerPanel();
    this.createTowerInfoPanel();
  }

  private createTopBar(): void {
    const h = 60;
    this.topBarBg = this.scene.add.graphics();
    this.topBarBg.fillGradientStyle(0x1a0033, 0x1a0033, 0x2a0044, 0x2a0044, 1);
    this.topBarBg.fillRect(0, 0, this.baseWidth, h);
    this.topBarBg.lineStyle(1, 0x6600aa, 0.6);
    this.topBarBg.lineBetween(0, h, this.baseWidth, h);

    const title = this.scene.add.text(20, h / 2, '星痕守卫', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#cc99ff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.waveLabel = this.scene.add.text(200, h / 2, '波次: 1 / 10', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);

    this.enemyCountLabel = this.scene.add.text(380, h / 2, '怪物: 0 / 0', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffaa66'
    }).setOrigin(0, 0.5);

    this.energyBarBg = this.scene.add.graphics();
    this.energyBarFill = this.scene.add.graphics();
    const barX = 560;
    const barY = 14;
    const barW = 360;
    const barH = 32;
    this.drawEnergyBar(0, barX, barY, barW, barH);

    this.energyLabel = this.scene.add.text(barX + barW / 2, barY + barH / 2, '100 / 500', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.pauseBtn = this.createButton(barX + barW + 30, h / 2, 100, 36, '暂停', 0x442266, 0x8844cc, () => {
      this.playClick();
      this.events.onPauseToggle();
    });

    this.startWaveBtn = this.createButton(this.baseWidth - 130, h / 2, 110, 36, '开始波次', 0x225566, 0x44aacc, () => {
      this.playClick();
      this.events.onStartWave();
    });

    this.container.add([this.topBarBg, title, this.waveLabel, this.enemyCountLabel,
      this.energyBarBg, this.energyBarFill, this.energyLabel, this.pauseBtn, this.startWaveBtn]);
  }

  private drawEnergyBar(ratio: number, x: number, y: number, w: number, h: number): void {
    this.energyBarBg.clear();
    this.energyBarBg.fillStyle(0x0a0018, 1);
    this.energyBarBg.fillRoundedRect(x, y, w, h, 8);
    this.energyBarBg.lineStyle(2, 0x6600aa, 0.8);
    this.energyBarBg.strokeRoundedRect(x, y, w, h, 8);

    this.energyBarFill.clear();
    const fillW = Math.max(2, Math.floor((w - 6) * ratio));
    if (fillW > 2) {
      this.energyBarFill.fillGradientStyle(0x1144cc, 0x1144cc, 0xaa44ff, 0xaa44ff, 1);
      this.energyBarFill.fillRoundedRect(x + 3, y + 3, fillW, h - 6, 6);
      this.energyBarFill.lineStyle(1, 0xffffff, 0.3);
      this.energyBarFill.strokeRoundedRect(x + 3, y + 3, fillW, h - 6, 6);
    }
  }

  private createTowerPanel(): void {
    const panelY = this.baseHeight - 110;
    const panelH = 100;

    const panelBg = this.scene.add.graphics();
    panelBg.fillGradientStyle(0x1a0033, 0x2a0044, 0x1a0033, 0x2a0044, 1);
    panelBg.fillRect(0, panelY, this.baseWidth, panelH);
    panelBg.lineStyle(1, 0x6600aa, 0.6);
    panelBg.lineBetween(0, panelY, this.baseWidth, panelY);

    const types: TowerType[] = ['laser', 'scatter', 'gravity'];
    const names = ['激光炮', '散射塔', '引力塔'];
    const descs = ['持续光束\n单体高伤', '扇形减速\n范围伤害', '吸引敌人\n持续伤害'];
    const btnW = 180;
    const btnH = 80;
    const gap = 24;
    const totalW = types.length * btnW + (types.length - 1) * gap;
    let startX = (this.baseWidth - totalW) / 2;

    this.towerPanel = this.scene.add.container(0, 0);
    this.towerPanel.setDepth(1001);

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const btn = this.scene.add.container(startX + i * (btnW + gap), panelY + 10);
      btn.setSize(btnW, btnH);
      btn.setInteractive({ useHandCursor: true });

      const bg = this.scene.add.graphics();
      const cost = TOWER_CONFIG[type][0].cost;
      const color = TOWER_COLORS[type][0];

      bg.fillStyle(0x0a0018, 1);
      bg.fillRoundedRect(0, 0, btnW, btnH, 10);
      bg.lineStyle(2, color, 0.8);
      bg.strokeRoundedRect(0, 0, btnW, btnH, 10);

      const icon = this.scene.add.graphics();
      this.drawTowerIcon(icon, type, color, 28, 30, 16);

      const nameLabel = this.scene.add.text(60, 14, names[i], {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      });

      const descLabel = this.scene.add.text(60, 36, descs[i], {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#aaaacc',
        align: 'left'
      }).setLineSpacing(2);

      const costLabel = this.scene.add.text(btnW - 10, btnH - 10, `${cost}⚡`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffdd66',
        fontStyle: 'bold'
      }).setOrigin(1, 1);

      btn.add([bg, icon, nameLabel, descLabel, costLabel]);

      btn.on('pointerdown', () => {
        this.playClick();
        this.selectTowerType(type);
      });

      this.towerButtons.set(type, btn);
      this.towerPanel.add(btn);
    }

    const hint = this.scene.add.text(this.baseWidth / 2, panelY + panelH - 8,
      '选择炮塔后点击轨道格点建造 | 右键/ESC 取消', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#886699'
      }).setOrigin(0.5, 1);

    this.container.add([panelBg, this.towerPanel, hint]);
  }

  private drawTowerIcon(g: Phaser.GameObjects.Graphics, type: TowerType, color: number, x: number, y: number, size: number): void {
    g.clear();
    g.fillStyle(0x1a0020, 1);
    if (type === 'laser') {
      g.fillTriangle(x, y - size, x + size, y + size * 0.7, x - size, y + size * 0.7);
      g.lineStyle(2, color, 1);
      g.strokeTriangle(x, y - size, x + size, y + size * 0.7, x - size, y + size * 0.7);
      g.fillStyle(color, 1);
      g.fillCircle(x, y - size * 0.2, size * 0.3);
    } else if (type === 'scatter') {
      const sides = 6;
      g.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(a) * size;
        const py = y + Math.sin(a) * size;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.lineStyle(2, color, 1);
      g.strokePath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        g.fillStyle(color, 1);
        g.fillCircle(x + Math.cos(a) * size * 0.4, y + Math.sin(a) * size * 0.4, size * 0.2);
      }
    } else {
      g.fillCircle(x, y, size);
      g.lineStyle(2, color, 1);
      g.strokeCircle(x, y, size);
      for (let r = size * 0.7; r > 0; r -= size * 0.25) {
        g.lineStyle(1, color, 0.6);
        g.strokeCircle(x, y, r);
      }
      g.fillStyle(color, 1);
      g.fillCircle(x, y, size * 0.2);
    }
  }

  private createTowerInfoPanel(): void {
    this.towerInfoPanel = this.scene.add.container(0, 0);
    this.towerInfoPanel.setDepth(1002);
    this.towerInfoPanel.setVisible(false);

    const panelW = 260;
    const panelH = 160;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0018, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 12);
    bg.lineStyle(2, 0x8844cc, 0.9);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 12);

    this.towerInfoLabel = this.scene.add.text(panelW / 2, 24, '', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    const closeBtn = this.scene.add.text(panelW - 16, 16, '×', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ff6688'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.playClick();
      this.hideTowerInfo();
    });

    this.upgradeBtn = this.createButtonInternal(panelW / 2 - 55, 70, 100, 36, '升级', 0x226644, 0x44cc88, () => {
      this.playClick();
      this.events.onUpgrade();
    });

    this.sellBtn = this.createButtonInternal(panelW / 2 + 55, 70, 100, 36, '出售', 0x662244, 0xcc4488, () => {
      this.playClick();
      this.events.onSell();
    });

    this.towerInfoPanel.add([bg, this.towerInfoLabel, closeBtn, this.upgradeBtn, this.sellBtn]);
    this.container.add(this.towerInfoPanel);
  }

  private createButton(x: number, y: number, w: number, h: number, label: string,
    normalColor: number, hoverColor: number, onClick: () => void): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y - h / 2);
    btn.setSize(w, h);
    btn.setInteractive({ useHandCursor: true });

    const bg = this.scene.add.graphics();
    bg.fillStyle(normalColor, 1);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.lineStyle(2, hoverColor, 0.8);
    bg.strokeRoundedRect(0, 0, w, h, 8);

    const text = this.scene.add.text(w / 2, h / 2, label, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.add([bg, text]);

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(0, 0, w, h, 8);
      bg.lineStyle(2, 0xffffff, 0.8);
      bg.strokeRoundedRect(0, 0, w, h, 8);
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(normalColor, 1);
      bg.fillRoundedRect(0, 0, w, h, 8);
      bg.lineStyle(2, hoverColor, 0.8);
      bg.strokeRoundedRect(0, 0, w, h, 8);
    });
    btn.on('pointerdown', onClick);

    return btn;
  }

  private createButtonInternal(x: number, y: number, w: number, h: number, label: string,
    normalColor: number, hoverColor: number, onClick: () => void): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x - w / 2, y - h / 2);
    btn.setSize(w, h);
    btn.setInteractive({ useHandCursor: true });

    const bg = this.scene.add.graphics();
    bg.fillStyle(normalColor, 1);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.lineStyle(2, hoverColor, 0.8);
    bg.strokeRoundedRect(0, 0, w, h, 8);

    const text = this.scene.add.text(w / 2, h / 2, label, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.add([bg, text]);

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(0, 0, w, h, 8);
      bg.lineStyle(2, 0xffffff, 0.8);
      bg.strokeRoundedRect(0, 0, w, h, 8);
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(normalColor, 1);
      bg.fillRoundedRect(0, 0, w, h, 8);
      bg.lineStyle(2, hoverColor, 0.8);
      bg.strokeRoundedRect(0, 0, w, h, 8);
    });
    btn.on('pointerdown', onClick);

    return btn;
  }

  private selectTowerType(type: TowerType): void {
    if (this.selectedTowerType === type) {
      this.selectedTowerType = null;
    } else {
      this.selectedTowerType = type;
    }
    this.updateTowerButtonStates();
    this.events.onTowerSelect(this.selectedTowerType);
    this.hideTowerInfo();
  }

  private updateTowerButtonStates(): void {
    for (const [type, btn] of this.towerButtons) {
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      const color = TOWER_COLORS[type][0];
      const btnW = 180, btnH = 80;
      bg.clear();
      if (this.selectedTowerType === type) {
        bg.fillStyle(color, 0.35);
        bg.fillRoundedRect(0, 0, btnW, btnH, 10);
        bg.lineStyle(3, 0xffffff, 1);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 10);
      } else {
        bg.fillStyle(0x0a0018, 1);
        bg.fillRoundedRect(0, 0, btnW, btnH, 10);
        bg.lineStyle(2, color, 0.8);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 10);
      }
    }
  }

  public cancelTowerSelect(): void {
    this.selectedTowerType = null;
    this.updateTowerButtonStates();
  }

  public updateEnergy(current: number, max: number): void {
    const barX = 560, barY = 14, barW = 360, barH = 32;
    this.drawEnergyBar(current / max, barX, barY, barW, barH);
    this.energyLabel.setText(`${current} / ${max}`);
  }

  public updateWave(current: number, total: number, inProgress: boolean): void {
    this.waveLabel.setText(`波次: ${current} / ${total}`);
    const btnText = inProgress ? '进行中...' : (current >= total ? '已完成' : '开始波次');
    const text = (this.startWaveBtn.list[1] as Phaser.GameObjects.Text);
    text.setText(btnText);
    this.startWaveBtn.disableInteractive();
    if (!inProgress && current < total) {
      this.startWaveBtn.setInteractive({ useHandCursor: true });
    }
  }

  public updateEnemyCount(current: number, total: number): void {
    this.enemyCountLabel.setText(`怪物: ${current} / ${total}`);
  }

  public showTowerInfo(tower: Tower, canUpgrade: boolean, currentEnergy: number): void {
    this.selectedTower = tower;
    const typeNames: Record<TowerType, string> = { laser: '激光炮', scatter: '散射塔', gravity: '引力塔' };
    const lvText = '★'.repeat(tower.level + 1) + '☆'.repeat(2 - tower.level);
    const statsText = tower.level >= 2 ? '已满级' : `升级: ${tower.stats.upgradeCost}⚡`;
    this.towerInfoLabel.setText(`${typeNames[tower.type]} ${lvText}\n伤害: ${tower.stats.damage || tower.stats.dotDamage} | 射程: ${tower.stats.range}\n出售: ${tower.stats.sellValue}⚡ | ${statsText}`);

    const upgradeText = this.upgradeBtn.list[1] as Phaser.GameObjects.Text;
    const upgradeBg = this.upgradeBtn.list[0] as Phaser.GameObjects.Graphics;
    if (!canUpgrade) {
      upgradeText.setText('已满级');
      upgradeBg.clear();
      upgradeBg.fillStyle(0x444444, 0.8);
      upgradeBg.fillRoundedRect(-50, -18, 100, 36, 8);
      upgradeBg.lineStyle(2, 0x666666, 0.8);
      upgradeBg.strokeRoundedRect(-50, -18, 100, 36, 8);
      this.upgradeBtn.disableInteractive();
    } else if (currentEnergy < tower.stats.upgradeCost) {
      upgradeText.setText(`升级 ${tower.stats.upgradeCost}⚡`);
      upgradeBg.clear();
      upgradeBg.fillStyle(0x664422, 0.8);
      upgradeBg.fillRoundedRect(-50, -18, 100, 36, 8);
      upgradeBg.lineStyle(2, 0x886644, 0.8);
      upgradeBg.strokeRoundedRect(-50, -18, 100, 36, 8);
      this.upgradeBtn.disableInteractive();
    } else {
      upgradeText.setText(`升级 ${tower.stats.upgradeCost}⚡`);
      this.upgradeBtn.setInteractive({ useHandCursor: true });
    }

    (this.sellBtn.list[1] as Phaser.GameObjects.Text).setText(`出售 ${tower.stats.sellValue}⚡`);

    let px = tower.worldX + 40;
    let py = tower.worldY - 140;
    if (px + 260 > this.baseWidth) px = tower.worldX - 300;
    if (py < 70) py = 70;
    if (py + 160 > this.baseHeight - 120) py = this.baseHeight - 280;

    this.towerInfoPanel.setPosition(px, py);
    this.towerInfoPanel.setVisible(true);
  }

  public hideTowerInfo(): void {
    this.selectedTower = null;
    this.towerInfoPanel.setVisible(false);
  }

  public getSelectedTower(): Tower | null {
    return this.selectedTower;
  }

  public getSelectedTowerType(): TowerType | null {
    return this.selectedTowerType;
  }

  private playClick(): void {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch (e) {}
  }

  public setPaused(paused: boolean): void {
    const text = this.pauseBtn.list[1] as Phaser.GameObjects.Text;
    text.setText(paused ? '继续' : '暂停');
  }

  public resize(): void {}

  public destroy(): void {
    this.container.destroy();
  }
}
