import * as THREE from 'three';
import { generateFaces, FaceData, Triangle, Point } from './faceGenerator';
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
    const demoFaceData = this.generateDemoFaceData();
    this.origamiModel.buildModel(demoFaceData);
    this.uiController.setFaceCount(demoFaceData.triangles.length);
  }

  private generateDemoFaceData(): FaceData {
    const w = 400;
    const h = 300;
    const cols = 10;
    const rows = 7;
    const cellW = w / cols;
    const cellH = h / rows;
    const triangles: Triangle[] = [];
    const pointsArr: { x: number; y: number }[][] = [];
    for (let r = 0; r <= rows; r++) {
      pointsArr[r] = [];
      for (let c = 0; c <= cols; c++) {
        pointsArr[r][c] = {
          x: c * cellW + (Math.random() - 0.5) * cellW * 0.2,
          y: r * cellH + (Math.random() - 0.5) * cellH * 0.2
        };
      }
    }
    const colorPalette = [
      { r: 0x00, g: 0xB4, b: 0xFF },
      { r: 0x7B, g: 0x68, b: 0xEE },
      { r: 0xFF, g: 0x6B, b: 0x9D },
      { r: 0xFF, g: 0xD9, b: 0x3D },
      { r: 0x6B, g: 0xCF, b: 0x7B },
      { r: 0xFF, g: 0x8C, b: 0x42 },
      { r: 0x58, g: 0x56, b: 0xD8 },
      { r: 0xF0, g: 0x93, b: 0xFB }
    ];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p00 = pointsArr[r][c];
        const p10 = pointsArr[r][c + 1];
        const p01 = pointsArr[r + 1][c];
        const p11 = pointsArr[r + 1][c + 1];
        const cx = (c + 0.5) / cols;
        const cy = (r + 0.5) / rows;
        const gradient = (p: Point) => {
          const t1 = p.x / w;
          const baseColor1 = colorPalette[Math.floor(t1 * (colorPalette.length - 1)) % colorPalette.length];
          const baseColor2 = colorPalette[(Math.floor(t1 * (colorPalette.length - 1)) + 1) % colorPalette.length];
          const lt = t1 * (colorPalette.length - 1) - Math.floor(t1 * (colorPalette.length - 1));
          const colorByX = {
            r: Math.round(baseColor1.r * (1 - lt) + baseColor2.r * lt),
            g: Math.round(baseColor1.g * (1 - lt) + baseColor2.g * lt),
            b: Math.round(baseColor1.b * (1 - lt) + baseColor2.b * lt)
          };
          const bright = 0.7 + 0.3 * (1 - Math.abs(cy - 0.5) * 1.5);
          return {
            r: Math.min(255, Math.round(colorByX.r * bright)),
            g: Math.min(255, Math.round(colorByX.g * bright)),
            b: Math.min(255, Math.round(colorByX.b * bright))
          };
        };
        const avg1 = gradient({ x: (p00.x + p10.x + p01.x) / 3, y: (p00.y + p10.y + p01.y) / 3 });
        triangles.push({
          a: { ...p00 }, b: { ...p10 }, c: { ...p01 },
          centroid: { x: (p00.x + p10.x + p01.x) / 3, y: (p00.y + p10.y + p01.y) / 3 },
          avgColor: avg1,
          neighbors: [],
          uvBounds: { minX: cx - 0.5 / cols, minY: cy - 0.5 / rows, maxX: cx + 0.5 / cols, maxY: cy + 0.5 / rows }
        });
        idx++;
        const avg2 = gradient({ x: (p10.x + p11.x + p01.x) / 3, y: (p10.y + p11.y + p01.y) / 3 });
        triangles.push({
          a: { ...p10 }, b: { ...p11 }, c: { ...p01 },
          centroid: { x: (p10.x + p11.x + p01.x) / 3, y: (p10.y + p11.y + p01.y) / 3 },
          avgColor: avg2,
          neighbors: [],
          uvBounds: { minX: cx - 0.5 / cols, minY: cy - 0.5 / rows, maxX: cx + 0.5 / cols, maxY: cy + 0.5 / rows }
        });
        idx++;
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseIdx = (r * cols + c) * 2;
        const t1Idx = baseIdx;
        const t2Idx = baseIdx + 1;
        triangles[t1Idx].neighbors.push(t2Idx);
        triangles[t2Idx].neighbors.push(t1Idx);
        if (c > 0) {
          const leftBase = (r * cols + (c - 1)) * 2;
          triangles[t1Idx].neighbors.push(leftBase);
          triangles[leftBase].neighbors.push(t1Idx);
          triangles[t2Idx].neighbors.push(leftBase);
          triangles[leftBase + 1].neighbors.push(t2Idx);
        }
        if (r > 0) {
          const topBase = ((r - 1) * cols + c) * 2;
          triangles[t1Idx].neighbors.push(topBase);
          triangles[topBase + 1].neighbors.push(t1Idx);
          triangles[t2Idx].neighbors.push(topBase);
          triangles[topBase + 1].neighbors.push(t2Idx);
        }
      }
    }
    return {
      triangles,
      imageWidth: w,
      imageHeight: h,
      normalizedScale: 400 / Math.max(w, h)
    };
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
