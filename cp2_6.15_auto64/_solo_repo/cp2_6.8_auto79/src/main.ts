import {
  BaseModule,
  ConveyorModule,
  ArmModule,
  ProcessorModule,
  InputModule,
  OutputModule,
  Item,
  ModuleType,
  Direction,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  setCellSize,
  getDirectionVector,
  createModuleFromJSON,
} from './modules';

interface DragData {
  type: ModuleType;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
}

interface StatsData {
  totalItems: number;
  inProgress: number;
  finishedItems: number;
  productionRate: number;
  avgProcessTime: number;
  recentFinished: Array<{ time: number; count: number }>;
  processTimes: number[];
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const moduleList = document.getElementById('moduleList')!;
const editMenu = document.getElementById('editMenu') as HTMLElement;
const editMenuTitle = document.getElementById('editMenuTitle') as HTMLElement;
const editMenuContent = document.getElementById('editMenuContent') as HTMLElement;
const editMenuClose = document.getElementById('editMenuClose') as HTMLElement;

const modules: BaseModule[] = [];
const items: Item[] = [];
let dragData: DragData | null = null;
let selectedModule: BaseModule | null = null;
let editMenuTimer = 0;
const EDIT_MENU_TIMEOUT = 24;

const stats: StatsData = {
  totalItems: 0,
  inProgress: 0,
  finishedItems: 0,
  productionRate: 0,
  avgProcessTime: 0,
  recentFinished: [],
  processTimes: [],
};

const moduleDefinitions: Array<{ type: ModuleType; name: string; icon: string }> = [
  { type: 'conveyor_straight', name: '直传送带', icon: '═' },
  { type: 'conveyor_curve', name: '弯传送带', icon: '╔' },
  { type: 'arm', name: '机械臂', icon: '🦾' },
  { type: 'saw', name: '圆锯', icon: '⚙' },
  { type: 'hammer', name: '锤锻', icon: '🔨' },
  { type: 'furnace', name: '熔炉', icon: '🔥' },
  { type: 'input', name: '煤斗(入口)', icon: '⬇' },
  { type: 'output', name: '箱子(出口)', icon: '📦' },
];

function resizeCanvas(): void {
  const wrapper = canvas.parentElement!;
  const rect = wrapper.getBoundingClientRect();
  
  let cellSize = 60;
  if (window.innerWidth < 800) {
    cellSize = 40;
  }
  
  setCellSize(cellSize);
  
  const canvasWidth = GRID_COLS * cellSize;
  const canvasHeight = GRID_ROWS * cellSize;
  
  const maxWidth = rect.width - 20;
  const maxHeight = rect.height - 20;
  
  const scaleX = maxWidth / canvasWidth;
  const scaleY = maxHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = (canvasWidth * scale) + 'px';
  canvas.style.height = (canvasHeight * scale) + 'px';
}

function initModuleList(): void {
  moduleList.innerHTML = '';
  
  moduleDefinitions.forEach((def) => {
    const item = document.createElement('div');
    item.className = 'module-item';
    item.draggable = true;
    item.dataset.type = def.type;
    
    const icon = document.createElement('div');
    icon.className = 'module-icon';
    icon.style.fontSize = '28px';
    icon.style.color = '#D4AF37';
    icon.textContent = def.icon;
    
    const name = document.createElement('div');
    name.className = 'module-name';
    name.textContent = def.name;
    
    item.appendChild(icon);
    item.appendChild(name);
    
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const type = def.type;
      const rect = item.getBoundingClientRect();
      dragData = {
        type,
        offsetX: e.clientX - rect.left - rect.width / 2,
        offsetY: e.clientY - rect.top - rect.height / 2,
        currentX: e.clientX,
        currentY: e.clientY,
      };
    });
    
    moduleList.appendChild(item);
  });
}

function getCanvasMousePos(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function getGridPos(x: number, y: number): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(x / CELL_SIZE),
    gridY: Math.floor(y / CELL_SIZE),
  };
}

function isPositionValid(gridX: number, gridY: number, excludeId?: string): boolean {
  if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
    return false;
  }
  return !modules.some((m) => m.gridX === gridX && m.gridY === gridY && m.id !== excludeId && !m.isDeleting);
}

