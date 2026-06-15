import { OrigamiEngine } from './origamiEngine.js';
import { OrigamiModel, FoldStep, CreasePattern } from './types.js';

export class UIControls {
  private engine: OrigamiEngine;
  private angleSlider: HTMLInputElement | null = null;
  private angleValue: HTMLElement | null = null;
  private unfoldBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;
  private exportStepBtn: HTMLButtonElement | null = null;
  private exportCreaseBtn: HTMLButtonElement | null = null;
  private colorSelect: HTMLSelectElement | null = null;
  private modeButtons: NodeListOf<HTMLButtonElement> | null = null;
  private stepInfo: HTMLElement | null = null;
  private statusMessage: HTMLElement | null = null;
  private saveModelBtn: HTMLButtonElement | null = null;
  private modelNameInput: HTMLInputElement | null = null;
  private modelsList: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;
  private mobileToggle: HTMLElement | null = null;
  private onResetCamera: (() => void) | null = null;
  private statusTimeout: number | null = null;
  private sliderUpdatePending: boolean = false;
  private currentAngle: number = 0;

  constructor(engine: OrigamiEngine) {
    this.engine = engine;
  }

  init(onResetCamera?: () => void): void {
    this.onResetCamera = onResetCamera || null;
    
    this.angleSlider = document.getElementById('fold-angle') as HTMLInputElement;
    this.angleValue = document.getElementById('angle-value');
    this.unfoldBtn = document.getElementById('btn-unfold') as HTMLButtonElement;
    this.resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;
    this.exportStepBtn = document.getElementById('btn-export-step') as HTMLButtonElement;
    this.exportCreaseBtn = document.getElementById('btn-export-crease') as HTMLButtonElement;
    this.colorSelect = document.getElementById('paper-color') as HTMLSelectElement;
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.stepInfo = document.getElementById('step-info');
    this.statusMessage = document.getElementById('status-message');
    this.saveModelBtn = document.getElementById('btn-save-model') as HTMLButtonElement;
    this.modelNameInput = document.getElementById('model-name') as HTMLInputElement;
    this.modelsList = document.getElementById('models-list');
    this.controlPanel = document.getElementById('control-panel');
    this.mobileToggle = document.getElementById('mobile-toggle');

    this.bindEvents();
    this.loadModels();
    this.updateSliderBackground(0);
  }

  private bindEvents(): void {
    if (this.angleSlider) {
      this.angleSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        this.onFoldAngleChange(value);
      });

