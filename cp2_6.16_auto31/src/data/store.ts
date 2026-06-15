import { create } from 'zustand';

export interface Artifact {
  id: string;
  type: 'pot' | 'coin' | 'anchor';
  name: string;
  material: string;
  era: string;
  description: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  tags: string[];
}

export interface Annotation {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  createdAt: number;
}

export interface RightClickMenuState {
  visible: boolean;
  x: number;
  y: number;
  position: [number, number, number] | null;
}

interface AppState {
  selectedArtifact: Artifact | null;
  discoveredArtifacts: string[];
  annotations: Annotation[];
  isMarkerMode: boolean;
  showInfoCard: boolean;
  fps: number;
  rightClickMenu: RightClickMenuState;
  fishScattered: boolean;
  setSelectedArtifact: (artifact: Artifact | null) => void;
  addDiscoveredArtifact: (id: string) => void;
  addAnnotation: (annotation: Annotation) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setMarkerMode: (active: boolean) => void;
  setShowInfoCard: (show: boolean) => void;
  setFps: (fps: number) => void;
  setRightClickMenu: (menu: RightClickMenuState) => void;
  setFishScattered: (scattered: boolean) => void;
  addTagToArtifact: (artifactId: string, tag: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedArtifact: null,
  discoveredArtifacts: [],
  annotations: [],
  isMarkerMode: false,
  showInfoCard: false,
  fps: 60,
  rightClickMenu: {
    visible: false,
    x: 0,
    y: 0,
    position: null,
  },
  fishScattered: false,

  setSelectedArtifact: (artifact) =>
    set({ selectedArtifact: artifact }),

  addDiscoveredArtifact: (id) =>
    set((state) => ({
      discoveredArtifacts: state.discoveredArtifacts.includes(id)
        ? state.discoveredArtifacts
        : [...state.discoveredArtifacts, id],
    })),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),

  setAnnotations: (annotations) =>
    set({ annotations }),

  setMarkerMode: (active) =>
    set({ isMarkerMode: active }),

  setShowInfoCard: (show) =>
    set({ showInfoCard: show }),

  setFps: (fps) =>
    set({ fps }),

  setRightClickMenu: (menu) =>
    set({ rightClickMenu: menu }),

  setFishScattered: (scattered) =>
    set({ fishScattered: scattered }),

  addTagToArtifact: (artifactId, tag) => {
    // 对于已发现的古物，我们这里只更新selectedArtifact如果匹配
    set((state) => {
      if (state.selectedArtifact?.id === artifactId) {
        return {
          selectedArtifact: {
            ...state.selectedArtifact,
            tags: [...state.selectedArtifact.tags, tag],
          },
        };
      }
      return {};
    });
  },
}));