function createModule(type: ModuleType, gridX: number, gridY: number): BaseModule | null {
  switch (type) {
    case 'conveyor_straight':
      return new ConveyorModule('conveyor_straight', gridX, gridY, 'right');
    case 'conveyor_curve':
      return new ConveyorModule('conveyor_curve', gridX, gridY, 'right');
    case 'arm':
      return new ArmModule(gridX, gridY);
    case 'saw':
    case 'hammer':
    case 'furnace':
      return new ProcessorModule(type, gridX, gridY);
    case 'input':
      return new InputModule(gridX, gridY);
    case 'output':
      return new OutputModule(gridX, gridY);
    default:
      return null;
  }
}

document.addEventListener('mousemove', (e) => {
  if (dragData) {
    dragData.currentX = e.clientX;
    dragData.currentY = e.clientY;
  }
});

document.addEventListener('mouseup', (e) => {
  if (dragData) {
    const pos = getCanvasMousePos(e.clientX, e.clientY);
    const { gridX, gridY } = getGridPos(pos.x, pos.y);
    
    if (isPositionValid(gridX, gridY)) {
      const newModule = createModule(dragData.type, gridX, gridY);
      if (newModule) {
        modules.push(newModule);
      }
    }
    dragData = null;
  }
});

canvas.addEventListener('click', (e) => {
  const pos = getCanvasMousePos(e.clientX, e.clientY);
  const { gridX, gridY } = getGridPos(pos.x, pos.y);
  
  const clickedModule = modules.find(
    (m) => m.gridX === gridX && m.gridY === gridY && !m.isDeleting
  );
  
  if (clickedModule) {
    selectedModule = clickedModule;
    showEditMenu(clickedModule, e.clientX, e.clientY);
  } else {
    hideEditMenu();
    selectedModule = null;
  }
});

function showEditMenu(module: BaseModule, clientX: number, clientY: number): void {
  const wrapper = canvas.parentElement!;
  const wrapperRect = wrapper.getBoundingClientRect();
  
  editMenu.style.display = 'block';
  editMenu.style.left = Math.min(clientX - wrapperRect.left, wrapperRect.width - 220) + 'px';
  editMenu.style.top = Math.min(clientY - wrapperRect.top, wrapperRect.height - 200) + 'px';
  
  editMenuTimer = 0;
  
  let title = '模块设置';
  let content = '';
  
  if (module instanceof ConveyorModule) {
    title = module.isCurve ? '弯传送带设置' : '直传送带设置';
    content = `
      <div class="edit-menu-section">
        <span class="edit-menu-label">传送带方向</span>
        <div class="direction-buttons">
          <button class="dir-btn" disabled></button>
          <button class="dir-btn ${module.direction === 'up' ? 'active' : ''}" data-dir="up">↑</button>
          <button class="dir-btn" disabled></button>
          <button class="dir-btn ${module.direction === 'left' ? 'active' : ''}" data-dir="left">←</button>
          <button class="dir-btn" disabled></button>
          <button class="dir-btn ${module.direction === 'right' ? 'active' : ''}" data-dir="right">→</button>
          <button class="dir-btn" disabled></button>
          <button class="dir-btn ${module.direction === 'down' ? 'active' : ''}" data-dir="down">↓</button>
          <button class="dir-btn" disabled></button>
        </div>
      </div>
    `;
  } else if (module instanceof ArmModule) {
    title = '机械臂设置';
    content = `
      <div class="edit-menu-section">
        <span class="edit-menu-label">抓取旋转角度: ${module.targetAngle}°</span>
        <div class="slider-container">
          <input type="range" id="armAngle" min="0" max="180" value="${module.targetAngle}">
          <div class="slider-value" id="armAngleValue">${module.targetAngle}°</div>
        </div>
      </div>
    `;
  } else if (module instanceof ProcessorModule) {
    const typeNames: Record<string, string> = {
      saw: '圆锯',
      hammer: '锤锻',
      furnace: '熔炉',
    };
    title = `${typeNames[module.type]}设置`;
    content = `
      <div class="edit-menu-section">
        <span class="edit-menu-label">处理耗时: ${module.processTime}秒</span>
        <div class="slider-container">
          <input type="range" id="processTime" min="1" max="10" value="${module.processTime}">
          <div class="slider-value" id="processTimeValue">${module.processTime}秒</div>
        </div>
      </div>
    `;
  } else if (module instanceof InputModule) {
    title = '原料入口设置';
    content = `
      <div class="edit-menu-section">
        <span class="edit-menu-label">每3秒生成一个煤块</span>
        <div style="color: #808080; font-size: 11px; text-align: center; margin-top: 8px;">
          这是流水线的起点
        </div>
      </div>
    `;
  } else if (module instanceof OutputModule) {
    title = '成品出口设置';
    content = `
      <div class="edit-menu-section">
        <span class="edit-menu-label">已接收成品: ${module.receivedCount}</span>
        <div style="color: #808080; font-size: 11px; text-align: center; margin-top: 8px;">
          这是流水线的终点
        </div>
      </div>
    `;
  }
  
  editMenuTitle.textContent = title;
  editMenuContent.innerHTML = content;
  
  if (module instanceof ConveyorModule) {
    editMenuContent.querySelectorAll('.dir-btn[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = (btn as HTMLElement).dataset.dir as Direction;
        module.direction = dir;
        editMenuTimer = 0;
        showEditMenu(module, clientX, clientY);
      });
    });
  }
  
  if (module instanceof ArmModule) {
    const slider = editMenuContent.querySelector('#armAngle') as HTMLInputElement;
    const valueDisplay = editMenuContent.querySelector('#armAngleValue') as HTMLElement;
    if (slider && valueDisplay) {
      slider.addEventListener('input', () => {
        module.targetAngle = parseInt(slider.value);
        valueDisplay.textContent = `${module.targetAngle}°`;
        editMenuTitle.textContent = title;
      });
      slider.addEventListener('change', () => {
        editMenuTimer = 0;
      });
    }
  }
  
  if (module instanceof ProcessorModule) {
    const slider = editMenuContent.querySelector('#processTime') as HTMLInputElement;
    const valueDisplay = editMenuContent.querySelector('#processTimeValue') as HTMLElement;
    if (slider && valueDisplay) {
      slider.addEventListener('input', () => {
        module.processTime = parseInt(slider.value);
        valueDisplay.textContent = `${module.processTime}秒`;
      });
      slider.addEventListener('change', () => {
        editMenuTimer = 0;
      });
    }
  }
}

