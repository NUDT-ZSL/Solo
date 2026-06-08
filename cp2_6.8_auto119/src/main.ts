import { TimelineEngine, type ToolType, type EventNode } from './timelineEngine';
import { Renderer } from './renderer';
import { exportTimeline, showToast } from './exportUtils';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const engine = new TimelineEngine();
const renderer = new Renderer(canvas, engine);

type DragState =
  | { type: 'none' }
  | { type: 'node'; id: string; offsetX: number; offsetY: number; moved: boolean }
  | { type: 'label'; id: string; offsetX: number; offsetY: number; moved: boolean }
  | { type: 'timeline'; id: string; end: 'start' | 'end'; moved: boolean };

let drag: DragState = { type: 'none' };
let hoverArrowId: string | null = null;
let rafId = 0;
let lastFrame = 0;
let needsRender = true;

engine.subscribe(() => {
  needsRender = true;
});

function loop(now: number): void {
  const dt = now - lastFrame;
  if (dt >= 16) {
    const anim = engine.tickAnimations(now);
    if (anim) needsRender = true;
    if (needsRender) {
      renderer.render(hoverArrowId);
      needsRender = false;
    }
    lastFrame = now;
  }
  rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);

function getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const ev = 'touches' in e ? (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0] : (e as MouseEvent);
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function updateCursor(x: number, y: number): void {
  if (drag.type !== 'none') {
    canvas.classList.add('grabbing');
    canvas.classList.remove('grab');
    return;
  }
  const tool = engine.state.activeTool;
  if (tool === 'node' || tool === 'label' || tool === 'timeline') {
    canvas.style.cursor = 'crosshair';
    canvas.classList.remove('grab', 'grabbing');
    return;
  }
  if (tool === 'arrow') {
    canvas.style.cursor = 'pointer';
    canvas.classList.remove('grab', 'grabbing');
    return;
  }
  const anchorHit = engine.hitTestTimelineAnchor(x, y);
  if (anchorHit) {
    canvas.style.cursor = 'ew-resize';
    canvas.classList.remove('grab', 'grabbing');
    return;
  }
  const nodeHit = engine.hitTestNode(x, y);
  const labelHit = engine.hitTestLabel(x, y);
  if (nodeHit || labelHit) {
    canvas.classList.add('grab');
    canvas.classList.remove('grabbing');
    canvas.style.cursor = '';
    return;
  }
  canvas.classList.remove('grab', 'grabbing');
  canvas.style.cursor = 'default';
}

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasPos(e);

  if (drag.type === 'node') {
    const node = engine.getNode(drag.id);
    if (node) {
      let newX = x - drag.offsetX;
      let newY = y - drag.offsetY;
      newX = Math.max(0, Math.min(renderer.width - node.width, newX));
      newY = Math.max(0, Math.min(renderer.height - node.height, newY));
      engine.updateNode(drag.id, { x: newX, y: newY });
      engine.applySnap(drag.id, renderer.width);
      drag.moved = true;
    }
  } else if (drag.type === 'label') {
    const label = engine.getLabel(drag.id);
    if (label) {
      let newX = x - drag.offsetX;
      let newY = y - drag.offsetY;
      newX = Math.max(0, Math.min(renderer.width - 60, newX));
      newY = Math.max(0, Math.min(renderer.height - 30, newY));
      engine.updateLabel(drag.id, { x: newX, y: newY });
      drag.moved = true;
    }
  } else if (drag.type === 'timeline') {
    const tl = engine.getTimeline(drag.id);
    if (tl) {
      if (drag.end === 'start') {
        engine.updateTimeline(drag.id, { x1: Math.max(20, Math.min(tl.x2 - tl.minLength, x)) });
      } else {
        engine.updateTimeline(drag.id, { x2: Math.max(tl.x1 + tl.minLength, Math.min(renderer.width - 20, x)) });
      }
      drag.moved = true;
    }
  } else {
    const arrowHit = engine.hitTestArrow(x, y);
    const newHover = arrowHit ? arrowHit.id : null;
    if (newHover !== hoverArrowId) {
      hoverArrowId = newHover;
      needsRender = true;
    }
  }
  updateCursor(x, y);
});

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasPos(e);
  const tool = engine.state.activeTool;

  if (tool === 'node') {
    const node = engine.addNode(x - 60, y - 30);
    engine.clearSelection();
    engine.selectNode(node.id);
    syncPanel();
    engine.setActiveTool('select');
    syncToolButtons();
    return;
  }
  if (tool === 'label') {
    const label = engine.addLabel(x, y);
    engine.selectLabel(label.id);
    engine.setActiveTool('select');
    syncToolButtons();
    const newText = window.prompt('输入标签文字', label.text);
    if (newText !== null) engine.updateLabel(label.id, { text: newText });
    return;
  }
  if (tool === 'timeline') {
    engine.addTimeline(x, y, renderer.width);
    engine.setActiveTool('select');
    syncToolButtons();
    return;
  }
  if (tool === 'arrow') {
    const nodeHit = engine.hitTestNode(x, y);
    if (nodeHit) {
      if (!engine.pendingArrowFrom) {
        engine.pendingArrowFrom = nodeHit.id;
        showToast('请点击另一个节点以连接');
      } else {
        engine.addArrow(engine.pendingArrowFrom, nodeHit.id);
        engine.pendingArrowFrom = null;
        engine.setActiveTool('select');
        syncToolButtons();
      }
    }
    return;
  }

  const anchorHit = engine.hitTestTimelineAnchor(x, y);
  if (anchorHit) {
    drag = { type: 'timeline', id: anchorHit.id, end: anchorHit.end, moved: false };
    canvas.classList.add('grabbing');
    return;
  }

  const nodeHit = engine.hitTestNode(x, y);
  if (nodeHit) {
    const multi = e.ctrlKey || e.metaKey;
    if (!multi && !nodeHit.selected) {
      engine.clearSelection();
    }
    engine.selectNode(nodeHit.id, multi);
    drag = { type: 'node', id: nodeHit.id, offsetX: x - nodeHit.x, offsetY: y - nodeHit.y, moved: false };
    canvas.classList.add('grab');
    syncPanel();
    return;
  }

  const labelHit = engine.hitTestLabel(x, y);
  if (labelHit) {
    const multi = e.ctrlKey || e.metaKey;
    if (!multi && !labelHit.selected) engine.clearSelection();
    engine.selectLabel(labelHit.id, multi);
    drag = { type: 'label', id: labelHit.id, offsetX: x - labelHit.x, offsetY: y - labelHit.y, moved: false };
    canvas.classList.add('grab');
    hidePanel();
    return;
  }

  engine.clearSelection();
  syncPanel();
  hidePanel();
});

