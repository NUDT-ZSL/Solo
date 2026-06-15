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
