import * as THREE from 'three';
import { DessertProperties } from './ingredients';

export enum BakingState {
  IDLE = 'idle',
  PREHEATING = 'preheating',
  BAKING = 'baking',
  FINISHED = 'finished'
}

interface HeatParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  alpha: number;
  life: number;
  maxLife: number;
}

const BAKING_DURATION = 8000;
const MAX_PARTICLES = 200;

export class BakingSystem {
  private state: BakingState = BakingState.IDLE;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dessertMesh: THREE.Mesh | null = null;
  private dessertMaterial: THREE.MeshStandardMaterial | null = null;
  private particles: HeatParticle[] = [];
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particlePoints: THREE.Points | null = null;
  private startTime: number = 0;
  private elapsed: number = 0;
  private initialColor: THREE.Color = new THREE.Color(0xcccccc);
  private targetColor: THREE.Color = new THREE.Color(0xffd700);
  private initialScale: number = 1;
  private targetScale: number = 1.5;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private onBakingComplete: (() => void) | null = null;
  private properties: DessertProperties | null = null;
  private heatingElements: THREE.Mesh[] = [];
  private ovenWalls: THREE.Mesh[] = [];
  private glowLight: THREE.PointLight | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  public init(properties: DessertProperties, initialColor: THREE.Color): void {
    this.properties = properties;
    this.initialColor = initialColor.clone();
    this.calculateTargetColor();
    this.createDessert();
    this.createOvenInterior();
    this.createParticles();
    this.setupLighting();
  }

  private calculateTargetColor(): void {
    if (!this.properties) return;

    const glowIntensity = this.properties.glowIntensity / 100;
    const sweetness = this.properties.sweetness / 100;

    if (sweetness > 0.6) {
      this.targetColor = new THREE.Color(0xff69b4).lerp(new THREE.Color(0xffd700), 0.5);
    } else if (glowIntensity > 0.6) {
      this.targetColor = new THREE.Color(0x9b59b6).lerp(new THREE.Color(0xffd700), 0.3);
    } else {
      this.targetColor = new THREE.Color(0xffd700);
    }
  }

  private createDessert(): void {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const noise = Math.sin(x * 3) * Math.cos(y * 3) * Math.sin(z * 3) * 0.1;
      const length = Math.sqrt(x * x + y * y + z * z);
      const newLength = 1 + noise;
      
      positions.setXYZ(i, x / length * newLength, y / length * newLength, z / length * newLength);
    }
    geometry.computeVertexNormals();

    this.dessertMaterial = new THREE.MeshStandardMaterial({
      color: this.initialColor,
      metalness: 0.1,
      roughness: 0.6,
      emissive: this.initialColor,
      emissiveIntensity: 0.1
    });

