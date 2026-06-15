import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CrystalCluster, CrystalClusterParams } from './CrystalCluster';

class CrystalApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private crystalCluster: CrystalCluster;
  private starField: THREE.Points;
  private groundMesh: THREE.Mesh;
  private groundMaterial: THREE.ShaderMaterial;

  private paused: boolean = false;
  private time: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private fpsFrames: number = 0;
  private fpsTimer: number = 0;
  private starFlashActive: boolean = false;
  private starFlashCount: number = 0;
  private starFlashTimer: number = 0;

  private params: {
    growthSpeed: number;
    branchAngle: number;
    colorStartH: number;
    colorStartS: number;
    colorStartL: number;
    colorEndH: number;
    colorEndS: number;
    colorEndL: number;
    lightH: number;
    lightV: number;
  };

  constructor() {
    this.params = {
      growthSpeed: 0.3,
      branchAngle: 20,
      colorStartH: 200,
      colorStartS: 80,
      colorStartL: 70,
      colorEndH: 320,
      colorEndS: 80,
      colorEndL: 60,
      lightH: 45,
      lightV: 45
    };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.03);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 4, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.updateLightPosition();
    this.scene.add(this.directionalLight);

    const pointLight = new THREE.PointLight(0x4488ff, 0.5, 20);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);

    const crystalParams: CrystalClusterParams = {
      growthSpeed: this.params.growthSpeed,
      branchAngle: this.params.branchAngle,
      colorStart: this.getStartColor(),
      colorEnd: this.getEndColor()
    };

    this.crystalCluster = new CrystalCluster(crystalParams, () => this.onMaxComplexity());
    this.scene.add(this.crystalCluster.group);

    this.starField = this.createStarField();
    this.scene.add(this.starField);

    this.groundMesh = this.createGround();
    this.scene.add(this.groundMesh);
    this.groundMaterial = this.groundMesh.material as THREE.ShaderMaterial;

    this.setupEventListeners();
    this.lastTime = performance.now();
    this.animate();
  }

  private createStarField(): THREE.Points {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 15 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  private createGround(): THREE.Mesh {
    const radius = 4;
    const segments = 64;

    const geometry = new THREE.CircleGeometry(radius, segments);

    const uniforms = {
      uRadius: { value: radius },
      uLightDir: { value: new THREE.Vector2(0, 0) },
      uColorStart: { value: new THREE.Color(0x4488ff) },
      uColorEnd: { value: new THREE.Color(0x8844ff) }
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uRadius;
      uniform vec2 uLightDir;
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      varying vec2 vUv;

      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        
        if (dist > 0.5) discard;
        
        float gradient = dist * 2.0;
        float lightInfluence = dot(normalize(vUv - center), normalize(uLightDir)) * 0.5 + 0.5;
        
        vec3 color = mix(uColorStart, uColorEnd, gradient * 0.6 + lightInfluence * 0.4);
        float alpha = (1.0 - gradient) * 0.3;
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -1.5;

    return mesh;
  }

  private getStartColor(): THREE.Color {
    return new THREE.Color().setHSL(
      this.params.colorStartH / 360,
      this.params.colorStartS / 100,
      this.params.colorStartL / 100
    );
  }

  private getEndColor(): THREE.Color {
    return new THREE.Color().setHSL(
      this.params.colorEndH / 360,
      this.params.colorEndS / 100,
      this.params.colorEndL / 100
    );
  }

  private updateLightPosition(): void {
    const hRad = (this.params.lightH * Math.PI) / 180;
    const vRad = (this.params.lightV * Math.PI) / 180;

    this.directionalLight.position.set(
      Math.cos(vRad) * Math.cos(hRad) * 10,
      Math.sin(vRad) * 10,
      Math.cos(vRad) * Math.sin(hRad) * 10
    );

    if (this.groundMaterial) {
      this.groundMaterial.uniforms.uLightDir.value.set(
        Math.cos(hRad),
        Math.sin(hRad)
      );
      this.groundMaterial.uniforms.uColorStart.value.copy(this.getStartColor());
      this.groundMaterial.uniforms.uColorEnd.value.copy(this.getEndColor());
    }
  }

  private onMaxComplexity(): void {
    const warningEl = document.getElementById('warning-message');
    if (warningEl) {
      warningEl.classList.add('visible');
    }

    this.starFlashActive = true;
    this.starFlashCount = 0;
    this.starFlashTimer = 0;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const setupSlider = (
      id: string,
      valueId: string,
      callback: (value: number) => void,
      formatter?: (v: number) => string
    ) => {
      const slider = document.getElementById(id) as HTMLInputElement;
      const valueEl = document.getElementById(valueId);
      if (slider && valueEl) {
        slider.addEventListener('input', () => {
          const value = parseFloat(slider.value);
          valueEl.textContent = formatter ? formatter(value) : value.toFixed(value % 1 === 0 ? 0 : 2);
          callback(value);
        });
      }
    };

    setupSlider('growth-speed', 'growth-speed-value', (v) => {
      this.params.growthSpeed = v;
      this.crystalCluster.updateParams({ growthSpeed: v });
    }, (v) => v.toFixed(2));

    setupSlider('branch-angle', 'branch-angle-value', (v) => {
      this.params.branchAngle = v;
      this.crystalCluster.updateParams({ branchAngle: v });
    });

    setupSlider('color-start-h', 'color-start-h-value', (v) => {
      this.params.colorStartH = v;
      this.updateColorPreviews();
      this.crystalCluster.updateParams({ colorStart: this.getStartColor() });
    });
    setupSlider('color-start-s', 'color-start-s-value', (v) => {
      this.params.colorStartS = v;
      this.updateColorPreviews();
      this.crystalCluster.updateParams({ colorStart: this.getStartColor() });
    });
    setupSlider('color-start-l', 'color-start-l-value', (v) => {
      this.params.colorStartL = v;
      this.updateColorPreviews();
      this.crystalCluster.updateParams({ colorStart: this.getStartColor() });
    });

    setupSlider('color-end-h', 'color-end-h-value', (v) => {
      this.params.colorEndH = v;
      this.updateColorPreviews();
      this.crystalCluster.updateParams({ colorEnd: this.getEndColor() });
    });
    setupSlider('color-end-s', 'color-end-s-value', (v) => {
      this.params.colorEndS = v;
      this.updateColorPreviews();
      this.crystalCluster.updateParams({ colorEnd: this.getEndColor() });
    });
    setupSlider('color-end-l', 'color-end-l-value', (v) => {
      this.params.colorEndL = v;
      this.updateColorPreviews();
      this.crystalCluster.updateParams({ colorEnd: this.getEndColor() });
    });

    setupSlider('light-h', 'light-h-value', (v) => {
      this.params.lightH = v;
      this.updateLightPosition();
    });
    setupSlider('light-v', 'light-v-value', (v) => {
      this.params.lightV = v;
      this.updateLightPosition();
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.crystalCluster.reset();
        const warningEl = document.getElementById('warning-message');
        if (warningEl) {
          warningEl.classList.remove('visible');
        }
        this.starFlashActive = false;
      });
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.paused = !this.paused;
        pauseBtn.textContent = this.paused ? '继续' : '暂停';
        pauseBtn.classList.toggle('paused', this.paused);
      });
    }

    this.updateColorPreviews();
  }

  private updateColorPreviews(): void {
    const startPreview = document.getElementById('color-start-preview');
    const endPreview = document.getElementById('color-end-preview');

    if (startPreview) {
      startPreview.style.background = `hsl(${this.params.colorStartH}, ${this.params.colorStartS}%, ${this.params.colorStartL}%)`;
    }
    if (endPreview) {
      endPreview.style.background = `hsl(${this.params.colorEndH}, ${this.params.colorEndS}%, ${this.params.colorEndL}%)`;
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateStatus(): void {
    const segmentCount = document.getElementById('segment-count');
    const avgDepth = document.getElementById('avg-depth');
    const fpsValue = document.getElementById('fps-value');

    if (segmentCount) {
      segmentCount.textContent = this.crystalCluster.getSegmentCount().toString();
    }
    if (avgDepth) {
      avgDepth.textContent = this.crystalCluster.getAverageDepth().toFixed(1);
    }
    if (fpsValue) {
      fpsValue.textContent = this.fps.toString();
      fpsValue.className = 'status-value';
      if (this.fps >= 60) {
        fpsValue.classList.add('fps-high');
      } else if (this.fps >= 30) {
        fpsValue.classList.add('fps-medium');
      } else {
        fpsValue.classList.add('fps-low');
      }
    }

    if (this.fps < 30 && this.crystalCluster.getSegmentCount() > 1000) {
      this.crystalCluster.setMaxDepth(6);
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.time += dt;

    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
      this.updateStatus();
    }

    this.controls.update();

    this.crystalCluster.update(dt, this.time, this.paused);

    this.starField.rotation.y += 0.0005;

    if (this.starFlashActive) {
      this.starFlashTimer += dt;
      const flashPeriod = 0.15;
      const phase = this.starFlashTimer % flashPeriod;
      const flashOn = phase < flashPeriod / 2;

      const mat = this.starField.material as THREE.PointsMaterial;
      mat.opacity = flashOn ? 1.0 : 0.2;
      mat.size = flashOn ? 0.08 : 0.02;

      if (this.starFlashTimer >= flashPeriod * 2) {
        this.starFlashCount++;
        this.starFlashTimer = 0;
        if (this.starFlashCount >= 3) {
          this.starFlashActive = false;
          mat.opacity = 0.8;
          mat.size = 0.02;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CrystalApp();
});
