import { SceneManager } from './SceneManager';
import {
  BRICK_TEMPLATES,
  BRICK_COLORS,
  BrickType,
  getBrickPreviewSVG,
  BrickData,
  getTemplate,
} from './BrickFactory';
import { StabilityResult } from './StabilityChecker';

let sceneManager: SceneManager;
const brickColors = new Map<string, string>();
let currentDragType: BrickType | null = null;

const history: BrickData[][] = [];
const future: BrickData[][] = [];
let historyLock = false;

let currentSuggestion: { type: string; position: { x: number; y: number; z: number }; rotation: number } | null = null;

function pushHistory(): void {
  if (historyLock) return;
  if (!sceneManager) return;
  const snapshot = sceneManager.getBricksSnapshot();
  history.push(snapshot);
  if (history.length > 50) history.shift();
  future.length = 0;
  updateHistoryButtons();
}

function undo(): void {
  if (!sceneManager) return;
  if (history.length === 0) return;
  const current = sceneManager.getBricksSnapshot();
  future.push(current);
  const prev = history.pop()!;
  historyLock = true;
  sceneManager.restoreBricksSnapshot(prev);
  historyLock = false;
  updateHistoryButtons();
}

function redo(): void {
  if (!sceneManager) return;
  if (future.length === 0) return;
  const current = sceneManager.getBricksSnapshot();
  history.push(current);
  const next = future.pop()!;
  historyLock = true;
  sceneManager.restoreBricksSnapshot(next);
  historyLock = false;
  updateHistoryButtons();
}

function updateHistoryButtons(): void {
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
  if (undoBtn) undoBtn.disabled = history.length === 0;
  if (redoBtn) redoBtn.disabled = future.length === 0;
}

function buildBrickPanel(): void {
  const list = document.getElementById('brick-list');
  if (!list) return;
  list.innerHTML = '';
  for (const tmpl of BRICK_TEMPLATES) {
    const initialColor = BRICK_COLORS[0].hex;
    brickColors.set(tmpl.type, initialColor);
    const card = document.createElement('div');
    card.className = 'brick-card';
    card.dataset.brickType = tmpl.type;
    card.draggable = true;
    const preview = document.createElement('div');
    preview.className = 'brick-preview';
    preview.innerHTML = getBrickPreviewSVG(tmpl.type, initialColor);
    const name = document.createElement('div');
    name.className = 'brick-name';
    name.textContent = tmpl.name;
    const colors = document.createElement('div');
    colors.className = 'color-options';
    for (let i = 0; i < BRICK_COLORS.length; i++) {
      const c = BRICK_COLORS[i];
      const dot = document.createElement('div');
      dot.className = 'color-dot' + (i === 0 ? ' selected' : '');
      dot.style.backgroundColor = c.hex;
      dot.title = c.name;
      dot.dataset.color = c.hex;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        brickColors.set(tmpl.type, c.hex);
        for (const d of colors.children) {
          (d as HTMLElement).classList.remove('selected');
        }
        dot.classList.add('selected');
        preview.innerHTML = getBrickPreviewSVG(tmpl.type, c.hex);
      });
      colors.appendChild(dot);
    }
    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(colors);
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      currentDragType = tmpl.type;
      isDraggingFromPanel = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', tmpl.type);
        try { e.dataTransfer.setDragImage(card, 40, 30); } catch (_err) { /* noop */ }
      }
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      currentDragType = null;
      isDraggingFromPanel = false;
      sceneManager.setGhostBrick(tmpl.type, '#ffffff', false);
    });
    list.appendChild(card);
  }
}

function setupDropZone(): void {
  const container = document.getElementById('scene-container');
  if (!container) return;
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!currentDragType) return;
    const worldPoint = sceneManager.getGroundIntersection(e as unknown as MouseEvent);
    if (!worldPoint) return;
    const snapped = sceneManager.snapToGrid(worldPoint);
    const color = brickColors.get(currentDragType) || '#E53935';
    if (!sceneManager.ghostMesh) {
      sceneManager.setGhostBrick(currentDragType, color, true, snapped);
    } else {
      sceneManager.updateGhostPosition(snapped);
    }
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!currentDragType) return;
    const worldPoint = sceneManager.getGroundIntersection(e as unknown as MouseEvent);
    if (!worldPoint) {
      sceneManager.setGhostBrick(currentDragType, '#fff', false);
      return;
    }
    const snapped = sceneManager.snapToGrid(worldPoint);
    const color = brickColors.get(currentDragType) || '#E53935';
    const result = sceneManager.addBrick(currentDragType, color, snapped);
    sceneManager.setGhostBrick(currentDragType, color, false);
    if (result) {
      pushHistory();
    }
    currentDragType = null;
  });
  container.addEventListener('dragleave', () => {
    if (currentDragType) {
      sceneManager.setGhostBrick(currentDragType, '#fff', false);
    }
  });
}

function setupCanvasClicks(): void {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  let downX = 0, downY = 0, downTime = 0;
  canvas.addEventListener('mousedown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    downTime = performance.now();
  });
  canvas.addEventListener('mouseup', (e) => {
    const dx = Math.abs(e.clientX - downX);
    const dy = Math.abs(e.clientY - downY);
    const dt = performance.now() - downTime;
    if (dx < 5 && dy < 5 && dt < 400) {
      const brick = sceneManager.getBrickAtPoint(e);
      if (brick) {
        sceneManager.selectBrick(brick.data.id);
      } else {
        sceneManager.selectBrick(null);
      }
    }
  });
}

