import type { Stratum, StratumStats } from './geology';
import { calculateCutThickness } from './geology';

export interface UICallbacks {
  onStratumSelect: (id: number | null) => void;
  onDepthRangeChange: (min: number, max: number) => void;
  onCutChange: (percent: number) => void;
  onResetView: () => void;
  onToggleFilter: () => void;
}

export interface PanelData {
  stratum: Stratum;
  depth: number;
  screenX: number;
  screenY: number;
}

let rootContainer: HTMLElement | null = null;
let leftPanel: HTMLElement | null = null;
let rightPanel: HTMLElement | null = null;
let infoPanel: HTMLElement | null = null;
let stratumSelect: HTMLSelectElement | null = null;
let statsContent: HTMLElement | null = null;
let thicknessList: HTMLElement | null = null;
let hamburgerBtn: HTMLElement | null = null;
let mobileFAB: HTMLElement | null = null;
let callbacks: UICallbacks | null = null;
let strataData: Stratum[] = [];
let navExpanded = false;

export function initUI(
  root: HTMLElement,
  strata: Stratum[],
  cbs: UICallbacks
): void {
  rootContainer = root;
  strataData = strata;
  callbacks = cbs;

  createTopNav();
  createLeftPanel();
  createRightSlider();
  createInfoPanel();
  createMobileFAB();
  bindGlobalEvents();
  applyResponsiveLayout();
}

function createTopNav(): void {
  if (!rootContainer) return;
  const nav = document.createElement('div');
  nav.className = 'top-nav';
  nav.id = 'topNav';
  nav.innerHTML = `
    <div class="nav-header">
      <button class="hamburger-btn" id="hamburgerBtn" aria-label="菜单">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <h1 class="nav-title">三维地层可视化系统</h1>
    </div>
    <div class="nav-controls" id="navControls">
      <div class="nav-control-group">
        <label class="nav-label">地层筛选</label>
        <select class="control-select" id="navStratumSelect"></select>
      </div>
      <button class="control-btn" id="navResetBtn">重置视角</button>
    </div>
  `;
  rootContainer.appendChild(nav);
  hamburgerBtn = nav.querySelector('#hamburgerBtn');

  const navSelect = nav.querySelector('#navStratumSelect') as HTMLSelectElement;
  populateStratumOptions(navSelect);

  const navResetBtn = nav.querySelector('#navResetBtn');
  navResetBtn?.addEventListener('click', () => callbacks?.onResetView());
  navSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    callbacks?.onStratumSelect(val === '' ? null : Number(val));
  });

  hamburgerBtn?.addEventListener('click', toggleNavExpanded);
}

function toggleNavExpanded(): void {
  const navControls = document.getElementById('navControls');
  navExpanded = !navExpanded;
  hamburgerBtn?.classList.toggle('active', navExpanded);
  navControls?.classList.toggle('expanded', navExpanded);
}

