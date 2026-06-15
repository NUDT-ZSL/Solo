import {
  Point,
  Stroke,
  StickyNote,
  User,
  ToolMode,
  HistoryEntry,
  ServerMessage,
  ClientMessage
} from './types.js';

const COLORS = [
  '#FF5252', '#FF7043', '#FFD54F', '#66BB6A',
  '#42A5F5', '#AB47BC', '#EC407A', '#424242'
];

const GRID_SIZE = 50;
const GRID_COLOR = '#e0dcd7';
const NOTE_BG = '#FFF9C4';
const NOTE_BORDER = '#F0E68C';
const TEXT_COLOR = '#333';
const TEXT_MAX_LEN = 80;
const NOTE_W = 180;
const NOTE_H = 150;
const MAX_HISTORY = 50;

const state = {
  ws: null as WebSocket | null,
  userId: '',
  userColor: COLORS[0],
  roomCode: '',
  users: new Map<string, User>(),
  strokes: new Map<string, Stroke>(),
  notes: new Map<string, StickyNote>(),
  tempStrokes: new Map<string, { color: string; userId: string; points: Point[] }>(),
  mode: 'brush' as ToolMode,
  currentColor: COLORS[0],
  isDrawing: false,
  currentStrokeId: '',
  lastPoint: null as Point | null,
  selectedNoteId: null as string | null,
  editingNoteId: null as string | null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  dragGhost: null as { x: number; y: number } | null,
  deletingItems: new Map<string, { type: 'stroke' | 'note'; startTime: number; duration: number; data: Stroke | StickyNote }>(),
  appearingNotes: new Map<string, { startTime: number }>(),
  history: [] as HistoryEntry[],
  camera: { x: 0, y: 0, scale: 1 },
  lastCursorPos: { x: 0, y: 0 } as Point,
  lastCursorSend: 0
};

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const canvasContainer = document.querySelector('.canvas-container')!;

let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvasContainer.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function screenToWorld(sx: number, sy: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (sx - rect.left) / state.camera.scale - state.camera.x,
    y: (sy - rect.top) / state.camera.scale - state.camera.y
  };
}

function send(msg: ClientMessage) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(msg));
  }
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//localhost:8080`;
  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    updateStatus(true, '已连接');
    const params = new URLSearchParams(location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      send({ type: 'join', roomCode: roomFromUrl });
    } else {
      send({ type: 'createRoom' });
    }
  };

  state.ws.onclose = () => {
    updateStatus(false, '已断开');
  };

  state.ws.onerror = () => {
    updateStatus(false, '连接失败');
  };

  state.ws.onmessage = (e) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    handleServerMessage(msg);
  };
}

function updateStatus(connected: boolean, text: string) {
  const indicator = document.getElementById('statusIndicator')!;
  const statusText = document.getElementById('statusText')!;
  indicator.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
  statusText.textContent = text;
}

