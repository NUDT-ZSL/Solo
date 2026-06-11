import {
  CONFIG, COLORS, MARBLE_TYPES, C_MAJOR_SCALE,
  Track, TrackNode, Marble, MarbleType, LaunchPad, Point
} from './constants';
import { AudioEngine } from './audioEngine';
import { PhysicsEngine, NodeTriggerEvent, HarmonyEvent, CollisionEvent } from './physicsEngine';
import { RenderEngine, RenderState } from './renderEngine';

let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now().toString(36)}`;
}

class GameMain {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private physicsEngine: PhysicsEngine;
  private renderEngine: RenderEngine;

  private tracks: Track[] = [];
  private marbles: Marble[] = [];
  private launchPads: LaunchPad[] = [];
  private activeMarbleTypes: Set<MarbleType> = new Set();

  private draggingNode: { trackId: string; nodeIndex: number; offset: Point } | null = null;
  private draggingMarble: { type: MarbleType; position: Point } | null = null;
  private hoveredNode: { trackId: string; nodeIndex: number } | null = null;
  private hoveredLaunchPad: MarbleType | null = null;

  private activityLevel = 0;
  private dominantMarbleType: MarbleType | null = null;
  private activityDecayAccum = 0;

  private lastTimestamp = 0;
  private rafId: number | null = null;
  private _fps = 60;
  private _fpsCounter = 0;
  private _fpsTimer = 0;

  private animationReady = false;

  constructor() {
    const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    if (!canvasEl) throw new Error('找不到Canvas元素');
    this.canvas = canvasEl;

    this.audioEngine = new AudioEngine();
    this.physicsEngine = new PhysicsEngine();
    this.renderEngine = new RenderEngine(this.canvas);

    this.initDefaultTracks();
    this.initLaunchPads();
    this.bindPhysicsEvents();
    this.bindDOMEvents();
    this.bindCanvasEvents();

    this.physicsEngine.setTracks(this.tracks);
    this.physicsEngine.setMarbles(this.marbles);

    this.updateNodeHighlights = this.updateNodeHighlights.bind(this);
  }

  public async start(): Promise<void> {
    try {
      await this.audioEngine.init();
    } catch (e) {
      console.warn('音频引擎初始化警告:', e);
    }

    this.animationReady = true;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);

    console.log('[音链弹珠] 初始化完成！');
    console.log(`  轨道数: ${this.tracks.length}  节点总数: ${this.tracks.reduce((s, t) => s + t.nodes.length, 0)}`);
  }

  private initDefaultTracks(): void {
    const editorTop = CONFIG.TITLE_BAR_HEIGHT;
    const editorBottom = CONFIG.TITLE_BAR_HEIGHT + CONFIG.EDITOR_AREA_HEIGHT;
    const canvasW = CONFIG.CANVAS_WIDTH;
    const playBottom = CONFIG.CANVAS_HEIGHT - CONFIG.INFO_BAR_HEIGHT - 20;
    const paddingX = 100;

    const trackColors = [
      COLORS.TRACK,
      '#FF66CC',
      '#66FF99',
      '#FFCC00'
    ];

    const layouts = [
      { startX: paddingX + 40, endX: paddingX + 60, midX: paddingX + 280 },
      { startX: paddingX + 280, endX: canvasW - paddingX - 260, midX: canvasW / 2 - 40 },
      { startX: canvasW - paddingX - 280, endX: paddingX + 260, midX: canvasW / 2 + 60 },
      { startX: canvasW - paddingX - 60, endX: canvasW - paddingX - 80, midX: canvasW - paddingX - 240 }
    ];

    const startYs = [
      editorTop + 150,
      editorTop + 170,
      editorTop + 165,
      editorTop + 155
    ];

    for (let i = 0; i < CONFIG.MAX_TRACKS; i++) {
      const layout = layouts[i];
      const startY = startYs[i];
      const nodes: TrackNode[] = [];
      const numNodes = CONFIG.DEFAULT_NODES_PER_TRACK;

      for (let j = 0; j < numNodes; j++) {
        const t = j / (numNodes - 1);
        const easedT = this.easeInOutQuad(t);

        const baseX = j === 0
          ? layout.startX
          : j === numNodes - 1
            ? layout.endX
            : layout.startX + (layout.midX - layout.startX) * Math.sin(t * Math.PI * 0.8)
                + (layout.endX - layout.midX) * Math.pow(t, 1.5);

        const pathMidY = editorBottom + (playBottom - editorBottom) * 0.55
          + Math.sin((j + i * 0.5) * 0.9) * 55;

        const baseY = startY * (1 - easedT) * (j < 2 ? 1 : 0)
          + Math.max(editorBottom + 50, pathMidY + Math.sin((i + j) * 1.3) * 65) * easedT;

        let x: number, y: number;
        if (j === 0) {
          x = layout.startX;
          y = editorTop + 95 + i * 8;
        } else if (j === numNodes - 1) {
          x = layout.endX;
          y = playBottom - i * 10;
        } else {
          x = layout.startX
            + (layout.midX - layout.startX) * Math.sin(j / (numNodes - 1) * Math.PI * 0.9)
            + (layout.endX - layout.midX) * Math.pow(j / (numNodes - 1), 1.6)
            + Math.sin(j * 1.7 + i * 0.8) * 25;

          const progress = (j - 1) / (numNodes - 2);
          y = editorBottom + 40
            + progress * (playBottom - editorBottom - 120)
            + Math.sin((i + 1) * (j + 1) * 0.7) * 45;
        }

        nodes.push({
          id: genId('node'),
          position: { x, y },
          noteIndex: j % C_MAJOR_SCALE.length,
          highlighted: false,
          highlightColor: '',
          highlightTime: 0
        });
      }

      this.tracks.push({
        id: genId('track'),
        nodes,
        startNote: i % 2,
        color: trackColors[i]
      });
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private initLaunchPads(): void {
    const padY = CONFIG.TITLE_BAR_HEIGHT + 55;
    const startX = CONFIG.CANVAS_WIDTH / 2 - (MARBLE_TYPES.length - 1) * 65;

    MARBLE_TYPES.forEach((type, idx) => {
      this.launchPads.push({
        type,
        position: { x: startX + idx * 130, y: padY },
        radius: 22
      });
    });
  }

  private bindPhysicsEvents(): void {
    this.physicsEngine.onNodeTrigger((e: NodeTriggerEvent) => {
      const track = this.tracks.find(t => t.id === e.trackId);
      const node = track?.nodes.find(n => n.id === e.nodeId);

      if (node) {
        node.highlighted = true;
        node.highlightColor = COLORS.MARBLE[e.marble.type].start;
        node.highlightTime = CONFIG.NODE_HIGHLIGHT_DURATION;

        this.renderEngine.spawnParticles(node.position, e.marble.type);

        if (track) {
          this.audioEngine.playNote(
            e.marble.type,
            node.noteIndex,
            track.startNote,
            CONFIG.NOTE_DURATION
          );
        }
      }

      this.bumpActivity(e.marble.type);
    });

    this.physicsEngine.onHarmony((e: HarmonyEvent) => {
      this.audioEngine.playHarmony(e.marbleType1, e.baseNoteIndex, e.interval, e.startNote);
      this.audioEngine.playHarmony(e.marbleType2, e.baseNoteIndex, -e.interval + 4, e.startNote);

      this.bumpActivity(e.marbleType1);
      this.bumpActivity(e.marbleType2);
    });

    this.physicsEngine.onCollision((e: CollisionEvent) => {
      this.audioEngine.playOrnament(e.startNote);
      this.renderEngine.spawnCollisionParticles(e.position);

      this.bumpActivity(e.marble1.type);
      this.bumpActivity(e.marble2.type);
    });

    this.physicsEngine.onMarbleEnd((marble: Marble) => {
      setTimeout(() => {
        const idx = this.marbles.findIndex(m => m.id === marble.id);
        if (idx >= 0) {
          this.marbles.splice(idx, 1);
          this.activeMarbleTypes.delete(marble.type);
          this.physicsEngine.setMarbles(this.marbles);
          this.updateDominantType();
        }
      }, 500);
    });
  }

  private bindDOMEvents(): void {
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue') as HTMLSpanElement;
    const clearBtn = document.getElementById('clearTracksBtn') as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        const val = parseFloat(speedSlider.value);
        this.physicsEngine.setNoteInterval(val);
        if (speedValue) speedValue.textContent = `${val.toFixed(1)}s`;
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearMarblesOnly());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.fullReset());
    }

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.clearMarblesOnly();
      }
      if (e.key === 'r' || e.key === 'R') {
        this.fullReset();
      }
    });
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMouseDown(this.touchToMouse(t));
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMouseMove(this.touchToMouse(t));
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.onMouseUp(this.touchToMouse(t));
    }, { passive: false });
  }

  private touchToMouse(t: Touch): MouseEvent {
    const rect = this.canvas.getBoundingClientRect();
    return {
      clientX: t.clientX,
      clientY: t.clientY,
      preventDefault: () => { }
    } as MouseEvent;
  }

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.audioEngine.resume();
    const pt = this.getCanvasPoint(e.clientX, e.clientY);

    for (const pad of this.launchPads) {
      const dx = pt.x - pad.position.x;
      const dy = pt.y - pad.position.y;
      if (dx * dx + dy * dy <= (pad.radius + 8) ** 2) {
        if (this.marbles.filter(m => m.type === pad.type).length === 0) {
          this.draggingMarble = { type: pad.type, position: pt };
          this.canvas.style.cursor = 'grabbing';
          return;
        }
      }
    }

    const found = this.findNodeAtPoint(pt);
    if (found) {
      const track = this.tracks[found.trackIdx];
      const node = track.nodes[found.nodeIdx];
      this.draggingNode = {
        trackId: track.id,
        nodeIndex: found.nodeIdx,
        offset: { x: pt.x - node.position.x, y: pt.y - node.position.y }
      };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pt = this.getCanvasPoint(e.clientX, e.clientY);

    if (this.draggingMarble) {
      this.draggingMarble.position = pt;
      return;
    }

    if (this.draggingNode) {
      const track = this.tracks.find(t => t.id === this.draggingNode!.trackId);
      if (track) {
        const node = track.nodes[this.draggingNode.nodeIndex];
        node.position.x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20,
          pt.x - this.draggingNode.offset.x));
        node.position.y = Math.max(CONFIG.TITLE_BAR_HEIGHT + 10,
          Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.INFO_BAR_HEIGHT - 10,
            pt.y - this.draggingNode.offset.y));
      }
      return;
    }

    let hoverPad: MarbleType | null = null;
    for (const pad of this.launchPads) {
      const dx = pt.x - pad.position.x;
      const dy = pt.y - pad.position.y;
      if (dx * dx + dy * dy <= (pad.radius + 8) ** 2) {
        hoverPad = pad.type;
        break;
      }
    }
    this.hoveredLaunchPad = hoverPad;

    this.hoveredNode = null;
    const found = this.findNodeAtPoint(pt);
    if (found) {
      this.hoveredNode = {
        trackId: this.tracks[found.trackIdx].id,
        nodeIndex: found.nodeIdx
      };
    }

    if (hoverPad || found) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const pt = this.getCanvasPoint(e.clientX, e.clientY);

    if (this.draggingMarble) {
      const target = this.physicsEngine.findNearestTrack(pt, 60);
      if (target && target.nodeIndex === 0) {
        if (this.marbles.filter(m => m.type === this.draggingMarble!.type).length === 0
          && this.marbles.length < CONFIG.MAX_MARBLES) {

          const newMarble: Marble = this.createMarble(this.draggingMarble.type);
          newMarble.position = { ...target.track.nodes[0].position };
          this.marbles.push(newMarble);
          this.physicsEngine.setMarbles(this.marbles);
          this.physicsEngine.launchMarble(newMarble, target.track.id);
          this.activeMarbleTypes.add(newMarble.type);
          this.updateDominantType();
        }
      }
      this.draggingMarble = null;
    }

    if (this.draggingNode) {
      this.draggingNode = null;
    }

    this.canvas.style.cursor = 'default';
  }

  private onMouseLeave(): void {
    if (this.draggingMarble) {
      this.draggingMarble = null;
    }
    if (this.draggingNode) {
      this.draggingNode = null;
    }
    this.hoveredNode = null;
    this.hoveredLaunchPad = null;
    this.canvas.style.cursor = 'default';
  }

  private findNodeAtPoint(pt: Point): { trackIdx: number; nodeIdx: number } | null {
    for (let ti = 0; ti < this.tracks.length; ti++) {
      const track = this.tracks[ti];
      for (let ni = 0; ni < track.nodes.length; ni++) {
        const n = track.nodes[ni];
        const dx = pt.x - n.position.x;
        const dy = pt.y - n.position.y;
        if (dx * dx + dy * dy <= CONFIG.NODE_HIT_RADIUS ** 2) {
          return { trackIdx: ti, nodeIdx: ni };
        }
      }
    }
    return null;
  }

  private createMarble(type: MarbleType): Marble {
    return {
      id: genId('marble'),
      type,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      trackId: null,
      nodeIndex: 0,
      progress: 0,
      isMoving: false,
      lastTriggeredNodeId: null,
      radius: CONFIG.MARBLE_RADIUS
    };
  }

  private bumpActivity(type: MarbleType): void {
    this.activityLevel = Math.min(1.0, this.activityLevel + 0.12);
    this.dominantMarbleType = type;
  }

  private updateDominantType(): void {
    if (this.marbles.length === 0) {
      this.dominantMarbleType = null;
      return;
    }

    const counts: Record<string, number> = {};
    for (const m of this.marbles) {
      if (!m.isMoving) continue;
      counts[m.type] = (counts[m.type] || 0) + 1;
    }

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      this.dominantMarbleType = entries[0][0] as MarbleType;
    }
  }

  private clearMarblesOnly(): void {
    this.marbles = [];
    this.activeMarbleTypes.clear();
    this.physicsEngine.setMarbles(this.marbles);
    this.renderEngine.clearAllParticles();
    this.dominantMarbleType = null;
    this.activityLevel = 0;

    for (const track of this.tracks) {
      for (const node of track.nodes) {
        node.highlighted = false;
        node.highlightTime = 0;
      }
    }
  }

  private fullReset(): void {
    this.clearMarblesOnly();
    this.tracks = [];
    this.initDefaultTracks();
    this.physicsEngine.setTracks(this.tracks);
  }

  private updateNodeHighlights(deltaTime: number): void {
    const dtMs = deltaTime * 1000;
    for (const track of this.tracks) {
      for (const node of track.nodes) {
        if (node.highlighted) {
          node.highlightTime -= dtMs;
          if (node.highlightTime <= 0) {
            node.highlighted = false;
            node.highlightTime = 0;
          }
        }
      }
    }
  }

  private loop(timestamp: number): void {
    if (!this.animationReady) return;

    let deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (deltaTime > 0.05) deltaTime = 0.05;

    this.fpsCounter++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1) {
      this.fps = Math.round(this.fpsCounter / this.fpsTimer);
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    this.activityDecayAccum += deltaTime;
    if (this.activityDecayAccum >= 0.05) {
      this.activityLevel = Math.max(0, this.activityLevel - 0.015);
      if (this.activityLevel < 0.02) this.dominantMarbleType = null;
      this.activityDecayAccum = 0;
    }

    this.physicsEngine.update(deltaTime);
    this.renderEngine.updateParticles(deltaTime);
    this.updateNodeHighlights(deltaTime);

    const renderState: RenderState = {
      tracks: this.tracks,
      marbles: this.marbles,
      particles: this.renderEngine.getParticles(),
      launchPads: this.launchPads,
      draggingNode: this.draggingNode ? {
        trackId: this.draggingNode.trackId,
        nodeIndex: this.draggingNode.nodeIndex
      } : null,
      draggingMarble: this.draggingMarble,
      activeMarbleTypes: this.activeMarbleTypes,
      dominantMarbleType: this.dominantMarbleType,
      activityLevel: this.activityLevel,
      hoveredNode: this.hoveredNode,
      hoveredLaunchPad: this.hoveredLaunchPad
    };

    this.renderEngine.render(renderState, deltaTime);

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.animationReady = false;
  }
}

const game = new GameMain();

window.addEventListener('DOMContentLoaded', async () => {
  await game.start();
});

window.addEventListener('beforeunload', () => {
  game.destroy();
});

(window as any).__soundChainPinball = game;
