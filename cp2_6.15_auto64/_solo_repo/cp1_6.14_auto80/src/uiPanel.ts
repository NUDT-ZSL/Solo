import type {
  EventBus,
  VoxelsUpdatedData,
  MaterialChangedData,
  CameraChangedData,
  ExportSTLReadyData,
} from './eventBus';
import { MATERIALS, getMaterialById } from './voxelEngine';

export class UIPanel {
  private container: HTMLElement;
  private bus: EventBus;

  private toolbar!: HTMLDivElement;
  private materialSwatches!: HTMLDivElement;
  private sceneContainer!: HTMLDivElement;
  private infoPanel!: HTMLDivElement;
  private loadingOverlay!: HTMLDivElement;

  private countEl!: HTMLSpanElement;
  private materialNameEl!: HTMLSpanElement;
  private materialColorEl!: HTMLSpanElement;
  private azimuthEl!: HTMLSpanElement;
  private pitchEl!: HTMLSpanElement;

  private currentMaterialId: number = 0;
  private voxelCount: number = 0;
  private azimuth: number = 0;
  private pitch: number = 0;

  private swatchElements: HTMLDivElement[] = [];

  constructor(appRoot: HTMLElement, bus: EventBus) {
    this.container = appRoot;
    this.bus = bus;

    this.buildDOM();
    this.attachListeners();

    this.updateMaterialSelection(this.currentMaterialId);
    this.updateInfoPanel();

    this.bus.on('voxelsUpdated', this.handleVoxelsUpdated.bind(this));
    this.bus.on('cameraChanged', this.handleCameraChanged.bind(this));
    this.bus.on('materialChanged', this.handleMaterialChanged.bind(this));
    this.bus.on('exportSTL:ready', this.handleExportReady.bind(this));
  }

  public getSceneContainer(): HTMLElement {
    return this.sceneContainer;
  }