function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case 'init': {
      state.userId = msg.userId;
      state.userColor = msg.userColor;
      state.currentColor = msg.userColor;
      state.roomCode = msg.state.roomCode;
      state.strokes = new Map(msg.state.strokes.map(s => [s.id, s]));
      state.notes = new Map(msg.state.notes.map(n => [n.id, n]));
      state.users = new Map(msg.state.users.map(u => [u.id, u]));
      document.getElementById('roomCode')!.textContent = state.roomCode;
      if (!location.search.includes('room=')) {
        history.replaceState(null, '', `?room=${state.roomCode}`);
      }
      updateColorSelection();
      break;
    }
    case 'userJoin': {
      state.users.set(msg.user.id, msg.user);
      updateRemoteCursors();
      break;
    }
    case 'userLeave': {
      state.users.delete(msg.userId);
      state.tempStrokes.forEach((v, k) => {
        if (v.userId === msg.userId) state.tempStrokes.delete(k);
      });
      updateRemoteCursors();
      break;
    }
    case 'strokeSegment': {
      if (!state.tempStrokes.has(msg.strokeId)) {
        state.tempStrokes.set(msg.strokeId, {
          color: msg.color,
          userId: msg.userId,
          points: []
        });
      }
      state.tempStrokes.get(msg.strokeId)!.points.push(msg.point);
      break;
    }
    case 'strokeEnd': {
      const temp = state.tempStrokes.get(msg.strokeId);
      if (temp) {
        state.strokes.set(msg.strokeId, {
          id: msg.strokeId,
          points: temp.points,
          color: temp.color,
          userId: temp.userId,
          createdAt: Date.now()
        });
        state.tempStrokes.delete(msg.strokeId);
      }
      break;
    }
    case 'addNote': {
      state.notes.set(msg.note.id, msg.note);
      state.appearingNotes.set(msg.note.id, { startTime: performance.now() });
      break;
    }
    case 'updateNote': {
      state.notes.set(msg.note.id, msg.note);
      break;
    }
    case 'deleteItem': {
      handleRemoteDelete(msg.itemType, msg.id);
      break;
    }
    case 'cursorMove': {
      const user = state.users.get(msg.userId);
      if (user) {
        user.cursor = msg.point;
        updateRemoteCursors();
      }
      break;
    }
  }
}

function handleRemoteDelete(itemType: 'stroke' | 'note', id: string) {
  if (itemType === 'stroke') {
    const stroke = state.strokes.get(id);
    if (stroke) {
      state.deletingItems.set(id, {
        type: 'stroke',
        startTime: performance.now(),
        duration: 400,
        data: stroke
      });
      state.strokes.delete(id);
    }
  } else {
    const note = state.notes.get(id);
    if (note) {
      state.deletingItems.set(id, {
        type: 'note',
        startTime: performance.now(),
        duration: 200,
        data: note
      });
      state.notes.delete(id);
    }
  }
}

function pushHistory(entry: HistoryEntry) {
  state.history.push(entry);
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
}

function undo() {
  const entry = state.history.pop();
  if (!entry) return;

  if (entry.type === 'delete') {
    if (entry.itemType === 'stroke') {
      const stroke = entry.data as Stroke;
      state.strokes.set(stroke.id, stroke);
      send({ type: 'addStroke' as any, stroke });
    } else {
      const note = entry.data as StickyNote;
      state.notes.set(note.id, note);
      state.appearingNotes.set(note.id, { startTime: performance.now() });
      send({ type: 'addNote', note });
    }
  } else if (entry.type === 'add') {
    if (entry.itemType === 'stroke') {
      state.strokes.delete(entry.id);
    } else {
      state.notes.delete(entry.id);
    }
    send({ type: 'deleteItem', itemType: entry.itemType, id: entry.id });
  }
}

function deleteItem(itemType: 'stroke' | 'note', id: string) {
  let data: Stroke | StickyNote | undefined;
  if (itemType === 'stroke') {
    data = state.strokes.get(id);
    if (!data) return;
    state.deletingItems.set(id, { type: 'stroke', startTime: performance.now(), duration: 400, data });
    state.strokes.delete(id);
  } else {
    data = state.notes.get(id);
    if (!data) return;
    state.deletingItems.set(id, { type: 'note', startTime: performance.now(), duration: 200, data });
    state.notes.delete(id);
    state.selectedNoteId = null;
    state.editingNoteId = null;
  }

  pushHistory({ type: 'delete', itemType, id, data });
  send({ type: 'deleteItem', itemType, id });
}

function hitTestNote(p: Point): StickyNote | null {
  const notes = Array.from(state.notes.values()).reverse();
  for (const note of notes) {
    if (p.x >= note.x && p.x <= note.x + note.width &&
        p.y >= note.y && p.y <= note.y + note.height) {
      return note;
    }
  }
  return null;
}