function createLeftPanel(): void {
  if (!rootContainer) return;
  leftPanel = document.createElement('aside');
  leftPanel.className = 'left-panel';
  leftPanel.id = 'leftPanel';
  leftPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">地层属性查询</h2>
    </div>
    <div class="panel-content">
      <div class="control-group">
        <label class="control-label">地层名称</label>
        <select class="control-select" id="stratumSelect">
          <option value="">-- 全部地层 --</option>
        </select>
      </div>
      <div class="control-group">
        <label class="control-label">深度范围 (单位)</label>
        <div class="depth-inputs">
          <input type="number" class="control-input" id="depthMin" placeholder="最小" min="0" step="0.1">
          <span class="depth-sep">~</span>
          <input type="number" class="control-input" id="depthMax" placeholder="最大" step="0.1">
        </div>
      </div>
      <button class="control-btn" id="filterBtn">应用筛选</button>
      <button class="control-btn secondary" id="resetBtn">重置筛选</button>
      <div class="stats-section">
        <h3 class="stats-title">地层统计信息</h3>
        <div class="stats-content" id="statsContent">
          <p class="stats-placeholder">选择地层查看统计信息</p>
        </div>
      </div>
      <div class="cut-section">
        <h3 class="stats-title">当前剖面视厚度</h3>
        <div class="thickness-list" id="thicknessList">
          <p class="stats-placeholder">移动切割滑块查看</p>
        </div>
      </div>
    </div>
  `;
  rootContainer.appendChild(leftPanel);

  stratumSelect = leftPanel.querySelector('#stratumSelect') as HTMLSelectElement;
  statsContent = leftPanel.querySelector('#statsContent');
  thicknessList = leftPanel.querySelector('#thicknessList');
  populateStratumOptions(stratumSelect);

  const depthMin = leftPanel.querySelector('#depthMin') as HTMLInputElement;
  const depthMax = leftPanel.querySelector('#depthMax') as HTMLInputElement;
  const filterBtn = leftPanel.querySelector('#filterBtn');
  const resetBtn = leftPanel.querySelector('#resetBtn');

  stratumSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    callbacks?.onStratumSelect(val === '' ? null : Number(val));
  });

  filterBtn?.addEventListener('click', () => {
    const min = parseFloat(depthMin.value) || 0;
    const max = parseFloat(depthMax.value) || 100;
    callbacks?.onDepthRangeChange(min, max);
  });

  resetBtn?.addEventListener('click', () => {
    depthMin.value = '';
    depthMax.value = '';
    stratumSelect!.value = '';
    callbacks?.onStratumSelect(null);
    callbacks?.onDepthRangeChange(0, 100);
  });
}

function populateStratumOptions(select: HTMLSelectElement): void {
  if (!select) return;
  strataData.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = String(s.id);
    opt.textContent = `${s.name}`;
    opt.style.color = s.color;
    select.appendChild(opt);
  });
}

function createRightSlider(): void {
  if (!rootContainer) return;
  rightPanel = document.createElement('aside');
  rightPanel.className = 'right-panel';
  rightPanel.id = 'rightPanel';
  rightPanel.innerHTML = `
    <div class="slider-label-top">剖面切割控制</div>
    <div class="slider-container">
      <div class="slider-track-bg"></div>
      <div class="slider-fill" id="sliderFill"></div>
      <input type="range" class="vertical-slider" id="cutSlider" 
             min="0" max="100" step="1" value="50" orient="vertical">
      <div class="slider-ticks">
        <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
      </div>
    </div>
    <div class="slider-value" id="sliderValue">50%</div>
  `;
  rootContainer.appendChild(rightPanel);

  const slider = rightPanel.querySelector('#cutSlider') as HTMLInputElement;
  const sliderValue = rightPanel.querySelector('#sliderValue');
  const sliderFill = rightPanel.querySelector('#sliderFill') as HTMLElement | null;

  const updateSliderUI = (val: number) => {
    if (sliderValue) sliderValue.textContent = `${val}%`;
    if (sliderFill) {
      sliderFill.style.height = `${val}%`;
    }
    updateThicknessList(val);
  };

  slider.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    updateSliderUI(val);
    callbacks?.onCutChange(val);
  });

  updateSliderUI(50);
}

function createInfoPanel(): void {
  if (!rootContainer) return;
  infoPanel = document.createElement('div');
  infoPanel.className = 'info-panel';
  infoPanel.id = 'infoPanel';
  infoPanel.style.display = 'none';
  infoPanel.innerHTML = `
    <div class="info-panel-content">
      <div class="info-header">
        <span class="info-color-dot" id="infoColorDot"></span>
        <h3 class="info-title" id="infoTitle"></h3>
      </div>
      <div class="info-body">
        <div class="info-row">
          <span class="info-label">深度位置：</span>
          <span class="info-value" id="infoDepth"></span>
        </div>
        <div class="info-row">
          <span class="info-label">地质年代：</span>
          <span class="info-value" id="infoAge"></span>
        </div>
        <div class="info-row">
          <span class="info-label">地层厚度：</span>
          <span class="info-value" id="infoThickness"></span>
        </div>
        <div class="info-section">
          <span class="info-label">岩性描述：</span>
          <p class="info-text" id="infoLithology"></p>
        </div>
      </div>
    </div>
  `;
  rootContainer.appendChild(infoPanel);
}

export function showInfoPanel(data: PanelData): void {
  if (!infoPanel) return;

  const dot = infoPanel.querySelector('#infoColorDot') as HTMLElement;
  const title = infoPanel.querySelector('#infoTitle');
  const depth = infoPanel.querySelector('#infoDepth');
  const age = infoPanel.querySelector('#infoAge');
  const thickness = infoPanel.querySelector('#infoThickness');
  const lithology = infoPanel.querySelector('#infoLithology');

  dot.style.backgroundColor = data.stratum.color;
  if (title) title.textContent = data.stratum.name;
  if (depth) depth.textContent = `${data.depth.toFixed(2)} 单位`;
  if (age) age.textContent = data.stratum.age;
  if (thickness) thickness.textContent = `${data.stratum.thickness.toFixed(2)} 单位`;
  if (lithology) lithology.textContent = data.stratum.lithology;

  const panelW = 280;
  const panelH = 240;
  const margin = 16;
  let posX = data.screenX + 20;
  let posY = data.screenY - panelH / 2;

  const maxX = window.innerWidth - panelW - margin;
  const maxY = window.innerHeight - panelH - margin;
  if (posX > maxX) posX = data.screenX - panelW - 20;
  posX = Math.max(margin, Math.min(posX, maxX));
  posY = Math.max(margin, Math.min(posY, maxY));

  infoPanel.style.left = `${posX}px`;
  infoPanel.style.top = `${posY}px`;
  infoPanel.style.display = 'block';

  infoPanel.classList.remove('panel-closing');
  void infoPanel.offsetWidth;
  infoPanel.classList.add('panel-opening');
}

export function hideInfoPanel(): void {
  if (!infoPanel) return;
  if (infoPanel.style.display === 'none') return;

  infoPanel.classList.remove('panel-opening');
  infoPanel.classList.add('panel-closing');

  setTimeout(() => {
    if (infoPanel) {
      infoPanel.style.display = 'none';
      infoPanel.classList.remove('panel-closing');
    }
  }, 200);
}

function isClickInsideInfoPanel(target: EventTarget | null): boolean {
  if (!infoPanel) return false;
  return infoPanel.contains(target as Node);
}

function createMobileFAB(): void {
  if (!rootContainer) return;
  mobileFAB = document.createElement('div');
  mobileFAB.className = 'mobile-fab';
  mobileFAB.id = 'mobileFAB';
  mobileFAB.innerHTML = `
    <button class="fab-btn" id="fabFilter" title="地层筛选">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
    </button>
    <button class="fab-btn" id="fabCut" title="剖面切割">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2v20M2 12h20"/>
      </svg>
    </button>
    <button class="fab-btn" id="fabReset" title="重置视角">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>
  `;
  rootContainer.appendChild(mobileFAB);

  mobileFAB.querySelector('#fabReset')?.addEventListener('click', () => {
    callbacks?.onResetView();
  });
  mobileFAB.querySelector('#fabFilter')?.addEventListener('click', () => {
    toggleMobilePanel('left');
  });
  mobileFAB.querySelector('#fabCut')?.addEventListener('click', () => {
    toggleMobilePanel('right');
  });
}

function toggleMobilePanel(side: 'left' | 'right'): void {
  if (side === 'left') {
    leftPanel?.classList.toggle('mobile-visible');
    rightPanel?.classList.remove('mobile-visible');
  } else {
    rightPanel?.classList.toggle('mobile-visible');
    leftPanel?.classList.remove('mobile-visible');
  }
}

function bindGlobalEvents(): void {
  document.addEventListener('click', handleGlobalClick, true);
  window.addEventListener('resize', applyResponsiveLayout);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideInfoPanel();
    }
  });
}

function handleGlobalClick(e: MouseEvent): void {
  if (!infoPanel || infoPanel.style.display === 'none') return;
  if (isClickInsideInfoPanel(e.target)) return;

  const canvas = document.querySelector('canvas');
  if (canvas && canvas.contains(e.target as Node)) {
    const navEl = document.getElementById('topNav');
    const leftEl = document.getElementById('leftPanel');
    const rightEl = document.getElementById('rightPanel');
    const fabEl = document.getElementById('mobileFAB');

    const clickedOnUI =
      (navEl && navEl.contains(e.target as Node)) ||
      (leftEl && leftEl.contains(e.target as Node)) ||
      (rightEl && rightEl.contains(e.target as Node)) ||
      (fabEl && fabEl.contains(e.target as Node));

    if (!clickedOnUI) {
      hideInfoPanel();
    }
  } else {
    const navEl = document.getElementById('topNav');
    const leftEl = document.getElementById('leftPanel');
    const rightEl = document.getElementById('rightPanel');
    const fabEl = document.getElementById('mobileFAB');

    const clickedOnUI =
      (navEl && navEl.contains(e.target as Node)) ||
      (leftEl && leftEl.contains(e.target as Node)) ||
      (rightEl && rightEl.contains(e.target as Node)) ||
      (fabEl && fabEl.contains(e.target as Node));

    if (!clickedOnUI) {
      hideInfoPanel();
    }
  }
}

export function updateStatsPanel(stats: StratumStats | null): void {
  if (!statsContent) return;
  if (!stats) {
    statsContent.innerHTML = '<p class="stats-placeholder">选择地层查看统计信息</p>';
    return;
  }
  statsContent.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">平均厚度</span>
      <span class="stat-value">${stats.avgThickness.toFixed(2)}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">最小深度</span>
      <span class="stat-value">${stats.minDepth.toFixed(2)}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">最大深度</span>
      <span class="stat-value">${stats.maxDepth.toFixed(2)}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">估算面积</span>
      <span class="stat-value">${stats.estimatedArea.toFixed(2)}</span>
    </div>
  `;
}

