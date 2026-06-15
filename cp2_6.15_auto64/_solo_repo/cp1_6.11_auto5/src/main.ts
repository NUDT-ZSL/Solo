import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { Kaleidoscope, PrismParams } from './kaleidoscope';
import { InteractionController } from './interaction';

class VortexPrismApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private outlinePass: OutlinePass;

  private kaleidoscope: Kaleidoscope;
  private interaction: InteractionController;

  private clock: THREE.Clock;
  private container: HTMLElement;
  private loadingScreen: HTMLElement;

  private ambientLight!: THREE.AmbientLight;
  private pointLight1!: THREE.PointLight;
  private pointLight2!: THREE.PointLight;
  private directionalLight!: THREE.DirectionalLight;

  private fps: number = 60;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.loadingScreen = document.getElementById('loading-screen')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.composer = this.createComposer();
    this.outlinePass = this.createOutlinePass();

    this.createLights();

    this.kaleidoscope = new Kaleidoscope();
    this.scene.add(this.kaleidoscope.getGroup());

    this.interaction = new InteractionController(
      this.camera,
      this.kaleidoscope,
      this.renderer,
      this.onParamsChange.bind(this),
      this.onReset.bind(this)
    );

    this.setupEventListeners();
    this.hideLoading();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0A0A1A, 0.08);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    return composer;
  }

  private createOutlinePass(): OutlinePass {
    const outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    );
    outlinePass.edgeStrength = 5.0;
    outlinePass.edgeGlow = 1.0;
    outlinePass.edgeThickness = 2.0;
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set(0xFFFFFF);
    outlinePass.hiddenEdgeColor.set(0xFFFFFF);
    outlinePass.enabled = true;
    this.composer.addPass(outlinePass);
    return outlinePass;
  }

  private createLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this.ambientLight);

    this.pointLight1 = new THREE.PointLight(0x4D96FF, 1, 20);
    this.pointLight1.position.set(5, 5, 5);
    this.pointLight1.castShadow = true;
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0xFF6B6B, 0.8, 20);
    this.pointLight2.position.set(-5, -3, -5);
    this.scene.add(this.pointLight2);

    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
    this.directionalLight.position.set(0, 10, 5);
    this.scene.add(this.directionalLight);
  }

  private onParamsChange(params: Partial<PrismParams>): void {
    this.kaleidoscope.setParams(params);
  }

  private onReset(): void {
    this.kaleidoscope.reset();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.outlinePass.setSize(width, height);

    this.interaction.resize(width, height);
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.loadingScreen.classList.add('hidden');
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 800);
    }, 500);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    this.kaleidoscope.update(deltaTime);
    this.interaction.update(deltaTime);
    this.updateOutline();
    this.updateLights();

    this.composer.render();

    this.updateFPS();
  }

  private updateOutline(): void {
    const hoveredMesh = this.interaction.getHoveredMesh();
    if (hoveredMesh) {
      this.outlinePass.selectedObjects = [hoveredMesh];
    } else {
      this.outlinePass.selectedObjects = [];
    }
  }

  private updateLights(): void {
    const time = this.clock.getElapsedTime();
    
    this.pointLight1.position.x = Math.sin(time * 0.5) * 6;
    this.pointLight1.position.z = Math.cos(time * 0.5) * 6;
    this.pointLight1.position.y = Math.sin(time * 0.3) * 3 + 2;

    this.pointLight2.position.x = Math.sin(time * 0.3 + Math.PI) * 5;
    this.pointLight2.position.z = Math.cos(time * 0.3 + Math.PI) * 5;
    this.pointLight2.position.y = Math.cos(time * 0.4) * 3 - 2;
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public getFPS(): number {
    return this.fps;
  }

  public dispose(): void {
    this.kaleidoscope.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VortexPrismApp();
});
