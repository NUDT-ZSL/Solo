import Phaser from 'phaser';

export interface LightMode {
  hue: number;
  brightness: number;
  name: string;
}

export const LIGHT_MODES: LightMode[] = [
  { hue: 30, brightness: 0.7, name: 'dusk' },
  { hue: 15, brightness: 0.6, name: 'sunset' },
  { hue: 270, brightness: 0.5, name: 'twilight' },
  { hue: 220, brightness: 0.4, name: 'nightfall' },
  { hue: 240, brightness: 0.3, name: 'midnight' }
];

export class LightManager {
  private scene: Phaser.Scene;
  private currentMode: LightMode;
  private targetMode: LightMode | null = null;
  private transitionProgress: number = 0;
  private transitionDuration: number = 1500;
  private isTransitioning: boolean = false;
  private lightColor: Phaser.Display.Color;
  private dustParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private onTransitionComplete?: () => void;
  private modeIndex: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.currentMode = { ...LIGHT_MODES[0] };
    this.lightColor = new Phaser.Display.Color(0, 0, 0);
    this.updateLightColorFromMode(this.currentMode);
    this.createDustParticles();
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  private updateLightColorFromMode(mode: LightMode): void {
    const rgb = this.hslToRgb(mode.hue, 0.5, mode.brightness);
    this.lightColor.setTo(rgb.r, rgb.g, rgb.b);
  }

  private createDustParticles(): void {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(3, 3, 3);
    graphics.generateTexture('dust_particle', 6, 6);
    graphics.destroy();

    this.dustParticles = this.scene.add.particles(0, 0, 'dust_particle', {
      x: { min: 0, max: 800 },
      y: { min: 0, max: 600 },
      lifespan: { min: 3000, max: 6000 },
      speedX: { min: -8, max: 8 },
      speedY: { min: -8, max: 8 },
      scale: { start: 0.5, end: 0.2 },
      alpha: { start: 0.4, end: 0 },
      quantity: 1,
      frequency: 150,
      blendMode: Phaser.BlendModes.ADD
    });
  }

  public update(time: number, delta: number): void {
    if (this.isTransitioning && this.targetMode) {
      this.transitionProgress += delta / this.transitionDuration;

      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentMode = { ...this.targetMode };
        this.isTransitioning = false;
        this.targetMode = null;
        if (this.onTransitionComplete) {
          const cb = this.onTransitionComplete;
          this.onTransitionComplete = undefined;
          cb();
        }
      }

      const t = this.transitionProgress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const startRgb = this.hslToRgb(this.currentMode.hue, 0.5, this.currentMode.brightness);
      const endRgb = this.hslToRgb(this.targetMode!.hue, 0.5, this.targetMode!.brightness);

      const r = Phaser.Math.Linear(startRgb.r, endRgb.r, easeT);
      const g = Phaser.Math.Linear(startRgb.g, endRgb.g, easeT);
      const b = Phaser.Math.Linear(startRgb.b, endRgb.b, easeT);

      this.lightColor.setTo(Math.round(r), Math.round(g), Math.round(b));

      if (this.dustParticles) {
        const alpha = Phaser.Math.Linear(0.6, 0.3, easeT);
        this.dustParticles.setAlpha({ start: alpha, end: 0 } as unknown as number);
      }
    }
  }

  public transitionToNextMode(onComplete?: () => void): void {
    this.modeIndex = (this.modeIndex + 1) % LIGHT_MODES.length;
    this.transitionToMode(LIGHT_MODES[this.modeIndex]!, onComplete);
  }

  public transitionToMode(mode: LightMode, onComplete?: () => void): void {
    this.targetMode = { ...mode };
    this.transitionProgress = 0;
    this.isTransitioning = true;
    this.onTransitionComplete = onComplete;
  }

  public quickReset(duration: number = 300, onComplete?: () => void): void {
    this.modeIndex = 0;
    const startHue = this.currentMode.hue;
    const startBrightness = this.currentMode.brightness;
    const endMode = LIGHT_MODES[0]!;
    const endHue = endMode.hue;
    const endBrightness = endMode.brightness;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: duration,
      onUpdate: (tween) => {
        const t: number = tween.getValue() as number;
        const h = Phaser.Math.Linear(startHue, endHue, t);
        const b = Phaser.Math.Linear(startBrightness, endBrightness, t);
        const rgb = this.hslToRgb(h, 0.5, b);
        this.lightColor.setTo(rgb.r, rgb.g, rgb.b);
      },
      onComplete: () => {
        this.currentMode = { ...LIGHT_MODES[0]! };
        this.targetMode = null;
        this.isTransitioning = false;
        if (onComplete) onComplete();
      }
    });
  }

  public getLightColor(): Phaser.Display.Color {
    return this.lightColor;
  }

  public getCurrentMode(): LightMode {
    return { ...this.currentMode };
  }

  public getBrightness(): number {
    return this.currentMode.brightness;
  }

  public getHue(): number {
    return this.currentMode.hue;
  }

  public isInTransition(): boolean {
    return this.isTransitioning;
  }

  public destroy(): void {
    if (this.dustParticles) {
      this.dustParticles.stop();
      this.dustParticles.destroy();
      this.dustParticles = null;
    }
  }
}
