import { eventBus } from './eventBus';
import { Block, getBlockById, blocks, getEventTypeName, timeToMinutes, EventType } from './data';
import { getBlockAtPosition, renderThumbnail, setState, getState } from './visualizer';
import { startNarrative, resetAnimation, startPlayback } from './animator';

let appElement: HTMLElement;
let canvasContainer: HTMLElement;
let canvas: HTMLCanvasElement;
let dataPanel: HTMLElement;
let toolbar: HTMLElement;
let timelineContainer: HTMLElement;
let summaryDescription: HTMLElement;
let summaryThumbnail: HTMLCanvasElement;
let favoriteBtn: SVGElement;
let statsView: HTMLElement;
let timelineView: HTMLElement;
let playbackOverlay: HTMLElement;
let playbackCanvas: HTMLCanvasElement;
let playbackTime: HTMLElement;
let currentBlock: Block | null = null;
let typewriterTimer: number | null = null;
let typewriterText = '';

const FAVORITES_KEY = 'liuguang_favorites';

export function initUI(root: HTMLElement): void {
  appElement = root;
  
  buildUI();
  bindEvents();
  loadFavorites();
}

function buildUI(): void {
  appElement.innerHTML = '';
  
  toolbar = createElement('div', 'toolbar');
  toolbar.innerHTML = `
    <div class="toolbar-item active" data-mode="map" title="地图模式">
      <svg viewBox="0 0 24 24">
        <path d="M3 3h8v13H3zM10.5 3h8v13h-8zM19 3h2v13h-2z" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>
      </svg>
    </div>
    <div class="toolbar-item" data-mode="timeline" title="时间轴模式">
      <svg viewBox="0 0 24 24">
        <path d="M4 6h16v2H4zM4 12h16v2H4zM4 18h10v2H4z"/>
      </svg>
    </div>
    <div class="toolbar-item" data-mode="stats" title="数据统计">
      <svg viewBox="0 0 24 24">
        <path d="M4 20h4V8V10h4v10h4V4zM7 20h2v-6H7v6zM11 20h2v-3h-2v3zM15 20h2v-8h-2v8z"/>
      </svg>
    </div>
    <div class="toolbar-item" data-mode="playback" title="回放模式">
      <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
  `;
  appElement.appendChild(toolbar);
  
  canvasContainer = createElement('div', 'canvas-container');
  canvas = document.createElement('canvas');
  canvas.className = 'main-canvas';
  canvasContainer.appendChild(canvas);
  appElement.appendChild(canvasContainer);
  
  dataPanel = createElement('div', 'data-panel');
  dataPanel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">街区数据</span>
      <svg class="favorite-btn" viewBox="0 0 24 24">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    </div>
    <div class="legend">
      <div class="legend-item"><span class="legend-dot person"></span>人物</div>
      <div class="legend-item"><span class="legend-dot vehicle"></span>车辆</div>
      <div class="legend-item"><span class="legend-dot activity"></span>活动</div>
      <div class="legend-item"><span class="legend-dot environment"></span>环境</div>
    </div>
    <div class="timeline-container">
      <div class="timeline">
        <div class="timeline-events"></div>
        <div class="timeline-cursor"></div>
      </div>
      <div class="timeline-labels">
        <span>18:00</span>
        <span>19:00</span>
        <span>20:00</span>
        <span>21:00</span>
        <span>22:00</span>
        <span>23:00</span>
      </div>
    </div>
    <div class="event-summary">
      <div class="summary-description">将鼠标移到时间轴上查看事件详情...</div>
      <div class="summary-thumbnail">
        <canvas width="340" height="80"></canvas>
      </div>
    </div>
    <div class="panel-actions">
      <button class="btn btn-secondary btn-restart">重新开始</button>
      <button class="btn btn-primary btn-narrative">生成叙事</button>
    </div>
  `;
  appElement.appendChild(dataPanel);
  
  timelineContainer = dataPanel.querySelector('.timeline') as HTMLElement;
  summaryDescription = dataPanel.querySelector('.summary-description') as HTMLElement;
  summaryThumbnail = dataPanel.querySelector('.summary-thumbnail canvas') as HTMLCanvasElement;
  favoriteBtn = dataPanel.querySelector('.favorite-btn') as SVGElement;
  
  statsView = createElement('div', 'stats-view');
  statsView.innerHTML = `
    <h2 class="stats-title">街区事件统计</h2>
    <div class="stats-chart"></div>
  `;
  appElement.appendChild(statsView);
  
  timelineView = createElement('div', 'timeline-view');
  timelineView.innerHTML = `
    <h2 class="timeline-view-title">全街区时间轴</h2>
    <div class="timeline-view-content"></div>
  `;
  appElement.appendChild(timelineView);
  
  playbackOverlay = createElement('div', 'playback-overlay');
  playbackOverlay.innerHTML = `
    <canvas class="playback-canvas"></canvas>
    <div class="playback-controls">
      <button class="btn btn-secondary btn-playback-stop">停止</button>
      <span class="playback-time">18:00</span>
    </div>
  `;
  appElement.appendChild(playbackOverlay);
  
  playbackCanvas = playbackOverlay.querySelector('.playback-canvas') as HTMLCanvasElement;
  playbackTime = playbackOverlay.querySelector('.playback-time') as HTMLElement;
}

function createElement(tag: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

function bindEvents(): void {
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
  canvas.addEventListener('click', handleCanvasClick);
  
  toolbar.addEventListener('click', handleToolbarClick);
  
  timelineContainer.addEventListener('mousemove', handleTimelineMouseMove);
  timelineContainer.addEventListener('mouseleave', handleTimelineMouseLeave);
  
  const narrativeBtn = dataPanel.querySelector('.btn-narrative');
  narrativeBtn?.addEventListener('click', handleNarrativeClick);
  
  const restartBtn = dataPanel.querySelector('.btn-restart');
  restartBtn?.addEventListener('click', handleRestartClick);
  
  favoriteBtn.addEventListener('click', handleFavoriteClick);
  
  const playbackStopBtn = playbackOverlay.querySelector('.btn-playback-stop');
  playbackStopBtn?.addEventListener('click', handlePlaybackStop);
  
  eventBus.on('selectBlock', handleSelectBlock);
  eventBus.on('highlightEvent', handleHighlightEvent);
  eventBus.on('narrativeEnd', handleNarrativeEnd);
  eventBus.on('playbackStart', handlePlaybackStart);
  eventBus.on('playbackTimeUpdate', handlePlaybackTimeUpdate);
  eventBus.on('playbackEnd', handlePlaybackEnd);
  eventBus.on('reset', handleReset);
}

function handleCanvasMouseMove(e: MouseEvent): void {
  const state = getState();
  if (state.mode !== 'map' || state.isAnimating) return;
  
  const blockId = getBlockAtPosition(e.clientX, e.clientY);
  
  if (blockId !== state.hoveredBlockId) {
    setState({ hoveredBlockId: blockId });
  }
}

function handleCanvasMouseLeave(): void {
  const state = getState();
  if (state.mode !== 'map') return;
  setState({ hoveredBlockId: null });
}

function handleCanvasClick(e: MouseEvent): void {
  const state = getState();
  if (state.mode !== 'map' || state.isAnimating) return;
  
  const blockId = getBlockAtPosition(e.clientX, e.clientY);
  if (blockId !== null) {
    eventBus.emit('selectBlock', blockId);
  }
}

function handleSelectBlock(blockId: number): void {
  const block = getBlockById(blockId);
  if (!block) return;
  
  currentBlock = block;
  setState({ selectedBlockId: blockId });
  
  showDataPanel(block);
  canvasContainer.classList.add('panel-open');
  dataPanel.classList.add('visible');
  
  updateFavoriteButton(blockId);
}

function showDataPanel(block: Block): void {
  const titleEl = dataPanel.querySelector('.panel-title') as HTMLElement;
  titleEl.textContent = block.name;
  
  const eventsContainer = timelineContainer.querySelector('.timeline-events') as HTMLElement;
  eventsContainer.innerHTML = '';
  
  const startTime = 18 * 60;
  const endTime = 23 * 60;
  const totalDuration = endTime - startTime;
  
  block.events.forEach((event, index) => {
    const eventEl = document.createElement('div');
    eventEl.className = `timeline-event type-${event.type}`;
    const eventMinutes = timeToMinutes(event.time);
    const left = ((eventMinutes - startTime) / totalDuration) * 100;
    eventEl.style.left = `${left}%`;
    eventEl.dataset.index = String(index);
    eventEl.title = `${event.time} - ${getEventTypeName(event.type)}`;
    eventsContainer.appendChild(eventEl);
  });
  
  summaryDescription.textContent = '将鼠标移到时间轴上查看事件详情...';
  const thumbContainer = summaryThumbnail.parentElement;
  if (thumbContainer) {
    thumbContainer.classList.remove('visible');
  }
}

function handleTimelineMouseMove(e: MouseEvent): void {
  if (!currentBlock) return;
  
  const rect = timelineContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  
  const cursor = timelineContainer.querySelector('.timeline-cursor') as HTMLElement;
  cursor.style.left = `${x}px`;
  cursor.style.opacity = '1';
  
  const startTime = 18 * 60;
  const endTime = 23 * 60;
  const totalDuration = endTime - startTime;
  const hoverMinutes = startTime + (x / width) * totalDuration;
  
  let closestEventIndex = -1;
  let closestDistance = Infinity;
  
  currentBlock.events.forEach((event, index) => {
    const eventMinutes = timeToMinutes(event.time);
    const distance = Math.abs(eventMinutes - hoverMinutes);
    if (distance < closestDistance && distance < 30) {
      closestDistance = distance;
      closestEventIndex = index;
    }
  });
  
  if (closestEventIndex >= 0) {
    const event = currentBlock.events[closestEventIndex];
    startTypewriter(event.description);
    renderThumbnail(summaryThumbnail, currentBlock, closestEventIndex);
    const thumbContainer = summaryThumbnail.parentElement;
    if (thumbContainer) {
      thumbContainer.classList.add('visible');
    }
    
    const eventElements = timelineContainer.querySelectorAll('.timeline-event');
    eventElements.forEach((el, i) => {
      el.classList.toggle('highlighted', i === closestEventIndex);
    });
  }
}

function handleTimelineMouseLeave(): void {
  const cursor = timelineContainer.querySelector('.timeline-cursor') as HTMLElement;
  cursor.style.opacity = '0';
  
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
}

function startTypewriter(text: string): void {
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
  }
  
  typewriterText = '';
  let index = 0;
  
  function typeNext(): void {
    if (index < text.length) {
      typewriterText += text[index];
      summaryDescription.textContent = typewriterText;
      index++;
      typewriterTimer = window.setTimeout(typeNext, 60);
    }
  }
  
  typeNext();
}

function handleNarrativeClick(): void {
  const state = getState();
  if (state.selectedBlockId === null || state.isAnimating) return;
  
  startNarrative(state.selectedBlockId);
}

function handleRestartClick(): void {
  resetAnimation();
  hideDataPanel();
}

function handleReset(): void {
  hideDataPanel();
}

function hideDataPanel(): void {
  dataPanel.classList.remove('visible');
  canvasContainer.classList.remove('panel-open');
  currentBlock = null;
}

function handleHighlightEvent(index: number, event: any): void {
  if (!currentBlock) return;
  
  startTypewriter(event.description);
  renderThumbnail(summaryThumbnail, currentBlock, index);
  const thumbContainer = summaryThumbnail.parentElement;
  if (thumbContainer) {
    thumbContainer.classList.add('visible');
  }
  
  const eventElements = timelineContainer.querySelectorAll('.timeline-event');
  eventElements.forEach((el, i) => {
    el.classList.toggle('highlighted', i === index);
  });
}

function handleNarrativeEnd(): void {
}

function handleToolbarClick(e: Event): void {
  const target = (e.target as HTMLElement).closest('.toolbar-item') as HTMLElement | null;
  if (!target) return;
  
  const mode = target.dataset.mode;
  if (!mode) return;
  
  const toolbarItems = toolbar.querySelectorAll('.toolbar-item');
  toolbarItems.forEach(item => item.classList.remove('active'));
  target.classList.add('active');
  
  switchMode(mode as any);
}

function switchMode(mode: 'map' | 'timeline' | 'stats' | 'playback'): void {
  setState({ mode });
  
  statsView.classList.remove('visible');
  timelineView.classList.remove('visible');
  canvasContainer.style.display = 'flex';
  
  if (mode === 'map') {
    canvasContainer.style.display = 'flex';
  } else if (mode === 'timeline') {
    canvasContainer.style.display = 'none';
    showTimelineView();
  } else if (mode === 'stats') {
    canvasContainer.style.display = 'none';
    showStatsView();
  } else if (mode === 'playback') {
    startPlayback();
  }
}

function showStatsView(): void {
  statsView.classList.add('visible');
  const chart = statsView.querySelector('.stats-chart') as HTMLElement;
  chart.innerHTML = '';
  
  const maxEvents = Math.max(...blocks.map(b => b.events.length));
  
  blocks.slice(0, 12).forEach(block => {
    const group = createElement('div', 'stats-bar-group');
    
    const bars = createElement('div', 'stats-bars');
    
    const typeCounts: Record<EventType, number> = {
      [EventType.PERSON]: 0,
      [EventType.VEHICLE]: 0,
      [EventType.ACTIVITY]: 0,
      [EventType.ENVIRONMENT]: 0
    };
    
    block.events.forEach(e => {
      typeCounts[e.type]++;
    });
    
    Object.entries(typeCounts).forEach(([type, count]) => {
      const bar = createElement('div', `stats-bar ${type}`);
      const height = (count / maxEvents) * 200;
      (bar as HTMLElement).style.height = `${Math.max(height, 4)}px`;
      bars.appendChild(bar);
    });
    
    group.appendChild(bars);
    
    const label = createElement('div', 'stats-label');
    label.textContent = block.name;
    group.appendChild(label);
    
    group.addEventListener('click', () => {
      setState({ mode: 'map', selectedBlockId: block.id });
      const toolbarItems = toolbar.querySelectorAll('.toolbar-item');
      toolbarItems.forEach(item => {
        (item as HTMLElement).classList.toggle('active', (item as HTMLElement).dataset.mode === 'map');
      });
      canvasContainer.style.display = 'flex';
      statsView.classList.remove('visible');
      eventBus.emit('selectBlock', block.id);
    });
    
    chart.appendChild(group);
  });
}

function showTimelineView(): void {
  timelineView.classList.add('visible');
  const content = timelineView.querySelector('.timeline-view-content') as HTMLElement;
  content.innerHTML = '';
  
  blocks.slice(0, 12).forEach(block => {
    const row = createElement('div', 'timeline-row');
    
    const label = createElement('div', 'timeline-row-label');
    label.textContent = block.name;
    row.appendChild(label);
    
    const eventsContainer = createElement('div', 'timeline-row-events');
    
    const startTime = 18 * 60;
    const endTime = 23 * 60;
    const totalDuration = endTime - startTime;
    
    block.events.forEach(event => {
      const dot = document.createElement('div');
      dot.className = `timeline-event type-${event.type}`;
      const eventMinutes = timeToMinutes(event.time);
      const left = ((eventMinutes - startTime) / totalDuration) * 100;
      dot.style.left = `${left}%`;
      dot.style.top = '50%';
      dot.style.transform = 'translate(-50%, -50%)';
      eventsContainer.appendChild(dot);
    });
    
    row.appendChild(eventsContainer);
    
    row.addEventListener('click', () => {
      setState({ mode: 'map', selectedBlockId: block.id });
      const toolbarItems = toolbar.querySelectorAll('.toolbar-item');
      toolbarItems.forEach(item => {
        (item as HTMLElement).classList.toggle('active', (item as HTMLElement).dataset.mode === 'map');
      });
      canvasContainer.style.display = 'flex';
      timelineView.classList.remove('visible');
      eventBus.emit('selectBlock', block.id);
    });
    
    content.appendChild(row);
  });
}

function handlePlaybackStart(): void {
  playbackOverlay.classList.add('active');
  resizePlaybackCanvas();
}

function handlePlaybackTimeUpdate(time: string): void {
  playbackTime.textContent = time;
}

function handlePlaybackEnd(): void {
  playbackOverlay.classList.remove('active');
  const toolbarItems = toolbar.querySelectorAll('.toolbar-item');
  toolbarItems.forEach(item => {
    (item as HTMLElement).classList.toggle('active', (item as HTMLElement).dataset.mode === 'map');
  });
}

function handlePlaybackStop(): void {
  resetAnimation();
  playbackOverlay.classList.remove('active');
  const toolbarItems = toolbar.querySelectorAll('.toolbar-item');
  toolbarItems.forEach(item => {
    (item as HTMLElement).classList.toggle('active', (item as HTMLElement).dataset.mode === 'map');
  });
}

function resizePlaybackCanvas(): void {
  playbackCanvas.width = window.innerWidth;
  playbackCanvas.height = window.innerHeight;
}

function loadFavorites(): void {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      const favorites = JSON.parse(saved) as number[];
      setState({ favorites: new Set(favorites) });
    }
  } catch (e) {
    console.error('Failed to load favorites:', e);
  }
}

function saveFavorites(): void {
  try {
    const state = getState();
    const favorites = Array.from(state.favorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
}

function handleFavoriteClick(): void {
  const state = getState();
  if (state.selectedBlockId === null) return;
  
  const favorites = new Set(state.favorites);
  
  if (favorites.has(state.selectedBlockId)) {
    favorites.delete(state.selectedBlockId);
  } else {
    favorites.add(state.selectedBlockId);
  }
  
  setState({ favorites });
  updateFavoriteButton(state.selectedBlockId);
  saveFavorites();
}

function updateFavoriteButton(blockId: number): void {
  const state = getState();
  const isFavorited = state.favorites.has(blockId);
  favoriteBtn.classList.toggle('favorited', isFavorited);
}

export function getCanvas(): HTMLCanvasElement {
  return canvas;
}

export function getPlaybackCanvas(): HTMLCanvasElement {
  return playbackCanvas;
}