    this.dessertMesh = new THREE.Mesh(geometry, this.dessertMaterial);
    this.dessertMesh.position.set(0, 0, 0);
    this.scene.add(this.dessertMesh);
  }

  private createOvenInterior(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0a1a,
      metalness: 0.8,
      roughness: 0.3
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      wallMaterial
    );
    backWall.position.set(0, 0, -5);
    this.scene.add(backWall);
    this.ovenWalls.push(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      wallMaterial
    );
    leftWall.position.set(-5, 0, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);
    this.ovenWalls.push(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      wallMaterial
    );
    rightWall.position.set(5, 0, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);
    this.ovenWalls.push(rightWall);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      wallMaterial
    );
    floor.position.set(0, -2.5, 0);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.ovenWalls.push(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      wallMaterial
    );
    ceiling.position.set(0, 2.5, 0);
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);
    this.ovenWalls.push(ceiling);

    const heatingElementGeometry = new THREE.CylinderGeometry(0.08, 0.08, 8, 16);
    const heatingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff6600,
      emissiveIntensity: 0
    });

    for (let i = 0; i < 3; i++) {
      const element = new THREE.Mesh(heatingElementGeometry, heatingMaterial.clone());
      element.position.set(-3 + i * 3, 2.3, -2);
      element.rotation.z = Math.PI / 2;
      this.scene.add(element);
      this.heatingElements.push(element);
    }
  }

  private createParticles(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particlePoints);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    this.glowLight = new THREE.PointLight(0xff6600, 0, 10);
    this.glowLight.position.set(0, 0, 0);
    this.scene.add(this.glowLight);

    const topLight = new THREE.PointLight(0xffaa44, 0.5, 10);
    topLight.position.set(0, 2, 0);
    this.scene.add(topLight);
  }

  public startBaking(onComplete: () => void): void {
    if (this.state !== BakingState.IDLE) return;

    this.onBakingComplete = onComplete;
    this.state = BakingState.PREHEATING;
    this.startTime = performance.now();
    this.elapsed = 0;
    this.clock.start();
    this.startAnimation();

    const ovenDoor = document.getElementById('oven-door');
    if (ovenDoor) {
      ovenDoor.classList.remove('open');
    }

    setTimeout(() => {
      this.state = BakingState.BAKING;
      if (ovenDoor) {
        ovenDoor.classList.add('open');
      }
    }, 1000);
  }

  private startAnimation(): void {
    const animate = () => {
      if (this.state === BakingState.FINISHED) return;

      const delta = this.clock.getDelta();
      this.elapsed = performance.now() - this.startTime;
      
      this.update(delta);
      this.renderer.render(this.scene, this.camera);

      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(delta: number): void {
    const progress = Math.min(1, this.elapsed / BAKING_DURATION);

    this.updateDessert(progress);
    this.updateHeatingElements(progress);
    this.updateParticles(delta, progress);
    this.updateCamera(progress);
    this.updateUI(progress);

    if (progress >= 1 && this.state === BakingState.BAKING) {
      this.finishBaking();
    }
  }

  private updateDessert(progress: number): void {
    if (!this.dessertMesh || !this.dessertMaterial || !this.properties) return;

    const easeProgress = this.easeInOutCubic(progress);

    const currentColor = this.initialColor.clone().lerp(this.targetColor, easeProgress);
    this.dessertMaterial.color.copy(currentColor);
    this.dessertMaterial.emissive.copy(currentColor);
    this.dessertMaterial.emissiveIntensity = 0.1 + easeProgress * (this.properties.glowIntensity / 100) * 0.8;

    const scale = this.initialScale + (this.targetScale - this.initialScale) * easeProgress;
    this.dessertMesh.scale.setScalar(scale);

    this.dessertMesh.rotation.y += 0.005;
    this.dessertMesh.position.y = Math.sin(this.elapsed * 0.001) * 0.1;

    if (progress > 0.3) {
      const positions = this.dessertMesh.geometry.attributes.position;
      const normalNoise = (progress - 0.3) / 0.7;
      const crackAmount = normalNoise * 0.15;
      
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        const noise = Math.sin(x * 5 + this.elapsed * 0.001) * 
                    Math.cos(y * 5 + this.elapsed * 0.0015) * 
                    Math.sin(z * 5) * crackAmount;
        
        const length = Math.sqrt(x * x + y * y + z * z);
        const newLength = 1 + noise * 0.5;
        
        positions.setXYZ(
          i,
          x / length * newLength,
          y / length * newLength,
          z / length * newLength
        );
      }
      this.dessertMesh.geometry.attributes.position.needsUpdate = true;
      this.dessertMesh.geometry.computeVertexNormals();
    }

    if (this.glowLight) {
      this.glowLight.intensity = easeProgress * 2;
      this.glowLight.color.copy(currentColor);
    }
  }

  private updateHeatingElements(progress: number): void {
    this.heatingElements.forEach((element, index) => {
      const material = element.material as THREE.MeshStandardMaterial;
      const intensity = Math.min(1, progress * 2) * (0.5 + Math.sin(this.elapsed * 0.01 + index) * 0.5;
      material.emissiveIntensity = intensity;
    });
  }

  private updateParticles(delta: number, progress: number): void {
    if (!this.particlePoints || !this.particleGeometry) return;

    if (progress > 0.1 && this.particles.length < MAX_PARTICLES) {
      const spawnCount = Math.floor(3 * progress);
      for (let i = 0; i < spawnCount && this.particles.length < MAX_PARTICLES; i++) {
        this.spawnParticle();
      }
    }

    const positions: number[] = [];
    const colors: number[] = [];

    this.particles = this.particles.filter((p => {
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.y += delta * 0.5;
      p.life -= delta / p.maxLife;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) return false;

      positions.push(p.position.x, p.position.y, p.position.z);
      colors.push(p.color.r * p.alpha, p.color.g * p.alpha, p.color.b * p.alpha);

      return true;
    });

    this.particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private spawnParticle(): void {
    const color = new THREE.Color();
    color.setHSL(0.05 + Math.random() * 0.1, 0.8, 0.6 + Math.random() * 0.4);

    this.particles.push({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        -2,
        (Math.random() - 0.5) * 2
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        1 + Math.random() * 1.5,
        (Math.random() - 0.5) * 0.5
      ),
      size: 0.05 + Math.random() * 0.1,
      color: color,
      alpha: 1,
      life: 1,
      maxLife: 2 + Math.random() * 2
    });
  }

  private updateCamera(progress: number): void {
    const baseAngle = progress * Math.PI * 0.3;
    const radius = 5;
    const height = 1 + Math.sin(progress * Math.PI) * 0.5;

    this.camera.position.x = Math.sin(baseAngle) * radius;
    this.camera.position.y = height;
    this.camera.position.z = Math.cos(baseAngle) * radius;
    this.camera.lookAt(0, 0, 0);
  }

  private updateUI(progress: number): void {
    const tempFill = document.getElementById('temperature-fill');
    const bakingStatus = document.getElementById('baking-status');

    if (tempFill) {
      tempFill.style.width = `${progress * 100}%`;
    }

    if (bakingStatus) {
      if (this.state === BakingState.PREHEATING) {
        bakingStatus.textContent = '预热中...';
      } else if (this.state === BakingState.BAKING) {
          const seconds = Math.ceil((BAKING_DURATION - this.elapsed) / 1000);
          bakingStatus.textContent = `烘焙中... ${seconds}s`;
        }
      }
    }

  private finishBaking(): void {
    this.state = BakingState.FINISHED;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const ovenDoor = document.getElementById('oven-door');
    if (ovenDoor) {
      ovenDoor.classList.add('open');
    }

    setTimeout(() => {
      this.onBakingComplete?.();
    }, 800);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getDessertMesh(): THREE.Mesh | null {
    return this.dessertMesh;
  }

  public getState(): BakingState {
    return this.state;
  }

  public reset(): void {
    this.state = BakingState.IDLE;
    this.particles = [];
    this.elapsed = 0;

    if (this.dessertMesh) {
      this.scene.remove(this.dessertMesh);
      this.dessertMesh.geometry.dispose();
      this.dessertMaterial?.dispose();
      this.dessertMesh = null;
      this.dessertMaterial = null;
    }

    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
      this.particleGeometry?.dispose();
      this.particleMaterial?.dispose();
      this.particlePoints = null;
    }

    this.heatingElements.forEach(el => {
      this.scene.remove(el);
      el.geometry.dispose();
      (el.material as THREE.Material).dispose();
    });
    this.heatingElements = [];

    this.ovenWalls.forEach(wall => {
      this.scene.remove(wall);
      wall.geometry.dispose();
      (wall.material as THREE.Material).dispose();
    });
    this.ovenWalls = [];

    if (this.glowLight) {
      this.scene.remove(this.glowLight);
      this.glowLight = null;
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Light) {
        this.scene.remove(obj);
      }
    });
  }
}
