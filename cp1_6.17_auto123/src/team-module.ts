import type { ICharacter, ISkill, PresetTeam, CharacterClass } from "./types";

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
    skill: { name: "嘲讽", description: "强制敌人攻击自己2回合", effect: "taunt", cooldown: 3 },
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
    skill: { name: "嘲讽", description: "强制敌人攻击自己2回合", effect: "taunt", cooldown: 3 },
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
    skill: { name: "嘲讽", description: "强制敌人攻击自己2回合", effect: "taunt", cooldown: 3 },
  },
];

export function getCharacterPool(): Omit<ICharacter, "isAlive" | "currentCooldown" | "tauntTurnsLeft">[] {
  return CHARACTER_POOL;
}

export function createCharacter(id: string): ICharacter | null {
  const template = CHARACTER_POOL.find((c) => c.id === id);
  if (!template) return null;
  return {
    ...template,
    isAlive: true,
    currentCooldown: 0,
    tauntTurnsLeft: 0,
  };
}

export const PRESET_TEAMS: PresetTeam[] = [
  {
    name: "双奶双T",
    description: "铁壁+石卫+光祈+雾织，极致生存",
    characterIds: ["ironwall", "stoneward", "lightbringer", "mistweaver"],
  },
  {
    name: "三输出一治疗",
    description: "影刃+焰矢+雷斧+光祈，暴力输出",
    characterIds: ["shadowblade", "flamearrow", "thunderaxe", "lightbringer"],
  },
  {
    name: "均衡队",
    description: "铁壁+光祈+影刃+焰矢，攻守兼备",
    characterIds: ["ironwall", "lightbringer", "shadowblade", "flamearrow"],
  },
  {
    name: "菜刀队",
    description: "影刃+焰矢+雷斧+霜守，全物理猛攻",
    characterIds: ["shadowblade", "flamearrow", "thunderaxe", "frostguard"],
  },
];

export function addCharacter(
  slots: (ICharacter | null)[],
  characterId: string,
  slotIndex: number
): (ICharacter | null)[] {
  if (slotIndex < 0 || slotIndex >= 4) return slots;
  const existingIds = slots.filter(Boolean).map((c) => c!.id);
  if (existingIds.includes(characterId)) return slots;
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
  return preset.characterIds.map((id) => createCharacter(id));
}

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