function hitTestStroke(p: Point): Stroke | null {
  const threshold = 8;
  const strokes = Array.from(state.strokes.values()).reverse();
  for (const stroke of strokes) {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const a = stroke.points[i];
      const b = stroke.points[i + 1];
      const dist = pointToSegmentDistance(p, a, b);
      if (dist <= threshold) return stroke;
    }
  }
  return null;
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function drawGrid() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.scale(state.camera.scale, state.camera.scale);
  ctx.translate(state.camera.x, state.camera.y);

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5 / state.camera.scale;

  const startX = Math.floor(-state.camera.x / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(-state.camera.y / GRID_SIZE) * GRID_SIZE;
  const endX = startX + (w / state.camera.scale) + GRID_SIZE * 2;
  const endY = startY + (h / state.camera.scale) + GRID_SIZE * 2;

  ctx.beginPath();
  for (let x = startX; x < endX; x += GRID_SIZE) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y < endY; y += GRID_SIZE) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();

  ctx.restore();
}

function drawStroke(stroke: Stroke | { points: Point[]; color: string; userId: string }, alpha: number = 1, dissolveProgress: number = 0) {
  const points = stroke.points;
  if (points.length < 1) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const totalPoints = points.length;
  const visibleCount = Math.floor(totalPoints * (1 - dissolveProgress));

  if (visibleCount < 1) {
    ctx.restore();
    return;
  }

  const isMyStroke = stroke.userId === state.userId;
  const userColor = isMyStroke ? state.userColor : (state.users.get(stroke.userId)?.color || stroke.color);

  for (let i = 1; i < visibleCount; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1] || curr;

    let width = 3;
    if (prev.timestamp !== undefined && curr.timestamp !== undefined) {
      const dt = curr.timestamp - prev.timestamp;
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const speed = dt > 0 ? dist / dt : 0;
      width = 6 - Math.min(4, speed * 0.02);
    }

    const tailFactor = i > totalPoints - 8 ? (totalPoints - i) / 8 : 1;
    width *= tailFactor;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);

    const cpx = (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    ctx.stroke();

    if (!isMyStroke && dissolveProgress === 0) {
      ctx.strokeStyle = userColor + '40';
      ctx.lineWidth = width + 3;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawNote(note: StickyNote, alpha: number = 1, scale: number = 1) {
  const isMy = note.userId === state.userId;
  const userColor = isMy ? state.userColor : (state.users.get(note.userId)?.color || COLORS[0]);

  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = note.x + note.width / 2;
  const cy = note.y + note.height / 2;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  const r = 6;
  ctx.beginPath();
  ctx.moveTo(note.x + r, note.y);
  ctx.lineTo(note.x + note.width - r, note.y);
  ctx.quadraticCurveTo(note.x + note.width, note.y, note.x + note.width, note.y + r);
  ctx.lineTo(note.x + note.width, note.y + note.height - r);
  ctx.quadraticCurveTo(note.x + note.width, note.y + note.height, note.x + note.width - r, note.y + note.height);
  ctx.lineTo(note.x + r, note.y + note.height);
  ctx.quadraticCurveTo(note.x, note.y + note.height, note.x, note.y + note.height - r);
  ctx.lineTo(note.x, note.y + r);
  ctx.quadraticCurveTo(note.x, note.y, note.x + r, note.y);
  ctx.closePath();

  ctx.fillStyle = NOTE_BG;
  ctx.fill();

  if (!isMy) {
    ctx.strokeStyle = userColor + '60';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.strokeStyle = NOTE_BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (state.selectedNoteId === note.id) {
    ctx.strokeStyle = '#42A5F5';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(note.x - 2, note.y - 2, note.width + 4, note.height + 4);
    ctx.setLineDash([]);
  }

  if (note.text) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = note.width - 20;
    const lines = wrapText(note.text, maxWidth);
    const lineHeight = 22;
    const totalHeight = lines.length * lineHeight;
    const startY = note.y + note.height / 2 - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, note.x + note.width / 2, startY + i * lineHeight);
    });
  }

  ctx.restore();
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 5);
}

