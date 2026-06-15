import type { HUDData, Planet } from './physics';

export interface HUDEvents {
  onGChange: (value: number) => void;
  onReset: () => void;
  onLaunch: () => void;
  onClearTrail: () => void;
  onAddPlanet: () => void;
}

export class HUDManager {
  private speedEl: HTMLElement;
  private distanceEl: HTMLElement;
  private angularEl: HTMLElement;
  private gSliderEl: HTMLInputElement;
  private gValueEl: HTMLElement;
  private statusTextEl: HTMLElement;
  private planetListEl: HTMLElement;
  private flashOverlay: HTMLElement;

  constructor(private events: HUDEvents) {
    this.speedEl = document.getElementById('hud-speed')!;
    this.distanceEl = document.getElementById('hud-distance')!;
    this.angularEl = document.getElementById('hud-angular')!;
    this.gSliderEl = document.getElementById('g-slider') as HTMLInputElement;
    this.gValueEl = document.getElementById('g-value')!;
    this.statusTextEl = document.getElementById('status-text')!;
    this.planetListEl = document.getElementById('planet-list')!;
    this.flashOverlay = document.getElementById('flash-overlay')!;

    this.bindEvents();
  }

  private bindEvents() {
    this.gSliderEl.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.gValueEl.textContent = value.toFixed(1);
      this.events.onGChange(value);
    });

    document.getElementById('btn-reset')!.addEventListener('click', () => {
      this.events.onReset();
    });

    document.getElementById('btn-launch')!.addEventListener('click', () => {
      this.events.onLaunch();
    });

    document.getElementById('btn-clear-trail')!.addEventListener('click', () => {
      this.events.onClearTrail();
    });

    document.getElementById('btn-add-planet')!.addEventListener('click', () => {
      this.events.onAddPlanet();
    });
  }

  public update(data: HUDData) {
    this.speedEl.textContent = data.speed.toFixed(2);
    this.distanceEl.textContent = data.nearestPlanetDistance !== null
      ? data.nearestPlanetDistance.toFixed(1)
      : '--';
    this.angularEl.textContent = data.angularMomentum.toFixed(2);
  }

  public updateStatus(text: string) {
    this.statusTextEl.textContent = text;
  }

  public updatePlanetList(planets: Planet[]) {
    this.planetListEl.innerHTML = '';
    planets.forEach((planet, index) => {
      const item = document.createElement('div');
      item.className = 'planet-item';
      item.innerHTML = `
        <div class="planet-color-dot" style="background: ${planet.color}"></div>
        <div class="planet-info">
          行星 ${index + 1} | 质量: ${planet.mass} | 半径: ${planet.radius}px
        </div>
      `;
      this.planetListEl.appendChild(item);
    });
  }

  public triggerLaunchFlash() {
    this.flashOverlay.style.opacity = '0.5';
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.flashOverlay.style.opacity = '0';
      }, 100);
    });
  }

  public setLaunchButtonEnabled(enabled: boolean) {
    const btn = document.getElementById('btn-launch') as HTMLButtonElement;
    btn.disabled = !enabled;
  }
}
