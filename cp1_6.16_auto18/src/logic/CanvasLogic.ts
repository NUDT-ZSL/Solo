import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { Material } from '@/data/materials';

export interface CanvasElement {
  id: string;
  materialId: string;
  fabricObject: fabric.Object;
  angleLabel?: fabric.Text;
}

const MAX_HISTORY = 20;

export class CanvasLogic {
  private canvas: fabric.Canvas | null = null;
  private elements: Map<string, CanvasElement> = new Map();
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  init(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.canvas) return;

    this.canvas.on('object:rotating', (e) => {
      this.updateAngleLabel(e.target);
    });

    this.canvas.on('object:modified', () => {
      this.saveState();
    });

    this.canvas.on('object:added', () => {
      this.saveState();
    });

    this.canvas.on('object:removed', () => {
      this.saveState();
    });
  }

  private updateAngleLabel(obj: fabric.Object | undefined) {
    if (!obj) return;
    const element = this.findElementByFabricObject(obj);
    if (!element) return;

    if (!element.angleLabel) {
      const label = new fabric.Text(`${Math.round(obj.angle || 0)}°`, {
        fontSize: 14,
        fill: '#3C3C3C',
        backgroundColor: '#FFFFFF',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      element.angleLabel = label;
      this.canvas?.add(label);
    }

    const angle = Math.round(obj.angle || 0);
    element.angleLabel.set('text', `${angle}°`);

    const objRect = obj.getBoundingRect();
    element.angleLabel.set({
      left: objRect.left + objRect.width / 2,
      top: objRect.top - 25,
    });

    element.angleLabel.setCoords();
    this.canvas?.requestRenderAll();
  }

  private removeAngleLabel(element: CanvasElement) {
    if (element.angleLabel && this.canvas) {
      this.canvas.remove(element.angleLabel);
      element.angleLabel = undefined;
    }
  }

  private findElementByFabricObject(obj: fabric.Object): CanvasElement | undefined {
    for (const element of this.elements.values()) {
      if (element.fabricObject === obj) {
        return element;
      }
    }
    return undefined;
  }

  addMaterial(material: Material, x: number, y: number): string | null {
    if (!this.canvas) return null;

    const elementId = uuidv4();
    const rect = new fabric.Rect({
      left: x,
      top: y,
      width: material.defaultWidth,
      height: material.defaultHeight,
      fill: material.color,
      stroke: '#3C3C3C',
      strokeWidth: 2,
      rx: 6,
      ry: 6,
      cornerStyle: 'circle',
      cornerColor: '#8B5E3C',
      cornerStrokeColor: '#D2B48C',
      borderColor: '#8B5E3C',
      cornerSize: 12,
      transparentCorners: false,
      hasRotatingPoint: true,
      rotatingPointOffset: 30,
    });

    const nameLabel = new fabric.Text(material.name, {
      fontSize: 11,
      fill: '#FFFFFF',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      fontWeight: 'bold',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 2,
        offsetX: 1,
        offsetY: 1,
      }),
    });

    const group = new fabric.Group([rect, nameLabel], {
      left: x,
      top: y,
      cornerStyle: 'circle',
      cornerColor: '#8B5E3C',
      cornerStrokeColor: '#D2B48C',
      borderColor: '#8B5E3C',
      cornerSize: 12,
      transparentCorners: false,
    });

    group.set('data', { elementId, materialId: material.id });

    this.canvas.add(group);
    this.canvas.setActiveObject(group);

    const element: CanvasElement = {
      id: elementId,
      materialId: material.id,
      fabricObject: group,
    };
    this.elements.set(elementId, element);

    return elementId;
  }

  deleteSelected() {
    if (!this.canvas) return;
    const activeObjects = this.canvas.getActiveObjects();
    activeObjects.forEach((obj) => {
      const element = this.findElementByFabricObject(obj);
      if (element) {
        this.removeAngleLabel(element);
        this.elements.delete(element.id);
      }
      this.canvas?.remove(obj);
    });
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  private getSerializedState(): string {
    return JSON.stringify(this.canvas?.toJSON() || {});
  }

  private restoreFromState(state: string) {
    if (!this.canvas) return;
    const json = JSON.parse(state);
    this.elements.clear();
    this.canvas.loadFromJSON(json, () => {
      this.canvas?.renderAll();
      const objects = this.canvas?.getObjects() || [];
      objects.forEach((obj) => {
        const data = (obj as any).data;
        if (data && data.elementId) {
          this.elements.set(data.elementId, {
            id: data.elementId,
            materialId: data.materialId,
            fabricObject: obj,
          });
        }
      });
    });
  }

  saveState() {
    const currentState = this.getSerializedState();

    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === currentState) {
      return;
    }

    if (this.undoStack.length >= MAX_HISTORY) {
      console.warn('⚠️ 历史记录已满，最旧的操作将被丢弃。撤销/重做栈深度限制为20步。');
      this.undoStack.shift();
    }

    this.undoStack.push(currentState);
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prevState = this.undoStack[this.undoStack.length - 1];
    this.restoreFromState(prevState);
  }

  redo() {
    if (!this.canRedo()) return;

    const nextState = this.redoStack.pop()!;
    this.undoStack.push(nextState);
    this.restoreFromState(nextState);
  }

  clearCanvas(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.canvas) {
        resolve();
        return;
      }

      const objects = this.canvas.getObjects().filter((obj) => {
        const isGrid = (obj as any).isGrid;
        return !isGrid;
      });

      if (objects.length === 0) {
        resolve();
        return;
      }

      let animated = 0;
      const total = objects.length;

      objects.forEach((obj) => {
        obj.animate('opacity', 0, {
          duration: 300,
          onChange: () => {
            this.canvas?.requestRenderAll();
          },
          onComplete: () => {
            animated++;
            if (animated >= total) {
              setTimeout(() => {
                this.elements.forEach((el) => this.removeAngleLabel(el));
                this.elements.clear();
                this.canvas?.getObjects().forEach((o) => {
                  const isGrid = (o as any).isGrid;
                  if (!isGrid) {
                    this.canvas?.remove(o);
                  }
                });
                this.canvas?.renderAll();
                this.saveState();
                resolve();
              }, 50);
            }
          },
        });
      });
    });
  }

  exportPNG(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Canvas未初始化'));
        return;
      }

      this.canvas.discardActiveObject();
      this.canvas.renderAll();

      const width = this.canvas.getWidth();
      const height = this.canvas.getHeight();

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const offCtx = offscreenCanvas.getContext('2d');

      if (!offCtx) {
        reject(new Error('无法创建离屏Canvas上下文'));
        return;
      }

      const dataURL = this.canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        offCtx.clearRect(0, 0, width * 2, height * 2);
        offCtx.drawImage(img, 0, 0);
        const finalDataURL = offscreenCanvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.download = `微缩景观_${Date.now()}.png`;
        link.href = finalDataURL;
        link.click();

        resolve(finalDataURL);
      };
      img.onerror = () => {
        reject(new Error('图片渲染失败'));
      };
      img.src = dataURL;
    });
  }

  checkCollision(obj1: fabric.Object, obj2: fabric.Object): boolean {
    const r1 = obj1.getBoundingRect();
    const r2 = obj2.getBoundingRect();
    return !(
      r1.left + r1.width < r2.left ||
      r2.left + r2.width < r1.left ||
      r1.top + r1.height < r2.top ||
      r2.top + r2.height < r1.top
    );
  }

  getElementsCount(): number {
    return this.elements.size;
  }

  destroy() {
    this.elements.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.canvas = null;
  }
}

export const canvasLogic = new CanvasLogic();
