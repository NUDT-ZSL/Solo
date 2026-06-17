import { create } from "zustand";
import type { ICharacter, IBoss, ActionResult, BattleStats, GamePhase } from "./types";
import { addCharacter, removeCharacter, createCharacter } from "./team-module";
import { createBoss, simulateRound } from "./combat-module";
import { calculateBattleStats } from "./stats-module";

const PRESET_IDS = [
  ["ironwall", "stoneward", "lightbringer", "mistweaver"],
  ["shadowblade", "flamearrow", "thunderaxe", "lightbringer"],
  ["ironwall", "lightbringer", "shadowblade", "flamearrow"],
  ["shadowblade", "flamearrow", "thunderaxe", "frostguard"],
];

interface GameState {
  phase: GamePhase;
  slots: (ICharacter | null)[];
  boss: IBoss;
  battleActions: ActionResult[];
  currentRound: number;
  battleStats: BattleStats | null;
  isBattleRunning: boolean;

  addChar: (characterId: string, slotIndex: number) => void;
  removeChar: (slotIndex: number) => void;
  applyPresetTeam: (presetIndex: number) => void;
  startBattle: () => void;
  processNextRound: () => void;
  resetToTeam: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "team",
  slots: [null, null, null, null],
  boss: createBoss(),
  battleActions: [],
  currentRound: 0,
  battleStats: null,
  isBattleRunning: false,

  addChar: (characterId, slotIndex) => {
    const { slots } = get();
    set({ slots: addCharacter(slots, characterId, slotIndex) });
  },

  removeChar: (slotIndex) => {
    const { slots } = get();
    set({ slots: removeCharacter(slots, slotIndex) });
  },

  applyPresetTeam: (presetIndex) => {
    const ids = PRESET_IDS[presetIndex];
    if (!ids) return;
    set({ slots: ids.map((id) => createCharacter(id)) });
  },

  startBattle: () => {
    const { slots } = get();
    const activeChars = slots.filter(Boolean) as ICharacter[];
    if (activeChars.length === 0) return;

    const resetChars = activeChars.map((c) => ({
      ...c,
      hp: c.maxHp,
      isAlive: true,
      currentCooldown: 0,
      tauntTurnsLeft: 0,
    }));

    const newSlots: (ICharacter | null)[] = [null, null, null, null];
    resetChars.forEach((c, i) => {
      newSlots[i] = c;
    });

    set({
      phase: "combat",
      boss: createBoss(),
      battleActions: [],
      currentRound: 0,
      isBattleRunning: true,
      battleStats: null,
      slots: newSlots,
    });
  },

  processNextRound: () => {
    const { slots, boss, battleActions, currentRound, isBattleRunning } = get();
    if (!isBattleRunning) return;

    const activeChars = slots.filter(Boolean) as ICharacter[];
    const aliveChars = activeChars.filter((c) => c.isAlive);

    if (aliveChars.length === 0 || !boss.isAlive) {
      const stats = calculateBattleStats(battleActions, activeChars, boss, !boss.isAlive, currentRound);
      set({ isBattleRunning: false, battleStats: stats, phase: "stats" });
      return;
    }

    const nextRound = currentRound + 1;
    const roundActions = simulateRound(activeChars, boss, nextRound);
    const allActions = [...battleActions, ...roundActions];

    const updatedSlots = slots.map((s) => {
      if (!s) return null;
      const found = activeChars.find((c) => c.id === s.id);
      return found ? { ...found } : s;
    });

    const updatedBoss = { ...boss };
    const aliveAfter = activeChars.filter((c) => c.isAlive);
    const battleOver = !updatedBoss.isAlive || aliveAfter.length === 0 || nextRound >= 15;

    if (battleOver) {
      const stats = calculateBattleStats(allActions, activeChars, updatedBoss, !updatedBoss.isAlive, nextRound);
      set({
        battleActions: allActions,
        currentRound: nextRound,
        slots: updatedSlots,
        boss: updatedBoss,
        isBattleRunning: false,
        battleStats: stats,
        phase: "stats",
      });
    } else {
      set({
        battleActions: allActions,
        currentRound: nextRound,
        slots: updatedSlots,
        boss: updatedBoss,
      });
    }
  },

  resetToTeam: () => {
    set({
      phase: "team",
      slots: [null, null, null, null],
      boss: createBoss(),
      battleActions: [],
      currentRound: 0,
      battleStats: null,
      isBattleRunning: false,
    });
  },
}));
