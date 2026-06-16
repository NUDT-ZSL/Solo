import { Block, getEventTypeColor, getBlockById, timeToMinutes } from './data';
import { eventBus } from './eventBus';

export interface VisualizerState {
  selectedBlockId: number | null;
  hoveredBlockId: number | null;
  zoomLevel: number;
  offsetX: number;
  offsetY: number;
  gridGap: number;
  favorites: Set<number>;
  mode: 'map' | 'timeline' | 'stats' | 'playback';
  currentTime: number;
  highlightedEventIndex: number;
  isAnimating: boolean;
  narrativeProgress: number;
}

const GRID_SIZE = 6;
const GRID_LINE_COLOR = '#2D2D44';
const BG_COLOR = '#1B1B2F';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let state: VisualizerState;
let animationFrameId: number;
let lastTime = 0;

export function initVisualizer(canvasElement: HTMLCanvasElement, initialState: VisualizerState): void {
  canvas = canvasElement;
  ctx = canvas.getContext('2d')!;
  state = initialState;
  resize();
  window.addEventListener('resize', resize);
  startRenderLoop();
}

export function resize(): void {
  const container = canvas.parentElement;
  if (container) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
}

export function getState(): VisualizerState {
  return state;
}

export function setState(newState: Partial<VisualizerState>): void {
  state = { ...state, ...newState };
}

function startRenderLoop(): void {
  function loop(timestamp: number) {
    if (timestamp - lastTime >= 1000 / 60) {
      renderFrame();
      eventBus.emit('frameUpdate', timestamp);
      lastTime = timestamp;
    }
    animationFrameId = requestAnimationFrame(loop);
  }
  animationFrameId = requestAnimationFrame(loop);
}

export function stopRenderLoop(): void {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}

export function renderFrame(): void {
  if (!ctx || !canvas) return;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.mode === 'map' || state.mode === 'playback') {
    renderGridMap();
  }
}

function getGridBounds(): { x: number; y: number; width: number; height: number; cellSize: number } {
  const totalWidth = canvas.width;
  const totalHeight = canvas.height;
  const gridGap = state.gridGap;
  
  const gridWidth = GRID_SIZE * gridGap;
  const gridHeight = GRID_SIZE * gridGap;
  
  const scale = Math.min(
    (totalWidth * 0.8) / gridWidth,
    (totalHeight * 0.8) / gridHeight
  ) * state.zoomLevel;
  
  const cellSize = gridGap * scale;
  const totalGridWidth = cellSize * GRID_SIZE;
  const totalGridHeight = cellSize * GRID_SIZE;
  
  const x = (totalWidth - totalGridWidth) / 2 + state.offsetX * scale;
  const y = (totalHeight - totalGridHeight) / 2 + state.offsetY * scale;
  
  return { x, y, width: totalGridWidth, height: totalGridHeight, cellSize };
}

function renderGridMap(): void {
  const bounds = getGridBounds();
  
  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);
  
  for (let i = 0; i <= GRID_SIZE; i++) {
    const x = bounds.x + i * bounds.cellSize;
    const y = bounds.y;
    const h = bounds.height;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  }
  
  for (let i = 0; i <= GRID_SIZE; i++) {
    const x = bounds.x;
    const y = bounds.y + i * bounds.cellSize;
    const w = bounds.width;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const blockId = row * GRID_SIZE + col;
      renderBlock(blockId, row, col, bounds);
    }
  }
}

function renderBlock(blockId: number, row: number, col: number, bounds: { x: number; y: number; width: number; height: number; cellSize: number }): void {
  const block = getBlockById(blockId);
  if (!block) return;
  
  const isSelected = state.selectedBlockId === blockId;
  const isHovered = state.hoveredBlockId === blockId;
  const isFavorite = state.favorites.has(blockId);
  
  let cellSize = bounds.cellSize;
  let offsetX = 0;
  let offsetY = 0;
  
  if (isHovered || isSelected) {
    const scale = isSelected ? 1.05 : 1.1;
    offsetX = (cellSize * scale - cellSize) / 2;
    offsetY = (cellSize * scale - cellSize) / 2;
  }
  
  const x = bounds.x + col * cellSize - offsetX;
  const y = bounds.y + row * cellSize - offsetY;
  const size = cellSize + offsetX * 2;
  const padding = size * 0.1;
  
  if (isFavorite) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
  }
  
  if (isSelected || isHovered) {
    ctx.fillStyle = 'rgba(255, 107, 107, 0.1)';
    ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
  }
  
  if (state.mode === 'playback') {
    renderBlockEvents(block, x + padding, y + padding, size - padding * 2);
  }
  
  if (isHovered && !state.isAnimating) {
    ctx.fillStyle = '#E0E0E0';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const labelY = y + size + padding + 14;
    if (labelY < bounds.y + bounds.height + 30) {
      ctx.fillText(block.name, x + size / 2, labelY);
    }
  }
}

function renderBlockEvents(block: Block, x: number, y: number, size: number): void {
  const currentTime = state.currentTime;
  
  block.events.forEach((event, index) => {
    const eventMinutes = timeToMinutes(event.time);
    if (eventMinutes > currentTime) return;
    
    const isHighlighted = state.isAnimating && 
      state.selectedBlockId === block.id && 
      index === state.highlightedEventIndex;
    
    const eventX = x + (event.position.x / 100) * size;
    const eventY = y + (event.position.y / 100) * size;
    const color = getEventTypeColor(event.type);
    
    let dotSize = 4;
    if (isHighlighted) {
      dotSize = 8;
      ctx.shadowColor = '#FF6B6B';
      ctx.shadowBlur = 8;
    }
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(eventX, eventY, dotSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  });
}

export function getBlockAtPosition(clientX: number, clientY: number): number | null {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  const bounds = getGridBounds();
  
  if (x < bounds.x || x > bounds.x + bounds.width ||
      y < bounds.y || y > bounds.y + bounds.height) {
    return null;
  }
  
  const col = Math.floor((x - bounds.x) / bounds.cellSize);
  const row = Math.floor((y - bounds.y) / bounds.cellSize);
  
  if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
    return null;
  }
  
  return row * GRID_SIZE + col;
}

export function renderThumbnail(canvas: HTMLCanvasElement, block: Block, highlightEventIndex: number = -1): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.fillStyle = '#1B1B2F';
  ctx.fillRect(0, 0, w, h);
  
  ctx.strokeStyle = '#2D2D44';
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  
  ctx.strokeStyle = 'rgba(45, 45, 68, 0.5)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.1 + (w * 0.8 / 3) * i, h * 0.1);
    ctx.lineTo(w * 0.1 + (w * 0.8 / 3) * i, h * 0.9);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.1 + (h * 0.8 / 3) * i);
    ctx.lineTo(w * 0.9, h * 0.1 + (h * 0.8 / 3) * i);
    ctx.stroke();
  }
  
  block.events.forEach((event, index) => {
    const ex = w * 0.1 + (event.position.x / 100) * w * 0.8;
    const ey = h * 0.1 + (event.position.y / 100) * h * 0.8;
    const color = getEventTypeColor(event.type);
    const isHighlighted = index === highlightEventIndex;
    
    let size = 4;
    if (isHighlighted) {
      size = 8;
      ctx.shadowColor = '#FF6B6B';
      ctx.shadowBlur = 8;
    }
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ex, ey, size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  });
}

export { GRID_SIZE };