  private buildDOM(): void {
    const styleId = 'voxelcraft-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'vc-toolbar';

    const materialWrapper = document.createElement('div');
    materialWrapper.className = 'vc-material-wrapper';
    const materialLabel = document.createElement('span');
    materialLabel.className = 'vc-section-label';
    materialLabel.textContent = '材质';
    this.materialSwatches = document.createElement('div');
    this.materialSwatches.className = 'vc-material-swatches';
    MATERIALS.forEach((mat) => {
      const sw = document.createElement('div');
      sw.className = 'vc-material-swatch';
      sw.dataset.matId = String(mat.id);
      sw.title = mat.name;
      const inner = document.createElement('div');
      inner.className = 'vc-material-inner';
      inner.style.background = mat.color;
      if (mat.transparent) {
        inner.style.backgroundImage =
          'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)';
        inner.style.backgroundSize = '10px 10px';
        inner.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
        inner.style.backgroundColor = mat.color;
        inner.style.backgroundBlendMode = 'normal';
        const tint = document.createElement('div');
        tint.className = 'vc-material-tint';
        tint.style.background = mat.color;
        tint.style.opacity = String(mat.opacity ?? 0.6);
        inner.appendChild(tint);
      }
      sw.appendChild(inner);
      this.materialSwatches.appendChild(sw);
      this.swatchElements.push(sw);
    });
    materialWrapper.appendChild(materialLabel);
    materialWrapper.appendChild(this.materialSwatches);

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'vc-actions-group';

    const opLabel = document.createElement('span');
    opLabel.className = 'vc-section-label';
    opLabel.textContent = '操作';
    actionsGroup.appendChild(opLabel);

    const undoBtn = this.createIconBtn('↶', '撤销 (Ctrl+Z)', 'vc-undo-btn');
    const redoBtn = this.createIconBtn('↷', '重做 (Ctrl+Y)', 'vc-redo-btn');
    const clearBtn = this.createIconBtn('✕', '清空', 'vc-clear-btn');
    actionsGroup.appendChild(undoBtn);
    actionsGroup.appendChild(redoBtn);
    actionsGroup.appendChild(clearBtn);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'vc-btn-export';
    exportBtn.textContent = '导出 STL';
    actionsGroup.appendChild(exportBtn);

    this.toolbar.appendChild(materialWrapper);
    this.toolbar.appendChild(actionsGroup);

    this.sceneContainer = document.createElement('div');
    this.sceneContainer.className = 'vc-scene-container';

    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'vc-info-panel';
    this.infoPanel.innerHTML = `
      <div class="vc-info-row"><span class="vc-info-label">体素总数</span><span class="vc-info-value vc-count">0</span></div>
      <div class="vc-info-divider"></div>
      <div class="vc-info-row"><span class="vc-info-label">当前材质</span><span class="vc-info-value vc-mat-name">泥土 Dirt</span></div>
      <div class="vc-info-row"><span class="vc-info-label">色值</span><span class="vc-info-value vc-mat-color">#8B4513</span></div>
      <div class="vc-info-divider"></div>
      <div class="vc-info-row"><span class="vc-info-label">方位角</span><span class="vc-info-value vc-azimuth">0°</span></div>
      <div class="vc-info-row"><span class="vc-info-label">俯仰角</span><span class="vc-info-value vc-pitch">0°</span></div>
    `;
    this.countEl = this.infoPanel.querySelector('.vc-count')!;
    this.materialNameEl = this.infoPanel.querySelector('.vc-mat-name')!;
    this.materialColorEl = this.infoPanel.querySelector('.vc-mat-color')!;
    this.azimuthEl = this.infoPanel.querySelector('.vc-azimuth')!;
    this.pitchEl = this.infoPanel.querySelector('.vc-pitch')!;

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'vc-loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="vc-loading-ring"></div>
      <div class="vc-loading-text">正在导出 STL ...</div>
    `;
    this.loadingOverlay.style.display = 'none';

    this.container.appendChild(this.toolbar);
    this.container.appendChild(this.sceneContainer);
    this.container.appendChild(this.infoPanel);
    this.container.appendChild(this.loadingOverlay);
  }

  private createIconBtn(icon: string, title: string, cls: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `vc-icon-btn ${cls}`;
    btn.title = title;
    btn.innerHTML = `<span class="vc-icon-btn-inner">${icon}</span>`;
    return btn;
  }

  private attachListeners(): void {
    this.materialSwatches.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const sw = target.closest('.vc-material-swatch') as HTMLDivElement | null;
      if (!sw) return;
      const id = parseInt(sw.dataset.matId ?? '-1', 10);
      if (id < 0) return;
      this.selectMaterial(id);
    });

    const undoBtn = this.toolbar.querySelector('.vc-undo-btn') as HTMLButtonElement;
    const redoBtn = this.toolbar.querySelector('.vc-redo-btn') as HTMLButtonElement;
    const clearBtn = this.toolbar.querySelector('.vc-clear-btn') as HTMLButtonElement;
    const exportBtn = this.toolbar.querySelector('.vc-btn-export') as HTMLButtonElement;

    undoBtn.addEventListener('click', () => this.bus.emit('undo', undefined as any));
    redoBtn.addEventListener('click', () => this.bus.emit('redo', undefined as any));
    clearBtn.addEventListener('click', () => {
      if (this.voxelCount === 0) return;
      if (confirm('确定要清空所有体素吗？')) {
        this.bus.emit('clearAll', undefined as any);
      }
    });
    exportBtn.addEventListener('click', () => {
      if (this.voxelCount === 0) {
        alert('场景中还没有体素，无法导出！');
        return;
      }
      this.showLoading(true);
      this.bus.emit('exportSTL:request', undefined as any);
    });

    document.addEventListener('keydown', (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.bus.emit('undo', undefined as any);
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        this.bus.emit('redo', undefined as any);
      }
    });
  }

  private selectMaterial(id: number): void {
    if (id === this.currentMaterialId) return;
    this.updateMaterialSelection(id);
    this.bus.emit('materialChanged', { materialId: id });
    this.updateInfoPanel();
  }

  private handleMaterialChanged(data: MaterialChangedData): void {
    if (data.materialId === this.currentMaterialId) return;
    this.updateMaterialSelection(data.materialId);
    this.updateInfoPanel();
  }

  private updateMaterialSelection(id: number): void {
    this.currentMaterialId = id;
    this.swatchElements.forEach((sw) => {
      const swId = parseInt(sw.dataset.matId ?? '-1', 10);
      if (swId === id) {
        sw.classList.add('selected');
      } else {
        sw.classList.remove('selected');
      }
    });
  }

  private handleVoxelsUpdated(data: VoxelsUpdatedData): void {
    this.voxelCount = data.count;
    this.updateInfoPanel();
  }

  private handleCameraChanged(data: CameraChangedData): void {
    this.azimuth = data.azimuth;
    this.pitch = data.pitch;
    this.azimuthEl.textContent = `${this.azimuth.toFixed(1)}°`;
    this.pitchEl.textContent = `${this.pitch.toFixed(1)}°`;
  }

  private handleExportReady(data: ExportSTLReadyData): void {
    this.showLoading(false);
    this.downloadBlob(data.blob, data.filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    try {
      if (!blob || blob.size === 0) {
        console.error('[UIPanel] Blob is empty, download aborted.');
        alert('导出失败：生成的文件为空。');
        return;
      }
      console.log(`[UIPanel] Downloading ${filename}, size: ${blob.size} bytes`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('[UIPanel] Download error:', err);
      alert('下载失败，请查看控制台日志。');
    }
  }

  private updateInfoPanel(): void {
    this.countEl.textContent = String(this.voxelCount);
    const mat = getMaterialById(this.currentMaterialId);
    if (mat) {
      this.materialNameEl.textContent = mat.name;
      this.materialColorEl.textContent = mat.color.toUpperCase();
      this.materialColorEl.style.color = mat.color;
    }
  }

  private showLoading(show: boolean): void {
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  private getStyles(): string {
    return `
.vc-toolbar {
  height: 56px;
  min-height: 56px;
  width: 100%;
  background: #2c2c3a;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 16px;
  flex-wrap: nowrap;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  z-index: 10;
  position: relative;
}

.vc-section-label {
  color: #9ba0b8;
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-right: 10px;
  white-space: nowrap;
}

.vc-material-wrapper, .vc-actions-group {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 6px;
}

.vc-material-swatches {
  display: grid;
  grid-template-columns: repeat(12, 40px);
  gap: 6px;
  align-items: center;
}

.vc-material-swatch {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(255,255,255,0.03);
  padding: 3px;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
  flex-shrink: 0;
  overflow: hidden;
}
.vc-material-swatch:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-1px);
}
.vc-material-swatch.selected {
  border-color: #ffd700;
  background: rgba(255,215,0,0.1);
  box-shadow: 0 0 0 1px rgba(255,215,0,0.15), 0 0 12px rgba(255,215,0,0.25);
}
.vc-material-inner {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
  overflow: hidden;
}
.vc-material-tint {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.vc-icon-btn {
  width: 44px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #3d3d55;
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}
.vc-icon-btn:hover {
  background: #5a5a7a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.vc-icon-btn:active {
  transform: translateY(0);
}
.vc-icon-btn-inner {
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.vc-clear-btn .vc-icon-btn-inner {
  color: #ff9090;
}

.vc-btn-export {
  margin-left: 8px;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff6b6b, #ff5050);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  box-shadow: 0 2px 10px rgba(255,107,107,0.3);
  flex-shrink: 0;
}
.vc-btn-export:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(255,107,107,0.45);
  filter: brightness(1.05);
}
.vc-btn-export:active {
  transform: translateY(0);
}

.vc-scene-container {
  flex: 1;
  position: relative;
  width: 100%;
  overflow: hidden;
  min-height: 0;
}

.vc-info-panel {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 200px;
  background: rgba(30, 30, 46, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 14px 16px;
  color: #ffffff;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  z-index: 20;
}
.vc-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  gap: 10px;
}
.vc-info-label {
  color: #9ba0b8;
  font-size: 12px;
  letter-spacing: 0.2px;
}
.vc-info-value {
  color: #ffffff;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  max-width: 110px;
  text-align: right;
  word-break: break-word;
}
.vc-info-divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
  margin: 8px 0;
}

