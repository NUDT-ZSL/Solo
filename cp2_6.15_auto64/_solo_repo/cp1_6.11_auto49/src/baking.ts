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
  glowIntensity: number;
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
  private topLight: THREE.PointLight | null = null;
  private rimLight: THREE.SpotLight | null = null;
  private bubbleParticles: BubbleParticle[] = [];
  private heatParticles: THREE.Points | null = null;
  private heatParticleCount: number = 80;
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
  private cakeGlow: THREE.Mesh | null = null;
  private ovenDoorLeft: THREE.Mesh | null = null;
  private ovenDoorRight: THREE.Mesh | null = null;

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
    this.scene.background = new THREE.Color(0x1a0800);
    this.scene.fog = new THREE.FogExp2(0x1a0800, 0.15);

    const canvas = document.getElementById('ovenCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 4.5);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();
    this.setupCake();
    this.setupOvenInterior();
    this.setupHeatParticles();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  private setupLights() {
    if (!this.scene) return;

    this.ambientLight = new THREE.AmbientLight(0x402010, 0.3);
    this.scene.add(this.ambientLight);

    this.ovenLight = new THREE.PointLight(0xff7722, 0.3, 12, 2);
    this.ovenLight.position.set(0, 2.5, 0);
    this.ovenLight.castShadow = true;
    this.ovenLight.shadow.mapSize.width = 1024;
    this.ovenLight.shadow.mapSize.height = 1024;
    this.scene.add(this.ovenLight);

    this.topLight = new THREE.PointLight(0xff9944, 0.4, 10);
    this.topLight.position.set(0, 3, -1.5);
    this.scene.add(this.topLight);

    this.rimLight = new THREE.SpotLight(0xffaa66, 0.5, 10, Math.PI / 6, 0.5);
    this.rimLight.position.set(0, 2, -2);
    this.rimLight.target.position.set(0, 0, 0);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    const fillLight = new THREE.DirectionalLight(0xffccaa, 0.2);
    fillLight.position.set(-3, 1, 2);
    this.scene.add(fillLight);
  }

  private setupCake() {
    if (!this.scene) return;

    const geometry = new THREE.SphereGeometry(0.9, 64, 64);
    
    this.cakeMaterial = new THREE.MeshStandardMaterial({
      color: this.initialColor,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x000000,
      emissiveIntensity: 0
    });

    this.cakeMesh = new THREE.Mesh(geometry, this.cakeMaterial);
    this.cakeMesh.position.y = -0.2;
    this.cakeMesh.castShadow = true;
    this.cakeMesh.receiveShadow = true;
    this.cakeMesh.scale.set(0.6, 0.6, 0.6);
    this.scene.add(this.cakeMesh);

    const glowGeometry = new THREE.SphereGeometry(1.1, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    this.cakeGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.cakeGlow.position.y = -0.2;
    this.scene.add(this.cakeGlow);
  }

  private setupOvenInterior() {
    if (!this.scene) return;

    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a1505,
      roughness: 0.9,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00,
      roughness: 0.95,
      side: THREE.BackSide
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), wallMat);
    backWall.position.z = -3;
    backWall.position.y = 1;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -4;
    leftWall.position.y = 1;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 4;
    rightWall.position.y = 1;
    this.scene.add(rightWall);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3;
    this.scene.add(ceiling);

    const heatingElementGeo = new THREE.CylinderGeometry(0.04, 0.04, 5, 12);
    const heatingElementMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const heatingElement = new THREE.Mesh(heatingElementGeo, heatingElementMat);
    heatingElement.rotation.z = Math.PI / 2;
    heatingElement.position.set(0, 2.2, -2.5);
    this.scene.add(heatingElement);

    const heatingElement2 = new THREE.Mesh(heatingElementGeo, heatingElementMat);
    heatingElement2.rotation.z = Math.PI / 2;
    heatingElement2.position.set(0, 2.2, 2);
    this.scene.add(heatingElement2);

    const rackGeo = new THREE.BoxGeometry(5, 0.05, 3);
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.8
    });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(0, -1.1, 0);
    rack.receiveShadow = true;
    this.scene.add(rack);
  }

  private setupHeatParticles() {
    if (!this.scene) return;

    const particleCount = this.heatParticleCount;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = -1 + Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.2;

      sizes[i] = Math.random() * 0.1 + 0.05;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.heatParticles = new THREE.Points(geometry, material);
    this.heatParticles.visible = false;
    this.scene.add(this.heatParticles);
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
    
    const finalColor = new THREE.Color().lerpColors(baseColor, mixColor, 0.45);
    return finalColor;
  }

  startBaking(mixAmounts: Record<string, number>) {
    if (this.isBaking) return;
    this.mixAmounts = { ...mixAmounts };
    this.isBaking = true;
    this.bakeProgress = 0;
    this.startTime = performance.now();
    this.finalColor = this.calculateFinalColor(mixAmounts);
    
    const stats = this.calculateStats(mixAmounts);
    this.targetScale = 0.6 + 0.9 * (stats.fluffiness / 5);

    if (this.cakeMesh) {
      this.cakeMesh.scale.set(0.6, 0.6, 0.6);
      this.cakeMesh.position.y = -0.2;
    }
    if (this.cakeMaterial) {
      this.cakeMaterial.color.copy(this.initialColor);
      this.cakeMaterial.emissive.setHex(0x000000);
      this.cakeMaterial.emissiveIntensity = 0;
    }
    if (this.cakeGlow) {
      const glowMat = this.cakeGlow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0;
    }
    if (this.heatParticles) {
      this.heatParticles.visible = true;
    }

    this.bubbleParticles.forEach(b => {
      this.scene?.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    });
    this.bubbleParticles = [];

    this.animate();
  }

  private animate = () => {
    if (!this.isBaking) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    this.bakeProgress = Math.min(1, elapsed / this.bakeDuration);

    this.updateBakeState();
    this.updateBubbles();
    this.updateHeatParticles();
    this.updateLights();
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
    if (!this.cakeMesh || !this.cakeMaterial || !this.cakeGlow) return;

    const t = this.bakeProgress;
    const stats = this.calculateStats(this.mixAmounts);

    const startScale = 0.6;
    const endScale = this.targetScale;
    const scale = startScale + (endScale - startScale) * this.easeOutBack(t);
    this.cakeMesh.scale.set(scale, scale, scale);

    const riseAmount = 0.5 * this.easeOutCubic(t);
    this.cakeMesh.position.y = -0.2 + riseAmount;

    const colorT = this.easeInQuad(Math.min(1, t * 1.2));
    const color = new THREE.Color().lerpColors(this.initialColor, this.finalColor, colorT);
    this.cakeMaterial.color.copy(color);

    const glowIntensity = Math.sin(t * Math.PI) * 0.4 * (stats.glow / 5);
    this.cakeMaterial.emissive.copy(this.finalColor);
    this.cakeMaterial.emissiveIntensity = glowIntensity;

    const glowMat = this.cakeGlow.material as THREE.MeshBasicMaterial;
    glowMat.color.copy(this.finalColor);
    glowMat.opacity = glowIntensity * 0.5;
    this.cakeGlow.scale.set(scale * 1.1, scale * 1.1, scale * 1.1);
    this.cakeGlow.position.y = -0.2 + riseAmount;

    if (t > 0.25 && this.bubbleParticles.length < 200) {
      const spawnRate = 0.4 + t * 0.8;
      if (Math.random() < spawnRate * 0.1) {
        this.spawnBubble();
      }
    }
  }

  private spawnBubble() {
    if (!this.scene || !this.cakeMesh) return;

    const angle = Math.random() * Math.PI * 2;
    const scale = this.cakeMesh.scale.x;
    const radius = 0.7 * scale;
    const height = (Math.random() - 0.2) * scale;

    const size = 0.03 + Math.random() * 0.07;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.8
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
        (Math.random() - 0.5) * 0.015,
        0.02 + Math.random() * 0.04,
        (Math.random() - 0.5) * 0.015
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
      bubble.life -= 0.008;
      
      const mat = bubble.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, bubble.life * 0.8);
      bubble.mesh.scale.setScalar(Math.max(0.1, bubble.life));

      if (bubble.life <= 0) {
        this.scene.remove(bubble.mesh);
        bubble.mesh.geometry.dispose();
        mat.dispose();
        this.bubbleParticles.splice(i, 1);
      }
    }
  }

  private updateHeatParticles() {
    if (!this.heatParticles || !this.heatParticles.geometry) return;

    const positions = this.heatParticles.geometry.attributes.position.array as Float32Array;
    const count = this.heatParticleCount;

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += 0.015 + Math.random() * 0.01;
      positions[i * 3] += (Math.random() - 0.5) * 0.005;

      if (positions[i * 3 + 1] > 2.5) {
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = -1;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      }
    }

    this.heatParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateLights() {
    if (this.ovenLight) {
      const flicker = 0.75 + Math.random() * 0.5;
      const baseIntensity = 0.3 + this.bakeProgress * 2;
      this.ovenLight.intensity = baseIntensity * flicker;
    }
    if (this.topLight) {
      const flicker = 0.8 + Math.random() * 0.4;
      this.topLight.intensity = (0.4 + this.bakeProgress * 1) * flicker;
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.2 + this.bakeProgress * 0.4;
    }
    if (this.rimLight) {
      this.rimLight.intensity = 0.3 + this.bakeProgress * 0.7;
    }
  }

  private rotateCake() {
    if (this.cakeMesh) {
      this.cakeMesh.rotation.y += 0.008;
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
      scale: this.targetScale,
      glowIntensity: stats.glow / 5 * 0.3
    };

    if (this.heatParticles) {
      this.heatParticles.visible = false;
    }

    if (this.onCompleteCallback) {
      setTimeout(() => {
        this.onCompleteCallback?.(result);
      }, 800);
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

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  reset() {
    this.isBaking = false;
    this.bakeProgress = 0;
    cancelAnimationFrame(this.animationId);
    
    if (this.cakeMesh) {
      this.cakeMesh.scale.set(0.6, 0.6, 0.6);
      this.cakeMesh.rotation.y = 0;
      this.cakeMesh.position.y = -0.2;
    }
    if (this.cakeMaterial) {
      this.cakeMaterial.color.copy(this.initialColor);
      this.cakeMaterial.emissive.setHex(0x000000);
      this.cakeMaterial.emissiveIntensity = 0;
    }
    if (this.cakeGlow) {
      const glowMat = this.cakeGlow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0;
    }
    if (this.heatParticles) {
      this.heatParticles.visible = false;
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
