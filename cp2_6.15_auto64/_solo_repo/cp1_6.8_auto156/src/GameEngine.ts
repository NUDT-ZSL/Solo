import { HexGrid } from './HexGrid';
import { AudioEngine } from './AudioEngine';
import { createNoteData, renderNoteBlock, renderGhostBlock, renderConnection, renderActiveRing } from './NoteBlock';
import { useGameStore } from './store';
import { type AxialCoord, type HexNode } from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private grid: HexGrid | null = null;
  private audioEngine: AudioEngine;
  private animFrameId: number = 0;
  private lastTimestamp: number = 0;
  private hoveredCoord: AxialCoord | null = null;
  private playbackIndex: number = 0;
  private beatAccumulator: number = 0;
  private connectionPulses: Map<string, number> = new Map();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.audioEngine = new AudioEngine();
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.bindEvents();
    this.startLoop();
    this.syncStore();
  }

  private syncStore(): void {
    this.unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.bpm !== prevState.bpm) {
        this.audioEngine.setBpm(state.bpm);
      }
      if (state.playing && !prevState.playing) {
        this.onPlayStart();
      }
      if (!state.playing && prevState.playing) {
        this.onPlayStop();
      }
      if (!state.playing && prevState.playing === true) {
        this.deactivateAll();
      }
    });
  }

  private onPlayStart(): void {
    if (!this.grid) return;
    const seq = this.grid.getPlaybackSequence();
    if (seq.length === 0) {
      useGameStore.getState().setPlaying(false);
      return;
    }
    this.playbackIndex = 0;
    this.beatAccumulator = 0;
    useGameStore.getState().setTotalBeats(seq.length);
    useGameStore.getState().setCurrentBeat(1);
    this.activateNote(seq[0]);
  }

  private onPlayStop(): void {
    this.deactivateAll();
    this.connectionPulses.clear();
    useGameStore.getState().setCurrentBeat(0);
  }

  private activateNote(node: HexNode): void {
    if (!this.grid) return;
    this.deactivateAll();
    node.active = true;
    node.pulseIntensity = 1;
    if (node.note) {
      this.audioEngine.playNote(node.note.frequency, this.audioEngine.getBeatDuration() * node.note.beatDuration);
    }
    const neighbors = this.grid.getNeighbors(node.coord);
    for (const nb of neighbors) {
      const nbNode = this.grid.getNode(nb);
      if (nbNode && nbNode.note !== null) {
        const key = this.connKey(node.coord, nb);
        this.connectionPulses.set(key, 1);
      }
    }
  }

  private deactivateAll(): void {
    if (!this.grid) return;
    for (const node of this.grid.getAllNodes()) {
      node.active = false;
    }
  }

  private connKey(a: AxialCoord, b: AxialCoord): string {
    const ka = `${a.q},${a.r}`;
    const kb = `${b.q},${b.r}`;
    return ka < kb ? ka + '|' + kb : kb + '|' + ka;
  }

  resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const hexSize = Math.min(w, h) < 600 ? 32 : 42;
    const cols = Math.max(5, Math.floor(w / (hexSize * 2.5)));
    const rows = Math.max(4, Math.floor(h / (hexSize * 2.2)));

    if (!this.grid) {
      this.grid = new HexGrid(hexSize, cols, rows, w, h);
    } else {
      (this.grid as any).hexSize = hexSize;
      (this.grid as any).cols = cols;
      (this.grid as any).rows = rows;
      this.grid.resize(w, h);
    }
  }

  private bindEvents(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('mousemove', this.onDocMouseMove);
    document.addEventListener('mouseup', this.onDocMouseUp);
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('click', this.onClick);
      this.canvas.removeEventListener('contextmenu', this.onContextMenu);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
    }
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('mousemove', this.onDocMouseMove);
    document.removeEventListener('mouseup', this.onDocMouseUp);
    if (this.unsubscribe) this.unsubscribe();
    this.audioEngine.reset();
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onMouseMove = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    this.updateHover(pos);
  };

  private onClick = (e: MouseEvent): void => {
    if (!this.grid) return;
    const pos = this.getCanvasPos(e);
    const coord = this.grid.pixelToAxial(pos.x, pos.y);
    if (!coord) return;
    const node = this.grid.getNode(coord);
    if (!node) return;

    const store = useGameStore.getState();
    if (node.note === null) {
      const noteData = createNoteData(store.selectedPitch, store.selectedRhythm);
      this.grid.placeNote(coord, noteData);
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    if (!this.grid) return;
    const pos = this.getCanvasPos(e);
    const coord = this.grid.pixelToAxial(pos.x, pos.y);
    if (coord) {
      this.grid.removeNote(coord);
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getCanvasPos(e.touches[0]);
      this.updateHover(pos);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getCanvasPos(e.touches[0]);
      this.updateHover(pos);
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (!this.grid) return;
    if (this.hoveredCoord) {
      const node = this.grid.getNode(this.hoveredCoord);
      if (node) {
        const store = useGameStore.getState();
        if (node.note === null) {
          const noteData = createNoteData(store.selectedPitch, store.selectedRhythm);
          this.grid.placeNote(this.hoveredCoord, noteData);
        }
      }
    }
    this.hoveredCoord = null;
  };

  private onResize = (): void => {
    this.resize();
  };

  private onDocMouseMove = (e: MouseEvent): void => {
    const store = useGameStore.getState();
    if (store.dragging) {
      useGameStore.getState().setDragPosition(e.clientX, e.clientY);
    }
  };

  private onDocMouseUp = (e: MouseEvent): void => {
    const store = useGameStore.getState();
    if (store.dragging && this.grid && this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coord = this.grid.pixelToAxial(x, y);
      if (coord) {
        const node = this.grid.getNode(coord);
        if (node && node.note === null) {
          const noteData = createNoteData(store.selectedPitch, store.selectedRhythm);
          this.grid.placeNote(coord, noteData);
        }
      }
      useGameStore.getState().setDragging(false);
    }
  };

  private updateHover(pos: { x: number; y: number }): void {
    if (!this.grid) return;
    const coord = this.grid.pixelToAxial(pos.x, pos.y);
    this.hoveredCoord = coord;
  }

  private startLoop(): void {
    this.lastTimestamp = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min((ts - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = ts;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    if (!this.grid) return;

    for (const node of this.grid.getAllNodes()) {
      if (node.note !== null && node.scale < 1) {
        node.scale = Math.min(1, node.scale + dt * 5);
      }
      if (node.active) {
        node.pulseIntensity = Math.max(0, node.pulseIntensity - dt * 1.5);
      } else {
        node.pulseIntensity = Math.max(0, node.pulseIntensity - dt * 3);
      }
      if (this.hoveredCoord && node.coord.q === this.hoveredCoord.q && node.coord.r === this.hoveredCoord.r) {
        node.hoverIntensity = Math.min(1, node.hoverIntensity + dt * 8);
      } else {
        node.hoverIntensity = Math.max(0, node.hoverIntensity - dt * 8);
      }
    }

    for (const [key, val] of this.connectionPulses) {
      this.connectionPulses.set(key, Math.max(0, val - dt * 2.5));
    }

    const store = useGameStore.getState();
    if (store.playing) {
      this.beatAccumulator += dt;
      const beatDuration = this.audioEngine.getBeatDuration();
      const seq = this.grid.getPlaybackSequence();
      if (seq.length === 0) {
        useGameStore.getState().setPlaying(false);
        return;
      }

      const currentNode = seq[this.playbackIndex];
      if (currentNode) {
        const noteBeatDuration = currentNode.note ? currentNode.note.beatDuration : 1;
        if (this.beatAccumulator >= beatDuration * noteBeatDuration) {
          this.beatAccumulator -= beatDuration * noteBeatDuration;
          this.playbackIndex = (this.playbackIndex + 1) % seq.length;
          const nextNode = seq[this.playbackIndex];
          this.activateNote(nextNode);
          useGameStore.getState().setCurrentBeat(this.playbackIndex + 1);
        }
      }
    }
  }

  private render(): void {
    if (!this.ctx || !this.grid || !this.canvas) return;
    const ctx = this.ctx;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    this.renderGridBackground(ctx, w, h);

    for (const node of this.grid.getAllNodes()) {
      this.renderHexNode(ctx, node);
    }

    const connections = this.grid.getConnections();
    for (const conn of connections) {
      const fromNode = this.grid.getNode(conn.from);
      const toNode = this.grid.getNode(conn.to);
      if (fromNode && toNode) {
        const key = this.connKey(conn.from, conn.to);
        const intensity = this.connectionPulses.get(key) || 0;
        renderConnection(ctx, fromNode.pixel.x, fromNode.pixel.y, toNode.pixel.x, toNode.pixel.y, intensity);
      }
    }

    for (const node of this.grid.getOccupiedNodes()) {
      if (node.note) {
        renderNoteBlock(ctx, node.pixel.x, node.pixel.y, node.note, node.scale, node.pulseIntensity, this.grid.getHexSize());
      }
    }

    for (const node of this.grid.getOccupiedNodes()) {
      if (node.active) {
        renderActiveRing(ctx, node.pixel.x, node.pixel.y, this.grid.getHexSize(), node.pulseIntensity);
      }
    }

    const store = useGameStore.getState();
    if (store.dragging) {
      const canvasRect = this.canvas.getBoundingClientRect();
      const gx = store.dragX - canvasRect.left;
      const gy = store.dragY - canvasRect.top;
      renderGhostBlock(ctx, gx, gy, this.grid.getHexSize());
    }
  }

  private renderGridBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    grad.addColorStop(0, 'rgba(0,212,255,0.03)');
    grad.addColorStop(0.5, 'rgba(180,74,255,0.02)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private renderHexNode(ctx: CanvasRenderingContext2D, node: HexNode): void {
    if (!this.grid) return;
    const size = this.grid.getHexSize();

    this.grid.drawHexOutline(ctx, node.pixel.x, node.pixel.y, size);

    const isHovered = node.hoverIntensity > 0;
    const isOccupied = node.note !== null;

    if (isOccupied) {
      ctx.strokeStyle = `rgba(180,74,255,${0.3 + node.pulseIntensity * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#b44aff';
      ctx.shadowBlur = 6 + node.pulseIntensity * 12;
    } else if (isHovered) {
      ctx.strokeStyle = `rgba(0,212,255,${0.4 + node.hoverIntensity * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(0,212,255,0.1)';
      ctx.lineWidth = 0.8;
      ctx.shadowBlur = 0;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!isOccupied) {
      ctx.beginPath();
      ctx.arc(node.pixel.x, node.pixel.y, 2.5, 0, Math.PI * 2);
      if (isHovered) {
        ctx.fillStyle = `rgba(0,212,255,${0.6 + node.hoverIntensity * 0.4})`;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = 'rgba(0,212,255,0.2)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  resetGrid(): void {
    if (this.grid) {
      this.grid.clear();
      this.playbackIndex = 0;
      this.beatAccumulator = 0;
      this.connectionPulses.clear();
      useGameStore.getState().setPlaying(false);
      useGameStore.getState().setCurrentBeat(0);
    }
  }
}