function hideEditMenu(): void {
  editMenu.style.display = 'none';
  selectedModule = null;
}

editMenuClose.addEventListener('click', hideEditMenu);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' && selectedModule && !selectedModule.isDeleting) {
    selectedModule.isDeleting = true;
    selectedModule.deleteFlashCount = 0;
    selectedModule.deleteFlashTimer = 0;
    hideEditMenu();
  }
});

function getModuleAt(gridX: number, gridY: number): BaseModule | undefined {
  return modules.find((m) => m.gridX === gridX && m.gridY === gridY && !m.isDeleting);
}

function getConveyorDirection(module: BaseModule): Direction | null {
  if (module instanceof ConveyorModule) {
    return module.direction;
  }
  return null;
}

function updateItems(dt: number): void {
  const itemsToRemove: string[] = [];
  
  for (const item of items) {
    if (item.processing) {
      continue;
    }
    
    if (item.paused) {
      item.pauseTimer -= dt;
      if (item.pauseTimer <= 0) {
        item.paused = false;
      }
      continue;
    }
    
    const { gridX, gridY } = getGridPos(item.x, item.y);
    const currentModule = getModuleAt(gridX, gridY);
    const cellCenterX = gridX * CELL_SIZE + CELL_SIZE / 2;
    const cellCenterY = gridY * CELL_SIZE + CELL_SIZE / 2;
    const distToCenter = Math.sqrt((item.x - cellCenterX) ** 2 + (item.y - cellCenterY) ** 2);
    
    if (distToCenter < 3) {
      if (currentModule instanceof OutputModule) {
        itemsToRemove.push(item.id);
        currentModule.receivedCount++;
        stats.finishedItems++;
        stats.processTimes.push((Date.now() - item.birthTime) / 1000);
        if (stats.processTimes.length > 100) {
          stats.processTimes.shift();
        }
        stats.recentFinished.push({ time: Date.now(), count: 1 });
        continue;
      }
      
      if (currentModule instanceof ArmModule && !currentModule.isGrabbing && !item.paused) {
        currentModule.startGrab();
        item.paused = true;
        item.pauseTimer = 2.0;
        continue;
      }
      
      if (currentModule instanceof ProcessorModule && !currentModule.processing) {
        currentModule.startProcessing(item.id);
        item.processing = true;
        item.currentProcessorId = currentModule.id;
        continue;
      }
      
      if (item.currentProcessorId && !currentModule?.processing) {
        item.currentProcessorId = null;
      }
    }
    
    if (item.processing) {
      continue;
    }
    
    let moveSpeed = item.speed * CELL_SIZE * dt;
    const dir = getDirectionVector(item.direction);
    
    const atCenter = distToCenter < 3;
    
    if (atCenter && currentModule) {
      if (currentModule instanceof ConveyorModule) {
        item.direction = currentModule.direction;
      } else if (currentModule instanceof InputModule) {
        item.direction = 'right';
      }
    }
    
    const nextX = item.x + dir.x * moveSpeed;
    const nextY = item.y + dir.y * moveSpeed;
    const nextGridX = Math.floor(nextX / CELL_SIZE);
    const nextGridY = Math.floor(nextY / CELL_SIZE);
    
    const wouldLeaveGrid = nextGridX < 0 || nextGridX >= GRID_COLS || nextGridY < 0 || nextGridY >= GRID_ROWS;
    
    if (wouldLeaveGrid) {
      itemsToRemove.push(item.id);
      continue;
    }
    
    const nextModule = getModuleAt(nextGridX, nextGridY);
    
    const aboutToEnterNext = 
      (dir.x > 0 && nextX >= nextGridX * CELL_SIZE + CELL_SIZE / 4) ||
      (dir.x < 0 && nextX <= nextGridX * CELL_SIZE + CELL_SIZE * 3 / 4) ||
      (dir.y > 0 && nextY >= nextGridY * CELL_SIZE + CELL_SIZE / 4) ||
      (dir.y < 0 && nextY <= nextGridY * CELL_SIZE + CELL_SIZE * 3 / 4);
    
    if (aboutToEnterNext && nextModule === undefined) {
      continue;
    }
    
    if (atCenter && currentModule instanceof ConveyorModule && currentModule.isCurve) {
      if (dir.x !== 0) {
        const newDir = dir.x > 0 ? 'down' : 'up';
        item.direction = newDir;
      } else if (dir.y !== 0) {
        const newDir = dir.y > 0 ? 'right' : 'left';
        item.direction = newDir;
      }
    }
    
    const newDir = getDirectionVector(item.direction);
    item.x += newDir.x * moveSpeed;
    item.y += newDir.y * moveSpeed;
    
    if (currentModule instanceof ProcessorModule && currentModule.processing) {
      if (item.currentProcessorId === currentModule.id && !currentModule.processing) {
        item.processing = false;
        item.type = currentModule.resultItemType;
      }
    }
  }
  
  for (let i = items.length - 1; i >= 0; i--) {
    if (itemsToRemove.includes(items[i].id)) {
      items.splice(i, 1);
    }
  }
  
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.processing && item.currentProcessorId) {
      const processor = modules.find((m) => m.id === item.currentProcessorId) as ProcessorModule | undefined;
      if (processor && !processor.processing) {
        item.processing = false;
        item.type = processor.resultItemType;
      }
    }
  }
}