function draw() {
  const now = performance.now();
  drawGrid();

  ctx.save();
  ctx.scale(state.camera.scale, state.camera.scale);
  ctx.translate(state.camera.x, state.camera.y);

  for (const [id, stroke] of state.strokes) {
    drawStroke(stroke);
  }

  for (const [, temp] of state.tempStrokes) {
    drawStroke(temp);
  }

  for (const [id, note] of state.notes) {
    const app = state.appearingNotes.get(id);
    if (app) {
      const t = Math.min(1, (now - app.startTime) / 300);
      if (t >= 1) {
        state.appearingNotes.delete(id);
        drawNote(note);
      } else {
        drawNote(note, easeOutCubic(t), easeOutBack(t));
      }
    } else {
      drawNote(note);
    }
  }

  if (state.isDragging && state.selectedNoteId && state.dragGhost) {
    const note = state.notes.get(state.selectedNoteId);
    if (note) {
      const ghostNote = { ...note, x: state.dragGhost.x, y: state.dragGhost.y };
      drawNote(ghostNote, 0.5, 1);
    }
  }

  for (const [id, del] of state.deletingItems) {
    const t = Math.min(1, (now - del.startTime) / del.duration);
    if (t >= 1) {
      state.deletingItems.delete(id);
      continue;
    }

    if (del.type === 'note') {
      drawNote(del.data as StickyNote, 1 - t, 1 - t * 0.7);
    } else {
      drawStroke(del.data as Stroke, 1 - t, t);
    }
  }

  ctx.restore();

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function updateToolUI() {
  const btnSticky = document.getElementById('btnSticky')!;
  const btnBrush = document.getElementById('btnBrush')!;
  const btnDelete = document.getElementById('btnDelete')!;

  btnSticky.classList.toggle('active', state.mode === 'sticky');
  btnBrush.classList.toggle('active', state.mode === 'brush');
  btnDelete.classList.toggle('active-delete', state.mode === 'delete');

  canvas.className = 'canvas';
  if (state.mode === 'select') canvas.classList.add('tool-select');
  if (state.mode === 'delete') canvas.classList.add('tool-delete');
}

function updateColorSelection() {
  const dots = document.querySelectorAll('.color-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('selected', COLORS[i] === state.currentColor);
  });
}

function initToolbar() {
  const palette = document.getElementById('colorPalette')!;
  COLORS.forEach((color, i) => {
    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.background = color;
    if (color === state.currentColor) dot.classList.add('selected');
    dot.addEventListener('click', () => {
      state.currentColor = color;
      updateColorSelection();
    });
    palette.appendChild(dot);
  });

  document.getElementById('btnSticky')!.addEventListener('click', () => {
    state.mode = state.mode === 'sticky' ? 'select' : 'sticky';
    updateToolUI();
  });

  document.getElementById('btnBrush')!.addEventListener('click', () => {
    state.mode = state.mode === 'brush' ? 'select' : 'brush';
    updateToolUI();
  });

  document.getElementById('btnDelete')!.addEventListener('click', () => {
    state.mode = state.mode === 'delete' ? 'select' : 'delete';
    state.selectedNoteId = null;
    updateToolUI();
  });

  document.getElementById('btnUndo')!.addEventListener('click', undo);

  document.getElementById('roomCode')!.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}?room=${state.roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      const el = document.getElementById('roomCode')!;
      const original = el.textContent;
      el.textContent = '已复制!';
      setTimeout(() => { el.textContent = original; }, 1000);
    });
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.editingNoteId) return;
      if (state.selectedNoteId) {
        e.preventDefault();
        deleteItem('note', state.selectedNoteId);
        return;
      }
    }

    if (e.key === 'Escape') {
      state.selectedNoteId = null;
      state.editingNoteId = null;
      state.mode = 'brush';
      updateToolUI();
    }
  });
}

