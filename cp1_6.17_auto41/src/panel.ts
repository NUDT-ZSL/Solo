import { MoleculeData, AtomElement, CPK_CSS, countAtoms, countActiveBonds } from './models';

interface PanelState {
  molecule: MoleculeData | null;
  totalBreaks: number;
}

let state: PanelState = {
  molecule: null,
  totalBreaks: 0,
};

let panelEl: HTMLElement | null = null;
let drawerToggleBtn: HTMLElement | null = null;
let drawerOpen = false;

export function initPanel(container: HTMLElement) {
  panelEl = document.createElement('div');
  panelEl.className = 'info-panel';

  drawerToggleBtn = document.createElement('button');
  drawerToggleBtn.className = 'drawer-toggle';
  drawerToggleBtn.innerHTML = '&#9776; 信息';
  drawerToggleBtn.style.display = 'none';
  drawerToggleBtn.addEventListener('click', () => {
    drawerOpen = !drawerOpen;
    if (panelEl) {
      panelEl.classList.toggle('drawer-open', drawerOpen);
    }
  });

  container.appendChild(drawerToggleBtn);
  container.appendChild(panelEl);

  render();
  setupResponsive();
}

function render() {
  if (!panelEl) return;

  const mol = state.molecule;
  const atomCounts = mol ? countAtoms(mol) : { [AtomElement.C]: 0, [AtomElement.H]: 0, [AtomElement.O]: 0, [AtomElement.N]: 0 };
  const activeBonds = mol ? countActiveBonds(mol) : 0;

  const atomList = [
    { el: AtomElement.C, symbol: 'C', name: '碳' },
    { el: AtomElement.H, symbol: 'H', name: '氢' },
    { el: AtomElement.O, symbol: 'O', name: '氧' },
    { el: AtomElement.N, symbol: 'N', name: '氮' },
  ].filter(item => mol ? atomCounts[item.el] > 0 : true);

  panelEl.innerHTML = `
    <div class="panel-header">
      <h2>${mol?.name || '未选择分子'}</h2>
      <div class="formula">${mol?.formula || ''}</div>
    </div>

    <div class="panel-section">
      <div class="section-title">原子组成</div>
      <div class="atom-list">
        ${atomList.map(item => `
          <div class="atom-item">
            <span class="atom-icon" style="background: ${CPK_CSS[item.el]}"></span>
            <span class="atom-symbol">${item.symbol}</span>
            <span class="atom-name">${item.name}</span>
            <span class="atom-count">× ${atomCounts[item.el]}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">化学键统计</div>
      <div class="bond-stats">
        <div class="bond-row">
          <span>剩余完整键数</span>
          <span class="bond-count">${activeBonds}</span>
        </div>
        <div class="bond-row">
          <span>已拆解</span>
          <span>${state.totalBreaks}</span>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <div class="tips-title">操作提示</div>
      <ul class="tips-list">
        <li>左键拖拽：旋转视角</li>
        <li>滚轮：缩放（0.3×-3×）</li>
        <li>中键拖拽：平移视角</li>
        <li>点击钳子工具后点击化学键：拆解</li>
      </ul>
    </div>
  `;
}

export function setMolecule(mol: MoleculeData) {
  state.molecule = mol;
  state.totalBreaks = 0;
  render();
}

export function notifyBondBroken() {
  state.totalBreaks++;
  render();
}

function setupResponsive() {
  const update = () => {
    const w = window.innerWidth;
    if (!panelEl || !drawerToggleBtn) return;

    if (w <= 768) {
      drawerToggleBtn.style.display = 'block';
      panelEl.classList.remove('panel-wide', 'panel-medium');
      panelEl.classList.add('panel-drawer');
    } else if (w <= 1280) {
      drawerToggleBtn.style.display = 'none';
      panelEl.classList.remove('panel-wide', 'panel-drawer', 'drawer-open');
      panelEl.classList.add('panel-medium');
      drawerOpen = false;
    } else {
      drawerToggleBtn.style.display = 'none';
      panelEl.classList.remove('panel-medium', 'panel-drawer', 'drawer-open');
      panelEl.classList.add('panel-wide');
      drawerOpen = false;
    }
  };

  window.addEventListener('resize', update);
  update();
}
