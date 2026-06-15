import { Ship, EnergySlots } from './ship';

export interface BattleLogEntry {
  id: number;
  round: number;
  text: string;
  playerDamageToAi: number;
  aiDamageToPlayer: number;
  aiShieldRemaining: number;
  playerShieldRemaining: number;
  timestamp: number;
}

export type PresetStrategy = 'balanced' | 'attack' | 'defense';

export const PRESET_STRATEGIES: Record<PresetStrategy, EnergySlots> = {
  balanced: { weapon: 50, shield: 50, engine: 50 },
  attack: { weapon: 70, shield: 20, engine: 60 },
  defense: { weapon: 20, shield: 80, engine: 50 },
};

export class AIStrategy {
  public round: number = 0;
  public logs: BattleLogEntry[] = [];
  public playerAttackTimer: number = 0;
  public aiAttackTimer: number = 0;
  private logId: number = 0;
  public gameOver: boolean = false;
  public winner: 'player' | 'ai' | null = null;

  public reset(): void {
    this.round = 0;
    this.logs = [];
    this.playerAttackTimer = 0;
    this.aiAttackTimer = 0;
    this.logId = 0;
    this.gameOver = false;
    this.winner = null;
  }

  public addLog(entry: Omit<BattleLogEntry, 'id' | 'timestamp'>): void {
    this.logs.unshift({
      ...entry,
      id: ++this.logId,
      timestamp: Date.now(),
    });
    if (this.logs.length > 20) {
      this.logs.pop();
    }
  }

  public update(dt: number, player: Ship, ai: Ship, now: number): { playerHit: boolean; aiHit: boolean; playerDamage: number; aiDamage: number } | null {
    if (this.gameOver) return null;

    this.playerAttackTimer += dt;
    this.aiAttackTimer += dt;

    const playerInterval = player.getAttackInterval();
    const aiInterval = ai.getAttackInterval();

    let playerHit = false;
    let aiHit = false;
    let playerDamage = 0;
    let aiDamage = 0;

    if (this.playerAttackTimer >= playerInterval) {
      this.playerAttackTimer = 0;
      const raw = player.getAttackPower();
      aiDamage = ai.takeDamage(raw, now);
      playerHit = true;
    }

    if (this.aiAttackTimer >= aiInterval) {
      this.aiAttackTimer = 0;
      const raw = ai.getAttackPower();
      playerDamage = player.takeDamage(raw, now);
      aiHit = true;
    }

    if (playerHit || aiHit) {
      this.round++;
      this.addLog({
        round: this.round,
        text: playerHit
          ? `回合${this.round}：你攻击AI造成${aiDamage}点伤害，AI护盾剩余${Math.round(ai.slots.shield)}点`
          : `回合${this.round}：AI攻击你造成${playerDamage}点伤害，你的护盾剩余${Math.round(player.slots.shield)}点`,
        playerDamageToAi: aiDamage,
        aiDamageToPlayer: playerDamage,
        aiShieldRemaining: ai.slots.shield,
        playerShieldRemaining: player.slots.shield,
      });
    }

    if (player.hp <= 0) {
      this.gameOver = true;
      this.winner = 'ai';
    } else if (ai.hp <= 0) {
      this.gameOver = true;
      this.winner = 'player';
    }

    return playerHit || aiHit ? { playerHit, aiHit, playerDamage, aiDamage } : null;
  }
}
