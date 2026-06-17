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
  damageRatio: number;
  healRatio: number;
  takenRatio: number;
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

export interface PresetTeam {
  name: string;
  description: string;
  characterIds: string[];
}

const CHARACTER_POOL: Omit<ICharacter, "isAlive" | "currentCooldown" | "tauntTurnsLeft">[] = [
  {
    id: "ironwall",
    name: "铁壁",
    class: "tank",
    hp: 300,
    maxHp: 300,
    atk: 12,
    def: 20,
    speed: 8,
    skill: { name: "嘲讽", description: "强制敌人攻击自己2回合", effect: "taunt", cooldown: 2 },
  },
  {
    id: "stoneward",
    name: "石卫",
    class: "tank",
    hp: 280,
    maxHp: 280,
    atk: 14,
    def: 18,
    speed: 9,
    skill: { name: "嘲讽", description: "强制敌人攻击自己2回合", effect: "taunt", cooldown: 2 },
  },
  {
    id: "lightbringer",
    name: "光祈",
    class: "healer",
    hp: 180,
    maxHp: 180,
    atk: 10,
    def: 8,
    speed: 12,
    skill: { name: "回复", description: "为血量最低队友回复30%生命", effect: "heal", cooldown: 2 },
  },
  {
    id: "mistweaver",
    name: "雾织",
    class: "healer",
    hp: 160,
    maxHp: 160,
    atk: 10,
    def: 7,
    speed: 14,
    skill: { name: "回复", description: "为血量最低队友回复30%生命", effect: "heal", cooldown: 2 },
  },
  {
    id: "shadowblade",
    name: "影刃",
    class: "dps",
    hp: 140,
    maxHp: 140,
    atk: 28,
    def: 6,
    speed: 16,
    skill: { name: "暴击", description: "本次攻击伤害翻倍", effect: "crit", cooldown: 2 },
  },
  {
    id: "flamearrow",
    name: "焰矢",
    class: "dps",
    hp: 120,
    maxHp: 120,
    atk: 30,
    def: 5,
    speed: 18,
    skill: { name: "暴击", description: "本次攻击伤害翻倍", effect: "crit", cooldown: 2 },
  },
  {
    id: "thunderaxe",
    name: "雷斧",
    class: "dps",
    hp: 160,
    maxHp: 160,
    atk: 26,
    def: 8,
    speed: 13,
    skill: { name: "暴击", description: "本次攻击伤害翻倍", effect: "crit", cooldown: 2 },
  },
  {
    id: "frostguard",
    name: "霜守",
    class: "tank",
    hp: 260,
    maxHp: 260,
    atk: 15,
    def: 16,
    speed: 10,
    skill: { name: "嘲讽", description: "强制敌人攻击自己2回合", effect: "taunt", cooldown: 2 },
  },
];

export const PRESET_TEAMS: PresetTeam[] = [
  { name: "双奶双T", description: "铁壁+石卫+光祈+雾织，极致生存", characterIds: ["ironwall", "stoneward", "lightbringer", "mistweaver"] },
  { name: "三输出一治疗", description: "影刃+焰矢+雷斧+光祈，暴力输出", characterIds: ["shadowblade", "flamearrow", "thunderaxe", "lightbringer"] },
  { name: "均衡队", description: "铁壁+光祈+影刃+焰矢，攻守兼备", characterIds: ["ironwall", "lightbringer", "shadowblade", "flamearrow"] },
  { name: "菜刀队", description: "影刃+焰矢+雷斧+霜守，全物理猛攻", characterIds: ["shadowblade", "flamearrow", "thunderaxe", "frostguard"] },
];

export const CLASS_COLORS: Record<CharacterClass, string> = {
  tank: "#ff6b6b",
  healer: "#48dbfb",
  dps: "#feca57",
};

export const CLASS_ICONS: Record<CharacterClass, string> = {
  tank: "🛡️",
  healer: "➕",
  dps: "⚔️",
};

export function getCharacterPool(): Omit<ICharacter, "isAlive" | "currentCooldown" | "tauntTurnsLeft">[] {
  return CHARACTER_POOL;
}

export function createCharacter(id: string): ICharacter | null {
  const template = CHARACTER_POOL.find((c) => c.id === id);
  if (!template) return null;
  return { ...template, isAlive: true, currentCooldown: 0, tauntTurnsLeft: 0 };
}

function getSelectedIds(slots: (ICharacter | null)[]): Set<string> {
  const ids = new Set<string>();
  for (const c of slots) {
    if (c && c.id) {
      ids.add(c.id);
    }
  }
  return ids;
}

function hasDuplicateIds(ids: string[]): boolean {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
}

export function addCharacter(slots: (ICharacter | null)[], characterId: string, slotIndex: number): (ICharacter | null)[] {
  if (slotIndex < 0 || slotIndex >= 4) return slots;
  if (!characterId) return slots;

  const selectedIds = getSelectedIds(slots);
  if (selectedIds.has(characterId)) return slots;

  const character = createCharacter(characterId);
  if (!character) return slots;

  const newSlots = [...slots];
  newSlots[slotIndex] = character;
  return newSlots;
}

export function removeCharacter(slots: (ICharacter | null)[], slotIndex: number): (ICharacter | null)[] {
  if (slotIndex < 0 || slotIndex >= 4) return slots;
  const newSlots = [...slots];
  newSlots[slotIndex] = null;
  return newSlots;
}

export function applyPreset(preset: PresetTeam): (ICharacter | null)[] {
  if (!preset || !preset.characterIds || hasDuplicateIds(preset.characterIds)) {
    return [null, null, null, null];
  }

  const uniqueIds = Array.from(new Set(preset.characterIds));
  const characters = uniqueIds.map((id) => createCharacter(id)).filter(Boolean) as ICharacter[];

  const result: (ICharacter | null)[] = [null, null, null, null];
  characters.forEach((c, i) => {
    if (i < 4) result[i] = c;
  });
  return result;
}

export function resetCharacterForBattle(char: ICharacter): ICharacter {
  return { ...char, hp: char.maxHp, isAlive: true, currentCooldown: 0, tauntTurnsLeft: 0 };
}
