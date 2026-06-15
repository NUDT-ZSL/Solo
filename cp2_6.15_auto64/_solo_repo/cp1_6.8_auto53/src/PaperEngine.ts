import { fabric } from 'fabric';
import { FoldingSimulator, FoldLine } from './FoldingSimulator';

export type ModuleType = 'square' | 'triangle' | 'diamond';
export type ToolType = 'select' | 'connect' | 'fold';

export interface PaperModule {
  id: string;
  type: ModuleType;
  x: number;
  y: number;
  angle: number;
  scale: number;
}

export interface PaperConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface EngineCallbacks {
  onModuleMoved: (id: string, x: number, y: number) => void;
  onModuleRotated: (id: string, angle: number) => void;
  onConnectionMade: (fromId: string, toId: string) => void;
  onModuleSelected: (id: string | null) => void;
}

interface GlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const MODULE_COLORS: Record<ModuleType, string> = {
  square: '#FFF8E7',
  triangle: '#FFF3D6',
  diamond: '#FFEEC2',
};

const MODULE_STROKE: Record<ModuleType, string> = {
  square: '#D4A843',
  triangle: '#C89B3C',
  diamond: '#BC8E30',
};

const GLOW_COLOR = 'rgba(212, 168, 67, 0.6)';
const CONNECTION_COLOR = '#D4A843';
const FOLD_LINE_COLOR = 'rgba(180, 140, 60, 0.35)';

export class PaperEngine {
  private canvas: fabric.Canvas;
  private callbacks: EngineCallbacks;
  private fabricObjects: Map<string, fabric.Group> = new Map();
  private connectionLines: Map<string, fabric.Line> = new Map();
  private foldLines: Map<string, fabric.Line[]> = new Map();
  private glowParticles: GlowParticle[] = [];
  private particleCanvas: HTMLCanvasElement;
  private particleCtx: CanvasRenderingContext2D;
  private foldingSim: FoldingSimulator;
  private animFrameId: number = 0;
  private connectingFromId: string | null = null;
  private tempLine: fabric.Line | null = null;
  private activeTool: ToolType = 'select';
  private selectedId: string | null = null;
  private dragOffsets: Map<string, { dx: number; dy: number }> = new Map();
  private elasticTargets: Map<string, { x: number; y: number; vx: number; vy: number }> = new Map();
  private disposed = false;

  constructor(canvasEl: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.foldingSim = new FoldingSimulator();

    this.particleCanvas = document.createElement('canvas');
    this.particleCtx = this.particleCanvas.getContext('2d')!;

    this.canvas = new fabric.Canvas(canvasEl, {
      width: canvasEl.parentElement?.clientWidth || window.innerWidth,
      height: canvasEl.parentElement?.clientHeight || window.innerHeight,
      backgroundColor: 'transparent',
      selection: false,
      renderOnAddRemove: false,
    });

    this.particleCanvas.width = this.canvas.getWidth();
    this.particleCanvas.height = this.canvas.getHeight();
    this.particleCanvas.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;z-index:10;';

    const wrapper = this.canvas.getElement().parentElement?.parentElement;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(this.particleCanvas);
    }

