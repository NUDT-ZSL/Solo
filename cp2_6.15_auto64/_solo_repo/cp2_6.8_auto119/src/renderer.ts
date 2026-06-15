import type { TimelineEngine, EventNode, Timeline, ConnectionArrow, TextLabel } from './timelineEngine';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  engine: TimelineEngine;
  dpr: number;
  width: number = 0;
  height: number = 0;
  bgColor: string = '#F7FAFC';

  constructor(canvas: HTMLCanvasElement, engine: TimelineEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.engine = engine;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(hoverArrowId: string | null = null): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();

    for (const tl of this.engine.state.timelines) {
      this.drawTimeline(tl);
    }

    for (const node of this.engine.state.nodes) {
      if (node.snappedToTimelineId) {
        const tl = this.engine.getTimeline(node.snappedToTimelineId);
        if (tl) this.drawSnapConnector(node, tl);
      }
    }

    for (const a of this.engine.state.arrows) {
      this.drawArrow(a, a.id === hoverArrowId);
    }

    for (const label of this.engine.state.labels) {
      this.drawLabel(label);
    }

    for (const node of this.engine.state.nodes) {
      this.drawNode(node);
    }
  }

  drawGrid(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(203, 213, 224, 0.25)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < this.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTimeline(tl: Timeline): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = tl.strokeColor;
    ctx.lineWidth = tl.strokeWidth;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(tl.x1, tl.y1);
    ctx.lineTo(tl.x2, tl.y2);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawAnchor(tl.x1, tl.y1);
    this.drawAnchor(tl.x2, tl.y2);

    ctx.fillStyle = '#718096';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(tl.x2 - tl.x1)}px`, (tl.x1 + tl.x2) / 2, tl.y1 - 8);
    ctx.restore();
  }

  drawAnchor(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#A0AEC0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawSnapConnector(node: EventNode, tl: Timeline): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 174, 192, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    const cx = node.x + node.width / 2;
    const ny = node.y + node.height / 2;
    ctx.beginPath();
    ctx.moveTo(cx, ny);
    ctx.lineTo(cx, tl.y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawNode(node: EventNode): void {
    const ctx = this.ctx;
    const scale = this.engine.getTextScaleFactor(this.width);
    const r = 10;

    ctx.save();
    if (node.selected) {
      ctx.shadowColor = '#63B3ED';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = node.bgColor;
    this.roundRect(ctx, node.x, node.y, node.width, node.height, r);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = node.selected ? '#3182CE' : 'rgba(45, 55, 72, 0.15)';
    ctx.lineWidth = node.selected ? 2 : 1;
    this.roundRect(ctx, node.x, node.y, node.width, node.height, r);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#2D3748';
    const baseFont = 13 * scale;
    ctx.font = `600 ${baseFont}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = node.title || '未命名事件';
    const truncatedTitle = title.length > 14 ? title.slice(0, 13) + '…' : title;
    ctx.fillText(truncatedTitle, node.x + node.width / 2, node.y + node.height / 2 - 4);

    if (node.date) {
      ctx.fillStyle = '#718096';
      ctx.font = `${11 * scale}px -apple-system, sans-serif`;
      ctx.fillText(node.date, node.x + node.width / 2, node.y + node.height / 2 + 14);
    }

    if (node.tags.length > 0) {
      const tagY = node.y + node.height - 10;
      const tagW = 22;
      const totalW = node.tags.length * (tagW + 2) - 2;
      let startX = node.x + node.width / 2 - totalW / 2;
      for (const tag of node.tags) {
        ctx.fillStyle = tag.color;
        this.roundRect(ctx, startX, tagY, tagW, 5, 2);
        ctx.fill();
        startX += tagW + 2;
      }
    }
    ctx.restore();
  }

  drawLabel(label: TextLabel): void {
    const ctx = this.ctx;
    const scale = this.engine.getTextScaleFactor(this.width);
    const fs = label.fontSize * scale;
    const fontParts: string[] = [];
    if (label.isBold) fontParts.push('700');
    if (label.isItalic) fontParts.push('italic');
    fontParts.push(`${fs}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`);
    ctx.save();
    ctx.font = fontParts.join(' ');
    ctx.textBaseline = 'top';
    if (label.selected) {
      const w = ctx.measureText(label.text).width + 10;
      const h = fs + 8;
      ctx.fillStyle = 'rgba(49, 130, 206, 0.08)';
      ctx.fillRect(label.x - 2, label.y - 2, w, h);
      ctx.strokeStyle = '#3182CE';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(label.x - 2, label.y - 2, w, h);
    }
    ctx.fillStyle = '#2D3748';
    ctx.fillText(label.text, label.x + 3, label.y + 3);
    ctx.restore();
  }

  drawArrow(arrow: ConnectionArrow, hovered: boolean): void {
    const from = this.engine.getNode(arrow.fromNodeId);
    const to = this.engine.getNode(arrow.toNodeId);
    if (!from || !to) return;
    const ctx = this.ctx;
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2;
    const y2 = to.y + to.height / 2;

    const color = hovered ? arrow.hoverColor : arrow.color;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  exportImage(scale: number = 2): HTMLCanvasElement {
    const bounds = this.computeContentBounds();
    const padding = 40;
    const w = Math.ceil((bounds.maxX - bounds.minX + padding * 2) * scale);
    const h = Math.ceil((bounds.maxY - bounds.minY + padding * 2) * scale);

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d')!;
    octx.scale(scale, scale);
    octx.fillStyle = '#FFFFFF';
    octx.fillRect(0, 0, off.width / scale, off.height / scale);
    octx.translate(-bounds.minX + padding, -bounds.minY + padding);

    for (const tl of this.engine.state.timelines) {
      this._drawTimelineTo(octx, tl);
    }
    for (const node of this.engine.state.nodes) {
      if (node.snappedToTimelineId) {
        const tl = this.engine.getTimeline(node.snappedToTimelineId);
        if (tl) this._drawSnapConnectorTo(octx, node, tl);
      }
    }
    for (const a of this.engine.state.arrows) {
      this._drawArrowTo(octx, a);
    }
    for (const label of this.engine.state.labels) {
      this._drawLabelTo(octx, label);
    }
    for (const node of this.engine.state.nodes) {
      this._drawNodeTo(octx, node, false);
    }
    return off;
  }

  _drawTimelineTo(ctx: CanvasRenderingContext2D, tl: Timeline): void {
    ctx.save();
    ctx.strokeStyle = tl.strokeColor;
    ctx.lineWidth = tl.strokeWidth;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(tl.x1, tl.y1);
    ctx.lineTo(tl.x2, tl.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#A0AEC0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tl.x1, tl.y1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tl.x2, tl.y2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawSnapConnectorTo(ctx: CanvasRenderingContext2D, node: EventNode, tl: Timeline): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 174, 192, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    const cx = node.x + node.width / 2;
    const ny = node.y + node.height / 2;
    ctx.beginPath();
    ctx.moveTo(cx, ny);
    ctx.lineTo(cx, tl.y1);
    ctx.stroke();
    ctx.restore();
  }

  _drawNodeTo(ctx: CanvasRenderingContext2D, node: EventNode, selected: boolean): void {
    const r = 10;
    ctx.save();
    if (selected) {
      ctx.shadowColor = '#63B3ED';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = node.bgColor;
    this._roundRect(ctx, node.x, node.y, node.width, node.height, r);
    ctx.fill();
    ctx.strokeStyle = selected ? '#3182CE' : 'rgba(45, 55, 72, 0.15)';
    ctx.lineWidth = selected ? 2 : 1;
    this._roundRect(ctx, node.x, node.y, node.width, node.height, r);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#2D3748';
    ctx.font = `600 13px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const title = node.title || '未命名事件';
    const t = title.length > 14 ? title.slice(0, 13) + '…' : title;
    ctx.fillText(t, node.x + node.width / 2, node.y + node.height / 2 - 4);
    if (node.date) {
      ctx.fillStyle = '#718096';
      ctx.font = `11px -apple-system, sans-serif`;
      ctx.fillText(node.date, node.x + node.width / 2, node.y + node.height / 2 + 14);
    }
    if (node.tags.length > 0) {
      const tagY = node.y + node.height - 10;
      const tagW = 22;
      const totalW = node.tags.length * (tagW + 2) - 2;
      let startX = node.x + node.width / 2 - totalW / 2;
      for (const tag of node.tags) {
        ctx.fillStyle = tag.color;
        this._roundRect(ctx, startX, tagY, tagW, 5, 2);
        ctx.fill();
        startX += tagW + 2;
      }
    }
    ctx.restore();
  }

  _drawLabelTo(ctx: CanvasRenderingContext2D, label: TextLabel): void {
    const fontParts: string[] = [];
    if (label.isBold) fontParts.push('700');
    if (label.isItalic) fontParts.push('italic');
    fontParts.push(`${label.fontSize}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`);
    ctx.save();
    ctx.font = fontParts.join(' ');
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#2D3748';
    ctx.fillText(label.text, label.x + 3, label.y + 3);
    ctx.restore();
  }

  _drawArrowTo(ctx: CanvasRenderingContext2D, arrow: ConnectionArrow): void {
    const from = this.engine.getNode(arrow.fromNodeId);
    const to = this.engine.getNode(arrow.toNodeId);
    if (!from || !to) return;
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2;
    const y2 = to.y + to.height / 2;
    ctx.save();
    ctx.strokeStyle = arrow.color;
    ctx.fillStyle = arrow.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  computeContentBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const extend = (x: number, y: number, w: number = 0, h: number = 0) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    };
    for (const n of this.engine.state.nodes) extend(n.x, n.y, n.width, n.height);
    for (const l of this.engine.state.labels) {
      const w = Math.max(60, l.text.length * (l.fontSize * 0.6));
      extend(l.x, l.y, w, l.fontSize + 8);
    }
    for (const t of this.engine.state.timelines) {
      extend(Math.min(t.x1, t.x2) - 10, t.y1 - 20);
      extend(Math.max(t.x1, t.x2) + 10, t.y1 + 10);
    }
    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 800; maxY = 400;
    }
    return { minX, minY, maxX, maxY };
  }
}
