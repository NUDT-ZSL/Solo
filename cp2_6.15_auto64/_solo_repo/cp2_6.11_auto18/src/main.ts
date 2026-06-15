import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { transformText, TransformResult } from './transformer';
import { StarSystem } from './starsystem';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private starSystem: StarSystem;
  private clock: THREE.Clock;

  private textInput: HTMLTextAreaElement;
  private transformBtn: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  private charCount: HTMLSpanElement;
  private fpsValue: HTMLSpanElement;

  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();
  private isTransforming: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.textInput = document.getElementById('text-input') as HTMLTextAreaElement;
    this.transformBtn = document.getElementById('transform-btn') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.charCount = document.getElementById('char-count') as HTMLSpanElement;
    this.fpsValue = document.getElementById('fps-value') as HTMLSpanElement;

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0E2A);
    this.scene.fog = new THREE.FogExp2(0x0B0E2A, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 2, 18);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.info.autoReset = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 40;
    this.controls.enablePan = false;

    this.camera.updateProjectionMatrix();
    const startPos = this.calculateStartPosition();
    this.starSystem = new StarSystem(this.scene, startPos, this.camera);

    this.setupLights();
    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFD700, 1, 50);
    pointLight.position.set(5, 5, 10);
    this.scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x4A90D9, 0.5, 50);
    blueLight.position.set(-5, -3, 8);
    this.scene.add(blueLight);
  }

  private calculateStartPosition(): THREE.Vector3 {
    const inputPanel = document.querySelector('.input-panel') as HTMLElement;
    if (!inputPanel) {
      return new THREE.Vector3(-6, 3, 0);
    }

    const rect = inputPanel.getBoundingClientRect();
    const centerX = (rect.left + rect.width / 2) / window.innerWidth;
    const centerY = (rect.top + rect.height / 2) / window.innerHeight;

    const ndcX = (centerX * 2) - 1;
    const ndcY = -(centerY * 2) + 1;

    const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
    vector.unproject(this.camera);

    const dir = vector.sub(this.camera.position).normalize();
    const distance = 10;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    return pos;
  }

  private bindEvents(): void {
    this.textInput.addEventListener('input', () => this.handleTextInput());
    this.transformBtn.addEventListener('click', () => this.handleTransform());
    this.speedSlider.addEventListener('input', () => this.handleSpeedChange());
    this.resetBtn.addEventListener('click', () => this.handleReset());
    window.addEventListener('resize', () => this.handleResize());

    this.transformBtn.disabled = true;
  }

  private handleTextInput(): void {
    const text = this.textInput.value.trim();
    const length = text.length;

    this.charCount.textContent = `${length} / 50-200`;
    this.charCount.classList.remove('valid', 'invalid');

    if (length >= 50 && length <= 200) {
      this.charCount.classList.add('valid');
      this.transformBtn.disabled = false;
    } else if (length > 0) {
      this.charCount.classList.add('invalid');
      this.transformBtn.disabled = true;
    } else {
      this.transformBtn.disabled = true;
    }
  }

  private async handleTransform(): Promise<void> {
    if (this.isTransforming) return;

    const text = this.textInput.value.trim();
    if (text.length < 50 || text.length > 200) return;

    this.isTransforming = true;
    this.transformBtn.disabled = true;
    this.transformBtn.classList.add('loading');
    this.transformBtn.textContent = '✦ 星焰绽放中... ✦';

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const startPos = this.calculateStartPosition();
      this.starSystem.setStartPosition(startPos);

      const result: TransformResult = transformText(text, startPos);

      if (result.stars.length > 200) {
        result.stars = result.stars.slice(0, 200);
      }

      console.log(`生成了 ${result.stars.length} 个星点, ${result.connections.length} 条连线`);

      this.starSystem.createStars(result.stars, result.connections);

      await new Promise(resolve => setTimeout(resolve, 2500));
    } catch (error) {
      console.error('转化失败:', error);
    } finally {
      this.isTransforming = false;
      this.transformBtn.classList.remove('loading');
      this.transformBtn.textContent = '✦ 转化为星焰 ✦';
      this.handleTextInput();
    }
  }

  private handleSpeedChange(): void {
    const speed = parseFloat(this.speedSlider.value);
    this.speedValue.textContent = `${speed.toFixed(1)}°`;
    this.starSystem.setRotationSpeed(speed);
  }

  private handleReset(): void {
    this.controls.reset();
    this.starSystem.resetRotation();
    this.camera.position.set(0, 2, 18);
    this.controls.update();
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const startPos = this.calculateStartPosition();
    this.starSystem.setStartPosition(startPos);
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;

    if (currentTime - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
      this.fpsValue.textContent = fps.toString();

      if (fps >= 55) {
        this.fpsValue.style.color = '#FFD700';
      } else if (fps >= 45) {
        this.fpsValue.style.color = '#FFA500';
      } else {
        this.fpsValue.style.color = '#FF6B6B';
      }

      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.starSystem.update(currentTime, deltaTime);
    this.updateFPS(currentTime);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.starSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.handleResize());
  }
}

const DEMO_TEXT = `夜幕降临，星光璀璨，温柔的月光洒落大地。微风拂过湖面，泛起层层涟漪，倒映着满天星河。我闭上眼睛，感受这份宁静与美好，心中充满对未来的希望和憧憬。生命如诗，岁月如歌，每一个瞬间都值得被珍藏，被铭记，化作永恒的星座在宇宙中闪耀。`;

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();

  (window as unknown as { app?: App }).app = app;

  setTimeout(() => {
    const textArea = document.getElementById('text-input') as HTMLTextAreaElement;
    if (textArea && !textArea.value) {
      textArea.value = DEMO_TEXT;
      const event = new Event('input');
      textArea.dispatchEvent(event);
    }
  }, 500);
});
