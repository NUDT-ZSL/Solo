import * as THREE from 'three';
import { FossilFragmentData, STRATUM_PERIODS } from './FossilAssembler';

export interface VoxelData {
  position: THREE.Vector3;
  removed: boolean;
  isFossil: boolean;
  fragmentId: number | null;
}

export interface MiningProgress {
  totalVoxels: number;
  removedVoxels: number;
  percentage: number;
  exposedFragmentIds: number[];
}

export interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
  isSettling: boolean;
  settleStart: number;
}

export class MiningSystem {
  private scene: THREE.Scene;
  private voxelSize: number = 0.1;
  private gridSize: number = 20;
  private voxelData: VoxelData[][][] = [];
  private voxelMeshes: Map<string, THREE.Mesh> = new Map();
  private voxelsGroup: THREE.Group = new THREE.Group();
  private particles: ParticleData[] = [];
  private fossilPositions: Map<number, Set<string>> = new Map();
  private onProgressChange?: (progress: MiningProgress) => void;
  private onFragmentExposed?: (fragmentId: number) => void;
  private totalVoxels: number = 0;
  private removedVoxels: number = 0;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private exposedFragments: Set<number> = new Set();
  private fossilFragmentData: FossilFragmentData[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster.params.Points = { threshold: 0.1 };
  }

  public init(fragmentData: FossilFragmentData[]): void {
    this.fossilFragmentData = fragmentData;
    this.initializeVoxelGrid();
    this.placeFossilFragments(fragmentData);
    this.buildVoxelMeshes();
    this.voxelsGroup.name = 'voxelsGroup';
    this.scene.add(this.voxelsGroup);
    this.totalVoxels = this.countTotalVoxels();
    this.notifyProgress();
  }

  public setCallbacks(
    onProgressChange: (progress: MiningProgress) => void,
    onFragmentExposed: (fragmentId: number) => void
  ): void {
    this.onProgressChange = onProgressChange;
    this.onFragmentExposed = onFragmentExposed;
  }

  private initializeVoxelGrid(): void {
    for (let x = 0; x < this.gridSize; x++) {
      this.voxelData[x] = [];
      for (let y = 0; y < this.gridSize; y++) {
        this.voxelData[x][y] = [];
        for (let z = 0; z < this.gridSize; z++) {
          const centerOffset = this.gridSize / 2;
          const distFromCenter = Math.sqrt(
            Math.pow(x - centerOffset, 2) +
            Math.pow(y - centerOffset, 2) +
            Math.pow(z - centerOffset, 2)
          );
          
          const isOuterLayer = distFromCenter > centerOffset - 2;
          const shouldExist = distFromCenter <= centerOffset - 0.5;
          
          this.voxelData[x][y][z] = {
            position: new THREE.Vector3(
              (x - centerOffset) * this.voxelSize,
              (y - centerOffset) * this.voxelSize,
              (z - centerOffset) * this.voxelSize
            ),
            removed: !shouldExist,
            isFossil: false,
            fragmentId: null
          };
        }
      }
    }
  }

  private placeFossilFragments(fragmentData: FossilFragmentData[]): void {
    for (const fragment of fragmentData) {
      this.fossilPositions.set(fragment.id, new Set());
      
      for (const vertex of fragment.vertices) {
        const worldPos = vertex.clone()
          .multiplyScalar(0.8)
          .add(fragment.offset);
          
        const gridPos = this.worldToGrid(worldPos);
        
        if (this.isValidGridPosition(gridPos.x, gridPos.y, gridPos.z)) {
          const key = `${gridPos.x},${gridPos.y},${gridPos.z}`;
          this.voxelData[gridPos.x][gridPos.y][gridPos.z].isFossil = true;
          this.voxelData[gridPos.x][gridPos.y][gridPos.z].fragmentId = fragment.id;
          this.fossilPositions.get(fragment.id)!.add(key);
          
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dz = -1; dz <= 1; dz++) {
                const nx = gridPos.x + dx;
                const ny = gridPos.y + dy;
                const nz = gridPos.z + dz;
                if (this.isValidGridPosition(nx, ny, nz)) {
                  const nKey = `${nx},${ny},${nz}`;
                  if (!this.voxelData[nx][ny][nz].isFossil) {
                    this.fossilPositions.get(fragment.id)!.add(nKey);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private worldToGrid(worldPos: THREE.Vector3): { x: number; y: number; z: number } {
    const centerOffset = this.gridSize / 2;
    return {
      x: Math.round(worldPos.x / this.voxelSize + centerOffset),
      y: Math.round(worldPos.y / this.voxelSize + centerOffset),
      z: Math.round(worldPos.z / this.voxelSize + centerOffset)
    };
  }

  private gridToWorld(gx: number, gy: number, gz: number): THREE.Vector3 {
    const centerOffset = this.gridSize / 2;
    return new THREE.Vector3(
      (gx - centerOffset) * this.voxelSize,
      (gy - centerOffset) * this.voxelSize,
      (gz - centerOffset) * this.voxelSize
    );
  }

  private isValidGridPosition(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.gridSize &&
           y >= 0 && y < this.gridSize &&
           z >= 0 && z < this.gridSize;
  }

  private buildVoxelMeshes(): void {
    const rockGeometry = new THREE.BoxGeometry(
      this.voxelSize * 0.9,
      this.voxelSize * 0.9,
      this.voxelSize * 0.9
    );

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          const voxel = this.voxelData[x][y][z];
          if (voxel.removed) continue;

          const key = `${x},${y},${z}`;
          
          let material: THREE.Material;
          if (voxel.isFossil) {
            const fragment = this.fossilFragmentData.find(f => f.id === voxel.fragmentId);
            const color = fragment ? STRATUM_PERIODS[fragment.period].color : 0xD4A574;
            material = new THREE.MeshStandardMaterial({
              color: color,
              roughness: 0.8,
              metalness: 0.2,
              transparent: true,
              opacity: 0.95
            });
          } else {
            const rockNoise = Math.random() * 0.15;
            material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x6B6B6B).offsetHSL(0, 0, rockNoise - 0.075),
              roughness: 0.95,
              metalness: 0.05
            });
          }

          const mesh = new THREE.Mesh(rockGeometry, material);
          mesh.position.copy(voxel.position);
          mesh.userData = { gridX: x, gridY: y, gridZ: z, key, isFossil: voxel.isFossil, fragmentId: voxel.fragmentId };
          this.voxelsGroup.add(mesh);
          this.voxelMeshes.set(key, mesh);
        }
      }
    }
  }

