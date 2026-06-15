import * as THREE from 'three';
import { SceneRenderer, ViewMode } from './sceneRenderer';
import { particleSystem, ParticleInfo } from './particleSystem';

export interface UIControlState {
  speedMultiplier: number;
  particleCount: number;
  isPlaying: boolean;
  viewMode: ViewMode;
  isDragging: boolean;
  hoveredParticleWindSpeed: number;
  hoveredParticleIndex: number;
}

interface HoverResult {
  indices: Set<number>;
  nearestIndex: number;
  windSpeed: number;
  screenPosition: { x: number; y: number };
}

class UIController {
  private renderer: SceneRenderer;
  private state: UIControlState = {
    speedMultiplier: 1.0,
    particleCount: 2000,
    isPlaying: true,
    viewMode: '3D',
    isDragging: false,
    hoveredParticleWindSpeed: 0,
    hoveredParticleIndex: -1
  };
  private speedSlider: HTMLInputElement | null = null;
  private densitySlider: HTMLInputElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private viewBtn: HTMLButtonElement | null = null;
  private speedValue: HTMLSpanElement | null = null;
  private densityValue: HTMLSpanElement | null = null;
  private playIcon: HTMLSpanElement | null = null;
  private playText: HTMLSpanElement | null = null;
  private viewIcon: HTMLSpanElement | null = null;
  private viewText: HTMLSpanElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private tooltipWindSpeed: HTMLSpanElement | null = null;
  private highlightOverlay: HTMLDivElement | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private canvasContainer: HTMLElement | null = null;
  private lastHoveredIndices: Set<number> = new Set();
  private particleDataCache: ParticleInfo[] = [];
  private onChangeCallback: ((state: UIControlState) => void) | null = null;

