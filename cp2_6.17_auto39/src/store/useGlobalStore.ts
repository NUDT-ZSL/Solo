import { create } from 'zustand';
import type { ShippingRoute } from '../types';

export const START_YEAR = 2020;
export const END_YEAR = 2030;
export const TOTAL_YEARS = END_YEAR - START_YEAR + 1;

export interface FocusedRegion {
  lat: number;
  lng: number;
  routes: ShippingRoute[];
  label: string;
}

interface GlobalState {
  routes: ShippingRoute[];
  routesLoading: boolean;
  routesError: string | null;
  lastUpdated: string;

  currentYear: number;
  isPlaying: boolean;

  selectedRouteId: string | null;
  hoveredRouteId: string | null;

  showHeatmap: boolean;
  panelCollapsed: boolean;

  focusedRegion: FocusedRegion | null;
  tooltip: { visible: boolean; x: number; y: number; routeId: string | null };

  autoRotate: boolean;
  rotateSpeed: number;

  setRoutes: (routes: ShippingRoute[], lastUpdated: string) => void;
  setRoutesLoading: (v: boolean) => void;
  setRoutesError: (e: string | null) => void;

  setCurrentYear: (year: number) => void;
  setIsPlaying: (v: boolean) => void;
  tickYear: () => void;

  setSelectedRouteId: (id: string | null) => void;
  setHoveredRouteId: (id: string | null) => void;

  toggleHeatmap: () => void;
  setShowHeatmap: (v: boolean) => void;
  togglePanel: () => void;
  setPanelCollapsed: (v: boolean) => void;

  setFocusedRegion: (region: FocusedRegion | null) => void;
  setTooltip: (t: Partial<GlobalState['tooltip']>) => void;

  toggleAutoRotate: () => void;
  setRotateSpeed: (speed: number) => void;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  routes: [],
  routesLoading: true,
  routesError: null,
  lastUpdated: '-',

  currentYear: START_YEAR,
  isPlaying: false,

  selectedRouteId: null,
  hoveredRouteId: null,

  showHeatmap: true,
  panelCollapsed: false,

  focusedRegion: null,
  tooltip: { visible: false, x: 0, y: 0, routeId: null },

  autoRotate: true,
  rotateSpeed: 0.08,

  setRoutes: (routes, lastUpdated) => set({ routes, routesLoading: false, lastUpdated }),
  setRoutesLoading: v => set({ routesLoading: v }),
  setRoutesError: e => set({ routesError: e, routesLoading: false }),

  setCurrentYear: year =>
    set({ currentYear: Math.max(START_YEAR, Math.min(END_YEAR, year)) }),
  setIsPlaying: v => set({ isPlaying: v }),
  tickYear: () => {
    const { currentYear } = get();
    const next = currentYear >= END_YEAR ? START_YEAR : currentYear + 1;
    set({ currentYear: next });
  },

  setSelectedRouteId: id => set({ selectedRouteId: id }),
  setHoveredRouteId: id => set({ hoveredRouteId: id }),

  toggleHeatmap: () => set(s => ({ showHeatmap: !s.showHeatmap })),
  setShowHeatmap: v => set({ showHeatmap: v }),
  togglePanel: () => set(s => ({ panelCollapsed: !s.panelCollapsed })),
  setPanelCollapsed: v => set({ panelCollapsed: v }),

  setFocusedRegion: region => set({ focusedRegion: region }),
  setTooltip: t => set(s => ({ tooltip: { ...s.tooltip, ...t } })),

  toggleAutoRotate: () => set(s => ({ autoRotate: !s.autoRotate })),
  setRotateSpeed: speed => set({ rotateSpeed: Math.max(0, Math.min(0.5, speed)) })
}));

export function selectRouteById(id: string | null): ShippingRoute | null {
  if (!id) return null;
  return useGlobalStore.getState().routes.find(r => r.id === id) || null;
}

export function selectYearlyEmission(route: ShippingRoute, year: number): { emission: number; shipCount: number } {
  const yd = route.yearlyData.find(y => y.year === year);
  return yd ? { emission: yd.emission, shipCount: yd.shipCount } : { emission: 0, shipCount: 0 };
}

export function getEmissionMinMax(year: number): { min: number; max: number } {
  const routes = useGlobalStore.getState().routes;
  let min = Infinity;
  let max = -Infinity;
  for (const r of routes) {
    const { emission } = selectYearlyEmission(r, year);
    if (emission < min) min = emission;
    if (emission > max) max = emission;
  }
  if (min === Infinity) return { min: 0, max: 1 };
  return { min, max };
}
