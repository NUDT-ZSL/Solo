import Phaser from 'phaser';

const PITCH_MAP: Record<number, number> = {
  0: 261.63,
  1: 293.66,
  2: 329.63,
  3: 349.23,
  4: 392.00,
  5: 440.00,
  6: 493.88
};

const PITCH_NAMES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];

export class ResonancePoint extends Phaser.GameObjects.Container {
  public isLit: boolean = false;
  private core: Phaser.GameObjects.Arc;
  private aura: Phaser.GameObjects.Arc;
  private rotationTween?: Phaser.Tweens.Tween;
  private pulseTween?: Phaser.Tweens.Tween;
  private ringParticles: Phaser.GameObjects.Particles.ParticleEmitter;
  private colorPalette: number[];
  private baseColor: number;
  private pitchIndex: number;
  private litRing?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setSize(40, 40);

    const paletteRoll = Phaser.Math.Between(0, 1);
    if (paletteRoll === 0) {
      this.colorPalette = [0xffe066, 0xffb347, 0xff8c42, 0xff6b35];
      this.baseColor = 0xffc857;
    } else {
      this.colorPalette = [0x8a7cff, 0xb86bff, 0xe06bff, 0xff6bd8];
      this.baseColor = 0xa872ff;
    }
    this.pitchIndex = Phaser.Math.Between(0, 6);

    this.aura = scene.add.circle(0, 0, 32, this.baseColor, 0.12);
    this.core = scene.add.circle(0, 0, 12, this.baseColor, 0.45);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const orb = scene.add.circle(
        Math.cos(angle) * 20,
        Math.sin(angle) * 20,
        3,
        Phaser.Utils.Array.GetRandom(this.colorPalette),
        0.85
      );
      orb.setData('angle', angle);
      orb.setData('radius', 20);
      this.add(orb);
    }

    this.add([this.aura, this.core]);

    this.ringParticles = scene.add.particles(0, 0, '', {
      lifespan: 800,
      speed: { min: 80, max: 240 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      tint: this.colorPalette
    });
    this.ringParticles.stop();

    this.startIdleAnimations();
  }

  private startIdleAnimations(): void {
    this.rotationTween = this.scene.tweens.add({
      targets: this,
      rotation: Math.PI * 2,
      duration: 6000,
      ease: 'Linear',
      repeat: -1
    });

    this.scene.tweens.add({
      targets: this.core,
      scale: { from: 0.85, to: 1.2 },
      alpha: { from: 0.3, to: 0.6 },
      duration: 2000,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true
    });

    this.scene.tweens.add({
      targets: this.aura,
      scale: { from: 0.9, to: 1.25 },
      alpha: { from: 0.08, to: 0.2 },
      duration: 2200,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true
    });
  }

  public tryActivate(player: Phaser.GameObjects.GameObject): boolean {
    if (this.isLit) return false;
    const p = player as any;
    const px = p.x ?? 0;
    const py = p.y ?? 0;
    const dist = Phaser.Math.Distance.Between(px, py, this.x, this.y);
    if (dist > 60) return false;
    this.activate();
    return true;
  }

  private activate(): void {
    this.isLit = true;
    this.rotationTween?.stop();

    this.core.setFillStyle(this.colorPalette[0], 0.95);
    this.aura.setFillStyle(this.colorPalette[0], 0.35);

    this.litRing = this.scene.add.circle(this.x, this.y, 22, 0xffffff, 0.0);
    this.litRing.setStrokeStyle(3, this.colorPalette[0], 0.9);
    this.scene.tweens.add({
      targets: this.litRing,
      radius: 160,
      alpha: 0,
      strokeAlpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut'
    });

    this.ringParticles.setPosition(this.x, this.y);
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.08, 0.08);
      const sp = Phaser.Math.FloatBetween(120, 260);
      this.ringParticles.emitParticleAt(
        this.x,
        this.y,
        {
          angle: angle * Phaser.Math.RAD_TO_DEG,
          speed: sp,
          tint: Phaser.Utils.Array.GetRandom(this.colorPalette)
        } as any
      );
    }

    this.pulseTween?.remove();
    this.pulseTween = this.scene.tweens.add({
      targets: [this.core, this.aura],
      scale: { from: 0.95, to: 1.35 },
      alpha: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true
    });

    this.playPianoNote();
  }

  private playPianoNote(): void {
    const freq = PITCH_MAP[this.pitchIndex];
    try {
      const ctx = (this.scene.game as any).audioContext as AudioContext | undefined;
      const ac = ctx ?? (typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null);
      if (!ac) return;

      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.value = 0.8;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 1.65);
    } catch (e) {
    }
  }

  public getPitchName(): string {
    return PITCH_NAMES[this.pitchIndex];
  }

  preUpdate(_time: number, _delta: number): void {
    this.iterate((child) => {
      const orb = child as Phaser.GameObjects.Arc;
      const a = orb.getData('angle');
      const r = orb.getData('radius');
      if (typeof a === 'number' && typeof r === 'number') {
        const rot = this.rotation;
        orb.x = Math.cos(a + rot) * r;
        orb.y = Math.sin(a + rot) * r;
      }
    });
  }
}
