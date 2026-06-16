import type { Point, AnnotationData, StickyNoteData } from './DataModel';
import { ANNOTATION_RADIUS, STICKY_NOTE_MAX_TEXT_LENGTH } from './DataModel';

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  transform: ViewTransform
): Point {
  return {
    x: (screenX - transform.offsetX) / transform.scale,
    y: (screenY - transform.offsetY) / transform.scale
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  transform: ViewTransform
): Point {
  return {
    x: worldX * transform.scale + transform.offsetX,
    y: worldY * transform.scale + transform.offsetY
  };
}

export function isPointInAnnotation(
  pointX: number,
  pointY: number,
  annotation: AnnotationData,
  transform: ViewTransform
): boolean {
  const screenPos = worldToScreen(annotation.x, annotation.y, transform);
  const dx = pointX - screenPos.x;
  const dy = pointY - screenPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= ANNOTATION_RADIUS * transform.scale;
}

export function findAnnotationAtPoint(
  pointX: number,
  pointY: number,
  annotations: AnnotationData[],
  transform: ViewTransform
): AnnotationData | null {
  for (let i = annotations.length - 1; i >= 0; i--) {
    if (isPointInAnnotation(pointX, pointY, annotations[i], transform)) {
      return annotations[i];
    }
  }
  return null;
}

export function isPointInStickyNote(
  pointX: number,
  pointY: number,
  note: StickyNoteData,
  transform: ViewTransform
): boolean {
  const screenPos = worldToScreen(note.x, note.y, transform);
  const screenWidth = note.width * transform.scale;
  const screenHeight = note.height * transform.scale;
  
  return (
    pointX >= screenPos.x &&
    pointX <= screenPos.x + screenWidth &&
    pointY >= screenPos.y &&
    pointY <= screenPos.y + screenHeight
  );
}

export function findStickyNoteAtPoint(
  pointX: number,
  pointY: number,
  notes: StickyNoteData[],
  transform: ViewTransform
): StickyNoteData | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (isPointInStickyNote(pointX, pointY, notes[i], transform)) {
      return notes[i];
    }
  }
  return null;
}

export function validateStickyNoteText(text: string): {
  valid: boolean;
  sanitizedText: string;
  error?: string;
} {
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: true,
      sanitizedText: ''
    };
  }
  
  if (trimmed.length > STICKY_NOTE_MAX_TEXT_LENGTH) {
    return {
      valid: false,
      sanitizedText: trimmed.substring(0, STICKY_NOTE_MAX_TEXT_LENGTH),
      error: `文本长度不能超过${STICKY_NOTE_MAX_TEXT_LENGTH}个字符`
    };
  }
  
  return {
    valid: true,
    sanitizedText: text
  };
}

export function isPointInResizeHandle(
  pointX: number,
  pointY: number,
  note: StickyNoteData,
  transform: ViewTransform,
  handleSize: number = 12
): boolean {
  const screenPos = worldToScreen(note.x, note.y, transform);
  const screenWidth = note.width * transform.scale;
  const screenHeight = note.height * transform.scale;
  
  const handleX = screenPos.x + screenWidth - handleSize;
  const handleY = screenPos.y + screenHeight - handleSize;
  
  return (
    pointX >= handleX &&
    pointX <= screenPos.x + screenWidth + handleSize &&
    pointY >= handleY &&
    pointY <= screenPos.y + screenHeight + handleSize
  );
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) {
    return formatDateTime(timestamp);
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes} 分钟前`;
  } else if (hours < 24) {
    return `${hours} 小时前`;
  } else if (days < 7) {
    return `${days} 天前`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} 周前`;
  } else {
    const nowDate = new Date(now);
    const thenDate = new Date(timestamp);
    let monthDiff = (nowDate.getFullYear() - thenDate.getFullYear()) * 12
      + (nowDate.getMonth() - thenDate.getMonth());
    
    if (nowDate.getDate() < thenDate.getDate()) {
      monthDiff -= 1;
    }

    if (monthDiff < 1) {
      monthDiff = 1;
    }

    if (monthDiff < 12) {
      return `${monthDiff} 个月前`;
    } else {
      return formatDateTime(timestamp);
    }
  }
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatShortDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}
