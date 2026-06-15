import { NodeManager, NodeShape, WhiteboardNode } from './nodeManager';
import { ConnectorManager, Connector } from './connector';

const GRID_SIZE = 40;
const NAV_HEIGHT = 56;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let nodeContainer: HTMLDivElement;
let nodeManager: NodeManager;
let connectorManager: ConnectorManager;
let minimapCanvas: HTMLCanvasElement;
let minimapCtx: CanvasRenderingContext2D;

let viewportOffset = { x: 0, y: 0 };
let viewportScale = 1;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let viewportStart = { x: 0, y: 0 };
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function createUI() {
  const root = document.getElementById('root')!;
  root.innerHTML = '';

  const navbar = document.createElement('div');
  navbar.id = 'navbar';
  navbar.style.position = 'fixed';
  navbar.style.top = '0';
  navbar.style.left = '0';
  navbar.style.right = '0';
  navbar.style.height = `${NAV_HEIGHT}px`;
  navbar.style.backgroundColor = '#2C3E50';
  navbar.style.color = '#fff';
  navbar.style.display = 'flex';
  navbar.style.alignItems = 'center';
  navbar.style.padding = '0 20px';
  navbar.style.zIndex = '1000';
  navbar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

  const logo = document.createElement('div');
  logo.textContent = 'MindMeld';
  logo.style.fontSize = '20px';
  logo.style.fontWeight = '600';
  logo.style.letterSpacing = '1px';
  logo.style.flex = '0 0 auto';
  navbar.appendChild(logo);

  const shapeTools = document.createElement('div');
  shapeTools.style.display = 'flex';
  shapeTools.style.gap = '8px';
  shapeTools.style.marginLeft = '30px';

  const shapes: { shape: NodeShape; label: string }[] = [
    { shape: 'rectangle', label: '▭' },
    { shape: 'circle', label: '○' },
    { shape: 'diamond', label: '◇' }
  ];
  for (const s of shapes) {
    const btn = document.createElement('button');
    btn.textContent = s.label;
    btn.title = `创建${s.shape === 'rectangle' ? '矩形' : s.shape === 'circle' ? '圆形' : '菱形'}节点`;
    btn.style.width = '35px';
    btn.style.height = '35px';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.background = 'transparent';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '18px';
    btn.style.transition = 'background 0.15s';
    btn.addEventListener('mouseenter', () => { btn.style.background = '#34495E'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', () => {
      const worldX = (window.innerWidth / 2 - viewportOffset.x) / viewportScale;
      const worldY = ((window.innerHeight + NAV_HEIGHT) / 2 - viewportOffset.y) / viewportScale;
      nodeManager.createNode(s.shape, worldX, worldY);
    });
    shapeTools.appendChild(btn);
  }
  navbar.appendChild(shapeTools);

  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.gap = '4px';
  toolbar.style.marginLeft = 'auto';

  const createToolBtn = (title: string, content: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.title = title;
    btn.innerHTML = content;
    btn.style.width = '35px';
    btn.style.height = '35px';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.background = 'transparent';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';
    btn.style.transition = 'background 0.15s';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.addEventListener('mouseenter', () => { btn.style.background = '#34495E'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', onClick);
    return btn;
  };

  const undoBtn = createToolBtn('撤销 (Ctrl+Z)', '↶', () => {
    nodeManager.undo();
    connectorManager.undo();
    render();
  });
  const redoBtn = createToolBtn('重做 (Ctrl+Y)', '↷', () => {
    nodeManager.redo();
    connectorManager.redo();
    render();
  });
  const clearBtn = createToolBtn('清空画布', '🗑', () => {
    if (confirm('确定要清空画布吗？此操作可撤销。')) {
      nodeManager.clearAll();
      connectorManager.clearAll();
      render();
    }
  });
  toolbar.appendChild(undoBtn);
  toolbar.appendChild(redoBtn);
  toolbar.appendChild(clearBtn);

  const userCount = document.createElement('div');
  userCount.style.display = 'flex';
  userCount.style.alignItems = 'center';
  userCount.style.gap = '6px';
  userCount.style.marginLeft = '16px';
  userCount.style.marginRight = '8px';

  const dot = document.createElement('span');
  dot.style.width = '8px';
  dot.style.height = '8px';
  dot.style.borderRadius = '50%';
  dot.style.backgroundColor = '#2ECC71';
  dot.style.boxShadow = '0 0 6px #2ECC71';
  const num = document.createElement('span');
  num.textContent = '1';
  num.style.fontSize = '14px';
  num.style.fontWeight = '500';
  userCount.appendChild(dot);
  userCount.appendChild(num);
  toolbar.appendChild(userCount);

  navbar.appendChild(toolbar);
  root.appendChild(navbar);

  const canvasContainer = document.createElement('div');
  canvasContainer.style.position = 'fixed';
  canvasContainer.style.top = `${NAV_HEIGHT}px`;
  canvasContainer.style.left = '0';
  canvasContainer.style.right = '0';
  canvasContainer.style.bottom = '0';
  canvasContainer.style.overflow = 'hidden';
  canvasContainer.style.backgroundColor = '#F8F9FA';
  canvasContainer.style.cursor = 'default';
  root.appendChild(canvasContainer);

  canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvasContainer.appendChild(canvas);
  ctx = canvas.getContext('2d')!;

  nodeContainer = document.createElement('div');
  nodeContainer.style.position = 'absolute';
  nodeContainer.style.top = '0';
  nodeContainer.style.left = '0';
  nodeContainer.style.width = '100%';
  nodeContainer.style.height = '100%';
  nodeContainer.style.pointerEvents = 'none';
  canvasContainer.appendChild(nodeContainer);

  const minimapWrap = document.createElement('div');
  minimapWrap.id = 'minimap-wrap';
  minimapWrap.style.position = 'absolute';
  minimapWrap.style.left = '16px';
  minimapWrap.style.bottom = '16px';
  minimapWrap.style.width = `${MINIMAP_WIDTH}px`;
  minimapWrap.style.height = `${MINIMAP_HEIGHT}px`;
  minimapWrap.style.backgroundColor = '#F0F0F0';
  minimapWrap.style.opacity = '0.7';
  minimapWrap.style.borderRadius = '6px';
  minimapWrap.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  minimapWrap.style.overflow = 'hidden';
  minimapWrap.style.cursor = 'grab';
  canvasContainer.appendChild(minimapWrap);

  minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = MINIMAP_WIDTH;
  minimapCanvas.height = MINIMAP_HEIGHT;
  minimapCanvas.style.display = 'block';
  minimapWrap.appendChild(minimapCanvas);
  minimapCtx = minimapCanvas.getContext('2d')!;

  let isMinimapDragging = false;
  minimapWrap.addEventListener('mousedown', (e) => {
    isMinimapDragging = true;
    minimapWrap.style.cursor = 'grabbing';
    updateViewportFromMinimap(e);
  });
  document.addEventListener('mousemove', (e) => {
    if (isMinimapDragging) updateViewportFromMinimap(e);
  });
  document.addEventListener('mouseup', () => {
    isMinimapDragging = false;
    minimapWrap.style.cursor = 'grab';
  });

  const zoomControl = document.createElement('div');
  zoomControl.style.position = 'absolute';
  zoomControl.style.right = '16px';
  zoomControl.style.bottom = '16px';
  zoomControl.style.display = 'flex';
  zoomControl.style.alignItems = 'center';
  zoomControl.style.gap = '8px';
  zoomControl.style.backgroundColor = '#fff';
  zoomControl.style.padding = '6px 10px';
  zoomControl.style.borderRadius = '6px';
  zoomControl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  canvasContainer.appendChild(zoomControl);

  const zoomOut = document.createElement('button');
  zoomOut.textContent = '−';
  zoomOut.style.width = '28px';
  zoomOut.style.height = '28px';
  zoomOut.style.border = 'none';
  zoomOut.style.borderRadius = '4px';
  zoomOut.style.background = 'transparent';
  zoomOut.style.cursor = 'pointer';
  zoomOut.style.fontSize = '18px';
  zoomOut.style.color = '#333';
  zoomOut.addEventListener('mouseenter', () => { zoomOut.style.background = '#f0f0f0'; });
  zoomOut.addEventListener('mouseleave', () => { zoomOut.style.background = 'transparent'; });
  zoomOut.addEventListener('click', () => zoomBy(-SCALE_STEP));

  const zoomLabel = document.createElement('span');
  zoomLabel.id = 'zoom-label';
  zoomLabel.textContent = '100%';
  zoomLabel.style.fontSize = '13px';
  zoomLabel.style.color = '#333';
  zoomLabel.style.minWidth = '45px';
  zoomLabel.style.textAlign = 'center';

  const zoomIn = document.createElement('button');
  zoomIn.textContent = '+';
  zoomIn.style.width = '28px';
  zoomIn.style.height = '28px';
  zoomIn.style.border = 'none';
  zoomIn.style.borderRadius = '4px';
  zoomIn.style.background = 'transparent';
  zoomIn.style.cursor = 'pointer';
  zoomIn.style.fontSize = '18px';
  zoomIn.style.color = '#333';
  zoomIn.addEventListener('mouseenter', () => { zoomIn.style.background = '#f0f0f0'; });
  zoomIn.addEventListener('mouseleave', () => { zoomIn.style.background = 'transparent'; });
  zoomIn.addEventListener('click', () => zoomBy(SCALE_STEP));

  zoomControl.appendChild(zoomOut);
  zoomControl.appendChild(zoomLabel);
  zoomControl.appendChild(zoomIn);

  return canvasContainer;
}

function updateViewportFromMinimap(e: MouseEvent) {
  const rect = minimapCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / rect.width;
  const my = (e.clientY - rect.top) / rect.height;
  const bounds = getWorldBounds();
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  const cw = canvas.width / viewportScale;
  const ch = canvas.height / viewportScale;
  viewportOffset.x = -(bounds.minX + mx * worldW - cw / 2) * viewportScale;
  viewportOffset.y = -(bounds.minY + my * worldH - ch / 2) * viewportScale;
  updateViewport();
  render();
}

function zoomBy(delta: number) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const worldX = (centerX - viewportOffset.x) / viewportScale;
  const worldY = (centerY - viewportOffset.y) / viewportScale;
  let newScale = viewportScale + delta;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  newScale = Math.round(newScale / SCALE_STEP) * SCALE_STEP;
  viewportScale = newScale;
  viewportOffset.x = centerX - worldX * viewportScale;
  viewportOffset.y = centerY - worldY * viewportScale;
  updateViewport();
  updateZoomLabel();
  render();
}

function updateZoomLabel() {
  const label = document.getElementById('zoom-label');
  if (label) label.textContent = `${Math.round(viewportScale * 100)}%`;
}

function updateViewport() {
  nodeManager.setViewport(viewportOffset, viewportScale);
  connectorManager.setViewport(viewportOffset, viewportScale);
}

function getWorldBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const nodes = nodeManager.getNodes();
  if (nodes.length === 0) {
    return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
  }
  for (const n of nodes) {
    const { width, height } = nodeManager.getNodeSize(n.shape);
    const w = width * n.scale;
    const h = height * n.scale;
    minX = Math.min(minX, n.x - w / 2);
    minY = Math.min(minY, n.y - h / 2);
    maxX = Math.max(maxX, n.x + w / 2);
    maxY = Math.max(maxY, n.y + h / 2);
  }
  const pad = 100;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  return { minX, minY, maxX, maxY };
}