function spawnCoal(input: InputModule): void {
  const item = new Item('coal', input.getCenterX(), input.getCenterY(), 'right');
  items.push(item);
  stats.totalItems++;
}

function updateStats(dt: number): void {
  const now = Date.now();
  const sixtySecondsAgo = now - 60000;
  
  stats.recentFinished = stats.recentFinished.filter((r) => r.time > sixtySecondsAgo);
  const recentCount = stats.recentFinished.reduce((sum, r) => sum + r.count, 0);
  stats.productionRate = Math.round((recentCount / 60) * 60);
  
  stats.inProgress = items.filter((i) => i.processing || i.type === 'coal').length;
  
  if (stats.processTimes.length > 0) {
    stats.avgProcessTime = stats.processTimes.reduce((sum, t) => sum + t, 0) / stats.processTimes.length;
  }
  
  document.getElementById('statTotal')!.textContent = stats.totalItems.toString();
  document.getElementById('statInProgress')!.textContent = stats.inProgress.toString();
  document.getElementById('statFinished')!.textContent = stats.finishedItems.toString();
  document.getElementById('statRate')!.textContent = stats.productionRate.toString();
  document.getElementById('statAvgTime')!.textContent = stats.avgProcessTime.toFixed(1) + 's';
  
  if (editMenu.style.display === 'block') {
    editMenuTimer += dt;
    if (editMenuTimer >= EDIT_MENU_TIMEOUT) {
      hideEditMenu();
    }
  }
}

