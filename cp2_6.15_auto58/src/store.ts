import { create } from 'zustand';
import { BranchData, generatePlant, getBranchAndChildren } from './utils/lSystem';
import { generateRandomTheme } from './utils/color';

interface ColorTransition {
  from: { trunkBottom: string; trunkTop: string; leaf: string };
  to: { trunkBottom: string; trunkTop: string; leaf: string };
  progress: number;
  active: boolean;
}

interface PlantState {
  branchAngle: number;
  recursionDepth: number;
  randomStrength: number;

  trunkColorBottom: string;
  trunkColorTop: string;
  leafColor: string;

  targetTrunkBottom: string;
  targetTrunkTop: string;
  targetLeaf: string;
  colorTransition: ColorTransition;

  branches: BranchData[];
  branchCount: number;
  generation: number;

  isGrowing: boolean;
  isPruning: boolean;

  growthStartTime: number;

  setBranchAngle: (angle: number) => void;
  setRecursionDepth: (depth: number) => void;
  setRandomStrength: (strength: number) => void;

  regeneratePlant: () => void;
  startGrowthAnimation: () => void;
  updateGrowthProgress: (currentTime: number) => void;

  pruneBranch: (branchId: string) => void;
  updatePruneProgress: (branchId: string, progress: number) => void;
  removePrunedBranches: (branchId: string) => void;

  startColorTransition: () => void;
  updateColorTransition: (deltaTime: number) => void;
}

const DEFAULT_TRUNK_BOTTOM = '#8d6e63';
const DEFAULT_TRUNK_TOP = '#a1887f';
const DEFAULT_LEAF = '#66bb6a';

