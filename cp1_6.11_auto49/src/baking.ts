import * as THREE from 'three';
import { ingredients } from './ingredients';

export interface BakeStats {
  sweetness: number;
  fluffiness: number;
  glow: number;
}

export interface BakeResult {
  stats: BakeStats;
  finalColor: THREE.Color;
  scale: number;
}

interface BubbleParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class BakingSystem {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private cakeMesh: THREE.Mesh | null = null;
  private cakeMaterial: THREE.MeshStandardMaterial | null = null;
  private ovenLight: THREE.PointLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private bubbleParticles: BubbleParticle[] = [];
  private isBaking: boolean = false;
  private bakeProgress: number = 0;
  private bakeDuration: number = 8000;
  private startTime: number = 0;
  private animationId: number = 0;
  private initialColor: THREE.Color = new THREE.Color(0xe8e0d0);
  private finalColor: THREE.Color = new THREE.Color(0xd4a574);
  private onCompleteCallback: ((result: BakeResult) => void) | null = null;
  private onProgressCallback: ((progress: number) => void) | null = null;
  private mixAmounts: Record<string, number> = { berry: 0, flour: 0, cream: 0, sugar: 0 };
  private targetScale: number = 1.5;
  private container: HTMLElement | null = null;

  constructor() {}

  setOnComplete(callback: (result: BakeResult) => void) {
    this.onCompleteCallback = callback;
  }

  setOnProgress(callback: (progress: number) => void) {
    this.onProgressCallback = callback;
  }

  init(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0a00);
    this.scene.fog = new THREE.Fog(0x1a0a00, 3, 10);

    const canvas = document.getElementById('ovenCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 4);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();
    this.setupCake();
    this.setupOvenInterior();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  private setupLights() {
    if (!this.scene) return;

    this.ambientLight = new THREE.AmbientLight(0x403020, 0.4);
    this.scene.add(this.ambientLight);

    this.ovenLight = new THREE.PointLight(0xff8844, 0.5, 10);
    this.ovenLight.position.set(0, 2, 0);
    this.ovenLight.castShadow = true;
    this.scene.add(this.ovenLight);

    const topLight = new THREE.PointLight(0xffaa66, 0.3, 8);
    topLight.position.set(0, 3, -1);
    this.scene.add(topLight);

    const fillLight = new THREE.DirectionalLight(0xffddaa, 0.2);
    fillLight.position.set(-2, 1, 2);
    this.scene.add(fillLight);
  }

  private setupCake() {
    if (!this.scene) return;

    const geometry = new THREE.SphereGeometry(0.8, 64, 64);
    
    this.cakeMaterial = new THREE.MeshStandardMaterial({
      color: this.initialColor,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0
    });

    this.cakeMesh = new THREE.Mesh(geometry, this.cakeMaterial);
    this.cakeMesh.position.y = 0;
    this.cakeMesh.castShadow = true;
    this.cakeMesh.receiveShadow = true;
    this.scene.add(this.cakeMesh);
  }

  private setupOvenInterior() {
    if (!this.scene) return;

    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.9,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a0f05,
      roughness: 0.9,
      side: THREE.BackSide
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), wallMat);
    backWall.position.z = -2;
    backWall.position.y = 1;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -3;
    leftWall.position.y = 1;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 3;
    rightWall.position.y = 1;
    this.scene.add(rightWall);

