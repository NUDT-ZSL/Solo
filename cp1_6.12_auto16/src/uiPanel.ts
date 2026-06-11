import type { LODState } from './terrainRenderer';

export interface UIPanelCallbacks {
  onResetCamera: () => void;
  onToggleContours: (enabled: boolean) => void;
  onContourIntervalChange: (interval: number) => void;
}

export interface UIPanelData {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  minElevation: number;
  maxElevation: number;
  vertexCount: number;
  fps: number;
  lodState: LODState;
  contourEnabled: boolean;
}

export function createUIPanel(container: HTMLElement, callbacks: UIPanelCallbacks): {
  update: (data: UIPanelData) => void;
  root: HTMLElement;
} {
  const panel = container;

  panel.innerHTML = `
    <div class="panel-title"><span class="status-dot"></span>地形探索器</div>

    <div class="panel-section">
      <div class="panel-section-title">相机坐标</div>
      <div class="panel-row">
        <span class="panel-label">X</span>
        <span class="panel-value" id="cam-x">0.00</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Y</span>
        <span class="panel-value" id="cam-y">0.00</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Z</span>
        <span class="panel-value" id="cam-z">0.00</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">地形统计</div>
      <div class="panel-row">
        <span class="panel-label">最低海拔</span>
        <span class="panel-value" id="min-elev">0 m</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">最高海拔</span>
        <span class="panel-value" id="max-elev">0 m</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">顶点数</span>
        <span class="panel-value" id="vertex-count">0</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">性能</div>
      <div class="panel-row">
        <span class="panel-label">帧率</span>
        <span class="panel-value" id="fps-val">0 FPS</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">LOD</span>
        <span class="panel-value" id="lod-val">最高</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">等高线</div>
      <button class="btn-contour" id="btn-contour">开启等高线</button>
      <div class="contour-interval">
        <label>间隔 (m)</label>
        <input type="number" id="contour-interval" value="50" min="10" max="500" step="10" />
      </div>
    </div>

    <button class="btn-reset" id="btn-reset">重置视角</button>
  `;

  const btnReset = panel.querySelector('#btn-reset') as HTMLButtonElement;
  const btnContour = panel.querySelector('#btn-contour') as HTMLButtonElement;
  const intervalInput = panel.querySelector('#contour-interval') as HTMLInputElement;

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
    const camX = panel.querySelector('#cam-x') as HTMLElement;
    const camY = panel.querySelector('#cam-y') as HTMLElement;
    const camZ = panel.querySelector('#cam-z') as HTMLElement;
    const minElev = panel.querySelector('#min-elev') as HTMLElement;
    const maxElev = panel.querySelector('#max-elev') as HTMLElement;
    const vertexCount = panel.querySelector('#vertex-count') as HTMLElement;
    const fpsVal = panel.querySelector('#fps-val') as HTMLElement;
    const lodVal = panel.querySelector('#lod-val') as HTMLElement;

    camX.textContent = data.cameraX.toFixed(1);
    camY.textContent = data.cameraY.toFixed(1);
    camZ.textContent = data.cameraZ.toFixed(1);
    minElev.textContent = `${data.minElevation.toFixed(1)} m`;
    maxElev.textContent = `${data.maxElevation.toFixed(1)} m`;
    vertexCount.textContent = data.vertexCount.toLocaleString();
    fpsVal.textContent = `${data.fps} FPS`;
    fpsVal.style.color = data.fps >= 45 ? '#4ade80' : data.fps >= 30 ? '#f0a050' : '#f05050';
    lodVal.textContent = data.lodState.currentLevel === 'high' ? '最高' : '中等';
    lodVal.style.color = data.lodState.currentLevel === 'high' ? '#4ade80' : '#f0a050';
  }

  return { update, root: panel };
}
