import * as THREE from 'three';
import { SceneManager } from '../core/SceneManager';

interface PointerState {
  isDown: boolean;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  targetObject: THREE.Object3D | null;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
}

export class InteractionHandler {
  private sceneManager: SceneManager;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  
  private leftButton: PointerState = this.createPointerState();
  private rightButton: PointerState = this.createPointerState();
  
  private ligandGroup: THREE.Group | null = null;
  private isDraggingLigand: boolean = false;
  
  private onLigandDrag?: (position: THREE.Vector3) => void;
  private onLigandDragStart?: () => void;
  private onLigandDragEnd?: () => void;
  private onSceneRotate?: (deltaX: number, deltaY: number) => void;
  
  private highlightTimeout: number | null = null;
  
  private touchStartDistance: number = 0;
  
  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.renderer = sceneManager.getRenderer();
    this.camera = sceneManager.getCamera();
    this.scene = sceneManager.getScene();
    
    this.setupEventListeners();
  }
  
  private createPointerState(): PointerState {
    return {
      isDown: false,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      targetObject: null,
      dragPlane: new THREE.Plane(),
      dragOffset: new THREE.Vector3()
    };
  }
  
  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    canvas.style.touchAction = 'none';
  }
  
  public setLigandGroup(group: THREE.Group): void {
    this.ligandGroup = group;
  }
  
  public setOnLigandDrag(callback: (position: THREE.Vector3) => void): void {
    this.onLigandDrag = callback;
  }
  
  public setOnLigandDragStart(callback: () => void): void {
    this.onLigandDragStart = callback;
  }
  
  public setOnLigandDragEnd(callback: () => void): void {
    this.onLigandDragEnd = callback;
  }
  
  public setOnSceneRotate(callback: (deltaX: number, deltaY: number) => void): void {
    this.onSceneRotate = callback;
  }
  
  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    
    this.updateMousePosition(e.clientX, e.clientY);
    
    if (e.button === 0) {
      this.leftButton.isDown = true;
      this.leftButton.x = e.clientX;
      this.leftButton.y = e.clientY;
      this.leftButton.lastX = e.clientX;
      this.leftButton.lastY = e.clientY;
      
      if (this.ligandGroup) {
        const intersects = this.raycastLigand();
        
        if (intersects.length > 0) {
          this.startLigandDrag();
        }
      }
    } else if (e.button === 2) {
      this.rightButton.isDown = true;
      this.rightButton.x = e.clientX;
      this.rightButton.y = e.clientY;
      this.rightButton.lastX = e.clientX;
      this.rightButton.lastY = e.clientY;
    }
  }
  
  private onMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e.clientX, e.clientY);
    
    if (this.leftButton.isDown) {
      const deltaX = e.clientX - this.leftButton.lastX;
      const deltaY = e.clientY - this.leftButton.lastY;
      
      if (this.isDraggingLigand && this.ligandGroup) {
        this.updateLigandDrag();
      } else {
        this.rotateScene(deltaX, deltaY);
      }
      
      this.leftButton.lastX = e.clientX;
      this.leftButton.lastY = e.clientY;
    }
    
    if (this.rightButton.isDown) {
      const deltaX = e.clientX - this.rightButton.lastX;
      const deltaY = e.clientY - this.rightButton.lastY;
      
      this.rotateScene(deltaX, deltaY);
      
      this.rightButton.lastX = e.clientX;
      this.rightButton.lastY = e.clientY;
    }
  }
  
  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.leftButton.isDown = false;
      
      if (this.isDraggingLigand) {
        this.endLigandDrag();
      }
    } else if (e.button === 2) {
      this.rightButton.isDown = false;
    }
  }
  
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    this.sceneManager.setZoom(delta);
  }
  
  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
      
      this.leftButton.isDown = true;
      this.leftButton.x = touch.clientX;
      this.leftButton.y = touch.clientY;
      this.leftButton.lastX = touch.clientX;
      this.leftButton.lastY = touch.clientY;
      
      if (this.ligandGroup) {
        const intersects = this.raycastLigand();
        if (intersects.length > 0) {
          this.startLigandDrag();
        }
      }
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches);
    }
  }
  
  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
      
      const deltaX = touch.clientX - this.leftButton.lastX;
      const deltaY = touch.clientY - this.leftButton.lastY;
      
      if (this.isDraggingLigand && this.ligandGroup) {
        this.updateLigandDrag();
      } else {
        this.rotateScene(deltaX, deltaY);
      }
      
      this.leftButton.lastX = touch.clientX;
      this.leftButton.lastY = touch.clientY;
    } else if (e.touches.length === 2) {
      const currentDistance = this.getTouchDistance(e.touches);
      const delta = currentDistance / this.touchStartDistance;
      this.sceneManager.setZoom(delta);
      this.touchStartDistance = currentDistance;
    }
  }
  
  private onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      this.leftButton.isDown = false;
      this.rightButton.isDown = false;
      
      if (this.isDraggingLigand) {
        this.endLigandDrag();
      }
    }
  }
  
  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  private raycastLigand(): THREE.Intersection[] {
    if (!this.ligandGroup) return [];
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const ligandMeshes: THREE.Object3D[] = [];
    this.ligandGroup.traverse((child) => {
      if (child instanceof THREE.InstancedMesh || child instanceof THREE.Mesh) {
        ligandMeshes.push(child);
      }
    });
    
    return this.raycaster.intersectObjects(ligandMeshes, true);
  }
  
  private startLigandDrag(): void {
    if (!this.ligandGroup) return;
    
    this.isDraggingLigand = true;
    
    const ligandPosition = this.ligandGroup.position;
    
    const normal = new THREE.Vector3();
    this.camera.getWorldDirection(normal);
    this.leftButton.dragPlane.setFromNormalAndCoplanarPoint(normal, ligandPosition);
    
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.leftButton.dragPlane, intersection);
    
    if (intersection) {
      this.leftButton.dragOffset.copy(ligandPosition).sub(intersection);
    }
    
    this.scheduleActiveSiteHighlight();
    
    if (this.onLigandDragStart) {
      this.onLigandDragStart();
    }
  }
  
  private updateLigandDrag(): void {
    if (!this.ligandGroup || !this.isDraggingLigand) return;
    
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.leftButton.dragPlane, intersection);
    
    if (intersection) {
      const newPosition = intersection.add(this.leftButton.dragOffset);
      this.ligandGroup.position.copy(newPosition);
      
      if (this.onLigandDrag) {
        this.onLigandDrag(newPosition.clone());
      }
    }
  }
  
  private endLigandDrag(): void {
    this.isDraggingLigand = false;
    this.cancelActiveSiteHighlight();
    
    if (this.onLigandDragEnd) {
      this.onLigandDragEnd();
    }
  }
  
  private rotateScene(deltaX: number, deltaY: number): void {
    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      this.sceneManager.setRotation(deltaX, deltaY);
      
      if (this.onSceneRotate) {
        this.onSceneRotate(deltaX, deltaY);
      }
    }
  }
  
  private scheduleActiveSiteHighlight(): void {
    this.cancelActiveSiteHighlight();
    this.highlightTimeout = window.setTimeout(() => {
      this.sceneManager.highlightActiveSite(true);
    }, 300);
  }
  
  private cancelActiveSiteHighlight(): void {
    if (this.highlightTimeout !== null) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = null;
    }
    this.sceneManager.highlightActiveSite(false);
  }
  
  public isDragging(): boolean {
    return this.isDraggingLigand || this.leftButton.isDown || this.rightButton.isDown;
  }
  
  public dispose(): void {
    const canvas = this.renderer.domElement;
    
    canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.removeEventListener('wheel', this.onWheel.bind(this));
    canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    
    canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
    
    this.cancelActiveSiteHighlight();
  }
}