  constructor(renderer: SceneRenderer) {
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 8 };
    this.mouse = new THREE.Vector2();
  }

  public init(onChange?: (state: UIControlState) => void): void {
    this.onChangeCallback = onChange || null;

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.viewBtn = document.getElementById('view-btn') as HTMLButtonElement;
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    this.densityValue = document.getElementById('density-value') as HTMLSpanElement;
    this.playIcon = document.getElementById('play-icon') as HTMLSpanElement;
    this.playText = document.getElementById('play-text') as HTMLSpanElement;
    this.viewIcon = document.getElementById('view-icon') as HTMLSpanElement;
    this.viewText = document.getElementById('view-text') as HTMLSpanElement;
    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;
    this.tooltipWindSpeed = document.getElementById('tooltip-wind-speed') as HTMLSpanElement;
    this.highlightOverlay = document.getElementById('highlight') as HTMLDivElement;
    this.canvasContainer = document.getElementById('canvas-container') as HTMLElement;

    this.setupSliderListeners();
    this.setupButtonListeners();
    this.setupMouseListeners();
    this.updateUI();
  }

  private setupSliderListeners(): void {
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.state.speedMultiplier = val;
        particleSystem.setSpeedMultiplier(val);
        if (this.speedValue) {
          this.speedValue.textContent = val.toFixed(1) + 'x';
        }
      });
    }

    if (this.densitySlider) {
      this.densitySlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        this.state.particleCount = val;
        particleSystem.setParticleCount(val);
        if (this.densityValue) {
          this.densityValue.textContent = val.toString();
        }
      });
    }
  }

  private setupButtonListeners(): void {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.state.isPlaying = !this.state.isPlaying;
        this.updatePlayButton();
      });
    }

    if (this.viewBtn) {
      this.viewBtn.addEventListener('click', () => {
        this.state.viewMode = this.renderer.toggleViewMode();
        this.updateViewButton();
      });
    }
  }

  private setupMouseListeners(): void {
    if (!this.canvasContainer) return;

    const canvas = this.canvasContainer.querySelector('canvas');
    if (!canvas) return;

    let isMouseDown = false;
    let movedDuringDrag = false;
    let mouseDownX = 0;
    let mouseDownY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      movedDuringDrag = false;
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
      this.state.isDragging = true;
      this.hideTooltip();
      this.clearHighlights();
    });

    canvas.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        const dx = Math.abs(e.clientX - mouseDownX);
        const dy = Math.abs(e.clientY - mouseDownY);
        if (dx > 3 || dy > 3) {
          movedDuringDrag = true;
        }
      }

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!this.state.isDragging) {
        this.checkHover(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      isMouseDown = false;
      this.state.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      isMouseDown = false;
      this.state.isDragging = false;
      this.hideTooltip();
      this.clearHighlights();
    });

    canvas.addEventListener('wheel', () => {
      this.state.isDragging = true;
      this.hideTooltip();
      this.clearHighlights();
      setTimeout(() => {
        this.state.isDragging = false;
      }, 200);
    });
  }

  public updateParticleData(data: ParticleInfo[]): void {
    this.particleDataCache = data;
  }

  private checkHover(screenX: number, screenY: number): void {
    if (this.state.isDragging) return;

    const hoverResult = this.findNearbyParticles(screenX, screenY);

    if (hoverResult.indices.size > 0) {
      const highlightOverlay = this.highlightOverlay;
      if (highlightOverlay) {
        highlightOverlay.style.left = screenX + 'px';
        highlightOverlay.style.top = screenY + 'px';
        highlightOverlay.style.width = '80px';
        highlightOverlay.style.height = '80px';
        highlightOverlay.classList.add('active');
      }

      this.renderer.updateHighlights(hoverResult.indices);

      if (this.tooltip && this.tooltipWindSpeed) {
        const nearestIdx = hoverResult.nearestIndex;
        const windSpeed = nearestIdx >= 0 && nearestIdx < this.particleDataCache.length
          ? this.particleDataCache[nearestIdx].windSpeed
          : hoverResult.windSpeed;

        this.tooltip.style.left = (screenX + 15) + 'px';
        this.tooltip.style.top = (screenY - 35) + 'px';
        this.tooltipWindSpeed.textContent = windSpeed.toFixed(1) + ' m/s';
        this.tooltip.classList.add('visible');
      }

      this.lastHoveredIndices = hoverResult.indices;
    } else {
      this.hideTooltip();
      this.clearHighlights();
    }
  }

  private findNearbyParticles(screenX: number, screenY: number): HoverResult {
    const result: HoverResult = {
      indices: new Set<number>(),
      nearestIndex: -1,
      windSpeed: 0,
      screenPosition: { x: screenX, y: screenY }
    };

    const camera = this.renderer.getCamera();
    const particlePoints = this.renderer.getParticlePoints();

    if (!particlePoints || !this.particleDataCache.length) return result;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(particlePoints);

    if (intersects.length > 0) {
      const maxDistance = 30;
      let nearestDist = Infinity;

      for (const intersect of intersects) {
        const idx = intersect.index ?? -1;
        if (idx < 0) continue;

        const p = this.particleDataCache[idx];
        if (!p) continue;

        const screenPos = p.position.clone().project(camera);
        const px = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const py = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        const distSq = (px - screenX) ** 2 + (py - screenY) ** 2;
        const distThresholdSq = maxDistance * maxDistance;

        if (distSq <= distThresholdSq) {
          result.indices.add(idx);
          if (distSq < nearestDist) {
            nearestDist = distSq;
            result.nearestIndex = idx;
            result.windSpeed = p.windSpeed;
          }
        }
      }

      if (result.nearestIndex >= 0) {
        result.windSpeed = this.particleDataCache[result.nearestIndex].windSpeed;
      }

      return result;
    }

    const camera2 = this.renderer.getCamera();
    let nearestDist = Infinity;
    const maxDist = 30;

    for (let i = 0; i < this.particleDataCache.length; i++) {
      const p = this.particleDataCache[i];
      const screenPos = p.position.clone().project(camera2);
      const px = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const py = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

      const distSq = (px - screenX) ** 2 + (py - screenY) ** 2;

      if (distSq <= maxDist * maxDist) {
        result.indices.add(i);
        if (distSq < nearestDist) {
          nearestDist = distSq;
          result.nearestIndex = i;
          result.windSpeed = p.windSpeed;
        }
      }
    }

    return result;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
    if (this.highlightOverlay) {
      this.highlightOverlay.classList.remove('active');
    }
  }

  private clearHighlights(): void {
    if (this.lastHoveredIndices.size > 0) {
      this.renderer.updateHighlights(new Set<number>());
      this.lastHoveredIndices.clear();
    }
  }

  private updatePlayButton(): void {
    if (!this.playIcon || !this.playText) return;

    if (this.state.isPlaying) {
      this.playIcon.textContent = '⏸';
      this.playText.textContent = '暂停';
    } else {
      this.playIcon.textContent = '▶';
      this.playText.textContent = '播放';
    }
  }

  private updateViewButton(): void {
    if (!this.viewIcon || !this.viewText) return;

    if (this.state.viewMode === '3D') {
      this.viewIcon.textContent = '⬇';
      this.viewText.textContent = '俯视';
    } else {
      this.viewIcon.textContent = '⬍';
      this.viewText.textContent = '立体';
    }
  }

  private updateUI(): void {
    this.updatePlayButton();
    this.updateViewButton();

    if (this.speedValue) {
      this.speedValue.textContent = this.state.speedMultiplier.toFixed(1) + 'x';
    }
    if (this.densityValue) {
      this.densityValue.textContent = this.state.particleCount.toString();
    }
  }

  public getState(): UIControlState {
    return { ...this.state };
  }

  public isPlaying(): boolean {
    return this.state.isPlaying;
  }

  public getSpeedMultiplier(): number {
    return this.state.speedMultiplier;
  }

  public getViewMode(): ViewMode {
    return this.state.viewMode;
  }
}

let uiControllerInstance: UIController | null = null;

export function createUIController(renderer: SceneRenderer): UIController {
  uiControllerInstance = new UIController(renderer);
  return uiControllerInstance;
}

export function getUIController(): UIController | null {
  return uiControllerInstance;
}

export const uiController = {
  create: createUIController,
  get: getUIController
};
