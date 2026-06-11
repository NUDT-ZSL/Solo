const SCORE_PER_HIT = 100;
const COMBO_BONUS = 50;
const COMBO_BONUS_INTERVAL = 5;
const ULTIMATE_SCORE_PER_NOTE = 200;
const ENERGY_PER_HIT = 5;
const MAX_ENERGY = 100;

export interface PlayerState {
  combo: number;
  maxCombo: number;
  energy: number;
  score: number;
  comboScale: number;
  comboFlash: boolean;
  comboFlashTimer: number;
  targetFlash: boolean;
  targetFlashTimer: number;
  ultimateReady: boolean;
}

export class Player {
  private state: PlayerState;
  
  constructor() {
    this.state = {
      combo: 0,
      maxCombo: 0,
      energy: 0,
      score: 0,
      comboScale: 1,
      comboFlash: false,
      comboFlashTimer: 0,
      targetFlash: false,
      targetFlashTimer: 0,
      ultimateReady: false
    };
  }
  
  getState(): PlayerState {
    return { ...this.state };
  }
  
  getCombo(): number {
    return this.state.combo;
  }
  
  getMaxCombo(): number {
    return this.state.maxCombo;
  }
  
  getEnergy(): number {
    return this.state.energy;
  }
  
  getScore(): number {
    return this.state.score;
  }
  
  isUltimateReady(): boolean {
    return this.state.ultimateReady;
  }
  
  hit(): number {
    this.state.combo++;
    
    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }
    
    this.state.energy = Math.min(MAX_ENERGY, this.state.energy + ENERGY_PER_HIT);
    
    if (this.state.energy >= MAX_ENERGY) {
      this.state.ultimateReady = true;
    }
    
    let score = SCORE_PER_HIT;
    
    if (this.state.combo > 0 && this.state.combo % COMBO_BONUS_INTERVAL === 0) {
      score += COMBO_BONUS;
    }
    
    this.state.score += score;
    this.state.comboScale = 1.5;
    
    return score;
  }
  
  miss(): void {
    if (this.state.combo > 0) {
      this.state.comboFlash = true;
      this.state.comboFlashTimer = 300;
    }
    
    this.state.combo = 0;
    this.state.targetFlash = true;
    this.state.targetFlashTimer = 300;
  }
  
  useUltimate(clearedNotes: number): number {
    const score = clearedNotes * ULTIMATE_SCORE_PER_NOTE;
    this.state.score += score;
    this.state.energy = 0;
    this.state.ultimateReady = false;
    
    return score;
  }
  
  getSpeedMultiplier(): number {
    const baseMultiplier = 1;
    const comboBonus = Math.min(this.state.combo * 0.02, 1);
    return baseMultiplier + comboBonus;
  }
  
  update(deltaTime: number): void {
    if (this.state.comboScale > 1) {
      this.state.comboScale = Math.max(1, this.state.comboScale - deltaTime * 0.005);
    }
    
    if (this.state.comboFlash) {
      this.state.comboFlashTimer -= deltaTime;
      if (this.state.comboFlashTimer <= 0) {
        this.state.comboFlash = false;
      }
    }
    
    if (this.state.targetFlash) {
      this.state.targetFlashTimer -= deltaTime;
      if (this.state.targetFlashTimer <= 0) {
        this.state.targetFlash = false;
      }
    }
  }
  
  reset(): void {
    this.state = {
      combo: 0,
      maxCombo: 0,
      energy: 0,
      score: 0,
      comboScale: 1,
      comboFlash: false,
      comboFlashTimer: 0,
      targetFlash: false,
      targetFlashTimer: 0,
      ultimateReady: false
    };
  }
}
