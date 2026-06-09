import { CollaborationManager, type Player, type RoomState } from './collab';
import {
  calculateStyleMatch,
  generateNarrative,
  type Point,
  type Stroke,
} from './evaluator';

const PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#FF8C69',
];
const TURN_SECONDS = 15;

type ToolType = 'freehand' | 'line' | 'curve' | 'polygon';

interface AppState {
  myPlayerId: string | null;
  roomCode: string | null;
  nickname: string;
  roomState: RoomState | null;
  currentTool: ToolType;
  currentColor: string;
  currentWidth: number;
  zoom: number;
  panX: number;
  panY: number;
  isDrawing: boolean;
  currentPoints: Point[];
  polygonPoints: Point[];
  strokes: Stroke[];
  turnTimer: number;
  timerInterval: number | null;
  canvasWidth: number;
  canvasHeight: number;
}

const state: AppState = {
  myPlayerId: null,
  roomCode: null,
  nickname: '匿名玩家',
  roomState: null,
  currentTool: 'freehand',
  currentColor: PALETTE[0],
  currentWidth: 3,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDrawing: false,
  currentPoints: [],
  polygonPoints: [],
  strokes: [],
  turnTimer: TURN_SECONDS,
  timerInterval: null,
  canvasWidth: 0,
  canvasHeight: 0,
};

const els: Record<string, HTMLElement | null> = {};
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let collab: CollaborationManager | null = null;
let rafId = 0;
let lastFrameTime = 0;
let collabReady = false;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function screenToWorld(sx: number, sy: number): Point {
  const rect = canvas!.getBoundingClientRect();
  const x = (sx - rect.left - state.panX) / state.zoom;
  const y = (sy - rect.top - state.panY) / state.zoom;
  return { x, y };
}

function resizeCanvas(): void {
  if (!canvas) return;
  const wrapper = canvas.parentElement!;
  const dpr = window.devicePixelRatio || 1;
  state.canvasWidth = wrapper.clientWidth;
  state.canvasHeight = wrapper.clientHeight;
  canvas.width = state.canvasWidth * dpr;
  canvas.height = state.canvasHeight * dpr;
  canvas.style.width = `${state.canvasWidth}px`;
  canvas.style.height = `${state.canvasHeight}px`;
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scheduleRender();
}

function drawGrid(): void {
  if (!ctx) return;
  const gridSize = 50 * state.zoom;
  const offsetX = state.panX % gridSize;
  const offsetY = state.panY % gridSize;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = offsetX; x < state.canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.canvasHeight);
    ctx.stroke();
  }
  for (let y = offsetY; y < state.canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.canvasWidth, y);
    ctx.stroke();
  }
  ctx.restore();
}

function strokePath(points: Point[]): void {
  if (!ctx || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(
    points[0].x * state.zoom + state.panX,
    points[0].y * state.zoom + state.panY
  );
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(
      points[i].x * state.zoom + state.panX,
      points[i].y * state.zoom + state.panY
    );
  }
}

