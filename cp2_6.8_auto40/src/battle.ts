import { Beetle, ActionType } from './beetle';

export interface BattleLogEntry {
  timestamp: number;
  actor: string;
  action: string;
  message: string;
  color: string;
}

export interface FloatingDamage {
  x: number;
  y: number;
  value: number;
  timer: number;
  maxTimer: number;
  color: string;
  isCounter: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ScreenShake {
  intensity: number;
  timer: number;
}

export interface FlashEffect {
  color: string;
  alpha: number;
  timer: number;
  maxTimer: number;
}

export interface VictoryEffect {
  active: boolean;
  timer: number;
  winnerIndex: number;
}

export interface DeathEffect {
  active: boolean;
  timer: number;
  beetleIndex: number;
  fragments: Array<{
    x: number; y: number; vx: number; vy: number; rotation: number; vr: number; size: number; color: string;
  }>;
}

export type BattlePhase = 'start' | 'playerTurn' | 'animating' | 'enemyTurn' | 'victory';

export class BattleSystem {
  beetles: [Beetle, Beetle];
  currentTurn: number;
  phase: BattlePhase;
  logs: BattleLogEntry[];
  floatingDamages: FloatingDamage[];
  particles: Particle[];
  screenShake: ScreenShake;
  flashEffect: FlashEffect;
  victoryEffect: VictoryEffect;
  deathEffect: DeathEffect;
  actionQueue: Array<{ type: ActionType; attacker: number; target: number }>;
  animatingAction: boolean;
  turnCount: number;
  slowMotion: boolean;

  constructor(beetle1: Beetle, beetle2: Beetle) {
    this.beetles = [beetle1, beetle2];
    this.currentTurn = beetle1.stats.speed >= beetle2.stats.speed ? 0 : 1;
    this.phase = 'start';
    this.logs = [];
    this.floatingDamages = [];
    this.particles = [];
    this.screenShake = { intensity: 0, timer: 0 };
    this.flashEffect = { color: '#ff0000', alpha: 0, timer: 0, maxTimer: 0 };
    this.victoryEffect = { active: false, timer: 0, winnerIndex: -1 };
    this.deathEffect = { active: false, timer: 0, beetleIndex: -1, fragments: [] };
    this.actionQueue = [];
    this.animatingAction = false;
    this.turnCount = 1;
    this.slowMotion = false;

    this.addLog('系统', '⚔️', `战斗开始！${this.beetles[0].name}（速度:${this.beetles[0].stats.speed}） vs ${this.beetles[1].name}（速度:${this.beetles[1].stats.speed}）`, '#c9a227');
    this.addLog(this.beetles[this.currentTurn].name, '🎯', `${this.beetles[this.currentTurn].name} 先手行动！`, this.beetles[this.currentTurn].colors.body);
  }

  addLog(actor: string, action: string, message: string, color: string): void {
    this.logs.unshift({
      timestamp: Date.now(),
      actor,
      action,
      message,
      color
    });
    if (this.logs.length > 50) {
      this.logs.pop();
    }
  }

  executeAction(actionType: ActionType, attackerIndex: number): void {
    if (this.animatingAction || this.phase === 'victory') return;

    const attacker = this.beetles[attackerIndex];
    const targetIndex = 1 - attackerIndex;
    const target = this.beetles[targetIndex];

    this.animatingAction = true;
    attacker.resetTurnState();

    switch (actionType) {
      case 'attack':
        this.performAttack(attacker, target, attackerIndex, targetIndex);
        break;
      case 'defend':
        this.performDefend(attacker, attackerIndex);
        break;
      case 'counter':
        this.performCounter(attacker, attackerIndex);
        break;
      case 'ultimate':
        this.performUltimate(attacker, target, attackerIndex, targetIndex);
        break;
    }
  }

  private performAttack(attacker: Beetle, target: Beetle, attackerIdx: number, _targetIdx: number): void {
    const rawDamage = attacker.stats.attack - target.stats.defense;
    const result = target.takeDamage(rawDamage);

    this.addLog(attacker.name, '⚔️', `${attacker.name} 发动普通攻击，造成 ${result.finalDamage} 点伤害！`, attacker.colors.body);
    this.addFloatingDamage(target.position.x, target.position.y - 40, result.finalDamage, '#ff4444', false);
    this.spawnHitParticles(target.position.x, target.position.y, '#ff6b6b');
    this.screenShake.intensity = 5;
    this.screenShake.timer = 0.15;

    if (result.counterDamage > 0) {
      attacker.takeDamage(result.counterDamage);
      this.addLog(target.name, '🗡️', `${target.name} 的尖刺反击生效，反弹 ${result.counterDamage} 点伤害！`, target.colors.body);
      this.addFloatingDamage(attacker.position.x, attacker.position.y - 40, result.counterDamage, '#ff8800', true);
      this.spawnHitParticles(attacker.position.x, attacker.position.y, '#ffaa00');
    }

    attacker.recoverEnergy(10);
    this.checkDeaths();
    setTimeout(() => this.endTurn(attackerIdx), 500);
  }

  private performDefend(attacker: Beetle, attackerIdx: number): void {
    attacker.state.isDefending = true;
    this.addLog(attacker.name, '🛡️', `${attacker.name} 进入铁壁防御状态，本回合减伤50%！`, attacker.colors.body);
    this.spawnShieldParticles(attacker.position.x, attacker.position.y);
    attacker.recoverEnergy(15);
    setTimeout(() => this.endTurn(attackerIdx), 400);
  }

