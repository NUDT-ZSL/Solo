import { MaterialType } from './simulator';

export type MaterialName = 'sand' | 'water' | 'wood';

const MATERIAL_MAP: Record<MaterialName, MaterialType> = {
  sand: MaterialType.Sand,
  water: MaterialType.Water,
  wood: MaterialType.Wood
};

export class UIManager {
  private toolbar: HTMLElement;
  private buttons: NodeListOf<HTMLButtonElement>;
  private particleCountEl: HTMLElement;
  private fpsEl: HTMLElement;
  private currentMaterial: MaterialName = 'sand';
  private onMaterialChange: ((material: MaterialType) => void) | null = null;

  constructor() {
    this.toolbar = document.getElementById('toolbar') as HTMLElement;
    this.buttons = this.toolbar.querySelectorAll('.material-btn');
    this.particleCountEl = document.getElementById('particle-count') as HTMLElement;
    this.fpsEl = document.getElementById('fps') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const material = btn.dataset.material as MaterialName;
        this.setActiveMaterial(material);
      });
    });
  }

  public setMaterialChangeCallback(callback: (material: MaterialType) => void): void {
    this.onMaterialChange = callback;
  }

  public setActiveMaterial(material: MaterialName): void {
    if (this.currentMaterial === material) return;

    this.currentMaterial = material;

    this.buttons.forEach((btn) => {
      if (btn.dataset.material === material) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (this.onMaterialChange) {
      this.onMaterialChange(MATERIAL_MAP[material]);
    }
  }

  public getActiveMaterial(): MaterialType {
    return MATERIAL_MAP[this.currentMaterial];
  }

  public updateParticleCount(count: number): void {
    this.particleCountEl.textContent = count.toLocaleString();
  }

  public updateFPS(fps: number): void {
    this.fpsEl.textContent = Math.round(fps).toString();
    this.fpsEl.style.color = this.getFPSColor(fps);
  }

  private getFPSColor(fps: number): string {
    const clampedFps = Math.max(0, Math.min(60, fps));
    const t = clampedFps / 60;

    const r = Math.round(255 * (1 - t));
    const g = Math.round(255 * t);
    const b = 64;

    return `rgb(${r}, ${g}, ${b})`;
  }
}
