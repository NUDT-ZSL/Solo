export type LayoutElement = {
  id: string;
  type: 'wall' | 'stand';
  x: number;
  y: number;
  width: number;
  height: number;
  artworkId?: string;
  artworkColor?: string;
  artworkName?: string;
};

export type GalleryLayout = {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: LayoutElement[];
  updatedAt: string;
};

export type Artwork = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  originalUrl: string;
  thumbnailUrl: string;
  averageColor: string;
  uploadedAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
  createdAt: string;
};

export type ToolType = 'select' | 'wall' | 'stand' | 'delete';

export type AppState = {
  layout: GalleryLayout | null;
  artworks: Artwork[];
  selectedTool: ToolType;
  selectedElementId: string | null;
  selectedArtworkId: string | null;
  isDragging: boolean;
  dragPreview: LayoutElement | null;
  showInviteModal: boolean;
  showPropertyPanel: boolean;
  isMobile: boolean;
  showArtworkDrawer: boolean;
  uploadProgress: number;
  isUploading: boolean;
  hoveredElementId: string | null;
  tooltipPosition: { x: number; y: number } | null;
};

export type AppActions = {
  setLayout: (layout: GalleryLayout) => void;
  updateElement: (element: LayoutElement) => void;
  addElement: (element: LayoutElement) => void;
  removeElement: (id: string) => void;
  setArtworks: (artworks: Artwork[]) => void;
  addArtwork: (artwork: Artwork) => void;
  setSelectedTool: (tool: ToolType) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedArtworkId: (id: string | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragPreview: (preview: LayoutElement | null) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowPropertyPanel: (show: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setShowArtworkDrawer: (show: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setIsUploading: (uploading: boolean) => void;
  setHoveredElementId: (id: string | null) => void;
  setTooltipPosition: (pos: { x: number; y: number } | null) => void;
  assignArtworkToStand: (standId: string, artwork: Artwork) => void;
  fetchLayout: () => Promise<void>;
  saveLayout: () => Promise<void>;
  fetchArtworks: () => Promise<void>;
  uploadArtwork: (file: File, name: string, description: string, tags: string[]) => Promise<void>;
  sendInvite: (email: string) => Promise<boolean>;
};

export type AppStore = AppState & AppActions;

export const DRAG_TYPES = {
  ARTWORK: 'artwork',
  ELEMENT: 'element',
} as const;

export type DragItem = {
  type: string;
  artwork?: Artwork;
  element?: LayoutElement;
};
