import { create } from 'zustand';
import type { Tower, Enemy, Particle, Projectile, RuneEffect, TowerType } from './types';
import { GRID_WALKABLE, TOWER_STATS, MAX_WAVES } from './types';

interface GameState {
  gold: number;
  lives: number;
  currentWave: number;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  towers: Tower[];
  enemies: Enemy[];
  particles: Particle[];
  projectiles: Projectile[];
  runeEffects: RuneEffect[];
  waveInProgress: boolean;
  selectedTowerType: TowerType | null;
  selectedPlacedTower: Tower | null;
  waveAnnouncement: string;
  waveAnnouncementTimer: number;
  showUpgradePanel: boolean;
  longPressMenuPos: { gx: number; gy: number } | null;
  startWave: () => void;
  setSelectedTowerType: (t: TowerType | null) => void;
  setSelectedPlacedTower: (t: Tower | null) => void;
  togglePause: () => void;
  placeTower: (type: TowerType, gx: number, gy: number) => boolean;
  upgradeTower: (towerId: string) => boolean;
  sellTower: (towerId: string) => void;
  setShowUpgradePanel: (v: boolean) => void;
  setLongPressMenuPos: (pos: { gx: number; gy: number } | null) => void;
  resetGame: () => void;
}

const INITIAL_GOLD = 200;
const INITIAL_LIVES = 20;

export const useGameStore = create<GameState>((set, get) => ({
  gold: INITIAL_GOLD,
  lives: INITIAL_LIVES,
  currentWave: 0,
  isPaused: false,
  isGameOver: false,
  isVictory: false,
  towers: [],
  enemies: [],
  particles: [],
  projectiles: [],
  runeEffects: [],
  waveInProgress: false,
  selectedTowerType: null,
  selectedPlacedTower: null,
  waveAnnouncement: '',
  waveAnnouncementTimer: 0,
  showUpgradePanel: false,
  longPressMenuPos: null,

  startWave: () => {
    const state = get();
    if (state.waveInProgress || state.isGameOver || state.isVictory) return;
    const nextWave = state.currentWave + 1;
    if (nextWave > MAX_WAVES) return;
    set({
      currentWave: nextWave,
      waveInProgress: true,
      waveAnnouncement: `第 ${nextWave} 波来袭！`,
      waveAnnouncementTimer: 3000,
    });
  },

  setSelectedTowerType: (t) => set({ selectedTowerType: t, selectedPlacedTower: null, showUpgradePanel: false }),
  setSelectedPlacedTower: (t) => set({ selectedPlacedTower: t, selectedTowerType: null, showUpgradePanel: t !== null }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setShowUpgradePanel: (v) => set({ showUpgradePanel: v }),
  setLongPressMenuPos: (pos) => set({ longPressMenuPos: pos }),

  placeTower: (type, gx, gy) => {
    const state = get();
    if (gx < 0 || gx >= GRID_WALKABLE[0].length || gy < 0 || gy >= GRID_WALKABLE.length) return false;
    if (!GRID_WALKABLE[gy][gx]) return false;
    if (state.towers.some((t) => t.gridX === gx && t.gridY === gy)) return false;
    const stats = TOWER_STATS[type][0];
    if (state.gold < stats.cost) return false;
    const tower: Tower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      gridX: gx,
      gridY: gy,
      level: 1,
      attackCooldown: stats.attackInterval,
      lastAttackTime: 0,
      targetId: null,
      placeAnimProgress: 0,
      upgradeAnimProgress: 0,
      attackAnimProgress: 0,
      attackTargetPos: null,
    };
    set({ gold: state.gold - stats.cost, towers: [...state.towers, tower], selectedTowerType: null });
    return true;
  },

  upgradeTower: (towerId) => {
    const state = get();
    const tower = state.towers.find((t) => t.id === towerId);
    if (!tower || tower.level >= 3) return false;
    const nextStats = TOWER_STATS[tower.type][tower.level];
    if (state.gold < nextStats.cost) return false;
    const updated = state.towers.map((t) =>
      t.id === towerId
        ? { ...t, level: t.level + 1, attackCooldown: nextStats.attackInterval, upgradeAnimProgress: 1 }
        : t
    );
    set({ gold: state.gold - nextStats.cost, towers: updated });
    return true;
  },

  sellTower: (towerId) => {
    const state = get();
    const tower = state.towers.find((t) => t.id === towerId);
    if (!tower) return;
    let totalSpent = 0;
    for (let i = 0; i < tower.level; i++) {
      totalSpent += TOWER_STATS[tower.type][i].cost;
    }
    const refund = Math.floor(totalSpent * 0.6);
    set({
      gold: state.gold + refund,
      towers: state.towers.filter((t) => t.id !== towerId),
      selectedPlacedTower: null,
      showUpgradePanel: false,
    });
  },

  resetGame: () => set({
    gold: INITIAL_GOLD,
    lives: INITIAL_LIVES,
    currentWave: 0,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    towers: [],
    enemies: [],
    particles: [],
    projectiles: [],
    runeEffects: [],
    waveInProgress: false,
    selectedTowerType: null,
    selectedPlacedTower: null,
    waveAnnouncement: '',
    waveAnnouncementTimer: 0,
    showUpgradePanel: false,
    longPressMenuPos: null,
  }),
}));