window.addEventListener('mouseup', () => {
  if (drag.type !== 'none') {
    if (!drag.moved && drag.type === 'node') {
      syncPanel();
    }
    drag = { type: 'none' };
    canvas.classList.remove('grabbing', 'grab');
  }
});

canvas.addEventListener('dblclick', (e) => {
  const { x, y } = getCanvasPos(e);
  const nodeHit = engine.hitTestNode(x, y);
  if (nodeHit) {
    engine.selectNode(nodeHit.id);
    syncPanel();
    showPanel();
    const input = document.getElementById('nodeTitle') as HTMLInputElement;
    if (input) input.focus();
    return;
  }
  const labelHit = engine.hitTestLabel(x, y);
  if (labelHit) {
    const newText = window.prompt('修改标签文字', labelHit.text);
    if (newText !== null) engine.updateLabel(labelHit.id, { text: newText });
  }
});

window.addEventListener('resize', () => {
  renderer.resize();
  needsRender = true;
});

const toolBtns = document.querySelectorAll<HTMLButtonElement>('.tool-btn[data-tool]');
function syncToolButtons(): void {
  toolBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === engine.state.activeTool);
  });
}
toolBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool as ToolType;
    engine.setActiveTool(tool);
    syncToolButtons();
  });
});

document.getElementById('alignHBtn')?.addEventListener('click', () => {
  const gap = parseInt((document.getElementById('alignGap') as HTMLSelectElement).value, 10) || 40;
  engine.alignSelected('horizontal', gap);
});
document.getElementById('alignVBtn')?.addEventListener('click', () => {
  const gap = parseInt((document.getElementById('alignGap') as HTMLSelectElement).value, 10) || 40;
  engine.alignSelected('vertical', gap);
});

document.getElementById('exportBtn')?.addEventListener('click', async () => {
  const res = await exportTimeline(renderer);
  if (res.success) {
    showToast('导出成功，已保存到下载目录');
    if (res.downloadUrl && !res.downloadUrl.startsWith('blob:')) {
      window.open(res.downloadUrl, '_blank');
    }
  } else {
    showToast('导出失败: ' + (res.error || '未知错误'));
  }
});