    const heatingElement = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    heatingElement.rotation.z = Math.PI / 2;
    heatingElement.position.set(0, 1.8, -1.5);
    this.scene.add(heatingElement);
  }

  private resize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  calculateStats(mixAmounts: Record<string, number>): BakeStats {
    const total = Object.values(mixAmounts).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return { sweetness: 0, fluffiness: 0, glow: 0 };
    }

    let sweetness = 0;
    let fluffiness = 0;
    let glow = 0;

    for (const [id, amount] of Object.entries(mixAmounts)) {
      const ing = ingredients[id];
      if (ing) {
        sweetness += ing.sweetness * amount;
        fluffiness += ing.fluffiness * amount;
        glow += ing.glow * amount;
      }
    }

    return {
      sweetness: Math.min(5, sweetness / total),
      fluffiness: Math.min(5, fluffiness / total),
      glow: Math.min(5, glow / total)
    };
  }

  calculateFinalColor(mixAmounts: Record<string, number>): THREE.Color {
    const total = Object.values(mixAmounts).reduce((a, b) => a + b, 0);
    if (total === 0) return new THREE.Color(0xd4a574);

    let r = 0, g = 0, b = 0;
    for (const [id, amount] of Object.entries(mixAmounts)) {
      const ing = ingredients[id];
      if (ing) {
        const color = new THREE.Color(ing.color);
        r += color.r * amount;
        g += color.g * amount;
        b += color.b * amount;
      }
    }

    const baseColor = new THREE.Color(0xd4a574);
    const mixColor = new THREE.Color(r / total, g / total, b / total);
    
    const finalColor = new THREE.Color().lerpColors(baseColor, mixColor, 0.4);
    return finalColor;
  }

  startBaking(mixAmounts: Record<string, number>) {
    if (this.isBaking) return;
    this.mixAmounts = { ...mixAmounts };
    this.isBaking = true;
    this.bakeProgress = 0;
    this.startTime = performance.now();
    this.finalColor = this.calculateFinalColor(mixAmounts);
    this.targetScale = 1 + 0.5 * (this.calculateStats(mixAmounts).fluffiness / 5);

    if (this.cakeMesh) {
      this.cakeMesh.scale.set(0.7, 0.7, 0.7);
    }
    if (this.cakeMaterial) {
      this.cakeMaterial.color.copy(this.initialColor);
      this.cakeMaterial.emissive.setHex(0x000000);
      this.cakeMaterial.emissiveIntensity = 0;
    }

    this.animate();
  }

  private animate = () => {
    if (!this.isBaking) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    this.bakeProgress = Math.min(1, elapsed / this.bakeDuration);

    this.updateBakeState();
    this.updateBubbles();
    this.updateLight();
    this.rotateCake();
    this.render();

    if (this.onProgressCallback) {
      this.onProgressCallback(this.bakeProgress);
    }

    if (this.bakeProgress >= 1) {
      this.isBaking = false;
      this.finishBaking();
    } else {
      this.animationId = requestAnimationFrame(this.animate);
    }
  };

  private updateBakeState() {
    if (!this.cakeMesh || !this.cakeMaterial) return;

    const t = this.bakeProgress;

    const startScale = 0.7;
    const endScale = this.targetScale;
    const scale = startScale + (endScale - startScale) * this.easeOutCubic(t);
    this.cakeMesh.scale.set(scale, scale, scale);

    const color = new THREE.Color().lerpColors(this.initialColor, this.finalColor, this.easeInQuad(t));
    this.cakeMaterial.color.copy(color);

    const glowIntensity = Math.sin(t * Math.PI) * 0.3 * (this.calculateStats(this.mixAmounts).glow / 5);
    this.cakeMaterial.emissive.copy(this.finalColor);
    this.cakeMaterial.emissiveIntensity = glowIntensity;

    if (t > 0.4 && this.bubbleParticles.length < 200) {
      if (Math.random() < 0.3) {
        this.spawnBubble();
      }
    }
  }

  private spawnBubble() {
    if (!this.scene || !this.cakeMesh) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 * this.cakeMesh.scale.x;
    const height = (Math.random() - 0.3) * this.cakeMesh.scale.x;

    const geometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      this.cakeMesh.position.x + Math.cos(angle) * radius,
      this.cakeMesh.position.y + height,
      this.cakeMesh.position.z + Math.sin(angle) * radius
    );

    this.scene.add(mesh);
    this.bubbleParticles.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        0.02 + Math.random() * 0.03,
        (Math.random() - 0.5) * 0.01
      ),
      life: 1,
      maxLife: 1
    });
  }

  private updateBubbles() {
    if (!this.scene) return;

    for (let i = this.bubbleParticles.length - 1; i >= 0; i--) {
      const bubble = this.bubbleParticles[i];
      bubble.mesh.position.add(bubble.velocity);
      bubble.life -= 0.01;
      
      const mat = bubble.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = bubble.life * 0.7;
      bubble.mesh.scale.setScalar(bubble.life);

      if (bubble.life <= 0) {
        this.scene.remove(bubble.mesh);
        bubble.mesh.geometry.dispose();
        (bubble.mesh.material as THREE.Material).dispose();
        this.bubbleParticles.splice(i, 1);
      }
    }
  }

  private updateLight() {
    if (this.ovenLight) {
      const flicker = 0.8 + Math.random() * 0.4;
      const baseIntensity = 0.5 + this.bakeProgress * 1.5;
      this.ovenLight.intensity = baseIntensity * flicker;
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.3 + this.bakeProgress * 0.3;
    }
  }

  private rotateCake() {
    if (this.cakeMesh) {
      this.cakeMesh.rotation.y += 0.005;
    }
  }

  private render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  private finishBaking() {
    cancelAnimationFrame(this.animationId);
    
    const stats = this.calculateStats(this.mixAmounts);
    const result: BakeResult = {
      stats,
      finalColor: this.finalColor.clone(),
      scale: this.targetScale
    };

    if (this.onCompleteCallback) {
      this.onCompleteCallback(result);
    }
  }

  getCakeMesh(): THREE.Mesh | null {
    return this.cakeMesh;
  }

  getScene(): THREE.Scene | null {
    return this.scene;
  }

  getCamera(): THREE.Camera | null {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getStats(): BakeStats {
    return this.calculateStats(this.mixAmounts);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  reset() {
    this.isBaking = false;
    this.bakeProgress = 0;
    cancelAnimationFrame(this.animationId);
    
    if (this.cakeMesh) {
      this.cakeMesh.scale.set(0.7, 0.7, 0.7);
      this.cakeMesh.rotation.y = 0;
    }
    if (this.cakeMaterial) {
      this.cakeMaterial.color.copy(this.initialColor);
      this.cakeMaterial.emissive.setHex(0x000000);
      this.cakeMaterial.emissiveIntensity = 0;
    }

    this.bubbleParticles.forEach(b => {
      this.scene?.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    });
    this.bubbleParticles = [];
  }

  destroy() {
    this.reset();
    window.removeEventListener('resize', () => this.resize());
  }
}
