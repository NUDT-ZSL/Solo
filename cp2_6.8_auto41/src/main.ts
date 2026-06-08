import * as THREE from 'three';
import { LavaLamp, LavaLampParams } from './lavaLamp';
import { LightsController } from './lights';
import { UIController } from './ui';

class LavaLampApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lavaLamp: LavaLamp;
  private lights: LightsController;
  private ui: UIController;
  private container: HTMLElement;
  
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;
  private targetDistance = 7;
  private currentDistance = 7;
  
  private initialRotationX = 0;
  private initialRotationY = 0;
  private initialDistance = 7;
  
  private clock = new THREE.Clock();
  
  constructor() {
    this.container = document.getElementById('app')!;
    
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.08);
    
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1, 7);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('canvas-container')!.appendChild(this.renderer.domElement);
    
    const params: LavaLampParams = {
      temperature: 50,
      bubbleCount: 10,
      refractionIndex: 1.4
    };
    
    this.lavaLamp = new LavaLamp(this.scene, params);
    this.lights = new LightsController(this.scene);
    this.lights.setTemperature(params.temperature);
    
    this.ui = new UIController(
      this.container,
      this.lights,
      this.lavaLamp,
      {
        onTemperatureChange: (v) => {
          this.lavaLamp.setTemperature(v);
          this.lights.setTemperature(v);
        },
        onBubbleCountChange: (v) => this.lavaLamp.setBubbleCount(v),
        onRefractionChange: (v) => this.lavaLamp.setRefractionIndex(v),
        onLightPresetChange: (idx) => this.lights.setPreset(idx),
        onResetView: () => this.resetView()
      }
    );
    
    this.setupEventListeners();
    this.animate();
  }
  
  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;
      
      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;
      
      const maxRotationX = (60 * Math.PI) / 180;
      const minRotationX = (-60 * Math.PI) / 180;
      this.targetRotationX = Math.max(minRotationX, Math.min(maxRotationX, this.targetRotationX));
      
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    });
    
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.005;
      this.targetDistance = Math.max(2, Math.min(15, this.targetDistance));
    }, { passive: false });
    
    canvas.addEventListener('click', (e) => {
      const bubble = this.lavaLamp.handleClick(
        this.camera,
        e.clientX,
        e.clientY,
        canvas
      );
      this.ui.setSelectedBubble(bubble);
    });
    
    canvas.style.cursor = 'grab';
    
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
        this.previousMouseY = e.touches[0].clientY;
      }
    }, { passive: true });
    
    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      const deltaY = e.touches[0].clientY - this.previousMouseY;
      
      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;
      
      const maxRotationX = (60 * Math.PI) / 180;
      const minRotationX = (-60 * Math.PI) / 180;
      this.targetRotationX = Math.max(minRotationX, Math.min(maxRotationX, this.targetRotationX));
      
      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
    }, { passive: true });
    
    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }
  
  private resetView(): void {
    this.targetRotationX = this.initialRotationX;
    this.targetRotationY = this.initialRotationY;
    this.targetDistance = this.initialDistance;
  }
  
  private updateCamera(): void {
    const damping = 0.9;
    const invDamping = 1 - damping;
    
    this.currentRotationX = this.currentRotationX * damping + this.targetRotationX * invDamping;
    this.currentRotationY = this.currentRotationY * damping + this.targetRotationY * invDamping;
    this.currentDistance = this.currentDistance * damping + this.targetDistance * invDamping;
    
    const x = this.currentDistance * Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX);
    const y = this.currentDistance * Math.sin(this.currentRotationX);
    const z = this.currentDistance * Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX);
    
    this.camera.position.set(x, y + 0.5, z);
    this.camera.lookAt(0, 0, 0);
  }
  
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
    this.updateCamera();
    this.lavaLamp.update(deltaTime);
    this.lights.update(deltaTime);
    this.ui.updateLabelPosition(this.camera, this.renderer.domElement);
    
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new LavaLampApp();
});
