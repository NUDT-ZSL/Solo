import { MoleculeData, Atom, Bond, getAtomNeighbors } from './moleculeData';

export interface UIManagerCallbacks {
  onMoleculeChange: (name: string) => void;
  onAtomSelect: (atomId: string | null) => void;
  onBondSelect: (bondId: string | null) => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UIManagerCallbacks;
  private currentMolecule: MoleculeData | null = null;
  private sidebar: HTMLElement | null = null;
  private infoPanel: HTMLElement | null = null;
  private selectorContainer: HTMLElement | null = null;
  private atomsListEl: HTMLElement | null = null;
  private bondsListEl: HTMLElement | null = null;
  private selectedAtomId: string | null = null;
  private selectedBondId: string | null = null;

  constructor(container: HTMLElement, callbacks: UIManagerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createUI();
  }

  private createUI(): void {
    this.createMoleculeSelector();
    this.createSidebar();
    this.createInfoPanel();
    this.addStyles();
  }

  private createMoleculeSelector(): void {
    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'selector-container';
    selectorContainer.innerHTML = `
      <div class="selector-wrapper">
        <label for="molecule-select">选择分子：</label>
        <select id="molecule-select">
          <option value="methane">甲烷 (CH₄)</option>
          <option value="ethanol">乙醇 (C₂H₅OH)</option>
          <option value="benzene">苯 (C₆H₆)</option>
        </select>
      </div>
    `;

    this.container.appendChild(selectorContainer);
    this.selectorContainer = selectorContainer;

    const select = selectorContainer.querySelector('#molecule-select') as HTMLSelectElement;
    select.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.callbacks.onMoleculeChange(value);
    });
  }

  private createSidebar(): void {
    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h3>分子结构</h3>
      </div>
      <div class="sidebar-content">
        <div class="list-section">
          <h4>原子</h4>
          <div class="atom-list" id="atom-list"></div>
        </div>
        <div class="list-section">
          <h4>化学键</h4>
          <div class="bond-list" id="bond-list"></div>
        </div>
      </div>
    `;

    this.container.appendChild(sidebar);
    this.sidebar = sidebar;
    this.atomsListEl = sidebar.querySelector('#atom-list');
    this.bondsListEl = sidebar.querySelector('#bond-list');
  }

  private createInfoPanel(): void {
    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    infoPanel.style.transform = 'translateX(100%)';
    infoPanel.innerHTML = `
      <div class="info-header">
        <h3>详细信息</h3>
        <button class="close-btn" id="close-info">×</button>
      </div>
      <div class="info-content" id="info-content">
        <p class="placeholder">点击左侧列表查看详细信息</p>
      </div>
    `;

    this.container.appendChild(infoPanel);
    this.infoPanel = infoPanel;

    const closeBtn = infoPanel.querySelector('#close-info');
    closeBtn?.addEventListener('click', () => {
      this.hideInfoPanel();
      this.clearSelection();
    });
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #selector-container {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
      }

      .selector-wrapper {
        background: rgba(15, 12, 41, 0.85);
        backdrop-filter: blur(10px);
        padding: 12px 24px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .selector-wrapper label {
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
      }

      #molecule-select {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
      }

      #molecule-select:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      #molecule-select option {
        background: #1a1636;
        color: white;
      }

      #sidebar {
        position: absolute;
        left: 0;
        top: 0;
        width: 280px;
        height: 100%;
        background: rgba(15, 12, 41, 0.85);
        backdrop-filter: blur(10px);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 100;
        display: flex;
        flex-direction: column;
        box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3);
      }

      .sidebar-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .sidebar-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: white;
      }

      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .list-section {
        margin-bottom: 24px;
      }

      .list-section h4 {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .atom-list, .bond-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .list-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }

      .list-item:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.15);
      }

      .list-item.selected {
        background: rgba(255, 255, 0, 0.15);
        border-color: rgba(255, 255, 0, 0.4);
      }

      .atom-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .item-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
        flex: 1;
      }

      .bond-icon {
        width: 12px;
        height: 3px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 2px;
        flex-shrink: 0;
      }

      #info-panel {
        position: absolute;
        right: 0;
        top: 0;
        width: 320px;
        height: 100%;
        background: rgba(15, 12, 41, 0.9);
        backdrop-filter: blur(10px);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 100;
        display: flex;
        flex-direction: column;
        box-shadow: -2px 0 20px rgba(0, 0, 0, 0.3);
        transition: transform 0.25s ease-out;
      }

      .info-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .info-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: white;
      }

      .close-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 28px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .info-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .info-content .placeholder {
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        text-align: center;
        margin-top: 40px;
      }

      .info-item {
        margin-bottom: 16px;
      }

      .info-item .label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .info-item .value {
        font-size: 15px;
        color: white;
        font-weight: 500;
      }

      .info-item .value .atom-symbol {
        display: inline-block;
        width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
        margin-right: 8px;
        vertical-align: middle;
      }

      .coord-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 8px;
      }

      .coord-item {
        background: rgba(255, 255, 255, 0.05);
        padding: 8px;
        border-radius: 6px;
        text-align: center;
      }

      .coord-item .coord-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 4px;
      }

      .coord-item .coord-value {
        font-size: 14px;
        color: white;
        font-family: monospace;
      }

      .neighbor-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
      }

      .neighbor-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
      }

      .neighbor-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .info-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 16px 0;
      }

      @media (max-width: 768px) {
        #sidebar {
          width: 220px;
        }

        #info-panel {
          width: 260px;
        }

        .selector-wrapper {
          padding: 8px 16px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  public updateMolecule(molecule: MoleculeData): void {
    this.currentMolecule = molecule;
    this.renderAtomList();
    this.renderBondList();
    this.clearSelection();
  }

  private renderAtomList(): void {
    if (!this.atomsListEl || !this.currentMolecule) return;

    this.atomsListEl.innerHTML = '';

    for (const atom of this.currentMolecule.atoms) {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.dataset.id = atom.id;
      item.dataset.type = 'atom';

      const dot = document.createElement('div');
      dot.className = 'atom-dot';
      dot.style.backgroundColor = this.getElementColor(atom.element);

      const label = document.createElement('span');
      label.className = 'item-label';
      label.textContent = atom.name;

      item.appendChild(dot);
      item.appendChild(label);

      item.addEventListener('click', () => {
        this.selectAtom(atom.id);
      });

      this.atomsListEl.appendChild(item);
    }
  }

  private renderBondList(): void {
    if (!this.bondsListEl || !this.currentMolecule) return;

    this.bondsListEl.innerHTML = '';

    for (const bond of this.currentMolecule.bonds) {
      const atom1 = this.currentMolecule.atoms.find(a => a.id === bond.atom1);
      const atom2 = this.currentMolecule.atoms.find(a => a.id === bond.atom2);

      const item = document.createElement('div');
      item.className = 'list-item';
      item.dataset.id = bond.id;
      item.dataset.type = 'bond';

      const icon = document.createElement('div');
      icon.className = 'bond-icon';

      const label = document.createElement('span');
      label.className = 'item-label';
      label.textContent = `${atom1?.id || ''} - ${atom2?.id || ''}`;

      item.appendChild(icon);
      item.appendChild(label);

      item.addEventListener('click', () => {
        this.selectBond(bond.id);
      });

      this.bondsListEl.appendChild(item);
    }
  }

  private getElementColor(element: string): string {
    const colors: Record<string, string> = {
      'C': '#555555',
      'O': '#FF3333',
      'H': '#FFFFFF'
    };
    return colors[element] || '#888888';
  }

  private selectAtom(atomId: string): void {
    this.clearSelectionClasses();
    this.selectedAtomId = atomId;
    this.selectedBondId = null;

    const item = this.atomsListEl?.querySelector(`[data-id="${atomId}"]`);
    if (item) {
      item.classList.add('selected');
    }

    this.callbacks.onAtomSelect(atomId);
    this.showAtomInfo(atomId);
  }

  private selectBond(bondId: string): void {
    this.clearSelectionClasses();
    this.selectedBondId = bondId;
    this.selectedAtomId = null;

    const item = this.bondsListEl?.querySelector(`[data-id="${bondId}"]`);
    if (item) {
      item.classList.add('selected');
    }

    this.callbacks.onBondSelect(bondId);
    this.showBondInfo(bondId);
  }

  private clearSelectionClasses(): void {
    this.atomsListEl?.querySelectorAll('.list-item').forEach(el => {
      el.classList.remove('selected');
    });
    this.bondsListEl?.querySelectorAll('.list-item').forEach(el => {
      el.classList.remove('selected');
    });
  }

  private showAtomInfo(atomId: string): void {
    if (!this.currentMolecule || !this.infoPanel) return;

    const atom = this.currentMolecule.atoms.find(a => a.id === atomId);
    if (!atom) return;

    const neighbors = getAtomNeighbors(atomId, this.currentMolecule);

    const infoContent = this.infoPanel.querySelector('#info-content');
    if (!infoContent) return;

    const elementColor = this.getElementColor(atom.element);

    infoContent.innerHTML = `
      <div class="info-item">
        <div class="label">名称</div>
        <div class="value">
          <span class="atom-symbol" style="background: ${elementColor}; color: ${atom.element === 'H' || atom.element === 'O' ? '#000' : '#fff'}">${atom.element}</span>
          ${atom.name}
        </div>
      </div>
      <div class="info-item">
        <div class="label">元素类型</div>
        <div class="value">${this.getElementName(atom.element)}</div>
      </div>
      <div class="info-item">
        <div class="label">坐标</div>
        <div class="coord-grid">
          <div class="coord-item">
            <div class="coord-label">X</div>
            <div class="coord-value">${atom.x.toFixed(3)}</div>
          </div>
          <div class="coord-item">
            <div class="coord-label">Y</div>
            <div class="coord-value">${atom.y.toFixed(3)}</div>
          </div>
          <div class="coord-item">
            <div class="coord-label">Z</div>
            <div class="coord-value">${atom.z.toFixed(3)}</div>
          </div>
        </div>
      </div>
      <div class="info-divider"></div>
      <div class="info-item">
        <div class="label">相邻原子 (${neighbors.length})</div>
        <div class="neighbor-list">
          ${neighbors.map(n => `
            <div class="neighbor-item">
              <div class="neighbor-dot" style="background: ${this.getElementColor(n.element)}"></div>
              <span>${n.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.showInfoPanel();
  }

  private showBondInfo(bondId: string): void {
    if (!this.currentMolecule || !this.infoPanel) return;

    const bond = this.currentMolecule.bonds.find(b => b.id === bondId);
    if (!bond) return;

    const atom1 = this.currentMolecule.atoms.find(a => a.id === bond.atom1);
    const atom2 = this.currentMolecule.atoms.find(a => a.id === bond.atom2);

    const infoContent = this.infoPanel.querySelector('#info-content');
    if (!infoContent) return;

    infoContent.innerHTML = `
      <div class="info-item">
        <div class="label">化学键</div>
        <div class="value">${atom1?.name || ''} - ${atom2?.name || ''}</div>
      </div>
      <div class="info-item">
        <div class="label">键级</div>
        <div class="value">${bond.order ? (bond.order === 2 ? '双键' : '单键') : '单键'}</div>
      </div>
      <div class="info-divider"></div>
      <div class="info-item">
        <div class="label">原子1</div>
        <div class="neighbor-item">
          <div class="neighbor-dot" style="background: ${atom1 ? this.getElementColor(atom1.element) : '#888'}"></div>
          <span>${atom1?.name || ''}</span>
        </div>
      </div>
      <div class="info-item">
        <div class="label">原子2</div>
        <div class="neighbor-item">
          <div class="neighbor-dot" style="background: ${atom2 ? this.getElementColor(atom2.element) : '#888'}"></div>
          <span>${atom2?.name || ''}</span>
        </div>
      </div>
    `;

    this.showInfoPanel();
  }

  private getElementName(element: string): string {
    const names: Record<string, string> = {
      'C': '碳 (Carbon)',
      'O': '氧 (Oxygen)',
      'H': '氢 (Hydrogen)'
    };
    return names[element] || element;
  }

  private showInfoPanel(): void {
    if (this.infoPanel) {
      this.infoPanel.style.transform = 'translateX(0)';
    }
  }

  private hideInfoPanel(): void {
    if (this.infoPanel) {
      this.infoPanel.style.transform = 'translateX(100%)';
    }
  }

  private clearSelection(): void {
    this.selectedAtomId = null;
    this.selectedBondId = null;
    this.clearSelectionClasses();
    this.callbacks.onAtomSelect(null);
    this.callbacks.onBondSelect(null);
  }

  public dispose(): void {
    if (this.sidebar) {
      this.container.removeChild(this.sidebar);
    }
    if (this.infoPanel) {
      this.container.removeChild(this.infoPanel);
    }
    if (this.selectorContainer) {
      this.container.removeChild(this.selectorContainer);
    }
  }
}
