export class Player {
  score: number = 0;
  combo: number = 0;
  maxCombo: number = 0;
  energy: number = 0;
  comboAnimTime: number = 0;
  comboMissFlash: number = 0;
  private comboAnimStart: number = 0;
  private missFlashStart: number = 0;

  constructor() {}

  hit(now: number) {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.comboAnimStart = now;
    this.comboAnimTime = 300;

    let points = 100;
    if (this.combo > 0 && this.combo % 5 === 0) {
      points += 50;
    }
    this.score += points;

    this.energy = Math.min(100, this.energy + 5);
  }

  miss(now: number) {
    this.combo = 0;
    this.missFlashStart = now;
    this.comboMissFlash = 300;
  }

  ultimateClear(noteCount: number) {
    this.score += noteCount * 200;
    this.energy = 0;
    this.comboAnimTime = 500;
  }

  isEnergyFull(): boolean {
    return this.energy >= 100;
  }

  getSpeedMultiplier(): number {
    const base = 1;
    const maxBoost = 1;
    const boostPerCombo = 0.02;
    const boost = Math.min(maxBoost, this.combo * boostPerCombo);
    return base + boost;
  }

  update(now: number) {
    if (this.comboAnimTime > 0) {
      this.comboAnimTime = Math.max(0, this.comboAnimStart + 300 - now);
    }
    if (this.comboMissFlash > 0) {
      this.comboMissFlash = Math.max(0, this.missFlashStart + 300 - now);
    }
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.energy = 0;
    this.comboAnimTime = 0;
    this.comboMissFlash = 0;
  }
}