const panel = document.getElementById('panel') as HTMLDivElement;
const panelClose = document.getElementById('panelClose') as HTMLButtonElement;
const titleInput = document.getElementById('nodeTitle') as HTMLInputElement;
const descInput = document.getElementById('nodeDesc') as HTMLTextAreaElement;
const dateInput = document.getElementById('nodeDate') as HTMLInputElement;
const titleCount = document.getElementById('titleCount') as HTMLElement;
const descCount = document.getElementById('descCount') as HTMLElement;
const tagList = document.getElementById('tagList') as HTMLDivElement;
const tagText = document.getElementById('tagText') as HTMLInputElement;
const tagColor = document.getElementById('tagColor') as HTMLSelectElement;
const addTagBtn = document.getElementById('addTagBtn') as HTMLButtonElement;

function showPanel(): void {
  panel.classList.add('open');
}
function hidePanel(): void {
  panel.classList.remove('open');
}
panelClose.addEventListener('click', hidePanel);

function syncPanel(): void {
  const node = engine.getSelectedSingleNode();
  if (!node) {
    hidePanel();
    return;
  }
  titleInput.value = node.title;
  descInput.value = node.description;
  dateInput.value = node.date;
  titleCount.textContent = `(${node.title.length}/50)`;
  descCount.textContent = `(${node.description.length}/200)`;
  renderTagList(node);
  addTagBtn.disabled = node.tags.length >= 3;
  showPanel();
}

function renderTagList(node: EventNode): void {
  tagList.innerHTML = '';
  node.tags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.style.background = tag.color;
    chip.textContent = tag.text;
    const x = document.createElement('button');
    x.textContent = '×';
    x.title = '删除标签';
    x.addEventListener('click', () => {
      engine.removeTagFromNode(node.id, tag.id);
      renderTagList(node);
      addTagBtn.disabled = false;
    });
    chip.appendChild(x);
    tagList.appendChild(chip);
  });
}

titleInput.addEventListener('input', () => {
  const node = engine.getSelectedSingleNode();
  if (!node) return;
  const val = titleInput.value.slice(0, 50);
  engine.updateNode(node.id, { title: val });
  titleCount.textContent = `(${val.length}/50)`;
});
descInput.addEventListener('input', () => {
  const node = engine.getSelectedSingleNode();
  if (!node) return;
  const val = descInput.value.slice(0, 200);
  engine.updateNode(node.id, { description: val });
  descCount.textContent = `(${val.length}/200)`;
});
dateInput.addEventListener('change', () => {
  const node = engine.getSelectedSingleNode();
  if (!node) return;
  engine.updateNode(node.id, { date: dateInput.value });
});
addTagBtn.addEventListener('click', () => {
  const node = engine.getSelectedSingleNode();
  if (!node) return;
  const text = tagText.value.trim();
  if (!text) return;
  engine.addTagToNode(node.id, text, tagColor.value);
  tagText.value = '';
  renderTagList(node);
  addTagBtn.disabled = node.tags.length >= 3;
});

const hamburger = document.getElementById('hamburger') as HTMLButtonElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;
function applyResponsive(): void {
  if (window.innerWidth < 768) {
    sidebar.classList.add('hidden');
  } else {
    sidebar.classList.remove('hidden');
  }
}
applyResponsive();
window.addEventListener('resize', applyResponsive);
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

engine.addNode(150, 160);
engine.getNode(engine.state.nodes[0].id)!.title = '项目启动';
engine.getNode(engine.state.nodes[0].id)!.date = '2024-01-15';
engine.addNode(360, 160);
engine.getNode(engine.state.nodes[1].id)!.title = '需求评审';
engine.getNode(engine.state.nodes[1].id)!.date = '2024-02-20';
engine.addNode(570, 160);
engine.getNode(engine.state.nodes[2].id)!.title = '上线发布';
engine.getNode(engine.state.nodes[2].id)!.date = '2024-05-10';
engine.addArrow(engine.state.nodes[0].id, engine.state.nodes[1].id);
engine.addArrow(engine.state.nodes[1].id, engine.state.nodes[2].id);
engine.addTimeline(80, 240, renderer.width);
needsRender = true;
