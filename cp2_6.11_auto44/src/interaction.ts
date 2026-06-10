import * as THREE from 'three';
import { CrystalGrid, InteractionState } from './crystalGrid';

export type DistortMode = 'none' | 'waveLeft' | 'waveRight' | 'centerUp' | 'centerDown';

export class InteractionManager {
  public readonly state: InteractionState = {
    hoverIndex: null,
    selectedIndex: null,
    distortLeft: 0,
    distortRight: 0,
    distortUp: 0,
    distortDown: 0,
  };

  public onHoverChange: ((row: number | null, col: number | null) => void) | null = null;
  public onSelectChange: ((index: number | null) => void) | null = null;
  public onDistortModeChange: ((mode: DistortMode) => void) | null = null;

  private camera: THREE.PerspectiveCamera | null = null;
  private domElement: HTMLElement | null = null;
  private grid: CrystalGrid | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNdc: THREE.Vector2 = new THREE.Vector2();
  private lastHoverIndex: number | null = null;

  private keys = { left: false, right: false, up: false, down: false };
  private boundOnMouseMove = this.onMouseMove.bind(this);
  private boundOnClick = this.onClick.bind(this);
  private boundOnKeyDown = this.onKeyDown.bind(this);
  private boundOnKeyUp = this.onKeyUp.bind(this);
  private boundOnMouseLeave = this.onMouseLeave.bind(this);

  constructor() {
    this.raycaster.params.Mesh.threshold = 0.1;
  }

  public attach(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    grid: CrystalGrid
  ): void {
    this.camera = camera;
    this.domElement = domElement;
    this.grid = grid;

    domElement.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });
    domElement.addEventListener('click', this.boundOnClick, { passive: true });
    domElement.addEventListener('mouseleave', this.boundOnMouseLeave, { passive: true });
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
  }

  public update(_dt: number): void {
    const targetLeft = this.keys.left ? 1 : 0;
    const targetRight = this.keys.right ? 1 : 0;
    const targetUp = this.keys.up ? 1 : 0;
    const targetDown = this.keys.down ? 1 : 0;

    this.state.distortLeft = targetLeft;
    this.state.distortRight = targetRight;
    this.state.distortUp = targetUp;
    this.state.distortDown = targetDown;

    if (this.grid) {
      this.grid.setDistortTargets(targetLeft, targetRight, targetUp, targetDown);
    }

    this.emitDistortMode();
  }

  private emitDistortMode(): void {
    if (!this.onDistortModeChange) return;
    let mode: DistortMode = 'none';
    if (this.keys.left) mode = 'waveLeft';
    else if (this.keys.right) mode = 'waveRight';
    else if (this.keys.up) mode = 'centerUp';
    else if (this.keys.down) mode = 'centerDown';
    this.onDistortModeChange(mode);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.domElement || !this.camera || !this.grid) return;
    this.updateNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const intersects = this.raycaster.intersectObjects(this.grid.crystals, false);
    const hitMesh = intersects.length > 0 ? (intersects[0].object as THREE.Mesh) : null;

    let hoverIndex: number | null = null;
    if (hitMesh) {
      const idx = this.grid.getCrystalIndexFromMesh(hitMesh);
      if (idx >= 0) hoverIndex = idx;
    }

    if (hoverIndex !== this.lastHoverIndex) {
      if (hoverIndex !== null) {
        this.grid.triggerHover(hoverIndex);
      } else {
        this.grid.clearHoverEffects();
      }
      this.lastHoverIndex = hoverIndex;
      this.state.hoverIndex = hoverIndex;
      this.emitHover();
    }
  }

  private onMouseLeave(_e: MouseEvent): void {
    if (!this.grid) return;
    if (this.lastHoverIndex !== null) {
      this.grid.clearHoverEffects();
      this.lastHoverIndex = null;
      this.state.hoverIndex = null;
      this.emitHover();
    }
  }

  private onClick(e: MouseEvent): void {
    if (!this.domElement || !this.camera || !this.grid) return;
    this.updateNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const intersects = this.raycaster.intersectObjects(this.grid.crystals, false);
    const hitMesh = intersects.length > 0 ? (intersects[0].object as THREE.Mesh) : null;

    let selectedIndex: number | null = null;
    if (hitMesh) {
      const idx = this.grid.getCrystalIndexFromMesh(hitMesh);
      if (idx >= 0) {
        selectedIndex = this.state.selectedIndex === idx ? null : idx;
      }
    }
    this.state.selectedIndex = selectedIndex;
    this.grid.selectCrystal(selectedIndex);
    if (this.onSelectChange) {
      this.onSelectChange(selectedIndex);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    switch (e.key) {
      case 'ArrowLeft':
        this.keys.left = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.keys.right = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
        this.keys.up = true;
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.keys.down = true;
        e.preventDefault();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ArrowUp':
        this.keys.up = false;
        break;
      case 'ArrowDown':
        this.keys.down = false;
        break;
    }
  }

  private updateNdc(clientX: number, clientY: number): void {
    if (!this.domElement) return;
    const rect = this.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private emitHover(): void {
    if (!this.onHoverChange || !this.grid) return;
    if (this.state.hoverIndex === null) {
      this.onHoverChange(null, null);
      return;
    }
    const attr = this.grid.attributes[this.state.hoverIndex];
    if (attr) {
      this.onHoverChange(attr.row, attr.col);
    }
  }

  public dispose(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
      this.domElement.removeEventListener('click', this.boundOnClick);
      this.domElement.removeEventListener('mouseleave', this.boundOnMouseLeave);
    }
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    this.camera = null;
    this.domElement = null;
    this.grid = null;
  }
}

export type { InteractionState };
