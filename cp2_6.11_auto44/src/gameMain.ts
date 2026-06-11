import {
  Track,
  TrackNode,
  MarbleType,
  Point,
  generateId,
  distance,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  EDIT_AREA_TOP,
  EDIT_AREA_BOTTOM,
  MAX_TRACKS,
  MAX_NODES_PER_TRACK,
  NODE_RADIUS,
  MAX_MARBLES,
  DEFAULT_NODE_INTERVAL,
  MARBLE_NAMES,
  MARBLE_COLORS,
  clamp,
} from './constants';
import { AudioEngine } from './audioEngine';
import { PhysicsEngine, TriggerEvent } from './physicsEngine';
import { RenderEngine } from './renderEngine';

type DragState =
  | { type: 'none' }
  | { type: 'node'; trackId: string; nodeId: string }
  | { type: 'marble'; marbleType: MarbleType; ghost: HTMLElement };

class GameMain {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: AudioEngine;
  private physics: PhysicsEngine;
  private renderer: RenderEngine;

  private tracks: Track[] = [];
  private selectedTrackId: string | null = null;
  private dragState: DragState = { type: 'none' };
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsAccum = 0;
  private running = false;
  private animationId = 0;

  private elSpeedSlider: HTMLInputElement;
  private elSpeedValue: HTMLElement;
  private elResetBtn: HTMLElement;
  private elActiveDot: HTMLElement;
  private elActiveVoice: HTMLElement;
  private elMarbleCount: HTMLElement;
  private elFpsDisplay: HTMLElement;
  private elMarbleLauncher: HTMLElement;
  private elWrapper: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.audio = new AudioEngine();
    this.physics = new PhysicsEngine();
    this.renderer = new RenderEngine(ctx);

    this.elSpeedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.elSpeedValue = document.getElementById('speedValue') as HTMLElement;
    this.elResetBtn = document.getElementById('resetBtn') as HTMLElement;
    this.elActiveDot = document.getElementById('activeDot') as HTMLElement;
    this.elActiveVoice = document.getElementById('activeVoice') as HTMLElement;
    this.elMarbleCount = document.getElementById('marbleCount') as HTMLElement;
    this.elFpsDisplay = document.getElementById('fpsDisplay') as HTMLElement;
    this.elMarbleLauncher = document.getElementById('marbleLauncher') as HTMLElement;
    this.elWrapper = document.getElementById('gameWrapper') as HTMLElement;

    this.physics.onTrigger((evt) => this.handleTrigger(evt));

