export interface UIControlsParams {
  inkAmount: number;
  waterAmount: number;
  pressure: number;
}

interface SliderConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export class UIControls {
  private container: HTMLElement;
  private params: UIControlsParams;
  private onParamsChange: (params: UIControlsParams) => void;
  private onClear: () => void;
  private onSave: () => void;

  constructor(
    container: HTMLElement,
    initialParams: UIControlsParams,
    onParamsChange: (params: UIControlsParams) => void,
    onClear: () => void,
    onSave: () => void
  ) {
    this.container = container;
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;
    this.onClear = onClear;
    this.onSave = onSave;
    this.render();
    this.bindTopButtons();
  }

  public getParams(): UIControlsParams {
    return { ...this.params };
  }

  private render(): void {
    const sliders: SliderConfig[] = [
      {
        id: 'inkAmount',
        label: '墨量',
        min: 0.2,
        max: 1.0,
        step: 0.01,
        value: this.params.inkAmount,
        onChange: (v) => {
          this.params.inkAmount = v;
          this.onParamsChange(this.getParams());
        }
      },
      {
        id: 'waterAmount',
        label: '水量',
        min: 5,
        max: 25,
        step: 1,
        value: this.params.waterAmount,
        onChange: (v) => {
          this.params.waterAmount = v;
          this.onParamsChange(this.getParams());
        }
      },
      {
        id: 'pressure',
        label: '笔压',
        min: 8,
        max: 20,
        step: 1,
        value: this.params.pressure,
        onChange: (v) => {
          this.params.pressure = v;
          this.onParamsChange(this.getParams());
        }
      }
    ];

    this.container.innerHTML = '';

    sliders.forEach((config) => {
      const group = document.createElement('div');
      group.className = 'slider-group';

      const label = document.createElement('span');
      label.className = 'slider-label';
      label.textContent = config.label;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'slider';
      slider.id = config.id;
      slider.min = config.min.toString();
      slider.max = config.max.toString();
      slider.step = config.step.toString();
      slider.value = config.value.toString();

      slider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        config.onChange(value);
      });

      group.appendChild(label);
      group.appendChild(slider);
      this.container.appendChild(group);
    });

    const panelButtons = document.createElement('div');
    panelButtons.className = 'panel-buttons';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'seal-btn';
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', () => this.onClear());

    const saveBtn = document.createElement('button');
    saveBtn.className = 'seal-btn';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', () => this.onSave());

    panelButtons.appendChild(clearBtn);
    panelButtons.appendChild(saveBtn);
    this.container.appendChild(panelButtons);
  }

  private bindTopButtons(): void {
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.onClear());
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.onSave());
    }
  }
}
