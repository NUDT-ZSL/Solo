import * as THREE from 'three';
import { PlantEngine, PlantState, EnvironmentParams, GrowthStage } from './PlantEngine';

interface LeafData {
  mesh: THREE.Mesh;
  angle: number;
  heightRatio: number;
  size: number;
  falling: boolean;
  fallVelocity: THREE.Vector3;
  fallRotation: THREE.Vector3;
  originalPosition: THREE.Vector3;
}

interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  type: 'light' | 'nutrient';
}

interface TransitionState {
  active: boolean;
  duration: number;
  elapsed: number;
  startState: PlantState;
  endState: PlantState;
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private plantEngine: PlantEngine;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private clock: THREE.Clock;
  
  private stationGroup: THREE.Group;
  private plantGroup: THREE.Group;
  private stemMesh: THREE.Mesh | null = null;
  private leaves: LeafData[] = [];
  private flowers: THREE.Mesh[] = [];
  private particles: ParticleData[] = [];
  private particlePool: ParticleData[] = [];
  
  private ambientLight: THREE.AmbientLight;
  private mainLight: THREE.DirectionalLight;
  private pointLights: THREE.PointLight[] = [];
  
  private transition: TransitionState | null = null;
  
  private gravityMode: 'zero' | 'earth' = 'zero';
  private plantFloatOffset: number = 0;
  private plantFloatSpeed: number = 0.5;
  
  private lightParticleTimer: number = 0;
  private nutrientParticleTimer: number = 0;
  
