import * as THREE from 'three';

export interface ParticleParams {
  count: number;
  speed: number;
  bounds: THREE.Box3;
}

function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface ParticleData {
  velocity: THREE.Vector3;
  phase: number;
  speed: number;
  wanderAngle: number;
  wanderSpeed: number;
}

export class ParticleFlow {
  private container: THREE.Object3D;
  private particles: THREE.Points;
  private particleData: ParticleData[] = [];
  private bounds: THREE.Box3;
  private speed: number;
  private count: number;
  private glowTexture: THREE.Texture;
  
  private flowDirection: THREE.Vector3 = new THREE.Vector3(0.5, 0.2, 0.3);
  private targetFlowDirection: THREE.Vector3 = new THREE.Vector3(0.5, 0.2, 0.3);
  private flowSmoothness = 0.02;
  
  private dragInfluence: THREE.Vector3 = new THREE.Vector3();
  private dragDecay = 0.95;

  constructor(container: THREE.Object3D, params: ParticleParams) {
    this.container = container;
    this.bounds = params.bounds;
    this.speed = params.speed;
    this.count = params.count;
    this.glowTexture = createGlowTexture();
    
    this.particles = this.createParticles();
    this.container.add(this.particles);
  }

  private createParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    const size = new THREE.Vector3();
    this.bounds.getSize(size);
    
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      
      positions[i3] = center.x + (Math.random() - 0.5) * size.x;
      positions[i3 + 1] = center.y + (Math.random() - 0.5) * size.y;
      positions[i3 + 2] = center.z + (Math.random() - 0.5) * size.z;
      
      const hue = 0.55 + Math.random() * 0.15;
      const color = new THREE.Color().setHSL(hue, 0.6, 0.7);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = 1 + Math.random() * 1;
      
      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderSpeed: 0.5 + Math.random() * 1
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.8,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    return new THREE.Points(geometry, material);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    
    this.flowDirection.lerp(this.targetFlowDirection, this.flowSmoothness);
    this.dragInfluence.multiplyScalar(this.dragDecay);
    
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    const halfSize = new THREE.Vector3();
    this.bounds.getSize(halfSize).multiplyScalar(0.5);
    
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];
      
      data.wanderAngle += (Math.random() - 0.5) * data.wanderSpeed * deltaTime;
      
      const wanderForce = new THREE.Vector3(
        Math.cos(data.wanderAngle) * 0.3,
        Math.sin(data.wanderAngle * 1.3) * 0.2,
        Math.sin(data.wanderAngle * 0.7) * 0.3
      );
      
      const sineOffset = Math.sin(elapsedTime * 0.5 + data.phase) * 0.1;
      const sineForce = new THREE.Vector3(
        Math.sin(elapsedTime * 0.3 + data.phase) * 0.1,
        sineOffset,
        Math.cos(elapsedTime * 0.2 + data.phase * 1.5) * 0.1
      );
      
      const totalForce = new THREE.Vector3();
      totalForce.add(this.flowDirection.clone().multiplyScalar(0.5));
      totalForce.add(wanderForce);
      totalForce.add(sineForce);
      totalForce.add(this.dragInfluence.clone().multiplyScalar(2));
      
      data.velocity.lerp(totalForce, 0.02);
      data.velocity.clampLength(0, this.speed * data.speed);
      
      positions[i3] += data.velocity.x * deltaTime;
      positions[i3 + 1] += data.velocity.y * deltaTime;
      positions[i3 + 2] += data.velocity.z * deltaTime;
      
      const px = positions[i3] - center.x;
      const py = positions[i3 + 1] - center.y;
      const pz = positions[i3 + 2] - center.z;
      
      const margin = 2;
      if (px > halfSize.x - margin) data.velocity.x -= 0.05;
      if (px < -halfSize.x + margin) data.velocity.x += 0.05;
      if (py > halfSize.y - margin) data.velocity.y -= 0.05;
      if (py < -halfSize.y + margin) data.velocity.y += 0.05;
      if (pz > halfSize.z - margin) data.velocity.z -= 0.05;
      if (pz < -halfSize.z + margin) data.velocity.z += 0.05;
      
      if (Math.abs(px) > halfSize.x) positions[i3] = center.x - Math.sign(px) * (halfSize.x - 1);
      if (Math.abs(py) > halfSize.y) positions[i3 + 1] = center.y - Math.sign(py) * (halfSize.y - 1);
      if (Math.abs(pz) > halfSize.z) positions[i3 + 2] = center.z - Math.sign(pz) * (halfSize.z - 1);
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  public applyDragForce(direction: THREE.Vector3): void {
    this.dragInfluence.copy(direction).multiplyScalar(0.8);
    this.targetFlowDirection.lerp(direction.clone().normalize(), 0.15);
  }

  public setFlowDirection(direction: THREE.Vector3): void {
    this.targetFlowDirection.copy(direction).normalize();
  }

  public updateCount(newCount: number): void {
    if (newCount === this.count) return;
    
    this.container.remove(this.particles);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    
    this.count = newCount;
    this.particleData = [];
    this.particles = this.createParticles();
    this.container.add(this.particles);
  }

  public setOpacity(opacity: number): void {
    (this.particles.material as THREE.PointsMaterial).opacity = opacity;
  }

  public getCount(): number {
    return this.count;
  }

  public getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }

  public dispose(): void {
    this.container.remove(this.particles);
    this.particles.geometry.dispose();
    const material = this.particles.material as THREE.PointsMaterial;
    if (material.map) material.map.dispose();
    material.dispose();
  }
}