function drawStroke(stroke: Stroke, alpha = 1): void {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width * state.zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (stroke.type) {
    case 'freehand':
    case 'line':
    case 'curve': {
      strokePath(stroke.points);
      ctx.stroke();
      break;
    }
    case 'polygon': {
      if (stroke.points.length >= 3) {
        strokePath(stroke.points);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

function drawPreview(): void {
  if (!ctx || !state.isDrawing) return;
  if (state.currentPoints.length === 0 && state.polygonPoints.length === 0) return;

  ctx.save();
  ctx.strokeStyle = state.currentColor;
  ctx.fillStyle = state.currentColor + '80';
  ctx.lineWidth = state.currentWidth * state.zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (state.currentTool === 'polygon') {
    const allPoints = [...state.polygonPoints, ...state.currentPoints];
    if (allPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(
        allPoints[0].x * state.zoom + state.panX,
        allPoints[0].y * state.zoom + state.panY
      );
      for (let i = 1; i < allPoints.length; i++) {
        ctx.lineTo(
          allPoints[i].x * state.zoom + state.panX,
          allPoints[i].y * state.zoom + state.panY
        );
      }
      ctx.stroke();
    }
  } else if (state.currentTool === 'curve' && state.currentPoints.length >= 2) {
    const pts = state.currentPoints;
    ctx.beginPath();
    ctx.moveTo(
      pts[0].x * state.zoom + state.panX,
      pts[0].y * state.zoom + state.panY
    );
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(
        pts[i].x * state.zoom + state.panX,
        pts[i].y * state.zoom + state.panY,
        xc * state.zoom + state.panX,
        yc * state.zoom + state.panY
      );
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x * state.zoom + state.panX, last.y * state.zoom + state.panY);
    ctx.stroke();
  } else {
    strokePath(state.currentPoints);
    ctx.stroke();
  }
  ctx.restore();
}

function render(timestamp: number): void {
  if (!ctx || !canvas) return;
  const delta = timestamp - lastFrameTime;
  if (delta < 16) {
    rafId = requestAnimationFrame(render);
    return;
  }
  lastFrameTime = timestamp;
  ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
  drawGrid();
  for (const s of state.strokes) {
    drawStroke(s);
  }
  drawPreview();
  rafId = requestAnimationFrame(render);
}

function scheduleRender(): void {
  if (rafId) cancelAnimationFrame(rafId);
  lastFrameTime = 0;
  rafId = requestAnimationFrame(render);
}

function isMyTurn(): boolean {
  if (!state.roomState || !state.myPlayerId) return false;
  if (!state.roomState.gameStarted) return false;
  const current = state.roomState.players[state.roomState.currentPlayerIndex];
  return !!current && current.id === state.myPlayerId;
}

function getCurrentPlayer(): Player | null {
  if (!state.roomState) return null;
  return state.roomState.players[state.roomState.currentPlayerIndex] || null;
}

function startTimer(): void {
  stopTimer();
  state.turnTimer = TURN_SECONDS;
  updateTimerDisplay();
  state.timerInterval = window.setInterval(() => {
    state.turnTimer--;
    updateTimerDisplay();
    if (state.turnTimer <= 0) {
      stopTimer();
      if (isMyTurn() && collab) {
        addChatMessage('system', '你的回合已超时，自动跳过。');
        collab.skipTurn();
      }
    }
  }, 1000);
}

function stopTimer(): void {
  if (state.timerInterval !== null) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay(): void {
  const el = els.timerDisplay as HTMLElement | null;
  if (el) el.textContent = String(state.turnTimer);
}

function showScoreBubble(score: number): void {
  const bubble = els.scoreBubble as HTMLElement | null;
  if (!bubble) return;
  bubble.classList.remove('show');
  void bubble.offsetWidth;
  const tier = score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low';
  bubble.innerHTML = `<span class="score-label">风格匹配度</span><span class="score-value ${tier}">${score}</span>`;
  bubble.classList.add('show');
  setTimeout(() => {
    bubble.classList.remove('show');
  }, 2000);
}

function addChatMessage(kind: 'system' | 'narrative', text: string): void {
  const container = els.chatMessages as HTMLElement | null;
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = `chat-msg ${kind}`;
  const tag = kind === 'system' ? '系统' : '叙事';
  msg.innerHTML = `<span class="msg-tag">${tag}</span>${text}`;
  container.appendChild(msg);
  setTimeout(() => {
    if (msg.parentNode === container) {
      container.removeChild(msg);
    }
  }, 8000);
}

function buildPalette(): void {
  const palette = els.palette as HTMLElement | null;
  if (!palette) return;
  palette.innerHTML = '';
  for (const color of PALETTE) {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (color === state.currentColor ? ' active' : '');
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      state.currentColor = color;
      for (const child of palette.children) {
        child.classList.remove('active');
      }
      swatch.classList.add('active');
    });
    palette.appendChild(swatch);
  }
}

function renderPlayers(): void {
  const grid = els.playersGrid as HTMLElement | null;
  if (!grid || !state.roomState) return;
  grid.innerHTML = '';
  for (let i = 0; i < state.roomState.players.length; i++) {
    const p = state.roomState.players[i];
    const card = document.createElement('div');
    const classes = ['player-card'];
    if (state.roomState.currentPlayerIndex === i && state.roomState.gameStarted) {
      classes.push('active');
    }
    if (p.id === state.myPlayerId) {
      classes.push('you');
    }
    card.className = classes.join(' ');
    card.innerHTML = `
      <div class="player-name">${p.nickname}${p.id === state.myPlayerId ? ' (你)' : ''}</div>
      <div class="player-stats">
        <div>得分 <strong>${p.score}</strong></div>
        <div>笔触 <strong>${p.strokeCount}</strong></div>
      </div>
    `;
    grid.appendChild(card);
  }
  for (let i = state.roomState.players.length; i < 4; i++) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.opacity = '0.4';
    card.innerHTML = `
      <div class="player-name" style="color: var(--text-secondary)">空位 ${i + 1}</div>
      <div class="player-stats"><div>&nbsp;</div><div>&nbsp;</div></div>
    `;
    grid.appendChild(card);
  }
}

function updateTurnIndicator(): void {
  const indicator = els.turnIndicator as HTMLElement | null;
  const nickEl = els.turnNickname as HTMLElement | null;
  if (!indicator || !nickEl) return;
  if (!state.roomState || !state.roomState.gameStarted) {
    indicator.classList.add('hidden');
    return;
  }
  const current = getCurrentPlayer();
  if (current) {
    nickEl.textContent = current.id === state.myPlayerId ? `${current.nickname}（你的回合）` : current.nickname;
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

function updateStartButton(): void {
  const btn = els.startGameBtn as HTMLButtonElement | null;
  if (!btn || !state.roomState) return;
  const host = state.roomState.players[0];
  const isHost = host && host.id === state.myPlayerId;
  btn.disabled = !isHost || state.roomState.gameStarted || state.roomState.players.length < 1;
  btn.textContent = state.roomState.gameStarted ? '游戏进行中' : '开始游戏';
}

function updateZoomDisplay(): void {
  const el = els.zoomDisplay as HTMLElement | null;
  if (el) el.textContent = `${Math.round(state.zoom * 100)}%`;
}

function submitCurrentStroke(): void {
  if (!collab || !isMyTurn()) return;
  let points: Point[] = [];
  if (state.currentTool === 'polygon') {
    points = state.polygonPoints.slice();
    if (points.length < 3) return;
  } else {
    points = state.currentPoints.slice();
    if (points.length < 2) return;
  }

  const newStroke: Stroke = {
    id: '',
    playerId: state.myPlayerId!,
    type: state.currentTool,
    color: state.currentColor,
    width: state.currentWidth,
    points,
    timestamp: Date.now(),
  };

  const prevStroke = state.strokes.length > 0 ? state.strokes[state.strokes.length - 1] : null;
  const score = calculateStyleMatch(prevStroke, newStroke);
  const narrative = generateNarrative(state.strokes.length, score, state.nickname);

  showScoreBubble(score);
  collab.submitStroke(state.currentTool, state.currentColor, state.currentWidth, points, score);
  collab.sendNarrative(narrative);

  state.currentPoints = [];
  state.polygonPoints = [];
  state.isDrawing = false;
}

function handlePointerDown(e: PointerEvent): void {
  if (!isMyTurn()) return;
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  canvas!.setPointerCapture(e.pointerId);
  const p = screenToWorld(e.clientX, e.clientY);

  if (state.currentTool === 'polygon') {
    state.polygonPoints.push(p);
    state.currentPoints = [p];
    state.isDrawing = true;
  } else {
    state.isDrawing = true;
    state.currentPoints = [p];
  }
}

function handlePointerMove(e: PointerEvent): void {
  if (!state.isDrawing) return;
  const p = screenToWorld(e.clientX, e.clientY);
  state.currentPoints.push(p);
}

function handlePointerUp(e: PointerEvent): void {
  if (!state.isDrawing) return;
  try { canvas!.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  if (state.currentTool === 'polygon') {
    state.isDrawing = false;
    state.currentPoints = [];
  } else {
    const p = screenToWorld(e.clientX, e.clientY);
    if (state.currentPoints.length > 0) {
      const last = state.currentPoints[state.currentPoints.length - 1];
      if (Math.hypot(last.x - p.x, last.y - p.y) > 1) {
        state.currentPoints.push(p);
      }
    }
    state.isDrawing = false;
    submitCurrentStroke();
  }
}

function handleDblClick(): void {
  if (state.currentTool === 'polygon' && state.polygonPoints.length >= 3) {
    submitCurrentStroke();
  }
}

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const oldZoom = state.zoom;
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.5, Math.min(5, state.zoom * delta));
  const rect = canvas!.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const wx = (mx - state.panX) / oldZoom;
  const wy = (my - state.panY) / oldZoom;
  state.zoom = newZoom;
  state.panX = mx - wx * newZoom;
  state.panY = my - wy * newZoom;
  updateZoomDisplay();
  scheduleRender();
}

function handleMiddleDown(e: PointerEvent): void {
  if (e.button !== 1) return;
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panStartPanX = state.panX;
  panStartPanY = state.panY;
  canvas!.setPointerCapture(e.pointerId);
  canvas!.style.cursor = 'grabbing';
}

function handleMiddleMove(e: PointerEvent): void {
  if (!isPanning) return;
  state.panX = panStartPanX + (e.clientX - panStartX);
  state.panY = panStartPanY + (e.clientY - panStartY);
  scheduleRender();
}

function handleMiddleUp(e: PointerEvent): void {
  if (!isPanning) return;
  isPanning = false;
  try { canvas!.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  canvas!.style.cursor = isMyTurn() ? 'crosshair' : 'default';
}

function handleCanvasPointerDown(e: PointerEvent): void {
  if (e.button === 1) {
    handleMiddleDown(e);
    return;
  }
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    handleMiddleDown({ ...e, button: 1, clientX: e.clientX, clientY: e.clientY } as PointerEvent);
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartPanX = state.panX;
    panStartPanY = state.panY;
    canvas!.setPointerCapture(e.pointerId);
    return;
  }
  handlePointerDown(e);
}

function handleCanvasPointerMove(e: PointerEvent): void {
  if (isPanning) {
    handleMiddleMove(e);
    return;
  }
  handlePointerMove(e);
}

function handleCanvasPointerUp(e: PointerEvent): void {
  if (isPanning) {
    handleMiddleUp(e);
    return;
  }
  handlePointerUp(e);
}

function initCollab(): void {
  collab = new CollaborationManager({
    onConnected: () => {
      addChatMessage('system', '已连接到服务器。');
    },
    onDisconnected: () => {
      addChatMessage('system', '与服务器断开连接。');
    },
    onRoomJoined: ({ roomCode, playerId, state: s }) => {
      state.roomCode = roomCode;
      state.myPlayerId = playerId;
      state.roomState = s;
      state.strokes = s.strokes.slice();
      (els.roomCodeDisplay as HTMLElement).textContent = roomCode;
      (els.lobby as HTMLElement).classList.add('hidden');
      (els.gameRoot as HTMLElement).classList.remove('hidden');
      resizeCanvas();
      renderPlayers();
      updateTurnIndicator();
      updateStartButton();
      addChatMessage('system', `已加入房间 ${roomCode}`);
      scheduleRender();
    },
    onStateUpdate: (s) => {
      state.roomState = s;
      state.strokes = s.strokes.slice();
      renderPlayers();
      updateTurnIndicator();
      updateStartButton();
      if (s.gameStarted && getCurrentPlayer()) {
        startTimer();
      } else {
        stopTimer();
      }
      scheduleRender();
    },
    onStrokeReceived: ({ stroke: _stroke, score, playerId, nextPlayerId }) => {
      if (playerId !== state.myPlayerId) {
        showScoreBubble(score);
      }
      state.strokes = state.roomState ? state.roomState.strokes.slice() : state.strokes;
      startTimer();
      scheduleRender();
      void _stroke;
      void nextPlayerId;
    },
    onTurnSkipped: ({ playerId }) => {
      const name = state.roomState?.players.find(p => p.id === playerId)?.nickname || '某玩家';
      addChatMessage('system', `${name} 跳过了回合。`);
      startTimer();
    },
    onNarrative: ({ text }) => {
      addChatMessage('narrative', text);
    },
    onError: (message) => {
      const errEl = els.errorMsg as HTMLElement | null;
      if (errEl) errEl.textContent = message;
    },
  });
}

async function ensureConnected(): Promise<boolean> {
  if (collabReady) return true;
  if (!collab) return false;
  try {
    await collab.connect();
    collabReady = true;
    return true;
  } catch {
    (els.errorMsg as HTMLElement).textContent = '无法连接服务器，请稍后重试。';
    return false;
  }
}

function bindUI(): void {
  (els.createRoomBtn as HTMLButtonElement).addEventListener('click', async () => {
    const nickname = (els.nickname as HTMLInputElement).value.trim() || '匿名玩家';
    state.nickname = nickname;
    if (!(await ensureConnected())) return;
    collab!.createRoom(nickname);
  });

  (els.joinRoomBtn as HTMLButtonElement).addEventListener('click', async () => {
    const code = (els.roomCodeInput as HTMLInputElement).value.trim();
    const nickname = (els.nickname as HTMLInputElement).value.trim() || '匿名玩家';
    state.nickname = nickname;
    if (!/^\d{6}$/.test(code)) {
      (els.errorMsg as HTMLElement).textContent = '请输入 6 位数字房间号。';
      return;
    }
    (els.errorMsg as HTMLElement).textContent = '';
    if (!(await ensureConnected())) return;
    collab!.joinRoom(code, nickname);
  });

  (els.copyRoomBtn as HTMLButtonElement).addEventListener('click', () => {
    if (state.roomCode) {
      navigator.clipboard.writeText(state.roomCode).catch(() => {});
    }
  });

  (els.startGameBtn as HTMLButtonElement).addEventListener('click', () => {
    if (collab) collab.startGame();
  });

  (els.leaveRoomBtn as HTMLButtonElement).addEventListener('click', () => {
    if (collab) collab.leaveRoom();
    stopTimer();
    state.roomState = null;
    state.myPlayerId = null;
    state.roomCode = null;
    state.strokes = [];
    (els.gameRoot as HTMLElement).classList.add('hidden');
    (els.lobby as HTMLElement).classList.remove('hidden');
  });

  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTool = (btn as HTMLElement).dataset.tool as ToolType;
      state.currentPoints = [];
      state.polygonPoints = [];
      state.isDrawing = false;
    });
  });

  (els.widthSlider as HTMLInputElement).addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    state.currentWidth = val;
    (els.widthValue as HTMLElement).textContent = String(val);
  });

  (els.zoomInBtn as HTMLButtonElement).addEventListener('click', () => {
    state.zoom = Math.min(5, state.zoom * 1.2);
    updateZoomDisplay();
    scheduleRender();
  });
  (els.zoomOutBtn as HTMLButtonElement).addEventListener('click', () => {
    state.zoom = Math.max(0.5, state.zoom / 1.2);
    updateZoomDisplay();
    scheduleRender();
  });
  (els.resetViewBtn as HTMLButtonElement).addEventListener('click', () => {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    updateZoomDisplay();
    scheduleRender();
  });
}

