import React from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { StarField } from './scene/StarField';
import { NetworkGenerator } from './scene/NetworkGenerator';
import { InteractionController } from './controls/InteractionController';
import { ExportController } from './controls/ExportController';
import { UIPanel } from './ui/UIPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starField: StarField;
  private networkGenerator: NetworkGenerator;
  private interactionController: InteractionController;
  private exportController: ExportController;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private container: HTMLElement;
  private uiRoot: ReactDOM.Root | null = null;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.starField = new StarField(this.scene);
    this.starField.initScene();

    this.networkGenerator = new NetworkGenerator(this.scene, this.starField);

    this.interactionController = new InteractionController(
      this.scene,
      this.camera,
      this.renderer,
      this.starField,
      this.networkGenerator,
      this.container
    );

    this.exportController = new ExportController(
      this.scene,
      this.camera,
      this.renderer,
      this.starField
    );

    this.setupLights();
    this.bindEvents();
    this.mountUI();
    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(ambientLight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private mountUI(): void {
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'fixed';
    uiContainer.style.inset = '0';
    uiContainer.style.pointerEvents = 'none';
    uiContainer.style.zIndex = '9999';
    this.container.appendChild(uiContainer);

    const handleDensityChange = (value: number) => {
      this.starField.updateParams({ count: Math.round(value) });
      if (this.networkGenerator.isNetworkActive()) {
        this.networkGenerator.generateNetwork();
      }
    };

    const handleParticleSizeChange = (value: number) => {
      this.starField.updateParams({ particleSize: value });
    };

    const handleRotationSpeedChange = (value: number) => {
      this.starField.updateParams({ rotationSpeed: value });
    };

    const handleColorOffsetChange = (value: number) => {
      this.starField.updateParams({ colorOffset: value });
    };

    const handleToggleNetwork = (): boolean => {
      return this.networkGenerator.toggleNetwork();
    };

    const handleExportScreenshot = () => {
      this.exportController.exportScreenshot();
    };

    const handleParticleSelect = (cb: any) => {
      return this.interactionController.onMouseClick(cb);
    };

    const handleExportStatusChange = (cb: any) => {
      return this.exportController.onStatusChange(cb);
    };

    const params = this.starField.getParams();

    this.uiRoot = ReactDOM.createRoot(uiContainer);
    this.uiRoot.render(
      React.createElement(UIPanel, {
        onDensityChange: handleDensityChange,
        onParticleSizeChange: handleParticleSizeChange,
        onRotationSpeedChange: handleRotationSpeedChange,
        onColorOffsetChange: handleColorOffsetChange,
        onToggleNetwork: handleToggleNetwork,
        onExportScreenshot: handleExportScreenshot,
        onParticleSelect: handleParticleSelect,
        onExportStatusChange: handleExportStatusChange,
        initialParams: {
          density: params.count,
          particleSize: params.particleSize,
          rotationSpeed: params.rotationSpeed,
          colorOffset: params.colorOffset
        }
      })
    );
  }

  private startAnimationLoop(): void {
    this.fpsLastTime = performance.now();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      this.starField.updateParticles(delta);
      this.interactionController.update();
      this.networkGenerator.update();

      this.renderer.render(this.scene, this.camera);

      this.fpsFrames++;
      const now = performance.now();
      if (now - this.fpsLastTime >= 3000) {
        const fps = (this.fpsFrames * 1000) / (now - this.fpsLastTime);
        console.log(`[FPS] ${fps.toFixed(1)} (${this.starField.getParticleCount()} particles)`);
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }
    };

    animate();
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.uiRoot?.unmount();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

new App(rootElement);
