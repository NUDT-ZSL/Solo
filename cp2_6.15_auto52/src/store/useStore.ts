import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppStore, LayoutElement, Artwork, GalleryLayout } from '@/types';
import { api } from '@/utils/api';

export const useStore = create<AppStore>((set, get) => ({
  layout: null,
  artworks: [],
  selectedTool: 'select',
  selectedElementId: null,
  selectedArtworkId: null,
  isDragging: false,
  dragPreview: null,
  showInviteModal: false,
  showPropertyPanel: false,
  isMobile: false,
  showArtworkDrawer: false,
  uploadProgress: 0,
  isUploading: false,
  hoveredElementId: null,
  tooltipPosition: null,

  setLayout: (layout: GalleryLayout) => set({ layout }),

  updateElement: (element: LayoutElement) =>
    set((state) => {
      if (!state.layout) return state;
      const elements = state.layout.elements.map((el) =>
        el.id === element.id ? element : el
      );
      return {
        layout: { ...state.layout, elements },
      };
    }),

  addElement: (element: LayoutElement) =>
    set((state) => {
      if (!state.layout) return state;
      return {
        layout: {
          ...state.layout,
          elements: [...state.layout.elements, element],
        },
      };
    }),

  removeElement: (id: string) =>
    set((state) => {
      if (!state.layout) return state;
      const elements = state.layout.elements.filter((el) => el.id !== id);
      return {
        layout: { ...state.layout, elements },
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
        showPropertyPanel: state.selectedElementId === id ? false : state.showPropertyPanel,
      };
    }),

  setArtworks: (artworks: Artwork[]) => set({ artworks }),

  addArtwork: (artwork: Artwork) =>
    set((state) => ({
      artworks: [artwork, ...state.artworks],
    })),

  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedElementId: (id) => set({ selectedElementId: id, showPropertyPanel: id !== null }),
  setSelectedArtworkId: (id) => set({ selectedArtworkId: id }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setDragPreview: (preview) => set({ dragPreview: preview }),
  setShowInviteModal: (show) => set({ showInviteModal: show }),
  setShowPropertyPanel: (show) => set({ showPropertyPanel: show }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setShowArtworkDrawer: (show) => set({ showArtworkDrawer: show }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setHoveredElementId: (id) => set({ hoveredElementId: id }),
  setTooltipPosition: (pos) => set({ tooltipPosition: pos }),

  assignArtworkToStand: (standId: string, artwork: Artwork) =>
    set((state) => {
      if (!state.layout) return state;
      const elements = state.layout.elements.map((el) =>
        el.id === standId
          ? {
              ...el,
              artworkId: artwork.id,
              artworkColor: artwork.averageColor,
              artworkName: artwork.name,
            }
          : el
      );
      return {
        layout: { ...state.layout, elements },
      };
    }),

  fetchLayout: async () => {
    try {
      const layout = await api.getLayout();
      set({ layout });
    } catch (error) {
      console.error('Failed to fetch layout:', error);
    }
  },

  saveLayout: async () => {
    const state = get();
    if (!state.layout) return;
    try {
      const updatedLayout = await api.updateLayout(
        state.layout.id,
        state.layout.elements
      );
      set({ layout: updatedLayout });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  },

  fetchArtworks: async () => {
    try {
      const artworks = await api.getArtworks();
      set({ artworks });
    } catch (error) {
      console.error('Failed to fetch artworks:', error);
    }
  },

  uploadArtwork: async (file: File, name: string, description: string, tags: string[]) => {
    set({ isUploading: true, uploadProgress: 0 });

    const progressInterval = setInterval(() => {
      set((state) => ({
        uploadProgress: Math.min(state.uploadProgress + 5, 90),
      }));
    }, 100);

    try {
      const artwork = await api.uploadArtwork(
        file,
        name,
        description,
        tags,
        (progress) => {
          set({ uploadProgress: progress });
        }
      );

      clearInterval(progressInterval);
      set({ uploadProgress: 100 });
      set((state) => ({ artworks: [artwork, ...state.artworks] }));

      setTimeout(() => {
        set({ isUploading: false, uploadProgress: 0 });
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      set({ isUploading: false, uploadProgress: 0 });
      console.error('Failed to upload artwork:', error);
      throw error;
    }
  },

  sendInvite: async (email: string) => {
    try {
      const result = await api.sendInvite(email);
      return result.success;
    } catch (error) {
      console.error('Failed to send invite:', error);
      return false;
    }
  },
}));

export const createNewElement = (
  type: 'wall' | 'stand',
  x: number,
  y: number
): LayoutElement => {
  const isWall = type === 'wall';
  return {
    id: uuidv4(),
    type,
    x,
    y,
    width: isWall ? 100 : 30,
    height: isWall ? 10 : 30,
  };
};
