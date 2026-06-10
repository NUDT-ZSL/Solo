export type StyleType = 'sketch' | 'watercolor' | 'pixel' | 'collage' | 'oil';
export type FilterType = 'none' | 'vintage' | 'faded' | 'warm' | 'cool' | 'mono' | 'pencil';

export interface TextOverlay {
  content: string;
  fontFamily: 'serif' | 'sans-serif';
  fontSize: number;
}

export interface Fragment {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  points: { x: number; y: number }[];
  filter: FilterType;
  textOverlay?: TextOverlay;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  zIndex: number;
  colliding?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  style: StyleType;
  thumbnail: string;
  dataUrl: string;
  createdAt: number;
}

export interface CollageState {
  sourceImage: HTMLImageElement | null;
  sourceImageUrl: string;
  fragments: Fragment[];
  selectedIds: string[];
  currentStyle: StyleType;
  styleTransitioning: boolean;
  renderProgress: number;
  gallery: GalleryItem[];
}