    this.setupBackground();
    this.setupEvents();
    this.startAnimationLoop();
  }

  private setupBackground() {
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();

    const bg = new fabric.Rect({
      width: w,
      height: h,
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
    });

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 300;
    patternCanvas.height = 300;
    const pctx = patternCanvas.getContext('2d')!;

    pctx.fillStyle = '#F5E6C8';
    pctx.fillRect(0, 0, 300, 300);

    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 300;
      const y = Math.random() * 300;
      const alpha = Math.random() * 0.06 + 0.01;
      pctx.strokeStyle = `rgba(160, 120, 60, ${alpha})`;
      pctx.lineWidth = Math.random() * 1.5 + 0.5;
      pctx.beginPath();
      pctx.moveTo(x, y);
      pctx.lineTo(x + (Math.random() - 0.5) * 40, y + Math.random() * 3);
      pctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const y = i * 38 + Math.random() * 10;
      pctx.strokeStyle = `rgba(140, 100, 50, 0.04)`;
      pctx.lineWidth = 1;
      pctx.beginPath();
      pctx.moveTo(0, y);
      pctx.lineTo(300, y + (Math.random() - 0.5) * 6);
      pctx.stroke();
    }

    const pattern = new fabric.Pattern({ source: patternCanvas, repeat: 'repeat' });
    bg.set('fill', pattern);

    this.canvas.add(bg);
    this.canvas.sendToBack(bg);
  }

  private createModuleShape(type: ModuleType): fabric.Object[] {
    const size = 80;
    const objects: fabric.Object[] = [];

    let mainShape: fabric.Object;
    switch (type) {
      case 'square':
        mainShape = new fabric.Rect({
          width: size,
          height: size,
          fill: MODULE_COLORS[type],
          stroke: MODULE_STROKE[type],
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          originX: 'center',
          originY: 'center',
        });
        break;
      case 'triangle':
        mainShape = new fabric.Triangle({
          width: size,
          height: size * 0.866,
          fill: MODULE_COLORS[type],
          stroke: MODULE_STROKE[type],
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        break;
      case 'diamond':
        mainShape = new fabric.Polygon(
          [
            { x: 0, y: -size * 0.6 },
            { x: size * 0.45, y: 0 },
            { x: 0, y: size * 0.6 },
            { x: -size * 0.45, y: 0 },
          ],
          {
            fill: MODULE_COLORS[type],
            stroke: MODULE_STROKE[type],
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          }
        );
        break;
    }
    objects.push(mainShape);

    const glowRect = new fabric.Rect({
      width: type === 'square' ? size + 8 : size + 8,
      height: type === 'square' ? size + 8 : size * 0.866 + 8,
      fill: 'transparent',
      stroke: GLOW_COLOR,
      strokeWidth: 2,
      rx: 6,
      ry: 6,
      originX: 'center',
      originY: 'center',
      opacity: 0.5,
    });
    objects.push(glowRect);

    return objects;
  }

  private getModulePoints(type: ModuleType, x: number, y: number, angle: number, scale: number): { x: number; y: number }[] {
    const s = 80 * scale;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotate = (px: number, py: number) => ({
      x: x + px * cos - py * sin,
      y: y + px * sin + py * cos,
    });

    switch (type) {
      case 'square': {
        const h = s / 2;
        return [rotate(-h, -h), rotate(h, -h), rotate(h, h), rotate(-h, h)];
      }
      case 'triangle': {
        const h = s * 0.866;
        return [rotate(0, -h / 2), rotate(s / 2, h / 2), rotate(-s / 2, h / 2)];
      }
      case 'diamond': {
        return [
          rotate(0, -s * 0.6),
          rotate(s * 0.45, 0),
          rotate(0, s * 0.6),
          rotate(-s * 0.45, 0),
        ];
      }
    }
  }

  addModule(mod: PaperModule) {
    const shapes = this.createModuleShape(mod.type);
    const group = new fabric.Group(shapes, {
      left: mod.x,
      top: mod.y,
      angle: mod.angle,
      scaleX: mod.scale,
      scaleY: mod.scale,
      originX: 'center',
      originY: 'center',
      hasControls: true,
      hasBorders: true,
      borderColor: '#D4A843',
      cornerColor: '#D4A843',
      cornerSize: 8,
      transparentCorners: false,
      shadow: new fabric.Shadow({
        color: 'rgba(180, 140, 60, 0.25)',
        blur: 15,
        offsetX: 3,
        offsetY: 5,
      }),
    });

    (group as any).__moduleId = mod.id;
    this.fabricObjects.set(mod.id, group);
    this.elasticTargets.set(mod.id, { x: mod.x, y: mod.y, vx: 0, vy: 0 });

    this.canvas.add(group);
    this.updateFoldLines(mod.id, mod);
    this.canvas.requestRenderAll();
  }

  removeModule(id: string) {
    const obj = this.fabricObjects.get(id);
    if (obj) {
      this.canvas.remove(obj);
      this.fabricObjects.delete(id);
      this.elasticTargets.delete(id);
    }
    this.removeFoldLines(id);
    const toRemove: string[] = [];
    this.connectionLines.forEach((_, connId) => {
      toRemove.push(connId);
    });
    toRemove.forEach((cid) => {
      const line = this.connectionLines.get(cid);
      if (line) {
        this.canvas.remove(line);
        this.connectionLines.delete(cid);
      }
    });
    this.canvas.requestRenderAll();
  }

  updateModulePosition(id: string, x: number, y: number, angle?: number) {
    const obj = this.fabricObjects.get(id);
    if (obj) {
      obj.set({ left: x, top: y });
      if (angle !== undefined) obj.set('angle', angle);
      obj.setCoords();
    }
  }

  private updateFoldLines(moduleId: string, mod: PaperModule) {
    this.removeFoldLines(moduleId);
    const points = this.getModulePoints(mod.type, mod.x, mod.y, mod.angle, mod.scale);
    const folds: FoldLine[] = this.foldingSim.generateFoldLines(points, mod.type);

    const lines: fabric.Line[] = [];
    folds.forEach((fold) => {
      const line = new fabric.Line([fold.x1, fold.y1, fold.x2, fold.y2], {
        stroke: FOLD_LINE_COLOR,
        strokeWidth: 1.5,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      this.canvas.add(line);
      this.canvas.sendToBack(line);
      lines.push(line);
    });
    this.foldLines.set(moduleId, lines);
  }

  private removeFoldLines(moduleId: string) {
    const lines = this.foldLines.get(moduleId);
    if (lines) {
      lines.forEach((l) => this.canvas.remove(l));
      this.foldLines.delete(moduleId);
    }
  }

  addConnection(conn: PaperConnection) {
    const fromObj = this.fabricObjects.get(conn.fromId);
    const toObj = this.fabricObjects.get(conn.toId);
    if (!fromObj || !toObj) return;

    const line = new fabric.Line(
      [fromObj.left!, fromObj.top!, toObj.left!, toObj.top!],
      {
        stroke: CONNECTION_COLOR,
        strokeWidth: 2.5,
        selectable: false,
        evented: false,
        shadow: new fabric.Shadow({
          color: 'rgba(212, 168, 67, 0.5)',
          blur: 12,
          offsetX: 0,
          offsetY: 0,
        }),
      }
    );

    this.canvas.add(line);
    this.canvas.sendToBack(line);
    this.connectionLines.set(conn.id, line);

    this.spawnGlowParticles(
      (fromObj.left! + toObj.left!) / 2,
      (fromObj.top! + toObj.top!) / 2
    );

    this.canvas.requestRenderAll();
  }

  removeConnection(id: string) {
    const line = this.connectionLines.get(id);
    if (line) {
      this.canvas.remove(line);
      this.connectionLines.delete(id);
      this.canvas.requestRenderAll();
    }
  }

  private spawnGlowParticles(cx: number, cy: number) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.glowParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 40 + Math.random() * 20,
        size: Math.random() * 3 + 1,
      });
    }
  }

  private setupEvents() {
    this.canvas.on('mouse:down', (opt) => {
      const target = opt.target as fabric.Group | undefined;
      const moduleId = target ? (target as any).__moduleId : null;

      if (this.activeTool === 'connect') {
        if (moduleId) {
          if (!this.connectingFromId) {
            this.connectingFromId = moduleId;
            const obj = this.fabricObjects.get(moduleId);
            if (obj) {
              this.tempLine = new fabric.Line(
                [obj.left!, obj.top!, opt.e.offsetX, opt.e.offsetY],
                {
                  stroke: 'rgba(212, 168, 67, 0.5)',
                  strokeWidth: 2,
                  strokeDashArray: [8, 4],
                  selectable: false,
                  evented: false,
                }
              );
              this.canvas.add(this.tempLine);
            }
          } else if (moduleId !== this.connectingFromId) {
            this.callbacks.onConnectionMade(this.connectingFromId, moduleId);
            this.connectingFromId = null;
            if (this.tempLine) {
              this.canvas.remove(this.tempLine);
              this.tempLine = null;
            }
          }
        }
        return;
      }

      if (moduleId) {
        this.selectedId = moduleId;
        this.callbacks.onModuleSelected(moduleId);
        const obj = this.fabricObjects.get(moduleId);
        if (obj) {
          this.dragOffsets.set(moduleId, {
            dx: opt.e.offsetX - obj.left!,
            dy: opt.e.offsetY - obj.top!,
          });
          const target = this.elasticTargets.get(moduleId);
          if (target) {
            target.x = obj.left!;
            target.y = obj.top!;
          }
        }
      } else {
        this.selectedId = null;
        this.callbacks.onModuleSelected(null);
      }
    });

    this.canvas.on('mouse:move', (opt) => {
      if (this.connectingFromId && this.tempLine) {
        this.tempLine.set({ x2: opt.e.offsetX, y2: opt.e.offsetY });
        this.canvas.requestRenderAll();
        return;
      }

      if (this.selectedId && this.dragOffsets.has(this.selectedId)) {
        const offset = this.dragOffsets.get(this.selectedId)!;
        const newX = opt.e.offsetX - offset.dx;
        const newY = opt.e.offsetY - offset.dy;
        const target = this.elasticTargets.get(this.selectedId);
        if (target) {
          target.x = newX;
          target.y = newY;
        }
      }
    });

    this.canvas.on('mouse:up', () => {
      if (this.selectedId) {
        const obj = this.fabricObjects.get(this.selectedId);
        if (obj) {
          this.callbacks.onModuleMoved(this.selectedId, obj.left!, obj.top!);
        }
      }
      this.dragOffsets.clear();
    });

    this.canvas.on('object:modified', (opt) => {
      const target = opt.target as fabric.Group;
      const moduleId = (target as any).__moduleId;
      if (moduleId) {
        this.callbacks.onModuleMoved(moduleId, target.left!, target.top!);
        this.callbacks.onModuleRotated(moduleId, target.angle!);
      }
    });
  }

  private startAnimationLoop() {
    const loop = () => {
      if (this.disposed) return;
      this.updateElasticPositions();
      this.updateConnectionLines();
      this.updateParticles();
      this.canvas.requestRenderAll();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateElasticPositions() {
    const stiffness = 0.15;
    const damping = 0.7;

    this.elasticTargets.forEach((target, id) => {
      const obj = this.fabricObjects.get(id);
      if (!obj || this.dragOffsets.has(id)) return;

      const dx = target.x - obj.left!;
      const dy = target.y - obj.top!;

      target.vx += dx * stiffness;
      target.vy += dy * stiffness;
      target.vx *= damping;
      target.vy *= damping;

      const newX = obj.left! + target.vx;
      const newY = obj.top! + target.vy;

      obj.set({ left: newX, top: newY });
      obj.setCoords();
    });
  }

  private updateConnectionLines() {
    this.connectionLines.forEach((line, connId) => {
      const parts = connId.split('::');
      const fromId = parts[0];
      const toId = parts[1];
      const fromObj = this.fabricObjects.get(fromId);
      const toObj = this.fabricObjects.get(toId);
      if (fromObj && toObj) {
        line.set({ x1: fromObj.left!, y1: fromObj.top!, x2: toObj.left!, y2: toObj.top! });
      }
    });
  }

  private updateParticles() {
    const w = this.particleCanvas.width;
    const h = this.particleCanvas.height;
    this.particleCtx.clearRect(0, 0, w, h);

    this.glowParticles = this.glowParticles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 1 / p.maxLife;

      if (p.life <= 0) return false;

      const alpha = p.life * 0.8;
      const gradient = this.particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, `rgba(212, 168, 67, ${alpha})`);
      gradient.addColorStop(1, `rgba(212, 168, 67, 0)`);

      this.particleCtx.beginPath();
      this.particleCtx.fillStyle = gradient;
      this.particleCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      this.particleCtx.fill();

      return true;
    });
  }

  syncState(
    modules: PaperModule[],
    connections: PaperConnection[],
    selectedId: string | null,
    activeTool: ToolType
  ) {
    this.activeTool = activeTool;
    this.selectedId = selectedId;

    const currentIds = new Set(this.fabricObjects.keys());
    const newIds = new Set(modules.map((m) => m.id));

    currentIds.forEach((id) => {
      if (!newIds.has(id)) this.removeModule(id);
    });

    modules.forEach((mod) => {
      if (!this.fabricObjects.has(mod.id)) {
        this.addModule(mod);
      } else {
        const obj = this.fabricObjects.get(mod.id)!;
        const target = this.elasticTargets.get(mod.id);
        if (target && !this.dragOffsets.has(mod.id)) {
          target.x = mod.x;
          target.y = mod.y;
        }
        obj.set({ angle: mod.angle, scaleX: mod.scale, scaleY: mod.scale });
        this.updateFoldLines(mod.id, mod);
      }
    });

    const currentConns = new Set(this.connectionLines.keys());
    const newConns = new Set(connections.map((c) => c.id));

    currentConns.forEach((id) => {
      if (!newConns.has(id)) {
        const line = this.connectionLines.get(id);
        if (line) {
          this.canvas.remove(line);
          this.connectionLines.delete(id);
        }
      }
    });

    connections.forEach((conn) => {
      if (!this.connectionLines.has(conn.id)) {
        this.addConnection(conn);
      } else {
        const fromObj = this.fabricObjects.get(conn.fromId);
        const toObj = this.fabricObjects.get(conn.toId);
        const line = this.connectionLines.get(conn.id);
        if (fromObj && toObj && line) {
          line.set({
            x1: fromObj.left!,
            y1: fromObj.top!,
            x2: toObj.left!,
            y2: toObj.top!,
          });
        }
      }
    });
  }

  resize(width: number, height: number) {
    this.canvas.setDimensions({ width, height });
    this.particleCanvas.width = width;
    this.particleCanvas.height = height;
    this.setupBackground();
    this.canvas.requestRenderAll();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.canvas.dispose();
  }
}
