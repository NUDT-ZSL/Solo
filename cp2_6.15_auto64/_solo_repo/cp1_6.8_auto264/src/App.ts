import * as THREE from 'three';
import { CloudLayer } from './components/CloudLayer';
import { GeometryCluster } from './components/GeometryCluster';
import { EffectWave } from './components/EffectWave';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cloudLayer: CloudLayer;
  private geometryCluster: GeometryCluster;
  private effectWave: EffectWave;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean;
  private previousMouse: THREE.Vector2;
  private spherical: THREE.Spherical;
  private targetSpherical: THREE.Spherical;
  private lookAtTarget: THREE.Vector3;
  private animationId: number;
  private controlPanel: HTMLDivElement;
  private intensitySlider: HTMLInputElement;
  private particleSlider: HTMLInputElement;
  private defaultCameraPos: THREE.Vector3;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.previousMouse = new THREE.Vector2();
    this.animationId = 0;
    this.defaultCameraPos = camera.position.clone();

    this.spherical = new THREE.Spherical();
    this.spherical.setFromVector3(camera.position);
    this.targetSpherical = this.spherical.clone();
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);

    this.addLights();
    this.addEnvironment();

    this.cloudLayer = new CloudLayer();
    this.scene.add(this.cloudLayer.mesh);

    this.geometryCluster = new GeometryCluster();
    this.scene.add(this.geometryCluster.group);

    this.effectWave = new EffectWave();
    this.scene.add(this.effectWave.group);

    this.controlPanel = this.createControlPanel();
    this.intensitySlider = this.controlPanel.querySelector('#intensity-slider')!;
    this.particleSlider = this.controlPanel.querySelector('#particle-slider')!;

    this.bindEvents();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xd0d8f0, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xf0e8ff, 0.8);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);

    const point1 = new THREE.PointLight(0xa0b8ff, 0.5, 40);
    point1.position.set(-8, 5, 5);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xc0a0ff, 0.4, 40);
    point2.position.set(8, 3, -5);
    this.scene.add(point2);
  }

  private addEnvironment(): void {
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(stars);
  }

  private createControlPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '20px 24px',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      boxShadow: '0 8px 32px rgba(100, 120, 160, 0.15)',
      color: '#4a5568',
      fontSize: '13px',
      fontFamily: '"SF Pro Display", "PingFang SC", -apple-system, sans-serif',
      zIndex: '100',
      minWidth: '220px',
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#2d3748',
      letterSpacing: '0.5px',
    });
    title.textContent = '云霓映射 · 控制台';
    panel.appendChild(title);

    const createSlider = (id: string, label: string, min: number, max: number, value: number, step: number): HTMLInputElement => {
      const row = document.createElement('div');
      Object.assign(row.style, { marginBottom: '14px' });

      const lbl = document.createElement('label');
      Object.assign(lbl.style, {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        fontSize: '12px',
        color: '#718096',
      });
      lbl.textContent = label;

      const valSpan = document.createElement('span');
      valSpan.id = `${id}-val`;
      valSpan.textContent = String(value);
      valSpan.style.color = '#4a5568';
      valSpan.style.fontWeight = '500';
      lbl.appendChild(valSpan);
      row.appendChild(lbl);

      const slider = document.createElement('input');
      slider.id = id;
      slider.type = 'range';
      slider.min = String(min);
      slider.max = String(max);
      slider.value = String(value);
      slider.step = String(step);
      Object.assign(slider.style, {
        width: '100%',
        height: '4px',
        appearance: 'none',
        WebkitAppearance: 'none',
        background: 'linear-gradient(90deg, rgba(160,180,255,0.4), rgba(192,160,255,0.4))',
        borderRadius: '2px',
        outline: 'none',
        cursor: 'pointer',
      });

      slider.addEventListener('input', () => {
        valSpan.textContent = slider.value;
      });

      row.appendChild(slider);
      panel.appendChild(row);
      return slider;
    };

    createSlider('intensity-slider', '光波强度', 0.1, 2.0, 1.0, 0.1);
    createSlider('particle-slider', '粒子数量', 50, 500, 200, 10);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置视角';
    Object.assign(resetBtn.style, {
      width: '100%',
      padding: '8px 0',
      marginTop: '4px',
      border: '1px solid rgba(160, 180, 255, 0.3)',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, 0.12)',
      color: '#5a6a8a',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      letterSpacing: '0.5px',
    });

    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(160, 180, 255, 0.2)';
      resetBtn.style.color = '#3a4a6a';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255, 255, 255, 0.12)';
      resetBtn.style.color = '#5a6a8a';
    });
    resetBtn.addEventListener('click', () => {
      this.resetCamera();
    });

    panel.appendChild(resetBtn);
    document.body.appendChild(panel);
    return panel;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.previousMouse.set(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.targetSpherical.theta -= dx * 0.005;
      this.targetSpherical.phi = THREE.MathUtils.clamp(
        this.targetSpherical.phi - dy * 0.005,
        0.2,
        Math.PI * 0.85
      );
      this.previousMouse.set(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.targetSpherical.radius = THREE.MathUtils.clamp(
        this.targetSpherical.radius + e.deltaY * 0.02,
        8,
        50
      );
    }, { passive: false });

    canvas.addEventListener('click', (e: MouseEvent) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.cloudLayer.mesh);
      if (intersects.length > 0) {
        this.effectWave.trigger(intersects[0].point);
      }
    });

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouse.set(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;
      this.targetSpherical.theta -= dx * 0.005;
      this.targetSpherical.phi = THREE.MathUtils.clamp(
        this.targetSpherical.phi - dy * 0.005,
        0.2,
        Math.PI * 0.85
      );
      this.previousMouse.set(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private resetCamera(): void {
    const defaultSpherical = new THREE.Spherical();
    defaultSpherical.setFromVector3(this.defaultCameraPos);
    this.targetSpherical.copy(defaultSpherical);
  }

  private updateCamera(): void {
    const lerpFactor = 0.08;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * lerpFactor;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * lerpFactor;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * lerpFactor;

    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.lookAtTarget);
  }

  private updateControls(): void {
    const intensity = parseFloat(this.intensitySlider.value);
    const particles = parseInt(this.particleSlider.value);
    this.effectWave.setIntensity(intensity);
    this.effectWave.setParticleCount(particles);
  }

  start(): void {
    this.clock.start();
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.updateCamera();
      this.updateControls();

      this.cloudLayer.update();
      this.geometryCluster.update(elapsed);
      this.effectWave.update(delta, this.geometryCluster.getMeshes());

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }
}
