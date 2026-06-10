import * as THREE from 'three';

export interface ReefParams {
  temperature: number;
  salinity: number;
  light: number;
}

function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface CoralNode {
  position: THREE.Vector3;
  baseColor: THREE.Color;
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmplitude: number;
  size: number;
  connections: number[];
  growthFactor: number;
  targetGrowthFactor: number;
}

interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

interface Ripple {
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class Reef {
  private container: THREE.Object3D;
  private nodes: CoralNode[] = [];
  private nodeCount: number;
  
  private coralPoints: THREE.Points | null = null;
  private connectionLines: THREE.LineSegments | null = null;
  private reefMesh: THREE.Mesh | null = null;
  
  private burstParticles: BurstParticle[] = [];
  private burstPoints: THREE.Points | null = null;
  private maxBurstParticles = 1000;
  
  private ripples: Ripple[] = [];
  private rippleMeshes: THREE.Mesh[] = [];
  
  private params: ReefParams;
  private baseHue = 0.55;
  
  private bounds: THREE.Box3;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private clickRadius = 12;
  private glowTexture: THREE.Texture;

  constructor(container: THREE.Object3D, params: ReefParams, bounds: THREE.Box3) {
    this.container = container;
    this.params = { ...params };
    this.bounds = bounds;
    this.nodeCount = this.calculateNodeCount();
    this.glowTexture = createGlowTexture();
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.createReefBase();
    this.createCoralNodes();
    this.createConnections();
    this.createBurstParticles();
    
    this.updateColors();
  }

  private calculateNodeCount(): number {
    const salinityFactor = (this.params.salinity - 28) / (35 - 28);
    return Math.floor(80 + salinityFactor * 70);
  }

  private createReefBase(): void {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const noise = 0.3 + Math.random() * 0.4;
      positions[i] *= noise;
      positions[i + 1] *= noise * 0.7;
      positions[i + 2] *= noise;
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a3a2a,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    this.reefMesh = new THREE.Mesh(geometry, material);
    
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    const size = new THREE.Vector3();
    this.bounds.getSize(size);
    
    const scale = Math.min(size.x, size.y, size.z) * 0.4;
    this.reefMesh.scale.setScalar(scale);
    this.reefMesh.position.copy(center);
    this.reefMesh.position.y -= size.y * 0.05;
    
    this.container.add(this.reefMesh);
  }

  private createCoralNodes(): void {
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    const size = new THREE.Vector3();
    this.bounds.getSize(size);
    
    for (let i = 0; i < this.nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 0.3 + Math.random() * 0.7;
      
      const x = center.x + radius * size.x * 0.35 * Math.sin(phi) * Math.cos(theta);
      const y = center.y + radius * size.y * 0.35 * Math.sin(phi) * Math.sin(theta) * 0.7;
      const z = center.z + radius * size.z * 0.35 * Math.cos(phi);
      
      const node: CoralNode = {
        position: new THREE.Vector3(x, y, z),
        baseColor: new THREE.Color().setHSL(this.baseHue, 0.8, 0.6),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1,
        pulseAmplitude: 0.3 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        connections: [],
        growthFactor: 0.7 + Math.random() * 0.3,
        targetGrowthFactor: 1
      };
      
      this.nodes.push(node);
    }
    
    const positions = new Float32Array(this.nodeCount * 3);
    const colors = new Float32Array(this.nodeCount * 3);
    const sizes = new Float32Array(this.nodeCount);
    
    for (let i = 0; i < this.nodeCount; i++) {
      const node = this.nodes[i];
      const i3 = i * 3;
      
      positions[i3] = node.position.x;
      positions[i3 + 1] = node.position.y;
      positions[i3 + 2] = node.position.z;
      
      colors[i3] = node.baseColor.r;
      colors[i3 + 1] = node.baseColor.g;
      colors[i3 + 2] = node.baseColor.b;
      
      sizes[i] = node.size;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 1.5,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.coralPoints = new THREE.Points(geometry, material);
    this.container.add(this.coralPoints);
  }

  private createConnections(): void {
    const connectionDistance = 6;
    const maxConnectionsPerNode = 5;
    
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    
    for (let i = 0; i < this.nodes.length; i++) {
      const nodeA = this.nodes[i];
      const distances: { index: number; dist: number }[] = [];
      
      for (let j = 0; j < this.nodes.length; j++) {
        if (i === j) continue;
        const dist = nodeA.position.distanceTo(this.nodes[j].position);
        if (dist < connectionDistance) {
          distances.push({ index: j, dist });
        }
      }
      
      distances.sort((a, b) => a.dist - b.dist);
      
      const connectionCount = Math.min(maxConnectionsPerNode, distances.length);
      for (let k = 0; k < connectionCount; k++) {
        const j = distances[k].index;
        if (nodeA.connections.includes(j)) continue;
        
        nodeA.connections.push(j);
        this.nodes[j].connections.push(i);
        
        const nodeB = this.nodes[j];
        
        linePositions.push(
          nodeA.position.x, nodeA.position.y, nodeA.position.z,
          nodeB.position.x, nodeB.position.y, nodeB.position.z
        );
        
        const color = new THREE.Color().setHSL(this.baseHue, 0.6, 0.5);
        lineColors.push(
          color.r, color.g, color.b,
          color.r, color.g, color.b
        );
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.connectionLines = new THREE.LineSegments(geometry, material);
    this.container.add(this.connectionLines);
  }

  private createBurstParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxBurstParticles * 3);
    const colors = new Float32Array(this.maxBurstParticles * 3);
    const sizes = new Float32Array(this.maxBurstParticles);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.burstPoints = new THREE.Points(geometry, material);
    this.container.add(this.burstPoints);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    if (!this.coralPoints) return;
    
    const positions = this.coralPoints.geometry.attributes.position.array as Float32Array;
    const colors = this.coralPoints.geometry.attributes.color.array as Float32Array;
    
    const lightFactor = this.params.light;
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const i3 = i * 3;
      
      node.growthFactor += (node.targetGrowthFactor - node.growthFactor) * 0.02;
      
      const pulse = Math.sin(elapsedTime * node.pulseSpeed + node.pulsePhase);
      const intensity = 0.7 + pulse * node.pulseAmplitude * lightFactor;
      
      const color = node.baseColor.clone();
      color.multiplyScalar(intensity * lightFactor);
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      positions[i3] = node.position.x * node.growthFactor;
      positions[i3 + 1] = node.position.y * node.growthFactor;
      positions[i3 + 2] = node.position.z * node.growthFactor;
    }
    
    this.coralPoints.geometry.attributes.position.needsUpdate = true;
    this.coralPoints.geometry.attributes.color.needsUpdate = true;
    
    this.updateBurstParticles(deltaTime);
    this.updateRipples(deltaTime);
  }

  private updateBurstParticles(deltaTime: number): void {
    if (!this.burstPoints) return;
    
    const positions = this.burstPoints.geometry.attributes.position.array as Float32Array;
    const colors = this.burstPoints.geometry.attributes.color.array as Float32Array;
    const sizes = this.burstPoints.geometry.attributes.size.array as Float32Array;
    
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const particle = this.burstParticles[i];
      
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.burstParticles.splice(i, 1);
        continue;
      }
      
      particle.velocity.multiplyScalar(0.98);
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
      
      const i3 = i * 3;
      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;
      
      const alpha = particle.life / particle.maxLife;
      colors[i3] = particle.color.r * alpha;
      colors[i3 + 1] = particle.color.g * alpha;
      colors[i3 + 2] = particle.color.b * alpha;
      
      sizes[i] = particle.size * alpha;
    }
    
