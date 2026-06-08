import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STAR_TYPES, STAR_POSITIONS, LifeStage, LIFE_STAGE_LABELS } from './StarData';
import { StarSphere } from './StarSphere';
import { StarDust } from './StarDust';
import { ControlPanel, ControlPanelCallbacks } from './ControlPanel';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private stars: StarSphere[] = [];
  private dusts: StarDust[] = [];
  private controlPanel: ControlPanel;
  private container: HTMLElement;

  private infoCard: HTMLElement | null = null;
  private currentLifeStage: LifeStage = 'main_sequence';
  private defaultCameraPos = new THREE.Vector3(0, 5, 18);
  private defaultCameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.defaultCameraPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.copy(this.defaultCameraTarget);

    this.createBackgroundStars();
    this.createStars();
    this.createAmbientLight();

    const callbacks: ControlPanelCallbacks = {
      onFilterChange: (visibleTypes) => this.handleFilterChange(visibleTypes),
      onStageChange: (stage) => this.handleStageChange(stage),
      onResetView: () => this.handleResetView(),
      onExportScreenshot: () => this.handleExportScreenshot(),
    };
    this.controlPanel = new ControlPanel(container, callbacks);

    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private createBackgroundStars() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying float vBrightness;
        uniform float uTime;
        void main() {
          vBrightness = 0.3 + 0.7 * abs(sin(uTime * 0.2 + position.x * 0.01));
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vBrightness;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vBrightness * 0.6;
          gl_FragColor = vec4(0.7, 0.8, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.userData.isBackground = true;
    this.scene.add(points);
  }

  private createStars() {
    STAR_TYPES.forEach((starData, i) => {
      const position = STAR_POSITIONS[i];
      const star = new StarSphere(starData, position, (s) => this.onStarClick(s));
      this.stars.push(star);
      this.scene.add(star.group);

      const dust = new StarDust(starData, position);
      this.dusts.push(dust);
      this.scene.add(dust.group);
    });
  }

  private createAmbientLight() {
    const ambient = new THREE.AmbientLight(0x1a1a3a, 0.3);
    this.scene.add(ambient);
  }

  private onClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hitObjects = this.stars.map(s => s.getHitObject());
    const intersects = this.raycaster.intersectObjects(hitObjects);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const starSphere = hit.userData.starSphere as StarSphere;
      if (starSphere) {
        starSphere.handleClick();
      }
    } else {
      this.hideInfoCard();
    }
  }

  private onStarClick(star: StarSphere) {
    const worldPos = new THREE.Vector3();
    star.group.getWorldPosition(worldPos);

    const dust = this.dusts.find(d => d.data.id === star.data.id);
    if (dust) {
      dust.triggerConverge(worldPos);
    }

    this.showInfoCard(star, worldPos);
  }

  private showInfoCard(star: StarSphere, _worldPos: THREE.Vector3) {
    this.hideInfoCard();

    const stageLabel = LIFE_STAGE_LABELS[star.currentStage];
    const card = document.createElement('div');
    card.className = 'star-info-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-name">${star.data.name}</span>
        <span class="card-stage">${stageLabel}</span>
      </div>
      <div class="card-body">
        <div class="card-row"><span class="card-label">表面温度</span><span class="card-value">${star.data.temperature.toLocaleString()} K</span></div>
        <div class="card-row"><span class="card-label">质量</span><span class="card-value">${star.data.mass} M☉</span></div>
        <div class="card-row"><span class="card-label">光度</span><span class="card-value">${star.data.luminosity.toLocaleString()} L☉</span></div>
        <div class="card-row"><span class="card-label">脉动周期</span><span class="card-value">${star.data.pulsationPeriod}s</span></div>
        <div class="card-desc">${star.data.description}</div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'star-card-style';
    if (!document.getElementById('star-card-style')) {
      style.textContent = `
        .star-info-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          min-width: 260px;
          padding: 18px 22px;
          background: rgba(8, 14, 30, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(100, 160, 255, 0.25);
          border-radius: 14px;
          color: #c8d8f8;
          font-size: 13px;
          z-index: 200;
          box-shadow: 0 0 40px rgba(60, 120, 255, 0.12), inset 0 0 30px rgba(60, 120, 255, 0.04);
          animation: cardFadeIn 0.35s ease-out;
          pointer-events: auto;
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(100, 160, 255, 0.15);
        }
        .card-name {
          font-size: 18px;
          font-weight: 600;
          color: #a0c8ff;
          text-shadow: 0 0 8px rgba(80, 140, 255, 0.3);
        }
        .card-stage {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(60, 100, 200, 0.3);
          border: 1px solid rgba(100, 160, 255, 0.2);
          color: #8ab4ff;
        }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-label {
          color: #6880a8;
          font-size: 12px;
        }
        .card-value {
          color: #d0e4ff;
          font-size: 13px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .card-desc {
          margin-top: 6px;
          padding-top: 10px;
          border-top: 1px solid rgba(100, 160, 255, 0.1);
          font-size: 12px;
          color: #8898b8;
          line-height: 1.6;
        }
      `;
      document.head.appendChild(style);
    }

    card.addEventListener('click', (e) => e.stopPropagation());
    this.container.appendChild(card);
    this.infoCard = card;
  }

  private hideInfoCard() {
    if (this.infoCard) {
      this.infoCard.remove();
      this.infoCard = null;
    }
  }

  private handleFilterChange(visibleTypes: Set<string>) {
    this.stars.forEach((star) => {
      const visible = visibleTypes.has(star.data.id);
      star.group.visible = visible;
    });
    this.dusts.forEach((dust) => {
      const visible = visibleTypes.has(dust.data.id);
      dust.group.visible = visible;
    });
  }

  private handleStageChange(stage: LifeStage) {
    this.currentLifeStage = stage;
    this.stars.forEach(star => star.setStage(stage));
    this.dusts.forEach(dust => dust.setStage(stage));

    if (this.infoCard) {
      this.hideInfoCard();
    }
  }

  private handleResetView() {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = this.defaultCameraPos.clone();
    const endTarget = this.defaultCameraTarget.clone();
    const duration = 800;
    const startTime = performance.now();

    const animateReset = () => {
      const now = performance.now();
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateReset);
      }
    };
    animateReset();
  }

  private handleExportScreenshot() {
    this.renderer.render(this.scene, this.camera);
    const link = document.createElement('a');
    link.download = `star-flame-atlas-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();

    this.stars.forEach(star => {
      if (star.group.visible) {
        star.update(delta);
      }
    });

    this.dusts.forEach(dust => {
      if (dust.group.visible) {
        dust.update(delta, elapsed);
      }
    });

    this.scene.traverse((child) => {
      if (child instanceof THREE.Points && child.userData.isBackground) {
        const mat = child.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = elapsed;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.stars.forEach(s => s.dispose());
    this.dusts.forEach(d => d.dispose());
    this.controlPanel.dispose();
    this.hideInfoCard();
    this.renderer.dispose();
    this.controls.dispose();
  }
}
