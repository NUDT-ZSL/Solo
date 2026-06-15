import Phaser from 'phaser';
import { GameSettings, DEFAULT_SETTINGS, BeatWindow } from '../types/gameTypes';

export class SettingsScene extends Phaser.Scene {
  private settings: GameSettings;

  private volumeSlider!: Phaser.GameObjects.Graphics;
  private volumeHandle!: Phaser.GameObjects.Graphics;
  private volumeValueText!: Phaser.GameObjects.Text;

  private speedSlider!: Phaser.GameObjects.Graphics;
  private speedHandle!: Phaser.GameObjects.Graphics;
  private speedValueText!: Phaser.GameObjects.Text;

  private sensitivityButtons: Phaser.GameObjects.Container[] = [];

  private isDraggingVolume: boolean = false;
  private isDraggingSpeed: boolean = false;

  constructor() {
    super('SettingsScene');
    this.settings = { ...DEFAULT_SETTINGS };
  }

  init(data: { settings?: GameSettings }): void {
    if (data.settings) {
      this.settings = { ...data.settings };
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const isMobile = width < 768;

    this.cameras.main.setBackgroundColor('#1A0A2E');

    this.createGlassBackground();

    const titleY = isMobile ? 50 : 80;
    this.add.text(width / 2, titleY, '游戏设置', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '20px' : '28px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2
    }).setOrigin(0.5);

    const panelX = width / 2;
    const panelY = isMobile ? 120 : 160;
    const panelWidth = isMobile ? width - 60 : 500;
    const panelHeight = isMobile ? 400 : 450;

    const panel = this.add.graphics();
    panel.fillStyle(0x1A0A2E, 0.7);
    panel.fillRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    panel.lineStyle(2, 0x00FFFF, 0.5);
    panel.strokeRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);

    let currentY = panelY + 50;

    this.createVolumeSlider(panelX, currentY, panelWidth - 80);
    currentY += isMobile ? 100 : 120;

    this.createSpeedSlider(panelX, currentY, panelWidth - 80);
    currentY += isMobile ? 100 : 120;

    this.createSensitivitySelector(panelX, currentY, panelWidth - 80);

