export interface ImageFeatures {
  dominantColor: { r: number; g: number; b: number };
  textureComplexity: number;
  colorTemperature: 'warm' | 'cool' | 'neutral';
  textureType: 'clear' | 'medium' | 'cloudy';
}

export interface Photo {
  id: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: string;
  tags: string[];
  features: ImageFeatures;
}

export interface TagStats {
  tag: string;
  count: number;
}

export interface PhotoState {
  photos: Photo[];
  selectedTags: string[];
  selectedPhotoIds: string[];
  referencePhotoId: string | null;
  isModalOpen: boolean;
  currentPhotoId: string | null;
  isDragging: boolean;
  searchQuery: string;
}

export interface PhotoActions {
  addPhoto: (photo: Photo) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  deletePhoto: (id: string) => void;
  toggleTag: (tag: string) => void;
  clearSelectedTags: () => void;
  togglePhotoSelection: (id: string, multiSelect?: boolean) => void;
  clearPhotoSelection: () => void;
  setReferencePhoto: (id: string | null) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setDragging: (isDragging: boolean) => void;
  addTagToPhoto: (photoId: string, tag: string) => void;
  removeTagFromPhoto: (photoId: string, tag: string) => void;
  batchAddTags: (photoIds: string[], tag: string) => void;
  setSearchQuery: (query: string) => void;
  loadPhotos: () => void;
}
