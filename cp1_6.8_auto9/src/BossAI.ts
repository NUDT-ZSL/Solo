import { PlayerState, Vector2 } from './GameEngine';
import { BossConfig } from './PuzzleManager';

const REFLECTION_DELAY = 500;
const WEAK_POINT_EXPOSE_DURATION = 3000;
const WEAK_POINT_COOLDOWN = 5000;
const ATTACK_WINDUP = 800;
const ATTACK_DURATION = 400;
const ATTACK_COOLDOWN = 2000;
const DECOY_LINGER = 1200;

interface ReflectionRecord {
  position: Vector2;
  facing: 1 | -1;
  isAttacking: boolean;
  isMoving: boolean;
  timestamp: number;
}

interface AttackInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

type BossPhase = 'idle' | 'reflecting' | 'weak_exposed' | 'attacking' | 'defeated';

export class BossAI {
  private config: BossConfig;
  private health: number;
  private maxHealth: number;
  private phase: BossPhase = 'idle';
  private reflectionHistory: ReflectionRecord[] = [];
  private currentReflection: Vector2 | null = null;
  private reflectionFacing: 1 | -1 = 1;
  private weakPointExposed: boolean = false;
  private weakPointTimer: number = 0;
  private weakPointCooldownTimer: number = 0;
  private attackTimer: number = 0;
  private attackCooldownTimer: number = 0;
  private isAttackingFlag: boolean = false;
  private currentAttack: AttackInfo | null = null;
  private defeated: boolean = false;
  private introTimer: number = 0;
  private lastDecoyPosition: Vector2 | null = null;
  private decoyActive: boolean = false;
  private decoyTargetPosition: Vector2 | null = null;

  constructor(config: BossConfig) {
    this.config = config;
    this.health = config.maxHealth;
    this.maxHealth = config.maxHealth;
  }

  update(dt: number, player: PlayerState, decoyPosition: Vector2 | null) {
    if (this.defeated) return;

    if (decoyPosition && !this.decoyActive) {
      this.decoyActive = true;
      this.lastDecoyPosition = { ...decoyPosition };
      this.decoyTargetPosition = { ...decoyPosition };
      setTimeout(() => {
        this.decoyActive = false;
        this.decoyTargetPosition = null;
      }, DECOY_LINGER);
    }

    this.recordReflection(player);

    const delayedRecord = this.getDelayedReflection();
    if (delayedRecord) {
      this.currentReflection = { ...delayedRecord.position };
      this.reflectionFacing = delayedRecord.facing;
    }

    this.updatePhaseTimers(dt);

    switch (this.phase) {
      case 'idle':
        this.updateIdle(dt);
        break;
      case 'reflecting':
        break;
      case 'weak_exposed':
        this.updateWeakExposed(dt);
        break;
      case 'attacking':
        this.updateAttacking(dt);
        break;
    }
  }

  private recordReflection(player: PlayerState) {
    const record: ReflectionRecord = {
      position: { ...player.position },
      facing: player.facing,
      isAttacking: player.isAttacking,
      isMoving: player.isMoving,
      timestamp: performance.now(),
    };
    this.reflectionHistory.push(record);
    const cutoff = performance.now() - 2000;
    while (this.reflectionHistory.length > 0 && this.reflectionHistory[0].timestamp < cutoff) {
      this.reflectionHistory.shift();
    }
  }

  private getDelayedReflection(): ReflectionRecord | null {
    const targetTime = performance.now() - REFLECTION_DELAY;
    let closest: ReflectionRecord | null = null;
    let closestDiff = Infinity;
    for (const r of this.reflectionHistory) {
      const diff = Math.abs(r.timestamp - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = r;
      }
    }
    return closest;
  }

  private updatePhaseTimers(dt: number) {
    if (this.weakPointCooldownTimer > 0) {
      this.weakPointCooldownTimer -= dt;
    }
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= dt;
    }
  }

  private updateIdle(dt: number) {
    this.introTimer += dt;
    if (this.introTimer > 2000) {
      this.phase = 'reflecting';
    }
    if (this.attackCooldownTimer <= 0 && this.introTimer > 3000) {
      this.startAttack();
    }
  }

  private startAttack() {
    this.phase = 'attacking';
    this.attackTimer = 0;
    this.isAttackingFlag = false;
  }

  private updateAttacking(dt: number) {
    this.attackTimer += dt;
    if (this.attackTimer < ATTACK_WINDUP) {
      // windup phase - boss is preparing to attack
    } else if (this.attackTimer < ATTACK_WINDUP + ATTACK_DURATION) {
      if (!this.isAttackingFlag) {
        this.isAttackingFlag = true;
        const targetPos = this.decoyActive && this.decoyTargetPosition
          ? this.decoyTargetPosition
          : (this.currentReflection ?? { x: this.config.x, y: this.config.y + 120 });
        const direction = targetPos.x < this.config.x ? -1 : 1;
        this.currentAttack = {
          x: this.config.x + (direction === -1 ? -60 : this.config.width),
          y: this.config.y + 80,
          width: 80,
          height: 40,
        };
      }
    } else {
      this.isAttackingFlag = false;
      this.currentAttack = null;
      this.attackCooldownTimer = ATTACK_COOLDOWN;
      if (this.weakPointCooldownTimer <= 0) {
        this.exposeWeakPoint();
      } else {
        this.phase = 'reflecting';
      }
    }
  }

  private exposeWeakPoint() {
    this.phase = 'weak_exposed';
    this.weakPointExposed = true;
    this.weakPointTimer = WEAK_POINT_EXPOSE_DURATION;
  }

  private updateWeakExposed(dt: number) {
    this.weakPointTimer -= dt;
    if (this.weakPointTimer <= 0) {
      this.weakPointExposed = false;
      this.weakPointCooldownTimer = WEAK_POINT_COOLDOWN;
      this.phase = 'reflecting';
    }
  }

  receiveAttack(attackPos: Vector2, facing: 1 | -1): boolean {
    if (!this.weakPointExposed || this.defeated) return false;
    const wpX = this.config.weakPointX;
    const wpY = this.config.weakPointY;
    const dx = attackPos.x - wpX;
    const dy = attackPos.y - wpY;
    const hitRadius = 50;
    if (Math.abs(dx) < hitRadius && Math.abs(dy) < hitRadius) {
      this.health--;
      this.weakPointExposed = false;
      this.weakPointCooldownTimer = WEAK_POINT_COOLDOWN;
      if (this.health <= 0) {
        this.defeated = true;
        this.phase = 'defeated';
      } else {
        this.phase = 'reflecting';
      }
      return true;
    }
    return false;
  }

  isDefeated(): boolean {
    return this.defeated;
  }

  isAttacking(): boolean {
    return this.isAttackingFlag;
  }

  getAttackInfo(): AttackInfo | null {
    return this.currentAttack;
  }

  isWeakPointExposed(): boolean {
    return this.weakPointExposed;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getPosition(): Vector2 {
    return { x: this.config.x, y: this.config.y };
  }

  getSize(): { width: number; height: number } {
    return { width: this.config.width, height: this.config.height };
  }

  getWeakPointPosition(): Vector2 {
    return { x: this.config.weakPointX, y: this.config.weakPointY };
  }

  getReflectionPosition(): Vector2 | null {
    return this.currentReflection;
  }

  getReflectionFacing(): 1 | -1 {
    return this.reflectionFacing;
  }

  getPhase(): BossPhase {
    return this.phase;
  }
}