function drawGrid() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 0.5;

  const startX = -((-viewportOffset.x) % (GRID_SIZE * viewportScale));
  const startY = -((-viewportOffset.y) % (GRID_SIZE * viewportScale));
  const step = GRID_SIZE * viewportScale;

  for (let x = startX; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
    ctx.stroke();
  }
  for (let y = startY; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMinimap() {
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  minimapCtx.fillStyle = '#F0F0F0';
  minimapCtx.fillRect(0, 0, w, h);

  const bounds = getWorldBounds();
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  const scale = Math.min(w / worldW, h / worldH) * 0.9;
  const offsetX = (w - worldW * scale) / 2 - bounds.minX * scale;
  const offsetY = (h - worldH * scale) / 2 - bounds.minY * scale;

  connectorManager.drawMinimap(minimapCtx, scale, offsetX, offsetY);

  for (const n of nodeManager.getNodes()) {
    const { width, height } = nodeManager.getNodeSize(n.shape);
    const nw = width * n.scale * scale;
    const nh = height * n.scale * scale;
    const nx = n.x * scale + offsetX - nw / 2;
    const ny = n.y * scale + offsetY - nh / 2;
    minimapCtx.fillStyle = n.color;
    minimapCtx.fillRect(nx, ny, nw, nh);
  }

  const cw = canvas.width / viewportScale * scale;
  const ch = canvas.height / viewportScale * scale;
  const cx = (-viewportOffset.x / viewportScale) * scale + offsetX;
  const cy = (-viewportOffset.y / viewportScale) * scale + offsetY;
  minimapCtx.strokeStyle = '#2ECC71';
  minimapCtx.lineWidth = 2;
  minimapCtx.strokeRect(cx, cy, cw, ch);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  connectorManager.draw();
  drawMinimap();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;
  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.width = displayW;
  canvas.height = displayH;
  render();
}

function requestSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveData();
  }, 1000);
}

