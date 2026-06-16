import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer';
import { CubeArray } from './cubeArray';
import { UIControl } from './uiControl';
import type { PresetTrack, Mode } from './types';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private audioAnalyzer: AudioAnalyzer;
  private cubeArray: CubeArray;
  private uiControl: UIControl;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private mirror: THREE.Mesh | null = null;
  private ambientLight!: THREE.AmbientLight;
  private pointLight!: THREE.PointLight;
  private dirLight!: THREE.DirectionalLight;

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.audioAnalyzer = new AudioAnalyzer();
    this.cubeArray = new CubeArray();
    this.uiControl = new UIControl(this.container, {
      onPlayPause: this.handlePlayPause.bind(this),
      onProgressChange: this.handleProgressChange.bind(this),
      onVolumeChange: this.handleVolumeChange.bind(this),
      onModeToggle: this.handleModeToggle.bind(this),
      onPresetSelect: this.handlePresetSelect.bind(this),
      onFileUpload: this.handleFileUpload.bind(this),
    });

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupScene();
    this.setupLights();
    this.setupMirror();
    this.setupControls();
    this.scene.add(this.cubeArray.group);
    this.scene.add(this.cubeArray.particleGroup);
    this.uiControl.setVolume(0.7);
    this.audioAnalyzer.setVolume(0.7);
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
    this.startLoop();
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 4, 8);
    this.camera.lookAt(0, 1.5, 0);
  }

  private setupScene(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(0.5, '#101128');
    gradient.addColorStop(1, '#1A1B3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0x050510, 0.04);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x606090, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(5, 10, 5);
    this.scene.add(this.dirLight);

    this.pointLight = new THREE.PointLight(0x6688ff, 1.5, 20, 1.5);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);

    const rimLight = new THREE.DirectionalLight(0xff6666, 0.3);
    rimLight.position.set(-5, 3, -5);
    this.scene.add(rimLight);
  }

  private setupMirror(): void {
    const mirrorGeometry = new THREE.PlaneGeometry(30, 30);
    
    const mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = 512;
    mirrorCanvas.height = 512;
    const mctx = mirrorCanvas.getContext('2d')!;
    const mirrorGradient = mctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    mirrorGradient.addColorStop(0, 'rgba(60, 80, 140, 0.25)');
    mirrorGradient.addColorStop(0.5, 'rgba(40, 50, 100, 0.18)');
    mirrorGradient.addColorStop(1, 'rgba(20, 25, 60, 0.1)');
    mctx.fillStyle = mirrorGradient;
    mctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 15; i++) {
      const y = (i / 15) * 512;
      const alpha = 0.03 + Math.sin(i * 0.5) * 0.02;
      mctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
      mctx.fillRect(0, y, 512, 2);
    }

    const mirrorTexture = new THREE.CanvasTexture(mirrorCanvas);
    mirrorTexture.colorSpace = THREE.SRGBColorSpace;

    const mirrorMaterial = new THREE.MeshStandardMaterial({
      map: mirrorTexture,
      transparent: true,
      opacity: 0.2,
      metalness: 0.9,
      roughness: 0.4,
      envMapIntensity: 1,
      side: THREE.DoubleSide,
    });

    this.mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
    this.mirror.rotation.x = -Math.PI / 2;
    this.mirror.position.y = -0.5;
    this.scene.add(this.mirror);

    const gridHelper = new THREE.GridHelper(30, 30, 0x334477, 0x223366);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.1;
    gridHelper.position.y = -0.49;
    this.scene.add(gridHelper);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minPolarAngle = 0.2;
    this.controls.target.set(0, 1.5, 0);
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.update();
  }

  private async handlePlayPause(): Promise<void> {
    if (!this.audioAnalyzer.hasAudio()) {
      return;
    }
    if (this.audioAnalyzer.isPlaying()) {
      this.audioAnalyzer.pause();
      this.uiControl.setPlaying(false);
    } else {
      await this.audioAnalyzer.play();
      this.uiControl.setPlaying(true);
    }
  }

  private handleProgressChange(ratio: number): void {
    this.audioAnalyzer.setProgress(ratio);
  }

  private handleVolumeChange(value: number): void {
    this.audioAnalyzer.setVolume(value);
  }

  private handleModeToggle(mode: Mode): void {
    const currentTime = performance.now();
    this.cubeArray.setMode(mode, currentTime);
  }

  private async handlePresetSelect(track: PresetTrack): Promise<void> {
    const bpm = this.uiControl.getPresetBPM(track.id);
    await this.audioAnalyzer.generateDemoTrack(track.name, bpm);
    this.uiControl.setTrackName(track.name);
    await this.audioAnalyzer.play();
    this.uiControl.setPlaying(true);
  }

  private async handleFileUpload(file: File): Promise<void> {
    await this.audioAnalyzer.loadFromFile(file);
    this.uiControl.setTrackName(this.audioAnalyzer.getTrackName());
    await this.audioAnalyzer.play();
    this.uiControl.setPlaying(true);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    this.lastFPSUpdate = this.lastTime;
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    const freqData = this.audioAnalyzer.getFrequencyData();
    this.cubeArray.update(freqData, deltaTime, currentTime);

    this.pointLight.intensity = 1.2 + freqData.low * 1.5;
    this.pointLight.color.setHSL(0.6 + freqData.mid * 0.2, 0.8, 0.5 + freqData.high * 0.2);
    this.ambientLight.intensity = 0.4 + freqData.amplitude * 0.3;

    if (this.mirror) {
      const mirrorMat = this.mirror.material as THREE.MeshStandardMaterial;
      mirrorMat.emissive = new THREE.Color().setHSL(0.6 + freqData.mid * 0.15, 0.5, freqData.amplitude * 0.1);
      mirrorMat.emissiveIntensity = freqData.low * 0.5;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.audioAnalyzer.hasAudio()) {
      this.uiControl.setProgress(this.audioAnalyzer.getProgress() * 100);
      this.uiControl.setTrackName(this.audioAnalyzer.getTrackName());
      const bpm = this.audioAnalyzer.getBPM();
      this.uiControl.setBPM(bpm);
    }

    this.frameCount++;
    if (currentTime - this.lastFPSUpdate > 1000) {
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.cubeArray.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();
(window as any).app = app;
