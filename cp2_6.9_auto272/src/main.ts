import { TimelineEngine, type RenderState } from './timelineEngine';
import { EventManager } from './eventManager';
import { InteractionController } from './interactionController';
import type { HistoryEvent, ViewState, WorkerResponse, EventCategory, CollisionResult } from './types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types';

type SimpleCategory = 'war' | 'culture' | 'tech' | 'politics' | 'disaster';

const INITIAL_RANGE = { startYear: 1000, endYear: 2020 };
const COLLISION_RADIUS = 20;

class TimelineApp {
  private engine: TimelineEngine;
  private eventManager: EventManager;
  private controller: InteractionController;
  private worker: Worker | null = null;

  private canvas: HTMLCanvasElement;
  private infoPanel: HTMLDivElement;
  private filterBar: HTMLDivElement;
  private resetBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;

  private running = false;
  private needsRender = true;
  private needsCollisionUpdate = true;
  private lastCollisionKey = '';

  private pendingEvents: HistoryEvent[] = [];

  constructor() {
    this.canvas = document.getElementById('timeline-canvas') as HTMLCanvasElement;
    this.infoPanel = document.getElementById('info-panel') as HTMLDivElement;
    this.filterBar = document.getElementById('filter-bar') as HTMLDivElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

    this.engine = new TimelineEngine(this.canvas);
    this.eventManager = new EventManager();
    this.controller = new InteractionController(INITIAL_RANGE);

    this.initUI();
    this.initWorker();
    this.bindEvents();
    this.resize();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop(performance.now());
  }

  private initUI(): void {
    this.buildFilterButtons();
    this.updateInfoPanel();
  }

