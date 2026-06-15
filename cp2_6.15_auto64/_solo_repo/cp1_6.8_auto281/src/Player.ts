import Phaser from 'phaser';
import { LIGHT_POINT, COLORS } from './config';

interface LightPointData {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Ellipse;
  core: Phaser.GameObjects.Ellipse;
  trail: Phaser.GameObjects.Ellipse[];
  velocity: { x: number; y: number };
  alive: boolean;
}

export class Player {
  private scene: Phaser.Scene;
  private _lightPoints: number;
  private _buildingsPlaced: number;
  private _boosted: boolean;
  private _boostTimer: Phaser.Time.TimerEvent | null;
  private lightPoints: LightPointData[];
  private spawnTimer: Phaser.Time.TimerEvent;
  private hudText: Phaser.GameObjects.Text | null;
  private onCollectCallback: ((count: number) => void) | null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this._lightPoints = 0;
    this._buildingsPlaced = 0;
    this._boosted = false;
    this._boostTimer = null;
    this.lightPoints = [];
    this.hudText = null;
    this.onCollectCallback = null;

    const interval = this.getCurrentSpawnInterval();
    this.spawnTimer = scene.time.addEvent({
      delay: interval,
      callback: this.spawnLightPoint,
      callbackScope: this,
      loop: true,
    });
  }

  get count(): number {
    return this._lightPoints;
  }

  get buildingsPlaced(): number {
    return this._buildingsPlaced;
  }

  get isBoosted(): boolean {
    return this._boosted;
  }

  setHudText(text: Phaser.GameObjects.Text): void {
    this.hudText = text;
  }

  setOnCollect(cb: (count: number) => void): void {
    this.onCollectCallback = cb;
  }

  private getCurrentSpawnInterval(): number {
    return this._boosted ? LIGHT_POINT.spawnIntervalBoosted : LIGHT_POINT.spawnInterval;
  }

  private spawnLightPoint(): void {
    const x = Phaser.Math.Between(100, 924);
    const y = -20;
    const fallSpeed = Phaser.Math.FloatBetween(LIGHT_POINT.fallSpeedMin, LIGHT_POINT.fallSpeedMax);
    const drift = Phaser.Math.FloatBetween(-LIGHT_POINT.driftSpeed, LIGHT_POINT.driftSpeed);

    const container = this.scene.add.container(x, y);

    const glow = this.scene.add.ellipse(0, 0, LIGHT_POINT.radius * 4, LIGHT_POINT.radius * 4, COLORS.goldWarm, 0.25);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    container.add(glow);

    const core = this.scene.add.ellipse(0, 0, LIGHT_POINT.radius * 2, LIGHT_POINT.radius * 2, COLORS.whiteCold, 0.9);
    core.setBlendMode(Phaser.BlendModes.ADD);
    container.add(core);

    const trail: Phaser.GameObjects.Ellipse[] = [];
    for (let i = 0; i < LIGHT_POINT.trailLength; i++) {
      const t = this.scene.add.ellipse(0, 0, LIGHT_POINT.radius * (2 - i * 0.25), LIGHT_POINT.radius * (2 - i * 0.25), COLORS.goldWarm, 0.4 - i * 0.06);
      t.setBlendMode(Phaser.BlendModes.ADD);
      container.add(t);
      trail.push(t);
    }

    container.setDepth(0.1);

    const data: LightPointData = {
      container,
      glow,
      core,
      trail,
      velocity: { x: drift, y: fallSpeed },
      alive: true,
    };

    this.lightPoints.push(data);
  }

  update(delta: number, pointer: Phaser.Input.Pointer): void {
    const dt = delta / 1000;

    for (let i = this.lightPoints.length - 1; i >= 0; i--) {
      const lp = this.lightPoints[i];
      if (!lp.alive) continue;

      lp.container.x += lp.velocity.x * dt;
      lp.container.y += lp.velocity.y * dt;

      for (let t = 0; t < lp.trail.length; t++) {
        const factor = (t + 1) * 3;
        lp.trail[t].x = -lp.velocity.x * dt * factor;
        lp.trail[t].y = -lp.velocity.y * dt * factor;
      }

      const pulse = 1 + Math.sin(this.scene.time.now / 200 + i) * 0.15;
      lp.glow.setScale(pulse);
      lp.core.setScale(0.8 + pulse * 0.2);

      if (pointer.isDown) {
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lp.container.x, lp.container.y);
        if (dist < LIGHT_POINT.clickRadius) {
          this.collectLightPoint(lp, i);
        }
      }

      if (lp.container.y > 800) {
        lp.alive = false;
        lp.container.destroy();
        this.lightPoints.splice(i, 1);
      }
    }
  }

  private collectLightPoint(lp: LightPointData, index: number): void {
    lp.alive = false;

    for (let p = 0; p < LIGHT_POINT.particleBurstCount; p++) {
      const angle = (p / LIGHT_POINT.particleBurstCount) * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(60, 140);
      const particle = this.scene.add.ellipse(lp.container.x, lp.container.y, 6, 6, COLORS.goldWarm, 0.8);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(0.15);

      this.scene.tweens.add({
        targets: particle,
        x: lp.container.x + Math.cos(angle) * speed,
        y: lp.container.y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 400,
        ease: 'Cubic.Out',
        onComplete: () => particle.destroy(),
      });
    }

    lp.container.destroy();
    this.lightPoints.splice(index, 1);

    this._lightPoints++;
    this.updateHud();

    if (this.onCollectCallback) {
      this.onCollectCallback(this._lightPoints);
    }
  }

  private updateHud(): void {
    if (this.hudText) {
      this.hudText.setText(`${this._lightPoints}`);
      this.scene.tweens.add({
        targets: this.hudText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Back.Out',
      });
    }
  }

  spend(amount: number): boolean {
    if (this._lightPoints < amount) return false;
    this._lightPoints -= amount;
    this._buildingsPlaced++;
    this.updateHud();
    return true;
  }

  activateBoost(): void {
    this._boosted = true;
    if (this._boostTimer) {
      this._boostTimer.remove();
    }
    this.spawnTimer.delay = LIGHT_POINT.spawnIntervalBoosted;

    this._boostTimer = this.scene.time.delayedCall(LIGHT_POINT.boostDuration, () => {
      this._boosted = false;
      this.spawnTimer.delay = LIGHT_POINT.spawnInterval;
    });
  }

  canAfford(cost: number): boolean {
    return this._lightPoints >= cost;
  }

  destroy(): void {
    this.spawnTimer.remove();
    if (this._boostTimer) this._boostTimer.remove();
    for (const lp of this.lightPoints) {
      if (lp.alive) lp.container.destroy();
    }
    this.lightPoints = [];
  }
}