    const backBtnY = panelY + panelHeight - 50;
    const backBtn = this.createNeonButton(panelX, backBtnY, isMobile ? 150 : 200, isMobile ? 45 : 50, '返回', 0xFF00FF);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.buttonPressEffect(backBtn);
      this.time.delayedCall(200, () => {
        this.scene.start('MenuScene', { settings: this.settings });
      });
    });

    this.setupSliderInput(panelWidth);
  }

  private createGlassBackground(): void {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x0A051A, 0.95);
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 8);
      const color = Math.random() > 0.5 ? 0x00FFFF : 0xFF00FF;

      bg.fillStyle(color, 0.1);
      bg.fillCircle(x, y, size);

      this.tweens.add({
        targets: { x, y },
        x: x + Phaser.Math.Between(-50, 50),
        y: y + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }
  }

  private createVolumeSlider(x: number, y: number, width: number): void {
    const isMobile = this.scale.width < 768;

    this.add.text(x - width / 2, y - 20, '音乐音量', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5);

    this.volumeValueText = this.add.text(x + width / 2, y - 20, `${this.settings.musicVolume}%`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#00FFFF'
    }).setOrigin(1, 0.5);

    this.volumeSlider = this.add.graphics();
    this.volumeSlider.fillStyle(0x2A1A4E, 1);
    this.volumeSlider.fillRoundedRect(x - width / 2, y + 10, width, 8, 4);

    const fillWidth = (this.settings.musicVolume / 100) * width;
    this.volumeSlider.fillGradientStyle(
      0x00FFFF, 0xFF00FF,
      0x00FFFF, 0xFF00FF,
      1, 1, 1, 1
    );
    this.volumeSlider.fillRoundedRect(x - width / 2, y + 10, fillWidth, 8, 4);

    this.volumeHandle = this.add.graphics();
    const handleX = x - width / 2 + fillWidth;
    this.volumeHandle.fillStyle(0xFFFFFF, 1);
    this.volumeHandle.fillCircle(handleX, y + 14, 12);
    this.volumeHandle.fillStyle(0x00FFFF, 1);
    this.volumeHandle.fillCircle(handleX, y + 14, 8);
  }

  private createSpeedSlider(x: number, y: number, width: number): void {
    const isMobile = this.scale.width < 768;

    this.add.text(x - width / 2, y - 20, '赛道速度', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5);

    const speedDisplay = this.settings.scrollSpeed.toFixed(1) + 'x';
    this.speedValueText = this.add.text(x + width / 2, y - 20, speedDisplay, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FF00FF'
    }).setOrigin(1, 0.5);

    this.speedSlider = this.add.graphics();
    this.speedSlider.fillStyle(0x2A1A4E, 1);
    this.speedSlider.fillRoundedRect(x - width / 2, y + 10, width, 8, 4);

    const fillWidth = ((this.settings.scrollSpeed - 0.5) / 1.5) * width;
    this.speedSlider.fillGradientStyle(
      0x00FF00, 0xFF6600,
      0x00FF00, 0xFF6600,
      1, 1, 1, 1
    );
    this.speedSlider.fillRoundedRect(x - width / 2, y + 10, fillWidth, 8, 4);

    this.speedHandle = this.add.graphics();
    const handleX = x - width / 2 + fillWidth;
    this.speedHandle.fillStyle(0xFFFFFF, 1);
    this.speedHandle.fillCircle(handleX, y + 14, 12);
    this.speedHandle.fillStyle(0xFF00FF, 1);
    this.speedHandle.fillCircle(handleX, y + 14, 8);
  }

  private createSensitivitySelector(x: number, y: number, width: number): void {
    const isMobile = this.scale.width < 768;

    this.add.text(x - width / 2, y - 20, '跳跃灵敏度', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5);

    const sensitivities: { value: BeatWindow; label: string }[] = [
      { value: 'loose', label: '宽松' },
      { value: 'standard', label: '标准' },
      { value: 'strict', label: '严格' }
    ];

    const btnWidth = (width - 20) / 3;
    const btnHeight = isMobile ? 40 : 50;
    const startX = x - width / 2 + btnWidth / 2;

    this.sensitivityButtons = [];

    sensitivities.forEach((sens, i) => {
      const btnX = startX + i * (btnWidth + 10);
      const isSelected = this.settings.jumpSensitivity === sens.value;

      const btn = this.createSensitivityButton(
        btnX,
        y + 20,
        btnWidth,
        btnHeight,
        sens.label,
        isSelected,
        sens.value
      );

      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.buttonPressEffect(btn);
        this.settings.jumpSensitivity = sens.value;
        this.updateSensitivityButtons();
      });

      this.sensitivityButtons.push(btn);
    });
  }

  private createSensitivityButton(
    x: number, y: number, w: number, h: number, text: string, selected: boolean, value: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setData('value', value);

    const color = selected ? 0x00FFFF : 0x444444;
    const bgAlpha = selected ? 0.8 : 0.5;

    const bg = this.add.rectangle(0, 0, w, h, 0x1A0A2E, bgAlpha)
      .setStrokeStyle(2, color, 1);

    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: h * 0.3,
      color: selected ? '#00FFFF' : '#888888'
    }).setOrigin(0.5);

    container.add([bg, label]);

    return container;
  }

  private updateSensitivityButtons(): void {
    this.sensitivityButtons.forEach(btn => {
      const value = btn.getData('value') as BeatWindow;
      const isSelected = this.settings.jumpSensitivity === value;

      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
      const label = btn.getAt(1) as Phaser.GameObjects.Text;

      const color = isSelected ? 0x00FFFF : 0x444444;
      bg.setStrokeStyle(2, color, 1);
      bg.setAlpha(isSelected ? 0.8 : 0.5);
      label.setColor(isSelected ? '#00FFFF' : '#888888');
    });
  }

  private setupSliderInput(panelWidth: number): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isOnSlider(pointer, 'volume')) {
        this.isDraggingVolume = true;
        this.updateVolumeFromPointer(pointer);
      } else if (this.isOnSlider(pointer, 'speed')) {
        this.isDraggingSpeed = true;
        this.updateSpeedFromPointer(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingVolume) {
        this.updateVolumeFromPointer(pointer);
      } else if (this.isDraggingSpeed) {
        this.updateSpeedFromPointer(pointer);
      }
    });

    this.input.on('pointerup', () => {
      this.isDraggingVolume = false;
      this.isDraggingSpeed = false;
    });
  }

  private isOnSlider(pointer: Phaser.Input.Pointer, type: 'volume' | 'speed'): boolean {
    const width = this.scale.width;
    const isMobile = width < 768;
    const panelWidth = isMobile ? width - 60 : 500;
    const panelX = width / 2;
    const panelY = isMobile ? 120 : 160;

    const sliderWidth = panelWidth - 80;
    const sliderX = panelX - sliderWidth / 2;
    const sliderY = type === 'volume' ? panelY + 60 : panelY + 180;

    return pointer.x >= sliderX - 20 &&
           pointer.x <= sliderX + sliderWidth + 20 &&
           pointer.y >= sliderY - 20 &&
           pointer.y <= sliderY + 30;
  }

  private updateVolumeFromPointer(pointer: Phaser.Input.Pointer): void {
    const width = this.scale.width;
    const isMobile = width < 768;
    const panelWidth = isMobile ? width - 60 : 500;
    const sliderWidth = panelWidth - 80;
    const sliderX = this.scale.width / 2 - sliderWidth / 2;

    let value = (pointer.x - sliderX) / sliderWidth;
    value = Phaser.Math.Clamp(value, 0, 1);
    this.settings.musicVolume = Math.round(value * 100);

    this.updateVolumeSlider();
  }

  private updateVolumeSlider(): void {
    const width = this.scale.width;
    const isMobile = width < 768;
    const panelWidth = isMobile ? width - 60 : 500;
    const sliderWidth = panelWidth - 80;
    const panelX = width / 2;
    const panelY = isMobile ? 120 : 160;
    const sliderY = panelY + 60;

    this.volumeValueText.setText(`${this.settings.musicVolume}%`);

    const fillWidth = (this.settings.musicVolume / 100) * sliderWidth;
    const handleX = panelX - sliderWidth / 2 + fillWidth;

    this.volumeSlider.clear();
    this.volumeSlider.fillStyle(0x2A1A4E, 1);
    this.volumeSlider.fillRoundedRect(panelX - sliderWidth / 2, sliderY + 10, sliderWidth, 8, 4);

    this.volumeSlider.fillGradientStyle(
      0x00FFFF, 0xFF00FF,
      0x00FFFF, 0xFF00FF,
      1, 1, 1, 1
    );
    this.volumeSlider.fillRoundedRect(panelX - sliderWidth / 2, sliderY + 10, fillWidth, 8, 4);

    this.volumeHandle.clear();
    this.volumeHandle.fillStyle(0xFFFFFF, 1);
    this.volumeHandle.fillCircle(handleX, sliderY + 14, 12);
    this.volumeHandle.fillStyle(0x00FFFF, 1);
    this.volumeHandle.fillCircle(handleX, sliderY + 14, 8);
  }

  private updateSpeedFromPointer(pointer: Phaser.Input.Pointer): void {
    const width = this.scale.width;
    const isMobile = width < 768;
    const panelWidth = isMobile ? width - 60 : 500;
    const sliderWidth = panelWidth - 80;
    const sliderX = width / 2 - sliderWidth / 2;

    let value = (pointer.x - sliderX) / sliderWidth;
    value = Phaser.Math.Clamp(value, 0, 1);
    this.settings.scrollSpeed = 0.5 + value * 1.5;
    this.settings.scrollSpeed = Math.round(this.settings.scrollSpeed * 10) / 10;

    this.updateSpeedSlider();
  }

  private updateSpeedSlider(): void {
    const width = this.scale.width;
    const isMobile = width < 768;
    const panelWidth = isMobile ? width - 60 : 500;
    const sliderWidth = panelWidth - 80;
    const panelX = width / 2;
    const panelY = isMobile ? 120 : 160;
    const sliderY = panelY + 180;

    const speedDisplay = this.settings.scrollSpeed.toFixed(1) + 'x';
    this.speedValueText.setText(speedDisplay);

    const fillRatio = (this.settings.scrollSpeed - 0.5) / 1.5;
    const fillWidth = fillRatio * sliderWidth;
    const handleX = panelX - sliderWidth / 2 + fillWidth;

    this.speedSlider.clear();
    this.speedSlider.fillStyle(0x2A1A4E, 1);
    this.speedSlider.fillRoundedRect(panelX - sliderWidth / 2, sliderY + 10, sliderWidth, 8, 4);

    this.speedSlider.fillGradientStyle(
      0x00FF00, 0xFF6600,
      0x00FF00, 0xFF6600,
      1, 1, 1, 1
    );
    this.speedSlider.fillRoundedRect(panelX - sliderWidth / 2, sliderY + 10, fillWidth, 8, 4);

    this.speedHandle.clear();
    this.speedHandle.fillStyle(0xFFFFFF, 1);
    this.speedHandle.fillCircle(handleX, sliderY + 14, 12);
    this.speedHandle.fillStyle(0xFF00FF, 1);
    this.speedHandle.fillCircle(handleX, sliderY + 14, 8);
  }

  private createNeonButton(x: number, y: number, w: number, h: number, text: string, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x1A0A2E, 0.8)
      .setStrokeStyle(2, color, 1);

    const glow = this.add.rectangle(0, 0, w + 4, h + 4, color, 0.2);

    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: h * 0.35,
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);

    container.add([glow, bg, label]);

    return container;
  }

  private buttonPressEffect(button: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: button,
      scale: { from: 1, to: 0.95 },
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }
}
