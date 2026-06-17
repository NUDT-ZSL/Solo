import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { fetchTrafficData, TrafficDataPoint } from './modules/dataFetcher';
import { DataManager } from './modules/DataManager';
import { ControlHub } from './modules/ControlHub';
import { eventBus } from './modules/UIPanel';
import React from 'react';
import { createRoot } from 'react-dom/client';
import UIPanel from './modules/UIPanel';

class TrafficHeatmapApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private controlHub: ControlHub;
  private dataManager: DataManager;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0d47a1');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTexture;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 40, 40);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 50, 10);
    this.scene.add(directionalLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 0, 0);

    this.dataManager = DataManager.getInstance();
    this.controlHub = new ControlHub(this.scene, this.camera, this.dataManager);

    this.setupEventBus();
    this.setupResize();
    this.setupClick();
  }

  private setupEventBus(): void {
    eventBus.on('timeChange', (hour: number) => {
      this.controlHub.updateForTime(hour);
    });

    eventBus.on('congestionChange', (level: number) => {
      this.controlHub.updateCongestionFilter(level);
    });

    eventBus.on('regionChange', (region: string) => {
      this.controlHub.updateRegionFilter(region);
    });

    eventBus.on('viewModeChange', (mode: string) => {
      this.controlHub.setViewMode(mode as any, this.controls);
    });

    eventBus.on('resetView', () => {
      this.controlHub.resetView(this.controls);
      eventBus.emit('timeChange', 12);
      eventBus.emit('congestionChange', 0);
      eventBus.emit('regionChange', 'all');
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupClick(): void {
    this.renderer.domElement.addEventListener('click', (e) => {
      this.controlHub.handleClick(e, this.renderer, this.container);
    });
  }

  async loadData(): Promise<void> {
    try {
      const data = await fetchTrafficData();
      this.dataManager.setData(data);
      const initialData = this.dataManager.getFilteredData(12, 0, 'all');
      this.controlHub.updateScene(initialData);
    } catch (err) {
      console.error('Failed to load traffic data:', err);
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.controls.update();

    this.controlHub.animateColumns(delta);
    this.controlHub.animateParticles(delta);
    this.controlHub.updateCameraAnimation();
    this.controlHub.updateInfoPopup();

    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    this.animate();
    this.loadData();
  }
}

function initUI(): void {
  const uiRoot = document.getElementById('ui-root');
  if (uiRoot) {
    const root = createRoot(uiRoot);
    root.render(React.createElement(UIPanel));
  }
}

const app = new TrafficHeatmapApp();
initUI();
app.start();