    this.initDefaultTracks();
    this.bindEvents();
    this.syncState();
  }

  private initDefaultTracks(): void {
    const centerX = CANVAS_WIDTH / 2;
    const trackSpacing = 260;
    const startX = centerX - trackSpacing * 1.5;

    for (let i = 0; i < 2; i++) {
      const baseX = startX + i * trackSpacing * 2 + trackSpacing;
      const nodes: TrackNode[] = [];
      const nodeCount = 7;
      for (let j = 0; j < nodeCount; j++) {
        const t = j / (nodeCount - 1);
        const y = EDIT_AREA_TOP + 30 + t * (EDIT_AREA_BOTTOM - EDIT_AREA_TOP - 60);
        const wave = Math.sin(t * Math.PI * 2 + i * Math.PI) * 60;
        nodes.push({
          id: generateId('node'),
          position: {
            x: clamp(baseX + wave, 80, CANVAS_WIDTH - 80),
            y,
          },
          noteIndex: j % 8,
          triggered: false,
          triggerTime: 0,
          triggerColor: '#FFFFFF',
        });
      }
      const track: Track = {
        id: generateId('track'),
        nodes,
        startNote: 0,
      };
      this.tracks.push(track);
    }

    this.physics.setTracks(this.tracks);
    this.renderer.setTracks(this.tracks);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onWindowMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.setHoverNode(null);
    });

    this.elSpeedSlider.addEventListener('input', () => {
      const val = parseFloat(this.elSpeedSlider.value);
      this.physics.setNodeInterval(val);
      this.elSpeedValue.textContent = `${val.toFixed(2)}s`;
    });
    this.physics.setNodeInterval(parseFloat(this.elSpeedSlider.value));

    this.elResetBtn.addEventListener('click', () => {
      this.physics.clearMarbles();
      this.syncState();
    });

    const launcherMarbles = this.elMarbleLauncher.querySelectorAll<HTMLElement>('.launcher-marble');
    launcherMarbles.forEach((el) => {
      el.addEventListener('mousedown', (e) => this.onLauncherMarbleDown(e, el));
    });

    document.addEventListener('click', () => {
      this.audio.init();
      this.audio.resume();
    }, { once: true });
  }

  private onLauncherMarbleDown(e: MouseEvent, el: HTMLElement): void {
    e.preventDefault();
    e.stopPropagation();
    this.audio.init();
    this.audio.resume();

    const type = el.dataset.type as MarbleType;
    if (!type) return;
    if (this.physics.hasActiveMarbleOfType(type)) return;
    if (this.physics.getActiveMarbleCount() >= MAX_MARBLES) return;

    const ghost = document.createElement('div');
    ghost.className = 'dragging-ghost';
    const colors = MARBLE_COLORS[type];
    const size = 40;
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.background = `radial-gradient(circle at 30% 30%, ${colors.light}, ${colors.core} 50%, ${colors.core})`;
    ghost.style.boxShadow = `0 0 20px ${colors.glow}`;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.body.appendChild(ghost);

    this.dragState = { type: 'marble', marbleType: type, ghost };
  }

  private getCanvasPoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private findNodeAt(point: Point): { trackId: string; nodeId: string } | null {
    for (const track of this.tracks) {
      for (const node of track.nodes) {
        if (distance(point, node.position) < NODE_RADIUS + 4) {
          return { trackId: track.id, nodeId: node.id };
        }
      }
    }
    return null;
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    this.audio.init();
    this.audio.resume();

    const point = this.getCanvasPoint(e);

    const hit = this.findNodeAt(point);
    if (hit) {
      this.dragState = { type: 'node', trackId: hit.trackId, nodeId: hit.nodeId };
      this.selectedTrackId = hit.trackId;
      this.renderer.setSelectedTrack(hit.trackId);
      return;
    }

    if (point.y < EDIT_AREA_TOP || point.y > EDIT_AREA_BOTTOM) return;

    if (e.shiftKey) {
      if (this.tracks.length < MAX_TRACKS) {
        this.createTrack(point);
      }
      return;
    }

    let added = false;
    if (this.selectedTrackId) {
      const track = this.tracks.find((t) => t.id === this.selectedTrackId);
      if (track && track.nodes.length < MAX_NODES_PER_TRACK) {
        this.addNodeToTrack(track, point);
        added = true;
      }
    }
    if (!added) {
      for (const track of this.tracks) {
        if (track.nodes.length < MAX_NODES_PER_TRACK) {
          this.addNodeToTrack(track, point);
          this.selectedTrackId = track.id;
          this.renderer.setSelectedTrack(track.id);
          added = true;
          break;
        }
      }
    }
    if (!added && this.tracks.length < MAX_TRACKS) {
      this.createTrack(point);
    }
  }

  private createTrack(firstPoint: Point): void {
    const node: TrackNode = {
      id: generateId('node'),
      position: { ...firstPoint },
      noteIndex: 0,
      triggered: false,
      triggerTime: 0,
      triggerColor: '#FFFFFF',
    };
    const track: Track = {
      id: generateId('track'),
      nodes: [node],
      startNote: 0,
    };
    this.tracks.push(track);
    this.selectedTrackId = track.id;
    this.renderer.setSelectedTrack(track.id);
    this.syncTracks();
  }

  private addNodeToTrack(track: Track, point: Point): void {
    track.nodes.push({
      id: generateId('node'),
      position: { ...point },
      noteIndex: track.nodes.length % 8,
      triggered: false,
      triggerTime: 0,
      triggerColor: '#FFFFFF',
    });
    this.syncTracks();
  }

  private syncTracks(): void {
    this.tracks = this.tracks.filter((t) => t.nodes.length > 0);
    this.physics.setTracks(this.tracks);
    this.renderer.setTracks(this.tracks);
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);

    if (this.dragState.type === 'node') {
      const track = this.tracks.find((t) => t.id === this.dragState!.trackId);
      if (track) {
        const node = track.nodes.find((n) => n.id === this.dragState!.nodeId);
        if (node) {
          node.position.x = clamp(point.x, 20, CANVAS_WIDTH - 20);
          node.position.y = clamp(point.y, EDIT_AREA_TOP, EDIT_AREA_BOTTOM);
          this.syncTracks();
        }
      }
      return;
    }

    if (this.dragState.type === 'marble') {
      this.dragState.ghost.style.left = `${e.clientX}px`;
      this.dragState.ghost.style.top = `${e.clientY}px`;
      return;
    }

    const hit = this.findNodeAt(point);
    this.renderer.setHoverNode(hit ? hit.nodeId : null);
    this.canvas.style.cursor = hit ? 'grab' : 'crosshair';
  }

  private onWindowMouseUp(e: MouseEvent): void {
    if (this.dragState.type === 'marble') {
      const point = this.getCanvasPoint(e);
      let spawned = false;
      for (const track of this.tracks) {
        if (track.nodes.length >= 2) {
          const startNode = track.nodes[0];
          if (distance(point, startNode.position) < NODE_RADIUS * 3) {
            spawned = this.physics.spawnMarble(this.dragState.marbleType, track.id);
            if (spawned) break;
          }
        }
      }
      if (!spawned) {
        for (const track of this.tracks) {
          if (track.nodes.length >= 2) {
            spawned = this.physics.spawnMarble(this.dragState.marbleType, track.id);
            if (spawned) break;
          }
        }
      }
      this.dragState.ghost.remove();
      this.dragState = { type: 'none' };
      this.syncState();
      return;
    }

    if (this.dragState.type === 'node') {
      this.dragState = { type: 'none' };
      this.canvas.style.cursor = 'crosshair';
    }
  }

  private handleTrigger(evt: TriggerEvent): void {
    if (evt.isCollision) {
      this.audio.playRandomDecorator(evt.marbleType);
      return;
    }

    if (evt.harmonyWith) {
      this.audio.playThirdHarmony(evt.marbleType, evt.noteIndex);
    } else {
      this.audio.playNote(evt.marbleType, evt.noteIndex);
    }
  }

  private syncState(): void {
    const count = this.physics.getActiveMarbleCount();
    this.elMarbleCount.textContent = `${count} / ${MAX_MARBLES}`;

    const dominant = this.physics.getDominantMarbleType();
    this.renderer.setDominantType(dominant);

    if (dominant) {
      const colors = MARBLE_COLORS[dominant];
      this.elActiveDot.style.background = colors.core;
      this.elActiveDot.style.color = colors.core;
      this.elActiveVoice.textContent = MARBLE_NAMES[dominant];
    } else {
      this.elActiveDot.style.background = '#00D4FF';
      this.elActiveVoice.textContent = '就绪 · READY';
    }

    const launcherMarbles = this.elMarbleLauncher.querySelectorAll<HTMLElement>('.launcher-marble');
    launcherMarbles.forEach((el) => {
      const type = el.dataset.type as MarbleType;
      const used = this.physics.hasActiveMarbleOfType(type) || count >= MAX_MARBLES;
      el.style.opacity = used ? '0.3' : '1';
      el.style.pointerEvents = used ? 'none' : 'auto';
      el.style.cursor = used ? 'not-allowed' : 'grab';
    });
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const delta = this.lastFrameTime ? Math.min(timestamp - this.lastFrameTime, 50) : 16;
    this.lastFrameTime = timestamp;

    this.frameCount++;
    this.fpsAccum += delta;
    if (this.fpsAccum >= 500) {
      const fps = Math.round((this.frameCount * 1000) / this.fpsAccum);
      this.elFpsDisplay.textContent = String(fps);
      this.frameCount = 0;
      this.fpsAccum = 0;
    }

    this.physics.update(delta);
    this.renderer.setMarbles(this.physics.getMarbles());
    this.renderer.setParticles(this.physics.getParticles());
    this.renderer.render(delta);

    this.syncState();

    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new GameMain();
    game.start();
    (window as unknown as { __game: GameMain }).__game = game;
  } catch (err) {
    console.error('Failed to initialize game:', err);
  }
});
