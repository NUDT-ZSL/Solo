import * as THREE from 'three';
import { StarField } from './StarField';
import { Constellation } from './Constellation';
import { TimeControl, TimeState } from './TimeControl';
import { UI } from './ui';

class Planetarium {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private starField: StarField;
  private constellation: Constellation;
  private timeControl: TimeControl;
  private ui: UI;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotationY: number = 0;
  private targetRotationX: number = 0;
  private currentRotationY: number = 0;
  private currentRotationX: number = 0;
  private targetZoom: number = 1;
  private currentZoom: number = 1;

  private readonly MIN_ZOOM: number = 0.5;
  private readonly MAX_ZOOM: number = 5;
  private readonly MIN_PITCH: number = -30 * Math.PI / 180;
  private readonly MAX_PITCH: number = 90 * Math.PI / 180;
  private readonly SMOOTHING: number = 0.4;
  private readonly TARGET_FPS: number = 60;
  private readonly FRAME_TIME: number = 1000 / this.TARGET_FPS;
  private readonly AUTO_ROTATE_SPEED: number = 0.0003;

  private lastFrameTime: number = 0;
  private deltaTime: number = 0;
  private accumulator: number = 0;

  private autoRotate: boolean = false;
  private hoveredStarId: number | null = null;
  private hoveredConstellationId: string | null = null;

  private frustum: THREE.Frustum;
  private matrix: THREE.Matrix4;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.frustum = new THREE.Frustum();
    this.matrix = new THREE.Matrix4();

    this.starField = new StarField(this.camera);
    this.constellation = new Constellation(this.starField);
    this.timeControl = new TimeControl();

    this.scene.add(this.starField.getGroup());
    this.scene.add(this.constellation.getGroup());

    this.ui = new UI(this.constellation, this.timeControl, {
      onConstellationSelect: this.handleConstellationSelect.bind(this),
      onAutoRotateToggle: this.handleAutoRotateToggle.bind(this),
      onResetView: this.handleResetView.bind(this),
      onDateChange: this.handleDateChange.bind(this)
    });

    this.timeControl.setOnUpdateCallback(this.handleTimeUpdate.bind(this));

    this.setupEventListeners();
    this.animate(performance.now());
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;

      this.targetRotationX = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.targetRotationX));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    this.updateHover(e.clientX, e.clientY);
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'default';
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.targetZoom * zoomFactor));
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;

      this.targetRotationX = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.targetRotationX));

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (this.lastTouchDistance && this.lastTouchDistance > 0) {
        const scale = this.lastTouchDistance / distance;
        this.targetZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.targetZoom * scale));
      }
      this.lastTouchDistance = distance;
    }
  }

  private handleTouchEnd(): void {
    this.isDragging = false;
    this.lastTouchDistance = 0;
  }

  private lastTouchDistance: number = 0;

  private handleConstellationSelect(id: string): void {
    if (id === 'all') {
      this.constellation.showAll();
      this.constellation.highlightConstellation(null);
      this.hoveredConstellationId = null;
    } else if (id === 'none') {
      this.constellation.hideAll();
      this.constellation.highlightConstellation(null);
      this.hoveredConstellationId = null;
    } else {
      this.constellation.hideAll();
      this.constellation.showConstellation(id);
      this.constellation.highlightConstellation(id);
      this.hoveredConstellationId = id;
    }
  }

  private handleAutoRotateToggle(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  private handleResetView(): void {
    this.targetRotationY = 0;
    this.targetRotationX = 0;
    this.targetZoom = 1;
  }

  private handleDateChange(date: Date): void {
    this.timeControl.setDate(date);
    this.ui.updateDateTimeDisplay();
  }

  private handleTimeUpdate(state: TimeState): void {
    this.ui.updateDateTimeDisplay();
  }

  private updateHover(screenX: number, screenY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const starMeshes = this.starField.getStars().map(s => s.mesh);
    const intersects = this.raycaster.intersectObjects(starMeshes);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const starId = intersectedObject.userData.starId;
      
      if (starId !== undefined && starId !== this.hoveredStarId) {
        this.hoveredStarId = starId;
        this.starField.setHighlight(starId);
        
        const star = this.starField.getStarById(starId);
        if (star) {
          this.ui.showStarTooltip(star.data, screenX, screenY);
          
          const constellation = this.constellation.findConstellationByStar(starId);
          if (constellation && this.hoveredConstellationId !== constellation.id) {
            this.constellation.highlightConstellation(constellation.id);
          }
        }
      } else {
        this.ui.updateTooltipPosition(screenX, screenY);
      }
    } else {
      if (this.hoveredStarId !== null) {
        this.hoveredStarId = null;
        this.starField.setHighlight(null);
        this.ui.hideStarTooltip();
        
        if (this.hoveredConstellationId && !this.isConstellationSelected()) {
          this.constellation.highlightConstellation(null);
          this.hoveredConstellationId = null;
        }
      }
    }

    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : (this.isDragging ? 'grabbing' : 'default');
  }

  private isConstellationSelected(): boolean {
    const selectValue = this.constellationSelect?.value || 'all';
    return selectValue === 'all' || selectValue === 'none';
  }

  private get constellationSelect(): HTMLSelectElement {
    return document.getElementById('constellation-select') as HTMLSelectElement;
  }

  private updateFrustum(): void {
    this.matrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.matrix);
  }

  private animate(currentTime: number): void {
    requestAnimationFrame(this.animate.bind(this));

    const frameDelta = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.deltaTime = Math.min(frameDelta, this.FRAME_TIME * 3);
    this.accumulator += this.deltaTime;

    while (this.accumulator >= this.FRAME_TIME) {
      this.update(this.FRAME_TIME / 1000);
      this.accumulator -= this.FRAME_TIME;
    }

    this.render();
  }

  private update(deltaSeconds: number): void {
    if (this.autoRotate && !this.isDragging) {
      this.targetRotationY += this.AUTO_ROTATE_SPEED * deltaSeconds * 60;
    }

    const smoothingFactor = 1 - Math.pow(0.5, deltaSeconds / this.SMOOTHING);
    
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * smoothingFactor;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * smoothingFactor;
    this.currentZoom += (this.targetZoom - this.currentZoom) * smoothingFactor;

    this.currentZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.currentZoom));

    this.camera.position.set(0, 0, 5 / this.currentZoom);

    this.camera.rotation.x = this.currentRotationX;
    this.camera.rotation.y = this.currentRotationY;

    this.timeControl.tick(deltaSeconds / 10);

    const timeState = this.timeControl.getCurrentState();
    this.starField.updateRotation(timeState.skyRotation);
    this.constellation.updateRotation(timeState.skyRotation);

    this.updateFrustum();
    this.starField.updateVisibility(this.frustum);
    this.constellation.updateVisibility(this.frustum);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.starField.dispose();
    this.constellation.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Planetarium();
});
