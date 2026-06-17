import * as THREE from 'three';
import { MoleculeData, VibrationState } from '../types';

export interface MoleculeMesh {
  group: THREE.Group;
  atoms: THREE.InstancedMesh;
  bonds: THREE.InstancedMesh;
  atomPositions: Float32Array;
  bondPositions: Float32Array;
  originalPositions: Float32Array;
  data: MoleculeData;
  activeSiteHighlight?: THREE.Mesh;
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private receptorMesh: MoleculeMesh | null = null;
  private ligandMesh: MoleculeMesh | null = null;
  private pulseRing: THREE.Mesh | null = null;
  private pulseAnimation: { active: boolean; time: number; duration: number } = { active: false, time: 0, duration: 1.5 };
  
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 8);
  private targetCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 8);
  private initialCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 8);
  
  private sceneRotationY: number = 0;
  private sceneRotationX: number = 0;
  private targetRotationY: number = 0;
  private targetRotationX: number = 0;
  
  private zoom: number = 1;
  private targetZoom: number = 1;
  
  private temperature: number = 25;
  private vibrationState: VibrationState | null = null;
  private rotationSpeed: number = 0.002;
  
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fps: number = 60;
  
  private onFpsUpdate?: (fps: number) => void;
  private onRender?: (delta: number) => void;
  
  private dummy: THREE.Object3D = new THREE.Object3D();
  private color: THREE.Color = new THREE.Color();
  
  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D0D0D);
    this.scene.fog = new THREE.Fog(0x0D0D0D, 15, 30);
    
    const { clientWidth, clientHeight } = this.container;
    this.camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 1000);
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    this.setupLighting();
    this.createPulseRing();
    this.setupResizeHandler();
  }
  
  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const keyLight = new THREE.PointLight(0xffffff, 1.2, 50);
    keyLight.position.set(10, 10, 10);
    this.scene.add(keyLight);
    
    const fillLight = new THREE.PointLight(0x6699ff, 0.6, 50);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);
    
    const rimLight = new THREE.PointLight(0xff6633, 0.3, 50);
    rimLight.position.set(0, -10, 10);
    this.scene.add(rimLight);
  }
  
  private createPulseRing(): void {
    const geometry = new THREE.RingGeometry(0.5, 1, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.pulseRing = new THREE.Mesh(geometry, material);
    this.pulseRing.visible = false;
    this.scene.add(this.pulseRing);
  }
  
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const { clientWidth, clientHeight } = this.container;
      this.camera.aspect = clientWidth / clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
    });
  }
  
  public setOnFpsUpdate(callback: (fps: number) => void): void {
    this.onFpsUpdate = callback;
  }
  
  public setOnRender(callback: (delta: number) => void): void {
    this.onRender = callback;
  }
  
  public setReceptorMesh(mesh: MoleculeMesh): void {
    if (this.receptorMesh) {
      this.scene.remove(this.receptorMesh.group);
      this.disposeMoleculeMesh(this.receptorMesh);
    }
    this.receptorMesh = mesh;
    this.scene.add(mesh.group);
  }
  
  public setLigandMesh(mesh: MoleculeMesh): void {
    if (this.ligandMesh) {
      this.scene.remove(this.ligandMesh.group);
      this.disposeMoleculeMesh(this.ligandMesh);
    }
    this.ligandMesh = mesh;
    this.scene.add(mesh.group);
    this.initializeVibration();
  }
  
  private disposeMoleculeMesh(mesh: MoleculeMesh): void {
    mesh.atoms.geometry.dispose();
    if (Array.isArray(mesh.atoms.material)) {
      mesh.atoms.material.forEach(m => m.dispose());
    } else {
      mesh.atoms.material.dispose();
    }
    mesh.bonds.geometry.dispose();
    if (Array.isArray(mesh.bonds.material)) {
      mesh.bonds.material.forEach(m => m.dispose());
    } else {
      mesh.bonds.material.dispose();
    }
    if (mesh.activeSiteHighlight) {
      mesh.activeSiteHighlight.geometry.dispose();
      const mat = mesh.activeSiteHighlight.material as THREE.Material;
      mat.dispose();
    }
  }
  
  private initializeVibration(): void {
    const totalAtoms = (this.receptorMesh?.data.atoms.length || 0) + 
                       (this.ligandMesh?.data.atoms.length || 0);
    const randomOffsets = new Float32Array(totalAtoms * 3);
    for (let i = 0; i < totalAtoms * 3; i++) {
      randomOffsets[i] = Math.random() * Math.PI * 2;
    }
    this.vibrationState = {
      amplitude: 0,
      frequency: 5,
      enabled: true,
      randomOffsets,
      time: 0
    };
  }
  
  public setTemperature(temperature: number): void {
    this.temperature = temperature;
    
    if (this.vibrationState) {
      if (temperature < 10) {
        this.vibrationState.enabled = false;
        this.vibrationState.amplitude = 0;
      } else {
        this.vibrationState.enabled = true;
        this.vibrationState.amplitude = (temperature / 100) * 0.3;
      }
    }
    
    this.rotationSpeed = temperature >= 10 ? 
      0.005 + (temperature / 100) * 0.01 : 0;
  }
  
  public getTemperature(): number {
    return this.temperature;
  }
  
  public setRotation(deltaX: number, deltaY: number): void {
    this.targetRotationY += deltaX * 0.008;
    this.targetRotationX += deltaY * 0.005;
    this.targetRotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.targetRotationX));
  }
  
  public setZoom(delta: number): void {
    this.targetZoom *= delta;
    this.targetZoom = Math.max(0.5, Math.min(10, this.targetZoom));
  }
  
  public resetView(): void {
    this.targetCameraPosition.copy(this.initialCameraPosition);
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.targetZoom = 1;
  }
  
  public getLigandPosition(): THREE.Vector3 {
    if (!this.ligandMesh) return new THREE.Vector3();
    return this.ligandMesh.group.position.clone();
  }
  
  public setLigandPosition(position: THREE.Vector3): void {
    if (this.ligandMesh) {
      this.ligandMesh.group.position.copy(position);
    }
  }
  
  public getLigandCenter(): THREE.Vector3 {
    if (!this.ligandMesh) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(this.ligandMesh.group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }
  
  public highlightActiveSite(highlight: boolean): void {
    if (!this.receptorMesh?.activeSiteHighlight) return;
    
    const mesh = this.receptorMesh.activeSiteHighlight;
    const material = mesh.material as THREE.MeshBasicMaterial;
    
    if (highlight) {
      material.opacity = 0.3;
      mesh.visible = true;
    } else {
      material.opacity = 0;
      setTimeout(() => {
        if (mesh) mesh.visible = false;
      }, 300);
    }
  }
  
  public triggerDockingAnimation(targetPosition: THREE.Vector3): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ligandMesh) {
        resolve();
        return;
      }
      
      const startPosition = this.ligandMesh.group.position.clone();
      const duration = 500;
      const startTime = performance.now();
      
      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
        const y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
        const z = startPosition.z + (targetPosition.z - startPosition.z) * eased;
        
        this.ligandMesh!.group.position.set(x, y, z);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.triggerPulseAnimation(targetPosition);
          setTimeout(resolve, 100);
        }
      };
      
      requestAnimationFrame(animate);
    });
  }
  
  public triggerPulseAnimation(position: THREE.Vector3): void {
    if (!this.pulseRing) return;
    
    this.pulseRing.position.copy(position);
    this.pulseRing.lookAt(this.camera.position);
    this.pulseRing.visible = true;
    this.pulseAnimation.active = true;
    this.pulseAnimation.time = 0;
  }
  
  private updatePulseAnimation(delta: number): void {
    if (!this.pulseAnimation.active || !this.pulseRing) return;
    
    this.pulseAnimation.time += delta;
    const progress = this.pulseAnimation.time / this.pulseAnimation.duration;
    
    if (progress >= 1) {
      this.pulseAnimation.active = false;
      this.pulseRing.visible = false;
      return;
    }
    
    const material = this.pulseRing.material as THREE.MeshBasicMaterial;
    const scale = 1 + progress * 4;
    this.pulseRing.scale.set(scale, scale, 1);
    material.opacity = (1 - progress) * 0.8;
  }
  
  private updateVibration(delta: number): void {
    if (!this.vibrationState?.enabled) return;
    
    this.vibrationState.time += delta;
    
    this.updateMoleculeVibration(this.receptorMesh, 0);
    this.updateMoleculeVibration(this.ligandMesh, this.receptorMesh?.data.atoms.length || 0);
  }
  
  private updateMoleculeVibration(mesh: MoleculeMesh | null, offsetIndex: number): void {
    if (!mesh || !this.vibrationState) return;
    
    const { amplitude, frequency, randomOffsets, time } = this.vibrationState;
    const atomCount = mesh.data.atoms.length;
    
    for (let i = 0; i < atomCount; i++) {
      const baseIdx = i * 3;
      const randomIdx = (offsetIndex + i) * 3;
      
      const ox = Math.sin(time * frequency * 2 * Math.PI + randomOffsets[randomIdx]) * amplitude;
      const oy = Math.cos(time * frequency * 2 * Math.PI + randomOffsets[randomIdx + 1]) * amplitude;
      const oz = Math.sin(time * frequency * 2 * Math.PI + randomOffsets[randomIdx + 2] + 1.5) * amplitude;
      
      this.dummy.position.set(
        mesh.originalPositions[baseIdx] + ox,
        mesh.originalPositions[baseIdx + 1] + oy,
        mesh.originalPositions[baseIdx + 2] + oz
      );
      this.dummy.updateMatrix();
      mesh.atoms.setMatrixAt(i, this.dummy.matrix);
    }
    
    mesh.atoms.instanceMatrix.needsUpdate = true;
  }
  
  private updateRotation(delta: number): void {
    this.sceneRotationY += (this.targetRotationY - this.sceneRotationY) * 0.1;
    this.sceneRotationX += (this.targetRotationX - this.sceneRotationX) * 0.1;
    
    if (this.receptorMesh) {
      this.receptorMesh.group.rotation.y = this.sceneRotationY;
      this.receptorMesh.group.rotation.x = this.sceneRotationX;
    }
    
    if (this.rotationSpeed > 0) {
      this.targetRotationY += this.rotationSpeed;
    }
  }
  
  private updateCamera(delta: number): void {
    this.zoom += (this.targetZoom - this.zoom) * 0.1;
    this.cameraPosition.lerp(this.targetCameraPosition, 0.05);
    
    const direction = this.cameraPosition.clone().normalize();
    this.camera.position.copy(direction.multiplyScalar(8 / this.zoom));
    this.camera.lookAt(this.cameraTarget);
  }
  
  private updateFps(timestamp: number): void {
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps);
      }
    }
  }
  
  public startRenderLoop(): void {
    let lastTime = performance.now();
    
    const render = (timestamp: number) => {
      this.animationFrameId = requestAnimationFrame(render);
      
      const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;
      
      this.updateRotation(delta);
      this.updateCamera(delta);
      this.updateVibration(delta);
      this.updatePulseAnimation(delta);
      this.updateFps(timestamp);
      
      if (this.onRender) {
        this.onRender(delta);
      }
      
      this.renderer.render(this.scene, this.camera);
    };
    
    this.animationFrameId = requestAnimationFrame(render);
  }
  
  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  public getReceptorMesh(): MoleculeMesh | null {
    return this.receptorMesh;
  }
  
  public getLigandMesh(): MoleculeMesh | null {
    return this.ligandMesh;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getFps(): number {
    return this.fps;
  }
  
  public dispose(): void {
    this.stopRenderLoop();
    
    if (this.receptorMesh) {
      this.disposeMoleculeMesh(this.receptorMesh);
    }
    if (this.ligandMesh) {
      this.disposeMoleculeMesh(this.ligandMesh);
    }
    
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
