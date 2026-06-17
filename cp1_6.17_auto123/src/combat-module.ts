import type { ICharacter, IBoss, ActionResult } from "./team-module";

const BOSS: IBoss = {
  id: "boss",
  name: "暗影领主",
  hp: 500,
  maxHp: 500,
  atk: 20,
  def: 10,
  speed: 11,
  isAlive: true,
};

export function createBoss(): IBoss {
  return { ...BOSS, hp: BOSS.maxHp, isAlive: true };
}

function calcDamage(atk: number, def: number): number {
  return Math.max(1, atk - def);
}

function getAliveAllies(characters: ICharacter[]): ICharacter[] {
  return characters.filter((c) => c.isAlive);
}

function getLowestHpAlly(characters: ICharacter[]): ICharacter | null {
  const alive = getAliveAllies(characters);
  if (alive.length === 0) return null;
  return alive.reduce((min, c) => (c.hp < min.hp ? c : min), alive[0]);
}

function getTauntingCharacter(characters: ICharacter[]): ICharacter | null {
  const alive = getAliveAllies(characters);
  const taunting = alive.filter((c) => c.tauntTurnsLeft > 0);
  if (taunting.length === 0) return null;
  return taunting[0];
}

function resetCharacterCooldowns(character: ICharacter): void {
  character.currentCooldown = 0;
  character.tauntTurnsLeft = 0;
}

function decrementAllCooldowns(characters: ICharacter[]): void {
  for (const c of characters) {
    const wasDead = !c.isAlive;
    const willBeRevived = wasDead && c.hp > 0;

    if (willBeRevived) {
      c.isAlive = true;
      resetCharacterCooldowns(c);
      continue;
    }

    if (!c.isAlive) {
      resetCharacterCooldowns(c);
      continue;
    }

    if (c.currentCooldown > 0) {
      c.currentCooldown -= 1;
    }
    if (c.tauntTurnsLeft > 0) {
      c.tauntTurnsLeft -= 1;
    }
  }
}

function executeCharacterAction(
  character: ICharacter,
  characters: ICharacter[],
  boss: IBoss
): ActionResult[] {
  const actions: ActionResult[] = [];

  const canUseSkill = character.currentCooldown === 0;

  if (canUseSkill && character.skill.effect === "crit") {
    character.currentCooldown = character.skill.cooldown;
    const baseDmg = calcDamage(character.atk, boss.def);
    const critDmg = baseDmg * 2;
    boss.hp = Math.max(0, boss.hp - critDmg);
    if (boss.hp <= 0) boss.isAlive = false;
    actions.push({
      round: 0,
      actorId: character.id,
      actorName: character.name,
      action: character.skill.name,
      targetId: boss.id,
      targetName: boss.name,
      value: critDmg,
      isCrit: true,
      isHeal: false,
    });
  } else if (canUseSkill && character.skill.effect === "heal") {
    character.currentCooldown = character.skill.cooldown;
    const target = getLowestHpAlly(characters);
    if (target) {
      const healAmount = Math.floor(target.maxHp * 0.3);
      target.hp = Math.min(target.maxHp, target.hp + healAmount);
      actions.push({
        round: 0,
        actorId: character.id,
        actorName: character.name,
        action: character.skill.name,
        targetId: target.id,
        targetName: target.name,
        value: healAmount,
        isCrit: false,
        isHeal: true,
      });
    } else {
      const baseDmg = calcDamage(character.atk, boss.def);
      boss.hp = Math.max(0, boss.hp - baseDmg);
      if (boss.hp <= 0) boss.isAlive = false;
      actions.push({
        round: 0,
        actorId: character.id,
        actorName: character.name,
        action: "普通攻击",
        targetId: boss.id,
        targetName: boss.name,
        value: baseDmg,
        isCrit: false,
        isHeal: false,
      });
    }
  } else if (canUseSkill && character.skill.effect === "taunt") {
    character.currentCooldown = character.skill.cooldown;
    character.tauntTurnsLeft = 2;
    const baseDmg = calcDamage(character.atk, boss.def);
    boss.hp = Math.max(0, boss.hp - baseDmg);
    if (boss.hp <= 0) boss.isAlive = false;
    actions.push({
      round: 0,
      actorId: character.id,
      actorName: character.name,
      action: character.skill.name,
      targetId: boss.id,
      targetName: boss.name,
      value: baseDmg,
      isCrit: false,
      isHeal: false,
    });
  } else {
    const baseDmg = calcDamage(character.atk, boss.def);
    boss.hp = Math.max(0, boss.hp - baseDmg);
    if (boss.hp <= 0) boss.isAlive = false;
    actions.push({
      round: 0,
      actorId: character.id,
      actorName: character.name,
      action: "普通攻击",
      targetId: boss.id,
      targetName: boss.name,
      value: baseDmg,
      isCrit: false,
      isHeal: false,
    });
  }

  return actions;
}

function executeBossAction(boss: IBoss, characters: ICharacter[]): ActionResult[] {
  const actions: ActionResult[] = [];
  const alive = getAliveAllies(characters);
  if (alive.length === 0) return actions;

  let target: ICharacter;
  const taunting = getTauntingCharacter(characters);
  if (taunting) {
    target = taunting;
  } else {
    target = alive[Math.floor(Math.random() * alive.length)];
  }

  const dmg = calcDamage(boss.atk, target.def);
  target.hp = Math.max(0, target.hp - dmg);
  if (target.hp <= 0) target.isAlive = false;

  actions.push({
    round: 0,
    actorId: boss.id,
    actorName: boss.name,
    action: "普通攻击",
    targetId: target.id,
    targetName: target.name,
    value: dmg,
    isCrit: false,
    isHeal: false,
  });

  return actions;
}

export interface BattleResult {
  actions: ActionResult[];
  characters: ICharacter[];
  boss: IBoss;
  isVictory: boolean;
  totalRounds: number;
}

export function simulateRound(
  characters: ICharacter[],
  boss: IBoss,
  roundNumber: number
): ActionResult[] {
  const roundActions: ActionResult[] = [];

  decrementAllCooldowns(characters);

  const allActors: { entity: ICharacter | IBoss; speed: number; isBoss: boolean }[] = [];

  for (const c of characters) {
    if (c.isAlive) {
      allActors.push({ entity: c, speed: c.speed, isBoss: false });
    }
  }
  if (boss.isAlive) {
    allActors.push({ entity: boss, speed: boss.speed, isBoss: true });
  }

  allActors.sort((a, b) => b.speed - a.speed);

  for (const actor of allActors) {
    if (actor.isBoss) {
      const b = actor.entity as IBoss;
      if (!b.isAlive) continue;
      const bossActions = executeBossAction(b, characters);
      roundActions.push(...bossActions);
    } else {
      const c = actor.entity as ICharacter;
      if (!c.isAlive) continue;
      const charActions = executeCharacterAction(c, characters, boss);
      roundActions.push(...charActions);
    }

    if (!boss.isAlive || getAliveAllies(characters).length === 0) break;
  }

  return roundActions.map((a) => ({ ...a, round: roundNumber }));
}
