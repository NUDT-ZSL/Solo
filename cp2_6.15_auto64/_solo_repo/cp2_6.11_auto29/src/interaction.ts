import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OceanScene } from './oceanScene';
import { Creatures, ObservationLog } from './creatures';

export class InteractionManager {
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public oceanScene: OceanScene;
  public creatures: Creatures;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private initialCameraPosition: THREE.Vector3;
  private initialTarget: THREE.Vector3;
  
  private cardActive: boolean = false;
  private currentPoint: { x: number; z: number; y: number } | null = null;
  private currentTemp: number = 0;
  private currentSalinity: number = 0;

  private onLogUpdateCallback: (() => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    oceanScene: OceanScene,
    creatures: Creatures
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.oceanScene = oceanScene;
    this.creatures = creatures;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();
    
    this.initialCameraPosition = new THREE.Vector3(60, 40, 60);
    this.initialTarget = new THREE.Vector3(0, 10, 0);
    
    this.resetView();
    this.setupEventListeners();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;
    
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI * 2 / 3;
    
    this.controls.enablePan = false;
    
    this.controls.autoRotate = false;
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('dblclick', (event) => {
      this.handleDoubleClick(event);
    });
    
    canvas.addEventListener('mousemove', () => {
      this.hideHint();
    });
    
    document.getElementById('resetViewBtn')?.addEventListener('click', () => {
      this.resetView();
    });
    
    document.getElementById('recordBtn')?.addEventListener('click', () => {
      this.handleRecord();
    });
    
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleDoubleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    
    if (intersectPoint) {
      const terrainHeight = this.oceanScene.getTerrainHeight(intersectPoint.x, intersectPoint.z);
      const pointY = Math.max(terrainHeight + 0.5, 0.5);
      
      this.creatures.createRipple(intersectPoint.x, pointY, intersectPoint.z);
      
      this.currentPoint = {
        x: intersectPoint.x,
        y: pointY,
        z: intersectPoint.z
      };
      
      this.currentTemp = 20 + Math.random() * 8;
      this.currentSalinity = 32 + Math.random() * 3;
      
      this.showObservationCard();
    }
  }

  private showObservationCard(): void {
    const card = document.getElementById('observationCard');
    if (!card || !this.currentPoint) return;
    
    document.getElementById('coordX')!.textContent = this.currentPoint.x.toFixed(2);
    document.getElementById('coordZ')!.textContent = this.currentPoint.z.toFixed(2);
    document.getElementById('waterTemp')!.textContent = this.currentTemp.toFixed(1) + '°C';
    document.getElementById('salinity')!.textContent = this.currentSalinity.toFixed(2) + '‰';
    
    card.classList.add('active');
    this.cardActive = true;
  }

  public hideObservationCard(): void {
    const card = document.getElementById('observationCard');
    if (card) {
      card.classList.remove('active');
    }
    this.cardActive = false;
  }

  private handleRecord(): void {
    if (!this.currentPoint) return;
    
    const log = this.creatures.addObservationLog(
      this.currentPoint.x,
      this.currentPoint.z,
      this.currentTemp,
      this.currentSalinity
    );
    
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
      recordBtn.classList.add('flash');
      setTimeout(() => {
        recordBtn.classList.remove('flash');
      }, 200);
    }
    
    this.updateLogList();
    
    if (this.onLogUpdateCallback) {
      this.onLogUpdateCallback();
    }
  }

  public updateLogList(): void {
    const logList = document.getElementById('logList');
    if (!logList) return;
    
    const logs = this.creatures.observationLogs.slice(0, 5);
    
    if (logs.length === 0) {
      logList.innerHTML = '<li class="empty-log">暂无观测记录</li>';
      return;
    }
    
    logList.innerHTML = '';
    
    logs.forEach((log) => {
      const li = document.createElement('li');
      li.className = 'log-item';
      li.dataset.id = log.id.toString();
      
      const timeStr = this.formatTime(log.timestamp);
      
      li.innerHTML = `
        <div class="log-time">${timeStr}</div>
        <div class="log-coord">X: ${log.x.toFixed(2)}  Z: ${log.z.toFixed(2)}</div>
        <span class="log-delete">✕</span>
      `;
      
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteLog(log.id);
      });
      
      logList.appendChild(li);
    });
  }

  private deleteLog(id: number): void {
    this.creatures.deleteObservationLog(id);
    this.updateLogList();
    
    if (this.onLogUpdateCallback) {
      this.onLogUpdateCallback();
    }
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  public resetView(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialTarget);
    this.controls.update();
  }

  private hideHint(): void {
    const hint = document.getElementById('fullscreenHint');
    if (hint && !hint.classList.contains('hidden')) {
      hint.classList.add('hidden');
    }
  }

  private handleResize(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  public setOnLogUpdateCallback(callback: () => void): void {
    this.onLogUpdateCallback = callback;
  }

  public update(delta: number): void {
    this.controls.update();
  }
}
