export type LayoutMode = 'vertical' | 'horizontal';

export interface NodePosition {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  side: 'left' | 'right';
}

export interface LayoutInfo {
  mode: LayoutMode;
  canvasWidth: number;
  canvasHeight: number;
  totalLength: number;
  scrollOffset: number;
  nodeSpacing: number;
  nodeRadius: number;
  lineWidth: number;
}

const VERTICAL_NODE_SPACING = 140;
const HORIZONTAL_NODE_SPACING = 200;
const NODE_RADIUS = 14;
const LINE_WIDTH = 3;
const VERTICAL_SIDE_MARGIN = 180;
const HORIZONTAL_TOP_MARGIN = 100;

export class LayerManager {
  private mode: LayoutMode = 'vertical';
  private canvasWidth = 0;
  private canvasHeight = 0;
  private scrollOffset = 0;
  private eventCount = 0;

  setMode(mode: LayoutMode): void {
    this.mode = mode;
    this.scrollOffset = 0;
  }

  getMode(): LayoutMode {
    return this.mode;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setEventCount(count: number): void {
    this.eventCount = count;
  }

  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  getMaxScroll(): number {
    if (this.mode === 'vertical') {
      const total = (this.eventCount - 1) * VERTICAL_NODE_SPACING + this.canvasHeight * 0.3;
      return Math.max(0, total - this.canvasHeight);
    } else {
      const total = (this.eventCount - 1) * HORIZONTAL_NODE_SPACING + this.canvasWidth * 0.3;
      return Math.max(0, total - this.canvasWidth);
    }
  }

  clampScroll(offset: number): number {
    return Math.max(0, Math.min(offset, this.getMaxScroll()));
  }

  calculateNodePositions(): NodePosition[] {
    const positions: NodePosition[] = [];

    if (this.mode === 'vertical') {
      const centerX = this.canvasWidth / 2;
      const startY = this.canvasHeight * 0.15 - this.scrollOffset;

      for (let i = 0; i < this.eventCount; i++) {
        const y = startY + i * VERTICAL_NODE_SPACING;
        const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
        const labelOffset = VERTICAL_SIDE_MARGIN + 30;

        positions.push({
          x: centerX,
          y,
          labelX: side === 'left' ? centerX - labelOffset : centerX + labelOffset,
          labelY: y,
          side,
        });
      }
    } else {
      const centerY = this.canvasHeight / 2;
      const startX = this.canvasWidth * 0.1 - this.scrollOffset;

      for (let i = 0; i < this.eventCount; i++) {
        const x = startX + i * HORIZONTAL_NODE_SPACING;
        const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
        const labelOffset = HORIZONTAL_TOP_MARGIN + 20;

        positions.push({
          x,
          y: centerY,
          labelX: x,
          labelY: side === 'left' ? centerY - labelOffset : centerY + labelOffset,
          side,
        });
      }
    }

    return positions;
  }

  getLayoutInfo(): LayoutInfo {
    const spacing = this.mode === 'vertical' ? VERTICAL_NODE_SPACING : HORIZONTAL_NODE_SPACING;
    const totalLength = (this.eventCount - 1) * spacing;

    return {
      mode: this.mode,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      totalLength,
      scrollOffset: this.scrollOffset,
      nodeSpacing: spacing,
      nodeRadius: NODE_RADIUS,
      lineWidth: LINE_WIDTH,
    };
  }

  hitTest(px: number, py: number, positions: NodePosition[]): number {
    const r = NODE_RADIUS + 8;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy <= r * r) {
        return i;
      }
    }
    return -1;
  }

  getNodeRadius(): number {
    return NODE_RADIUS;
  }
}
