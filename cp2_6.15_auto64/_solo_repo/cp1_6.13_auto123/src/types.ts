export interface Point {
  x: number;
  y: number;
}

export type ToolType = 'brush' | 'text' | 'sticker' | 'select' | 'eraser';

export type StickerType = 'star' | 'smile' | 'arrow' | 'heart' | 'lightning';

export interface BaseElement {
  id: string;
  roomId: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isRemote?: boolean;
  opacity?: number;
}

export interface Stroke extends BaseElement {
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface Sticker extends BaseElement {
  type: 'sticker';
  x: number;
  y: number;
  stickerType: StickerType;
  size: number;
}

export type CanvasElement = Stroke | TextElement | Sticker;

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface SelectionState {
  elementId: string | null;
  handleType: 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'rotate' | null;
  startPoint: Point | null;
  originalElement: CanvasElement | null;
}

export interface WSMessage {
  type: 'element-add' | 'element-update' | 'element-delete' | 'elements-batch' | 'user-join' | 'user-leave' | 'cursor-move';
  payload: any;
  roomId: string;
  userId: string;
  timestamp: number;
}

export interface UserState {
  id: string;
  name: string;
  roomId: string;
  cursor?: Point;
  lastActive: number;
}
