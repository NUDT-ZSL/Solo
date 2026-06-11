export type Team = 'red' | 'blue';
export type UnitType = 'king' | 'knight' | 'archer';

export interface Position {
  x: number;
  y: number;
}

export interface Shield {
  value: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface UnitStats {
  maxHp: number;
  attack: number;
  moveRange: number;
  attackRange: number;
  skillName: string;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  king: {
    maxHp: 15,
    attack: 3,
    moveRange: 1,
    attackRange: 1,
    skillName: '暗影庇护'
  },
  knight: {
    maxHp: 10,
    attack: 5,
    moveRange: 1,
    attackRange: 1,
    skillName: '突袭冲锋'
  },
  archer: {
    maxHp: 8,
    attack: 4,
    moveRange: 1,
    attackRange: 2,
    skillName: '贯穿之箭'
  }
};

export const TEAM_COLORS: Record<Team, string> = {
  red: '#E94560',
  blue: '#4A90D9'
};

export const TEAM_COLORS_DARK: Record<Team, string> = {
  red: '#8B2233',
  blue: '#25588A'
};

let unitIdCounter = 0;

export class Unit {
  id: string;
  type: UnitType;
  team: Team;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  moveRange: number;
  attackRange: number;
  energy: number;
  skillCooldown: number;
  shield: Shield | null;
  hasMoved: boolean;
  hasAttacked: boolean;
  hasUsedSkill: boolean;

  isShaking: boolean;
  shakeTime: number;
  shakeMagnitude: number;

  isDying: boolean;
  deathTime: number;
  deathParticles: Particle[];

  attackParticles: Particle[];
  damageDisplay: { value: number; time: number; y: number } | null;

  pulsePhase: number;

