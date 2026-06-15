import * as THREE from 'three';
import { generateFaces } from './faceGenerator';
import { OrigamiModel, FaceMeshInfo } from './origamiModel';
import { UIController } from './uiController';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  private origamiModel: OrigamiModel;
  private uiController: UIController;
  private clock: THREE.Clock;
  private rafId: number = 0;
  private initialized: boolean = false;

  constructor() {
    this.canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    this.canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0F0F1F, 0.0012);
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvasWrapper.clientWidth / this.canvasWrapper.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 0, 600);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvasWrapper.clientWidth, this.canvasWrapper.clientHeight, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.setupLights();
    this.setupEnvironment();
    this.origamiModel = new OrigamiModel(this.scene, this.camera, this.canvas, {
      onFaceClick: this.handleFaceClick.bind(this)
    });
    this.uiController = new UIController({
      onFileSelected: this.handleFileSelected.bind(this),
      onAutoRotateToggle: this.handleAutoRotateToggle.bind(this),
      onReset: this.handleReset.bind(this)
    });
    this.initialized = true;
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(300, 400, 500);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.5);
    fillLight.position.set(-400, 200, 300);
    this.scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xff88aa, 0.35);
    rimLight.position.set(0, -300, -400);
    this.scene.add(rimLight);
    const topLight = new THREE.PointLight(0x00B4FF, 0.8, 2000, 0.5);
    topLight.position.set(0, 500, 200);
    this.scene.add(topLight);
    const bottomLight = new THREE.PointLight(0x7B68EE, 0.6, 1500, 0.5);
    bottomLight.position.set(0, -400, 300);
    this.scene.add(bottomLight);
  }

  private setupEnvironment() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 2] = -500 - Math.random() * 1000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.6
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private handleFaceClick(faceInfo: FaceMeshInfo, screenPos: { x: number; y: number }) {
    this.uiController.showFaceInfo(faceInfo, screenPos);
  }

  private async handleFileSelected(file: File) {
    this.uiController.showLoading('正在处理图片');
    this.origamiModel.clearSelection();
    this.uiController.hidePopup();
    try {
      const faceData = await generateFaces(file);
      this.origamiModel.buildModel(faceData);
      this.uiController.setFaceCount(faceData.triangles.length);
      this.uiController.hideLoading(300);
    } catch (err) {
      console.error('Face generation error:', err);
      this.uiController.hideLoading(0);
      alert('图片处理失败，请重试或上传其他图片');
    }
  }

  private handleAutoRotateToggle(enabled: boolean) {
    this.origamiModel.setAutoRotate(enabled);
  }

  private handleReset() {
    this.origamiModel.clearSelection();
    this.uiController.hidePopup();
    this.uiController.setAutoRotateActive(false);
    this.origamiModel.resetView();
  }

  public async start() {
    this.animate();
    setTimeout(() => {
      this.buildDefaultModel();
    }, 400);
    setTimeout(() => {
      this.uiController.hideLoading(200);
    }, 1200);
    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();
  }

  private buildDefaultModel() {
    const file = this.generateDemoImageFile();
    generateFaces(file).then((faceData) => {
      this.origamiModel.buildModel(faceData);
      this.uiController.setFaceCount(faceData.triangles.length);
    }).catch((err) => {
      console.error('Demo model generation failed:', err);
    });
  }

  private generateDemoImageFile(): File {
    const canvas = document.createElement('canvas');
    const w = 640;
    const h = 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#00B4FF');
    gradient.addColorStop(0.25, '#7B68EE');
    gradient.addColorStop(0.5, '#FF6B9D');
    gradient.addColorStop(0.75, '#FFD93D');
    gradient.addColorStop(1, '#6BCF7B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 30 + Math.random() * 80;
      const hue = Math.random() * 360;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const dataUrl = canvas.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], 'demo.png', { type: 'image/png' });
  }

  private handleResize() {
    if (!this.initialized) return;
    const width = this.canvasWrapper.clientWidth;
    const height = this.canvasWrapper.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta() * 1000;
    const now = performance.now();
    this.origamiModel.update(delta, now);
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    cancelAnimationFrame(this.rafId);
    this.origamiModel.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}

const app = new Application();
app.start();
