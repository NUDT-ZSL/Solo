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
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.Fog(0xb0c4de, 50, 200);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
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

    this.fpsDisplay = document.getElementById('fps-counter');

    this.animate();
  }

  private setupUI(): void {
    this.bindSlider('ctrl-density', 'val-density', (v) => {
      this.currentCityParams.density = parseInt(v);
      this.scheduleCityUpdate();
      return v;
    });

    this.bindSlider('ctrl-height', 'val-height', (v) => {
      this.currentCityParams.heightMax = parseInt(v);
      this.scheduleCityUpdate();
      return v;
    });

    this.bindSlider('ctrl-seed', 'val-seed', (v) => {
      this.currentCityParams.seed = parseInt(v);
      this.scheduleCityUpdate();
      return v;
    });

    this.bindSlider('ctrl-azimuth', 'val-azimuth', (v) => {
      this.currentLightingParams.azimuth = parseInt(v);
      this.lightingControls.update(this.currentLightingParams);
      return v + '°';
    });

    this.bindSlider('ctrl-elevation', 'val-elevation', (v) => {
      this.currentLightingParams.elevation = parseInt(v);
      this.lightingControls.update(this.currentLightingParams);
      return v + '°';
    });

    this.bindSlider('ctrl-ambient', 'val-ambient', (v) => {
      this.currentLightingParams.ambientIntensity = parseFloat(v);
      this.lightingControls.update(this.currentLightingParams);
      return parseFloat(v).toFixed(2);
    });

    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetName = (btn as HTMLElement).dataset.preset!;
        const preset = CAMERA_PRESETS[presetName];
        if (!preset) return;

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPreset = presetName;

        const vignette = document.getElementById('vignette-overlay')!;
        vignette.style.opacity = '1';
        setTimeout(() => { vignette.style.opacity = '0'; }, 300);

        this.interactionControls.setPreset(preset, 1.5);
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

  private bindSlider(sliderId: string, valueId: string, onChange: (v: string) => string): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId)!;

    slider.addEventListener('input', () => {
      const displayText = onChange(slider.value);
      valueDisplay.textContent = displayText;
      valueDisplay.classList.remove('rolling');
      void valueDisplay.offsetWidth;
      valueDisplay.classList.add('rolling');
    });
  }

  private scheduleCityUpdate(): void {
    if (this.cityUpdateTimeout !== null) {
      clearTimeout(this.cityUpdateTimeout);
    }
    this.cityUpdateTimeout = window.setTimeout(() => {
      this.cityGenerator.update(this.currentCityParams, 1.0);
      this.cityUpdateTimeout = null;
    }, 50);
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

      const panelWidth = 180;
      const panelHeight = 120;
      let left = screenX + 15;
      let top = screenY - panelHeight / 2;
      if (left + panelWidth > window.innerWidth - 310) {
        left = screenX - panelWidth - 15;
      }
      if (top < 10) top = 10;
      if (top + panelHeight > window.innerHeight - 10) {
        top = window.innerHeight - panelHeight - 10;
      }

      infoPanel.style.left = left + 'px';
      infoPanel.style.top = top + 'px';
      infoPanel.style.display = 'block';

      this.createPulseEffect(screenX, screenY);
    });

    this.interactionControls.onBuildingHover((building) => {
      this.renderer.domElement.style.cursor = building ? 'pointer' : 'grab';
    });

    this.renderer.domElement.addEventListener('mousedown', () => {
      infoPanel.style.display = 'none';
    });
  }

  private createPulseEffect(x: number, y: number): void {
    const container = document.getElementById('pulse-container')!;
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.className = 'pulse-ring';
      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
      ring.style.width = '30px';
      ring.style.height = '30px';
      ring.style.animationDelay = i * 0.15 + 's';
      container.appendChild(ring);
      setTimeout(() => ring.remove(), 1200);
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

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    if (now - this.fpsTime >= 1000) {
      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = `FPS: ${this.fpsFrames}`;
      }
      this.fpsFrames = 0;
      this.fpsTime = now;
    }
  };
}

new App();