    for (let i = this.burstParticles.length * 3; i < this.maxBurstParticles * 3; i += 3) {
      colors[i] = 0;
      colors[i + 1] = 0;
      colors[i + 2] = 0;
      sizes[i / 3] = 0;
    }
    
    this.burstPoints.geometry.attributes.position.needsUpdate = true;
    this.burstPoints.geometry.attributes.color.needsUpdate = true;
    this.burstPoints.geometry.attributes.size.needsUpdate = true;
  }

  private updateRipples(deltaTime: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      
      ripple.life -= deltaTime;
      ripple.radius += (ripple.maxRadius / ripple.maxLife) * deltaTime;
      
      if (ripple.life <= 0) {
        if (this.rippleMeshes[i]) {
          this.container.remove(this.rippleMeshes[i]);
          this.rippleMeshes[i].geometry.dispose();
          (this.rippleMeshes[i].material as THREE.Material).dispose();
        }
        this.ripples.splice(i, 1);
        this.rippleMeshes.splice(i, 1);
        continue;
      }
      
      const mesh = this.rippleMeshes[i];
      if (mesh) {
        const alpha = (ripple.life / ripple.maxLife) * 0.6;
        (mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        mesh.scale.setScalar(ripple.radius / 2);
      }
    }
  }

  public handleClick(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ): void {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, camera);
    this.raycaster.params.Points = { threshold: 4 };
    
    if (!this.coralPoints) return;
    
    const intersects = this.raycaster.intersectObject(this.coralPoints, true);
    
    if (intersects.length > 0) {
      const worldPoint = intersects[0].point;
      const localPoint = this.container.worldToLocal(worldPoint.clone());
      this.triggerBurstAtPoint(localPoint);
      this.createRippleAtPoint(localPoint);
    }
  }

  private triggerBurstAtPoint(point: THREE.Vector3): void {
    const nearbyNodes: number[] = [];
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const dist = node.position.distanceTo(point);
      if (dist < this.clickRadius) {
        nearbyNodes.push(i);
      }
    }
    
    if (nearbyNodes.length === 0) return;
    
    const particleCount = 40 + Math.floor(Math.random() * 31);
    
    for (let i = 0; i < particleCount; i++) {
      if (this.burstParticles.length >= this.maxBurstParticles) break;
      
      const nodeIndex = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
      const node = this.nodes[nodeIndex];
      
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI - Math.PI / 2;
      const speed = 0.2 + Math.random() * 0.25;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle1) * Math.cos(angle2) * speed,
        Math.sin(angle2) * speed,
        Math.sin(angle1) * Math.cos(angle2) * speed
      );
      
      const baseColor = node.baseColor.clone();
      const burstColor = new THREE.Color(
        1 - baseColor.r,
        1 - baseColor.g,
        1 - baseColor.b
      );
      
      this.burstParticles.push({
        position: node.position.clone(),
        velocity,
        color: burstColor,
        life: 1.5,
        maxLife: 1.5,
        size: 3 + Math.random() * 3
      });
    }
  }

  private createRippleAtPoint(point: THREE.Vector3): void {
    const rippleColor = new THREE.Color().setHSL(this.baseHue, 0.6, 0.8);
    
    const geometry = new THREE.RingGeometry(1.5, 2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: rippleColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(point);
    mesh.lookAt(point.clone().add(new THREE.Vector3(0, 1, 0)));
    mesh.rotateX(Math.PI / 2);
    
    this.container.add(mesh);
    this.rippleMeshes.push(mesh);
    
    this.ripples.push({
      position: point.clone(),
      radius: 2,
      maxRadius: 12,
      life: 1.5,
      maxLife: 1.5,
      color: rippleColor
    });
  }

  public updateParams(params: ReefParams): void {
    const oldSalinity = this.params.salinity;
    this.params = { ...params };
    
    this.updateColors();
    
    if (Math.abs(params.salinity - oldSalinity) > 0.5) {
      const newCount = this.calculateNodeCount();
      if (newCount !== this.nodeCount) {
        this.rebuildNodes(newCount);
      }
    }
    
    const growthFactor = 0.6 + (params.salinity - 28) / (35 - 28) * 0.6;
    for (const node of this.nodes) {
      node.targetGrowthFactor = growthFactor * (0.8 + Math.random() * 0.4);
    }
    
    if (this.reefMesh) {
      const reefMaterial = this.reefMesh.material as THREE.MeshPhongMaterial;
      reefMaterial.opacity = 0.4 + params.light * 0.3;
    }
    
    if (this.connectionLines) {
      const lineMaterial = this.connectionLines.material as THREE.LineBasicMaterial;
      lineMaterial.opacity = 0.15 + params.light * 0.2;
    }
  }

  private updateColors(): void {
    const tempFactor = (this.params.temperature - 10) / (35 - 10);
    
    const coldHue = 0.6;
    const warmHue = 0.03;
    
    this.baseHue = coldHue + (warmHue - coldHue) * tempFactor;
    
    const saturation = 0.7 + tempFactor * 0.2;
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const hueVariation = (Math.random() - 0.5) * 0.05;
      node.baseColor.setHSL(
        this.baseHue + hueVariation,
        saturation,
        0.55 + Math.random() * 0.15
      );
    }
  }

  private rebuildNodes(newCount: number): void {
    if (!this.coralPoints || !this.connectionLines) return;
    
    this.container.remove(this.coralPoints);
    this.container.remove(this.connectionLines);
    this.coralPoints.geometry.dispose();
    (this.coralPoints.material as THREE.Material).dispose();
    this.connectionLines.geometry.dispose();
    (this.connectionLines.material as THREE.Material).dispose();
    
    this.nodes = [];
    this.nodeCount = newCount;
    
    this.createCoralNodes();
    this.createConnections();
    this.updateColors();
  }

  public getNodeCount(): number {
    return this.nodeCount;
  }

  public getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }

  public dispose(): void {
    if (this.coralPoints) {
      this.container.remove(this.coralPoints);
      this.coralPoints.geometry.dispose();
      (this.coralPoints.material as THREE.Material).dispose();
    }
    
    if (this.connectionLines) {
      this.container.remove(this.connectionLines);
      this.connectionLines.geometry.dispose();
      (this.connectionLines.material as THREE.Material).dispose();
    }
    
    if (this.reefMesh) {
      this.container.remove(this.reefMesh);
      this.reefMesh.geometry.dispose();
      (this.reefMesh.material as THREE.Material).dispose();
    }
    
    if (this.burstPoints) {
      this.container.remove(this.burstPoints);
      this.burstPoints.geometry.dispose();
      (this.burstPoints.material as THREE.Material).dispose();
    }
    
    for (const mesh of this.rippleMeshes) {
      this.container.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    
    this.glowTexture.dispose();
  }
}
