import * as Phaser from 'phaser';
import {
  LIGHT_RADIUS,
  GAME_WIDTH,
  GAME_HEIGHT,
  LIGHT_MASK_COLOR
} from '../config/Constants';

export class LightMask {
  private scene: Phaser.Scene;
  private maskGraphics: Phaser.GameObjects.Graphics;
  private lightTexture: Phaser.GameObjects.RenderTexture;
  private lightSprite: Phaser.GameObjects.Sprite;
  private mouseX: number;
  private mouseY: number;
  private vignetteGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mouseX = GAME_WIDTH / 2;
    this.mouseY = GAME_HEIGHT / 2;

    this.generateLightTexture();

    this.lightSprite = this.scene.add.sprite(0, 0, 'light_gradient');
    this.lightSprite.setOrigin(0.5);
    this.lightSprite.setDisplaySize(LIGHT_RADIUS * 2, LIGHT_RADIUS * 2);
    this.lightSprite.setDepth(9999);
    this.lightSprite.setBlendMode(Phaser.BlendModes.MULTIPLY as any);

    this.maskGraphics = this.scene.add.graphics();
    this.maskGraphics.fillStyle(LIGHT_MASK_COLOR, 0.82);
    this.maskGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.maskGraphics.setDepth(9999);
    this.maskGraphics.setAlpha(0.95);

    this.createVignette();

    this.updateLightPosition(this.mouseX, this.mouseY);
  }

  private generateLightTexture(): void {
    if (this.scene.textures.exists('light_gradient')) return;
    const size = LIGHT_RADIUS * 2;
    const canvas = this.scene.textures.createCanvas('light_gradient', size, size);
    const ctx = canvas.getContext();
    const cx = LIGHT_RADIUS;
    const cy = LIGHT_RADIUS;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let alpha: number;
        if (dist > LIGHT_RADIUS) {
          alpha = 0;
        } else if (dist < LIGHT_RADIUS * 0.3) {
          alpha = 255;
        } else {
          const t = (dist - LIGHT_RADIUS * 0.3) / (LIGHT_RADIUS * 0.7);
          alpha = Math.floor(255 * (1 - t * t));
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha / 255})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    canvas.refresh();
  }

  private createVignette(): void {
    this.vignetteGraphics = this.scene.add.graphics();
    this.vignetteGraphics.setDepth(9999);
    const layers = 15;
    for (let i = 0; i < layers; i++) {
      const alpha = (i / layers) * 0.45;
      const inset = i * 4;
      this.vignetteGraphics.lineStyle(4, 0x000000, alpha);
      this.vignetteGraphics.strokeRect(
        inset, inset,
        GAME_WIDTH - inset * 2,
        GAME_HEIGHT - inset * 2
      );
    }
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = Phaser.Math.Clamp(x, 0, GAME_WIDTH);
    this.mouseY = Phaser.Math.Clamp(y, 0, GAME_HEIGHT);
    this.updateLightPosition(this.mouseX, this.mouseY);
  }

  private updateLightPosition(x: number, y: number): void {
    this.lightSprite.setPosition(x, y);
  }

  update(_delta: number): void {
  }

  destroy(): void {
    this.lightSprite.destroy();
    this.maskGraphics.destroy();
    this.vignetteGraphics.destroy();
  }
}
