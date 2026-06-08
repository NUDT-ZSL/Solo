import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NeuralNetwork, Neuron } from './network';
import { SignalManager } from './signal';
import { UIManager } from './ui';

const BACKGROUND_COLOR = 0x0d0d1a;
const STAR_COUNT = 400;

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private network: NeuralNetwork;
  private signalManager: SignalManager;
  private ui: UIManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private currentTime = 0;
  private hoveredNeuron: Neuron | null = null;
  private frameCount = 0;
  private fpsTimeAccumulator = 0;
  private starField: THREE.Points;
  private starTwinklePhases: Float32Array;
  private container: HTMLElement;

  constructor() {
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('scene-container')!;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(BACKGROUND_COLOR);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 28);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 60;

    this.setupLighting();
    this.starField = this.createStarField();
    this.starTwinklePhases = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      this.starTwinklePhases[i] = Math.random() * Math.PI * 2;
    }
    this.scene.add(this.starField);

    this.network = new NeuralNetwork(this.scene);
    this.signalManager = new SignalManager(this.network, this.scene);
    this.ui = new UIManager();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.network.generate(25, 0.4);
    this.signalManager.setStimulationFrequency(2);

    this.ui.bindControls(
      (density) => this.network.setConnectionDensity(density),
      (freq) => this.signalManager.setStimulationFrequency(freq),
      () => this.resetNetwork()
    );

    this.setupEventListeners();
    this.resetNetwork();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(0xffffff, 0.8, 80);
    point1.position.set(15, 15, 15);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0x4da6ff, 0.5, 80);
    point2.position.set(-15, -10, 10);
    this.scene.add(point2);

    const point3 = new THREE.PointLight(0xff6b35, 0.3, 60);
    point3.position.set(0, -15, -10);
    this.scene.add(point3);
  }

  private createStarField(): THREE.Points {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 20;
      sizes[i] = 0.08 + Math.random() * 0.15;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      size: 0.15,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  private resetNetwork(): void {
    this.signalManager.clearAll();
    this.network.generate(
      20 + Math.floor(Math.random() * 11),
      parseFloat((document.getElementById('density-slider') as HTMLInputElement).value)
    );
    this.ui.selectNeuron(null);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    const dom = this.renderer.domElement;

    dom.addEventListener('mousemove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleHover(e.clientX, e.clientY);
    });

    dom.addEventListener('click', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleClick();
    });

    dom.addEventListener('mouseleave', () => {
      if (this.hoveredNeuron) {
        this.hoveredNeuron.baseScale = 1;
        this.hoveredNeuron = null;
      }
      this.ui.hideTooltip();
    });
  }

  private handleHover(clientX: number, clientY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.network.neurons.map(n => n.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const neuron = this.network.getNeuronByMesh(intersects[0].object);
      if (neuron) {
        if (this.hoveredNeuron && this.hoveredNeuron !== neuron) {
          this.hoveredNeuron.baseScale = 1;
        }
        neuron.baseScale = 1.3;
        this.hoveredNeuron = neuron;

        const containerRect = this.container.getBoundingClientRect();
        this.ui.showTooltip(
          neuron,
          clientX - containerRect.left,
          clientY - containerRect.top
        );
        return;
      }
    }

    if (this.hoveredNeuron) {
      this.hoveredNeuron.baseScale = 1;
      this.hoveredNeuron = null;
    }
    this.ui.hideTooltip();
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.network.neurons.map(n => n.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const neuron = this.network.getNeuronByMesh(intersects[0].object);
      if (neuron) {
        this.ui.selectNeuron(neuron);
        this.signalManager.triggerActionPotential(neuron);
      }
    }
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private updateStars(deltaTime: number): void {
    const material = this.starField.material as THREE.PointsMaterial;
    let avg = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      this.starTwinklePhases[i] += deltaTime * (0.8 + Math.sin(i) * 0.3);
      avg += 0.35 + 0.25 * Math.sin(this.starTwinklePhases[i]);
    }
    material.opacity = avg / STAR_COUNT;
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    this.currentTime += deltaTime;

    this.frameCount++;
    this.fpsTimeAccumulator += deltaTime;
    if (this.fpsTimeAccumulator >= 0.5) {
      const fps = this.frameCount / this.fpsTimeAccumulator;
      this.ui.updateFPS(fps);
      this.frameCount = 0;
      this.fpsTimeAccumulator = 0;
    }

    this.controls.update();
    this.network.updateNeuronPulse(deltaTime, this.currentTime);
    this.network.updateConnectionHighlights(this.currentTime);
    this.signalManager.update(deltaTime, this.currentTime);
    this.ui.updateChart(this.currentTime);
    this.updateStars(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.network.dispose();
    this.signalManager.dispose();
    this.renderer.dispose();
    (this.starField.material as THREE.Material).dispose();
    this.starField.geometry.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
