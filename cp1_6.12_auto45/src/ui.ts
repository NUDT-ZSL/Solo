export interface UIHandlers {
  onUnfold: () => void;
  onRestore: () => void;
  onSave: () => void;
  onModelChange: (modelName: string) => void;
}

export class UIManager {
  private btnUnfold: HTMLButtonElement;
  private btnRestore: HTMLButtonElement;
  private btnSave: HTMLButtonElement;
  private modelSelect: HTMLSelectElement;
  private creaseCountEl: HTMLElement;
  private undoCountEl: HTMLElement;
  private infoPanel: HTMLElement;
  private hamburger: HTMLButtonElement;
  private toolbar: HTMLElement;
  private handlers: UIHandlers;
  private infoTimeout: number | null = null;
  private mobileOpen: boolean = false;

  constructor(handlers: UIHandlers) {
    this.handlers = handlers;
    this.btnUnfold = document.getElementById('btnUnfold') as HTMLButtonElement;
    this.btnRestore = document.getElementById('btnRestore') as HTMLButtonElement;
    this.btnSave = document.getElementById('btnSave') as HTMLButtonElement;
    this.modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
    this.creaseCountEl = document.getElementById('creaseCount') as HTMLElement;
    this.undoCountEl = document.getElementById('undoCount') as HTMLElement;
    this.infoPanel = document.getElementById('infoPanel') as HTMLElement;
    this.hamburger = document.getElementById('hamburger') as HTMLButtonElement;
    this.toolbar = document.getElementById('toolbar') as HTMLElement;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.btnUnfold.addEventListener('click', () => {
      this.btnUnfold.style.transform = 'scale(0.9)';
      setTimeout(() => { this.btnUnfold.style.transform = ''; }, 150);
      this.handlers.onUnfold();
      this.showInfo('模型展开中...');
    });
    this.btnRestore.addEventListener('click', () => {
      this.btnRestore.style.transform = 'scale(0.9)';
      setTimeout(() => { this.btnRestore.style.transform = ''; }, 150);
      this.handlers.onRestore();
      this.showInfo('模型已还原至上次保存');
    });
    this.btnSave.addEventListener('click', () => {
      this.btnSave.style.transform = 'scale(0.9)';
      setTimeout(() => { this.btnSave.style.transform = ''; }, 150);
      this.handlers.onSave();
      this.showInfo('状态已保存 ✓');
    });
    this.modelSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.handlers.onModelChange(target.value);
      this.showInfo(`已切换模型: ${target.options[target.selectedIndex].text}`);
    });
    this.hamburger.addEventListener('click', () => {
      this.mobileOpen = !this.mobileOpen;
      if (this.mobileOpen) {
        this.toolbar.classList.add('mobile-open');
      } else {
        this.toolbar.classList.remove('mobile-open');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.showInfo('撤销上一步操作');
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'u') {
          e.preventDefault();
          this.handlers.onUnfold();
          this.showInfo('模型展开中...');
        } else if (key === 'r') {
          e.preventDefault();
          this.handlers.onRestore();
          this.showInfo('模型已还原至上次保存');
        } else if (key === 's') {
          e.preventDefault();
          this.handlers.onSave();
          this.showInfo('状态已保存 ✓');
        }
      }
    });
  }

  updateStatus(creaseCount: number, undoCount: number): void {
    this.creaseCountEl.textContent = String(creaseCount);
    this.undoCountEl.textContent = String(undoCount);
  }

  showFaceInfo(faceIndex: number, normal: { x: number; y: number; z: number }, adjacents: number[], area: number): void {
    const nx = normal.x.toFixed(3);
    const ny = normal.y.toFixed(3);
    const nz = normal.z.toFixed(3);
    this.infoPanel.innerHTML =
      `<strong>面片 #${faceIndex}</strong> &nbsp;|&nbsp; ` +
      `法线: (${nx}, ${ny}, ${nz}) &nbsp;|&nbsp; ` +
      `相邻面: [${adjacents.join(', ')}] &nbsp;|&nbsp; ` +
      `面积: ${area.toFixed(3)}`;
    this.infoPanel.classList.add('visible');
    if (this.infoTimeout) clearTimeout(this.infoTimeout);
  }

  hideFaceInfo(): void {
    if (this.infoTimeout) clearTimeout(this.infoTimeout);
    this.infoTimeout = window.setTimeout(() => {
      this.infoPanel.classList.remove('visible');
    }, 800);
  }

  showInfo(text: string): void {
    this.infoPanel.textContent = text;
    this.infoPanel.classList.add('visible');
    if (this.infoTimeout) clearTimeout(this.infoTimeout);
    this.infoTimeout = window.setTimeout(() => {
      this.infoPanel.classList.remove('visible');
    }, 2000);
  }

  showCreaseInfo(creaseIndex: number, angle: number, groupId: number): void {
    this.infoPanel.innerHTML =
      `<strong>折痕 #${creaseIndex}</strong> &nbsp;|&nbsp; ` +
      `角度: <span style="color:#00d4ff">${angle.toFixed(1)}°</span> &nbsp;|&nbsp; ` +
      `组ID: ${groupId}`;
    this.infoPanel.classList.add('visible');
    if (this.infoTimeout) clearTimeout(this.infoTimeout);
  }
}
