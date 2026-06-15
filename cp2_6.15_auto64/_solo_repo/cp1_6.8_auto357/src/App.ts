import * as THREE from 'three';
import { AuroraDome, ColorTheme } from './AuroraDome';
import { ParticleSwarm } from './ParticleSwarm';
import { ControlPanel } from './ControlPanel';

interface AudioAnalysis {
  level: number;
  bass: number;
  mid: number;
  treble: number;
}

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private auroraDome: AuroraDome;
  private particleSwarm: ParticleSwarm;
  private controlPanel: ControlPanel;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private micStream: MediaStream | null = null;
  private micActive: boolean = false;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: THREE.Spherical = new THREE.Spherical(14, Math.PI * 0.35, 0);
  private targetSpherical: THREE.Spherical = new THREE.Spherical(14, Math.PI * 0.35, 0);
  private lookTarget: THREE.Vector3 = new THREE.Vector3(0, 4, 0);

  private autoRotateSpeed: number = 0.05;
  private clock: THREE.Clock = new THREE.Clock();

  private currentTheme: ColorTheme = 'aurora';
  private currentDensity: number = 0.6;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private raycastPlane: THREE.Mesh;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.auroraDome = new AuroraDome();
    this.scene.add(this.auroraDome.object);

    this.particleSwarm = new ParticleSwarm();
    this.particleSwarm.setDensity(this.currentDensity);
    this.scene.add(this.particleSwarm.object);

    const planeGeo = new THREE.PlaneGeometry(40, 40);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    this.raycastPlane = new THREE.Mesh(planeGeo, planeMat);
    this.raycastPlane.position.y = 4;
    this.raycastPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.raycastPlane);

    this.addBackgroundGradient();
    this.addAmbientLights();

    this.controlPanel = new ControlPanel({
      onMicToggle: () => this.toggleMic(),
      onThemeChange: (theme: ColorTheme) => this.setTheme(theme),
      onDensityChange: (density: number) => this.setDensity(density),
    });
    document.body.appendChild(this.controlPanel.element);

    this.setupMouseControls();
    this.setupTouchControls();
  }

  private addBackgroundGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.4, '#050830');
    gradient.addColorStop(0.7, '#020a28');
    gradient.addColorStop(1, '#000810');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private addAmbientLights() {
    const ambient = new THREE.AmbientLight(0x112244, 0.3);
    this.scene.add(ambient);
  }

  private setupMouseControls() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.targetSpherical.theta -= dx * 0.005;
      this.targetSpherical.phi = THREE.MathUtils.clamp(
        this.targetSpherical.phi - dy * 0.005,
        0.1,
        Math.PI * 0.85
      );
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetSpherical.radius = THREE.MathUtils.clamp(
        this.targetSpherical.radius + e.deltaY * 0.01,
        5,
        30
      );
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      if (this.isDragging) return;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.raycastPlane);
      if (intersects.length > 0) {
        this.particleSwarm.triggerRipple(intersects[0].point, this.clock.getElapsedTime());
      }
    });
  }

  private setupTouchControls() {
    const canvas = this.renderer.domElement;
    let touchStartDist = 0;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.previousMouse.x;
        const dy = e.touches[0].clientY - this.previousMouse.y;
        this.targetSpherical.theta -= dx * 0.005;
        this.targetSpherical.phi = THREE.MathUtils.clamp(
          this.targetSpherical.phi - dy * 0.005,
          0.1,
          Math.PI * 0.85
        );
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = touchStartDist - dist;
        this.targetSpherical.radius = THREE.MathUtils.clamp(
          this.targetSpherical.radius + delta * 0.02,
          5,
          30
        );
        touchStartDist = dist;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  async toggleMic() {
    if (this.micActive) {
      this.stopMic();
      this.controlPanel.setMicState(false);
      return;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.micActive = true;
      this.controlPanel.setMicState(true);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      this.controlPanel.setMicState(false);
    }
  }

  private stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    this.micActive = false;
  }

  setTheme(theme: ColorTheme) {
    this.currentTheme = theme;
    this.auroraDome.setTheme(theme);
    this.particleSwarm.setTheme(theme);
  }

  setDensity(density: number) {
    this.currentDensity = density;
    this.particleSwarm.setDensity(density);
  }

  private getAudioAnalysis(): AudioAnalysis {
    if (!this.micActive || !this.analyser) {
      return { level: 0, bass: 0, mid: 0, treble: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    const len = this.dataArray.length;

    let bass = 0, mid = 0, treble = 0, total = 0;
    const bassEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.5);

    for (let i = 0; i < len; i++) {
      const v = this.dataArray[i] / 255;
      total += v;
      if (i < bassEnd) bass += v;
      else if (i < midEnd) mid += v;
      else treble += v;
    }

    return {
      level: total / len,
      bass: bass / bassEnd,
      mid: mid / (midEnd - bassEnd),
      treble: treble / (len - midEnd),
    };
  }

  private updateCamera() {
    if (!this.isDragging) {
      this.targetSpherical.theta += this.autoRotateSpeed * 0.001;
    }

    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.08;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.08;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.08;

    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    pos.y += this.lookTarget.y;
    this.camera.position.copy(pos);
    this.camera.lookAt(this.lookTarget);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const time = this.clock.getElapsedTime();
    const audio = this.getAudioAnalysis();

    this.auroraDome.update(time, audio.level);
    this.particleSwarm.update(time, audio);
    this.updateCamera();

    this.renderer.render(this.scene, this.camera);
  };

  start() {
    this.animate();
  }
}
