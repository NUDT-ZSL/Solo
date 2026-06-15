export interface UIPanelData {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  minElevation: number;
  maxElevation: number;
  vertexCount: number;
  fps: number;
  lodLevel: 'high' | 'medium' | 'low';
  contourEnabled: boolean;
  contourInterval: number;
}

export interface UIPanelCallbacks {
  onResetCamera: () => void;
  onToggleContours: (enabled: boolean) => void;
  onContourIntervalChange: (interval: number) => void;
}

export function createUIPanel(container: HTMLElement, callbacks: UIPanelCallbacks): {
  update: (data: UIPanelData) => void;
  updateProbe: (x: number, y: number, z: number, elevation: number) => void;
  hideProbe: () => void;
  showLODIndicator: (level: string, vertexCount: number) => void;
  hideLODIndicator: () => void;
  root: HTMLElement;
} {
  const panel = container;

  panel.innerHTML = `
    <div class="panel-title"><span class="status-dot"></span>地形探索器</div>

    <div class="panel-section">
      <div class="panel-section-title">相机坐标</div>
      <div class="panel-row">
        <span class="panel-label">X</span>
        <span class="panel-value" data-role="cam-x">0.00</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Y</span>
        <span class="panel-value" data-role="cam-y">0.00</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Z</span>
        <span class="panel-value" data-role="cam-z">0.00</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">地形统计</div>
      <div class="panel-row">
        <span class="panel-label">最低海拔</span>
        <span class="panel-value" data-role="min-elev">0 m</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">最高海拔</span>
        <span class="panel-value" data-role="max-elev">0 m</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">顶点数</span>
        <span class="panel-value" data-role="vertex-count">0</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">性能</div>
      <div class="panel-row">
        <span class="panel-label">帧率</span>
        <span class="panel-value" data-role="fps-val">0 FPS</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">LOD</span>
        <span class="panel-value" data-role="lod-val">最高</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">等高线</div>
      <button class="btn-contour" data-role="btn-contour">开启等高线</button>
      <div class="contour-interval">
        <label>间隔 (m)</label>
        <input type="number" data-role="contour-interval" value="50" min="10" max="500" step="10" />
      </div>
    </div>

    <button class="btn-reset" data-role="btn-reset">重置视角</button>
  `;

  const btnReset = panel.querySelector('[data-role="btn-reset"]') as HTMLButtonElement;
  const btnContour = panel.querySelector('[data-role="btn-contour"]') as HTMLButtonElement;
  const intervalInput = panel.querySelector('[data-role="contour-interval"]') as HTMLInputElement;

  btnReset.addEventListener('click', () => {
    callbacks.onResetCamera();
  });

  btnContour.addEventListener('click', () => {
    const enabled = !btnContour.classList.contains('active');
    btnContour.classList.toggle('active', enabled);
    btnContour.textContent = enabled ? '关闭等高线' : '开启等高线';
    callbacks.onToggleContours(enabled);
  });

  intervalInput.addEventListener('change', () => {
    const val = parseInt(intervalInput.value, 10);
    if (!isNaN(val) && val >= 10 && val <= 500) {
      callbacks.onContourIntervalChange(val);
    }
  });

  function update(data: UIPanelData): void {
    const camX = panel.querySelector('[data-role="cam-x"]') as HTMLElement;
    const camY = panel.querySelector('[data-role="cam-y"]') as HTMLElement;
    const camZ = panel.querySelector('[data-role="cam-z"]') as HTMLElement;
    const minElev = panel.querySelector('[data-role="min-elev"]') as HTMLElement;
    const maxElev = panel.querySelector('[data-role="max-elev"]') as HTMLElement;
    const vertexCount = panel.querySelector('[data-role="vertex-count"]') as HTMLElement;
    const fpsVal = panel.querySelector('[data-role="fps-val"]') as HTMLElement;
    const lodVal = panel.querySelector('[data-role="lod-val"]') as HTMLElement;

    if (camX) camX.textContent = data.cameraX.toFixed(1);
    if (camY) camY.textContent = data.cameraY.toFixed(1);
    if (camZ) camZ.textContent = data.cameraZ.toFixed(1);
    if (minElev) minElev.textContent = `${data.minElevation.toFixed(1)} m`;
    if (maxElev) maxElev.textContent = `${data.maxElevation.toFixed(1)} m`;
    if (vertexCount) vertexCount.textContent = data.vertexCount.toLocaleString();
    if (fpsVal) {
      fpsVal.textContent = `${data.fps} FPS`;
      if (data.fps >= 45) fpsVal.style.color = '#4ade80';
      else if (data.fps >= 30) fpsVal.style.color = '#f0a050';
      else fpsVal.style.color = '#f05050';
    }
    if (lodVal) {
      const labels: Record<string, string> = { high: '最高', medium: '中等', low: '最低' };
      lodVal.textContent = labels[data.lodLevel] || '最高';
      lodVal.style.color = data.lodLevel === 'high' ? '#4ade80' : data.lodLevel === 'medium' ? '#f0a050' : '#f05050';
    }
  }

  function updateProbe(x: number, y: number, z: number, elevation: number): void {
    const tooltip = document.getElementById('probe-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = `X: ${x.toFixed(1)}&nbsp;&nbsp;Y: ${y.toFixed(1)}&nbsp;&nbsp;Z: ${z.toFixed(1)}<br/>海拔: ${elevation.toFixed(1)} m`;
    tooltip.classList.add('visible');
  }

  function hideProbe(): void {
    const tooltip = document.getElementById('probe-tooltip');
    if (tooltip) tooltip.classList.remove('visible');
  }

  function showLODIndicator(level: string, vertexCount: number): void {
    const indicator = document.getElementById('lod-indicator');
    if (!indicator) return;
    const labels: Record<string, string> = { high: '最高', medium: '中等', low: '最低' };
    indicator.textContent = `LOD: ${labels[level] || level} (${vertexCount.toLocaleString()} 顶点)`;
    indicator.classList.add('visible');
    setTimeout(() => indicator.classList.remove('visible'), 3000);
  }

  function hideLODIndicator(): void {
    const indicator = document.getElementById('lod-indicator');
    if (indicator) indicator.classList.remove('visible');
  }

  return { update, updateProbe, hideProbe, showLODIndicator, hideLODIndicator, root: panel };
}
