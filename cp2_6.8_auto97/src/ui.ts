import { SurfaceType, SurfaceParamsMap, DEFAULT_PARAMS } from './surfaces';

export interface UICallbacks {
  onSurfaceChange: (type: SurfaceType) => void;
  onParamsChange: (type: SurfaceType, params: SurfaceParamsMap[SurfaceType]) => void;
}

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SURFACE_INFO: Record<SurfaceType, { label: string; sliders: SliderDef[] }> = {
  mobius: {
    label: '莫比乌斯带',
    sliders: [
      { key: 'radius', label: '半径 Radius', min: 0.5, max: 4, step: 0.05 },
      { key: 'twist', label: '扭曲度 Twist', min: 0, max: 2, step: 0.01 },
      { key: 'resolution', label: '分辨率 Resolution', min: 40, max: 150, step: 1 },
    ],
  },
  klein: {
    label: '克莱因瓶',
    sliders: [
      { key: 'radius', label: '主半径 Radius', min: 0.5, max: 4, step: 0.05 },
      { key: 'tube', label: '管半径 Tube', min: 0.2, max: 2, step: 0.05 },
      { key: 'resolution', label: '分辨率 Resolution', min: 32, max: 120, step: 1 },
    ],
  },
  roman: {
    label: '罗马曲面',
    sliders: [
      { key: 'size', label: '尺寸 Size', min: 0.3, max: 3, step: 0.05 },
      { key: 'distortion', label: '变形 Distortion', min: 0.3, max: 2, step: 0.01 },
      { key: 'resolution', label: '分辨率 Resolution', min: 40, max: 150, step: 1 },
    ],
  },
  custom: {
    label: '自定义参数曲面',
    sliders: [
      { key: 'a', label: '参数 A (X轴)', min: 0.3, max: 4, step: 0.05 },
      { key: 'b', label: '参数 B (Y轴)', min: 0.3, max: 4, step: 0.05 },
      { key: 'c', label: '参数 C (Z轴)', min: 0.3, max: 4, step: 0.05 },
    ],
  },
};

export interface UIHandle {
  updateParams: (type: SurfaceType, params: SurfaceParamsMap[SurfaceType]) => void;
}

export function createControlPanel(
  container: HTMLElement,
  callbacks: UICallbacks
): UIHandle {
  const currentParams = JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as SurfaceParamsMap;
  let currentType: SurfaceType = 'mobius';

  const panel = document.createElement('div');
  panel.className = 'control-panel';
  container.appendChild(panel);

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = `3D 数学曲面 · ${SURFACE_INFO[currentType].label}`;
  panel.appendChild(title);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'surface-buttons';
  panel.appendChild(btnGroup);

  const buttons: Record<SurfaceType, HTMLButtonElement> = {} as any;
  const surfaceKeys: SurfaceType[] = ['mobius', 'klein', 'roman', 'custom'];
  surfaceKeys.forEach((key) => {
    const btn = document.createElement('button');
    btn.className = 'surface-btn';
    btn.textContent = key === 'mobius' ? 'M' : key === 'klein' ? 'K' : key === 'roman' ? 'R' : 'C';
    btn.title = SURFACE_INFO[key].label;
    if (key === currentType) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (currentType === key) return;
      currentType = key;
      Object.values(buttons).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      title.textContent = `3D 数学曲面 · ${SURFACE_INFO[currentType].label}`;
      renderSliders();
      callbacks.onSurfaceChange(key);
    });
    buttons[key] = btn;
    btnGroup.appendChild(btn);
  });

  const slidersWrap = document.createElement('div');
  slidersWrap.className = 'sliders-group';
  panel.appendChild(slidersWrap);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.innerHTML = '🖱️ 拖拽旋转视角 · 滚轮缩放<br />🎛️ 滑块实时调整曲面参数';
  panel.appendChild(hint);

  function renderSliders(): void {
    slidersWrap.innerHTML = '';
    const info = SURFACE_INFO[currentType];
    const params = currentParams[currentType] as Record<string, number>;

    info.sliders.forEach((sliderDef) => {
      const item = document.createElement('div');
      item.className = 'slider-item';

      const label = document.createElement('div');
      label.className = 'slider-label';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = sliderDef.label;
      const valSpan = document.createElement('span');
      valSpan.className = 'slider-value';
      valSpan.textContent = params[sliderDef.key].toFixed(2);
      label.appendChild(nameSpan);
      label.appendChild(valSpan);

      const track = document.createElement('div');
      track.className = 'slider-track';

      const fill = document.createElement('div');
      fill.className = 'slider-fill';

      const thumb = document.createElement('div');
      thumb.className = 'slider-thumb';

      track.appendChild(fill);
      track.appendChild(thumb);
      item.appendChild(label);
      item.appendChild(track);
      slidersWrap.appendChild(item);

      function updateVisual(value: number): void {
        const pct = ((value - sliderDef.min) / (sliderDef.max - sliderDef.min)) * 100;
        fill.style.width = pct + '%';
        thumb.style.left = pct + '%';
        valSpan.textContent = value.toFixed(2);
      }
      updateVisual(params[sliderDef.key]);

      function setValueFromClientX(clientX: number): void {
        const rect = track.getBoundingClientRect();
        let ratio = (clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        const raw = sliderDef.min + ratio * (sliderDef.max - sliderDef.min);
        const stepped = Math.round(raw / sliderDef.step) * sliderDef.step;
        const value = Math.max(sliderDef.min, Math.min(sliderDef.max, stepped));
        params[sliderDef.key] = value;
        updateVisual(value);
        callbacks.onParamsChange(currentType, currentParams[currentType]);
      }

      let dragging = false;
      const onMove = (e: MouseEvent) => {
        if (!dragging) return;
        setValueFromClientX(e.clientX);
      };
      const onUp = () => {
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      track.addEventListener('mousedown', (e) => {
        dragging = true;
        setValueFromClientX(e.clientX);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      thumb.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        dragging = true;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  renderSliders();

  return {
    updateParams(type: SurfaceType, params: SurfaceParamsMap[SurfaceType]): void {
      (currentParams[type] as any) = { ...params };
      if (type === currentType) renderSliders();
    },
  };
}
