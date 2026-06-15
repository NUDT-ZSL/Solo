import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  DEFAULT_BOARD_SIZE,
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE,
  DEFAULT_FLUCTUATION_SPEED,
  MIN_FLUCTUATION_SPEED,
  MAX_FLUCTUATION_SPEED,
  COLORS,
  ANIMATION,
  SCENES,
} from '../utils/constants';

interface SliderConfig {
  x: number;
  y: number;
  width: number;
  min: number;
  max: number;
  step: number;
  current: number;
  label: string;
  eventName: string;
  formatValue: (v: number) => string;
}

class QuantumSlider {
  private scene: Phaser.Scene;
  private config: SliderConfig;
  private track!: Phaser.GameObjects.Graphics;
  private handle!: Phaser.GameObjects.Graphics;
  private valueText!: Phaser.GameObjects.Text;
  private label!: Phaser.GameObjects.Text;
  private isDragging: boolean = false;
  private value: number;

  constructor(scene: Phaser.Scene, config: SliderConfig) {
    this.scene = scene;
    this.config = config;
    this.value = config.current;

    this.label = scene.add.text(config.x, config.y - 18, config.label, {
      fontSize: '13px',
      fontFamily: 'Consolas, monospace',
      color: '#aaaacc',
    });

    this.track = scene.add.graphics();
    this.drawTrack();

    this.handle = scene.add.graphics();
    this.drawHandle();

    this.valueText = scene.add.text(
      config.x + config.width + 12,
      config.y + 4,
      config.formatValue(this.value),
      {
        fontSize: '13px',
        fontFamily: 'Consolas, monospace',
        color: '#eeeeff',
      }
    ).setOrigin(0, 0.5);

    const hitArea = scene.add.rectangle(
      config.x + config.width / 2,
      config.y,
      config.width + 20,
      28
    );
    hitArea.setInteractive({ draggable: true });
    hitArea.setAlpha(0);

    scene.input.setDraggable(hitArea);

    hitArea.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, config.x, config.x + config.width);
      const ratio = (clampedX - config.x) / config.width;
      const rawValue = config.min + ratio * (config.max - config.min);
      const stepped = Math.round(rawValue / config.step) * config.step;
      this.value = Phaser.Math.Clamp(stepped, config.min, config.max);
      this.drawHandle();
      this.valueText.setText(config.formatValue(this.value));
      this.scene.game.events.emit(config.eventName, this.value);
    });
  }

  private getHandleX(): number {
    const ratio = (this.value - this.config.min) / (this.config.max - this.config.min);
    return this.config.x + ratio * this.config.width;
  }

  private drawTrack() {
    this.track.clear();
    this.track.fillStyle(0x332255, 0.6);
    this.track.fillRoundedRect(this.config.x, this.config.y - 2, this.config.width, 4, 2);
    this.track.fillStyle(0x6622cc, 0.5);
    const handleX = this.getHandleX();
    this.track.fillRoundedRect(this.config.x, this.config.y - 2, handleX - this.config.x, 4, 2);
  }

  private drawHandle() {
    const handleX = this.getHandleX();
    this.handle.clear();
    this.handle.fillStyle(0x8844ff, 0.9);
    this.handle.fillCircle(handleX, this.config.y, 8);
    this.handle.fillStyle(0xbb88ff, 0.6);
    this.handle.fillCircle(handleX, this.config.y, 5);
    this.drawTrack();
  }

  destroy() {
    this.track.destroy();
    this.handle.destroy();
    this.valueText.destroy();
    this.label.destroy();
  }
}

export class UIControlPanel extends Phaser.Scene {
  private panelContainer!: Phaser.GameObjects.Container;
  private sliders: QuantumSlider[] = [];

  constructor() {
    super({ key: SCENES.UI });
  }

  create() {
    const pw = 240;
    const ph = 170;
    const px = GAME_WIDTH - pw - 20;
    const py = GAME_HEIGHT - ph - 20;

    this.panelContainer = this.add.container(0, 0).setDepth(500);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.panelBg, 0.75);
    panelBg.fillRoundedRect(px, py, pw, ph, 12);
    panelBg.lineStyle(1, COLORS.panelBorder, 0.6);
    panelBg.strokeRoundedRect(px, py, pw, ph, 12);

    const innerGlow = this.add.graphics();
    innerGlow.lineStyle(1, 0x6622cc, 0.15);
    innerGlow.strokeRoundedRect(px + 3, py + 3, pw - 6, ph - 6, 10);

    this.panelContainer.add([panelBg, innerGlow]);

    const title = this.add.text(px + pw / 2, py + 18, '⚛ 控制面板', {
      fontSize: '15px',
      fontFamily: 'Consolas, monospace',
      color: '#bbbbdd',
    }).setOrigin(0.5);
    this.panelContainer.add(title);

    const boardSlider = new QuantumSlider(this, {
      x: px + 20,
      y: py + 58,
      width: pw - 70,
      min: MIN_BOARD_SIZE,
      max: MAX_BOARD_SIZE,
      step: 1,
      current: DEFAULT_BOARD_SIZE,
      label: '棋盘大小',
      eventName: 'board-size-changed',
      formatValue: (v: number) => `${v}×${v}`,
    });
    this.sliders.push(boardSlider);

    const speedSlider = new QuantumSlider(this, {
      x: px + 20,
      y: py + 100,
      width: pw - 70,
      min: MIN_FLUCTUATION_SPEED,
      max: MAX_FLUCTUATION_SPEED,
      step: 0.1,
      current: DEFAULT_FLUCTUATION_SPEED,
      label: '涨落速度',
      eventName: 'fluctuation-speed-changed',
      formatValue: (v: number) => v.toFixed(1) + 'x',
    });
    this.sliders.push(speedSlider);

    const resetBtn = this.add.text(px + pw / 2, py + 142, '↻ 重置', {
      fontSize: '15px',
      fontFamily: 'Consolas, monospace',
      color: '#8844ff',
      backgroundColor: '#1a003088',
      padding: { x: 16, y: 4 },
    }).setOrigin(0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerover', () => {
      resetBtn.setColor('#bb88ff');
      resetBtn.setBackgroundColor('#2a005088');
    });
    resetBtn.on('pointerout', () => {
      resetBtn.setColor('#8844ff');
      resetBtn.setBackgroundColor('#1a003088');
    });
    resetBtn.on('pointerdown', () => {
      this.game.events.emit('reset-game');
    });
    this.panelContainer.add(resetBtn);

    this.cameras.main.fadeIn(ANIMATION.fadeInDuration, 10, 0, 16);
  }
}
