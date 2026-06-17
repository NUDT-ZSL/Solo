import { create } from 'zustand';
import { GradientConfig, ColorStop, GradientType, PresetGradient } from './types';

let nextId = 10;

const defaultConfig: GradientConfig = {
  type: 'linear',
  angle: 135,
  radius: 50,
  colorStops: [
    { id: '1', color: '#FF6B6B', position: 0 },
    { id: '2', color: '#FEEA9E', position: 0.5 },
    { id: '3', color: '#FFB347', position: 1 },
  ],
  animationEnabled: true,
};

export const PRESETS: PresetGradient[] = [
  {
    name: '日落',
    config: {
      type: 'linear',
      angle: 135,
      radius: 50,
      colorStops: [
        { id: 'p1', color: '#FF6B6B', position: 0 },
        { id: 'p2', color: '#FEEA9E', position: 0.5 },
        { id: 'p3', color: '#FFB347', position: 1 },
      ],
    },
  },
  {
    name: '海洋',
    config: {
      type: 'linear',
      angle: 180,
      radius: 50,
      colorStops: [
        { id: 'p4', color: '#00B4DB', position: 0 },
        { id: 'p5', color: '#0083B0', position: 0.5 },
        { id: 'p6', color: '#005C97', position: 1 },
      ],
    },
  },
  {
    name: '极光',
    config: {
      type: 'linear',
      angle: 45,
      radius: 50,
      colorStops: [
        { id: 'p7', color: '#43E97B', position: 0 },
        { id: 'p8', color: '#38F9D7', position: 1 },
      ],
    },
  },
  {
    name: '薰衣草',
    config: {
      type: 'linear',
      angle: 135,
      radius: 50,
      colorStops: [
        { id: 'p9', color: '#A18CD1', position: 0 },
        { id: 'p10', color: '#FBC2EB', position: 1 },
      ],
    },
  },
  {
    name: '火焰',
    config: {
      type: 'radial',
      angle: 0,
      radius: 70,
      colorStops: [
        { id: 'p11', color: '#F7971E', position: 0 },
        { id: 'p12', color: '#FF0844', position: 1 },
      ],
    },
  },
  {
    name: '森林',
    config: {
      type: 'linear',
      angle: 160,
      radius: 50,
      colorStops: [
        { id: 'p13', color: '#11998E', position: 0 },
        { id: 'p14', color: '#38EF7D', position: 1 },
      ],
    },
  },
];

interface GradientStore {
  config: GradientConfig;
  setType: (type: GradientType) => void;
  setAngle: (angle: number) => void;
  setRadius: (radius: number) => void;
  addColorStop: () => void;
  removeColorStop: (id: string) => void;
  updateColorStop: (id: string, updates: Partial<ColorStop>) => void;
  setAnimationEnabled: (enabled: boolean) => void;
  applyPreset: (preset: PresetGradient) => void;
}

export const useGradientStore = create<GradientStore>((set) => ({
  config: defaultConfig,
  setType: (type) =>
    set((state) => ({ config: { ...state.config, type } })),
  setAngle: (angle) =>
    set((state) => ({ config: { ...state.config, angle } })),
  setRadius: (radius) =>
    set((state) => ({ config: { ...state.config, radius } })),
  addColorStop: () =>
    set((state) => {
      const stops = [...state.config.colorStops].sort(
        (a, b) => a.position - b.position
      );
      let newPos = 0.5;
      if (stops.length >= 2) {
        let maxGap = 0;
        for (let i = 0; i < stops.length - 1; i++) {
          const gap = stops[i + 1].position - stops[i].position;
          if (gap > maxGap) {
            maxGap = gap;
            newPos = (stops[i].position + stops[i + 1].position) / 2;
          }
        }
      }
      const id = String(nextId++);
      const hue = Math.floor(Math.random() * 360);
      const color = `hsl(${hue}, 70%, 60%)`;
      return {
        config: {
          ...state.config,
          colorStops: [
            ...state.config.colorStops,
            { id, color, position: Math.round(newPos * 100) / 100 },
          ],
        },
      };
    }),
  removeColorStop: (id) =>
    set((state) => {
      if (state.config.colorStops.length <= 2) return state;
      return {
        config: {
          ...state.config,
          colorStops: state.config.colorStops.filter((s) => s.id !== id),
        },
      };
    }),
  updateColorStop: (id, updates) =>
    set((state) => ({
      config: {
        ...state.config,
        colorStops: state.config.colorStops.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    })),
  setAnimationEnabled: (enabled) =>
    set((state) => ({
      config: { ...state.config, animationEnabled: enabled },
    })),
  applyPreset: (preset) =>
    set((state) => ({
      config: {
        ...preset.config,
        colorStops: preset.config.colorStops.map((s) => ({
          ...s,
          id: String(nextId++),
        })),
        animationEnabled: state.config.animationEnabled,
      },
    })),
}));