async function main(): Promise<void> {
  els.lobby = $('lobby');
  els.gameRoot = $('gameRoot');
  els.nickname = $('nickname');
  els.createRoomBtn = $('createRoomBtn');
  els.joinRoomBtn = $('joinRoomBtn');
  els.roomCodeInput = $('roomCodeInput');
  els.errorMsg = $('errorMsg');
  els.roomCodeDisplay = $('roomCodeDisplay');
  els.copyRoomBtn = $('copyRoomBtn');
  els.playersGrid = $('playersGrid');
  els.timerDisplay = $('timerDisplay');
  els.startGameBtn = $('startGameBtn');
  els.leaveRoomBtn = $('leaveRoomBtn');
  els.turnIndicator = $('turnIndicator');
  els.turnNickname = $('turnNickname');
  els.scoreBubble = $('scoreBubble');
  els.palette = $('palette');
  els.widthSlider = $('widthSlider');
  els.widthValue = $('widthValue');
  els.zoomInBtn = $('zoomInBtn');
  els.zoomOutBtn = $('zoomOutBtn');
  els.zoomDisplay = $('zoomDisplay');
  els.resetViewBtn = $('resetViewBtn');
  els.chatMessages = $('chatMessages');

  canvas = $('drawingCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  if (!ctx) return;

  buildPalette();
  initCollab();
  bindUI();

  canvas.addEventListener('pointerdown', handleCanvasPointerDown);
  canvas.addEventListener('pointermove', handleCanvasPointerMove);
  canvas.addEventListener('pointerup', handleCanvasPointerUp);
  canvas.addEventListener('pointercancel', handleCanvasPointerUp);
  canvas.addEventListener('dblclick', handleDblClick);
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  resizeCanvas();
  updateZoomDisplay();
  scheduleRender();
}

main().catch(console.error);
