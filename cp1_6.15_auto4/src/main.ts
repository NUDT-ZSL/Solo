import { CanvasEngine } from './canvas-engine';
import { ToolManager, ToolType } from './tool-manager';
import { LayerPanel } from './layer-panel';

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }

  #app {
    display: flex;
    width: 100%;
    height: 100%;
    background: #F5F7FA;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  }

  #toolbar {
    width: 64px;
    min-width: 64px;
    background: #FFFFFF;
    border-right: 1px solid #E8ECF0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    z-index: 10;
  }

  .toolbar-btn {
    width: 44px;
    height: 44px;
    border: none;
    background: transparent;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease, transform 0.15s ease;
    color: #6B7B8D;
    position: relative;
  }

  .toolbar-btn:hover {
    background-color: rgba(91, 127, 165, 0.1);
    color: #5B7FA5;
  }

  .toolbar-btn.active {
    background-color: rgba(91, 127, 165, 0.15);
    color: #5B7FA5;
    transform: scale(1.05);
  }

  .toolbar-btn.active::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: #5B7FA5;
    border-radius: 0 3px 3px 0;
  }

  .toolbar-btn svg {
    width: 22px;
    height: 22px;
  }

  .toolbar-divider {
    width: 32px;
    height: 1px;
    background: #E8ECF0;
    margin: 4px 0;
  }

  .toolbar-prop-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 6px;
    width: 100%;
  }

  .toolbar-prop-label {
    font-size: 10px;
    color: #9AA5B1;
    text-align: center;
    user-select: none;
  }

  .stroke-slider {
    -webkit-appearance: none;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #E8ECF0;
    outline: none;
  }

  .stroke-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #5B7FA5;
    cursor: pointer;
    border: 2px solid #FFFFFF;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .color-picker-wrapper {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #E8ECF0;
    cursor: pointer;
    position: relative;
  }

  .color-picker-wrapper input[type="color"] {
    position: absolute;
    top: -4px;
    left: -4px;
    width: 36px;
    height: 36px;
    border: none;
    cursor: pointer;
    opacity: 0;
  }

  .color-preview {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  #canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #FAFBFC;
  }

  .zoom-indicator {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: #FFFFFF;
    border-radius: 12px;
    padding: 6px 16px;
    font-size: 12px;
    color: #5B7FA5;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    user-select: none;
    z-index: 5;
    transition: opacity 0.2s;
  }

  .shortcut-hint {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: #FFFFFF;
    border-radius: 12px;
    padding: 8px 14px;
    font-size: 11px;
    color: #9AA5B1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    user-select: none;
    z-index: 5;
    line-height: 1.6;
  }

  .shortcut-hint kbd {
    display: inline-block;
    background: #F5F7FA;
    border: 1px solid #E8ECF0;
    border-radius: 4px;
    padding: 0 4px;
    font-family: inherit;
    font-size: 10px;
    margin: 0 2px;
  }

  #layer-panel {
    width: 260px;
    min-width: 260px;
    transition: width 0.3s ease, min-width 0.3s ease;
  }

  .layer-panel {
    width: 100%;
    height: 100%;
    background: #FFFFFF;
    border-left: 1px solid #E8ECF0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
  }

  .layer-panel.collapsed .layer-panel-list {
    display: none;
  }

  .layer-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #E8ECF0;
  }

  .layer-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #2D3748;
  }

  .layer-panel-toggle {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9AA5B1;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .layer-panel-toggle:hover {
    background: rgba(91, 127, 165, 0.1);
    color: #5B7FA5;
  }

  .layer-panel.collapsed .layer-panel-toggle svg {
    transform: rotate(-90deg);
  }

  .layer-panel-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .layer-panel-empty {
    text-align: center;
    color: #9AA5B1;
    font-size: 13px;
    padding: 24px 0;
  }

  .layer-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    margin-bottom: 2px;
  }

  .layer-item:hover, .layer-item.hover {
    background: rgba(91, 127, 165, 0.06);
  }

  .layer-item.selected {
    background: rgba(91, 127, 165, 0.12);
  }

  .layer-item.dragging {
    opacity: 0.4;
  }

  .layer-item.drag-over {
    border-top: 2px solid #5B7FA5;
  }

  .layer-item-thumb {
    width: 40px;
    height: 30px;
    border-radius: 4px;
    overflow: hidden;
    background: #F5F7FA;
    flex-shrink: 0;
  }

  .layer-item-thumb canvas {
    width: 100%;
    height: 100%;
  }

  .layer-item-info {
    flex: 1;
    min-width: 0;
  }

  .layer-item-name {
    display: block;
    font-size: 12px;
    color: #2D3748;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .layer-item-type {
    display: block;
    font-size: 10px;
    color: #9AA5B1;
    margin-top: 2px;
  }

  .layer-item-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .layer-item:hover .layer-item-actions {
    opacity: 1;
  }

  .layer-item-focus, .layer-item-delete {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9AA5B1;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .layer-item-focus:hover {
    background: rgba(91, 127, 165, 0.1);
    color: #5B7FA5;
  }

  .layer-item-delete:hover {
    background: rgba(229, 62, 62, 0.1);
    color: #E53E3E;
  }

  .tooltip {
    position: absolute;
    background: #2D3748;
    color: #FFFFFF;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 100;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .tooltip.show {
    opacity: 1;
  }

  @media (max-width: 1024px) {
    #layer-panel {
      width: 0;
      min-width: 0;
      overflow: hidden;
    }
  }