  private lastPlantState: PlantState;
  private isPlayingGrowth: boolean = false;
  private growthPlayTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.plantEngine = new PlantEngine();
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 15, 30);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 2, 12);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    container.appendChild(this.renderer.domElement);
    
    this.stationGroup = new THREE.Group();
    this.scene.add(this.stationGroup);
    
    this.plantGroup = new THREE.Group();
    this.scene.add(this.plantGroup);
    
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this.scene.add(this.ambientLight);
    
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1);
    this.mainLight.position.set(5, 10, 5);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.scene.add(this.mainLight);
    
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(0x38bdf8, 0.5, 15);
      const angle = (i / 4) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 8, 3, Math.sin(angle) * 8);
      this.pointLights.push(light);
      this.scene.add(light);
    }
    
    this.lastPlantState = this.plantEngine.getState();
    
    this.createStation();
    this.createPlant();
    this.initParticlePool();
    
    window.addEventListener('resize', this.handleResize);
    
    this.start();
  }

  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  private createStation(): void {
    const radius = 10;
    const height = 10;
    
    const cylinderGeo = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.BackSide
    });
    const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    cylinder.receiveShadow = true;
    this.stationGroup.add(cylinder);
    
    const topGeo = new THREE.CircleGeometry(radius, 64);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.7,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = Math.PI / 2;
    top.position.y = height / 2;
    top.receiveShadow = true;
    this.stationGroup.add(top);
    
    const bottom = new THREE.Mesh(topGeo, topMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -height / 2;
    bottom.receiveShadow = true;
    this.stationGroup.add(bottom);
    
    const ringGeo = new THREE.TorusGeometry(radius - 0.1, 0.05, 8, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = height / 2 - 0.5;
    this.stationGroup.add(ring1);
    
    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -height / 2 + 0.5;
    this.stationGroup.add(ring2);
    
    for (let i = 0; i < 12; i++) {
      const panelGeo = new THREE.PlaneGeometry(1.5, 0.8);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.1,
        metalness: 0.5,
        roughness: 0.5
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      
      const angle = (i / 12) * Math.PI * 2;
      panel.position.set(
        Math.cos(angle) * (radius - 0.05),
        (i % 3 - 1) * 2.5,
        Math.sin(angle) * (radius - 0.05)
      );
      panel.lookAt(0, panel.position.y, 0);
      this.stationGroup.add(panel);
    }
    
    const starGeo = new THREE.BufferGeometry();
    const starCount = 200;
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 20;
      
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private createPlant(): void {
    const state = this.plantEngine.getState();
    
    const stemGeo = new THREE.CylinderGeometry(
      state.stemThickness * 0.6,
      state.stemThickness,
      state.height,
      12
    );
    const stemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(state.stemColor),
      metalness: 0.1,
      roughness: 0.7
    });
    this.stemMesh = new THREE.Mesh(stemGeo, stemMat);
    this.stemMesh.castShadow = true;
    this.plantGroup.add(this.stemMesh);
    
    this.updateLeaves(state);
    this.updateFlowers(state);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const result = new THREE.Color().lerpColors(c1, c2, t);
    return `#${result.getHexString()}`;
  }

  private lerpStage(startStage: GrowthStage, endStage: GrowthStage, t: number): GrowthStage {
    const stages: GrowthStage[] = ['germination', 'seedling', 'growing', 'mature', 'flowering'];
    const startIdx = stages.indexOf(startStage);
    const endIdx = stages.indexOf(endStage);
    const idx = Math.round(startIdx + (endIdx - startIdx) * t);
    return stages[Math.max(0, Math.min(stages.length - 1, idx))];
  }

  private interpolateState(startState: PlantState, endState: PlantState, t: number): PlantState {
    const easeOut = 1 - Math.pow(1 - t, 3);
    return {
      height: startState.height + (endState.height - startState.height) * easeOut,
      leafCount: Math.round(startState.leafCount + (endState.leafCount - startState.leafCount) * easeOut),
      stemColor: this.lerpColor(startState.stemColor, endState.stemColor, easeOut),
      leafColor: this.lerpColor(startState.leafColor, endState.leafColor, easeOut),
      stage: this.lerpStage(startState.stage, endState.stage, easeOut),
      isWilting: endState.isWilting,
      wiltProgress: startState.wiltProgress + (endState.wiltProgress - startState.wiltProgress) * easeOut,
      flowerCount: Math.round(startState.flowerCount + (endState.flowerCount - startState.flowerCount) * easeOut),
      stemThickness: startState.stemThickness + (endState.stemThickness - startState.stemThickness) * easeOut
    };
  }

  private updateLeaves(state: PlantState): void {
    const targetCount = state.leafCount;
    
    while (this.leaves.length > targetCount && this.leaves.length > 0) {
      const leaf = this.leaves.pop()!;
      if (!leaf.falling) {
        leaf.falling = true;
        leaf.fallVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          -1,
          (Math.random() - 0.5) * 2
        );
        leaf.fallRotation = new THREE.Vector3(
          Math.random() * 2,
          Math.random() * 3,
          Math.random() * 2
        );
        this.leaves.push(leaf);
      }
    }
    
    while (this.leaves.filter(l => !l.falling).length < targetCount) {
      this.createLeaf(state);
    }
    
    const nonFallingLeaves = this.leaves.filter(l => !l.falling);
    for (let i = 0; i < nonFallingLeaves.length; i++) {
      const leaf = nonFallingLeaves[i];
      const displayCount = Math.max(1, targetCount);
      const targetAngle = (i / displayCount) * Math.PI * 2;
      const targetHeightRatio = 0.3 + (i / displayCount) * 0.6;
      
      leaf.angle += (targetAngle - leaf.angle) * 0.1;
      leaf.heightRatio += (targetHeightRatio - leaf.heightRatio) * 0.1;
      
      const leafSize = 0.15 + (state.height / 4) * 0.2;
      leaf.size += (leafSize - leaf.size) * 0.1;
      
      const y = state.height * leaf.heightRatio - state.height / 2;
      const x = Math.cos(leaf.angle) * (state.stemThickness + leaf.size * 0.3);
      const z = Math.sin(leaf.angle) * (state.stemThickness + leaf.size * 0.3);
      
      leaf.mesh.position.set(x, y, z);
      leaf.mesh.scale.setScalar(leaf.size * 2);
      
      leaf.mesh.rotation.z = Math.PI / 4;
      leaf.mesh.rotation.y = leaf.angle;
      
      const leafMat = leaf.mesh.material as THREE.MeshStandardMaterial;
      leafMat.color.set(state.leafColor);
    }
  }

  private createLeaf(state: PlantState): void {
    const leafGeo = new THREE.SphereGeometry(1, 8, 8);
    leafGeo.scale(1, 0.3, 0.5);
    
    const leafMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(state.leafColor),
      metalness: 0.1,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.castShadow = true;
    
    const leafData: LeafData = {
      mesh: leafMesh,
      angle: Math.random() * Math.PI * 2,
      heightRatio: 0.5,
      size: 0.1,
      falling: false,
      fallVelocity: new THREE.Vector3(),
      fallRotation: new THREE.Vector3(),
      originalPosition: new THREE.Vector3()
    };
    
    this.plantGroup.add(leafMesh);
    this.leaves.push(leafData);
  }

  private updateFlowers(state: PlantState): void {
    const targetCount = state.flowerCount;
    
    while (this.flowers.length > targetCount) {
      const flower = this.flowers.pop()!;
      this.plantGroup.remove(flower);
    }
    
    while (this.flowers.length < targetCount) {
      this.createFlower(state);
    }
    
    for (let i = 0; i < this.flowers.length; i++) {
      const flower = this.flowers[i];
      const displayCount = Math.max(1, targetCount);
      const angle = (i / displayCount) * Math.PI * 2;
      const y = state.height / 2 - 0.2;
      const radius = state.stemThickness + 0.2;
      
      flower.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      flower.lookAt(Math.cos(angle) * 2, y + 0.3, Math.sin(angle) * 2);
    }
  }

  private createFlower(state: PlantState): void {
    const petalCount = 5;
    const flowerGroup = new THREE.Group();
    
    for (let i = 0; i < petalCount; i++) {
      const petalGeo = new THREE.SphereGeometry(0.1, 8, 8);
      petalGeo.scale(1, 0.2, 0.6);
      
      const petalMat = new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.5,
        side: THREE.DoubleSide
      });
      
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const angle = (i / petalCount) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.1, 0, Math.sin(angle) * 0.1);
      petal.rotation.y = angle;
      flowerGroup.add(petal);
    }
    
    const centerGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.4
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    flowerGroup.add(center);
    
    this.plantGroup.add(flowerGroup);
    this.flowers.push(flowerGroup as unknown as THREE.Mesh);
  }

  private initParticlePool(): void {
    for (let i = 0; i < 100; i++) {
      const geo = new THREE.SphereGeometry(0.05, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      
      this.particlePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        type: 'light'
      });
    }
  }

  private spawnLightParticle(): void {
    const particle = this.particlePool.find(p => !p.mesh.visible);
    if (!particle) return;
    
    const mat = particle.mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(0xfbbf24);
    mat.opacity = 0.8;
    
    particle.mesh.position.set(
      (Math.random() - 0.5) * 6,
      5,
      (Math.random() - 0.5) * 6
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 0.5,
      -1 - Math.random(),
      (Math.random() - 0.5) * 0.5
    );
    particle.life = 2 + Math.random() * 2;
    particle.maxLife = particle.life;
    particle.type = 'light';
    particle.mesh.visible = true;
    particle.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
    
    this.particles.push(particle);
  }

  private spawnNutrientParticle(): void {
    const particle = this.particlePool.find(p => !p.mesh.visible);
    if (!particle) return;
    
    const mat = particle.mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(0x22c55e);
    mat.opacity = 0.8;
    
    particle.mesh.position.set(
      (Math.random() - 0.5) * 0.5,
      -0.5,
      (Math.random() - 0.5) * 0.5
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 0.3,
      0.5 + Math.random() * 0.5,
      (Math.random() - 0.5) * 0.3
    );
    particle.life = 3 + Math.random() * 2;
    particle.maxLife = particle.life;
    particle.type = 'nutrient';
    particle.mesh.visible = true;
    particle.mesh.scale.setScalar(0.3 + Math.random() * 0.4);
    
    this.particles.push(particle);
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(delta)
      );
      
      if (particle.type === 'light') {
        particle.velocity.y -= delta * 0.2;
      } else {
        particle.velocity.y += delta * 0.1;
      }
      
      particle.life -= delta;
      
      const mat = particle.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (particle.life / particle.maxLife) * 0.8;
      
      if (particle.life <= 0) {
        particle.mesh.visible = false;
        this.particles.splice(i, 1);
      }
    }
  }

  private updateStem(state: PlantState): void {
    if (!this.stemMesh) return;
    
    const newGeo = new THREE.CylinderGeometry(
      state.stemThickness * 0.6,
      state.stemThickness,
      state.height,
      12
    );
    
    this.stemMesh.geometry.dispose();
    this.stemMesh.geometry = newGeo;
    
    const mat = this.stemMesh.material as THREE.MeshStandardMaterial;
    mat.color.set(state.stemColor);
  }

  private handleResize = (): void => {
    if (!this.container || this.container.clientWidth === 0 || this.container.clientHeight === 0) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private animate = (): void => {
    if (!this.isRunning) return;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.animationId = requestAnimationFrame(this.animate);
    
    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    let state: PlantState;
    
    if (this.transition && this.transition.active) {
      this.transition.elapsed += delta;
      const t = Math.min(1, this.transition.elapsed / this.transition.duration);
      state = this.interpolateState(this.transition.startState, this.transition.endState, t);
      
      if (t >= 1) {
        this.plantEngine.setState({
          height: this.transition.endState.height,
          leafCount: this.transition.endState.leafCount,
          stage: this.transition.endState.stage,
          stemColor: this.transition.endState.stemColor,
          leafColor: this.transition.endState.leafColor,
          flowerCount: this.transition.endState.flowerCount,
          stemThickness: this.transition.endState.stemThickness
        });
        this.transition = null;
      }
    } else {
      this.plantEngine.update(delta);
      state = this.plantEngine.getState();
    }
    
    if (this.isPlayingGrowth && !this.transition) {
      this.growthPlayTime += delta;
      const totalDuration = 60;
      const progress = Math.min(1, this.growthPlayTime / totalDuration);
      
      if (progress >= 1) {
        this.isPlayingGrowth = false;
      }
    }
    
    this.updateStem(state);
    this.updateLeaves(state);
    this.updateFlowers(state);
    this.updateFallingLeaves(delta);
    
    const envParams = this.plantEngine.getEnvironmentParams();
    this.lightParticleTimer += delta;
    if (envParams.lightIntensity > 600 && this.lightParticleTimer > 0.1) {
      this.spawnLightParticle();
      this.lightParticleTimer = 0;
    }
    
    this.nutrientParticleTimer += delta;
    if (envParams.nutrientConcentration > 0.6 && this.nutrientParticleTimer > 0.15) {
      this.spawnNutrientParticle();
      this.nutrientParticleTimer = 0;
    }
    
    this.updateParticles(delta);
    
    this.plantFloatOffset += delta * this.plantFloatSpeed;
    const floatY = Math.sin(this.plantFloatOffset) * 0.1;
    const floatX = Math.cos(this.plantFloatOffset * 0.7) * 0.05;
    
    if (this.gravityMode === 'earth') {
      this.plantGroup.position.y = -4;
    } else {
      this.plantGroup.position.y = floatY;
      this.plantGroup.position.x = floatX;
      this.plantGroup.rotation.z = Math.sin(this.plantFloatOffset * 0.5) * 0.05;
    }
    
    this.camera.position.x = Math.sin(this.plantFloatOffset * 0.2) * 0.5;
    this.camera.lookAt(0, 0, 0);
    
    this.lastPlantState = state;
    
    this.renderer.render(this.scene, this.camera);
  };

  private updateFallingLeaves(delta: number): void {
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      if (!leaf.falling) continue;
      
      leaf.mesh.position.add(
        leaf.fallVelocity.clone().multiplyScalar(delta)
      );
      
      if (this.gravityMode === 'earth') {
        leaf.fallVelocity.y -= delta * 2;
      } else {
        leaf.fallVelocity.y -= delta * 0.3;
      }
      
      leaf.mesh.rotation.x += leaf.fallRotation.x * delta;
      leaf.mesh.rotation.y += leaf.fallRotation.y * delta;
      leaf.mesh.rotation.z += leaf.fallRotation.z * delta;
      
      if (leaf.mesh.position.y < -6) {
        this.plantGroup.remove(leaf.mesh);
        leaf.mesh.geometry.dispose();
        (leaf.mesh.material as THREE.Material).dispose();
        this.leaves.splice(i, 1);
      }
    }
  }

  setEnvironmentParams(params: Partial<EnvironmentParams>): void {
    this.plantEngine.setEnvironmentParams(params);
    if (params.gravityMode) {
      this.gravityMode = params.gravityMode;
    }
    
    const lightIntensity = params.lightIntensity ?? this.plantEngine.getEnvironmentParams().lightIntensity;
    this.mainLight.intensity = 0.5 + (lightIntensity / 1000) * 1.5;
  }

  getEnvironmentParams(): EnvironmentParams {
    return this.plantEngine.getEnvironmentParams();
  }

  getPlantState(): PlantState {
    if (this.transition && this.transition.active) {
      const t = Math.min(1, this.transition.elapsed / this.transition.duration);
      return this.interpolateState(this.transition.startState, this.transition.endState, t);
    }
    return this.plantEngine.getState();
  }

  setPlantState(state: Partial<PlantState>, transitionDuration: number = 2): void {
    const currentState: PlantState = this.getPlantState();
    const endState: PlantState = { ...currentState, ...state };
    
    this.transition = {
      active: true,
      duration: transitionDuration,
      elapsed: 0,
      startState: { ...currentState },
      endState
    };
  }

  resetPlant(): void {
    this.transition = null;
    this.plantEngine.reset();
    
    this.leaves.forEach(leaf => {
      this.plantGroup.remove(leaf.mesh);
      leaf.mesh.geometry.dispose();
      (leaf.mesh.material as THREE.Material).dispose();
    });
    this.leaves = [];
    
    this.flowers.forEach(flower => {
      this.plantGroup.remove(flower);
    });
    this.flowers = [];
  }

  startGrowthPlayback(): void {
    this.resetPlant();
    this.isPlayingGrowth = true;
    this.growthPlayTime = 0;
  }

  stopGrowthPlayback(): void {
    this.isPlayingGrowth = false;
  }

  isGrowthPlaying(): boolean {
    return this.isPlayingGrowth;
  }

  getGrowthPlayProgress(): number {
    return Math.min(1, this.growthPlayTime / 60);
  }

  captureThumbnail(width: number = 64, height: number = 64): string {
    try {
      const canvas = this.renderer.domElement;
      const gl = (canvas as HTMLCanvasElement).getContext('webgl2') || 
                 (canvas as HTMLCanvasElement).getContext('webgl');
      
      if (!gl) {
        throw new Error('WebGL context not available');
      }
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas dimensions are zero');
      }
      
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      
      this.renderer.setSize(width, height, false);
      this.renderer.render(this.scene, this.camera);
      
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = width;
      snapshotCanvas.height = height;
      const snapshotCtx = snapshotCanvas.getContext('2d');
      if (!snapshotCtx) {
        this.renderer.setSize(prevWidth, prevHeight, false);
        throw new Error('2D context not available');
      }
      snapshotCtx.drawImage(canvas, 0, 0, width, height);
      
      this.renderer.setSize(prevWidth, prevHeight, false);
      
      const dataUrl = snapshotCanvas.toDataURL('image/jpeg', 0.7);
      return dataUrl;
    } catch (error) {
      console.error('Failed to capture thumbnail:', error);
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = width;
      fallbackCanvas.height = height;
      const ctx = fallbackCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SG', width / 2, height / 2 + 4);
      }
      return fallbackCanvas.toDataURL('image/png');
    }
  }

  dispose(): void {
    this.isRunning = false;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    window.removeEventListener('resize', this.handleResize);
    
    this.renderer.dispose();
    
    if (this.container.contains(this.renderer.renderer ? (this.renderer as any).renderer.domElement : this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
