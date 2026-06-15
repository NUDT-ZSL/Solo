import type { Unit, Skill, ProfessionType } from './types';

const professionConfigs: Record<ProfessionType, {
  name: string;
  color: string;
  attack: [number, number];
  moveRange: number;
  attackRange: number;
  skills: Omit<Skill, 'currentCooldown'>[];
}> = {
  warrior: {
    name: '战士',
    color: '#E74C3C',
    attack: [20, 25],
    moveRange: 3,
    attackRange: 1,
    skills: [{
      id: 'berserk',
      name: '狂击',
      description: '2倍伤害，自身损血10%',
      damage: 0,
      range: 1,
      cooldown: 2,
      icon: '⚔',
      selfDamagePercent: 0.1
    }]
  },
  mage: {
    name: '法师',
    color: '#3498DB',
    attack: [15, 18],
    moveRange: 4,
    attackRange: 3,
    skills: [{
      id: 'fireball',
      name: '火球',
      description: '攻击3格外敌人，伤害15',
      damage: 15,
      range: 3,
      cooldown: 2,
      icon: '🔥'
    }]
  },
  archer: {
    name: '弓箭手',
    color: '#2ECC71',
    attack: [18, 22],
    moveRange: 5,
    attackRange: 4,
    skills: [{
      id: 'precise_shot',
      name: '精准射击',
      description: '无视障碍物，伤害18',
      damage: 18,
      range: 4,
      cooldown: 2,
      icon: '🎯',
      ignoreObstacle: true
    }]
  }
};

export function createUnit(
  id: string,
  profession: ProfessionType,
  gridX: number,
  gridY: number,
  isPlayer: boolean
): Unit {
  const config = professionConfigs[profession];
  const attackValue = Math.floor(config.attack[0] + Math.random() * (config.attack[1] - config.attack[0] + 1));

  return {
    id,
    name: config.name,
    profession,
    gridX,
    gridY,
    hp: 100,
    maxHp: 100,
    attack: attackValue,
    moveRange: config.moveRange,
    attackRange: config.attackRange,
    isPlayer,
    skills: config.skills.map(s => ({ ...s, currentCooldown: 0 })),
    hasMoved: false,
    hasActed: false,
    color: config.color,
    isAttacking: false,
    attackProgress: 0,
    attackDirection: { x: 0, y: 0 },
    isHurt: false,
    hurtProgress: 0,
    displayHp: 100,
    hpAnimProgress: 0
  };
}

export function getHpColor(percent: number): string {
  if (percent > 0.6) return '#2ECC71';
  if (percent > 0.3) return '#F1C40F';
  return '#E74C3C';
}

export function updateUnitAnimation(unit: Unit, deltaTime: number): void {
  if (unit.isAttacking) {
    unit.attackProgress += deltaTime / 200;
    if (unit.attackProgress >= 1) {
      unit.isAttacking = false;
      unit.attackProgress = 0;
    }
  }

  if (unit.isHurt) {
    unit.hurtProgress += deltaTime / 150;
    if (unit.hurtProgress >= 1) {
      unit.isHurt = false;
      unit.hurtProgress = 0;
    }
  }

  if (unit.hpAnimProgress < 1) {
    unit.hpAnimProgress += deltaTime / 300;
    if (unit.hpAnimProgress > 1) unit.hpAnimProgress = 1;
    unit.displayHp = unit.displayHp + (unit.hp - unit.displayHp) * Math.min(1, unit.hpAnimProgress);
  }
}

export function startAttackAnimation(unit: Unit, targetX: number, targetY: number): void {
  unit.isAttacking = true;
  unit.attackProgress = 0;
  unit.attackDirection = {
    x: targetX - unit.gridX,
    y: targetY - unit.gridY
  };
}

export function startHurtAnimation(unit: Unit): void {
  unit.isHurt = true;
  unit.hurtProgress = 0;
}

export function applyDamage(attacker: Unit, defender: Unit, skill?: Skill): number {
  let baseDamage: number;

  if (skill) {
    if (skill.selfDamagePercent) {
      const selfDamage = Math.floor(attacker.maxHp * skill.selfDamagePercent);
      attacker.hp = Math.max(0, attacker.hp - selfDamage);
      baseDamage = attacker.attack * 2;
    } else {
      baseDamage = skill.damage;
    }
  } else {
    baseDamage = attacker.attack;
  }

  const multiplier = 0.9 + Math.random() * 0.2;
  const finalDamage = Math.round(baseDamage * multiplier);
  defender.hp = Math.max(0, defender.hp - finalDamage);
  defender.hpAnimProgress = 0;

  return finalDamage;
}

export function getRenderPosition(
  unit: Unit,
  offsetX: number,
  offsetY: number,
  cellSize: number
): { x: number; y: number } {
  let baseX = offsetX + unit.gridX * cellSize + cellSize / 2;
  let baseY = offsetY + unit.gridY * cellSize + cellSize / 2;

  if (unit.isAttacking) {
    const progress = unit.attackProgress;
    const dashProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const dashDistance = cellSize * 0.4 * dashProgress;
    const dirLen = Math.sqrt(unit.attackDirection.x ** 2 + unit.attackDirection.y ** 2);
    if (dirLen > 0) {
      baseX += (unit.attackDirection.x / dirLen) * dashDistance;
      baseY += (unit.attackDirection.y / dirLen) * dashDistance;
    }
  }

  return { x: baseX, y: baseY };
}

export function renderUnit(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  isSelected: boolean,
  isTargetable: boolean
): void {
  const pos = getRenderPosition(unit, offsetX, offsetY, cellSize);
  const radius = cellSize * 0.35;

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#F1C40F';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (isTargetable) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (unit.isHurt) {
    const flashIntensity = Math.sin(unit.hurtProgress * Math.PI);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(231, 76, 60, ${0.5 + flashIntensity * 0.5})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(pos.x - radius * 0.3, pos.y - radius * 0.3, 0, pos.x, pos.y, radius);
  gradient.addColorStop(0, lightenColor(unit.color, 30));
  gradient.addColorStop(1, unit.color);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = darkenColor(unit.color, 30);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(radius * 0.9)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const icon = unit.profession === 'warrior' ? '⚔' : unit.profession === 'mage' ? '🔮' : '🏹';
  ctx.fillText(icon, pos.x, pos.y);

  const hpBarWidth = cellSize * 0.7;
  const hpBarHeight = 6;
  const hpBarX = pos.x - hpBarWidth / 2;
  const hpBarY = pos.y + radius + 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

  const displayPercent = unit.displayHp / unit.maxHp;
  const actualPercent = unit.hp / unit.maxHp;
  const barColor = getHpColor(actualPercent);

  ctx.fillStyle = barColor;
  ctx.fillRect(hpBarX, hpBarY, hpBarWidth * displayPercent, hpBarHeight);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`${Math.ceil(unit.displayHp)}/${unit.maxHp}`, pos.x, hpBarY + hpBarHeight + 12);

  if (!unit.isPlayer) {
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.arc(pos.x + radius, pos.y - radius, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('敌', pos.x + radius, pos.y - radius);
  }

  if (unit.hasMoved && unit.hasActed) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
