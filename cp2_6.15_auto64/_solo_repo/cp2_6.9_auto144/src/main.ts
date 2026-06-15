import { FractalTree, Season, TreeConfig } from './tree';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const trees: FractalTree[] = [];
let currentSeason: Season = 'spring';
let currentConfig: TreeConfig = {
  maxDepth: 5,
  branchAngle: 30,
  growthSpeed: 1,
  initialLength: 60,
  lengthRatio: 0.7
};

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let dragSpeed = 0;
let dragTargetTree: FractalTree | null = null;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(800, window.innerWidth);
  const height = Math.max(600, window.innerHeight);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawBackground(): void {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(1, '#228B22');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

let lastTime = performance.now();
let fpsAccumulator = 0;
let fpsFrames = 0;

function animate(currentTime: number): void {
  const deltaTime = Math.min(0.05, (currentTime - lastTime) / 1000);
  lastTime = currentTime;
  drawBackground();
  for (const tree of trees) {
    tree.update(deltaTime);
  }
  for (let i = trees.length - 1; i >= 0; i--) {
    if (trees[i].isDead()) {
      trees.splice(i, 1);
    }
  }
  for (const tree of trees) {
    tree.draw(ctx);
  }
  fpsAccumulator += deltaTime;
  fpsFrames++;
  if (fpsAccumulator >= 1) {
    fpsAccumulator = 0;
    fpsFrames = 0;
  }
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function findTreeAtRoot(x: number, y: number): FractalTree | null {
  for (let i = trees.length - 1; i >= 0; i--) {
    if (trees[i].isPointNearRoot(x, y, 20)) {
      return trees[i];
    }
  }
  return null;
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  const coords = getCanvasCoords(e);
  const treeAtRoot = findTreeAtRoot(coords.x, coords.y);
  if (treeAtRoot) {
    treeAtRoot.dying = true;
    return;
  }
  isDragging = true;
  lastMouseX = coords.x;
  lastMouseY = coords.y;
  const angle = 20 + Math.random() * 20;
  const tree = new FractalTree(
    coords.x,
    coords.y,
    { ...currentConfig, branchAngle: angle },
    currentSeason
  );
  trees.push(tree);
  dragTargetTree = tree;
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const coords = getCanvasCoords(e);
  if (isDragging && dragTargetTree) {
    const dx = coords.x - lastMouseX;
    const dy = coords.y - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const now = performance.now();
    const dt = Math.max(0.016, (now - (performance.now() - 16)) / 1000);
    dragSpeed = dist / dt;
    const minAngle = 15;
    const maxAngle = 45;
    const normalizedSpeed = Math.min(1, dragSpeed / 500);
    const newAngle = minAngle + normalizedSpeed * (maxAngle - minAngle);
    dragTargetTree.regrowWithNewAngle(newAngle);
    lastMouseX = coords.x;
    lastMouseY = coords.y;
  }
  for (const tree of trees) {
    tree.hovered = tree.isPointInTree(coords.x, coords.y);
  }
});

canvas.addEventListener('mouseup', (_e: MouseEvent) => {
  isDragging = false;
  dragTargetTree = null;
  dragSpeed = 0;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  dragTargetTree = null;
  for (const tree of trees) {
    tree.hovered = false;
  }
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const coords = getCanvasCoords(e);
  const treeAtRoot = findTreeAtRoot(coords.x, coords.y);
  if (treeAtRoot) {
    treeAtRoot.dying = true;
  }
});

const seasonButtons = document.querySelectorAll('.season-btn');
seasonButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    seasonButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const season = (btn as HTMLElement).dataset.season as Season;
    currentSeason = season;
    for (const tree of trees) {
      tree.setSeason(season);
    }
  });
});

const depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
const depthValue = document.getElementById('depth-value') as HTMLSpanElement;
depthSlider.addEventListener('input', () => {
  const value = parseInt(depthSlider.value);
  depthValue.textContent = value.toString();
  currentConfig.maxDepth = value;
  for (const tree of trees) {
    tree.updateConfig({ maxDepth: value });
  }
});

const angleSlider = document.getElementById('angle-slider') as HTMLInputElement;
const angleValue = document.getElementById('angle-value') as HTMLSpanElement;
angleSlider.addEventListener('input', () => {
  const value = parseInt(angleSlider.value);
  angleValue.textContent = value.toString();
  currentConfig.branchAngle = value;
  for (const tree of trees) {
    tree.regrowWithNewAngle(value);
  }
});

const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
speedSlider.addEventListener('input', () => {
  const value = parseFloat(speedSlider.value);
  speedValue.textContent = value.toFixed(1);
  currentConfig.growthSpeed = value;
  for (const tree of trees) {
    tree.updateConfig({ growthSpeed: value });
  }
});