function createStickyEditor(note: StickyNote) {
  const existing = document.querySelector('.sticky-editor') as HTMLTextAreaElement;
  if (existing) existing.remove();

  const editor = document.createElement('textarea');
  editor.className = 'sticky-editor';
  editor.value = note.text;
  editor.maxLength = TEXT_MAX_LEN;

  const style = `
    position: absolute;
    z-index: 200;
    resize: none;
    border: 2px solid #42A5F5;
    background: ${NOTE_BG};
    padding: 14px;
    font-size: 16px;
    color: ${TEXT_COLOR};
    font-family: inherit;
    outline: none;
    text-align: center;
    border-radius: 6px;
    overflow: hidden;
    line-height: 22px;
  `;
  editor.style.cssText = style;

  const rect = canvas.getBoundingClientRect();
  editor.style.left = (note.x + state.camera.x) * state.camera.scale + rect.left + 'px';
  editor.style.top = (note.y + state.camera.y) * state.camera.scale + rect.top + 56 + 'px';
  editor.style.width = (note.width * state.camera.scale) + 'px';
  editor.style.height = (note.height * state.camera.scale) + 'px';

  document.body.appendChild(editor);
  editor.focus();
  editor.select();

  const commit = () => {
    if (editor.parentElement) {
      note.text = editor.value.slice(0, TEXT_MAX_LEN);
      state.notes.set(note.id, note);
      send({ type: 'updateNote', note });
      editor.remove();
      state.editingNoteId = null;
    }
  };

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      commit();
    }
  });

  editor.addEventListener('blur', commit);

  state.editingNoteId = note.id;
}

let lastMousePos: Point = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  const worldPos = screenToWorld(e.clientX, e.clientY);
  lastMousePos = worldPos;

  if (state.editingNoteId) {
    const editor = document.querySelector('.sticky-editor') as HTMLTextAreaElement;
    if (editor) editor.blur();
  }

  if (state.mode === 'delete') {
    const hitNote = hitTestNote(worldPos);
    if (hitNote) {
      deleteItem('note', hitNote.id);
      return;
    }
    const hitStroke = hitTestStroke(worldPos);
    if (hitStroke) {
      deleteItem('stroke', hitStroke.id);
      return;
    }
    return;
  }

  if (state.mode === 'sticky') {
    const note: StickyNote = {
      id: generateId(),
      x: worldPos.x - NOTE_W / 2,
      y: worldPos.y - NOTE_H / 2,
      width: NOTE_W,
      height: NOTE_H,
      text: '',
      userId: state.userId,
      createdAt: Date.now()
    };
    state.notes.set(note.id, note);
    state.appearingNotes.set(note.id, { startTime: performance.now() });
    state.selectedNoteId = note.id;
    pushHistory({ type: 'add', itemType: 'note', id: note.id, data: note });
    send({ type: 'addNote', note });
    setTimeout(() => createStickyEditor(note), 300);
    state.mode = 'select';
    updateToolUI();
    return;
  }

  const hitNote = hitTestNote(worldPos);
  if (hitNote) {
    if (e.button === 0) {
      state.selectedNoteId = hitNote.id;
      state.isDragging = true;
      state.dragOffset = {
        x: worldPos.x - hitNote.x,
        y: worldPos.y - hitNote.y
      };
      state.dragGhost = { x: hitNote.x, y: hitNote.y };
    }
    return;
  }

  if (state.mode === 'brush') {
    state.isDrawing = true;
    state.currentStrokeId = generateId();
    state.currentColor = state.currentColor;
    const startPoint: Point = {
      x: worldPos.x,
      y: worldPos.y,
      timestamp: performance.now()
    };
    state.lastPoint = startPoint;

    state.tempStrokes.set(state.currentStrokeId, {
      color: state.currentColor,
      userId: state.userId,
      points: [startPoint]
    });

    send({
      type: 'strokeSegment',
      strokeId: state.currentStrokeId,
      point: startPoint,
      color: state.currentColor
    });
  } else {
    state.selectedNoteId = null;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const worldPos = screenToWorld(e.clientX, e.clientY);

  const now = performance.now();
  if (now - state.lastCursorSend > 50) {
    state.lastCursorSend = now;
    if (Math.hypot(worldPos.x - state.lastCursorPos.x, worldPos.y - state.lastCursorPos.y) > 3) {
      send({ type: 'cursorMove', point: worldPos });
      state.lastCursorPos = worldPos;
    }
  }

  if (state.isDragging && state.selectedNoteId) {
    const note = state.notes.get(state.selectedNoteId);
    if (note) {
      const newX = worldPos.x - state.dragOffset.x;
      const newY = worldPos.y - state.dragOffset.y;
      state.dragGhost = { x: newX, y: newY };

      note.x = newX;
      note.y = newY;
      state.notes.set(note.id, note);
      send({ type: 'updateNote', note });
    }
    return;
  }

  if (state.isDrawing && state.lastPoint) {
    const point: Point = {
      x: worldPos.x,
      y: worldPos.y,
      timestamp: performance.now()
    };

    const temp = state.tempStrokes.get(state.currentStrokeId);
    if (temp) {
      temp.points.push(point);
    }

    send({
      type: 'strokeSegment',
      strokeId: state.currentStrokeId,
      point,
      color: state.currentColor
    });

    state.lastPoint = point;
  }
});