export function updateThicknessList(cutPercent: number): void {
  if (!thicknessList) return;
  if (strataData.length === 0) {
    thicknessList.innerHTML = '<p class="stats-placeholder">移动切割滑块查看</p>';
    return;
  }

  const rows = strataData.map((s) => {
    const t = calculateCutThickness(s, cutPercent);
    return `
      <div class="stat-row thickness-row">
        <span class="stat-label" style="color:${s.color}">${s.name}</span>
        <span class="stat-value">${t.toFixed(2)}</span>
      </div>
    `;
  }).join('');
  thicknessList.innerHTML = rows;
}

export function updateSelectedStratumUI(id: number | null): void {
  if (stratumSelect) {
    stratumSelect.value = id === null ? '' : String(id);
  }
  const navSelect = document.getElementById('navStratumSelect') as HTMLSelectElement | null;
  if (navSelect) {
    navSelect.value = id === null ? '' : String(id);
  }
}

function applyResponsiveLayout(): void {
  const w = window.innerWidth;
  const nav = document.getElementById('topNav');
  const left = document.getElementById('leftPanel');
  const right = document.getElementById('rightPanel');
  const fab = document.getElementById('mobileFAB');
  const navControls = document.getElementById('navControls');

  if (w >= 1440) {
    nav?.classList.remove('tablet-mode');
    left?.classList.remove('hidden');
    right?.classList.remove('hidden');
    fab?.classList.remove('visible');
    navControls?.classList.remove('inline');
    if (navExpanded) {
      navExpanded = false;
      hamburgerBtn?.classList.remove('active');
      navControls?.classList.remove('expanded');
    }
  } else if (w >= 768) {
    nav?.classList.add('tablet-mode');
    left?.classList.add('hidden');
    right?.classList.remove('hidden');
    fab?.classList.remove('visible');
    navControls?.classList.add('inline');
  } else {
    nav?.classList.add('tablet-mode');
    left?.classList.add('hidden');
    right?.classList.add('hidden');
    fab?.classList.add('visible');
    navControls?.classList.remove('inline');
    left?.classList.remove('mobile-visible');
    right?.classList.remove('mobile-visible');
  }
}