.vc-loading-overlay {
  position: absolute;
  inset: 56px 0 0 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}
.vc-loading-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid rgba(255, 215, 0, 0.18);
  border-top-color: #ffd700;
  border-right-color: #ffd700;
  animation: vc-spin 0.9s linear infinite;
  box-shadow: 0 0 24px rgba(255,215,0,0.25);
}
@keyframes vc-spin {
  to { transform: rotate(360deg); }
}
.vc-loading-text {
  color: #ffffff;
  font-size: 14px;
  letter-spacing: 0.6px;
}

@media (max-width: 1279px) and (min-width: 1024px) {
  .vc-toolbar {
    height: auto;
    min-height: 56px;
    flex-wrap: wrap;
    padding: 10px 16px;
    gap: 12px;
    row-gap: 10px;
  }
  .vc-info-panel {
    font-size: 14px;
  }
}
@media (max-width: 1023px) {
  .vc-toolbar {
    height: auto;
    min-height: 56px;
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 10px;
    row-gap: 8px;
  }
  .vc-material-swatches {
    grid-template-columns: repeat(6, 40px);
  }
  .vc-info-panel {
    width: 170px;
    padding: 12px 14px;
    font-size: 12px;
    right: 10px;
    bottom: 10px;
  }
  .vc-info-value {
    max-width: 90px;
  }
  .vc-section-label {
    display: none;
  }
}
`;
  }
}