async function saveData() {
  const data = {
    nodes: nodeManager.getNodes(),
    connectors: connectorManager.getConnectors()
  };
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn('保存失败:', e);
  }
}

async function loadData() {
  try {
    const res = await fetch('/api/load');
    const json = await res.json();
    if (json.success && json.data) {
      nodeManager.loadNodes(json.data.nodes || []);
      connectorManager.loadConnectors(json.data.connectors || []);
    }
  } catch (e) {
    console.warn('加载失败:', e);
  }
}

function init() {
  createUI();

  nodeManager = new NodeManager(
    nodeContainer,
    () => render(),
    () => {},
    () => render(),
    requestSave
  );
  connectorManager = new ConnectorManager(
    canvas,
    nodeManager,
    () => render(),
    () => {},
    requestSave
  );

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  updateZoomLabel();

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (connectorManager.handleMouseDown(e.clientX, e.clientY - NAV_HEIGHT)) {
      render();
      return;
    }
    nodeManager.setSelectedNode(null);
    connectorManager.setSelectedConnector(null);
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    viewportStart = { ...viewportOffset };
    canvas.style.cursor = 'grabbing';
    render();
  });

  document.addEventListener('mousemove', (e) => {
    const canvasY = e.clientY - NAV_HEIGHT;
    if (isPanning) {
      viewportOffset.x = viewportStart.x + (e.clientX - panStart.x);
      viewportOffset.y = viewportStart.y + (e.clientY - panStart.y);
      updateViewport();
      render();
      return;
    }
    if (e.clientY >= NAV_HEIGHT) {
      if (connectorManager.handleMouseMove(e.clientX, canvasY)) {
        render();
      }
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'default';
    }
    const canvasY = e.clientY - NAV_HEIGHT;
    if (e.clientY >= NAV_HEIGHT) {
      if (connectorManager.handleMouseUp(e.clientX, canvasY)) {
        render();
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    const worldX = (e.clientX - viewportOffset.x) / viewportScale;
    const worldY = (e.clientY - NAV_HEIGHT - viewportOffset.y) / viewportScale;
    let newScale = viewportScale + delta;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    newScale = Math.round(newScale / SCALE_STEP) * SCALE_STEP;
    viewportScale = newScale;
    viewportOffset.x = e.clientX - worldX * viewportScale;
    viewportOffset.y = e.clientY - NAV_HEIGHT - worldY * viewportScale;
    updateViewport();
    updateZoomLabel();
    render();
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      nodeManager.undo();
      connectorManager.undo();
      render();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      nodeManager.redo();
      connectorManager.redo();
      render();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (connectorManager.deleteSelected()) {
        render();
        return;
      }
      const selNode = nodeManager.getSelectedNodeId();
      if (selNode) {
        connectorManager.deleteConnectorsByNode(selNode);
        nodeManager.deleteNode(selNode);
        render();
      }
    }
  });

  loadData().then(() => {
    if (nodeManager.getNodes().length === 0) {
      const centerX = (window.innerWidth / 2 - viewportOffset.x) / viewportScale;
      const centerY = ((window.innerHeight - NAV_HEIGHT) / 2 - viewportOffset.y) / viewportScale;
      nodeManager.createNode('rectangle', centerX - 200, centerY);
      nodeManager.createNode('circle', centerX, centerY - 100);
      nodeManager.createNode('diamond', centerX + 200, centerY);
    }
    render();
  });

  let lastTime = performance.now();
  function loop() {
    const now = performance.now();
    if (now - lastTime >= 1000 / 60) {
      lastTime = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
