import * as THREE from 'three';
import { LightSourceConfig } from './lightRays';

export interface UILightSource {
  id: string;
  name: string;
  position: THREE.Vector3;
  color: THREE.Color;
  hue: number;
  intensity: number;
  mesh: THREE.Mesh;
}

export interface UICallbacks {
  onLightPositionChange: (id: string, position: THREE.Vector3) => void;
  onLightColorChange: (id: string, color: THREE.Color, hue: number) => void;
  onLightIntensityChange: (id: string, intensity: number) => void;
}

export class UIManager {
  private container: HTMLElement;
  private lightsContainer: HTMLElement;
  private panel: HTMLElement;
  private mobileToggle: HTMLElement;
  private callbacks: UICallbacks;
  private lightSources: Map<string, UILightSource> = new Map();

  private isDraggingLight: boolean = false;
  private draggingLightId: string | null = null;
  private isPanelOpen: boolean = false;
  private readonly MOBILE_BREAKPOINT = 768;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('lights-container')!;
    this.panel = document.getElementById('control-panel')!;
    this.mobileToggle = document.getElementById('mobile-toggle')!;
    this.lightsContainer = this.container;

    this.initMobileControls();
    this.setupResponsiveCheck();
  }

  private setupResponsiveCheck(): void {
    this.checkViewport();
    window.addEventListener('resize', () => this.checkViewport());
  }

  private checkViewport(): void {
    const isMobile = window.innerWidth < this.MOBILE_BREAKPOINT;
    
    if (isMobile) {
      this.mobileToggle.style.display = 'flex';
      if (!this.isPanelOpen) {
        this.panel.classList.remove('open');
      } else {
        this.panel.classList.add('open');
      }
    } else {
      this.mobileToggle.style.display = 'none';
      this.panel.classList.remove('open');
    }
  }

  private initMobileControls(): void {
    this.mobileToggle.addEventListener('click', () => {
      this.isPanelOpen = !this.isPanelOpen;
      if (this.isPanelOpen) {
        this.panel.classList.add('open');
        this.mobileToggle.textContent = '✕';
      } else {
        this.panel.classList.remove('open');
        this.mobileToggle.textContent = '⚙';
      }
    });
  }

  public addLightSource(light: UILightSource): void {
    this.lightSources.set(light.id, light);
    this.renderLightControls(light);
  }

  public updateLightSource(id: string, config: Partial<LightSourceConfig>): void {
    const light = this.lightSources.get(id);
    if (!light) return;

    if (config.position) {
      light.position.copy(config.position);
      light.mesh.position.copy(config.position);
      this.updatePositionInputs(id, config.position);
    }
    if (config.color) {
      light.color.copy(config.color);
      this.updateColorInputs(id, config.color, light.hue);
    }
    if (config.intensity !== undefined) {
      light.intensity = config.intensity;
      this.updateIntensityInput(id, config.intensity);
    }
  }

  private renderLightControls(light: UILightSource): void {
    const section = document.createElement('div');
    section.className = 'light-section';
    section.id = `light-section-${light.id}`;
    section.style.fontFamily = 'monospace';
    section.style.fontSize = '14px';
    section.style.color = '#CCCCCC';

    const label = document.createElement('div');
    label.className = 'light-label';
    label.style.fontFamily = 'monospace';
    label.style.fontSize = '14px';

    const dot = document.createElement('div');
    dot.className = 'light-color-dot';
    dot.style.backgroundColor = `#${light.color.getHexString()}`;
    dot.style.color = `#${light.color.getHexString()}`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = light.name;
    nameSpan.style.color = '#CCCCCC';

    label.appendChild(dot);
    label.appendChild(nameSpan);
    section.appendChild(label);

    section.appendChild(this.createSliderControl(
      light.id, 'posX', 'X 位置',
      light.position.x, -3, 3, 0.01,
      (value) => {
        const pos = light.position.clone();
        pos.x = value;
        this.callbacks.onLightPositionChange(light.id, pos);
      }
    ));

    section.appendChild(this.createSliderControl(
      light.id, 'posY', 'Y 位置',
      light.position.y, -3, 3, 0.01,
      (value) => {
        const pos = light.position.clone();
        pos.y = value;
        this.callbacks.onLightPositionChange(light.id, pos);
      }
    ));

    section.appendChild(this.createSliderControl(
      light.id, 'posZ', 'Z 位置',
      light.position.z, -3, 3, 0.01,
      (value) => {
        const pos = light.position.clone();
        pos.z = value;
        this.callbacks.onLightPositionChange(light.id, pos);
      }
    ));

    section.appendChild(this.createSliderControl(
      light.id, 'intensity', '强度',
      light.intensity, 0, 2, 0.01,
      (value) => {
        this.callbacks.onLightIntensityChange(light.id, value);
      }
    ));

    section.appendChild(this.createColorControl(light));

    this.lightsContainer.appendChild(section);
  }

  private createSliderControl(
    lightId: string,
    param: string,
    labelText: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';
    group.style.fontFamily = 'monospace';
    group.style.fontSize = '14px';

    const label = document.createElement('div');
    label.className = 'control-label';
    label.style.fontFamily = 'monospace';
    label.style.fontSize = '12px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = labelText;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.id = `value-${lightId}-${param}`;
    valueSpan.textContent = value.toFixed(2);
    valueSpan.style.color = '#CCCCCC';

    label.appendChild(labelSpan);
    label.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `slider-${lightId}-${param}`;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.style.transition = 'all 0.3s ease-out';

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      valueSpan.textContent = val.toFixed(2);
      onChange(val);
    });

    group.appendChild(label);
    group.appendChild(slider);

    return group;
  }

  private createColorControl(light: UILightSource): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';
    group.style.fontFamily = 'monospace';
    group.style.fontSize = '14px';

    const label = document.createElement('div');
    label.className = 'control-label';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = '色相';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.id = `value-${light.id}-hue`;
    valueSpan.textContent = `${Math.round(light.hue)}°`;
    label.appendChild(labelSpan);
    label.appendChild(valueSpan);

    const wrapper = document.createElement('div');
    wrapper.className = 'color-picker-wrapper';

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.id = `color-${light.id}`;
    colorPicker.value = `#${light.color.getHexString()}`;

    const hueSlider = document.createElement('input');
    hueSlider.type = 'range';
    hueSlider.className = 'hue-slider';
    hueSlider.id = `hue-${light.id}`;
    hueSlider.min = '0';
    hueSlider.max = '360';
    hueSlider.step = '1';
    hueSlider.value = light.hue.toString();
    hueSlider.style.transition = 'all 0.3s ease-out';

    colorPicker.addEventListener('input', (e) => {
      const hex = (e.target as HTMLInputElement).value;
      const color = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      const hue = hsl.h * 360;
      
      hueSlider.value = hue.toString();
      valueSpan.textContent = `${Math.round(hue)}°`;
      this.callbacks.onLightColorChange(light.id, color, hue);
    });

    hueSlider.addEventListener('input', (e) => {
      const hue = parseFloat((e.target as HTMLInputElement).value);
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.5);
      
      colorPicker.value = `#${color.getHexString()}`;
      valueSpan.textContent = `${Math.round(hue)}°`;
      this.callbacks.onLightColorChange(light.id, color, hue);
    });

    wrapper.appendChild(colorPicker);
    wrapper.appendChild(hueSlider);

    group.appendChild(label);
    group.appendChild(wrapper);

    return group;
  }

  private updatePositionInputs(id: string, position: THREE.Vector3): void {
    const inputs: [string, number][] = [
      ['posX', position.x],
      ['posY', position.y],
      ['posZ', position.z],
    ];

    for (const [param, value] of inputs) {
      const slider = document.getElementById(`slider-${id}-${param}`) as HTMLInputElement;
      const valueEl = document.getElementById(`value-${id}-${param}`);
      if (slider) slider.value = value.toString();
      if (valueEl) valueEl.textContent = value.toFixed(2);
    }
  }

  private updateColorInputs(id: string, color: THREE.Color, hue: number): void {
    const colorPicker = document.getElementById(`color-${id}`) as HTMLInputElement;
    const hueSlider = document.getElementById(`hue-${id}`) as HTMLInputElement;
    const valueEl = document.getElementById(`value-${id}-hue`);
    const dot = document.querySelector(`#light-section-${id} .light-color-dot`) as HTMLElement;

    if (colorPicker) colorPicker.value = `#${color.getHexString()}`;
    if (hueSlider) hueSlider.value = hue.toString();
    if (valueEl) valueEl.textContent = `${Math.round(hue)}°`;
    if (dot) {
      dot.style.backgroundColor = `#${color.getHexString()}`;
      dot.style.color = `#${color.getHexString()}`;
    }
  }

  private updateIntensityInput(id: string, intensity: number): void {
    const slider = document.getElementById(`slider-${id}-intensity`) as HTMLInputElement;
    const valueEl = document.getElementById(`value-${id}-intensity`);
    if (slider) slider.value = intensity.toString();
    if (valueEl) valueEl.textContent = intensity.toFixed(2);
  }

  public startLightDrag(id: string): void {
    this.isDraggingLight = true;
    this.draggingLightId = id;
  }

  public updateLightDrag(position: THREE.Vector3): void {
    if (!this.isDraggingLight || !this.draggingLightId) return;
    this.callbacks.onLightPositionChange(this.draggingLightId, position);
  }

  public endLightDrag(): void {
    this.isDraggingLight = false;
    this.draggingLightId = null;
  }

  public getIsDraggingLight(): boolean {
    return this.isDraggingLight;
  }

  public getDraggingLightId(): string | null {
    return this.draggingLightId;
  }

  public getLightSource(id: string): UILightSource | undefined {
    return this.lightSources.get(id);
  }

  public getAllLightIds(): string[] {
    return Array.from(this.lightSources.keys());
  }
}
