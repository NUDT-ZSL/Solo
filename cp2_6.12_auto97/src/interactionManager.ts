import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneManager, AtomObject } from './sceneManager';
import { ELEMENT_ATOMIC_NUMBERS } from './moleculeData';

export class InteractionManager {
  private sceneManager: SceneManager;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredAtom: AtomObject | null = null;
  private isRotationMode: boolean = false;
  private isVibrationMode: boolean = false;
  private initialCameraPosition: THREE.Vector3;
  private initialCameraTarget: THREE.Vector3;
  private isResettingCamera: boolean = false;
  private resetAnimationProgress: number = 0;
  private resetAnimationDuration: number = 1;
  private resetStartPosition: THREE.Vector3 = new THREE.Vector3();
  private resetStartTarget: THREE.Vector3 = new THREE.Vector3();
  private container: HTMLElement;
  private infoTooltip: HTMLElement;
  private rotateBtn: HTMLElement;
  private vibrateBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private fullscreenBtn: HTMLElement;
  private colorTempSlider: HTMLElement;
  private colorTempThumb: HTMLElement;
  private isDraggingSlider: boolean = false;
  private isFullscreen: boolean = false;

  constructor(
    sceneManager: SceneManager,
    container: HTMLElement,
    canvas: HTMLCanvasElement
  ) {
    this.sceneManager = sceneManager;
    this.container = container;

    this.controls = new OrbitControls(sceneManager.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initialCameraPosition = sceneManager.initialCameraPosition.clone();
    this.initialCameraTarget = sceneManager.initialCameraTarget.clone();

    this.infoTooltip = document.querySelector('.info-tooltip')!;
    this.rotateBtn = document.getElementById('btn-rotate')!;
    this.vibrateBtn = document.getElementById('btn-vibrate')!;
    this.resetBtn = document.getElementById('btn-reset')!;
    this.fullscreenBtn = document.getElementById('btn-fullscreen')!;
    this.colorTempSlider = document.querySelector('.color-temp-slider')!;
    this.colorTempThumb = document.querySelector('.slider-thumb')!;

    this.setupEventListeners(canvas);
  }

  private setupEventListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseleave', () => this.onMouseLeave());

    this.rotateBtn.addEventListener('click', () => this.toggleRotation());
    this.vibrateBtn.addEventListener('click', () => this.toggleVibration());
    this.resetBtn.addEventListener('click', () => this.resetCamera());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    this.colorTempSlider.addEventListener('mousedown', (e) => this.onSliderMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onSliderMouseMove(e));
    document.addEventListener('mouseup', () => this.onSliderMouseUp());

    this.colorTempSlider.addEventListener('touchstart', (e) => this.onSliderTouchStart(e));
    document.addEventListener('touchmove', (e) => this.onSliderTouchMove(e));
    document.addEventListener('touchend', () => this.onSliderTouchEnd());

    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();
  }

  private onMouseLeave(): void {
    this.clearHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const atomMeshes = this.sceneManager.atoms.map((a) => a.mesh);
    const intersects = this.raycaster.intersectObjects(atomMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const atom = this.sceneManager.getAtomByMesh(mesh);
      if (atom && atom !== this.hoveredAtom) {
        this.setHoveredAtom(atom);
      }
    } else if (this.hoveredAtom) {
      this.clearHover();
    }
  }

  private setHoveredAtom(atom: AtomObject): void {
    this.hoveredAtom = atom;
    this.sceneManager.highlightAtom(atom.data.id);
    this.showTooltip(atom);
  }

  private clearHover(): void {
    this.hoveredAtom = null;
    this.sceneManager.highlightAtom(null);
    this.hideTooltip();
  }

