import type {
  Weapon,
  Skill,
  SkillSlot,
  DamageEvent,
  CombatStats,
  Target,
} from './types';

export const WEAPONS: Weapon[] = [
  {
    id: 'iron_sword',
    name: '铁剑',
    baseDamage: 25,
    attackSpeed: 1.5,
    attackRange: 80,
    color: '#95A5A6',
    description: '平衡的近战武器，攻速适中',
  },
  {
    id: 'great_sword',
    name: '巨剑',
    baseDamage: 60,
    attackSpeed: 0.6,
    attackRange: 100,
    color: '#7F8C8D',
    description: '高伤害慢攻速的重型武器',
  },
  {
    id: 'short_bow',
    name: '短弓',
    baseDamage: 20,
    attackSpeed: 2.0,
    attackRange: 200,
    color: '#A0522D',
    description: '快速射击的远程武器',
  },
  {
    id: 'long_bow',
    name: '长弓',
    baseDamage: 45,
    attackSpeed: 0.9,
    attackRange: 300,
    color: '#8B4513',
    description: '高伤害远程武器，射程远',
  },
  {
    id: 'fire_staff',
    name: '火焰法杖',
    baseDamage: 30,
    attackSpeed: 1.2,
    attackRange: 150,
    color: '#E74C3C',
    description: '增强火焰技能伤害的法杖',
  },
  {
    id: 'frost_staff',
    name: '冰霜法杖',
    baseDamage: 28,
    attackSpeed: 1.1,
    attackRange: 150,
    color: '#3498DB',
    description: '增强冰霜技能效果的法杖',
  },
];

export const SKILLS: Skill[] = [
  {
    id: 'fireball',
    name: '火球术',
    instantDamage: 40,
    dotDamage: 10,
    dotDuration: 3,
    cooldown: 5,
    effectRadius: 50,
    type: 'fire',
    color: '#E67E22',
    description: '范围火焰伤害40，附带灼烧3秒',
  },
  {
    id: 'meteor',
    name: '陨石术',
    instantDamage: 80,
    dotDamage: 15,
    dotDuration: 4,
    cooldown: 12,
    effectRadius: 80,
    type: 'fire',
    color: '#D35400',
    description: '大范围爆炸伤害80，灼烧4秒',
  },
  {
    id: 'frost_nova',
    name: '冰霜新星',
    instantDamage: 25,
    dotDamage: 0,
    dotDuration: 0,
    cooldown: 6,
    effectRadius: 70,
    type: 'ice',
    color: '#3498DB',
    description: '冻结目标2秒，伤害25',
  },
  {
    id: 'ice_shard',
    name: '冰锥术',
    instantDamage: 50,
    dotDamage: 5,
    dotDuration: 2,
    cooldown: 4,
    effectRadius: 40,
    type: 'ice',
    color: '#5DADE2',
    description: '冰锥伤害50，减速2秒',
  },
  {
    id: 'heal',
    name: '治愈光环',
    instantDamage: 0,
    dotDamage: 0,
    dotDuration: 0,
    cooldown: 8,
    effectRadius: 100,
    type: 'heal',
    color: '#27AE60',
    description: '无伤害，减少技能冷却20%',
  },
  {
    id: 'regen',
    name: '生命涌动',
    instantDamage: 0,
    dotDamage: 0,
    dotDuration: 0,
    cooldown: 15,
    effectRadius: 120,
    type: 'heal',
    color: '#2ECC71',
    description: '强力冷却缩减，减少40%冷却',
  },
];

export class CombatSystem {
  selectedWeaponId: string | null = null;
  skillSlots: SkillSlot[] = [
    { skillId: null, cooldownRemaining: 0 },
    { skillId: null, cooldownRemaining: 0 },
    { skillId: null, cooldownRemaining: 0 },
  ];

  private lastWeaponAttackTime = 0;
  private damageHistory: { time: number; amount: number }[] = [];
  private currentDps = 0;

  stats: CombatStats = {
    totalDamage: 0,
    killCount: 0,
    peakDps: 0,
    battleStartTime: Date.now(),
    skillUsageCounts: {},
  };

  constructor() {
    this.resetStats();
    SKILLS.forEach((s) => {
      this.stats.skillUsageCounts[s.id] = 0;
    });
  }

  resetStats(): void {
    this.stats = {
      totalDamage: 0,
      killCount: 0,
      peakDps: 0,
      battleStartTime: Date.now(),
      skillUsageCounts: {},
    };
    SKILLS.forEach((s) => {
      this.stats.skillUsageCounts[s.id] = 0;
    });
    this.damageHistory = [];
    this.currentDps = 0;
    this.lastWeaponAttackTime = 0;
    this.skillSlots.forEach((slot) => {
      slot.cooldownRemaining = 0;
    });
  }

  selectWeapon(weaponId: string): void {
    this.selectedWeaponId = weaponId;
  }

  getSelectedWeapon(): Weapon | null {
    return WEAPONS.find((w) => w.id === this.selectedWeaponId) || null;
  }

