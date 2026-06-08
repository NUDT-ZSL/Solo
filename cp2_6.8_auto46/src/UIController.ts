import { ModelManager, GeometryType, MaterialParams } from './ModelManager';
import { LightManager, LightEntry } from './LightManager';

interface CameraController {
  reset: () => void;
}

export class UIController {
  private container: HTMLElement;
  private modelManager: ModelManager;
  private lightManager: LightManager;
  private cameraController: CameraController;

  private leftPanel!: HTMLDivElement;
  private rightPanel!: HTMLDivElement;
  private geometrySelect!: HTMLSelectElement;
  private roughnessSlider!: HTMLInputElement;
  private roughnessValue!: HTMLSpanElement;
  private metalnessSlider!: HTMLInputElement;
  private metalnessValue!: HTMLSpanElement;
  private aoSlider!: HTMLInputElement;
  private aoValue!: HTMLSpanElement;
  private lightListContainer!: HTMLDivElement;
  private addPointBtn!: HTMLButtonElement;
  private addSpotBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;

  private onGeometryChangeCallback?: (type: GeometryType) => void;

  constructor(
    container: HTMLElement,
    modelManager: ModelManager,
    lightManager: LightManager,
    cameraController: CameraController
  ) {
    this.container = container;
    this.modelManager = modelManager;
    this.lightManager = lightManager;
    this.cameraController = cameraController;

    this.buildUI();
    this.bindEvents();
    this.refreshLightList();

    this.lightManager.setOnLightChangeCallback(() => {
      this.refreshLightList();
    });
  }

  private buildUI(): void {
    this.leftPanel = document.createElement('div');
    this.leftPanel.className = 'panel panel-left';
    this.buildLeftPanel();

    this.rightPanel = document.createElement('div');
    this.rightPanel.className = 'panel panel-right';
    this.buildRightPanel();

    this.container.appendChild(this.leftPanel);
    this.container.appendChild(this.rightPanel);
  }