`;

const TOOL_ICONS: Record<string, string> = {
  freehand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
    <circle cx="11" cy="11" r="2"/>
  </svg>`,
  rectangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  'sticky-note': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
    <path d="M14 3v6h6"/>
    <path d="M8 13h8"/>
    <path d="M8 17h5"/>
  </svg>`,
  select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    <path d="M13 13l6 6"/>
  </svg>`,
};

const TOOL_LABELS: Record<string, string> = {
  freehand: '画笔 (1)',
  rectangle: '矩形 (2)',
  'sticky-note': '便签 (3)',
  select: '选择 (V)',
};

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function createToolbar(toolManager: ToolManager): void {
  const toolbar = document.getElementById('toolbar')!;
  const tools: ToolType[] = ['select', 'freehand', 'rectangle', 'sticky-note'];

  for (const tool of tools) {
    const btn = document.createElement('button');
    btn.className = `toolbar-btn${tool === toolManager.getActiveTool() ? ' active' : ''}`;
    btn.dataset.tool = tool;
    btn.innerHTML = TOOL_ICONS[tool];
    btn.title = TOOL_LABELS[tool];

    btn.addEventListener('click', () => {
      toolManager.setActiveTool(tool);
    });

    btn.addEventListener('mouseenter', () => {
      const tooltip = document.querySelector('.tooltip') as HTMLElement;
      if (tooltip) {
        tooltip.textContent = TOOL_LABELS[tool];
        const rect = btn.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 8}px`;
        tooltip.style.top = `${rect.top + rect.height / 2 - 14}px`;
        tooltip.classList.add('show');
      }
    });

    btn.addEventListener('mouseleave', () => {
      const tooltip = document.querySelector('.tooltip') as HTMLElement;
      if (tooltip) tooltip.classList.remove('show');
    });

    toolbar.appendChild(btn);
  }

  const divider = document.createElement('div');
  divider.className = 'toolbar-divider';
  toolbar.appendChild(divider);

  const propSection = document.createElement('div');
  propSection.className = 'toolbar-prop-section';
  propSection.innerHTML = `
    <span class="toolbar-prop-label">粗细</span>
    <input type="range" class="stroke-slider" min="1" max="20" value="${toolManager.getStrokeWidth()}" />
    <span class="toolbar-prop-label">颜色</span>
    <div class="color-picker-wrapper">
      <div class="color-preview" style="background: ${toolManager.getColor()}"></div>
      <input type="color" value="${toolManager.getColor()}" />
    </div>
  `;
  toolbar.appendChild(propSection);

  const slider = propSection.querySelector('.stroke-slider') as HTMLInputElement;
  slider.addEventListener('input', () => {
    toolManager.setStrokeWidth(parseInt(slider.value));
  });

  const colorInput = propSection.querySelector('input[type="color"]') as HTMLInputElement;
  const colorPreview = propSection.querySelector('.color-preview') as HTMLElement;
  colorInput.addEventListener('input', () => {
    toolManager.setColor(colorInput.value);
    colorPreview.style.background = colorInput.value;
  });

  toolManager.on('toolChanged', (tool: unknown) => {
    const typedTool = tool as ToolType;
    toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
      const el = btn as HTMLElement;
      if (el.dataset.tool === typedTool) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  });

  toolManager.on('strokeWidthChanged', (width: unknown) => {
    slider.value = String(width);
  });

  toolManager.on('colorChanged', (color: unknown) => {
    colorInput.value = String(color);
    colorPreview.style.background = String(color);
  });
}

function createOverlayUI(engine: CanvasEngine): void {
  const container = document.getElementById('canvas-container')!;

  const zoomIndicator = document.createElement('div');
  zoomIndicator.className = 'zoom-indicator';
  zoomIndicator.textContent = `${Math.round(engine.getZoom() * 100)}%`;
  container.appendChild(zoomIndicator);

  const shortcutHint = document.createElement('div');
  shortcutHint.className = 'shortcut-hint';
  shortcutHint.innerHTML = `<kbd>Space</kbd>+拖拽 平移 | <kbd>滚轮</kbd> 缩放 | <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>V</kbd> 切换工具 | <kbd>Del</kbd> 删除`;
  container.appendChild(shortcutHint);

  const updateZoom = () => {
    zoomIndicator.textContent = `${Math.round(engine.getZoom() * 100)}%`;
  };

  const canvas = engine.getCanvasElement();
  if (canvas) {
    canvas.addEventListener('wheel', () => {
      requestAnimationFrame(updateZoom);
    });
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
}

function main(): void {
  injectStyles();

  const engine = new CanvasEngine();
  const canvasContainer = document.getElementById('canvas-container')!;
  engine.init(canvasContainer);

  const toolManager = new ToolManager(engine);
  const canvas = engine.getCanvasElement();
  if (canvas) {
    toolManager.init(canvas);
  }

  const layerPanelContainer = document.getElementById('layer-panel')!;
  const layerPanel = new LayerPanel(engine);
  layerPanel.init(layerPanelContainer);

  createToolbar(toolManager);
  createOverlayUI(engine);

  layerPanel.on('selectionChanged', (ids: unknown) => {
    toolManager.deselectAll();
    const typedIds = ids as string[];
    for (const id of typedIds) {
      toolManager.selectElement(id, true);
    }
  });

  layerPanel.on('elementsChanged', () => {
    layerPanel.refresh();
  });

  toolManager.on('selectionChanged', () => {
    layerPanel.refresh();
  });

  toolManager.on('elementsChanged', () => {
    layerPanel.refresh();
  });
}

document.addEventListener('DOMContentLoaded', main);
