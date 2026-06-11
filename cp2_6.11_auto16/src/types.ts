export interface CanvasElement {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface ImageElement extends CanvasElement {
  type: 'image';
  src: string;
}

export interface TextElement extends CanvasElement {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
}

export type CollageElement = ImageElement | TextElement;

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

export const FONT_FAMILIES = [
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Nunito', value: 'Nunito, sans-serif' },
  { name: 'Caveat', value: 'Caveat, cursive' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
] as const;

export const COLOR_PALETTE = [
  '#3D3D3D', '#FFFFFF', '#FF6B6B', '#FFD93D', '#6BCB77',
  '#4D96FF', '#9B59B6', '#FF8C42', '#2EC4B6', '#E8DDD3',
  '#F5F0EB', '#1A1A2E', '#16213E', '#0F3460', '#533483',
] as const;
