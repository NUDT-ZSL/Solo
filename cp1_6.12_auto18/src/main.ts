import * as THREE from 'three';
import { CityGenerator, CityParams } from './cityGenerator';
import { LightingControls, LightingParams } from './lightingControls';
import { InteractionControls, CAMERA_PRESETS, CameraPreset } from './interaction';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cityGenerator: CityGenerator;
  private lightingControls: LightingControls;
  private interactionControls: InteractionControls;

  private currentCityParams: CityParams = {
    density: 25,
    heightMin: 5,
    heightMax: 50,
    seed: 42,
  };

  private currentLightingParams: LightingParams = {
    azimuth: 45,
    elevation: 45,
    ambientIntensity: 0.6,
  };

  private currentPreset: string = 'street';
  private cityUpdateTimeout: number | null = null;

  private fpsFrames = 0;
  private fpsTime = 0;
  private fpsDisplay: HTMLElement | null = null;

  private hoverOverlay: HTMLElement | null = null;
  private vignetteOverlay: HTMLElement | null = null;
  private pulseContainer: HTMLElement | null = null;
  private infoPanel: HTMLElement | null = null;

  private numberAnimTimers: Map<string, { from: number; to: number; start: number; duration: number; el: HTMLElement; suffix: string; decimals: number }> = new Map();

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2238);
    this.scene.fog = new THREE.Fog(0xb0c4de, 50, 220);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );
    this.camera.position.copy(CAMERA_PRESETS.street.position);
    this.camera.lookAt(CAMERA_PRESETS.street.target);

    this.cityGenerator = new CityGenerator();
    this.scene.add(this.cityGenerator.generate(this.currentCityParams));

    this.lightingControls = new LightingControls();
    this.scene.add(this.lightingControls.getGroup());

    this.interactionControls = new InteractionControls(
      this.camera,
      this.renderer.domElement,
      this.cityGenerator
    );

    this.setupUI();
    this.setupResize();
    this.setupBuildingInteraction();
    this.createHoverOverlay();

    this.fpsDisplay = document.getElementById('fps-counter');
    this.vignetteOverlay = document.getElementById('vignette-overlay');
    this.pulseContainer = document.getElementById('pulse-container');
    this.infoPanel = document.getElementById('building-info');

    this.animate();
  }

  private createHoverOverlay(): void {
    if (this.hoverOverlay) return;
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.style.position = 'fixed';
    this.hoverOverlay.style.width = '0';
    this.hoverOverlay.style.height = '0';
    this.hoverOverlay.style.borderRadius = '50%';
    this.hoverOverlay.style.background = 'radial-gradient(circle, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0.15) 40%, transparent 70%)';
    this.hoverOverlay.style.pointerEvents = 'none';
    this.hoverOverlay.style.zIndex = '70';
    this.hoverOverlay.style.transform = 'translate(-50%, -50%)';
    this.hoverOverlay.style.opacity = '0';
    this.hoverOverlay.style.transition = 'width 0.15s ease-out, height 0.15s ease-out, opacity 0.15s ease-out';
    this.hoverOverlay.style.willChange = 'opacity, left, top, width, height';
    document.body.appendChild(this.hoverOverlay);
  }

  private setupUI(): void {
    const panel = document.getElementById('control-panel')!;
    if (window.innerWidth < 768) {
      panel.classList.add('collapsed');
    }

    this.bindSlider('ctrl-density', 'val-density', (rawVal, displayEl) => {
      const v = parseInt(rawVal);
      this.currentCityParams.density = v;
      this.animateNumber(displayEl, this.currentCityParams.density, '', 0);
      this.scheduleCityUpdate();
    });

    this.bindSlider('ctrl-height', 'val-height', (rawVal, displayEl) => {
      const v = parseInt(rawVal);
      this.currentCityParams.heightMax = v;
      this.animateNumber(displayEl, this.currentCityParams.heightMax, '', 0);
      this.scheduleCityUpdate();
    });

    this.bindSlider('ctrl-seed', 'val-seed', (rawVal, displayEl) => {
      const v = parseInt(rawVal);
      this.currentCityParams.seed = v;
      this.animateNumber(displayEl, this.currentCityParams.seed, '', 0);
      this.scheduleCityUpdate();
    });

    this.bindSlider('ctrl-azimuth', 'val-azimuth', (rawVal, displayEl) => {
      const v = parseInt(rawVal);
      this.currentLightingParams.azimuth = v;
      this.lightingControls.update(this.currentLightingParams);
      this.animateNumber(displayEl, v, '°', 0);
    });

    this.bindSlider('ctrl-elevation', 'val-elevation', (rawVal, displayEl) => {
      const v = parseInt(rawVal);
      this.currentLightingParams.elevation = v;
      this.lightingControls.update(this.currentLightingParams);
      this.animateNumber(displayEl, v, '°', 0);
    });

    this.bindSlider('ctrl-ambient', 'val-ambient', (rawVal, displayEl) => {
      const v = parseFloat(rawVal);
      this.currentLightingParams.ambientIntensity = v;
      this.lightingControls.update(this.currentLightingParams);
      this.animateNumber(displayEl, v, '', 2);
    });

    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetName = (btn as HTMLElement).dataset.preset!;
        const preset = CAMERA_PRESETS[presetName] as CameraPreset | undefined;
        if (!preset) return;

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPreset = presetName;

        if (this.vignetteOverlay) {
          this.vignetteOverlay.style.transition = 'opacity 0.15s ease-out';
          this.vignetteOverlay.style.opacity = '0.85';
        }

        this.interactionControls.onPresetAnimation((t) => {
          if (!this.vignetteOverlay) return;
          const peak = 0.35;
          if (t < peak) {
            this.vignetteOverlay.style.opacity = String(0.15 + (t / peak) * 0.7);
          } else {
            this.vignetteOverlay.style.opacity = String(0.85 * (1 - (t - peak) / (1 - peak)));
          }
        });

        this.interactionControls.setPreset(preset, 1.5);
        setTimeout(() => {
          if (this.vignetteOverlay) {
            this.vignetteOverlay.style.transition = 'opacity 0.25s ease-out';
            this.vignetteOverlay.style.opacity = '0';
          }
        }, 1700);
      });
    });

    const panelToggle = document.getElementById('panel-toggle-btn')!;
    const controlPanel = document.getElementById('control-panel')!;
    panelToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('collapsed');
      panelToggle.classList.toggle('collapsed-btn');
      panelToggle.textContent = controlPanel.classList.contains('collapsed') ? '▶' : '◀';
    });

    const mobileToggle = document.getElementById('mobile-toggle')!;
    mobileToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('expanded');
    });
  }

  private bindSlider(sliderId: string, valueId: string, onChange: (v: string, el: HTMLElement) => void): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId)!;
    slider.addEventListener('input', () => onChange(slider.value, valueDisplay));
  }

  private animateNumber(el: HTMLElement, to: number, suffix: string, decimals: number): void {
    const key = el.id || el.getAttribute('data-key') || Math.random().toString();
    const existing = this.numberAnimTimers.get(key);
    const fromVal = existing ? (1 - (performance.now() - existing.start) / existing.duration) * existing.from + ((performance.now() - existing.start) / existing.duration) * existing.to : to;
    const start = performance.now();
    const duration = 300;
    this.numberAnimTimers.set(key, { from: fromVal, to, start, duration, el, suffix, decimals });
  }

  private updateNumberAnimations(): void {
    const now = performance.now();
    for (const [key, anim] of this.numberAnimTimers.entries()) {
      const t = Math.min(1, (now - anim.start) / anim.duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const val = anim.from + (anim.to - anim.from) * eased;
      const displayVal = anim.decimals > 0 ? val.toFixed(anim.decimals) : Math.round(val).toString();
      anim.el.textContent = displayVal + anim.suffix;
      if (t >= 1) {
        this.numberAnimTimers.delete(key);
      }
    }
  }

  private scheduleCityUpdate(): void {
    if (this.cityUpdateTimeout !== null) {
      clearTimeout(this.cityUpdateTimeout);
    }
    this.cityUpdateTimeout = window.setTimeout(() => {
      this.cityGenerator.update(this.currentCityParams, 1.0);
      this.cityUpdateTimeout = null;
    }, 40);
  }

  private setupBuildingInteraction(): void {
    const infoPanel = document.getElementById('building-info')!;
    const infoTitle = document.getElementById('info-title')!;
    const infoHeight = document.getElementById('info-height')!;
    const infoFloors = document.getElementById('info-floors')!;

    this.interactionControls.onBuildingClick((building, screenX, screenY) => {
      infoTitle.textContent = `建筑 #${String(building.id + 1).padStart(3, '0')}`;
      infoHeight.textContent = `${building.height} m`;
      infoFloors.textContent = `${building.floors} 层`;

      const panelW = 200;
      const panelH = 120;
      let left = screenX + 18;
      let top = screenY - panelH / 2;

      if (window.innerWidth < 768) {
        left = Math.max(12, Math.min(window.innerWidth - panelW - 12, screenX - panelW / 2));
        top = Math.max(12, Math.min(window.innerHeight - panelH - 90, screenY + 18));
      } else {
        if (left + panelW > window.innerWidth - 315) {
          left = screenX - panelW - 18;
        }
        top = Math.max(12, Math.min(window.innerHeight - panelH - 12, top));
      }

      infoPanel.style.left = left + 'px';
      infoPanel.style.top = top + 'px';
      infoPanel.style.display = 'block';

      this.createPulseEffect(screenX, screenY);
    });

    this.interactionControls.onBuildingHover((building, screenX, screenY) => {
      if (!this.hoverOverlay) return;
      if (building && screenX !== undefined && screenY !== undefined) {
        this.hoverOverlay.style.opacity = '1';
        this.hoverOverlay.style.width = '40px';
        this.hoverOverlay.style.height = '40px';
        this.hoverOverlay.style.left = screenX + 'px';
        this.hoverOverlay.style.top = screenY + 'px';
      } else {
        this.hoverOverlay.style.opacity = '0';
        this.hoverOverlay.style.width = '0';
        this.hoverOverlay.style.height = '0';
      }
    });

    this.renderer.domElement.addEventListener('mousedown', () => {
      infoPanel.style.display = 'none';
    });
  }

  private createPulseEffect(x: number, y: number): void {
    if (!this.pulseContainer) return;
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.className = 'pulse-ring';
      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
      ring.style.width = '24px';
      ring.style.height = '24px';
      ring.style.animationDelay = (i * 0.14) + 's';
      this.pulseContainer.appendChild(ring);
      setTimeout(() => ring.remove(), 1300);
    }
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();

    this.cityGenerator.updateTransition(now);
    this.interactionControls.updateAnimation(now);
    this.interactionControls.updateHighlight(now);
    this.updateNumberAnimations();

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    if (now - this.fpsTime >= 500) {
      if (this.fpsDisplay) {
        const fps = Math.round(this.fpsFrames * 1000 / (now - this.fpsTime));
        this.fpsDisplay.textContent = `FPS: ${fps}`;
      }
      this.fpsFrames = 0;
      this.fpsTime = now;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => new App());
