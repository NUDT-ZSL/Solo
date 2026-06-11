import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeteorParticleSystem, type MeteorConfig } from './particleSystem';
import { UIControls } from './uiControls';

const BURST_DURATION = 3.0;
const BURST_MULTIPLIER = 2;
const FPS_WARNING_THRESHOLD = 45;
const FPS_DEGRADE_THRESHOLD = 30;

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private loadingOverlay: HTMLElement;
  private fpsCounter: HTMLElement;

  private particleSystem!: MeteorParticleSystem;
  private uiControls!: UIControls;

  private currentConfig: MeteorConfig = {
    density: 15,
    direction: 270,
    speed: 15
  };

  private burstActive = false;
  private burstRemaining = 0;
  private baseDensity = 15;

  private frameCount = 0;
  private fpsElapsed = 0;
  private currentFps = 0;

  private degradeActive = false;
  private degradeDensityReduction = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 60);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 150;
    this.controls.enablePan = false;

    this.clock = new THREE.Clock();

    this.init();
  }

  private init(): void {
    this.setupStars();
    this.setupLights();

    this.particleSystem = new MeteorParticleSystem(this.scene, this.currentConfig);
    this.baseDensity = this.currentConfig.density;

    this.uiControls = new UIControls(
      (partial) => this.updateConfig(partial),
      () => this.triggerBurst()
    );

    window.addEventListener('resize', () => this.onResize());

    setTimeout(() => {
      this.loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 600);
    }, 500);

    this.animate();
  }

  private setupStars(): void {
    const starCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.4 + Math.random() * 0.6;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * (0.8 + Math.random() * 0.2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.3);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff8c00, 0.5, 100);
    pointLight.position.set(0, 20, 0);
    this.scene.add(pointLight);
  }

  private getEffectiveDensity(): number {
    let density = this.baseDensity;
    if (this.burstActive) {
      density = this.baseDensity * BURST_MULTIPLIER;
    }
    if (this.degradeActive) {
      density = Math.max(1, density - this.degradeDensityReduction);
    }
    return density;
  }

  public updateConfig(partial: Partial<MeteorConfig>): void {
    if (partial.density !== undefined) {
      this.currentConfig.density = partial.density;
      this.baseDensity = partial.density;
      console.debug(`[App] updateConfig: density=${partial.density}, baseDensity=${this.baseDensity}, burstActive=${this.burstActive}`);
    } else {
      Object.assign(this.currentConfig, partial);
    }

    const effectiveDensity = this.getEffectiveDensity();
    console.debug(`[App] 应用密度: baseDensity=${this.baseDensity} → effectiveDensity=${effectiveDensity}, burst=${this.burstActive}, degrade=${this.degradeActive}`);
    console.assert(effectiveDensity > 0, `[App] 密度断言失败: effectiveDensity=${effectiveDensity}`);
    console.assert(effectiveDensity === this.baseDensity || this.burstActive || this.degradeActive,
      `[App] 密度不一致: effectiveDensity=${effectiveDensity} !== baseDensity=${this.baseDensity} 但无激活状态`);

    this.particleSystem.updateConfig({
      ...this.currentConfig,
      density: effectiveDensity
    });
  }

  private triggerBurst(): void {
    const wasBurstActive = this.burstActive;
    if (!this.burstActive) {
      this.burstActive = true;
      this.burstRemaining = BURST_DURATION;

      const burstDensity = this.getEffectiveDensity();
      console.debug(`[App] triggerBurst: baseDensity=${this.baseDensity} × ${BURST_MULTIPLIER} = ${burstDensity}, wasActive=${wasBurstActive}`);

      this.particleSystem.updateConfig({
        ...this.currentConfig,
        density: burstDensity
      });
      console.debug(`[App] 验证: particleSystem.config.density=${this.particleSystem.getConfig().density}`);
    } else {
      this.burstRemaining = BURST_DURATION;
      console.debug(`[App] triggerBurst: 重置爆发倒计时, remaining=${this.burstRemaining}`);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFpsCounter(dt: number): void {
    this.frameCount++;
    this.fpsElapsed += dt;

    if (this.fpsElapsed >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsElapsed);
      const poolStats = this.particleSystem.getPoolStats();
      const meteorUtil = Math.round((poolStats.activeMeteors / poolStats.totalMeteors) * 100);
      const debrisUtil = Math.round((poolStats.activeDebris / poolStats.totalDebris) * 100);
      const burstTag = this.burstActive ? ' [爆发中]' : '';
      const degradeTag = this.degradeActive ? ' [降级]' : '';

      this.fpsCounter.textContent = `FPS: ${this.currentFps} | 流星: ${poolStats.activeMeteors}/${poolStats.totalMeteors}(${meteorUtil}%) | 碎片: ${poolStats.activeDebris}/${poolStats.totalDebris}(${debrisUtil}%)${burstTag}${degradeTag}`;

      if (poolStats.meteorPoolExhausted > 0 || poolStats.debrisPoolExhausted > 0) {
        console.debug(`[App] 对象池溢出: meteor=${poolStats.meteorPoolExhausted}, debris=${poolStats.debrisPoolExhausted}`);
      }

      this.frameCount = 0;
      this.fpsElapsed = 0;
    }

    if (this.currentFps < FPS_DEGRADE_THRESHOLD && !this.degradeActive) {
      this.degradeActive = true;
      this.degradeDensityReduction = 0;
      console.debug(`[App] FPS严重过低(${this.currentFps}), 启动降级模式`);
    } else if (this.currentFps < FPS_WARNING_THRESHOLD && this.degradeActive) {
      this.degradeDensityReduction = Math.min(this.baseDensity - 1, this.degradeDensityReduction + 2);
      console.debug(`[App] FPS偏低(${this.currentFps}), 降级减少密度: -${this.degradeDensityReduction}`);
      this.particleSystem.updateConfig({
        ...this.currentConfig,
        density: this.getEffectiveDensity()
      });
    } else if (this.currentFps >= FPS_WARNING_THRESHOLD && this.degradeActive) {
      this.degradeActive = false;
      this.degradeDensityReduction = 0;
      console.debug(`[App] FPS恢复(${this.currentFps}), 退出降级模式`);
      this.particleSystem.updateConfig({
        ...this.currentConfig,
        density: this.getEffectiveDensity()
      });
    }

    if (this.currentFps >= FPS_WARNING_THRESHOLD) {
      this.fpsCounter.style.color = 'rgba(255, 255, 255, 0.7)';
      this.fpsCounter.style.borderColor = 'rgba(255, 140, 0, 0.2)';
    } else if (this.currentFps >= FPS_DEGRADE_THRESHOLD) {
      this.fpsCounter.style.color = '#FF8C00';
      this.fpsCounter.style.borderColor = 'rgba(255, 140, 0, 0.6)';
    } else {
      this.fpsCounter.style.color = '#FF4444';
      this.fpsCounter.style.borderColor = 'rgba(255, 68, 68, 0.6)';
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.updateFpsCounter(dt);

    if (this.burstActive) {
      this.burstRemaining -= dt;
      if (this.burstRemaining <= 0) {
        this.burstActive = false;
        this.burstRemaining = 0;
        const restoreDensity = this.getEffectiveDensity();
        console.debug(`[App] 爆发结束, 恢复密度: ${restoreDensity}, baseDensity=${this.baseDensity}`);
        this.particleSystem.updateConfig({
          ...this.currentConfig,
          density: restoreDensity
        });
        console.debug(`[App] 验证恢复: particleSystem.config.density=${this.particleSystem.getConfig().density}`);
      }
    }

    this.controls.update();
    this.particleSystem.update(dt, time);
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
