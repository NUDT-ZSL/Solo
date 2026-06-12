import { create } from 'zustand';

export interface ArtworkItem {
  id: string;
  type: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color?: string;
}

export interface LightItem {
  id: string;
  position: [number, number, number];
  target: [number, number, number];
  color: string;
  intensity: number;
  angle: number;
  penumbra: number;
  railIndex: number;
  railProgress: number;
}

export type CameraView = 'free' | 'top' | 'front';

interface GalleryState {
  artworks: ArtworkItem[];
  lights: LightItem[];
  selectedArtworkId: string | null;
  selectedLightId: string | null;
  cameraView: CameraView;
  isPlacing: boolean;
  placingType: string | null;
  showLightHelpers: boolean;
  showDeleteConfirm: boolean;
  importProgress: number;
  isImporting: boolean;

  addArtwork: (artwork: Omit<ArtworkItem, 'id'>) => void;
  removeArtwork: (id: string) => void;
  updateArtwork: (id: string, updates: Partial<ArtworkItem>) => void;
  selectArtwork: (id: string | null) => void;
  selectLight: (id: string | null) => void;
  setCameraView: (view: CameraView) => void;
  setIsPlacing: (placing: boolean, type?: string | null) => void;
  toggleLightHelpers: () => void;
  setShowDeleteConfirm: (show: boolean) => void;
  updateLight: (id: string, updates: Partial<LightItem>) => void;
  setImportProgress: (progress: number) => void;
  setIsImporting: (importing: boolean) => void;
  importGallery: (data: { artworks: ArtworkItem[]; lights: LightItem[] }) => void;
  exportGallery: () => { artworks: ArtworkItem[]; lights: LightItem[] };
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultLights: LightItem[] = [
  {
    id: 'light-1',
    position: [-5, 5.8, -4],
    target: [-5, 0, -4],
    color: '#fffacd',
    intensity: 1.2,
    angle: Math.PI / 4,
    penumbra: 0.5,
    railIndex: 0,
    railProgress: 0.25,
  },
  {
    id: 'light-2',
    position: [5, 5.8, -4],
    target: [5, 0, -4],
    color: '#fffacd',
    intensity: 1.0,
    angle: Math.PI / 4,
    penumbra: 0.5,
    railIndex: 0,
    railProgress: 0.75,
  },
  {
    id: 'light-3',
    position: [-5, 5.8, 4],
    target: [-5, 0, 4],
    color: '#fffacd',
    intensity: 1.0,
    angle: Math.PI / 4,
    penumbra: 0.5,
    railIndex: 1,
    railProgress: 0.25,
  },
  {
    id: 'light-4',
    position: [5, 5.8, 4],
    target: [5, 0, 4],
    color: '#fffacd',
    intensity: 1.2,
    angle: Math.PI / 4,
    penumbra: 0.5,
    railIndex: 1,
    railProgress: 0.75,
  },
];

const defaultArtworks: ArtworkItem[] = [
  {
    id: 'default-painting',
    type: 'painting-abstract',
    name: '抽象画作 #1',
    position: [9.7, 2, 0],
    rotation: [0, -Math.PI / 2, 0],
    scale: 1,
  },
];

export const useStore = create<GalleryState>((set, get) => ({
  artworks: defaultArtworks,
  lights: defaultLights,
  selectedArtworkId: null,
  selectedLightId: null,
  cameraView: 'free',
  isPlacing: false,
  placingType: null,
  showLightHelpers: false,
  showDeleteConfirm: false,
  importProgress: 0,
  isImporting: false,

  addArtwork: (artwork) =>
    set((state) => ({
      artworks: [...state.artworks, { ...artwork, id: generateId() }],
    })),

  removeArtwork: (id) =>
    set((state) => ({
      artworks: state.artworks.filter((a) => a.id !== id),
      selectedArtworkId: state.selectedArtworkId === id ? null : state.selectedArtworkId,
    })),

  updateArtwork: (id, updates) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  selectArtwork: (id) =>
    set({ selectedArtworkId: id, selectedLightId: id ? null : null }),

  selectLight: (id) =>
    set({ selectedLightId: id, selectedArtworkId: id ? null : null }),

  setCameraView: (view) => set({ cameraView: view }),

  setIsPlacing: (placing, type = null) =>
    set({ isPlacing: placing, placingType: type }),

  toggleLightHelpers: () =>
    set((state) => ({ showLightHelpers: !state.showLightHelpers })),

  setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show }),

  updateLight: (id, updates) =>
    set((state) => ({
      lights: state.lights.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  setImportProgress: (progress) => set({ importProgress: progress }),

  setIsImporting: (importing) => set({ isImporting: importing }),

  importGallery: (data) =>
    set({
      artworks: data.artworks.map((a) => ({ ...a, id: generateId() })),
      lights: data.lights.map((l, i) => ({ ...l, id: `light-${i + 1}` })),
    }),

  exportGallery: () => {
    const state = get();
    return {
      artworks: state.artworks,
      lights: state.lights,
    };
  },
}));