  private performCounter(attacker: Beetle, attackerIdx: number): void {
    attacker.state.isCountering = true;
    this.addLog(attacker.name, '🦔', `${attacker.name} 摆出尖刺反击姿态，本回合受击反弹50%伤害！`, attacker.colors.body);
    this.spawnSpikeParticles(attacker.position.x, attacker.position.y);
    attacker.recoverEnergy(10);
    setTimeout(() => this.endTurn(attackerIdx), 400);
  }

  private performUltimate(attacker: Beetle, target: Beetle, attackerIdx: number, _targetIdx: number): void {
    if (!attacker.useUltimate()) {
      this.addLog(attacker.name, '❌', `${attacker.name} 能量不足（需20点），必杀技释放失败！`, '#ff0000');
      this.animatingAction = false;
      return;
    }

    const rawDamage = (attacker.stats.attack - target.stats.defense) * 2;
    const result = target.takeDamage(rawDamage);

    this.flashEffect = { color: '#ff0000', alpha: 0.6, timer: 0.3, maxTimer: 0.3 };
    this.screenShake.intensity = 15;
    this.screenShake.timer = 0.3;

    this.addLog(attacker.name, '💥', `${attacker.name} 释放必杀技！造成 ${result.finalDamage} 点毁灭伤害！`, '#ff0000');
    this.addFloatingDamage(target.position.x, target.position.y - 40, result.finalDamage, '#ffff00', false);
    this.spawnExplosionParticles(target.position.x, target.position.y);

    if (result.counterDamage > 0) {
      attacker.takeDamage(result.counterDamage);
      this.addFloatingDamage(attacker.position.x, attacker.position.y - 40, result.counterDamage, '#ff8800', true);
    }

    this.checkDeaths();
    setTimeout(() => this.endTurn(attackerIdx), 800);
  }

  addFloatingDamage(x: number, y: number, value: number, color: string, isCounter: boolean): void {
    this.floatingDamages.push({
      x, y, value, color, isCounter,
      timer: 1.5,
      maxTimer: 1.5
    });
  }

  spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  spawnShieldParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const radius = 60;
      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 20,
        vy: Math.sin(angle) * 20,
        life: 0.8,
        maxLife: 0.8,
        color: '#4488ff',
        size: 4
      });
    }
  }

  spawnSpikeParticles(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 100,
        vy: Math.sin(angle) * 50 - 50,
        life: 0.5,
        maxLife: 0.5,
        color: '#88ff44',
        size: 5
      });
    }
  }

  spawnExplosionParticles(x: number, y: number): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const colors = ['#ff0000', '#ff6600', '#ffcc00', '#ffffff'];
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6
      });
    }
  }

  spawnDeathFragments(beetleIdx: number): void {
    const beetle = this.beetles[beetleIdx];
    this.deathEffect.active = true;
    this.deathEffect.timer = 1;
    this.deathEffect.beetleIndex = beetleIdx;
    this.deathEffect.fragments = [];

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      this.deathEffect.fragments.push({
        x: beetle.position.x,
        y: beetle.position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 10,
        size: 8 + Math.random() * 15,
        color: beetle.colors.body
      });
    }
    this.slowMotion = true;
  }

  private checkDeaths(): void {
    for (let i = 0; i < 2; i++) {
      if (this.beetles[i].state.isDead && !this.victoryEffect.active) {
        const winnerIdx = 1 - i;
        this.victoryEffect = { active: true, timer: 0, winnerIndex: winnerIdx };
        this.phase = 'victory';
        this.spawnDeathFragments(i);
        this.addLog('系统', '👑', `${this.beetles[winnerIdx].name} 获得胜利！`, '#ffd700');
        break;
      }
    }
  }

  private endTurn(attackerIdx: number): void {
    this.animatingAction = false;

    if (this.phase === 'victory') return;

    this.currentTurn = 1 - attackerIdx;
    this.turnCount++;
    this.addLog('系统', '📜', `—— 第 ${this.turnCount} 回合 ——`, '#888888');
    this.addLog(this.beetles[this.currentTurn].name, '🎯', `${this.beetles[this.currentTurn].name} 的回合！`, this.beetles[this.currentTurn].colors.body);
  }

  update(dt: number): void {
    const timeScale = this.slowMotion ? 0.3 : 1;
    const adjustedDt = dt * timeScale;

    for (const beetle of this.beetles) {
      beetle.update(dt);
    }

    for (let i = this.floatingDamages.length - 1; i >= 0; i--) {
      const d = this.floatingDamages[i];
      d.timer -= dt;
      d.y -= 40 * dt;
      if (d.timer <= 0) {
        this.floatingDamages.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= adjustedDt;
      p.x += p.vx * adjustedDt;
      p.y += p.vy * adjustedDt;
      p.vy += 200 * adjustedDt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.screenShake.timer > 0) {
      this.screenShake.timer -= dt;
      if (this.screenShake.timer < 0) this.screenShake.timer = 0;
    }

    if (this.flashEffect.timer > 0) {
      this.flashEffect.timer -= dt;
      if (this.flashEffect.timer < 0) this.flashEffect.timer = 0;
    }

    if (this.deathEffect.active) {
      this.deathEffect.timer -= adjustedDt;
      for (const f of this.deathEffect.fragments) {
        f.x += f.vx * adjustedDt;
        f.y += f.vy * adjustedDt;
        f.vy += 300 * adjustedDt;
        f.rotation += f.vr * adjustedDt;
      }
      if (this.deathEffect.timer <= 0) {
        this.slowMotion = false;
      }
    }

    if (this.victoryEffect.active) {
      this.victoryEffect.timer += dt;
    }
  }
}
