import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EcoBottleManager } from './EcoBottleManager';
import { DragDropPanel } from './DragDropPanel';
import { EcoIndicatorChart } from './EcoIndicatorChart';
import { EcoElementType } from './EcoElementFactory';

class EcoBottleApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private bottleManager: EcoBottleManager;
  private dragPanel: DragDropPanel;
  private chart: EcoIndicatorChart;
  private clock: THREE.Clock;
  private lastChartUpdate = 0;
  private chartUpdateInterval = 0.5;

  constructor() {
    const canvas = document.getElementById('scene') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas #scene not found');

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 2.5, 7);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, -0.5, 0);

    this.bottleManager = new EcoBottleManager(this.scene);

    this.dragPanel = new DragDropPanel(
      'panel',
      'panelItems',
      'dragGhost',
      'tooltip',
      this.bottleManager,
      this.camera,
      this.renderer
    );

    this.dragPanel.onPlace((type: EcoElementType, pos: THREE.Vector3) => {
      this.bottleManager.addElement(type, pos);
    });

    this.chart = new EcoIndicatorChart('chartCanvas');
    this.chart.startAnimation();

    this.clock = new THREE.Clock();

    this.bindEvents();
    this.setupChartPanel();
    this.animate();

    setTimeout(() => {
      const bottlePos = this.bottleManager.getBottleWorldPosition();
      this.dragPanel.updateGroundPlane();
    }, 100);

    this.handleResize();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      this.bottleManager.updateMouseLight(x, y);
    });

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMQ = (e: MediaQueryListEvent) => {
      const panel = document.getElementById('panel');
      if (panel) {
        if (e.matches) {
          panel.classList.add('collapsed');
        } else {
          panel.classList.remove('collapsed');
        }
      }
    };
    mediaQuery.addEventListener('change', handleMQ);
    if (mediaQuery.matches) {
      const panel = document.getElementById('panel');
      panel?.classList.add('collapsed');
    }
  }

  private setupChartPanel(): void {
    const chartBtn = document.getElementById('chartBtn');
    const chartPanel = document.getElementById('chartPanel');
    const chartClose = document.getElementById('chartClose');

    if (chartBtn && chartPanel && chartClose) {
      chartBtn.addEventListener('click', () => {
        const isVisible = chartPanel.style.display !== 'none';
        if (isVisible) {
          chartPanel.style.display = 'none';
          this.chart.stopAnimation();
        } else {
          chartPanel.style.display = 'block';
          this.chart.resize();
          this.chart.startAnimation();
        }
      });

      chartClose.addEventListener('click', () => {
        chartPanel.style.display = 'none';
        this.chart.stopAnimation();
      });
    }
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    if (this.chart) {
      requestAnimationFrame(() => {
        this.chart.resize();
      });
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.controls.update();
    this.bottleManager.update(delta, time);

    this.lastChartUpdate += delta;
    if (this.lastChartUpdate >= this.chartUpdateInterval) {
      this.lastChartUpdate = 0;
      const indicators = this.bottleManager.getIndicators();
      this.chart.update(indicators.humidity, indicators.temperature, indicators.biodiversity);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.bottleManager.dispose();
    this.chart.destroy();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new EcoBottleApp();
});
