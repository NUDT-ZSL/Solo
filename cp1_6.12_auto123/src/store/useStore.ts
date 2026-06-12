import { create } from 'zustand';
import type { StoreState, ParticleConfig, ConnectionConfig, BackgroundConfig } from '../types';
import { COLORS, BG_COLORS } from '../types';

const defaultParticleConfig: ParticleConfig = {
  count: 200,
  colors: [...COLORS],
  sizeMin: 2,
  sizeMax: 4,
  speed: 0.05,
  pathRefreshFrames: 20,
  boundsX: [-20, 20],
  boundsY: [-20, 20],
  boundsZ: [-30, 30],
  centerDensityRatio: 0.6,
  centerRange: 10,
};

const defaultConnectionConfig: ConnectionConfig = {
  maxDistance: 60,
  opacityMin: 0.05,
  opacityMax: 0.3,
  maxConnections: 4000,
  glowEnabled: false,
  lineWidth: 1,
};

const defaultBackgroundConfig: BackgroundConfig = {
  mode: 'solid',
  solidColor: BG_COLORS[0],
  gradientTop: '#0a0e1a',
  gradientBottom: '#1a1a2e',
  starCount: 200,
};

export const useStore = create<StoreState>((set) => ({
  particleConfig: defaultParticleConfig,
  connectionConfig: defaultConnectionConfig,
  backgroundConfig: defaultBackgroundConfig,

  setParticleConfig: (config) =>
    set((state) => ({
      particleConfig: { ...state.particleConfig, ...config },
    })),

  setConnectionConfig: (config) =>
    set((state) => ({
      connectionConfig: { ...state.connectionConfig, ...config },
    })),

  setBackgroundConfig: (config) =>
    set((state) => ({
      backgroundConfig: { ...state.backgroundConfig, ...config },
    })),

  resetAll: () =>
    set(() => ({
      particleConfig: { ...defaultParticleConfig },
      connectionConfig: { ...defaultConnectionConfig },
      backgroundConfig: { ...defaultBackgroundConfig },
    })),
}));

export { defaultParticleConfig, defaultConnectionConfig, defaultBackgroundConfig };
