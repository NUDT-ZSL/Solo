import type { Rarity } from '../types';

export type { Rarity };

export interface CharacterTemplate {
  id: string;
  name: string;
  rarity: Rarity;
  basePower: number;
  description: string;
  fragmentsRequired: number;
}

export interface CardFragment {
  id: string;
  characterId: string;
  characterName: string;
  rarity: Rarity;
  timestamp: number;
}

export interface Character {
  id: string;
  templateId: string;
  name: string;
  rarity: Rarity;
  level: number;
  power: number;
  description: string;
  unlockedAt: number;
}

export interface FragmentInventory {
  [characterId: string]: number;
}

export interface CardSystemState {
  fragments: FragmentInventory;
  characters: Character[];
  expCrystals: number;
  safeCellsCleared: number;
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#808080',
  rare: '#4169e1',
  epic: '#9932cc',
  legendary: '#ffd700'
};

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  { id: 'warrior_common', name: '新手战士', rarity: 'common', basePower: 50, description: '初出茅庐的战士，勇敢且忠诚。', fragmentsRequired: 5 },
  { id: 'archer_common', name: '森林弓手', rarity: 'common', basePower: 45, description: '来自深林的神射手，箭无虚发。', fragmentsRequired: 5 },
  { id: 'mage_common', name: '学徒法师', rarity: 'common', basePower: 55, description: '正在学习魔法的学徒，潜力无限。', fragmentsRequired: 5 },
  { id: 'knight_rare', name: '银甲骑士', rarity: 'rare', basePower: 120, description: '身披银甲的精英骑士，守护王国。', fragmentsRequired: 10 },
  { id: 'assassin_rare', name: '暗影刺客', rarity: 'rare', basePower: 130, description: '来无影去无踪的致命杀手。', fragmentsRequired: 10 },
  { id: 'priest_rare', name: '圣光牧师', rarity: 'rare', basePower: 110, description: '治愈之光的使者，庇佑队友。', fragmentsRequired: 10 },
  { id: 'berserker_epic', name: '狂战士', rarity: 'epic', basePower: 250, description: '越战越勇的狂战士，力大无穷。', fragmentsRequired: 15 },
  { id: 'necromancer_epic', name: '死灵法师', rarity: 'epic', basePower: 260, description: '操控亡灵的黑暗法师，令人胆寒。', fragmentsRequired: 15 },
  { id: 'paladin_epic', name: '圣骑士', rarity: 'epic', basePower: 240, description: '神圣力量的化身，正义的使者。', fragmentsRequired: 15 },
  { id: 'dragon_legendary', name: '龙族战士', rarity: 'legendary', basePower: 500, description: '拥有龙族血脉的传奇战士。', fragmentsRequired: 20 },
  { id: 'archmage_legendary', name: '大魔导师', rarity: 'legendary', basePower: 520, description: '掌握元素之力的顶级法师。', fragmentsRequired: 20 },
  { id: 'god_legendary', name: '神明使者', rarity: 'legendary', basePower: 480, description: '被神选中的人类，拥有神圣力量。', fragmentsRequired: 20 }
];

export function getRarityByChance(): Rarity {
  const rand = Math.random();
  if (rand < 0.60) return 'common';
  if (rand < 0.85) return 'rare';
  if (rand < 0.97) return 'epic';
  return 'legendary';
}

export function getRandomFragment(): CardFragment | null {
  const dropChance = 0.08;
  if (Math.random() > dropChance) return null;

  const rarity = getRarityByChance();
  const templates = CHARACTER_TEMPLATES.filter(t => t.rarity === rarity);
  const template = templates[Math.floor(Math.random() * templates.length)];

  return {
    id: `frag_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    characterId: template.id,
    characterName: template.name,
    rarity,
    timestamp: Date.now()
  };
}

export function addFragment(state: CardSystemState, fragment: CardFragment): { state: CardSystemState; unlocked?: Character } {
  const newFragments = { ...state.fragments };
  newFragments[fragment.characterId] = (newFragments[fragment.characterId] || 0) + 1;

  const template = CHARACTER_TEMPLATES.find(t => t.id === fragment.characterId);
  if (!template) {
    return { state: { ...state, fragments: newFragments } };
  }

  const alreadyUnlocked = state.characters.some(c => c.templateId === template.id);
  const hasEnoughFragments = newFragments[fragment.characterId] >= template.fragmentsRequired;

  let unlocked: Character | undefined;
  const newCharacters = [...state.characters];

  if (!alreadyUnlocked && hasEnoughFragments) {
    unlocked = {
      id: `char_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      templateId: template.id,
      name: template.name,
      rarity: template.rarity,
      level: 1,
      power: template.basePower,
      description: template.description,
      unlockedAt: Date.now()
    };
    newCharacters.push(unlocked);
    newFragments[fragment.characterId] -= template.fragmentsRequired;
  }

  return {
    state: {
      ...state,
      fragments: newFragments,
      characters: newCharacters
    },
    unlocked
  };
}

export function addExpCrystals(state: CardSystemState, safeCells: number): { state: CardSystemState; crystalsGained: number } {
  const totalSafeCells = state.safeCellsCleared + safeCells;
  const newCrystals = Math.floor(totalSafeCells / 20) - Math.floor(state.safeCellsCleared / 20);
  return {
    state: {
      ...state,
      safeCellsCleared: totalSafeCells % 20,
      expCrystals: state.expCrystals + newCrystals
    },
    crystalsGained: newCrystals
  };
}

export function levelUpCharacter(state: CardSystemState, characterId: string): { state: CardSystemState; success: boolean; newLevel?: number; powerGain?: number } {
  if (state.expCrystals < 1) {
    return { state, success: false };
  }

  const character = state.characters.find(c => c.id === characterId);
  if (!character) {
    return { state, success: false };
  }

  const newCharacters = state.characters.map(c => {
    if (c.id === characterId) {
      return {
        ...c,
        level: c.level + 1,
        power: c.power + 20
      };
    }
    return c;
  });

  return {
    state: {
      ...state,
      characters: newCharacters,
      expCrystals: state.expCrystals - 1
    },
    success: true,
    newLevel: character.level + 1,
    powerGain: 20
  };
}

export function calculateTeamPower(characters: Character[]): number {
  return characters.reduce((sum, c) => sum + c.power, 0);
}

export function getCharacterTemplate(templateId: string): CharacterTemplate | undefined {
  return CHARACTER_TEMPLATES.find(t => t.id === templateId);
}

export function createInitialCardState(): CardSystemState {
  return {
    fragments: {},
    characters: [],
    expCrystals: 0,
    safeCellsCleared: 0
  };
}