function setupActionButtons(): void {
  const actions = document.getElementById('brick-actions');
  const upBtn = document.getElementById('move-up');
  const downBtn = document.getElementById('move-down');
  const rotBtn = document.getElementById('rotate');
  const delBtn = document.getElementById('delete');
  if (!actions || !upBtn || !downBtn || !rotBtn || !delBtn) return;
  upBtn.addEventListener('click', () => {
    if (sceneManager.selectedBrickId) {
      if (sceneManager.moveBrick(sceneManager.selectedBrickId, { y: 1 })) {
        pushHistory();
      }
    }
  });
  downBtn.addEventListener('click', () => {
    if (sceneManager.selectedBrickId) {
      if (sceneManager.moveBrick(sceneManager.selectedBrickId, { y: -1 })) {
        pushHistory();
      }
    }
  });
  rotBtn.addEventListener('click', () => {
    if (sceneManager.selectedBrickId) {
      if (sceneManager.rotateBrick(sceneManager.selectedBrickId)) {
        pushHistory();
      }
    }
  });
  delBtn.addEventListener('click', () => {
    if (sceneManager.selectedBrickId) {
      sceneManager.removeBrick(sceneManager.selectedBrickId);
      pushHistory();
    }
  });
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);
}

function setupSuggestion(): void {
  const suggestBtn = document.getElementById('suggest-btn');
  const suggestPanel = document.getElementById('suggest-panel');
  const suggestText = document.getElementById('suggest-text');
  const confirmBtn = document.getElementById('confirm-suggest');
  const cancelBtn = document.getElementById('cancel-suggest');
  if (!suggestBtn || !suggestPanel || !suggestText || !confirmBtn || !cancelBtn) return;

  suggestBtn.addEventListener('click', () => {
    currentSuggestion = sceneManager.getBuildSuggestion();
    if (!currentSuggestion) {
      showToast('暂无合适的搭建建议');
      return;
    }
    const tmpl = getTemplate(currentSuggestion.type as BrickType);
    const name = tmpl ? tmpl.name : '积木';
    suggestText.textContent = `建议放置 ${name} 于 (${currentSuggestion.position.x}, ${currentSuggestion.position.y}, ${currentSuggestion.position.z})`;
    sceneManager.showSuggestion(
      currentSuggestion.type as BrickType,
      currentSuggestion.position,
      currentSuggestion.rotation
    );
    suggestPanel.classList.add('visible');
  });

  confirmBtn.addEventListener('click', () => {
    if (!currentSuggestion) return;
    const color = '#4A9EFF';
    const placed = sceneManager.addBrick(
      currentSuggestion.type as BrickType,
      color,
      currentSuggestion.position,
      currentSuggestion.rotation
    );
    sceneManager.hideSuggestion();
    suggestPanel.classList.remove('visible');
    if (placed) pushHistory();
    currentSuggestion = null;
  });

  cancelBtn.addEventListener('click', () => {
    sceneManager.hideSuggestion();
    suggestPanel.classList.remove('visible');
    currentSuggestion = null;
  });
}

function showToast(msg: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function updateStatusUI(count: number, result: StabilityResult | null): void {
  const countEl = document.getElementById('brick-count');
  const textEl = document.getElementById('stability-text');
  const scoreEl = document.getElementById('stability-score');
  if (countEl) countEl.textContent = String(count);
  if (!result) return;
  if (textEl) {
    if (result.unstableBrickIds.length === 0 || count === 0) {
      textEl.textContent = '结构稳定';
      textEl.classList.add('stable');
      textEl.classList.remove('unstable');
    } else {
      textEl.textContent = '结构不稳定';
      textEl.classList.add('unstable');
      textEl.classList.remove('stable');
    }
  }
  if (scoreEl) {
    scoreEl.textContent = result.stabilityScore + '%';
  }
}

function setupKeyboardShortcuts(): void {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }
    if (!sceneManager.selectedBrickId) return;
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      if (sceneManager.moveBrick(sceneManager.selectedBrickId, { y: 1 })) pushHistory();
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      if (sceneManager.moveBrick(sceneManager.selectedBrickId, { y: -1 })) pushHistory();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (sceneManager.rotateBrick(sceneManager.selectedBrickId)) pushHistory();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      sceneManager.removeBrick(sceneManager.selectedBrickId);
      pushHistory();
    }
  });
}

function init(): void {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  const container = document.getElementById('scene-container') as HTMLElement;
  if (!canvas || !container) {
    console.error('Missing canvas or container');
    return;
  }
  sceneManager = new SceneManager(canvas, container, {
    onStabilityUpdate: (result) => {
      updateStatusUI(sceneManager.bricks.size, result);
    },
    onSelectionChange: (id) => {
      const actions = document.getElementById('brick-actions');
      if (actions) {
        if (id) actions.classList.add('visible');
        else actions.classList.remove('visible');
      }
    },
    onBricksChange: (count) => {
      updateStatusUI(count, null);
    },
  });
  buildBrickPanel();
  setupDropZone();
  setupCanvasClicks();
  setupActionButtons();
  setupSuggestion();
  setupKeyboardShortcuts();
  updateStatusUI(0, { unstableBrickIds: [], stabilityScore: 100 });
  updateHistoryButtons();
}

document.addEventListener('DOMContentLoaded', init);