  private buildFilterButtons(): void {
    const categories: SimpleCategory[] = ['war', 'culture', 'tech', 'politics', 'disaster'];
    const filter = this.eventManager.getCategoryFilter();

    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.category = cat;
      btn.textContent = CATEGORY_LABELS[cat];
      btn.style.backgroundColor = filter[cat] ? CATEGORY_COLORS[cat] : '#E0E0E0';
      btn.style.color = filter[cat] ? '#FFFFFF' : '#555555';
      btn.addEventListener('click', () => this.toggleFilter(cat));
      this.filterBar.appendChild(btn);
    }
  }

  private toggleFilter(category: SimpleCategory): void {
    const current = this.eventManager.getCategoryFilter();
    const newValue = !current[category];
    this.eventManager.setCategoryFilter(category, newValue);
    this.needsCollisionUpdate = true;

    const buttons = Array.from(this.filterBar.querySelectorAll<HTMLButtonElement>('.filter-btn'));
    for (const btn of buttons) {
      if (btn.dataset.category === category) {
        btn.style.backgroundColor = newValue ? CATEGORY_COLORS[category] : '#E0E0E0';
        btn.style.color = newValue ? '#FFFFFF' : '#555555';
      }
    }
    this.updateInfoPanel();
    this.needsRender = true;
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(new URL('./eventWorker.ts', import.meta.url), { type: 'module' });
      this.worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.type === 'eventsLoaded') {
          this.eventManager.setEvents(msg.events);
          this.pendingEvents = msg.events;
          this.needsCollisionUpdate = true;
          this.updateInfoPanel();
          this.needsRender = true;
        } else if (msg.type === 'collisionsDetected') {
          this.eventManager.setCollisionResults(msg.results);
          this.eventManager.updatePositions(this.controller.getViewState(), this.canvas.clientWidth, this.canvas.clientHeight);
          this.needsRender = true;
        }
      });
      this.worker.postMessage({ type: 'loadEvents' });
    } catch (err) {
      console.error('Worker初始化失败，fallback到主线程加载:', err);
      import('./eventData').then(({ HISTORY_EVENTS }) => {
        this.eventManager.setEvents(HISTORY_EVENTS);
        this.pendingEvents = HISTORY_EVENTS;
        this.needsCollisionUpdate = true;
        this.updateInfoPanel();
        this.needsRender = true;
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.needsCollisionUpdate = true;
      this.needsRender = true;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.controller.handleMouseDown(e, rect);
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const { x, y } = this.controller.handleMouseMove(e, rect);
      if (x >= 0 && x <= this.canvas.clientWidth && y >= 0 && y <= this.canvas.clientHeight) {
        this.eventManager.handleMouseMove(x, y);
        this.needsRender = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.controller.handleMouseUp(e, rect);
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.controller.handleWheel(e, rect, this.canvas.clientWidth);
      this.needsCollisionUpdate = true;
      this.needsRender = true;
    }, { passive: false });

    this.controller.onClick((x, y) => {
      const handled = this.eventManager.handleClick(x, y);
      this.needsRender = true;
      return handled;
    });

    this.controller.onViewStateChange(() => {
      this.eventManager.updatePositions(this.controller.getViewState(), this.canvas.clientWidth, this.canvas.clientHeight);
      this.updateInfoPanel();
      this.needsRender = true;
    });

    this.controller.onDragStateChange((dragging) => {
      this.canvas.style.cursor = dragging ? 'grabbing' : 'default';
    });

    this.eventManager.onEventsChange(() => {
      this.needsRender = true;
    });

    this.eventManager.onHoverChange(() => {
      this.needsRender = true;
    });

    this.resetBtn.addEventListener('click', () => {
      this.controller.resetView();
      this.needsCollisionUpdate = true;
      this.needsRender = true;
    });

    this.exportBtn.addEventListener('click', () => {
      const dataUrl = this.engine.exportScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `timeline-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.engine.resize(w, h);
    this.eventManager.updatePositions(this.controller.getViewState(), w, h);
  }

  private updateInfoPanel(): void {
    const state = this.controller.getViewState();
    const startY = Math.round(state.range.startYear);
    const endY = Math.round(state.range.endYear);
    const zoom = state.zoom.toFixed(1);
    const visible = this.eventManager.getVisibleCount();
    this.infoPanel.textContent = `${startY}年 - ${endY}年  |  事件: ${visible}  |  缩放: ${zoom}x`;
  }

  private loop(now: number): void {
    if (!this.running) return;

    this.controller.animate(now);
    this.eventManager.animate(now);

    if (this.needsCollisionUpdate && this.pendingEvents.length > 0) {
      this.requestCollisionDetection();
    }

    if (this.needsRender) {
      this.render();
      this.needsRender = false;
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  private requestCollisionDetection(): void {
    const viewState = this.controller.getViewState();
    const yearToPixel = this.engine.getYearToPixelFn(viewState);
    const key = `${viewState.range.startYear}-${viewState.range.endYear}-${viewState.offsetX}-${this.canvas.clientWidth}`;

    if (key === this.lastCollisionKey && !this.controller.isDragInProgress()) {
      this.needsCollisionUpdate = false;
      return;
    }
    this.lastCollisionKey = key;

    const visibleEvents = this.pendingEvents.filter(e => {
      const filter = this.eventManager.getCategoryFilter();
      return filter[e.category];
    });

    const params = {
      startYear: viewState.range.startYear,
      endYear: viewState.range.endYear,
      paddingLeft: 100,
      timelineWidth: this.engine.getTimelineWidth(),
      offsetX: viewState.offsetX,
      collisionRadius: COLLISION_RADIUS
    };

    if (this.worker) {
      try {
        this.worker.postMessage({
          type: 'detectCollisions',
          events: visibleEvents,
          params
        });
      } catch {
        this.computeCollisionFallback(visibleEvents, yearToPixel);
      }
    } else {
      this.computeCollisionFallback(visibleEvents, yearToPixel);
    }
    this.needsCollisionUpdate = false;
  }

  private computeCollisionFallback(events: HistoryEvent[], yearToPixel: (y: number) => number): void {
    const sorted = [...events].sort((a, b) => a.year - b.year);
    const results: CollisionResult[] = [];
    const placed: Array<{ x: number; y: number; eventId: string; side: 'top' | 'bottom' }> = [];

    for (const event of sorted) {
      const x = yearToPixel(event.year);
      let yOffset = 0;
      let side: 'top' | 'bottom' = 'bottom';
      let attempt = 0;
      let placedOk = false;
      const step = COLLISION_RADIUS * 0.7;

      const tryPlace = (testY: number): boolean => {
        for (const p of placed) {
          const dx = x - p.x;
          const dy = testY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < COLLISION_RADIUS * 2) return false;
        }
        return true;
      };

      while (!placedOk && attempt < 50) {
        if (attempt % 2 === 0) {
          side = 'bottom';
          yOffset = Math.floor(attempt / 2) * step;
        } else {
          side = 'top';
          yOffset = Math.floor(attempt / 2) * step + step * 0.5;
        }
        if (tryPlace(yOffset)) placedOk = true;
        attempt++;
      }

      results.push({ eventId: event.id, yOffset, side });
      placed.push({ x, y: yOffset, eventId: event.id, side });
    }

    this.eventManager.setCollisionResults(results);
    this.eventManager.updatePositions(this.controller.getViewState(), this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private render(): void {
    const viewState = this.controller.getViewState();
    this.eventManager.updatePositions(viewState, this.canvas.clientWidth, this.canvas.clientHeight);

    const state: RenderState = {
      viewState,
      events: this.eventManager.getRenderedEvents(),
      hoverInfo: this.eventManager.getHoverInfo(),
      hoveredEvent: this.eventManager.getHoveredEvent(),
      expandedEvent: this.eventManager.getExpandedEvent(),
      visibleCount: this.eventManager.getVisibleCount()
    };

    this.engine.render(state);
    this.updateInfoPanel();
  }
}

function bootstrap(): void {
  const app = new TimelineApp();
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
