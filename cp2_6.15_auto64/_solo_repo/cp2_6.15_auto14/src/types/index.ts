export type ToolType = 'pencil' | 'eraser' | 'fill' | 'picker' | 'rectangle' | 'circle';

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Layer {
  id: string;
  name: string;
  opacity: number;
  visible: boolean;
  pixels: (RGB | null)[][];
}

export interface Frame {
  id: string;
  layers: Layer[];
}

export interface Project {
  width: number;
  height: number;
  frames: Frame[];
  currentFrameIndex: number;
  currentLayerId: string;
}

export interface ToolState {
  currentTool: ToolType;
  brushSize: number;
}

export interface ColorState {
  palette: RGB[];
  currentColor: RGB;
}

export interface OnionSkinState {
  enabled: boolean;
  frameCount: number;
  opacity: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  fps: number;
}

export interface PixelEditorState {
  project: Project;
  tool: ToolState;
  color: ColorState;
  onionSkin: OnionSkinState;
  playback: PlaybackState;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export type Action =
  | { type: 'SET_TOOL'; payload: ToolType }
  | { type: 'SET_BRUSH_SIZE'; payload: number }
  | { type: 'SET_COLOR'; payload: RGB }
  | { type: 'ADD_PALETTE_COLOR'; payload: RGB }
  | { type: 'SET_PIXEL'; payload: { x: number; y: number; color: RGB | null } }
  | { type: 'SET_PIXELS_BATCH'; payload: { pixels: Array<{ x: number; y: number; color: RGB | null }> } }
  | { type: 'FILL_REGION'; payload: { x: number; y: number; color: RGB | null } }
  | { type: 'ADD_FRAME' }
  | { type: 'DELETE_FRAME'; payload: number }
  | { type: 'DUPLICATE_FRAME'; payload: number }
  | { type: 'MOVE_FRAME'; payload: { from: number; to: number } }
  | { type: 'SET_CURRENT_FRAME'; payload: number }
  | { type: 'ADD_LAYER' }
  | { type: 'DELETE_LAYER'; payload: string }
  | { type: 'SET_CURRENT_LAYER'; payload: string }
  | { type: 'SET_LAYER_NAME'; payload: { id: string; name: string } }
  | { type: 'SET_LAYER_OPACITY'; payload: { id: string; opacity: number } }
  | { type: 'SET_LAYER_VISIBLE'; payload: { id: string; visible: boolean } }
  | { type: 'MOVE_LAYER'; payload: { from: number; to: number } }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_OFFSET'; payload: { x: number; y: number } }
  | { type: 'SET_ONION_SKIN_ENABLED'; payload: boolean }
  | { type: 'SET_ONION_SKIN_FRAME_COUNT'; payload: number }
  | { type: 'SET_ONION_SKIN_OPACITY'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_FPS'; payload: number }
  | { type: 'ADVANCE_FRAME' }
  | { type: 'CREATE_PROJECT'; payload: { width: number; height: number } };

export const CLASSIC_PALETTE: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 126, g: 37, b: 83 },
  { r: 47, g: 72, b: 78 },
  { r: 68, g: 137, b: 26 },
  { r: 137, g: 50, b: 36 },
  { r: 63, g: 56, b: 181 },
  { r: 162, g: 129, b: 51 },
  { r: 94, g: 94, b: 94 },
  { r: 192, g: 88, b: 65 },
  { r: 63, g: 140, b: 214 },
  { r: 131, g: 192, b: 71 },
  { r: 166, g: 212, b: 239 },
  { r: 217, g: 160, b: 102 },
  { r: 166, g: 166, b: 166 },
  { r: 255, g: 0, b: 77 },
  { r: 255, g: 241, b: 232 }
];
