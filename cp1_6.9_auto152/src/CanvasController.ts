import type { Layer, CanvasState, MaterialDef, BlendMode, LightEffectType, TextureType } from './MaterialLibrary';
import { createLayerFromMaterial } from './MaterialLibrary';
import { LayerRenderer } from './LayerRenderer';

export type InteractionMode = 'none' | 'drag' | 'rotate' | 'resize' | 'corner-resize';

export interface ControllerCallbacks {
  onStateChange: () => void;
}

export class CanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CanvasState;
  private callbacks: ControllerCallbacks;

  private interactionMode: InteractionMode = 'none';
  private activeLayerId: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private layerStartX = 0;
  private layerStartY = 0;
  private layerStartRotation = 0;
  private layerStartScale = 1;
  private layerStartWidth = 0;
  private layerStartHeight = 0;
  private resizeCorner = 0;
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private isRotating = false;
  private showRotationLabel = false;
  private snapX: number | null = null;
  private snapY: number | null = null;
  private readonly SNAP_THRESHOLD = 20;

  constructor(canvas: HTMLCanvasElement, callbacks: ControllerCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.state = {
      layers: [],
      selectedId: null,
      backgroundColor: '#F5F0EB',
      textureType: 'none',
      textureSize: 2
    };

    this.callbacks = callbacks;
    this.startRenderLoop();
  }

  getState(): CanvasState {
    return { ...this.state, layers: this.state.layers.map(l => ({ ...l })) };
  }

  setState(state: CanvasState): void {
    this.state = JSON.parse(JSON.stringify(state));
    this.callbacks.onStateChange();
  }

  resizeCanvas(w: number, h: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addLayer(material: MaterialDef): void {
    const rect = this.canvas.getBoundingClientRect();
    const layer = createLayerFromMaterial(material, rect.width / 2, rect.height / 2);
    this.state.layers.push(layer);
    this.state.selectedId = layer.id;
    this.callbacks.onStateChange();
  }

  selectLayer(id: string | null): void {
    this.state.selectedId = id;
    this.callbacks.onStateChange();
  }

  getSelectedLayer(): Layer | null {
    return this.state.layers.find(l => l.id === this.state.selectedId) || null;
  }

  updateSelectedLayer(patch: Partial<Layer>): void {
    const layer = this.getSelectedLayer();
    if (!layer) return;
    Object.assign(layer, patch);
    this.callbacks.onStateChange();
  }

  deleteSelectedLayer(): void {
    if (!this.state.selectedId) return;
    this.state.layers = this.state.layers.filter(l => l.id !== this.state.selectedId);
    this.state.selectedId = null;
    this.callbacks.onStateChange();
  }

  duplicateSelectedLayer(): void {
    const layer = this.getSelectedLayer();
    if (!layer) return;
    const clone: Layer = JSON.parse(JSON.stringify(layer));
    clone.id = 'layer_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    clone.x += 20;
    clone.y += 20;
    const idx = this.state.layers.findIndex(l => l.id === layer.id);
    this.state.layers.splice(idx + 1, 0, clone);
    this.state.selectedId = clone.id;
    this.callbacks.onStateChange();
  }

  moveLayerOrder(id: string, newIndex: number): void {
    const idx = this.state.layers.findIndex(l => l.id === id);
    if (idx < 0) return;
    const [layer] = this.state.layers.splice(idx, 1);
    const targetIdx = Math.max(0, Math.min(newIndex, this.state.layers.length));
    this.state.layers.splice(targetIdx, 0, layer);
    this.callbacks.onStateChange();
  }

  setBlendMode(mode: BlendMode): void {
    this.updateSelectedLayer({ blendMode: mode });
  }

  setOpacity(opacity: number): void {
    this.updateSelectedLayer({ opacity: Math.max(0.1, Math.min(1, opacity)) });
  }

  setShadowOffset(x: number, y: number): void {
    this.updateSelectedLayer({ shadowOffsetX: x, shadowOffsetY: y });
  }

  setLightEffect(type: LightEffectType, intensity: number, radius: number): void {
    this.updateSelectedLayer({
      lightEffect: { type, intensity: Math.max(0, Math.min(1, intensity)), radius: Math.max(5, Math.min(100, radius)) }
    });
  }

  setLayerVisible(id: string, visible: boolean): void {
    const layer = this.state.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = visible;
      this.callbacks.onStateChange();
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.state.layers.find(l => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0.1, Math.min(1, opacity));
      this.callbacks.onStateChange();
    }
  }

  setBackgroundColor(color: string): void {
    this.state.backgroundColor = color;
    this.callbacks.onStateChange();
  }

  setTexture(type: TextureType, size: number): void {
    this.state.textureType = type;
    this.state.textureSize = Math.max(1, Math.min(5, size));
    this.callbacks.onStateChange();
  }

  exportToPNG(): void {
    const exportSize = 2048;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportSize;
    offCanvas.height = exportSize;
    const offCtx = offCanvas.getContext('2d')!;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = exportSize / rect.width;
    const scaleY = exportSize / rect.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (exportSize - rect.width * scale) / 2;
    const offsetY = (exportSize - rect.height * scale) / 2;

    offCtx.fillStyle = this.state.backgroundColor;
    offCtx.fillRect(0, 0, exportSize, exportSize);

    offCtx.save();
    offCtx.translate(offsetX, offsetY);
    offCtx.scale(scale, scale);

    LayerRenderer.drawTexture(offCtx, rect.width, rect.height, this.state.textureType, this.state.textureSize);

    for (const layer of this.state.layers) {
      const l = { ...layer, pressAnim: 0 };
      LayerRenderer.drawLayer(offCtx, l, true);
    }
    offCtx.restore();

    offCanvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collage_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  saveProject(): void {
    try {
      localStorage.setItem('collage_project', JSON.stringify(this.state));
      alert('项目已保存到本地！');
    } catch {
      alert('保存失败，存储空间可能不足。');
    }
  }

  loadProject(): boolean {
    const saved = localStorage.getItem('collage_project');
    if (!saved) {
      alert('没有找到已保存的项目！');
      return false;
    }
    try {
      this.state = JSON.parse(saved);
      this.callbacks.onStateChange();
      return true;
    } catch {
      alert('项目数据损坏，无法恢复！');
      return false;
    }
  }

  handleMouseDown(clientX: number, clientY: number, shiftPressed: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const selected = this.getSelectedLayer();

    if (selected) {
      const corner = this.hitTestCorner(selected, x, y);
      if (corner >= 0) {
        this.interactionMode = 'corner-resize';
        this.resizeCorner = corner;
        this.activeLayerId = selected.id;
        this.dragStartX = x;
        this.dragStartY = y;
        this.layerStartWidth = selected.width;
        this.layerStartHeight = selected.height;
        this.layerStartX = selected.x;
        this.layerStartY = selected.y;
        this.startPressAnimation(selected.id);
        return;
      }
    }

    const hitLayer = this.hitTestLayer(x, y);
    if (hitLayer) {
      this.state.selectedId = hitLayer.id;
      this.callbacks.onStateChange();
      this.activeLayerId = hitLayer.id;
      this.dragStartX = x;
      this.dragStartY = y;
      this.layerStartX = hitLayer.x;
      this.layerStartY = hitLayer.y;
      this.layerStartRotation = hitLayer.rotation;

      if (shiftPressed) {
        this.interactionMode = 'rotate';
        this.isRotating = true;
        this.showRotationLabel = true;
      } else {
        this.interactionMode = 'drag';
        this.startPressAnimation(hitLayer.id);
      }
    } else {
      this.state.selectedId = null;
      this.callbacks.onStateChange();
    }
  }

  handleMouseMove(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (this.interactionMode === 'none' || !this.activeLayerId) return;
    const layer = this.state.layers.find(l => l.id === this.activeLayerId);
    if (!layer) return;

    this.snapX = null;
    this.snapY = null;

    switch (this.interactionMode) {
      case 'drag': {
        let newX = this.layerStartX + (x - this.dragStartX);
        let newY = this.layerStartY + (y - this.dragStartY);

        if (newX < this.SNAP_THRESHOLD && newX > -this.SNAP_THRESHOLD) {
          newX = 0;
          this.snapX = 0;
        }
        const rightEdge = rect.width - layer.width * layer.scale;
        if (Math.abs(newX - rightEdge) < this.SNAP_THRESHOLD) {
          newX = rightEdge;
          this.snapX = rect.width;
        }
        if (newY < this.SNAP_THRESHOLD && newY > -this.SNAP_THRESHOLD) {
          newY = 0;
          this.snapY = 0;
        }
        const bottomEdge = rect.height - layer.height * layer.scale;
        if (Math.abs(newY - bottomEdge) < this.SNAP_THRESHOLD) {
          newY = bottomEdge;
          this.snapY = rect.height;
        }

        layer.x = newX;
        layer.y = newY;
        break;
      }
      case 'rotate': {
        const cx = this.layerStartX + layer.width / 2;
        const cy = this.layerStartY + layer.height / 2;
        const startAngle = Math.atan2(this.dragStartY - cy, this.dragStartX - cx);
        const currentAngle = Math.atan2(y - cy, x - cx);
        const angleDelta = ((currentAngle - startAngle) * 180) / Math.PI;
        layer.rotation = this.layerStartRotation + angleDelta;
        break;
      }
      case 'corner-resize': {
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        const delta = (dx + dy) / 2;
        const aspectRatio = this.layerStartWidth / this.layerStartHeight;
        let newWidth = this.layerStartWidth + delta;
        let newHeight = newWidth / aspectRatio;
        const minW = 30;
        if (newWidth < minW) {
          newWidth = minW;
          newHeight = minW / aspectRatio;
        }
        layer.width = newWidth;
        layer.height = newHeight;
        if (this.resizeCorner === 0) {
          layer.x = this.layerStartX + (this.layerStartWidth - newWidth);
          layer.y = this.layerStartY + (this.layerStartHeight - newHeight);
        } else if (this.resizeCorner === 1) {
          layer.y = this.layerStartY + (this.layerStartHeight - newHeight);
        } else if (this.resizeCorner === 3) {
          layer.x = this.layerStartX + (this.layerStartWidth - newWidth);
        }
        break;
      }
    }
  }

  handleMouseUp(): void {
    if (this.interactionMode === 'drag' || this.interactionMode === 'corner-resize') {
      const layer = this.state.layers.find(l => l.id === this.activeLayerId);
      if (layer) {
        this.endPressAnimation(layer.id);
      }
    }
    if (this.interactionMode === 'rotate') {
      setTimeout(() => {
        this.showRotationLabel = false;
      }, 800);
    }
    this.interactionMode = 'none';
    this.activeLayerId = null;
    this.isRotating = false;
    this.snapX = null;
    this.snapY = null;
  }

  handleWheel(clientX: number, clientY: number, deltaY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const layer = this.hitTestLayer(x, y);
    if (!layer) return;

    this.state.selectedId = layer.id;
    const change = deltaY > 0 ? -0.05 : 0.05;
    layer.scale = Math.max(0.2, Math.min(2, layer.scale + change));
    this.callbacks.onStateChange();
  }

  private startPressAnimation(layerId: string): void {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return;
    const startTime = performance.now();
    const duration = 100;
    const animate = (t: number) => {
      const elapsed = t - startTime;
      const progress = Math.min(elapsed / duration, 1);
      layer.pressAnim = progress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private endPressAnimation(layerId: string): void {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return;
    const startTime = performance.now();
    const duration = 100;
    const startVal = layer.pressAnim;
    const animate = (t: number) => {
      const elapsed = t - startTime;
      const progress = Math.min(elapsed / duration, 1);
      layer.pressAnim = startVal * (1 - progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private hitTestLayer(x: number, y: number): Layer | null {
    for (let i = this.state.layers.length - 1; i >= 0; i--) {
      const layer = this.state.layers[i];
      if (!layer.visible) continue;
      if (this.isPointInLayer(x, y, layer)) {
        return layer;
      }
    }
    return null;
  }

  private isPointInLayer(px: number, py: number, layer: Layer): boolean {
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const angle = -(layer.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localX = (px - cx) * cos - (py - cy) * sin + cx;
    const localY = (px - cx) * sin + (py - cy) * cos + cy;
    const halfW = (layer.width * layer.scale) / 2;
    const halfH = (layer.height * layer.scale) / 2;
    return localX >= cx - halfW && localX <= cx + halfW && localY >= cy - halfH && localY <= cy + halfH;
  }

  private hitTestCorner(layer: Layer, x: number, y: number): number {
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const cos = Math.cos(-(layer.rotation * Math.PI) / 180);
    const sin = Math.sin(-(layer.rotation * Math.PI) / 180);
    const corners = [
      [layer.x, layer.y],
      [layer.x + layer.width, layer.y],
      [layer.x + layer.width, layer.y + layer.height],
      [layer.x, layer.y + layer.height]
    ];
    for (let i = 0; i < corners.length; i++) {
      const [hx, hy] = corners[i];
      const dxx = hx - cx;
      const dyy = hy - cy;
      const tx = cx + dxx * cos - dyy * sin;
      const ty = cy + dxx * sin + dyy * cos;
      const dist = Math.sqrt((x - tx) ** 2 + (y - ty) ** 2);
      if (dist <= 8) return i;
    }
    return -1;
  }

  private startRenderLoop(): void {
    const render = (t: number) => {
      if (t - this.lastFrameTime >= 16) {
        this.render();
        this.lastFrameTime = t;
      }
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.save();
    this.ctx.fillStyle = this.state.backgroundColor;
    this.ctx.fillRect(0, 0, w, h);

    LayerRenderer.drawTexture(this.ctx, w, h, this.state.textureType, this.state.textureSize);

    for (const layer of this.state.layers) {
      LayerRenderer.drawLayer(this.ctx, layer);
    }

    const selected = this.getSelectedLayer();
    if (selected && selected.visible) {
      LayerRenderer.drawSelectionOutline(this.ctx, selected, this.snapX, this.snapY, w, h);
      if (this.showRotationLabel) {
        LayerRenderer.drawRotationLabel(this.ctx, selected);
      }
    }

    this.ctx.restore();
  }

  destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
