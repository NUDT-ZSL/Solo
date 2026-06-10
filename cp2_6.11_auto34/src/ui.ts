import { GenerateConfig, TemplateType, TEMPLATES, HistoryEntry } from './generator';

type OnGenerate = () => void;
type OnConfigChange = (config: GenerateConfig) => void;
type OnTemplateChange = (template: TemplateType) => void;
type OnExport = () => void;
type OnHistoryRestore = (index: number) => void;

interface UICallbacks {
  onGenerate: OnGenerate;
  onConfigChange: OnConfigChange;
  onTemplateChange: OnTemplateChange;
  onExport: OnExport;
  onHistoryRestore: OnHistoryRestore;
}

export function createUI(container: HTMLElement, callbacks: UICallbacks, config: GenerateConfig): {
  updateConfig: (config: GenerateConfig) => void;
  updateHistory: (entries: HistoryEntry[]) => void;
  showLoading: () => void;
  hideLoading: () => void;
} {
  container.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = '控制面板';
  container.appendChild(title);

  const shapeGroup = createSliderGroup('形状密度', 10, 40, config.shapeCount, (val) => {
    callbacks.onConfigChange({ ...getCurrentConfig(), shapeCount: val });
  });
  container.appendChild(shapeGroup.el);

  const opacityMinGroup = createSliderGroup('透明度下限', 10, 100, Math.round(config.opacityMin * 100), (val) => {
    callbacks.onConfigChange({ ...getCurrentConfig(), opacityMin: val / 100 });
  });
  container.appendChild(opacityMinGroup.el);

  const opacityMaxGroup = createSliderGroup('透明度上限', 10, 100, Math.round(config.opacityMax * 100), (val) => {
    callbacks.onConfigChange({ ...getCurrentConfig(), opacityMax: val / 100 });
  });
  container.appendChild(opacityMaxGroup.el);

  const satGroup = createSliderGroup('色彩饱和度', 0, 100, config.saturation, (val) => {
    callbacks.onConfigChange({ ...getCurrentConfig(), saturation: val });
  });
  container.appendChild(satGroup.el);

  const tplSection = document.createElement('div');
  tplSection.className = 'template-section';
  const tplLabel = document.createElement('div');
  tplLabel.className = 'section-label';
  tplLabel.textContent = '风格模板';
  tplSection.appendChild(tplLabel);

  const tplGrid = document.createElement('div');
  tplGrid.className = 'template-grid';
  const tplCards: HTMLElement[] = [];

  TEMPLATES.forEach((tpl) => {
    const card = document.createElement('div');
    card.className = 'template-card' + (config.template === tpl.type ? ' selected' : '');
    card.style.setProperty('--selected-color', tpl.primaryColor);
    card.innerHTML = `<span class="tpl-icon">${tpl.icon}</span><span class="tpl-name">${tpl.name}</span>`;
    card.addEventListener('click', () => {
      tplCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      callbacks.onTemplateChange(tpl.type);
    });
    tplGrid.appendChild(card);
    tplCards.push(card);
  });
  tplSection.appendChild(tplGrid);
  container.appendChild(tplSection);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';

  const genBtn = document.createElement('button');
  genBtn.className = 'btn btn-primary';
  genBtn.textContent = '随机生成';
  genBtn.addEventListener('click', callbacks.onGenerate);
  btnGroup.appendChild(genBtn);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary';
  exportBtn.textContent = '导出';
  exportBtn.addEventListener('click', callbacks.onExport);
  btnGroup.appendChild(exportBtn);

  container.appendChild(btnGroup);

  const historySection = document.createElement('div');
  historySection.className = 'history-section';
  const historyLabel = document.createElement('div');
  historyLabel.className = 'section-label';
  historyLabel.textContent = '历史记录';
  historySection.appendChild(historyLabel);

  const historyGrid = document.createElement('div');
  historyGrid.className = 'history-grid';
  historyGrid.innerHTML = '<div class="history-empty">暂无历史</div>';
  historySection.appendChild(historyGrid);
  container.appendChild(historySection);

  let currentConfig = { ...config };

  function getCurrentConfig(): GenerateConfig {
    return { ...currentConfig };
  }

  function createSliderGroup(label: string, min: number, max: number, value: number, onChange: (val: number) => void): { el: HTMLElement; update: (val: number) => void } {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    const labelText = document.createElement('span');
    labelText.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'control-value';
    valueEl.textContent = String(value);
    labelEl.appendChild(labelText);
    labelEl.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      valueEl.textContent = String(val);
      onChange(val);
    });

    group.appendChild(labelEl);
    group.appendChild(slider);

    return {
      el: group,
      update(val: number) {
        slider.value = String(val);
        valueEl.textContent = String(val);
      },
    };
  }

  const sliders = [shapeGroup, opacityMinGroup, opacityMaxGroup, satGroup];

  return {
    updateConfig(newConfig: GenerateConfig) {
      currentConfig = { ...newConfig };
      sliders[0].update(newConfig.shapeCount);
      sliders[1].update(Math.round(newConfig.opacityMin * 100));
      sliders[2].update(Math.round(newConfig.opacityMax * 100));
      sliders[3].update(newConfig.saturation);
      tplCards.forEach((card, i) => {
        if (TEMPLATES[i].type === newConfig.template) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    },
    updateHistory(entries: HistoryEntry[]) {
      historyGrid.innerHTML = '';
      if (entries.length === 0) {
        historyGrid.innerHTML = '<div class="history-empty">暂无历史</div>';
        return;
      }
      entries.forEach((entry, index) => {
        const img = document.createElement('img');
        img.className = 'history-thumb';
        img.src = entry.thumbnail;
        img.title = '点击恢复';
        img.addEventListener('click', () => {
          callbacks.onHistoryRestore(index);
        });
        historyGrid.appendChild(img);
      });
    },
    showLoading() {
      const ring = document.getElementById('loadingRing');
      if (ring) ring.classList.add('active');
    },
    hideLoading() {
      const ring = document.getElementById('loadingRing');
      if (ring) ring.classList.remove('active');
    },
  };
}
