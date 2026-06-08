import * as THREE from 'three';
import { Jellyfish } from './jellyfish';
import { ParticleDensity } from './particleSystem';

export interface UIState {
  speedMultiplier: number;
  breathMultiplier: number;
  density: ParticleDensity;
}

export interface UICallbacks {
  onSpeedChange: (value: number) => void;
  onBreathChange: (value: number) => void;
  onDensityChange: (value: ParticleDensity) => void;
  onJellyfishClick: (jellyfish: Jellyfish) => void;
}

export class UIController {
  private state: UIState;
  private callbacks: UICallbacks;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private speedSlider: HTMLInputElement;
  private breathSlider: HTMLInputElement;
  private densitySelect: HTMLSelectElement;
  private speedValue: HTMLElement;
  private breathValue: HTMLElement;
  private infoCard: HTMLElement;
  private cardColor: HTMLElement;
  private cardName: HTMLElement;
  private cardSpeed: HTMLElement;
  private cardDiameter: HTMLElement;

  private activeJellyfish: Jellyfish | null = null;
  private selectedJellyfish: Jellyfish | null = null;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.state = {
      speedMultiplier: 1.0,
      breathMultiplier: 1.0,
      density: 'medium'
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.breathSlider = document.getElementById('breath-slider') as HTMLInputElement;
    this.densitySelect = document.getElementById('density-select') as HTMLSelectElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.breathValue = document.getElementById('breath-value') as HTMLElement;
    this.infoCard = document.getElementById('info-card') as HTMLElement;
    this.cardColor = document.getElementById('card-color') as HTMLElement;
    this.cardName = document.getElementById('card-name') as HTMLElement;
    this.cardSpeed = document.getElementById('card-speed') as HTMLElement;
    this.cardDiameter = document.getElementById('card-diameter') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.speedMultiplier = value;
      this.speedValue.textContent = value.toFixed(1) + 'x';
      this.callbacks.onSpeedChange(value);
    });

    this.breathSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.breathMultiplier = value;
      this.breathValue.textContent = value.toFixed(1) + 'x';
      this.callbacks.onBreathChange(value);
    });

    this.densitySelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as ParticleDensity;
      this.state.density = value;
      this.callbacks.onDensityChange(value);
    });
  }

  public setupCanvasInteraction(canvas: HTMLCanvasElement, jellyfishList: Jellyfish[], camera: THREE.Camera): void {
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      for (const jf of jellyfishList) {
        allObjects.push(...jf.getClickableObjects());
      }
      const intersects = this.raycaster.intersectObjects(allObjects, true);

      let hoveredJelly: Jellyfish | null = null;
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        for (const jf of jellyfishList) {
          const clickables = jf.getClickableObjects();
          if (clickables.includes(hit) || this.isDescendant(hit, clickables)) {
            hoveredJelly = jf;
            break;
          }
        }
      }

      this.activeJellyfish = hoveredJelly;
      canvas.style.cursor = hoveredJelly ? 'pointer' : 'grab';
    });

    canvas.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      for (const jf of jellyfishList) {
        allObjects.push(...jf.getClickableObjects());
      }
      const intersects = this.raycaster.intersectObjects(allObjects, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        for (const jf of jellyfishList) {
          const clickables = jf.getClickableObjects();
          if (clickables.includes(hit) || this.isDescendant(hit, clickables)) {
            this.selectedJellyfish = jf;
            jf.triggerHighlight();
            this.showInfoCard(jf);
            this.callbacks.onJellyfishClick(jf);
            break;
          }
        }
      }
    });
  }

  private isDescendant(obj: THREE.Object3D, list: THREE.Object3D[]): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (list.includes(current)) return true;
      current = current.parent;
    }
    return false;
  }

  private showInfoCard(jellyfish: Jellyfish): void {
    const colorHex = '#' + jellyfish.color.getHexString().toUpperCase();
    this.cardColor.style.backgroundColor = colorHex;
    this.cardColor.style.color = colorHex;
    this.cardName.textContent = jellyfish.colorName + '水母';
    this.cardSpeed.textContent = jellyfish.currentSpeed.toFixed(2) + ' 单位/秒';
    this.cardDiameter.textContent = jellyfish.currentDiameter.toFixed(1) + ' 单位';
    this.infoCard.classList.add('visible');

    setTimeout(() => {
      if (this.selectedJellyfish === jellyfish) {
        this.infoCard.classList.remove('visible');
      }
    }, 5000);
  }

  public update(): void {
    if (this.selectedJellyfish) {
      this.cardSpeed.textContent = this.selectedJellyfish.currentSpeed.toFixed(2) + ' 单位/秒';
      this.cardDiameter.textContent = this.selectedJellyfish.currentDiameter.toFixed(1) + ' 单位';
    }
  }

  public getState(): UIState {
    return { ...this.state };
  }
}
