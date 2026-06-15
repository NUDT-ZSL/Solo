import * as THREE from 'three';
import { WaveSource } from './WaveSource';
import { WaveRenderer, WaveSettings } from './WaveRenderer';
import { InteractionHandler } from './InteractionHandler';
import { ControlPanel, COLOR_THEMES } from './ControlPanel';

const MAX_ACTIVE_SOURCES = 20;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private waveRenderer: WaveRenderer;
  private interactionHandler: InteractionHandler;
  private controlPanel: ControlPanel;
  private sources: WaveSource[] = [];
  private clock: THREE.Clock;
  private settings: WaveSettings;

  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 22, 22);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    document.body.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.settings = {
      waveSpeed: 1.0,
      colorCenter: new THREE.Color(COLOR_THEMES[0].center),
      colorEdge: new THREE.Color(COLOR_THEMES[0].edge),
    };

    this.waveRenderer = new WaveRenderer(this.scene, this.settings);

    this.interactionHandler = new InteractionHandler(
      this.camera,
      this.renderer.domElement,
      this.waveRenderer.getGroundPlane(),
      this.scene,
      (position) => this.addSource(position)
    );

    this.controlPanel = new ControlPanel({
      onSpeedChange: (speed) => {
        this.settings.waveSpeed = speed;
        this.waveRenderer.updateSpeed(speed);
      },
      onColorChange: (center, edge) => {
        this.settings.colorCenter = center;
        this.settings.colorEdge = edge;
        this.waveRenderer.updateColors(center, edge);
      },
      onReset: () => this.reset(),
    });

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private addSource(position: THREE.Vector3): void {
    if (this.sources.length >= MAX_ACTIVE_SOURCES) {
      this.sources.shift();
    }
    const source = new WaveSource(position, this.clock.getElapsedTime());
    this.sources.push(source);
    this.controlPanel.updateSourceCount(this.sources.length);
  }

  private reset(): void {
    this.sources = [];
    WaveSource.resetIdCounter();
    this.controlPanel.updateSourceCount(0);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.waveRenderer.onResize();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const time = this.clock.getElapsedTime();
    this.waveRenderer.update(this.sources, time);
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