function updateModules(dt: number): void {
  for (let i = modules.length - 1; i >= 0; i--) {
    const module = modules[i];
    module.update(dt);
    
    if (module.isDeleting) {
      module.deleteFlashTimer += dt;
      if (module.deleteFlashTimer >= 0.2) {
        module.deleteFlashTimer = 0;
        module.deleteFlashCount++;
        if (module.deleteFlashCount >= 6) {
          modules.splice(i, 1);
        }
      }
    }
    
    if (module instanceof InputModule) {
      module.spawnTimer += dt;
      if (module.spawnTimer >= module.spawnInterval) {
        module.spawnTimer = 0;
        spawnCoal(module);
      }
    }
  }
}

function drawGrid(): void {
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 1;
  
  for (let x = 0; x <= GRID_COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, GRID_ROWS * CELL_SIZE);
    ctx.stroke();
  }
  
  for (let y = 0; y <= GRID_ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(GRID_COLS * CELL_SIZE, y * CELL_SIZE);
    ctx.stroke();
  }
}

function drawDragPreview(): void {
  if (!dragData) return;
  
  const pos = getCanvasMousePos(dragData.currentX, dragData.currentY);
  const { gridX, gridY } = getGridPos(pos.x, pos.y);
  const valid = isPositionValid(gridX, gridY);
  
  ctx.save();
  ctx.globalAlpha = 0.7;
  
  const preview = createModule(dragData.type, gridX, gridY);
  if (preview) {
    preview.isHighlighted = true;
    preview.highlightColor = valid ? '#00FF00' : '#FF0000';
    preview.render(ctx);
  }
  
  ctx.restore();
}

function render(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, '#2a2a3a');
  bgGradient.addColorStop(1, '#1e1e2e');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawGrid();
  
  for (const module of modules) {
    if (module === selectedModule) {
      module.isHighlighted = true;
      module.highlightColor = '#D4AF37';
    } else {
      module.isHighlighted = false;
    }
    module.render(ctx);
  }
  
  for (const item of items) {
    item.render(ctx);
  }
  
  drawDragPreview();
}

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  
  updateModules(dt);
  updateItems(dt);
  updateStats(dt);
  render();
  
  requestAnimationFrame(gameLoop);
}

function saveLayout(): void {
  const data = modules
    .filter((m) => !m.isDeleting)
    .map((m) => m.toJSON());
  localStorage.setItem('factory_layout', JSON.stringify(data));
  alert('布局已保存！');
}

function loadLayout(): void {
  const saved = localStorage.getItem('factory_layout');
  if (!saved) {
    alert('没有找到已保存的布局');
    return;
  }
  
  try {
    const data = JSON.parse(saved) as Array<Record<string, unknown>>;
    modules.length = 0;
    items.length = 0;
    stats.totalItems = 0;
    stats.finishedItems = 0;
    stats.inProgress = 0;
    stats.processTimes = [];
    stats.recentFinished = [];
    
    for (const itemData of data) {
      const module = createModuleFromJSON(itemData);
      if (module) {
        modules.push(module);
      }
    }
    alert('布局已加载！');
  } catch {
    alert('加载布局失败');
  }
}

function clearLayout(): void {
  if (confirm('确定要清空所有模块吗？')) {
    modules.length = 0;
    items.length = 0;
    stats.totalItems = 0;
    stats.finishedItems = 0;
    stats.inProgress = 0;
    stats.processTimes = [];
    stats.recentFinished = [];
    hideEditMenu();
  }
}

document.getElementById('saveBtn')!.addEventListener('click', saveLayout);
document.getElementById('loadBtn')!.addEventListener('click', loadLayout);
document.getElementById('clearBtn')!.addEventListener('click', clearLayout);

window.addEventListener('resize', () => {
  resizeCanvas();
});

function init(): void {
  resizeCanvas();
  initModuleList();
  requestAnimationFrame(gameLoop);
}

init();
