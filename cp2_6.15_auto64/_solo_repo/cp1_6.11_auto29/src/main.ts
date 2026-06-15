import * as THREE from 'three';
import { OceanScene } from './oceanScene';
import { Creatures } from './creatures';
import { InteractionManager, ObservationLog } from './interaction';

class BluefinHorizonApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;

  private oceanScene!: OceanScene;
  private creatures!: Creatures;
  private interaction!: InteractionManager;

  private clock: THREE.Clock;
  private elapsedTime = 0;

  private animationFrameId: number | null = null;

  constructor() {
    this.clock = new THREE.Clock();
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container')!;

    this.initThree();
    this.initModules();
    this.bindUI();
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());

    this.start();
  }

  private initThree(): void {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x051D2D, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  private initModules(): void {
    this.oceanScene = new OceanScene(this.scene);
    this.creatures = new Creatures(this.scene, this.oceanScene);
    this.interaction = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.oceanScene,
      this.creatures
    );

    this.interaction.setObservationShowCallback((data) => {
      this.updateObservationCard(data);
    });

    this.interaction.setLogUpdateCallback((logs) => {
      this.renderLogList(logs);
    });
  }

  private bindUI(): void {
    const resetBtn = document.getElementById('resetBtn');
    resetBtn?.addEventListener('click', () => {
      this.interaction.resetCamera();
    });

    const recordBtn = document.getElementById('recordBtn');
    recordBtn?.addEventListener('click', () => {
      const success = this.interaction.recordObservation();
      if (success) {
        this.flashObservationCard();
      }
    });

    const startBtn = document.getElementById('startBtn');
    startBtn?.addEventListener('click', () => {
      this.hideIntroTip();
    });
  }

  private updateObservationCard(data: {
    x: number;
    z: number;
    temperature: number;
    salinity: number;
  }): void {
    const card = document.getElementById('observationCard');
    if (!card) return;

    const coordX = document.getElementById('coordX');
    const coordZ = document.getElementById('coordZ');
    const waterTemp = document.getElementById('waterTemp');
    const salinity = document.getElementById('salinity');

    if (coordX) coordX.textContent = data.x.toFixed(2);
    if (coordZ) coordZ.textContent = data.z.toFixed(2);
    if (waterTemp) waterTemp.textContent = `${data.temperature.toFixed(2)} °C`;
    if (salinity) salinity.textContent = `${data.salinity.toFixed(2)} ‰`;

    card.classList.remove('active');
    void card.offsetWidth;
    card.classList.add('active');
  }

  private flashObservationCard(): void {
    const card = document.getElementById('observationCard');
    if (!card) return;

    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');

    setTimeout(() => {
      card.classList.remove('flash');
    }, 300);
  }

  private renderLogList(logs: ObservationLog[]): void {
    const listEl = document.getElementById('logList');
    const countEl = document.getElementById('logCount');
    if (!listEl || !countEl) return;

    countEl.textContent = `${logs.length}/50`;

    if (logs.length === 0) {
      listEl.innerHTML = '<div class="empty-log">暂无观测记录<br/>双击场景开始探索</div>';
      return;
    }

    const displayLogs = logs.slice(0, 50);

    listEl.innerHTML = displayLogs
      .map((log) => {
        const timeStr = this.formatTime(log.timestamp);
        return `
          <div class="log-item" data-id="${log.id}">
            <div class="log-delete" data-delete-id="${log.id}">×</div>
            <div class="log-time">${timeStr}</div>
            <div class="log-coord">
              X: ${log.x.toFixed(2)} &nbsp; Z: ${log.z.toFixed(2)}<br/>
              <span style="color:#6B9EC2;font-size:11px;">
                ${log.temperature.toFixed(1)}°C · ${log.salinity.toFixed(1)}‰
              </span>
            </div>
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt((btn as HTMLElement).dataset.deleteId!, 10);
        this.interaction.deleteLog(id);
      });
    });
  }

  private formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private hideIntroTip(): void {
    const tip = document.getElementById('introTip');
    if (tip) {
      tip.classList.add('hidden');
    }
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsedTime += delta;

    this.oceanScene.update(delta, this.elapsedTime);
    this.creatures.update(delta, this.elapsedTime, this.camera.position);
    this.interaction.update(delta, this.elapsedTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.oceanScene.dispose();
    this.creatures.dispose();
    this.interaction.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    window.removeEventListener('resize', () => this.handleResize());
  }
}

let app: BluefinHorizonApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new BluefinHorizonApp();

  (window as unknown as Record<string, unknown>).__bluefinApp = app;
});