      this.angleSlider.addEventListener('change', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        this.onFoldAngleChange(value, true);
      });
    }

    if (this.unfoldBtn) {
      this.unfoldBtn.addEventListener('click', () => {
        this.onUnfoldClick();
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        this.onResetCameraClick();
      });
    }

    if (this.exportStepBtn) {
      this.exportStepBtn.addEventListener('click', () => {
        this.onExportStepImage();
      });
    }

    if (this.exportCreaseBtn) {
      this.exportCreaseBtn.addEventListener('click', () => {
        this.onExportCreasePattern();
      });
    }

    if (this.colorSelect) {
      this.colorSelect.addEventListener('change', (e) => {
        const color = (e.target as HTMLSelectElement).value;
        this.onColorChange(color);
      });
    }

    if (this.modeButtons) {
      this.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          if (mode) {
            this.onModeSelect(mode);
          }
        });
      });
    }

    if (this.saveModelBtn) {
      this.saveModelBtn.addEventListener('click', () => {
        this.onSaveModel();
      });
    }

    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => {
        this.toggleMobilePanel();
      });
    }
  }

  onFoldAngleChange(angle: number, final: boolean = false): void {
    this.currentAngle = angle;
    this.updateAngleDisplay(angle);
    this.updateSliderBackground(angle);

    const creaseLineId = this.engine.getFirstCreaseLineId();
    if (!creaseLineId) {
      this.updateStatus('请先选择折叠模式');
      return;
    }

    if (!this.sliderUpdatePending) {
      this.sliderUpdatePending = true;
      requestAnimationFrame(() => {
        this.engine.foldPaper(creaseLineId, this.currentAngle, final ? 300 : 0);
        this.sliderUpdatePending = false;
        this.updateStepDisplay();
      });
    }
  }

  async onUnfoldClick(): Promise<void> {
    const btn = this.unfoldBtn;
    if (btn) {
      btn.disabled = true;
    }

    this.updateStatus('正在展开...');
    
    try {
      await this.engine.unfoldPaper(2000);
      
      if (this.angleSlider) {
        this.angleSlider.value = '0';
        this.updateSliderBackground(0);
        this.updateAngleDisplay(0);
      }
      
      this.updateStatus('展开完成');
      this.updateStepDisplay();
    } catch (error) {
      this.updateStatus('展开失败');
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  }

  onResetCameraClick(): void {
    if (this.onResetCamera) {
      this.onResetCamera();
      this.updateStatus('视角已重置');
    }
  }

  async onExportStepImage(): Promise<void> {
    this.updateStatus('正在生成步骤图...');
    
    try {
      const state = this.engine.getCurrentState();
      const dataUrl = await this.engine.exportStepImage(1920, 1080, state.currentStep);
      
      const link = document.createElement('a');
      link.download = `origami-step-${state.currentStep}.png`;
      link.href = dataUrl;
      link.click();
      
      this.updateStatus('步骤图已导出');
    } catch (error) {
      console.error('Export step image error:', error);
      this.updateStatus('导出失败');
    }
  }

  onExportCreasePattern(): void {
    this.updateStatus('正在生成折痕图...');
    
    try {
      const svg = this.engine.exportCreasePatternSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = 'crease-pattern.svg';
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      this.updateStatus('折痕图已导出');
    } catch (error) {
      console.error('Export crease pattern error:', error);
      this.updateStatus('导出失败');
    }
  }

  onColorChange(color: string): void {
    this.engine.setPaperColor(color);
    this.updateStatus('纸张颜色已更新');
  }

  onModeSelect(modeId: string): void {
    this.modeButtons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeId);
    });

    this.engine.applyPresetMode(modeId);
    
    if (this.angleSlider) {
      this.angleSlider.value = '0';
      this.updateSliderBackground(0);
      this.updateAngleDisplay(0);
    }

    const mode = this.engine.getPresetModes().find(m => m.id === modeId);
    this.updateStatus(`已选择: ${mode?.name || modeId}`);
    this.updateStepDisplay();
  }

  updateStatus(message: string): void {
    if (!this.statusMessage) return;

    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }

    this.statusMessage.textContent = message;
    this.statusMessage.classList.remove('fade');

    this.statusTimeout = window.setTimeout(() => {
      if (this.statusMessage) {
        this.statusMessage.classList.add('fade');
      }
    }, 2000);
  }

  updateStepDisplay(): void {
    if (!this.stepInfo) return;
    
    const state = this.engine.getCurrentState();
    this.stepInfo.textContent = `第 ${state.currentStep} 步 / 共 ${state.totalSteps} 步`;
  }

  private updateAngleDisplay(angle: number): void {
    if (this.angleValue) {
      this.angleValue.textContent = `${angle}°`;
    }
  }

  private updateSliderBackground(angle: number): void {
    if (!this.angleSlider) return;
    
    const percent = (angle / 180) * 100;
    this.angleSlider.style.background = `linear-gradient(
      to right,
      var(--color-primary) 0%,
      var(--color-primary) ${percent}%,
      var(--color-border) ${percent}%,
      var(--color-border) 100%
    )`;
  }

  toggleMobilePanel(): void {
    if (!this.controlPanel) return;
    this.controlPanel.classList.toggle('expanded');
  }

  private async loadModels(): Promise<void> {
    if (!this.modelsList) return;

    try {
      const response = await fetch('/api/models');
      const result = await response.json();
      
      if (result.success && result.data) {
        this.renderModelsList(result.data);
      }
    } catch (error) {
      console.error('Load models error:', error);
    }
  }

  private renderModelsList(models: OrigamiModel[]): void {
    if (!this.modelsList) return;

    if (models.length === 0) {
      this.modelsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-secondary); font-size: 0.85rem;">暂无分享的模型</div>';
      return;
    }

    this.modelsList.innerHTML = models.map(model => `
      <div class="model-item" data-id="${model.id}">
        <span class="model-item-name">${model.name}</span>
        <button class="model-item-load" data-id="${model.id}">加载</button>
      </div>
    `).join('');

    const loadButtons = this.modelsList.querySelectorAll('.model-item-load');
    loadButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          this.loadModel(id);
        }
      });
    });
  }

  private async loadModel(id: string): Promise<void> {
    this.updateStatus('正在加载模型...');
    
    try {
      const response = await fetch(`/api/models/${id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const model: OrigamiModel = result.data;
        await this.applyModel(model);
        this.updateStatus(`已加载: ${model.name}`);
      } else {
        this.updateStatus('加载失败: 模型不存在');
      }
    } catch (error) {
      console.error('Load model error:', error);
      this.updateStatus('加载失败');
    }
  }

  private async applyModel(model: OrigamiModel): Promise<void> {
    const creaseLines = model.creasePattern.lines;
    if (creaseLines.length === 0) return;

    const firstLine = creaseLines[0]!;
    this.engine.applyPresetMode('horizontal');
    
    if (model.steps.length > 0) {
      const firstStep = model.steps[0]!;
      const creaseId = firstStep.creaseLineId;
      const targetAngle = firstStep.targetAngle;
      
      await this.engine.foldPaper(creaseId, targetAngle, 1000);
      
      if (this.angleSlider) {
        this.angleSlider.value = targetAngle.toString();
        this.updateSliderBackground(targetAngle);
        this.updateAngleDisplay(targetAngle);
      }
      
      this.updateStepDisplay();
    }
  }

  private async onSaveModel(): Promise<void> {
    const name = this.modelNameInput?.value.trim();
    if (!name) {
      this.updateStatus('请输入模型名称');
      return;
    }

    const creasePattern = this.engine.getCreasePattern();
    const steps = this.engine.getFoldSteps();

    if (steps.length === 0) {
      this.updateStatus('请先进行折叠操作');
      return;
    }

    this.updateStatus('正在保存...');

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, steps, creasePattern })
      });

      const result = await response.json();
      
      if (result.success) {
        this.updateStatus('保存成功');
        await this.loadModels();
        if (this.modelNameInput) {
          this.modelNameInput.value = '';
        }
      } else {
        this.updateStatus('保存失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Save model error:', error);
      this.updateStatus('保存失败');
    }
  }
}
