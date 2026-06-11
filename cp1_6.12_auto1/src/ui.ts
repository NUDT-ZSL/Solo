import * as THREE from 'three';
import { PlanetConfig, SUN_CONFIG } from './data/planetData';
import { PlanetObject } from './models/planet';

export interface UIHandlers {
  onTogglePause: () => void;
  onResetView: () => void;
  onToggleLabels: (visible: boolean) => void;
  onCloseInfo: () => void;
}

export class UIManager {
  private isPaused: boolean = false;
  private labelsVisible: boolean = true;
  private btnToggle: HTMLButtonElement;
  private btnToggleIcon: HTMLSpanElement;
  private btnToggleText: HTMLSpanElement;
  private btnReset: HTMLButtonElement;
  private toggleLabels: HTMLDivElement;
  private infoPanel: HTMLDivElement;
  private infoName: HTMLDivElement;
  private infoRadius: HTMLSpanElement;
  private infoPeriod: HTMLSpanElement;
  private infoSize: HTMLSpanElement;
  private infoRotation: HTMLSpanElement;
  private infoClose: HTMLButtonElement;

  constructor(private handlers: UIHandlers) {
    this.btnToggle = document.getElementById('btn-toggle') as HTMLButtonElement;
    this.btnToggleIcon = document.getElementById('btn-toggle-icon') as HTMLSpanElement;
    this.btnToggleText = document.getElementById('btn-toggle-text') as HTMLSpanElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.toggleLabels = document.getElementById('toggle-labels') as HTMLDivElement;
    this.infoPanel = document.getElementById('info-panel') as HTMLDivElement;
    this.infoName = document.getElementById('info-name') as HTMLDivElement;
    this.infoRadius = document.getElementById('info-radius') as HTMLSpanElement;
    this.infoPeriod = document.getElementById('info-period') as HTMLSpanElement;
    this.infoSize = document.getElementById('info-size') as HTMLSpanElement;
    this.infoRotation = document.getElementById('info-rotation') as HTMLSpanElement;
    this.infoClose = document.getElementById('info-close') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.btnToggle.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      this.updateToggleButton();
      this.handlers.onTogglePause();
    });

    this.btnReset.addEventListener('click', () => {
      this.handlers.onResetView();
    });

    this.toggleLabels.addEventListener('click', () => {
      this.labelsVisible = !this.labelsVisible;
      this.toggleLabels.classList.toggle('on', this.labelsVisible);
      this.handlers.onToggleLabels(this.labelsVisible);
    });

    this.infoClose.addEventListener('click', () => {
      this.hideInfoPanel();
      this.handlers.onCloseInfo();
    });
  }

  private updateToggleButton(): void {
    if (this.isPaused) {
      this.btnToggleIcon.textContent = '▶';
      this.btnToggleText.textContent = '继续';
      this.btnToggle.classList.add('active');
    } else {
      this.btnToggleIcon.textContent = '⏸';
      this.btnToggleText.textContent = '暂停';
      this.btnToggle.classList.remove('active');
    }
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public getLabelsVisible(): boolean {
    return this.labelsVisible;
  }

  public showPlanetInfo(config: PlanetConfig): void {
    this.infoName.textContent = `${config.nameCN} (${config.name})`;
    this.infoRadius.textContent = `${config.orbitRadius.toFixed(1)} AU (显示比例)`;
    this.infoPeriod.textContent = `${config.orbitPeriodDays.toLocaleString()} 天`;
    this.infoSize.textContent = `${config.realDiameterKm.toLocaleString()} km`;

    const rotHours = config.rotationPeriodHours;
    if (rotHours >= 24) {
      const days = Math.floor(rotHours / 24);
      const hours = Math.round(rotHours % 24);
      this.infoRotation.textContent = `${days}天${hours}小时`;
    } else {
      this.infoRotation.textContent = `${rotHours.toFixed(1)} 小时`;
    }

    this.infoPanel.classList.add('visible');
  }

  public showSunInfo(): void {
    this.infoName.textContent = `${SUN_CONFIG.nameCN} (${SUN_CONFIG.name})`;
    this.infoRadius.textContent = '— (中心恒星)';
    this.infoPeriod.textContent = '— (不公转)';
    this.infoSize.textContent = `${SUN_CONFIG.realDiameterKm.toLocaleString()} km`;
    this.infoRotation.textContent = '约 25-35 天';

    this.infoPanel.classList.add('visible');
  }

  public hideInfoPanel(): void {
    this.infoPanel.classList.remove('visible');
  }

  public updateLabelsVisibility(
    planets: PlanetObject[],
    sunLabel: HTMLDivElement | null
  ): void {
    planets.forEach((planet) => {
      if (planet.labelDiv) {
        planet.labelDiv.style.opacity = this.labelsVisible ? '1' : '0';
      }
    });
    if (sunLabel) {
      sunLabel.style.opacity = this.labelsVisible ? '1' : '0';
    }
  }
}

export function createPlanetLabel(
  nameCN: string,
  container: HTMLElement
): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'planet-label';
  div.textContent = nameCN;
  container.appendChild(div);
  return div;
}

export function updateLabelPosition(
  label: HTMLDivElement,
  worldPosition: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  container: HTMLElement
): void {
  const rect = container.getBoundingClientRect();
  const vector = worldPosition.clone().project(camera);

  const x = (vector.x * 0.5 + 0.5) * rect.width;
  const y = (-vector.y * 0.5 + 0.5) * rect.height;

  label.style.left = `${x}px`;
  label.style.top = `${y - 18}px`;

  const behind = vector.z > 1;
  label.style.display = behind ? 'none' : 'block';
}
