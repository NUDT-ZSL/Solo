export type CharacterClass = "tank" | "healer" | "dps";

export interface ISkill {
  name: string;
  description: string;
  effect: "taunt" | "heal" | "crit";
  cooldown: number;
}

export interface ICharacter {
  id: string;
  name: string;
  class: CharacterClass;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  skill: ISkill;
  currentCooldown: number;
  isAlive: boolean;
  tauntTurnsLeft: number;
}

export interface ActionResult {
  round: number;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  targetName: string;
  value: number;
  isCrit: boolean;
  isHeal: boolean;
}

export interface CharacterContribution {
  characterId: string;
  characterName: string;
  class: CharacterClass;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
}

export interface BattleStats {
  totalRounds: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  isVictory: boolean;
  characterContributions: CharacterContribution[];
}

export type GamePhase = "team" | "combat" | "stats";

export interface IBoss {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  isAlive: boolean;
}

export interface PresetTeam {
  name: string;
  description: string;
  characterIds: string[];
}
