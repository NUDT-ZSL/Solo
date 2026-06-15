import { STAR_TYPES, LIFE_STAGE_LABELS, LifeStage, StarTypeData } from './StarData';

export interface ControlPanelCallbacks {
  onFilterChange: (visibleTypes: Set<string>) => void;
  onStageChange: (stage: LifeStage) => void;
  onResetView: () => void;
  onExportScreenshot: () => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlPanelCallbacks;
  private visibleTypes: Set<string> = new Set(STAR_TYPES.map(s => s.id));
  private currentStage: LifeStage = 'main_sequence';
  private filterButtons: Map<string, HTMLElement> = new Map();

  constructor(parent: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.className = 'control-panel';
    parent.appendChild(this.container);

    this.injectStyles();
    this.render();
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .control-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 280px;
        padding: 20px;
        background: rgba(10, 15, 30, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(100, 140, 255, 0.2);
        border-radius: 16px;
        color: #c8d8f8;
        font-size: 13px;
        z-index: 100;
        box-shadow: 0 0 30px rgba(60, 100, 255, 0.08), inset 0 0 30px rgba(60, 100, 255, 0.03);
        user-select: none;
      }
      .control-panel h2 {
        font-size: 16px;
        font-weight: 600;
        color: #8ab4ff;
        margin-bottom: 16px;
        letter-spacing: 2px;
        text-transform: uppercase;
        text-shadow: 0 0 10px rgba(100, 160, 255, 0.4);
      }
      .panel-section {
        margin-bottom: 16px;
      }
      .panel-section label {
        display: block;
        font-size: 11px;
        color: #7a94c0;
        margin-bottom: 8px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .filter-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .filter-btn {
        padding: 5px 10px;
        border: 1px solid rgba(100, 140, 255, 0.25);
        border-radius: 8px;
        background: rgba(30, 50, 90, 0.4);
        color: #7a9acc;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.25s ease;
        outline: none;
      }
      .filter-btn:hover {
        border-color: rgba(100, 160, 255, 0.5);
        background: rgba(50, 80, 140, 0.4);
        color: #a0c0ff;
        box-shadow: 0 0 8px rgba(80, 130, 255, 0.2);
      }
      .filter-btn.active {
        background: rgba(60, 100, 200, 0.5);
        border-color: rgba(100, 160, 255, 0.6);
        color: #c0dcff;
        box-shadow: 0 0 12px rgba(80, 130, 255, 0.3);
      }
      .stage-slider-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stage-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(30, 50, 90, 0.6);
        outline: none;
        cursor: pointer;
      }
      .stage-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle, #8ab4ff 30%, #4070cc 100%);
        border: 2px solid rgba(120, 170, 255, 0.6);
        box-shadow: 0 0 10px rgba(80, 140, 255, 0.5);
        cursor: pointer;
      }
      .stage-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle, #8ab4ff 30%, #4070cc 100%);
        border: 2px solid rgba(120, 170, 255, 0.6);
        box-shadow: 0 0 10px rgba(80, 140, 255, 0.5);
        cursor: pointer;
      }
      .stage-label {
        text-align: center;
        font-size: 13px;
        color: #a0c0ff;
        font-weight: 500;
        text-shadow: 0 0 6px rgba(80, 140, 255, 0.3);
      }
      .btn-row {
        display: flex;
        gap: 8px;
      }
      .action-btn {
        flex: 1;
        padding: 8px 0;
        border: 1px solid rgba(100, 140, 255, 0.3);
        border-radius: 10px;
        background: rgba(30, 50, 90, 0.4);
        color: #8ab4ff;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.25s ease;
        outline: none;
        letter-spacing: 0.5px;
      }
      .action-btn:hover {
        background: rgba(50, 80, 140, 0.5);
        border-color: rgba(100, 160, 255, 0.5);
        color: #c0dcff;
        box-shadow: 0 0 12px rgba(80, 130, 255, 0.25);
      }
      .action-btn:active {
        transform: scale(0.97);
      }
    `;
    document.head.appendChild(style);
  }

  private render() {
    this.container.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = '星焰图鉴';
    this.container.appendChild(title);

    const filterSection = document.createElement('div');
    filterSection.className = 'panel-section';
    const filterLabel = document.createElement('label');
    filterLabel.textContent = '恒星类型筛选';
    filterSection.appendChild(filterLabel);

    const filterGrid = document.createElement('div');
    filterGrid.className = 'filter-grid';

    STAR_TYPES.forEach(star => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn active';
      btn.textContent = star.name;
      btn.setAttribute('data-star-id', star.id);
      btn.addEventListener('click', () => this.toggleFilter(star.id, btn));
      filterGrid.appendChild(btn);
      this.filterButtons.set(star.id, btn);
    });

    filterSection.appendChild(filterGrid);
    this.container.appendChild(filterSection);

    const stageSection = document.createElement('div');
    stageSection.className = 'panel-section';
    const stageLabel = document.createElement('label');
    stageLabel.textContent = '生命阶段';
    stageSection.appendChild(stageLabel);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'stage-slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2';
    slider.step = '1';
    slider.value = '0';
    slider.className = 'stage-slider';

    const stageLabelEl = document.createElement('div');
    stageLabelEl.className = 'stage-label';
    stageLabelEl.textContent = LIFE_STAGE_LABELS.main_sequence;

    slider.addEventListener('input', () => {
      const stages: LifeStage[] = ['main_sequence', 'red_giant', 'white_dwarf'];
      const idx = parseInt(slider.value);
      this.currentStage = stages[idx];
      stageLabelEl.textContent = LIFE_STAGE_LABELS[this.currentStage];
      this.callbacks.onStageChange(this.currentStage);
    });

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(stageLabelEl);
    stageSection.appendChild(sliderContainer);
    this.container.appendChild(stageSection);

    const btnSection = document.createElement('div');
    btnSection.className = 'panel-section';
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn';
    resetBtn.textContent = '重置视角';
    resetBtn.addEventListener('click', () => this.callbacks.onResetView());

    const exportBtn = document.createElement('button');
    exportBtn.className = 'action-btn';
    exportBtn.textContent = '导出截图';
    exportBtn.addEventListener('click', () => this.callbacks.onExportScreenshot());

    btnRow.appendChild(resetBtn);
    btnRow.appendChild(exportBtn);
    btnSection.appendChild(btnRow);
    this.container.appendChild(btnSection);
  }

  private toggleFilter(starId: string, btn: HTMLElement) {
    if (this.visibleTypes.has(starId)) {
      if (this.visibleTypes.size <= 1) return;
      this.visibleTypes.delete(starId);
      btn.classList.remove('active');
    } else {
      this.visibleTypes.add(starId);
      btn.classList.add('active');
    }
    this.callbacks.onFilterChange(this.visibleTypes);
  }

  public dispose() {
    this.container.remove();
  }
}