  constructor(type: UnitType, team: Team, position: Position) {
    this.id = `unit_${unitIdCounter++}`;
    this.type = type;
    this.team = team;
    this.position = { ...position };
    const stats = UNIT_STATS[type];
    this.hp = stats.maxHp;
    this.maxHp = stats.maxHp;
    this.attack = stats.attack;
    this.moveRange = 1;
    this.attackRange = stats.attackRange;
    this.energy = 0;
    this.skillCooldown = 0;
    this.shield = null;
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasUsedSkill = false;
    this.isShaking = false;
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.isDying = false;
    this.deathTime = 0;
    this.deathParticles = [];
    this.attackParticles = [];
    this.damageDisplay = null;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  takeDamage(damage: number): number {
    let actualDamage = damage;
    if (this.shield && this.shield.value > 0) {
      const absorbed = Math.min(this.shield.value, damage);
      this.shield.value -= absorbed;
      actualDamage -= absorbed;
      if (this.shield.value <= 0) {
        this.shield = null;
      }
    }
    this.hp = Math.max(0, this.hp - actualDamage);
    this.energy = Math.min(100, this.energy + 10);

    this.isShaking = true;
    this.shakeTime = 0.2;
    this.shakeMagnitude = 3;

    this.damageDisplay = { value: actualDamage, time: 0.8, y: 0 };

    if (this.hp <= 0) {
      this.startDeathAnimation();
    }

    return actualDamage;
  }

  gainEnergy(amount: number): void {
    this.energy = Math.min(100, this.energy + amount);
  }

  canUseSkill(): boolean {
    return this.energy >= 100 && !this.hasUsedSkill;
  }

  useSkill(): void {
    if (this.canUseSkill()) {
      this.energy = 0;
      this.hasUsedSkill = true;
    }
  }

  startDeathAnimation(): void {
    this.isDying = true;
    this.deathTime = 0.6;
    this.deathParticles = this.createDeathParticles();
  }

  createAttackParticles(targetX: number, targetY: number, cellSize: number): Particle[] {
    const color = TEAM_COLORS[this.team];
    const count = 10 + Math.floor(Math.random() * 6);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 0.4,
        maxLife: 0.4,
        size: 2 + Math.random() * 3
      });
    }
    return particles;
  }

  private createDeathParticles(): Particle[] {
    const color = TEAM_COLORS[this.team];
    const count = 20;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        color: color,
        life: 0.6,
        maxLife: 0.6,
        size: 3 + Math.random() * 4
      });
    }
    return particles;
  }

  update(dt: number): void {
    if (this.isShaking) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) {
        this.isShaking = false;
      }
    }

    if (this.damageDisplay) {
      this.damageDisplay.time -= dt;
      this.damageDisplay.y += 30 * dt;
      if (this.damageDisplay.time <= 0) {
        this.damageDisplay = null;
      }
    }

    if (this.isDying) {
      this.deathTime -= dt;
      for (const p of this.deathParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        p.life -= dt;
      }
    }

    this.pulsePhase += dt * (Math.PI * 2 / 0.8);
  }

  isInMoveRange(target: Position): boolean {
    const dx = Math.abs(target.x - this.position.x);
    const dy = Math.abs(target.y - this.position.y);
    return dx <= this.moveRange && dy <= this.moveRange && (dx > 0 || dy > 0);
  }

  isInAttackRange(target: Position): boolean {
    const dx = Math.abs(target.x - this.position.x);
    const dy = Math.abs(target.y - this.position.y);
    if (this.type === 'archer') {
      return dx <= this.attackRange && dy <= this.attackRange && (dx > 0 || dy > 0);
    }
    return (dx <= this.attackRange && dy <= this.attackRange) && (dx + dy <= this.attackRange + 1) && (dx > 0 || dy > 0);
  }

  getSkillTargets(allUnits: Unit[]): Unit[] {
    const targets: Unit[] = [];
    if (!this.canUseSkill()) return targets;

    switch (this.type) {
      case 'king':
        for (const unit of allUnits) {
          if (unit.team === this.team && unit.hp > 0) {
            const dx = Math.abs(unit.position.x - this.position.x);
            const dy = Math.abs(unit.position.y - this.position.y);
            if (dx <= 2 && dy <= 2) {
              targets.push(unit);
            }
          }
        }
        break;
      case 'knight':
        break;
      case 'archer':
        break;
    }
    return targets;
  }

  draw(ctx: CanvasRenderingContext2D, cellSize: number, offsetX: number, offsetY: number, isHovered: boolean, isSelected: boolean, canAct: boolean): void {
    const px = offsetX + this.position.x * cellSize + cellSize / 2;
    const py = offsetY + this.position.y * cellSize + cellSize / 2;
    const radius = cellSize * 0.38;

    let drawX = px;
    let drawY = py;

    if (this.isShaking) {
      const shakeAmount = this.shakeMagnitude * (this.shakeTime / 0.2);
      drawX += (Math.random() - 0.5) * shakeAmount * 2;
      drawY += (Math.random() - 0.5) * shakeAmount * 2;
    }

    if (this.isDying) {
      const progress = 1 - this.deathTime / 0.6;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      this.drawUnitBody(ctx, drawX, drawY + progress * 20, radius * (1 - progress * 0.5), isHovered, isSelected);
      ctx.globalAlpha = 1;

      for (const p of this.deathParticles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(drawX + p.x, drawY + p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      return;
    }

    if (canAct && !this.hasMoved) {
      const pulseRadius = radius + 8 + Math.sin(this.pulsePhase) * 4;
      const alpha = 0.3 + Math.sin(this.pulsePhase) * 0.15;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = TEAM_COLORS[this.team];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    this.drawUnitBody(ctx, drawX, drawY, radius, isHovered, isSelected);
    this.drawEnergyBar(ctx, drawX, drawY + radius + 6, cellSize * 0.6);

    if (this.shield && this.shield.value > 0) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (this.damageDisplay) {
      const alpha = Math.min(1, this.damageDisplay.time / 0.8);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FF6B6B';
      ctx.font = `bold ${Math.floor(cellSize * 0.3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`-${this.damageDisplay.value}`, drawX, drawY - radius - 10 - this.damageDisplay.y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  private drawUnitBody(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, isHovered: boolean, isSelected: boolean): void {
    const scale = isHovered ? 1.15 : 1;
    const r = radius * scale;

    if (isHovered) {
      ctx.shadowColor = '#88CCFF';
      ctx.shadowBlur = 15;
    }

    if (isSelected) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }

    const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    gradient.addColorStop(0, this.lightenColor(TEAM_COLORS[this.team], 30));
    gradient.addColorStop(0.7, TEAM_COLORS[this.team]);
    gradient.addColorStop(1, TEAM_COLORS_DARK[this.team]);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = this.lightenColor(TEAM_COLORS[this.team], 50);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = `${Math.floor(r * 0.9)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let icon = '';
    switch (this.type) {
      case 'king':
        icon = '♔';
        break;
      case 'knight':
        icon = '♘';
        break;
      case 'archer':
        icon = '🏹';
        break;
    }
    ctx.fillText(icon, x, y + 2);

    const hpRatio = this.hp / this.maxHp;
    const hpBarWidth = r * 1.6;
    const hpBarHeight = 4;
    const hpBarY = y + r + 2;

    ctx.fillStyle = '#333';
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight);

    const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';
    ctx.fillStyle = hpColor;
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth * hpRatio, hpBarHeight);
  }

  private drawEnergyBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    const height = 3;
    const ratio = this.energy / 100;

    ctx.fillStyle = '#444';
    ctx.fillRect(x - width / 2, y, width, height);

    if (ratio > 0) {
      const gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
      gradient.addColorStop(0, '#666');
      gradient.addColorStop(1, TEAM_COLORS[this.team]);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - width / 2, y, width * ratio, height);

      if (this.energy >= 100) {
        ctx.shadowColor = TEAM_COLORS[this.team];
        ctx.shadowBlur = 6;
        ctx.fillRect(x - width / 2, y, width, height);
        ctx.shadowBlur = 0;
      }
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }
}
