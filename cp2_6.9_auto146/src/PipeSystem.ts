import * as THREE from 'three';

export interface PipeSegmentData {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  diameter: number;
  temperature: number;
  length: number;
  material: string;
  tempRange: [number, number];
}

export class PipeSystem {
  public group: THREE.Group;
  public pipeMeshes: THREE.InstancedMesh | null = null;
  public particles: THREE.Points | null = null;
  
  private scene: THREE.Scene;
  private pipeSegments: PipeSegmentData[] = [];
  private particleData: { position: THREE.Vector3; progress: number; pathIndex: number; speed: number }[] = [];
  private pipePaths: THREE.Vector3[][] = [];
  
  private MAX_PIPES = 200;
  private MAX_PARTICLES = 500;
  private PARTICLE_SIZE = 0.05;
  private PARTICLE_SPEED = 0.003;
  
  public flowEnabled = true;
  public temperatureColoring = false;
  public highlightedPipe: number | null = null;
  
  private dummy: THREE.Object3D;
  private pipeGeometry: THREE.CylinderGeometry;
  private sharedPipeMaterial: THREE.MeshStandardMaterial;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    
    this.dummy = new THREE.Object3D();
    this.pipeGeometry = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false);
    this.particlePositions = new Float32Array(this.MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(this.MAX_PARTICLES * 3);
    
    this.sharedPipeMaterial = new THREE.MeshStandardMaterial({
      metalness: 0.6,
      roughness: 0.3,
      vertexColors: true,
      emissiveIntensity: 0.2
    });
    
    this.createPipeSystem();
    this.createParticleSystem();
  }

  private createPipeSystem(): void {
    const furnacePos = new THREE.Vector3(-4.5, 0.5, -3.5);
    
    const baths = [
      { pos: new THREE.Vector3(-3, 0.4, 1.5), name: '冷水池', temp: 25 },
      { pos: new THREE.Vector3(0, 0.4, 1.5), name: '温水池', temp: 45 },
      { pos: new THREE.Vector3(3, 0.4, 1.5), name: '热水池', temp: 75 }
    ];

    const mainPipeEnd = new THREE.Vector3(-4.5, 0.3, -1);
    this.addPipeSegment(furnacePos, mainPipeEnd, 0.4, 90, '主管道');
    
    this.pipePaths.push([furnacePos.clone(), mainPipeEnd.clone()]);

    baths.forEach((bath, index) => {
      const branchStart = new THREE.Vector3(-4.5, 0.3, -1 + index * 1.5);
      
      if (index > 0) {
        const prevBranch = new THREE.Vector3(-4.5, 0.3, -1 + (index - 1) * 1.5);
        this.addPipeSegment(prevBranch, branchStart, 0.4, 80 - index * 10, '主管道分支');
      }
      
      const horizontalEnd = new THREE.Vector3(bath.pos.x, 0.3, branchStart.z);
      this.addPipeSegment(branchStart, horizontalEnd, 0.25, 70 - index * 15, '分支管道');
      
      const verticalEnd = new THREE.Vector3(bath.pos.x, bath.pos.y + 0.4, branchStart.z);
      this.addPipeSegment(horizontalEnd, verticalEnd, 0.25, bath.temp + 5, '垂直管道');
      
      const bathInlet = new THREE.Vector3(bath.pos.x, bath.pos.y + 0.4, bath.pos.z);
      this.addPipeSegment(verticalEnd, bathInlet, 0.25, bath.temp, '浴池入口');
      
      this.addElbow(horizontalEnd, 'floor-wall');
      this.addElbow(verticalEnd, 'wall-bath');
      
      this.pipePaths.push([
        furnacePos.clone(),
        mainPipeEnd.clone(),
        branchStart.clone(),
        horizontalEnd.clone(),
        verticalEnd.clone(),
        bathInlet.clone()
      ]);
    });

    this.buildInstancedMesh();
  }

  private addPipeSegment(start: THREE.Vector3, end: THREE.Vector3, diameter: number, temperature: number, material: string): void {
    const length = start.distanceTo(end);
    this.pipeSegments.push({
      id: this.pipeSegments.length,
      start: start.clone(),
      end: end.clone(),
      diameter,
      temperature,
      length,
      material,
      tempRange: [temperature - 5, temperature + 5]
    });
  }

  private addElbow(position: THREE.Vector3, type: string): void {
    const torusGeo = new THREE.TorusGeometry(0.18, 0.07, 8, 12, Math.PI / 2);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.6,
      roughness: 0.3
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.position.copy(position);
    
    if (type === 'floor-wall') {
      torus.rotation.x = Math.PI / 2;
      torus.rotation.z = 0;
    } else {
      torus.rotation.x = 0;
      torus.rotation.y = Math.PI / 2;
      torus.rotation.z = Math.PI / 2;
    }
    
    torus.userData = { type: 'elbow', temperature: 60 };
    this.group.add(torus);
  }

  private buildInstancedMesh(): void {
    if (this.pipeMeshes) {
      this.group.remove(this.pipeMeshes);
      this.pipeMeshes.dispose();
    }

    this.pipeMeshes = new THREE.InstancedMesh(
      this.pipeGeometry,
      this.sharedPipeMaterial,
      this.MAX_PIPES
    );
    this.pipeMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    const instanceColors = new Float32Array(this.MAX_PIPES * 3);
    this.pipeMeshes.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
    this.pipeMeshes.instanceColor.setUsage(THREE.DynamicDrawUsage);

    this.pipeSegments.forEach((segment, index) => {
      this.updatePipeInstance(index, segment);
    });

    this.pipeMeshes.count = this.pipeSegments.length;
    this.pipeMeshes.userData = { pipeSegments: this.pipeSegments };
    this.group.add(this.pipeMeshes);
  }

  private updatePipeInstance(index: number, segment: PipeSegmentData): void {
    if (!this.pipeMeshes || !this.pipeMeshes.instanceColor) return;

    const mid = segment.start.clone().add(segment.end).multiplyScalar(0.5);
    const direction = segment.end.clone().sub(segment.start).normalize();
    const length = segment.length;
    const radius = segment.diameter / 2;

    this.dummy.position.copy(mid);
    this.dummy.scale.set(radius, length, radius);
    
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction);
    this.dummy.quaternion.copy(quaternion);
    
    this.dummy.updateMatrix();
    this.pipeMeshes.setMatrixAt(index, this.dummy.matrix);
    
    let color = this.getTemperatureColor(segment.temperature);
    
    if (this.highlightedPipe === index) {
      color = new THREE.Color(0xFFD700);
      this.sharedPipeMaterial.emissive = new THREE.Color(0xFFD700);
      this.sharedPipeMaterial.emissiveIntensity = 0.5;
    }
    
    const colorIdx = index * 3;
    this.pipeMeshes.instanceColor.setXYZ(index, color.r, color.g, color.b);
  }

  private getTemperatureColor(temperature: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (temperature - 20) / 70));
    
    if (this.temperatureColoring) {
      const r = t;
      const g = 0;
      const b = 1 - t;
      return new THREE.Color(r, g, b);
    } else {
      const highColor = new THREE.Color(0xFF4500);
      const lowColor = new THREE.Color(0xFFA07A);
      return highColor.clone().lerp(lowColor, 1 - t);
    }
  }

  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: this.PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = this.flowEnabled;
    this.group.add(this.particles);

    this.initParticles();
  }

  private initParticles(): void {
    this.particleData = [];
    
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const pathIndex = i % this.pipePaths.length;
      const path = this.pipePaths[pathIndex];
      
      this.particleData.push({
        position: path[0].clone(),
        progress: Math.random(),
        pathIndex,
        speed: this.PARTICLE_SPEED * (0.7 + Math.random() * 0.6)
      });
    }
    
    this.updateParticleBuffers();
  }

  private updateParticleBuffers(): void {
    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;

    this.particleData.forEach((particle, i) => {
      const idx = i * 3;
      positions[idx] = particle.position.x;
      positions[idx + 1] = particle.position.y;
      positions[idx + 2] = particle.position.z;

      const tempAtPoint = this.getTemperatureAtProgress(particle.progress);
      const color = this.getParticleColor(tempAtPoint);
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    });

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  private getTemperatureAtProgress(progress: number): number {
    return 90 - progress * 65;
  }

  private getParticleColor(temperature: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (temperature - 25) / 65));
    const highColor = new THREE.Color(0xFF4500);
    const lowColor = new THREE.Color(0xFFA07A);
    return highColor.clone().lerp(lowColor, 1 - t);
  }

  private getPositionOnPath(path: THREE.Vector3[], progress: number): THREE.Vector3 {
    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const len = path[i].distanceTo(path[i + 1]);
      segmentLengths.push(len);
      totalLength += len;
    }
    
    const targetDistance = progress * totalLength;
    let accumulated = 0;
    
    for (let i = 0; i < segmentLengths.length; i++) {
      if (accumulated + segmentLengths[i] >= targetDistance) {
        const segmentProgress = segmentLengths[i] > 0 
          ? (targetDistance - accumulated) / segmentLengths[i] 
          : 0;
        return path[i].clone().lerp(path[i + 1], segmentProgress);
      }
      accumulated += segmentLengths[i];
    }
    
    return path[path.length - 1].clone();
  }

  public update(): void {
    if (this.flowEnabled && this.particles) {
      this.particleData.forEach((particle) => {
        particle.progress += particle.speed;
        if (particle.progress > 1) {
          particle.progress = 0;
        }
        particle.position.copy(this.getPositionOnPath(
          this.pipePaths[particle.pathIndex],
          particle.progress
        ));
      });
      this.updateParticleBuffers();
    }

    if (this.highlightedPipe === null) {
      this.sharedPipeMaterial.emissive = new THREE.Color(0x000000);
      this.sharedPipeMaterial.emissiveIntensity = 0.2;
    }

    this.pipeSegments.forEach((segment, index) => {
      this.updatePipeInstance(index, segment);
    });
    
    if (this.pipeMeshes) {
      this.pipeMeshes.instanceMatrix.needsUpdate = true;
      if (this.pipeMeshes.instanceColor) {
        this.pipeMeshes.instanceColor.needsUpdate = true;
      }
    }
  }

  public getPipeSegments(): PipeSegmentData[] {
    return this.pipeSegments;
  }

  public getTemperatureAtPoint(point: THREE.Vector3): number {
    const furnacePos = new THREE.Vector3(-4.5, 0.5, -3.5);
    const dist = point.distanceTo(furnacePos);
    const baseTemp = 90 * Math.pow(0.82, dist);
    return Math.max(20, Math.min(90, baseTemp));
  }

  public toggleFlow(): boolean {
    this.flowEnabled = !this.flowEnabled;
    if (this.particles) {
      this.particles.visible = this.flowEnabled;
    }
    return this.flowEnabled;
  }

  public toggleTemperatureColoring(): boolean {
    this.temperatureColoring = !this.temperatureColoring;
    return this.temperatureColoring;
  }

  public setHighlightedPipe(index: number | null): void {
    this.highlightedPipe = index;
  }

  public getPipeData(index: number): PipeSegmentData | null {
    return this.pipeSegments[index] || null;
  }

  public dispose(): void {
    if (this.pipeMeshes) {
      this.pipeMeshes.dispose();
    }
    this.pipeGeometry.dispose();
    this.sharedPipeMaterial.dispose();
    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
  }
}
