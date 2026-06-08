import Phaser from 'phaser';

export enum GateState {
  Locked = 'locked',
  Active = 'active',
  Unlocked = 'unlocked',
}

export class Gate extends Phaser.GameObjects.Container {
  private image: Phaser.GameObjects.Image;
  private glowRing: Phaser.GameObjects.Arc;
  private gateState: GateState = GateState.Locked;
  private orderIndex: number = 0;
  private label: Phaser.GameObjects.Text;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private activationRadius: number = 50;

  constructor(scene: Phaser.Scene, x: number, y: number, orderIndex: number) {
    super(scene, x, y);

    this.orderIndex = orderIndex;

    this.glowRing = scene.add.circle(0, 0, 50, 0x8b5cf6, 0.1);
    this.add(this.glowRing);

    this.image = scene.add.image(0, 0, 'gate');
    this.add(this.image);

    this.label = scene.add.text(0, -35, `${orderIndex + 1}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#8b5cf6',
      stroke: '#1a1a3a',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(this.label);

    this.startIdlePulse();
  }

  private startIdlePulse(): void {
    this.pulseTween = this.scene.tweens.add({
      targets: this.glowRing,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public activate(): void {
    if (this.gateState === GateState.Unlocked) return;
    this.gateState = GateState.Active;

    if (this.pulseTween) {
      this.pulseTween.stop();
    }

    this.scene.tweens.add({
      targets: this.glowRing,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.3,
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.label.setColor('#22c55e');
  }

  public unlock(): void {
    this.gateState = GateState.Unlocked;

    this.image.setTexture('gate_active');

    if (this.pulseTween) {
      this.pulseTween.stop();
    }

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });

    this.scene.tweens.add({
      targets: this.glowRing,
      alpha: 0.4,
      duration: 500,
      ease: 'Sine.easeOut',
    });

    this.label.setText('✓');
    this.label.setColor('#22c55e');
  }

  public checkCollision(asteroidX: number, asteroidY: number): boolean {
    if (this.gateState !== GateState.Active) return false;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, asteroidX, asteroidY);
    return dist < this.activationRadius;
  }

  public getState(): GateState {
    return this.gateState;
  }

  public getOrderIndex(): number {
    return this.orderIndex;
  }

  public getActivationRadius(): number {
    return this.activationRadius;
  }

  public isLocked(): boolean {
    return this.state === GateState.Locked;
  }

  public isActive(): boolean {
    return this.state === GateState.Active;
  }

  public isUnlocked(): boolean {
    return this.state === GateState.Unlocked;
  }

  public reset(): void {
    this.state = GateState.Locked;
    this.image.setTexture('gate');
    this.label.setText(`${this.orderIndex + 1}`);
    this.label.setColor('#8b5cf6');
    this.setScale(1);
    this.glowRing.setScale(1);
    this.glowRing.setAlpha(0.1);

    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    this.startIdlePulse();
  }

  public destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    super.destroy(fromScene);
  }
}
