import * as THREE from 'three';
import { FaceGenerator, type FaceData } from './faceGenerator';
import { OrigamiModel } from './origamiModel';
import { UIController } from './uiController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private faceGenerator: FaceGenerator;
  private origamiModel: OrigamiModel;
  private uiController: UIController;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 5000);
    this.camera.position.set(0, 0, 300);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.faceGenerator = new FaceGenerator();

    this.origamiModel = new OrigamiModel(this.scene, this.camera, this.renderer, {
      onFaceClick: (faceIndex, screenPos) => this.handleFaceClick(faceIndex, screenPos)
    });

    this.uiController = new UIController({
      onFileUpload: (file) => this.handleFileUpload(file),
      onAutoRotateToggle: (enabled) => this.origamiModel.setAutoRotate(enabled),
      onReset: () => this.handleReset(),
      onPopupClose: () => this.origamiModel.clearHighlight()
    });

    window.addEventListener('resize', () => this.handleResize());

    this.uiController.showLoading();
    this.generateDemoModel();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 200);
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x00B4FF, 0.3);
    backLight.position.set(-100, -100, -100);
    this.scene.add(backLight);

    const fillLight = new THREE.DirectionalLight(0xFF6B6B, 0.2);
    fillLight.position.set(0, 100, -100);
    this.scene.add(fillLight);
  }

  private async generateDemoModel(): Promise<void> {
    try {
      const demoData = this.generateDemoFaceData();
      this.origamiModel.buildModel(demoData);
      this.uiController.setFaceCount(this.origamiModel.getFaceCount());
    } catch (error) {
      console.error('Failed to generate demo model:', error);
    } finally {
      setTimeout(() => {
        this.uiController.hideLoading();
      }, 500);
    }
  }

  private generateDemoFaceData(): FaceData {
    const width = 200;
    const height = 150;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(0.33, '#4ECDC4');
    gradient.addColorStop(0.66, '#45B7D1');
    gradient.addColorStop(1, '#96CEB4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#FFEAA7';
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.4, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#DDA0DD';
    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.6, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#98D8C8';
    ctx.fillRect(width * 0.45, height * 0.25, 40, 40);

    const imageData = ctx.getImageData(0, 0, width, height);
    const triangles = this.faceGenerator['delaunayTriangulation'](
      this.generateDemoPoints(width, height),
      width,
      height
    );
    const coloredTriangles = this.faceGenerator['assignColors'](triangles, imageData, width, height);
    const finalTriangles = this.faceGenerator['simplifyTriangles'](coloredTriangles);

    return {
      triangles: finalTriangles,
      imageWidth: width,
      imageHeight: height,
      imageData
    };
  }

  private generateDemoPoints(width: number, height: number) {
    const points: { x: number; y: number }[] = [];
    const gridSize = 25;

    points.push({ x: 2, y: 2 });
    points.push({ x: width - 3, y: 2 });
    points.push({ x: 2, y: height - 3 });
    points.push({ x: width - 3, y: height - 3 });

    for (let y = gridSize; y < height - gridSize; y += gridSize) {
      for (let x = gridSize; x < width - gridSize; x += gridSize) {
        points.push({
          x: x + (Math.random() - 0.5) * gridSize * 0.4,
          y: y + (Math.random() - 0.5) * gridSize * 0.4
        });
      }
    }

    return points;
  }

  private async handleFileUpload(file: File): Promise<void> {
    this.uiController.showLoading();
    
    try {
      const faceData = await this.faceGenerator.processImage(file);
      this.origamiModel.buildModel(faceData);
      this.uiController.setFaceCount(this.origamiModel.getFaceCount());
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('图片处理失败，请重试');
    } finally {
      setTimeout(() => {
        this.uiController.hideLoading();
      }, 500);
    }
  }

  private handleReset(): void {
    this.origamiModel.startResetAnimation();
    if (this.uiController.isAutoRotateEnabled()) {
      this.uiController['rotateBtn'].click();
    }
  }

  private handleFaceClick(faceIndex: number, screenPos: { x: number; y: number }): void {
    const faceData = this.origamiModel.getFaceData(faceIndex);
    if (!faceData) return;

    const snippetUrl = this.faceGenerator.getFaceSnippet(
      faceData.faceData.imageData,
      faceData.triangle,
      faceData.faceData.imageWidth,
      faceData.faceData.imageHeight
    );

    this.uiController.showPopup(snippetUrl, faceData.triangle.color, screenPos);
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.origamiModel.update();
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