  private countTotalVoxels(): number {
    let count = 0;
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          if (!this.voxelData[x][y][z].removed && !this.voxelData[x][y][z].isFossil) {
            count++;
          }
        }
      }
    }
    return count;
  }

  public handleClick(camera: THREE.Camera, pointer: THREE.Vector2): void {
    this.raycaster.setFromCamera(pointer, camera);
    const intersects = this.raycaster.intersectObjects(this.voxelsGroup.children, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const { gridX, gridY, gridZ, isFossil } = hit.userData;
      
      if (!isFossil) {
        this.removeVoxel(gridX, gridY, gridZ);
        this.removeAdjacentVoxels(gridX, gridY, gridZ, 1);
      }
    }
  }

  public handleDrag(camera: THREE.Camera, pointer: THREE.Vector2): void {
    this.raycaster.setFromCamera(pointer, camera);
    const intersects = this.raycaster.intersectObjects(this.voxelsGroup.children, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const { gridX, gridY, gridZ, isFossil } = hit.userData;
      
      if (!isFossil) {
        this.removeVoxel(gridX, gridY, gridZ);
      }
    }
  }

  private removeAdjacentVoxels(gx: number, gy: number, gz: number, radius: number): void {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const nx = gx + dx;
          const ny = gy + dy;
          const nz = gz + dz;
          
          if (this.isValidGridPosition(nx, ny, nz)) {
            const voxel = this.voxelData[nx][ny][nz];
            if (!voxel.removed && !voxel.isFossil) {
              const chance = 0.3 / (Math.abs(dx) + Math.abs(dy) + Math.abs(dz));
              if (Math.random() < chance) {
                this.removeVoxel(nx, ny, nz);
              }
            }
          }
        }
      }
    }
  }

  private removeVoxel(gx: number, gy: number, gz: number): void {
    const voxel = this.voxelData[gx][gy][gz];
    if (voxel.removed || voxel.isFossil) return;

    voxel.removed = true;
    this.removedVoxels++;

    const key = `${gx},${gy},${gz}`;
    const mesh = this.voxelMeshes.get(key);
    if (mesh) {
      this.createBurstParticles(voxel.position.clone(), this.getMaterialColor(mesh));
      this.createSettlingDebris(mesh);
      this.voxelsGroup.remove(mesh);
      this.voxelMeshes.delete(key);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    this.checkFragmentExposure();
    this.notifyProgress();
  }

  private getMaterialColor(mesh: THREE.Mesh): THREE.Color {
    const material = mesh.material as THREE.MeshStandardMaterial;
    return material.color.clone();
  }

  private createBurstParticles(position: THREE.Vector3, baseColor: THREE.Color): void {
    const particleCount = 15 + Math.floor(Math.random() * 6);

    for (let i = 0; i < particleCount; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const geometry = new THREE.SphereGeometry(size, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: 0xD4A574,
        transparent: true,
        opacity: 1
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);

      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 1 + Math.random() * 2;

      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        velocity: direction.multiplyScalar(speed),
        lifetime: 0,
        maxLifetime: 0.5 + Math.random() * 0.5,
        startColor: new THREE.Color(0xD4A574),
        endColor: new THREE.Color(0x8B4513),
        isSettling: false,
        settleStart: 0
      });
    }
  }

  private createSettlingDebris(originalMesh: THREE.Mesh): void {
    const debrisCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < debrisCount; i++) {
      const size = this.voxelSize * (0.2 + Math.random() * 0.3);
      const geometry = new THREE.BoxGeometry(size, size * 0.5, size);
      const material = new THREE.MeshStandardMaterial({
        color: this.getMaterialColor(originalMesh),
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.8
      });

      const debris = new THREE.Mesh(geometry, material);
      debris.position.copy(originalMesh.position);
      debris.position.x += (Math.random() - 0.5) * 0.1;
      debris.position.z += (Math.random() - 0.5) * 0.1;
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0,
        (Math.random() - 0.5) * 0.3
      );

      this.scene.add(debris);
      this.particles.push({
        mesh: debris,
        velocity: direction,
        lifetime: 0,
        maxLifetime: 8,
        startColor: new THREE.Color(),
        endColor: new THREE.Color(),
        isSettling: true,
        settleStart: 0
      });
    }
  }

  private checkFragmentExposure(): void {
    for (const [fragmentId, positionKeys] of this.fossilPositions) {
      if (this.exposedFragments.has(fragmentId)) continue;

      let exposedCount = 0;
      let totalRelevant = 0;

      for (const key of positionKeys) {
        const [gx, gy, gz] = key.split(',').map(Number);
        if (!this.isValidGridPosition(gx, gy, gz)) continue;
        
        const voxel = this.voxelData[gx][gy][gz];
        if (voxel.isFossil && voxel.fragmentId === fragmentId) {
          totalRelevant++;
          if (this.hasExposedNeighbor(gx, gy, gz)) {
            exposedCount++;
          }
        }
      }

      if (totalRelevant > 0 && exposedCount / totalRelevant > 0.4) {
        this.exposedFragments.add(fragmentId);
        this.removeFossilVoxelShells(fragmentId);
        this.onFragmentExposed?.(fragmentId);
      }
    }
  }

  private hasExposedNeighbor(gx: number, gy: number, gz: number): boolean {
    const directions = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];

    for (const [dx, dy, dz] of directions) {
      const nx = gx + dx;
      const ny = gy + dy;
      const nz = gz + dz;
      
      if (!this.isValidGridPosition(nx, ny, nz)) return true;
      if (this.voxelData[nx][ny][nz].removed) return true;
    }
    return false;
  }

  private removeFossilVoxelShells(fragmentId: number): void {
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          const voxel = this.voxelData[x][y][z];
          if (!voxel.isFossil && !voxel.removed) {
            const adjDirections = [
              [1, 0, 0], [-1, 0, 0],
              [0, 1, 0], [0, -1, 0],
              [0, 0, 1], [0, 0, -1]
            ];
            
            for (const [dx, dy, dz] of adjDirections) {
              const nx = x + dx;
              const ny = y + dy;
              const nz = z + dz;
              if (this.isValidGridPosition(nx, ny, nz)) {
                const neighbor = this.voxelData[nx][ny][nz];
                if (neighbor.isFossil && neighbor.fragmentId === fragmentId) {
                  this.removeVoxel(x, y, z);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  private notifyProgress(): void {
    const percentage = this.totalVoxels > 0 
      ? Math.min(100, (this.removedVoxels / this.totalVoxels) * 100)
      : 0;

    this.onProgressChange?.({
      totalVoxels: this.totalVoxels,
      removedVoxels: this.removedVoxels,
      percentage,
      exposedFragmentIds: Array.from(this.exposedFragments)
    });
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += deltaTime;

      if (p.isSettling) {
        p.velocity.y -= 0.2 * deltaTime;
        p.mesh.position.addScaledVector(p.velocity, deltaTime);
        p.mesh.rotation.x += deltaTime * 0.5;
        p.mesh.rotation.z += deltaTime * 0.3;

        const material = p.mesh.material as THREE.MeshStandardMaterial;
        if (p.lifetime > 4) {
          material.opacity = Math.max(0, 1 - (p.lifetime - 4) / 4);
        }

        if (p.mesh.position.y < -2.5 || p.lifetime >= p.maxLifetime) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          material.dispose();
          this.particles.splice(i, 1);
        }
      } else {
        p.velocity.y -= 9.8 * deltaTime;
        p.mesh.position.addScaledVector(p.velocity, deltaTime);

        const lifeRatio = p.lifetime / p.maxLifetime;
        const material = p.mesh.material as THREE.MeshBasicMaterial;
        material.color.copy(p.startColor).lerp(p.endColor, lifeRatio);
        material.opacity = 1 - lifeRatio;

        if (p.lifetime >= p.maxLifetime) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          material.dispose();
          this.particles.splice(i, 1);
        }
      }
    }
  }

  public resetMining(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];

    for (const [key, mesh] of this.voxelMeshes) {
      this.voxelsGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.voxelMeshes.clear();

    this.scene.remove(this.voxelsGroup);
    this.voxelsGroup = new THREE.Group();

    this.voxelData = [];
    this.fossilPositions.clear();
    this.exposedFragments.clear();
    this.removedVoxels = 0;

    this.init(this.fossilFragmentData);
  }

  public getVoxelsGroup(): THREE.Group {
    return this.voxelsGroup;
  }

  public getExposedFragments(): Set<number> {
    return this.exposedFragments;
  }

  public getVoxelGridCenter(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0);
  }

  public getVoxelSize(): number {
    return this.voxelSize;
  }
}
