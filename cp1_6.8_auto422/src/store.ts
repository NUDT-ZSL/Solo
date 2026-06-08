import { create } from "zustand";
import type { PlantState, GrowthAction } from "@/types";
import { GrowthStage, STAGE_THRESHOLDS } from "@/types";
import * as api from "@/api/index";

const STORAGE_KEY = "plant-story-state";

interface PlantStore {
  plants: PlantState[];
  activePlantId: string | null;
  loading: boolean;
  animatingAction: GrowthAction | null;
  evolving: boolean;
  error: string | null;

  loadPlants: () => Promise<void>;
  selectPlant: (id: string) => void;
  addPlant: (name: string) => Promise<void>;
  removePlant: (id: string) => Promise<void>;
  performAction: (action: GrowthAction) => Promise<void>;
  checkDecay: () => Promise<void>;
  setAnimatingAction: (action: GrowthAction | null) => void;
  setEvolving: (v: boolean) => void;
  saveToLocal: () => void;
  loadFromLocal: () => boolean;
}

function computeFlowerColor(plant: PlantState): string {
  const total = plant.water + plant.nutrient + plant.light;
  if (total === 0) return "hsl(120, 60%, 55%)";
  const wR = plant.water / total;
  const nR = plant.nutrient / total;
  const lR = plant.light / total;
  const h = Math.round((wR * 200 + nR * 80 + lR * 45) % 360);
  const ratios = [wR, nR, lR];
  const maxDiff = Math.max(...ratios) - Math.min(...ratios);
  const s = Math.round(60 + maxDiff * 30);
  const l = Math.round(55 + (plant.energy / 200) * 15);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function computeFlowerShape(
  plant: PlantState
): "symmetric" | "spiral" {
  if (!plant.growthPath.length) return "symmetric";
  const waterCount = plant.growthPath.filter((a) => a === "water").length;
  if (waterCount > plant.growthPath.length / 3) return "spiral";
  return "symmetric";
}

function getNextStage(
  current: GrowthStage,
  totalAttrs: number
): GrowthStage | null {
  const stages = [
    GrowthStage.Seed,
    GrowthStage.Sprout,
    GrowthStage.Seedling,
    GrowthStage.Mature,
    GrowthStage.Flowering,
  ];
  for (let i = 0; i < stages.length - 1; i++) {
    if (current === stages[i] && totalAttrs >= STAGE_THRESHOLDS[stages[i + 1]]) {
      return stages[i + 1];
    }
  }
  return null;
}

export const usePlantStore = create<PlantStore>((set, get) => ({
  plants: [],
  activePlantId: null,
  loading: false,
  animatingAction: null,
  evolving: false,
  error: null,

  loadPlants: async () => {
    set({ loading: true });
    try {
      const plants = await api.fetchPlants();
      const loaded = get().loadFromLocal();
      if (loaded && get().plants.length > 0) {
        set({ loading: false });
        return;
      }
      set({
        plants,
        activePlantId: plants.length > 0 ? plants[0].id : null,
        loading: false,
      });
    } catch {
      const loaded = get().loadFromLocal();
      if (!loaded) {
        set({ loading: false });
      }
    }
  },

  selectPlant: (id) => set({ activePlantId: id }),

  addPlant: async (name) => {
    const { plants } = get();
    if (plants.length >= 5) {
      set({ error: "最多只能创建5株植物" });
      return;
    }
    try {
      const newPlant = await api.createPlant(name);
      set((s) => ({
        plants: [...s.plants, newPlant],
        activePlantId: newPlant.id,
        error: null,
      }));
      get().saveToLocal();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "创建失败";
      set({ error: msg });
    }
  },

  removePlant: async (id) => {
    try {
      await api.deletePlant(id);
      set((s) => {
        const plants = s.plants.filter((p) => p.id !== id);
        const activePlantId =
          s.activePlantId === id
            ? plants.length > 0
              ? plants[0].id
              : null
            : s.activePlantId;
        return { plants, activePlantId };
      });
      get().saveToLocal();
    } catch {
      set({ error: "删除失败" });
    }
  },

  performAction: async (action) => {
    const { activePlantId, plants } = get();
    if (!activePlantId) return;
    const plant = plants.find((p) => p.id === activePlantId);
    if (!plant || plant.stage === GrowthStage.Flowering) return;

    set({ animatingAction: action });

    const effects = {
      water: { attr: "water" as const, delta: 15, cost: 5 },
      nutrient: { attr: "nutrient" as const, delta: 15, cost: 5 },
      light: { attr: "light" as const, delta: 15, cost: 5 },
    };
    const eff = effects[action];

    set((s) => ({
      plants: s.plants.map((p) =>
        p.id === activePlantId
          ? {
              ...p,
              [eff.attr]: Math.min(100, p[eff.attr] + eff.delta),
              energy: Math.max(0, p.energy - eff.cost),
              lastInteraction: Date.now(),
              growthPath: [...p.growthPath, action],
            }
          : p
      ),
    }));

    const currentPlant = get().plants.find((p) => p.id === activePlantId)!;
    const totalAttrs =
      currentPlant.water + currentPlant.nutrient + currentPlant.light;
    const nextStage = getNextStage(currentPlant.stage, totalAttrs);

    if (nextStage !== null) {
      set({ evolving: true });
      set((s) => ({
        plants: s.plants.map((p) =>
          p.id === activePlantId
            ? {
                ...p,
                stage: nextStage,
                flowerColor:
                  nextStage === GrowthStage.Flowering
                    ? computeFlowerColor(p)
                    : p.flowerColor,
                flowerShape:
                  nextStage === GrowthStage.Flowering
                    ? computeFlowerShape(p)
                    : p.flowerShape,
              }
            : p
        ),
      }));
      setTimeout(() => set({ evolving: false }), 1500);
    }

    get().saveToLocal();

    try {
      await api.performAction(activePlantId, action);
    } catch {}

    setTimeout(() => set({ animatingAction: null }), 1200);
  },

  checkDecay: async () => {
    const { activePlantId } = get();
    if (!activePlantId) return;
    const now = Date.now();
    set((s) => ({
      plants: s.plants.map((p) => {
        if (p.id !== activePlantId) return p;
        const elapsed = now - p.lastInteraction;
        if (elapsed > 60000) {
          return {
            ...p,
            water: Math.max(0, p.water * 0.95),
            nutrient: Math.max(0, p.nutrient * 0.95),
            light: Math.max(0, p.light * 0.95),
            lastInteraction: now,
          };
        }
        return p;
      }),
    }));
    get().saveToLocal();

    try {
      await api.decayPlant(activePlantId);
    } catch {}
  },

  setAnimatingAction: (action) => set({ animatingAction: action }),
  setEvolving: (v) => set({ evolving: v }),

  saveToLocal: () => {
    const { plants, activePlantId } = get();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ plants, activePlantId })
      );
    } catch {}
  },

  loadFromLocal: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.plants && data.plants.length > 0) {
        set({
          plants: data.plants,
          activePlantId: data.activePlantId || data.plants[0].id,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