export const usePlantStore = create<PlantState>((set, get) => {
  const initialBranches = generatePlant({
    maxDepth: 5,
    branchAngle: 30,
    randomStrength: 0.1,
  });

  return {
    branchAngle: 30,
    recursionDepth: 5,
    randomStrength: 0.1,

    trunkColorBottom: DEFAULT_TRUNK_BOTTOM,
    trunkColorTop: DEFAULT_TRUNK_TOP,
    leafColor: DEFAULT_LEAF,

    targetTrunkBottom: DEFAULT_TRUNK_BOTTOM,
    targetTrunkTop: DEFAULT_TRUNK_TOP,
    targetLeaf: DEFAULT_LEAF,

    colorTransition: {
      from: { trunkBottom: DEFAULT_TRUNK_BOTTOM, trunkTop: DEFAULT_TRUNK_TOP, leaf: DEFAULT_LEAF },
      to: { trunkBottom: DEFAULT_TRUNK_BOTTOM, trunkTop: DEFAULT_TRUNK_TOP, leaf: DEFAULT_LEAF },
      progress: 1,
      active: false,
    },

    branches: initialBranches,
    branchCount: initialBranches.length,
    generation: 0,

    isGrowing: false,
    isPruning: false,
    growthStartTime: 0,

    setBranchAngle: (angle: number) => {
      set({ branchAngle: angle });
      get().regeneratePlant();
    },

    setRecursionDepth: (depth: number) => {
      set({ recursionDepth: depth });
      get().regeneratePlant();
    },

    setRandomStrength: (strength: number) => {
      set({ randomStrength: strength });
      get().regeneratePlant();
    },

    regeneratePlant: () => {
      const { recursionDepth, branchAngle, randomStrength } = get();
      const branches = generatePlant({
        maxDepth: recursionDepth,
        branchAngle,
        randomStrength,
      });

      set({
        branches,
        branchCount: branches.length,
        generation: get().generation + 1,
      });

      get().startGrowthAnimation();
    },

    startGrowthAnimation: () => {
      set({
        isGrowing: true,
        growthStartTime: performance.now(),
        branches: get().branches.map((b) => ({
          ...b,
          growProgress: 0,
          opacity: 0,
          pruneProgress: 0,
          isPruned: false,
        })),
      });
    },

    updateGrowthProgress: (currentTime: number) => {
      const { growthStartTime, isGrowing, branches } = get();
      if (!isGrowing) return;

      const elapsed = (currentTime - growthStartTime) / 1000;
      const totalDuration = 1.5;
      const growDuration = 0.8;

      let allComplete = true;

      const updatedBranches = branches.map((branch) => {
        const effectiveTime = Math.max(0, elapsed - branch.growDelay);
        if (effectiveTime <= 0) {
          allComplete = false;
          return branch;
        }

        const rawProgress = Math.min(1, effectiveTime / growDuration);
        const easedProgress = 1 - Math.pow(1 - rawProgress, 3);

        if (rawProgress < 1) {
          allComplete = false;
        }

        return {
          ...branch,
          growProgress: easedProgress,
          opacity: rawProgress,
        };
      });

      set({ branches: updatedBranches });

      if (allComplete || elapsed >= totalDuration) {
        set({
          isGrowing: false,
          branches: updatedBranches.map((b) => ({
            ...b,
            growProgress: 1,
            opacity: 1,
          })),
        });
      }
    },

    pruneBranch: (branchId: string) => {
      const branchesToPrune = getBranchAndChildren(branchId, get().branches);
      const branchIds = new Set(branchesToPrune.map((b) => b.id));

      set({
        isPruning: true,
        branches: get().branches.map((b) =>
          branchIds.has(b.id) ? { ...b, isPruned: true, pruneProgress: 0 } : b
        ),
      });
    },

    updatePruneProgress: (branchId: string, progress: number) => {
      const branchesToPrune = getBranchAndChildren(branchId, get().branches);
      const branchMap = new Map(branchesToPrune.map((b) => [b.id, b]));
      const maxLevel = Math.max(...branchesToPrune.map((b) => b.level));

      const updatedBranches = get().branches.map((b) => {
        if (b.isPruned && branchMap.has(b.id)) {
          const levelDelay = (maxLevel - b.level) * 0.1;
          const adjustedProgress = Math.max(0, Math.min(1, (progress - levelDelay) / (1 - levelDelay)));
          const easedProgress = adjustedProgress * adjustedProgress;
          return { ...b, pruneProgress: easedProgress };
        }
        return b;
      });

      set({ branches: updatedBranches });
    },

    removePrunedBranches: (branchId: string) => {
      const branchesToPrune = getBranchAndChildren(branchId, get().branches);
      const branchIds = new Set(branchesToPrune.map((b) => b.id));

      const remainingBranches = get().branches.filter((b) => !branchIds.has(b.id));

      const updateParentChildren = (branches: BranchData[]): BranchData[] => {
        return branches.map((b) => ({
          ...b,
          children: b.children.filter((childId) => !branchIds.has(childId)),
        }));
      };

      set({
        branches: updateParentChildren(remainingBranches),
        branchCount: remainingBranches.length,
        isPruning: false,
      });
    },

    startColorTransition: () => {
      const newTheme = generateRandomTheme();
      const { trunkColorBottom, trunkColorTop, leafColor } = get();

      set({
        targetTrunkBottom: newTheme.trunkBottom,
        targetTrunkTop: newTheme.trunkTop,
        targetLeaf: newTheme.leaf,
        colorTransition: {
          from: {
            trunkBottom: trunkColorBottom,
            trunkTop: trunkColorTop,
            leaf: leafColor,
          },
          to: {
            trunkBottom: newTheme.trunkBottom,
            trunkTop: newTheme.trunkTop,
            leaf: newTheme.leaf,
          },
          progress: 0,
          active: true,
        },
      });
    },

    updateColorTransition: (deltaTime: number) => {
      const { colorTransition } = get();
      if (!colorTransition.active) return;

      const duration = 1.2;
      const progressIncrement = deltaTime / duration;
      const newProgress = Math.min(1, colorTransition.progress + progressIncrement);

      const t = newProgress < 0.5 ? 2 * newProgress * newProgress : 1 - Math.pow(-2 * newProgress + 2, 2) / 2;

      const interpolate = (from: string, to: string, t: number): string => {
        const parseHex = (hex: string) => ({
          r: parseInt(hex.slice(1, 3), 16) / 255,
          g: parseInt(hex.slice(3, 5), 16) / 255,
          b: parseInt(hex.slice(5, 7), 16) / 255,
        });

        const rgbToHex = (r: number, g: number, b: number): string => {
          const toHex = (n: number) =>
            Math.round(n * 255)
              .toString(16)
              .padStart(2, '0');
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        };

        const rgbToHsl = (r: number, g: number, b: number) => {
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h = 0,
            s = 0;
          const l = (max + min) / 2;

          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
              case g:
                h = ((b - r) / d + 2) / 6;
                break;
              case b:
                h = ((r - g) / d + 4) / 6;
                break;
            }
          }
          return { h, s, l };
        };

        const hslToRgb = (h: number, s: number, l: number) => {
          let r, g, b;
          if (s === 0) {
            r = g = b = l;
          } else {
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }
          return { r, g, b };
        };

        const lerpHsl = (
          from: { h: number; s: number; l: number },
          to: { h: number; s: number; l: number },
          t: number
        ) => {
          let dh = to.h - from.h;
          if (Math.abs(dh) > 0.5) {
            dh = dh > 0 ? dh - 1 : dh + 1;
          }
          return {
            h: (from.h + dh * t + 1) % 1,
            s: from.s + (to.s - from.s) * t,
            l: from.l + (to.l - from.l) * t,
          };
        };

        const fromRgb = parseHex(from);
        const toRgb = parseHex(to);
        const fromHsl = rgbToHsl(fromRgb.r, fromRgb.g, fromRgb.b);
        const toHsl = rgbToHsl(toRgb.r, toRgb.g, toRgb.b);
        const resultHsl = lerpHsl(fromHsl, toHsl, t);
        const resultRgb = hslToRgb(resultHsl.h, resultHsl.s, resultHsl.l);

        return rgbToHex(resultRgb.r, resultRgb.g, resultRgb.b);
      };

      set({
        trunkColorBottom: interpolate(colorTransition.from.trunkBottom, colorTransition.to.trunkBottom, t),
        trunkColorTop: interpolate(colorTransition.from.trunkTop, colorTransition.to.trunkTop, t),
        leafColor: interpolate(colorTransition.from.leaf, colorTransition.to.leaf, t),
        colorTransition: {
          ...colorTransition,
          progress: newProgress,
          active: newProgress < 1,
        },
      });
    },
  };
});