canvas.addEventListener('mouseup', () => {
  if (state.isDrawing) {
    send({ type: 'strokeEnd', strokeId: state.currentStrokeId });

    const temp = state.tempStrokes.get(state.currentStrokeId);
    if (temp) {
      const stroke: Stroke = {
        id: state.currentStrokeId,
        points: temp.points,
        color: temp.color,
        userId: state.userId,
        createdAt: Date.now()
      };
      state.strokes.set(stroke.id, stroke);
      pushHistory({ type: 'add', itemType: 'stroke', id: stroke.id, data: stroke });
    }
    state.tempStrokes.delete(state.currentStrokeId);

    state.isDrawing = false;
    state.currentStrokeId = '';
    state.lastPoint = null;
  }

  if (state.isDragging) {
    state.isDragging = false;
    state.dragGhost = null;
  }
});

canvas.addEventListener('mouseleave', () => {
  if (state.isDrawing) {
    send({ type: 'strokeEnd', strokeId: state.currentStrokeId });
    const temp = state.tempStrokes.get(state.currentStrokeId);
    if (temp) {
      const stroke: Stroke = {
        id: state.currentStrokeId,
        points: temp.points,
        color: temp.color,
        userId: state.userId,
        createdAt: Date.now()
      };
      state.strokes.set(stroke.id, stroke);
      pushHistory({ type: 'add', itemType: 'stroke', id: stroke.id, data: stroke });
    }
    state.tempStrokes.delete(state.currentStrokeId);
    state.isDrawing = false;
    state.currentStrokeId = '';
    state.lastPoint = null;
  }
  state.isDragging = false;
  state.dragGhost = null;
});

canvas.addEventListener('dblclick', (e) => {
  const worldPos = screenToWorld(e.clientX, e.clientY);
  const hitNote = hitTestNote(worldPos);
  if (hitNote && hitNote.userId === state.userId) {
    state.selectedNoteId = hitNote.id;
    createStickyEditor(hitNote);
  }
});

function updateRemoteCursors() {
  const container = document.querySelector('.canvas-container') as HTMLElement;
  const existing = container.querySelectorAll('.user-cursor');
  existing.forEach(el => el.remove());

  for (const [id, user] of state.users) {
    if (id === state.userId || !user.cursor) continue;

    const cursor = document.createElement('div');
    cursor.className = 'user-cursor';

    const dot = document.createElement('div');
    dot.className = 'user-cursor-dot';
    dot.style.background = user.color;

    const label = document.createElement('div');
    label.className = 'user-cursor-label';
    label.style.background = user.color;
    label.textContent = user.name;

    cursor.appendChild(dot);
    cursor.appendChild(label);

    const rect = canvas.getBoundingClientRect();
    const x = (user.cursor.x + state.camera.x) * state.camera.scale;
    const y = (user.cursor.y + state.camera.y) * state.camera.scale;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';

    container.appendChild(cursor);
  }
}

initToolbar();
updateToolUI();
connect();