  assignSkillToSlot(skillId: string | null, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= this.skillSlots.length) return;
    this.skillSlots[slotIndex].skillId = skillId;
    this.skillSlots[slotIndex].cooldownRemaining = 0;
  }

  getSkillInSlot(slotIndex: number): Skill | null {
    const slot = this.skillSlots[slotIndex];
    if (!slot || !slot.skillId) return null;
    return SKILLS.find((s) => s.id === slot.skillId) || null;
  }

  getSlotCooldownPercent(slotIndex: number): number {
    const slot = this.skillSlots[slotIndex];
    if (!slot || !slot.skillId) return 0;
    const skill = SKILLS.find((s) => s.id === slot.skillId);
    if (!skill) return 0;
    if (slot.cooldownRemaining <= 0) return 0;
    return slot.cooldownRemaining / skill.cooldown;
  }

  canAttackWithWeapon(now: number): boolean {
    const weapon = this.getSelectedWeapon();
    if (!weapon) return false;
    const interval = 1000 / weapon.attackSpeed;
    return now - this.lastWeaponAttackTime >= interval;
  }

  calculateWeaponDamage(targets: Target[], clickX: number, clickY: number): DamageEvent[] {
    const weapon = this.getSelectedWeapon();
    if (!weapon) return [];

    const events: DamageEvent[] = [];
    for (const target of targets) {
      const dx = target.x - clickX;
      const dy = target.y - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= weapon.attackRange + target.radius) {
        events.push({
          targetId: target.id,
          amount: weapon.baseDamage,
          isDot: false,
        });
        break;
      }
    }
    this.lastWeaponAttackTime = performance.now();
    return events;
  }

  castSkill(
    slotIndex: number,
    castX: number,
    castY: number,
    targets: Target[]
  ): { events: DamageEvent[]; skill: Skill | null; cooldownReduced: boolean } {
    const skill = this.getSkillInSlot(slotIndex);
    const slot = this.skillSlots[slotIndex];
    if (!skill || !slot || slot.cooldownRemaining > 0) {
      return { events: [], skill: null, cooldownReduced: false };
    }

    this.stats.skillUsageCounts[skill.id] =
      (this.stats.skillUsageCounts[skill.id] || 0) + 1;

    const events: DamageEvent[] = [];
    let cooldownReduced = false;

    if (skill.type === 'heal') {
      cooldownReduced = true;
      const reduction = skill.id === 'regen' ? 0.4 : 0.2;
      this.skillSlots.forEach((s, i) => {
        if (i === slotIndex) return;
        if (s.cooldownRemaining > 0) {
          const originalSkill = SKILLS.find((sk) => sk.id === s.skillId);
          if (originalSkill) {
            s.cooldownRemaining = Math.max(0, s.cooldownRemaining - originalSkill.cooldown * reduction);
          }
        }
      });
    } else {
      for (const target of targets) {
        const dx = target.x - castX;
        const dy = target.y - castY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= skill.effectRadius + target.radius) {
          if (skill.instantDamage > 0) {
            events.push({
              targetId: target.id,
              amount: skill.instantDamage,
              isDot: false,
              skillId: skill.id,
            });
          }
          if (skill.dotDamage > 0 && skill.dotDuration > 0) {
            target.burning = true;
            target.burnTime = Math.max(target.burnTime, skill.dotDuration);
            target.burnDamage = skill.dotDamage;
          }
          if (skill.type === 'ice') {
            target.frozen = true;
            target.frozenTime = Math.max(target.frozenTime, 2);
          }
        }
      }
    }

    slot.cooldownRemaining = skill.cooldown;
    return { events, skill, cooldownReduced };
  }

  applyDamageEvents(events: DamageEvent[]): void {
    for (const e of events) {
      this.stats.totalDamage += e.amount;
      this.damageHistory.push({ time: performance.now(), amount: e.amount });
    }
  }

  incrementKillCount(): void {
    this.stats.killCount++;
  }

  update(dt: number): void {
    for (const slot of this.skillSlots) {
      if (slot.cooldownRemaining > 0) {
        slot.cooldownRemaining = Math.max(0, slot.cooldownRemaining - dt);
      }
    }

    const now = performance.now();
    const cutoff = now - 5000;
    while (this.damageHistory.length > 0 && this.damageHistory[0].time < cutoff) {
      this.damageHistory.shift();
    }
  }

  calculateDps(): number {
    const window = 5000;
    const total = this.damageHistory.reduce((sum, d) => sum + d.amount, 0);
    const dps = (total / window) * 1000;
    this.currentDps = dps;
    if (dps > this.stats.peakDps) {
      this.stats.peakDps = dps;
    }
    return dps;
  }

  getCurrentDps(): number {
    return this.currentDps;
  }

  calculatePowerScore(): number {
    const weapon = this.getSelectedWeapon();
    let score = 0;
    if (weapon) {
      score += weapon.baseDamage * weapon.attackSpeed * 10;
      score += weapon.attackRange * 0.5;
    }
    for (let i = 0; i < this.skillSlots.length; i++) {
      const skill = this.getSkillInSlot(i);
      if (skill) {
        const skillDps = (skill.instantDamage + skill.dotDamage * skill.dotDuration) / Math.max(skill.cooldown, 1);
        score += skillDps * 15;
      }
    }
    return Math.round(score);
  }

  getBattleDurationSeconds(): number {
    return Math.floor((Date.now() - this.stats.battleStartTime) / 1000);
  }
}
