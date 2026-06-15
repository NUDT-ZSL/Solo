import { CONFIG } from './assets';

export class GameState {
  oxygen: number = CONFIG.OXYGEN_MAX;
  goldCoins: number = 0;
  gems: number = 0;
  mapFragments: number = 0;
  isGameOver: boolean = false;
  isPlayerInShip: boolean = false;
  warningPulseAlpha: number = 0;
  warningPulseDir: number = 1;
  showCriticalWarning: boolean = false;
  nearChestIndex: number = -1;
  openChestMessages: Array<{ text: string; x: number; y: number; life: number }> = [];
  gameStartTime: number = 0;
  isGameStarted: boolean = false;

  updateOxygen(dt: number): void {
    if (this.isGameOver) return;
    const rate = this.isPlayerInShip ? CONFIG.OXYGEN_DRAIN_RATE_IN_SHIP : CONFIG.OXYGEN_DRAIN_RATE;
    this.oxygen -= rate * dt;
    if (this.oxygen <= 0) {
      this.oxygen = 0;
      this.isGameOver = true;
    }
    if (this.oxygen < CONFIG.OXYGEN_LOW_THRESHOLD) {
      this.warningPulseAlpha += this.warningPulseDir * dt * 1.5;
      if (this.warningPulseAlpha >= 0.6) { this.warningPulseAlpha = 0.6; this.warningPulseDir = -1; }
      if (this.warningPulseAlpha <= 0.2) { this.warningPulseAlpha = 0.2; this.warningPulseDir = 1; }
    } else {
      this.warningPulseAlpha = 0;
    }
    this.showCriticalWarning = this.oxygen < CONFIG.OXYGEN_CRITICAL_THRESHOLD;
  }

  refillOxygen(): void {
    this.oxygen = CONFIG.OXYGEN_MAX;
    this.warningPulseAlpha = 0;
    this.showCriticalWarning = false;
  }

  addTreasure(content: string, value: number): void {
    if (content === '金币') this.goldCoins += value;
    else if (content === '宝石') this.gems += value;
    else if (content === '地图碎片') this.mapFragments += value;
  }

  reset(): void {
    this.oxygen = CONFIG.OXYGEN_MAX;
    this.goldCoins = 0;
    this.gems = 0;
    this.mapFragments = 0;
    this.isGameOver = false;
    this.isPlayerInShip = false;
    this.warningPulseAlpha = 0;
    this.warningPulseDir = 1;
    this.showCriticalWarning = false;
    this.nearChestIndex = -1;
    this.openChestMessages = [];
  }
}
