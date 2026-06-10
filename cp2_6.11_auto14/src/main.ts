import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CloudManager } from './cloudManager';
import { LightingController } from './lightingController';

interface Snapshot {
  positions: Float32Array;
  basePositions: Float32Array;
  params: { windSpeed: number; humidity: number; temperature: number };
  thumbnail: string;
  id: number;
}

class CloudIllusionApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cloudManager: CloudManager;
  private lightingController: LightingController;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private snapshots: Snapshot[] = [];
  private maxSnapshots = 5;
  private snapshotIdCounter = 0;

  private clickedParticle: { index: number; startTime: number } | null = null;
  private labelVisible = false;

  private fpsFrames = 0;
  private fpsTime = 0;

  constructor() {
    const canvas = document.getElementById('cloud-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.003);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 35, 80);
    this.camera.lookAt(0, 5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0e1a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 5, 0);
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 3;
    this.mouse = new THREE.Vector2();

    this.createStarField();
    this.cloudManager = new CloudManager(this.scene, this.camera);
    this.lightingController = new LightingController(this.scene);

    this.clock = new THREE.Clock();

    this.setupUI();
    this.setupEventListeners();

    this.animate();
  }

  private createStarField(): void {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 400 + Math.random() * 200;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xccddff,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private setupUI(): void {
    this.setupSlider('wind-slider', 'wind-value', 'wind-glow', -5, 5, (val) => {
      return val.toFixed(1);
    });
    this.setupSlider('humidity-slider', 'humidity-value', 'humidity-glow', 0, 100, (val) => {
      return Math.round(val).toString();
    });
    this.setupSlider('temp-slider', 'temp-value', 'temp-glow', -10, 40, (val) => {
      return Math.round(val) + '°C';
    });

    this.updateSliderGlow('wind-slider', 'wind-glow', -5, 5);
    this.updateSliderGlow('humidity-slider', 'humidity-glow', 0, 100);
    this.updateSliderGlow('temp-slider', 'temp-glow', -10, 40);

    const snapshotBtn = document.getElementById('snapshot-btn')!;
    snapshotBtn.addEventListener('click', () => this.takeSnapshot());
  }

  private setupSlider(
    sliderId: string,
    valueId: string,
    glowId: string,
    min: number,
    max: number,
    formatter: (val: number) => string
  ): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId)!;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueDisplay.textContent = formatter(val);
      this.updateSliderGlow(sliderId, glowId, min, max);
      this.updateCloudParams();
    });
  }

  private updateSliderGlow(sliderId: string, glowId: string, min: number, max: number): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const glow = document.getElementById(glowId)!;
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;

    glow.style.width = percent + '%';

    let color: string;
    if (percent < 33) {
      const t = percent / 33;
      color = this.lerpColor('#4A9EFF', '#4AFF8A', t);
    } else if (percent < 66) {
      const t = (percent - 33) / 33;
      color = this.lerpColor('#4AFF8A', '#FFAA4A', t);
    } else {
      const t = (percent - 66) / 34;
      color = this.lerpColor('#FFAA4A', '#FF6A4A', t);
    }

    glow.style.background = `linear-gradient(90deg, ${color}, ${color}88)`;
    glow.style.boxShadow = `0 0 8px ${color}88, 0 0 16px ${color}44`;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private updateCloudParams(): void {
    const windSpeed = parseFloat((document.getElementById('wind-slider') as HTMLInputElement).value);
    const humidity = parseFloat((document.getElementById('humidity-slider') as HTMLInputElement).value);
    const temperature = parseFloat((document.getElementById('temp-slider') as HTMLInputElement).value);
    this.cloudManager.setParameters(windSpeed, humidity, temperature);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (event) => this.onCanvasClick(event));

    window.addEventListener('resize', () => this.onResize());
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.cloudManager.getPoints());

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        const elapsedTime = this.clock.getElapsedTime();
        this.cloudManager.createHaloPulse(index, elapsedTime);
        this.clickedParticle = { index, startTime: elapsedTime };
        this.showParticleLabel(index);
      }
    }
  }

  private showParticleLabel(index: number): void {
    const pos = this.cloudManager.getParticlePosition(index);
    const density = this.cloudManager.getParticleDensity(index);

    const coordsEl = document.getElementById('label-coords')!;
    const densityEl = document.getElementById('label-density')!;
    const label = document.getElementById('particle-label')!;

    coordsEl.textContent = `X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(1)} Z:${pos.z.toFixed(1)}`;
    densityEl.textContent = `周围密度: ${density} 粒子`;

    label.classList.add('visible');
    this.labelVisible = true;

    this.updateLabelPosition(index);
  }

  private updateLabelPosition(index: number): void {
    const pos = this.cloudManager.getParticlePosition(index);
    const vector = pos.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const label = document.getElementById('particle-label')!;
    label.style.left = (x + 15) + 'px';
    label.style.top = (y - 30) + 'px';
  }

  private hideParticleLabel(): void {
    const label = document.getElementById('particle-label')!;
    label.classList.remove('visible');
    this.labelVisible = false;
    this.clickedParticle = null;
  }

  private takeSnapshot(): void {
    const positions = this.cloudManager.getPositions();
    const basePositions = this.cloudManager.getBasePositions();
    const params = this.cloudManager.getCurrentParams();

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/jpeg', 0.5);

    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = 50;
    thumbnailCanvas.height = 50;
    const ctx = thumbnailCanvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 50, 50);
      const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.6);

      const snapshot: Snapshot = {
        positions,
        basePositions,
        params,
        thumbnail,
        id: this.snapshotIdCounter++,
      };

      if (this.snapshots.length >= this.maxSnapshots) {
        this.snapshots.shift();
      }
      this.snapshots.push(snapshot);

      this.renderSnapshotList();
    };
    img.src = dataUrl;
  }

  private renderSnapshotList(): void {
    const container = document.getElementById('snapshot-cards')!;
    container.innerHTML = '';

    this.snapshots.forEach((snapshot, index) => {
      const card = document.createElement('div');
      card.className = 'snapshot-card';
      card.innerHTML = `
        <img src="${snapshot.thumbnail}" alt="快照 ${index + 1}">
        <div class="snapshot-info">
          风:${snapshot.params.windSpeed.toFixed(1)} 湿:${snapshot.params.humidity}<br>
          温:${snapshot.params.temperature}°C
        </div>
        <button class="snapshot-delete" data-index="${index}">×</button>
      `;

      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('snapshot-delete')) return;
        this.restoreSnapshot(index);
      });

      const deleteBtn = card.querySelector('.snapshot-delete')!;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSnapshot(index);
      });

      container.appendChild(card);
    });
  }

  private restoreSnapshot(index: number): void {
    const snapshot = this.snapshots[index];
    if (!snapshot) return;

    this.cloudManager.startTransition(snapshot.positions);

    const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
    const humiditySlider = document.getElementById('humidity-slider') as HTMLInputElement;
    const tempSlider = document.getElementById('temp-slider') as HTMLInputElement;

    windSlider.value = snapshot.params.windSpeed.toString();
    humiditySlider.value = snapshot.params.humidity.toString();
    tempSlider.value = snapshot.params.temperature.toString();

    document.getElementById('wind-value')!.textContent = snapshot.params.windSpeed.toFixed(1);
    document.getElementById('humidity-value')!.textContent = snapshot.params.humidity.toString();
    document.getElementById('temp-value')!.textContent = snapshot.params.temperature + '°C';

    this.updateSliderGlow('wind-slider', 'wind-glow', -5, 5);
    this.updateSliderGlow('humidity-slider', 'humidity-glow', 0, 100);
    this.updateSliderGlow('temp-slider', 'temp-glow', -10, 40);

    this.cloudManager.setParameters(
      snapshot.params.windSpeed,
      snapshot.params.humidity,
      snapshot.params.temperature
    );

    document.querySelectorAll('.snapshot-card').forEach((c) => c.classList.remove('active'));
    const cards = document.querySelectorAll('.snapshot-card');
    if (cards[index]) cards[index].classList.add('active');
  }

  private deleteSnapshot(index: number): void {
    this.snapshots.splice(index, 1);
    this.renderSnapshotList();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.cloudManager.update(deltaTime, elapsedTime);
    this.lightingController.update(elapsedTime);

    const cameraPos = this.camera.position.clone();
    const cloudCenter = new THREE.Vector3(0, 5, 0);
    const offset = cameraPos.clone().sub(cloudCenter).normalize().multiplyScalar(2);
    this.cloudManager.getPoints().position.x = offset.x;
    this.cloudManager.getPoints().position.z = offset.z;

    if (this.labelVisible && this.clickedParticle) {
      const age = elapsedTime - this.clickedParticle.startTime;
      if (age > 2) {
        this.hideParticleLabel();
      } else {
        this.updateLabelPosition(this.clickedParticle.index);
      }
    }

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      document.getElementById('fps-counter')!.textContent = `FPS: ${fps}`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}

new CloudIllusionApp();
