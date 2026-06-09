import { v4 as uuidv4 } from 'uuid';
import type {
  Character,
  CharacterType,
  Connection,
  Particle,
  Dialog,
  HistoryEntry,
  HistoryState,
  StageOptions,
  Point,
  CharacterPreset,
} from './types';
import { CHARACTER_PRESETS } from './types';

type DragMode =
  | 'none'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'external_drag';

interface DragState {
  mode: DragMode;
  characterId: string | null;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origRotation: number;
  origScale: number;
  startAngle: number;
  startTime: number;
  externalType: CharacterType | null;
}

interface AnimState {
  characterId: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startTime: number;
  duration: number;
}

const CONNECTION_THRESHOLD = 120;
const SCALE_MIN = 0.5;
const SCALE_MAX = 2.5;
const ROTATE_SNAP = 15;
const MAX_HISTORY = 20;

export class StageManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;

  private characters: Character[] = [];
  private connections: Connection[] = [];
  private particles: Particle[] = [];
  private fireflies: Particle[] = [];

  private selectedId: string | null = null;
  private hoveredConnectionId: string | null = null;

  private drag: DragState = {
    mode: 'none',
    characterId: null,
    startX: 0, startY: 0,
    origX: 0, origY: 0,
    origRotation: 0, origScale: 1,
    startAngle: 0,
    startTime: 0,
    externalType: null,
  };

  private animQueue: AnimState[] = [];

  private history: HistoryEntry[] = [];
  private historyIndex = -1;

  private options: StageOptions = {
    backgroundColor: '#2a2a2a',
    hue: 0,
    glowMode: false,
  };

  private lastTime = 0;
  private rafId = 0;
  private running = false;

  private onDialogRequest: ((conn: Connection) => void) | null = null;
  private onStateChange: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.bindEvents();
    this.initFireflies();
  }

  setDialogRequestHandler(cb: (conn: Connection) => void) {
    this.onDialogRequest = cb;
  }

  setStateChangeHandler(cb: () => void) {
    this.onStateChange = cb;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  getStageSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  setOptions(opt: Partial<StageOptions>) {
    Object.assign(this.options, opt);
  }

  getOptions(): StageOptions {
    return { ...this.options };
  }

  getPresets(): CharacterPreset[] {
    return CHARACTER_PRESETS;
  }

  addCharacterFromExternal(type: CharacterType, clientX: number, clientY: number) {
    const preset = CHARACTER_PRESETS.find(p => p.type === type);
    if (!preset) return;
    const pt = this.clientToStage(clientX, clientY);
    const char: Character = {
      id: uuidv4(),
      type,
      x: pt.x,
      y: pt.y,
      rotation: 0,
      scale: 1,
      width: preset.width,
      height: preset.height,
    };

    this.pushHistory('add_character');
    this.characters.push(char);
    this.selectedId = char.id;

    const scaleStart = 0.2;
    const startTime = performance.now();
    const animScale = () => {
      const t = Math.min(1, (performance.now() - startTime) / 300);
      const eased = this.easeOutBack(t);
      char.scale = scaleStart + (1 - scaleStart) * eased;
      if (t < 1) requestAnimationFrame(animScale);
      else char.scale = 1;
    };
    animScale();

    this.updateConnections();
    this.notifyState();
  }

  beginExternalDrag(type: CharacterType, clientX: number, clientY: number) {
    const pt = this.clientToStage(clientX, clientY);
    this.drag = {
      mode: 'external_drag',
      characterId: null,
      startX: pt.x,
      startY: pt.y,
      origX: pt.x, origY: pt.y,
      origRotation: 0, origScale: 1,
      startAngle: 0,
      startTime: performance.now(),
      externalType: type,
    };
  }

  getCharacters(): Character[] {
    return this.characters.map(c => ({ ...c }));
  }

  getConnections(): Connection[] {
    return this.connections.map(c => ({ ...c }));
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  selectCharacter(id: string | null) {
    this.selectedId = id;
  }

  deleteSelected() {
    if (!this.selectedId) return;
    this.pushHistory('remove_character');
    this.characters = this.characters.filter(c => c.id !== this.selectedId);
    this.connections = this.connections.filter(
      c => c.fromId !== this.selectedId && c.toId !== this.selectedId
    );
    this.selectedId = null;
    this.updateConnections();
    this.notifyState();
  }

  clearAll() {
    if (this.characters.length === 0) return;
    this.pushHistory('clear_all');
    this.characters = [];
    this.connections = [];
    this.selectedId = null;
    this.particles = this.particles.filter(p => p.isFirefly);
    this.notifyState();
  }

  markConnectionGold(fromId: string, toId: string) {
    const conn = this.connections.find(
      c => (c.fromId === fromId && c.toId === toId) ||
           (c.fromId === toId && c.toId === fromId)
    );
    if (conn) {
      conn.goldUntil = performance.now() + 3000;
    }
  }

  exportStoryboard(dialogs: Dialog[]): Record<string, unknown> {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      characters: this.characters.map(c => ({
        id: c.id,
        type: c.type,
        x: Math.round(c.x * 100) / 100,
        y: Math.round(c.y * 100) / 100,
        rotation: Math.round(c.rotation * 10) / 10,
        scale: Math.round(c.scale * 100) / 100,
      })),
      connections: this.connections.map(c => ({
        id: c.id,
        fromId: c.fromId,
        toId: c.toId,
      })),
      dialogs: dialogs.map(d => ({
        fromId: d.fromId,
        toId: d.toId,
        text: d.text,
        timestamp: d.timestamp,
      })),
    };
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    const entry = this.history[this.historyIndex];
    this.restoreState(entry.before);
    this.historyIndex--;
    this.notifyState();
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const entry = this.history[this.historyIndex];
    this.restoreState(entry.after);
    this.notifyState();
  }

  pushHistory(type: HistoryEntry['type']) {
    const before = this.snapshotState();
    const commit = () => {
      const after = this.snapshotState();
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push({ type, before, after });
      if (this.history.length > MAX_HISTORY) {
        const remove = this.history.length - MAX_HISTORY;
        this.history = this.history.slice(remove);
        this.historyIndex -= remove;
      } else {
        this.historyIndex++;
      }
    };
    queueMicrotask(commit);
  }

  private snapshotState(): HistoryState {
    return {
      characters: this.characters.map(c => ({ ...c })),
      connections: this.connections.map(c => ({ ...c })),
      dialogs: [],
    };
  }

  private restoreState(state: HistoryState) {
    this.characters = state.characters.map(c => ({ ...c }));
    this.connections = state.connections.map(c => ({ ...c }));
    this.selectedId = null;
    this.particles = this.particles.filter(p => p.isFirefly);
  }

  private notifyState() {
    this.onStateChange?.();
  }

  private clientToStage(cx: number, cy: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: cx - rect.left, y: cy - rect.top };
  }

  private bindEvents() {
    const c = this.canvas;

    c.addEventListener('mousedown', this.onMouseDown);
    c.addEventListener('mousemove', this.onMouseMove);
    c.addEventListener('mouseup', this.onMouseUp);
    c.addEventListener('mouseleave', this.onMouseUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('dblclick', this.onDblClick);
    c.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) ||
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
    ) {
      e.preventDefault();
      this.redo();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.deleteSelected();
    } else if (e.key === 'Escape') {
      this.selectedId = null;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    const pt = this.clientToStage(e.clientX, e.clientY);

    if (this.selectedId) {
      const sel = this.characters.find(c => c.id === this.selectedId);
      if (sel) {
        const rotateHandle = this.getRotateHandlePos(sel);
        if (this.dist(pt, rotateHandle) < 18) {
          this.drag.mode = 'rotate';
          this.drag.characterId = sel.id;
          this.drag.startX = pt.x;
          this.drag.startY = pt.y;
          this.drag.origRotation = sel.rotation;
          this.drag.startAngle = Math.atan2(pt.y - sel.y, pt.x - sel.x);
          this.drag.startTime = performance.now();
          this.pushHistory('transform_character');
          return;
        }
        const scaleHandle = this.getScaleHandlePos(sel);
        if (this.dist(pt, scaleHandle) < 18) {
          this.drag.mode = 'scale';
          this.drag.characterId = sel.id;
          this.drag.startX = pt.x;
          this.drag.startY = pt.y;
          this.drag.origScale = sel.scale;
          this.drag.startTime = performance.now();
          this.pushHistory('transform_character');
          return;
        }
      }
    }

    const hit = this.hitTestCharacter(pt);
    if (hit) {
      this.selectedId = hit.id;
      this.drag.mode = 'move';
      this.drag.characterId = hit.id;
      this.drag.startX = pt.x;
      this.drag.startY = pt.y;
      this.drag.origX = hit.x;
      this.drag.origY = hit.y;
      this.drag.startTime = performance.now();
      this.pushHistory('move_character');
    } else {
      this.selectedId = null;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const pt = this.clientToStage(e.clientX, e.clientY);

    if (this.drag.mode === 'external_drag' && this.drag.externalType) {
      this.drag.startX = pt.x;
      this.drag.startY = pt.y;
      return;
    }

    if (this.drag.mode === 'move' && this.drag.characterId) {
      const char = this.characters.find(c => c.id === this.drag.characterId);
      if (char) {
        char.x = this.drag.origX + (pt.x - this.drag.startX);
        char.y = this.drag.origY + (pt.y - this.drag.startY);
        this.clampToStage(char);
        this.updateConnections();
      }
      return;
    }

    if (this.drag.mode === 'rotate' && this.drag.characterId) {
      const char = this.characters.find(c => c.id === this.drag.characterId);
      if (char) {
        const angle = Math.atan2(pt.y - char.y, pt.x - char.x);
        let deg = (angle - this.drag.startAngle) * 180 / Math.PI + this.drag.origRotation;
        deg = Math.round(deg / ROTATE_SNAP) * ROTATE_SNAP;
        char.rotation = deg;
        this.updateConnections();
      }
      return;
    }

    if (this.drag.mode === 'scale' && this.drag.characterId) {
      const char = this.characters.find(c => c.id === this.drag.characterId);
      if (char) {
        const startDist = this.dist(
          { x: this.drag.startX, y: this.drag.startY },
          { x: char.x, y: char.y }
        );
        const curDist = this.dist(pt, { x: char.x, y: char.y });
        if (startDist > 1) {
          let s = this.drag.origScale * (curDist / startDist);
          s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
          char.scale = s;
          this.updateConnections();
        }
      }
      return;
    }

    this.hoveredConnectionId = this.hitTestConnection(pt);
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.drag.mode === 'external_drag' && this.drag.externalType) {
      const pt = this.clientToStage(e.clientX, e.clientY);
      const { width, height } = this.getStageSize();
      if (pt.x > 10 && pt.x < width - 10 && pt.y > 10 && pt.y < height - 10) {
        this.addCharacterFromExternal(this.drag.externalType, e.clientX, e.clientY);
      }
    }

    if (this.drag.mode === 'move' && this.drag.characterId) {
      const char = this.characters.find(c => c.id === this.drag.characterId);
      if (char) {
        const dt = performance.now() - this.drag.startTime;
        if (dt < 500) {
          const dx = char.x - this.drag.origX;
          const dy = char.y - this.drag.origY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            this.triggerBounceAnim(char);
          }
        }
      }
      this.updateConnections();
    }

    this.notifyState();
    this.drag = {
      mode: 'none', characterId: null,
      startX: 0, startY: 0,
      origX: 0, origY: 0,
      origRotation: 0, origScale: 1,
      startAngle: 0,
      startTime: 0,
      externalType: null,
    };
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.selectedId) return;
    const char = this.characters.find(c => c.id === this.selectedId);
    if (!char) return;
    this.pushHistory('transform_character');
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    char.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, char.scale * delta));
    this.updateConnections();
    this.notifyState();
  };

  private onDblClick = (e: MouseEvent) => {
    const pt = this.clientToStage(e.clientX, e.clientY);
    const connId = this.hitTestConnection(pt);
    if (connId) {
      const conn = this.connections.find(c => c.id === connId);
      if (conn) this.onDialogRequest?.(conn);
    }
  };

  private triggerBounceAnim(char: Character) {
    const origScale = char.scale;
    const t0 = performance.now();
    const anim = () => {
      const t = Math.min(1, (performance.now() - t0) / 300);
      const pulse = this.easeOutBack(t);
      char.scale = origScale * (1 + 0.06 * (1 - pulse));
      if (t < 1) requestAnimationFrame(anim);
      else char.scale = origScale;
    };
    anim();
  }

  private clampToStage(char: Character) {
    const { width, height } = this.getStageSize();
    const w = char.width * char.scale / 2;
    const h = char.height * char.scale / 2;
    char.x = Math.max(w, Math.min(width - w, char.x));
    char.y = Math.max(h, Math.min(height - h, char.y));
  }

  private dist(a: Point, b: Point): number {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private hitTestCharacter(pt: Point): Character | null {
    for (let i = this.characters.length - 1; i >= 0; i--) {
      const c = this.characters[i];
      const dx = pt.x - c.x;
      const dy = pt.y - c.y;
      const angle = -c.rotation * Math.PI / 180;
      const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
      const hw = c.width * c.scale / 2;
      const hh = c.height * c.scale / 2;
      if (lx >= -hw && lx <= hw && ly >= -hh && ly <= hh) {
        return c;
      }
    }
    return null;
  }

  private hitTestConnection(pt: Point): string | null {
    for (const conn of this.connections) {
      const from = this.characters.find(c => c.id === conn.fromId);
      const to = this.characters.find(c => c.id === conn.toId);
      if (!from || !to) continue;
      const dist = this.pointToSegmentDist(pt, { x: from.x, y: from.y }, { x: to.x, y: to.y });
      if (dist < 14) return conn.id;
    }
    return null;
  }

  private pointToSegmentDist(p: Point, a: Point, b: Point): number {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const len2 = vx * vx + vy * vy;
    let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * vx, cy = a.y + t * vy;
    return Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
  }

  private getRotateHandlePos(c: Character): Point {
    const len = 55 * c.scale;
    const angle = (c.rotation - 90) * Math.PI / 180;
    return {
      x: c.x + Math.cos(angle) * len,
      y: c.y + Math.sin(angle) * len,
    };
  }

  private getScaleHandlePos(c: Character): Point {
    const angle = c.rotation * Math.PI / 180;
    const hw = c.width * c.scale / 2;
    const hh = c.height * c.scale / 2;
    const localX = hw;
    const localY = hh;
    return {
      x: c.x + localX * Math.cos(angle) - localY * Math.sin(angle),
      y: c.y + localX * Math.sin(angle) + localY * Math.cos(angle),
    };
  }

  private updateConnections() {
    const existing = new Map<string, Connection>();
    for (const c of this.connections) {
      const key = [c.fromId, c.toId].sort().join('|');
      existing.set(key, c);
    }

    const newConnections: Connection[] = [];
    const now = performance.now();

    for (let i = 0; i < this.characters.length; i++) {
      for (let j = i + 1; j < this.characters.length; j++) {
        const a = this.characters[i];
        const b = this.characters[j];
        const d = this.dist({ x: a.x, y: a.y }, { x: b.x, y: b.y });
        if (d < CONNECTION_THRESHOLD) {
          const key = [a.id, b.id].sort().join('|');
          let conn = existing.get(key);
          if (!conn) {
            conn = {
              id: uuidv4(),
              fromId: a.id,
              toId: b.id,
              distance: d,
              goldUntil: 0,
            };
            this.spawnConnectionParticles(conn, now);
          } else {
            conn.distance = d;
          }
          newConnections.push(conn);
        }
      }
    }

    this.connections = newConnections;
  }

  private spawnConnectionParticles(conn: Connection, _now: number) {
    const from = this.characters.find(c => c.id === conn.fromId);
    const to = this.characters.find(c => c.id === conn.toId);
    if (!from || !to) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const fromStart = i < count / 2;
      const start = fromStart ? from : to;
      const dir = fromStart ? 1 : -1;
      this.particles.push({
        x: start.x,
        y: start.y,
        vx: 0, vy: 0,
        size: 3 + Math.random() * 3,
        alpha: 0,
        life: 0,
        maxLife: 500,
        connectionId: conn.id,
        progress: fromStart ? 0 : 1,
      });
      void dir;
    }
  }

  private initFireflies() {
    const count = 25;
    for (let i = 0; i < count; i++) {
      this.fireflies.push({
        x: -1, y: -1,
        vx: 0, vy: 0,
        size: 2 + Math.random() * 3,
        alpha: 0,
        life: 0,
        maxLife: 0,
        isFirefly: true,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.particles.push(...this.fireflies);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt, now);
    this.render(now);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number) {
    this.animQueue = this.animQueue.filter(a => {
      const t = Math.min(1, (now - a.startTime) / a.duration);
      const char = this.characters.find(c => c.id === a.characterId);
      if (char) {
        const e = this.easeOutBack(t);
        char.x = a.startX + (a.targetX - a.startX) * e;
        char.y = a.startY + (a.targetY - a.startY) * e;
      }
      return t < 1;
    });

    const { width, height } = this.getStageSize();
    for (const f of this.fireflies) {
      if (!this.options.glowMode) {
        f.alpha = Math.max(0, f.alpha - dt * 2);
        continue;
      }
      if (f.alpha < 0.5) f.alpha = Math.min(0.5, f.alpha + dt * 1.5);
      f.phase = (f.phase ?? 0) + dt * 2;
      if (f.x < 0 || f.y < 0) {
        f.x = Math.random() * width;
        f.y = Math.random() * height;
      }
      const sp = 20;
      f.vx = Math.cos(f.phase) * sp + Math.sin(f.phase * 1.3) * 8;
      f.vy = Math.sin(f.phase * 0.7) * sp + Math.cos(f.phase * 1.1) * 8;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -30) f.x = width + 30;
      if (f.x > width + 30) f.x = -30;
      if (f.y < -30) f.y = height + 30;
      if (f.y > height + 30) f.y = -30;
    }

    const toRemove: number[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.isFirefly) continue;

      p.life += dt * 1000;
      const conn = p.connectionId
        ? this.connections.find(c => c.id === p.connectionId)
        : null;

      if (conn && p.progress !== undefined) {
        const from = this.characters.find(c => c.id === conn.fromId);
        const to = this.characters.find(c => c.id === conn.toId);
        if (from && to) {
          if (p.life < p.maxLife) {
            const t = p.life / p.maxLife;
            const startFromEnd = p.progress === 1;
            const prog = startFromEnd ? 1 - t : t;
            p.x = from.x + (to.x - from.x) * prog;
            p.y = from.y + (to.y - from.y) * prog;
            p.alpha = Math.min(0.9, t * 3);
          } else {
            const segLen = Math.max(
              10,
              this.dist({ x: from.x, y: from.y }, { x: to.x, y: to.y })
            );
            const loopSpeed = 80;
            const dir = p.progress === 0 ? 1 : -1;
            p.progress = ((p.progress ?? 0.5) + (dir * loopSpeed * dt) / segLen) % 1;
            if (p.progress < 0) p.progress += 1;
            const prog = p.progress;
            p.x = from.x + (to.x - from.x) * prog;
            p.y = from.y + (to.y - from.y) * prog;
            p.alpha = 0.55 + 0.35 * Math.abs(Math.sin(now / 180 + i));
            p.size = 3 + 3 * Math.abs(Math.sin(now / 250 + i * 0.7));
          }
        } else {
          toRemove.push(i);
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = Math.max(0, p.alpha - dt * 0.8);
        if (p.alpha <= 0) toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
    if (this.particles.length > 220) {
      const nonFf = this.particles.filter(p => !p.isFirefly);
      const excess = this.particles.length - 200;
      if (nonFf.length > excess) {
        const toKill = new Set(nonFf.slice(0, excess));
        this.particles = this.particles.filter(p => !toKill.has(p));
      }
    }
  }

  private render(now: number) {
    const ctx = this.ctx;
    const { width, height } = this.getStageSize();

    this.drawBackground(ctx, width, height);
    this.drawConnections(ctx, now);
    this.drawParticles(ctx);
    this.drawCharacters(ctx);
    this.drawSelectionUI(ctx);
    this.drawExternalDrag(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const hue = this.options.hue;
    const g = ctx.createLinearGradient(0, 0, w, h);
    if (hue === 0) {
      g.addColorStop(0, '#2a2a2a');
      g.addColorStop(1, '#5a5a5a');
    } else {
      g.addColorStop(0, `hsl(${hue}, 25%, 18%)`);
      g.addColorStop(1, `hsl(${hue}, 25%, 38%)`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 10) {
        ctx.lineTo(x, y + (Math.sin(x * 0.03 + y * 0.01) * 1.5));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawConnections(ctx: CanvasRenderingContext2D, now: number) {
    for (const conn of this.connections) {
      const from = this.characters.find(c => c.id === conn.fromId);
      const to = this.characters.find(c => c.id === conn.toId);
      if (!from || !to) continue;

      const isGold = conn.goldUntil > now;
      const isHovered = this.hoveredConnectionId === conn.id;

      const d = conn.distance;
      const t = Math.max(0, Math.min(1, d / CONNECTION_THRESHOLD));

      ctx.save();
      ctx.lineWidth = isHovered ? 4 : 2.5;
      ctx.lineCap = 'round';

      if (isGold) {
        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.5, '#fff5a0');
        grad.addColorStop(1, '#ffb700');
        ctx.strokeStyle = grad;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 18;
      } else {
        const warmR = 255, warmG = 155, warmB = 80;
        const coolR = 100, coolG = 155, coolB = 255;
        const r = Math.round(warmR + (coolR - warmR) * t);
        const g = Math.round(warmG + (coolG - warmG) * t);
        const b = Math.round(warmB + (coolB - warmB) * t);
        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        grad.addColorStop(0, `rgba(${warmR},${warmG},${warmB},0.95)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0.95)`);
        ctx.strokeStyle = grad;
        ctx.shadowColor = `rgba(${r},${g},${b},0.55)`;
        ctx.shadowBlur = isHovered ? 14 : 8;
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      ctx.save();
      if (p.isFirefly) {
        ctx.globalAlpha = p.alpha;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
        glow.addColorStop(0, 'hsla(120, 90%, 70%, 0.9)');
        glow.addColorStop(1, 'hsla(120, 90%, 70%, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'hsla(120, 100%, 88%, 1)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * 0.45), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = p.alpha;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, 'rgba(255, 235, 190, 1)');
        grad.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawCharacters(ctx: CanvasRenderingContext2D) {
    for (const c of this.characters) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation * Math.PI / 180);
      ctx.scale(c.scale, c.scale);

      if (this.options.glowMode) {
        ctx.save();
        ctx.shadowColor = 'hsla(120, 50%, 50%, 0.3)';
        ctx.shadowBlur = 25;
        this.drawCharacterSilhouette(ctx, c.type, c.width, c.height);
        ctx.restore();
      }

      ctx.fillStyle = '#0a0a0a';
      this.drawCharacterSilhouette(ctx, c.type, c.width, c.height);
      ctx.restore();
    }
  }

  private drawSelectionUI(ctx: CanvasRenderingContext2D) {
    if (!this.selectedId) return;
    const c = this.characters.find(x => x.id === this.selectedId);
    if (!c) return;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation * Math.PI / 180);
    ctx.scale(c.scale, c.scale);

    ctx.save();
    ctx.fillStyle = 'rgba(120, 180, 255, 0.08)';
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.65)';
    ctx.lineWidth = 1.2 / c.scale;
    ctx.setLineDash([5 / c.scale, 3.5 / c.scale]);
    ctx.strokeRect(-c.width / 2, -c.height / 2, c.width, c.height);
    ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
    ctx.restore();

    const dash = 2 / c.scale;
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
    ctx.lineWidth = dash * 1.2;
    ctx.setLineDash([]);
    const rot = { x: 0, y: -c.height / 2 - 45 / c.scale };
    ctx.beginPath();
    ctx.moveTo(0, -c.height / 2);
    ctx.lineTo(rot.x, rot.y);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(80, 140, 220, 0.95)';
    ctx.lineWidth = 1.2 / c.scale;
    ctx.beginPath();
    ctx.arc(rot.x, rot.y, 8 / c.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(180, 220, 255, 0.5)';
    ctx.font = `${10 / c.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('↻', rot.x, rot.y + 3.5 / c.scale);

    ctx.fillStyle = '#78c8ff';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.2 / c.scale;
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, 7.5 / c.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(20, 60, 120, 0.9)';
    ctx.font = `bold ${9 / c.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⤢', c.width / 2, c.height / 2 + 3 / c.scale);
    ctx.restore();

    ctx.restore();
  }

  private drawExternalDrag(ctx: CanvasRenderingContext2D) {
    if (this.drag.mode !== 'external_drag' || !this.drag.externalType) return;
    const preset = CHARACTER_PRESETS.find(p => p.type === this.drag.externalType);
    if (!preset) return;
    const x = this.drag.startX;
    const y = this.drag.startY;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.translate(x, y);
    ctx.scale(0.95, 0.95);
    if (this.options.glowMode) {
      ctx.shadowColor = 'hsla(120, 50%, 50%, 0.35)';
      ctx.shadowBlur = 24;
    }
    ctx.fillStyle = '#0a0a0a';
    this.drawCharacterSilhouette(ctx, this.drag.externalType, preset.width, preset.height);
    ctx.restore();
  }

  private drawCharacterSilhouette(
    ctx: CanvasRenderingContext2D,
    type: CharacterType,
    w: number,
    h: number
  ) {
    const cx = 0;
    const cy = 0;
    switch (type) {
      case 'detective':
        this.drawDetective(ctx, cx, cy, w, h);
        break;
      case 'owl':
        this.drawOwl(ctx, cx, cy, w, h);
        break;
      case 'castle':
        this.drawCastle(ctx, cx, cy, w, h);
        break;
      case 'key':
        this.drawKey(ctx, cx, cy, w, h);
        break;
      case 'candle':
        this.drawCandle(ctx, cx, cy, w, h);
        break;
      case 'shadow':
        this.drawShadow(ctx, cx, cy, w, h);
        break;
      case 'tree':
        this.drawTree(ctx, cx, cy, w, h);
        break;
      case 'moon':
        this.drawMoon(ctx, cx, cy, w, h);
        break;
    }
  }

  private drawDetective(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const top = cy - h / 2;
    const headR = w * 0.18;
    const hatW = w * 0.55;
    const hatH = h * 0.1;

    ctx.moveTo(cx - hatW / 2, top + hatH * 1.5);
    ctx.lineTo(cx - hatW / 2 - w * 0.05, top + hatH * 1.5);
    ctx.lineTo(cx - hatW / 2 - w * 0.05, top + hatH * 1.8);
    ctx.lineTo(cx + hatW / 2 + w * 0.05, top + hatH * 1.8);
    ctx.lineTo(cx + hatW / 2 + w * 0.05, top + hatH * 1.5);
    ctx.lineTo(cx + hatW / 2, top + hatH * 1.5);
    ctx.lineTo(cx + hatW / 2.5, top);
    ctx.lineTo(cx - hatW / 2.5, top);
    ctx.closePath();

    ctx.moveTo(cx - headR, top + hatH * 1.8 + headR);
    ctx.arc(cx, top + hatH * 1.8 + headR, headR, Math.PI, 0, true);
    ctx.lineTo(cx + headR, top + hatH * 1.8 + headR * 2.2);
    ctx.lineTo(cx - headR, top + hatH * 1.8 + headR * 2.2);
    ctx.closePath();

    const bodyTop = top + hatH * 1.8 + headR * 2.2;
    const bodyBottom = cy + h * 0.35;
    ctx.moveTo(cx - w * 0.35, bodyTop);
    ctx.lineTo(cx - w * 0.42, bodyBottom);
    ctx.lineTo(cx + w * 0.42, bodyBottom);
    ctx.lineTo(cx + w * 0.35, bodyTop);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.42, bodyBottom);
    ctx.lineTo(cx - w * 0.38, cy + h / 2);
    ctx.lineTo(cx - w * 0.18, cy + h / 2);
    ctx.lineTo(cx - w * 0.14, bodyBottom);
    ctx.closePath();

    ctx.moveTo(cx + w * 0.14, bodyBottom);
    ctx.lineTo(cx + w * 0.18, cy + h / 2);
    ctx.lineTo(cx + w * 0.38, cy + h / 2);
    ctx.lineTo(cx + w * 0.42, bodyBottom);
    ctx.closePath();

    const armY = bodyTop + h * 0.06;
    ctx.moveTo(cx - w * 0.35, armY);
    ctx.lineTo(cx - w * 0.48, cy + h * 0.05);
    ctx.lineTo(cx - w * 0.38, cy + h * 0.08);
    ctx.lineTo(cx - w * 0.25, armY + h * 0.05);
    ctx.closePath();

    ctx.moveTo(cx + w * 0.25, armY + h * 0.05);
    ctx.lineTo(cx + w * 0.38, cy + h * 0.08);
    ctx.lineTo(cx + w * 0.48, cy + h * 0.05);
    ctx.lineTo(cx + w * 0.35, armY);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.1, top + hatH * 1.8 + headR * 1.3);
    ctx.lineTo(cx + w * 0.1, top + hatH * 1.8 + headR * 1.3);
    ctx.lineTo(cx + w * 0.08, top + hatH * 1.8 + headR * 1.8);
    ctx.lineTo(cx - w * 0.08, top + hatH * 1.8 + headR * 1.8);
    ctx.closePath();
  }

  private drawOwl(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const top = cy - h / 2;

    ctx.moveTo(cx - w * 0.38, top + h * 0.2);
    ctx.quadraticCurveTo(cx - w * 0.45, top + h * 0.08, cx - w * 0.3, top);
    ctx.lineTo(cx - w * 0.22, top + h * 0.05);
    ctx.lineTo(cx - w * 0.15, top);
    ctx.lineTo(cx - w * 0.07, top + h * 0.05);
    ctx.lineTo(cx, top - h * 0.02);
    ctx.lineTo(cx + w * 0.07, top + h * 0.05);
    ctx.lineTo(cx + w * 0.15, top);
    ctx.lineTo(cx + w * 0.22, top + h * 0.05);
    ctx.lineTo(cx + w * 0.3, top);
    ctx.quadraticCurveTo(cx + w * 0.45, top + h * 0.08, cx + w * 0.38, top + h * 0.2);
    ctx.quadraticCurveTo(cx + w * 0.48, cy + h * 0.2, cx + w * 0.35, cy + h * 0.4);
    ctx.quadraticCurveTo(cx + w * 0.2, cy + h / 2, cx, cy + h * 0.48);
    ctx.quadraticCurveTo(cx - w * 0.2, cy + h / 2, cx - w * 0.35, cy + h * 0.4);
    ctx.quadraticCurveTo(cx - w * 0.48, cy + h * 0.2, cx - w * 0.38, top + h * 0.2);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.22, top + h * 0.32);
    ctx.arc(cx - w * 0.2, top + h * 0.28, w * 0.14, 0, Math.PI * 2);
    ctx.moveTo(cx + w * 0.22, top + h * 0.32);
    ctx.arc(cx + w * 0.2, top + h * 0.28, w * 0.14, 0, Math.PI * 2);

    ctx.moveTo(cx, top + h * 0.32);
    ctx.lineTo(cx - w * 0.06, top + h * 0.42);
    ctx.lineTo(cx + w * 0.06, top + h * 0.42);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.08, cy + h * 0.48);
    ctx.lineTo(cx - w * 0.1, cy + h / 2);
    ctx.lineTo(cx - w * 0.04, cy + h / 2);
    ctx.lineTo(cx - w * 0.03, cy + h * 0.48);
    ctx.closePath();

    ctx.moveTo(cx + w * 0.08, cy + h * 0.48);
    ctx.lineTo(cx + w * 0.1, cy + h / 2);
    ctx.lineTo(cx + w * 0.04, cy + h / 2);
    ctx.lineTo(cx + w * 0.03, cy + h * 0.48);
    ctx.closePath();
  }

  private drawCastle(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const top = cy - h / 2;
    const left = cx - w / 2;
    const right = cx + w / 2;
    const bottom = cy + h / 2;

    ctx.moveTo(left + w * 0.02, bottom);
    ctx.lineTo(left + w * 0.02, top + h * 0.45);
    const tH1 = h * 0.18;
    let bx = left + w * 0.02;
    for (let i = 0; i < 4; i++) {
      const sx = bx;
      ctx.lineTo(sx, top + h * 0.45);
      ctx.lineTo(sx, top + h * 0.45 - tH1);
      ctx.lineTo(sx + w * 0.065, top + h * 0.45 - tH1);
      ctx.lineTo(sx + w * 0.065, top + h * 0.45);
      bx += w * 0.13;
    }
    ctx.lineTo(left + w * 0.54, top + h * 0.45);
    ctx.lineTo(left + w * 0.54, top + h * 0.25);

    const tH2 = h * 0.12;
    bx = left + w * 0.54;
    for (let i = 0; i < 2; i++) {
      const sx = bx;
      ctx.lineTo(sx, top + h * 0.25);
      ctx.lineTo(sx, top + h * 0.25 - tH2);
      ctx.lineTo(sx + w * 0.05, top + h * 0.25 - tH2);
      ctx.lineTo(sx + w * 0.05, top + h * 0.25);
      bx += w * 0.1;
    }
    ctx.lineTo(left + w * 0.74, top + h * 0.25);
    ctx.lineTo(left + w * 0.66, top);
    ctx.lineTo(left + w * 0.69, top + h * 0.16);
    ctx.lineTo(left + w * 0.71, top + h * 0.02);
    ctx.lineTo(left + w * 0.74, top + h * 0.16);
    ctx.lineTo(left + w * 0.76, top);
    ctx.lineTo(left + w * 0.79, top + h * 0.16);
    ctx.lineTo(left + w * 0.82, top + h * 0.02);
    ctx.lineTo(left + w * 0.84, top + h * 0.16);
    ctx.lineTo(left + w * 0.86, top);
    ctx.lineTo(left + w * 0.88, top + h * 0.25);
    ctx.lineTo(left + w * 0.88, top + h * 0.25);

    bx = left + w * 0.88;
    for (let i = 0; i < 2; i++) {
      const sx = bx;
      ctx.lineTo(sx, top + h * 0.25);
      ctx.lineTo(sx, top + h * 0.25 - tH2);
      ctx.lineTo(sx + w * 0.05, top + h * 0.25 - tH2);
      ctx.lineTo(sx + w * 0.05, top + h * 0.25);
      bx += w * 0.1;
    }
    ctx.lineTo(right - w * 0.02, top + h * 0.25);
    ctx.lineTo(right - w * 0.02, top + h * 0.45);

    const tH4 = h * 0.18;
    bx = right - w * 0.02 - w * 0.13 * 4;
    for (let i = 0; i < 4; i++) {
      const sx = bx + i * w * 0.13;
      ctx.lineTo(sx, top + h * 0.45);
      ctx.lineTo(sx, top + h * 0.45 - tH4);
      ctx.lineTo(sx + w * 0.065, top + h * 0.45 - tH4);
      ctx.lineTo(sx + w * 0.065, top + h * 0.45);
    }
    ctx.lineTo(right - w * 0.02, top + h * 0.45);
    ctx.lineTo(right - w * 0.02, bottom);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.08, bottom);
    ctx.lineTo(cx - w * 0.08, cy + h * 0.02);
    ctx.quadraticCurveTo(cx - w * 0.08, cy - h * 0.06, cx, cy - h * 0.08);
    ctx.quadraticCurveTo(cx + w * 0.08, cy - h * 0.06, cx + w * 0.08, cy + h * 0.02);
    ctx.lineTo(cx + w * 0.08, bottom);
    ctx.closePath();

    const windows = [
      { x: left + w * 0.16, y: top + h * 0.58, ww: w * 0.045, wh: h * 0.1 },
      { x: left + w * 0.32, y: top + h * 0.58, ww: w * 0.045, wh: h * 0.1 },
      { x: right - w * 0.32 - w * 0.045, y: top + h * 0.58, ww: w * 0.045, wh: h * 0.1 },
      { x: right - w * 0.16 - w * 0.045, y: top + h * 0.58, ww: w * 0.045, wh: h * 0.1 },
    ];
    for (const win of windows) {
      ctx.moveTo(win.x, win.y);
      ctx.lineTo(win.x, win.y + win.wh);
      ctx.lineTo(win.x + win.ww, win.y + win.wh);
      ctx.lineTo(win.x + win.ww, win.y);
      ctx.closePath();
    }
  }

  private drawKey(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const left = cx - w / 2;
    const right = cx + w / 2;

    const ringR = h * 0.4;
    const ringCx = left + ringR + w * 0.02;
    ctx.moveTo(ringCx + ringR, cy);
    ctx.arc(ringCx, cy, ringR, 0, Math.PI * 2);

    const shaftTop = cy - h * 0.1;
    const shaftBottom = cy + h * 0.1;

    ctx.moveTo(ringCx + ringR * 0.7, shaftTop);
    ctx.lineTo(right - w * 0.02, shaftTop);

    ctx.lineTo(right - w * 0.02, cy - h * 0.3);
    ctx.lineTo(right - w * 0.1, cy - h * 0.3);
    ctx.lineTo(right - w * 0.1, shaftTop);

    ctx.lineTo(right - w * 0.14, shaftTop);
    ctx.lineTo(right - w * 0.14, cy - h * 0.22);
    ctx.lineTo(right - w * 0.22, cy - h * 0.22);
    ctx.lineTo(right - w * 0.22, shaftBottom);

    ctx.lineTo(ringCx + ringR * 0.7, shaftBottom);
    ctx.closePath();

    ctx.moveTo(ringCx + ringR * 0.5, cy);
    ctx.arc(ringCx, cy, ringR * 0.5, 0, Math.PI * 2);
  }

  private drawCandle(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const top = cy - h / 2;
    const left = cx - w / 2;
    const right = cx + w / 2;
    const bottom = cy + h / 2;

    ctx.moveTo(cx, top + h * 0.04);
    ctx.quadraticCurveTo(cx - w * 0.18, top + h * 0.12, cx - w * 0.05, top + h * 0.22);
    ctx.quadraticCurveTo(cx - w * 0.02, top + h * 0.18, cx, top + h * 0.22);
    ctx.quadraticCurveTo(cx + w * 0.02, top + h * 0.18, cx + w * 0.05, top + h * 0.22);
    ctx.quadraticCurveTo(cx + w * 0.18, top + h * 0.12, cx, top + h * 0.04);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.015, top + h * 0.22);
    ctx.lineTo(cx - w * 0.015, top + h * 0.28);
    ctx.lineTo(cx + w * 0.015, top + h * 0.28);
    ctx.lineTo(cx + w * 0.015, top + h * 0.22);
    ctx.closePath();

    const bodyTop = top + h * 0.28;
    ctx.moveTo(left + w * 0.1, bodyTop);
    ctx.quadraticCurveTo(left + w * 0.02, cy, left + w * 0.12, bottom - h * 0.02);
    ctx.lineTo(right - w * 0.12, bottom - h * 0.02);
    ctx.quadraticCurveTo(right - w * 0.02, cy, right - w * 0.1, bodyTop);
    ctx.closePath();

    ctx.moveTo(left + w * 0.06, bottom - h * 0.02);
    ctx.lineTo(left + w * 0.02, bottom);
    ctx.lineTo(right - w * 0.02, bottom);
    ctx.lineTo(right - w * 0.06, bottom - h * 0.02);
    ctx.closePath();

    ctx.moveTo(left + w * 0.12, cy + h * 0.02);
    ctx.quadraticCurveTo(cx, cy + h * 0.08, right - w * 0.12, cy + h * 0.02);
    ctx.quadraticCurveTo(cx, cy + h * 0.13, left + w * 0.12, cy + h * 0.02);
    ctx.closePath();
  }

  private drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    const left = cx - w / 2;
    const right = cx + w / 2;

    ctx.moveTo(cx, top);
    ctx.quadraticCurveTo(right - w * 0.1, top + h * 0.15, right - w * 0.05, cy - h * 0.1);
    ctx.quadraticCurveTo(right + w * 0.05, cy + h * 0.1, right - w * 0.08, cy + h * 0.3);
    ctx.lineTo(right - w * 0.15, bottom);
    ctx.quadraticCurveTo(cx + w * 0.15, bottom - h * 0.02, cx, bottom - h * 0.02);
    ctx.quadraticCurveTo(cx - w * 0.15, bottom - h * 0.02, left + w * 0.15, bottom);
    ctx.lineTo(left + w * 0.08, cy + h * 0.3);
    ctx.quadraticCurveTo(left - w * 0.05, cy + h * 0.1, left + w * 0.05, cy - h * 0.1);
    ctx.quadraticCurveTo(left + w * 0.1, top + h * 0.15, cx, top);
    ctx.closePath();

    ctx.moveTo(cx - w * 0.18, top + h * 0.3);
    ctx.arc(cx - w * 0.15, top + h * 0.32, w * 0.06, 0, Math.PI * 2);
    ctx.moveTo(cx + w * 0.18, top + h * 0.3);
    ctx.arc(cx + w * 0.15, top + h * 0.32, w * 0.06, 0, Math.PI * 2);

    ctx.moveTo(cx - w * 0.1, cy - h * 0.05);
    ctx.quadraticCurveTo(cx, cy + h * 0.02, cx + w * 0.1, cy - h * 0.05);
    ctx.quadraticCurveTo(cx, cy + h * 0.08, cx - w * 0.1, cy - h * 0.05);
    ctx.closePath();
  }

  private drawTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const top = cy - h / 2;
    const bottom = cy + h / 2;

    ctx.moveTo(cx - w * 0.06, bottom);
    ctx.lineTo(cx - w * 0.05, cy + h * 0.1);
    ctx.lineTo(cx - w * 0.15, cy + h * 0.05);
    ctx.lineTo(cx - w * 0.04, cy - h * 0.02);
    ctx.lineTo(cx - w * 0.18, cy - h * 0.1);
    ctx.lineTo(cx - w * 0.03, cy - h * 0.15);
    ctx.lineTo(cx - w * 0.14, cy - h * 0.25);
    ctx.lineTo(cx - w * 0.02, cy - h * 0.28);
    ctx.lineTo(cx - w * 0.08, cy - h * 0.4);
    ctx.lineTo(cx, top);
    ctx.lineTo(cx + w * 0.08, cy - h * 0.4);
    ctx.lineTo(cx + w * 0.02, cy - h * 0.28);
    ctx.lineTo(cx + w * 0.14, cy - h * 0.25);
    ctx.lineTo(cx + w * 0.03, cy - h * 0.15);
    ctx.lineTo(cx + w * 0.18, cy - h * 0.1);
    ctx.lineTo(cx + w * 0.04, cy - h * 0.02);
    ctx.lineTo(cx + w * 0.15, cy + h * 0.05);
    ctx.lineTo(cx + w * 0.05, cy + h * 0.1);
    ctx.lineTo(cx + w * 0.06, bottom);
    ctx.closePath();

    for (let i = 0; i < 4; i++) {
      const by = cy + h * 0.05 - i * h * 0.12;
      ctx.moveTo(cx - w * 0.04 + w * 0.01 * i, by);
      ctx.lineTo(cx - w * 0.35 + w * 0.05 * i, by - h * 0.08);
      ctx.lineTo(cx - w * 0.3 + w * 0.05 * i, by - h * 0.06);
      ctx.lineTo(cx - w * 0.03 + w * 0.01 * i, by - h * 0.01);
      ctx.closePath();

      ctx.moveTo(cx + w * 0.04 - w * 0.01 * i, by);
      ctx.lineTo(cx + w * 0.35 - w * 0.05 * i, by - h * 0.08);
      ctx.lineTo(cx + w * 0.3 - w * 0.05 * i, by - h * 0.06);
      ctx.lineTo(cx + w * 0.03 - w * 0.01 * i, by - h * 0.01);
      ctx.closePath();
    }
  }

  private drawMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const r = Math.min(w, h) / 2 - 2;
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();

    const cutR = r * 0.82;
    ctx.moveTo(cx + r * 0.45, cy - cutR);
    ctx.arc(cx + r * 0.45, cy, cutR, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(cx + r * 0.45, cy + cutR);
    ctx.closePath();

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const cr = r * 0.5;
      const mx = cx + Math.cos(a) * cr * 0.3;
      const my = cy + Math.sin(a) * cr * 0.4;
      const mr = r * (0.06 + 0.04 * (i % 2));
      ctx.moveTo(mx + mr, my);
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.closePath();
    }
  }
}

function dirSign(p: Particle): number {
  return p.progress === 0 ? 1 : (p.progress === 1 ? -1 : (Math.random() < 0.5 ? 1 : -1));
}

declare global {
  interface Array<T> {
    filterIndex(predicate: (value: T, index: number, array: T[]) => boolean): number[];
  }
}

if (!Array.prototype.filterIndex) {
  Array.prototype.filterIndex = function <T>(
    this: T[],
    predicate: (value: T, index: number, array: T[]) => boolean
  ): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.length; i++) {
      if (predicate(this[i], i, this)) result.push(i);
    }
    return result;
  };
}