  private buildLeftPanel(): void {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '◆ 材质与几何体';
    this.leftPanel.appendChild(title);

    const geoGroup = document.createElement('div');
    geoGroup.className = 'control-group';

    const geoLabel = document.createElement('div');
    geoLabel.className = 'control-label';
    geoLabel.textContent = '几何体类型';
    geoGroup.appendChild(geoLabel);

    this.geometrySelect = document.createElement('select');
    const options: { value: GeometryType; label: string }[] = [
      { value: 'sphere', label: '球体 (Sphere)' },
      { value: 'cube', label: '立方体 (Cube)' },
      { value: 'torus', label: '环面 (Torus)' }
    ];
    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      this.geometrySelect.appendChild(option);
    });
    this.geometrySelect.value = this.modelManager.getCurrentGeometryType();
    geoGroup.appendChild(this.geometrySelect);
    this.leftPanel.appendChild(geoGroup);

    const params = this.modelManager.getMaterialParams();

    this.roughnessSlider = this.createSlider(
      '粗糙度 (Roughness)',
      0, 1, 0.01,
      params.roughness,
      (val) => { this.roughnessValue = val; }
    );
    this.leftPanel.appendChild(this.roughnessSlider.parentElement!);

    this.metalnessSlider = this.createSlider(
      '金属度 (Metalness)',
      0, 1, 0.01,
      params.metalness,
      (val) => { this.metalnessValue = val; }
    );
    this.leftPanel.appendChild(this.metalnessSlider.parentElement!);

    this.aoSlider = this.createSlider(
      '环境光遮蔽 (AO)',
      0, 1, 0.01,
      params.aoMapIntensity,
      (val) => { this.aoValue = val; }
    );
    this.leftPanel.appendChild(this.aoSlider.parentElement!);

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'btn btn-reset';
    this.resetBtn.textContent = '↻ 重置场景';
    this.leftPanel.appendChild(this.resetBtn);
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    valueRefSetter: (el: HTMLSpanElement) => void
  ): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'control-label';

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = value.toFixed(2);
    valueRefSetter(valueSpan);

    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueSpan);
    group.appendChild(labelDiv);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    group.appendChild(slider);

    return slider;
  }

  private buildRightPanel(): void {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '◆ 光源管理';
    this.rightPanel.appendChild(title);

    this.addPointBtn = document.createElement('button');
    this.addPointBtn.className = 'btn';
    this.addPointBtn.textContent = '+ 添加点光源';
    this.rightPanel.appendChild(this.addPointBtn);

    this.addSpotBtn = document.createElement('button');
    this.addSpotBtn.className = 'btn';
    this.addSpotBtn.textContent = '+ 添加聚光灯';
    this.rightPanel.appendChild(this.addSpotBtn);

    const listTitle = document.createElement('div');
    listTitle.className = 'panel-title';
    listTitle.style.marginTop = '12px';
    listTitle.textContent = '◆ 光源列表';
    this.rightPanel.appendChild(listTitle);

    this.lightListContainer = document.createElement('div');
    this.lightListContainer.className = 'light-list';
    this.rightPanel.appendChild(this.lightListContainer);
  }

  private bindEvents(): void {
    this.geometrySelect.addEventListener('change', (e) => {
      const type = (e.target as HTMLSelectElement).value as GeometryType;
      if (this.onGeometryChangeCallback) {
        this.onGeometryChangeCallback(type);
      }
    });

    this.roughnessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.roughnessValue.textContent = value.toFixed(2);
      this.modelManager.updateMaterialParams({ roughness: value });
    });

    this.metalnessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.metalnessValue.textContent = value.toFixed(2);
      this.modelManager.updateMaterialParams({ metalness: value });
    });

    this.aoSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.aoValue.textContent = value.toFixed(2);
      this.modelManager.updateMaterialParams({ aoMapIntensity: value });
    });

    this.addPointBtn.addEventListener('click', () => {
      const count = this.lightManager.getLightCount();
      if (count.point >= 5) {
        this.addPointBtn.textContent = '点光源已达上限 (5)';
        this.addPointBtn.disabled = true;
        return;
      }
      this.lightManager.addPointLight();
    });

    this.addSpotBtn.addEventListener('click', () => {
      const count = this.lightManager.getLightCount();
      if (count.spot >= 3) {
        this.addSpotBtn.textContent = '聚光灯已达上限 (3)';
        this.addSpotBtn.disabled = true;
        return;
      }
      this.lightManager.addSpotLight();
    });

    this.resetBtn.addEventListener('click', () => {
      this.modelManager.reset();
      this.lightManager.reset();
      this.cameraController.reset();
      this.resetMaterialControls();
      this.geometrySelect.value = 'sphere';
      this.addPointBtn.disabled = false;
      this.addPointBtn.textContent = '+ 添加点光源';
      this.addSpotBtn.disabled = false;
      this.addSpotBtn.textContent = '+ 添加聚光灯';
    });
  }

  private resetMaterialControls(): void {
    const defaultParams: MaterialParams = {
      roughness: 0.5,
      metalness: 0.0,
      aoMapIntensity: 0.3
    };

    this.roughnessSlider.value = defaultParams.roughness.toString();
    this.roughnessValue.textContent = defaultParams.roughness.toFixed(2);

    this.metalnessSlider.value = defaultParams.metalness.toString();
    this.metalnessValue.textContent = defaultParams.metalness.toFixed(2);

    this.aoSlider.value = defaultParams.aoMapIntensity.toString();
    this.aoValue.textContent = defaultParams.aoMapIntensity.toFixed(2);
  }

  public setOnGeometryChangeCallback(callback: (type: GeometryType) => void): void {
    this.onGeometryChangeCallback = callback;
  }

  public refreshLightList(): void {
    this.lightListContainer.innerHTML = '';

    const lights = this.lightManager.getLights();
    const count = this.lightManager.getLightCount();

    this.addPointBtn.disabled = count.point >= 5;
    this.addPointBtn.textContent = count.point >= 5
      ? `点光源已达上限 (${count.point}/5)`
      : `+ 添加点光源 (${count.point}/5)`;

    this.addSpotBtn.disabled = count.spot >= 3;
    this.addSpotBtn.textContent = count.spot >= 3
      ? `聚光灯已达上限 (${count.spot}/3)`
      : `+ 添加聚光灯 (${count.spot}/3)`;

    lights.forEach((entry) => {
      const item = this.createLightItem(entry);
      this.lightListContainer.appendChild(item);
    });
  }

  private createLightItem(entry: LightEntry): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'light-item';
    item.dataset.lightId = entry.id;

    const header = document.createElement('div');
    header.className = 'light-header';

    const info = document.createElement('div');
    info.className = 'light-info';

    const colorPreview = document.createElement('div');
    colorPreview.className = 'light-color-preview';
    const colorHex = '#' + entry.light.color.getHexString();
    colorPreview.style.backgroundColor = colorHex;

    const typeLabel = document.createElement('span');
    typeLabel.className = 'light-type';
    const typeNames: Record<string, string> = {
      ambient: '环境光',
      point: '点光源',
      spot: '聚光灯'
    };
    typeLabel.textContent = `${typeNames[entry.type]}  [${entry.light.position.x.toFixed(1)}, ${entry.light.position.y.toFixed(1)}, ${entry.light.position.z.toFixed(1)}]`;

    info.appendChild(colorPreview);
    info.appendChild(typeLabel);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = '删除光源';
    if (entry.type === 'ambient') {
      deleteBtn.style.display = 'none';
    }
    deleteBtn.addEventListener('click', () => {
      this.lightManager.removeLight(entry.id);
    });

    header.appendChild(info);
    header.appendChild(deleteBtn);
    item.appendChild(header);

    const intensityGroup = document.createElement('div');
    intensityGroup.className = 'control-group';
    intensityGroup.style.marginBottom = '8px';

    const intensityLabel = document.createElement('div');
    intensityLabel.className = 'control-label';

    const intensityText = document.createElement('span');
    intensityText.textContent = '强度';

    const intensityValue = document.createElement('span');
    intensityValue.className = 'control-value';
    intensityValue.textContent = entry.baseIntensity.toFixed(2);

    intensityLabel.appendChild(intensityText);
    intensityLabel.appendChild(intensityValue);
    intensityGroup.appendChild(intensityLabel);

    const intensitySlider = document.createElement('input');
    intensitySlider.type = 'range';
    intensitySlider.min = '0';
    intensitySlider.max = '2';
    intensitySlider.step = '0.01';
    intensitySlider.value = entry.baseIntensity.toString();
    intensitySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      intensityValue.textContent = val.toFixed(2);
      this.lightManager.updateLightIntensity(entry.id, val);
    });
    intensityGroup.appendChild(intensitySlider);
    item.appendChild(intensityGroup);

    if (entry.type !== 'ambient') {
      const posLabel = document.createElement('div');
      posLabel.className = 'pos-label';
      posLabel.textContent = '位置微调 (±0.5)';
      item.appendChild(posLabel);

      const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
      axes.forEach((axis) => {
        const posControls = document.createElement('div');
        posControls.className = 'pos-controls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'pos-btn';
        minusBtn.textContent = `${axis.toUpperCase()}-`;
        minusBtn.addEventListener('click', () => {
          this.lightManager.adjustLightPosition(entry.id, axis, -0.5);
          this.updatePositionLabel(entry, typeLabel);
        });

        const plusBtn = document.createElement('button');
        plusBtn.className = 'pos-btn';
        plusBtn.textContent = `${axis.toUpperCase()}+`;
        plusBtn.addEventListener('click', () => {
          this.lightManager.adjustLightPosition(entry.id, axis, 0.5);
          this.updatePositionLabel(entry, typeLabel);
        });

        posControls.appendChild(minusBtn);
        posControls.appendChild(plusBtn);
        item.appendChild(posControls);
      });
    }

    return item;
  }

  private updatePositionLabel(entry: LightEntry, labelEl: HTMLSpanElement): void {
    const typeNames: Record<string, string> = {
      ambient: '环境光',
      point: '点光源',
      spot: '聚光灯'
    };
    labelEl.textContent = `${typeNames[entry.type]}  [${entry.light.position.x.toFixed(1)}, ${entry.light.position.y.toFixed(1)}, ${entry.light.position.z.toFixed(1)}]`;
  }

  public refreshLightPositions(): void {
    const items = this.lightListContainer.querySelectorAll('.light-item');
    items.forEach((itemEl) => {
      const id = (itemEl as HTMLDivElement).dataset.lightId;
      if (!id) return;

      const lights = this.lightManager.getLights();
      const entry = lights.find((l) => l.id === id);
      if (!entry) return;

      const typeLabel = itemEl.querySelector('.light-type') as HTMLSpanElement;
      if (typeLabel) {
        this.updatePositionLabel(entry, typeLabel);
      }
    });
  }
}