  private showTooltip(atom: AtomObject): void {
    const symbol = atom.data.element;
    const atomicNum = ELEMENT_ATOMIC_NUMBERS[symbol] || 0;
    const pos = atom.mesh.position;

    const symbolEl = this.infoTooltip.querySelector('.element-symbol') as HTMLElement;
    const nameEl = this.infoTooltip.querySelector('.atom-name') as HTMLElement;
    const numEl = this.infoTooltip.querySelector('.atomic-number') as HTMLElement;
    const coordEl = this.infoTooltip.querySelector('.coordinates') as HTMLElement;

    if (symbolEl) symbolEl.textContent = symbol;
    if (nameEl) nameEl.textContent = `${atom.data.id}`;
    if (numEl) numEl.textContent = atomicNum.toString();
    if (coordEl) {
      coordEl.textContent = `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
    }

    this.infoTooltip.classList.add('visible');
  }

  private hideTooltip(): void {
    this.infoTooltip.classList.remove('visible');
  }

  private toggleRotation(): void {
    this.isRotationMode = !this.isRotationMode;
    this.sceneManager.setRotation(this.isRotationMode);
    this.rotateBtn.classList.toggle('active', this.isRotationMode);
    this.controls.enabled = !this.isRotationMode;
  }

  private toggleVibration(): void {
    this.isVibrationMode = !this.isVibrationMode;
    this.sceneManager.setVibration(this.isVibrationMode);
    this.vibrateBtn.classList.toggle('active', this.isVibrationMode);
  }

  private resetCamera(): void {
    if (this.isResettingCamera) return;

    this.isResettingCamera = true;
    this.resetAnimationProgress = 0;
    this.resetStartPosition.copy(this.sceneManager.camera.position);
    this.resetStartTarget.copy(this.controls.target);

    if (this.isRotationMode) {
      this.toggleRotation();
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  private onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    this.fullscreenBtn.classList.toggle('active', this.isFullscreen);
  }

  private onSliderMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isDraggingSlider = true;
    this.updateSliderFromMouse(e.clientY);
  }

  private onSliderMouseMove(e: MouseEvent): void {
    if (!this.isDraggingSlider) return;
    this.updateSliderFromMouse(e.clientY);
  }

  private onSliderMouseUp(): void {
    this.isDraggingSlider = false;
  }

  private onSliderTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isDraggingSlider = true;
    if (e.touches.length > 0) {
      this.updateSliderFromMouse(e.touches[0].clientY);
    }
  }

  private onSliderTouchMove(e: TouchEvent): void {
    if (!this.isDraggingSlider) return;
    if (e.touches.length > 0) {
      this.updateSliderFromMouse(e.touches[0].clientY);
    }
  }

  private onSliderTouchEnd(): void {
    this.isDraggingSlider = false;
  }

  private updateSliderFromMouse(clientY: number): void {
    const rect = this.colorTempSlider.getBoundingClientRect();
    const track = this.colorTempSlider.querySelector('.slider-track') as HTMLElement;
    const trackRect = track.getBoundingClientRect();

    let value = 1 - (clientY - trackRect.top) / trackRect.height;
    value = Math.max(0, Math.min(1, value));

    const thumbHeight = this.colorTempThumb.offsetHeight;
    const maxTop = trackRect.height - thumbHeight;
    const thumbTop = (1 - value) * maxTop;
    this.colorTempThumb.style.top = `${thumbTop}px`;

    this.sceneManager.setColorTemperature(value);
  }

  public update(deltaTime: number): void {
    if (this.isResettingCamera) {
      this.resetAnimationProgress = Math.min(
        this.resetAnimationProgress + deltaTime / this.resetAnimationDuration,
        1
      );
      const t = this.easeInOut(this.resetAnimationProgress);

      this.sceneManager.camera.position.lerpVectors(
        this.resetStartPosition,
        this.initialCameraPosition,
        t
      );
      this.controls.target.lerpVectors(
        this.resetStartTarget,
        this.initialCameraTarget,
        t
      );

      if (this.resetAnimationProgress >= 1) {
        this.isResettingCamera = false;
      }
    }

    if (this.controls.enabled) {
      this.controls.update();
    }
  }

  public resize(): void {
    this.controls.update();
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
