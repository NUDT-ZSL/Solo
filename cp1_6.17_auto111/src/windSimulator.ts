import * as THREE from 'three';
import { BuildingData } from './buildingManager';

interface WindArrow {
  mesh: THREE.Mesh;
  baseDirection: THREE.Vector3;
  baseSpeed: number;
  gridX: number;
  gridZ: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
}

export class WindSimulator {
  private scene: THREE.Scene;
  private arrows: WindArrow[] = [];
  private arrowGroup: THREE.Group;
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleSystem: THREE.Points;
  private particleGroup: THREE.Group;
  private baseWindSpeed = 10;
  private gridSize = 10;
  private plotSize = 200;
  private buildings: BuildingData[] = [];
  private showArrows = true;
  private showParticles = false;
  private particleCount = 200;
  private sectionHeight = 1.5;
  private animationTime = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.arrowGroup = new THREE.Group();
    this.scene.add(this.arrowGroup);
    
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleGroup.add(this.particleSystem);
    
    this.initArrowGrid();
    this.initParticles();
  }

  private initArrowGrid() {
    const spacing = this.plotSize / this.gridSize;
    const halfPlot = this.plotSize / 2;
    
    const arrowLength = 8;
    const arrowRadius = 2;
    
    for (let i = 0; i <= this.gridSize; i++) {
      for (let j = 0; j <= this.gridSize; j++) {
        const x = -halfPlot + i * spacing;
        const z = -halfPlot + j * spacing;
        const y = 10;
        
        const coneGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
        const coneMaterial = new THREE.MeshStandardMaterial({
          color: 0x4da6ff,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        
        const arrow = new THREE.Mesh(coneGeometry, coneMaterial);
        arrow.position.set(x, y, z);
        arrow.rotation.z = -Math.PI / 2;
        
        this.arrowGroup.add(arrow);
        
        this.arrows.push({
          mesh: arrow,
          baseDirection: new THREE.Vector3(1, 0, 0),
          baseSpeed: this.baseWindSpeed,
          gridX: i,
          gridZ: j
        });
      }
    }
  }

  private initParticles() {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    
    for (let i = 0; i < this.particleCount; i++) {
      const x = -this.plotSize / 2 + Math.random() * this.plotSize * 1.5;
      const z = -this.plotSize / 2 + Math.random() * this.plotSize;
      
      this.particles.push({
        position: new THREE.Vector3(x, this.sectionHeight, z),
        velocity: new THREE.Vector3(this.baseWindSpeed, 0, 0),
        speed: this.baseWindSpeed
      });
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = this.sectionHeight;
      positions[i * 3 + 2] = z;
      
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0.4;
      colors[i * 3 + 2] = 1;
    }
    
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGroup.visible = false;
  }

  setBuildings(buildings: BuildingData[]) {
    this.buildings = buildings;
    this.updateWindField();
  }

  setBaseWindSpeed(speed: number) {
    this.baseWindSpeed = speed;
    this.updateWindField();
  }

  setShowArrows(show: boolean) {
    this.showArrows = show;
    this.arrowGroup.visible = show;
  }

  setShowParticles(show: boolean) {
    this.showParticles = show;
    this.particleGroup.visible = show;
  }

  setSectionView(enabled: boolean) {
    this.particleGroup.visible = enabled && this.showParticles;
  }

  private updateWindField() {
    this.arrows.forEach(arrow => {
      const pos = arrow.mesh.position;
      const { direction, speed } = this.calculateWindAtPoint(pos.x, pos.y, pos.z);
      
      const scale = Math.min(2, Math.max(0.3, speed / this.baseWindSpeed));
      arrow.mesh.scale.set(scale, scale, scale);
      
      const up = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3().crossVectors(up, direction).normalize();
      const angle = Math.acos(up.dot(direction.clone().normalize()));
      
      if (axis.length() > 0.001) {
        arrow.mesh.setRotationFromAxisAngle(axis, -angle);
      }
    });
  }

  calculateWindAtPoint(x: number, y: number, z: number): { direction: THREE.Vector3; speed: number } {
    let direction = new THREE.Vector3(1, 0, 0);
    let speed = this.baseWindSpeed;
    
    for (const building of this.buildings) {
      const bx = building.position.x;
      const by = building.position.y;
      const bz = building.position.z;
      const bw = building.width;
      const bh = building.height;
      const bd = building.depth;
      
      const halfW = bw / 2;
      const halfD = bd / 2;
      
      const leftX = bx - halfW;
      const rightX = bx + halfW;
      const frontZ = bz - halfD;
      const backZ = bz + halfD;
      const topY = by + bh / 2;
      
      if (z >= frontZ - 5 && z <= backZ + 5 && y <= topY + 10 && y >= 0) {
        if (x < leftX && x > leftX - 30) {
          const distRatio = (leftX - x) / 30;
          const deflection = (1 - distRatio) * Math.PI / 4;
          
          if (y < topY) {
            const liftFactor = (1 - y / topY) * 0.5;
            direction.y = Math.sin(deflection) * (0.5 + liftFactor);
          } else {
            direction.y = Math.sin(deflection * 0.5) * 0.3;
          }
          
          direction.x = Math.cos(deflection);
          direction.normalize();
          
          speed = this.baseWindSpeed * (1 + (1 - distRatio) * 0.3);
        }
        
        if (x > rightX && x < rightX + 30) {
          const distFromBuilding = x - rightX;
          const vortexRadius = 15;
          
          if (distFromBuilding < vortexRadius * 2) {
            const vortexStrength = Math.max(0, 1 - distFromBuilding / (vortexRadius * 2));
            const angle = (distFromBuilding / vortexRadius) * Math.PI + this.animationTime * 2;
            
            const zOffset = z - bz;
            const normalizedZ = Math.max(-1, Math.min(1, zOffset / (halfD + vortexRadius)));
            
            direction.z = Math.sin(angle) * vortexStrength * 0.5 * normalizedZ;
            direction.y = -vortexStrength * 0.3;
            direction.x = Math.max(0.2, 1 - vortexStrength * 0.5);
            direction.normalize();
            
            speed = this.baseWindSpeed * (0.5 + vortexStrength * 0.3);
          }
        }
        
        if (x >= leftX && x <= rightX && z >= frontZ && z <= backZ && y < topY) {
          speed = this.baseWindSpeed * 0.1;
          direction.set(0.5, 0.3, 0).normalize();
        }
      }
    }
    
    return { direction, speed };
  }

  update(deltaTime: number) {
    this.animationTime += deltaTime;
    
    if (this.showArrows) {
      this.updateArrowAnimations(deltaTime);
    }
    
    if (this.showParticles && this.particleGroup.visible) {
      this.updateParticles(deltaTime);
    }
  }

  private updateArrowAnimations(deltaTime: number) {
    this.arrows.forEach((arrow, index) => {
      const pos = arrow.mesh.position;
      const { direction, speed } = this.calculateWindAtPoint(pos.x, pos.y, pos.z);
      
      const scale = Math.min(2, Math.max(0.3, speed / this.baseWindSpeed));
      const targetScale = scale * (1 + Math.sin(this.animationTime * 2 + index * 0.1) * 0.05);
      arrow.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      const targetDir = direction.clone();
      const currentDir = new THREE.Vector3(0, 1, 0).applyQuaternion(arrow.mesh.quaternion);
      
      const newDir = currentDir.clone().lerp(targetDir, 0.05).normalize();
      
      const up = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3().crossVectors(up, newDir).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(newDir))));
      
      if (axis.length() > 0.001) {
        arrow.mesh.setRotationFromAxisAngle(axis, -angle);
      }
    });
  }

  private updateParticles(deltaTime: number) {
    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    
    this.particles.forEach((particle, i) => {
      const { direction, speed } = this.calculateWindAtPoint(
        particle.position.x,
        this.sectionHeight,
        particle.position.z
      );
      
      particle.velocity.copy(direction).multiplyScalar(speed);
      particle.speed = speed;
      
      particle.position.x += particle.velocity.x * deltaTime * 2;
      particle.position.z += particle.velocity.z * deltaTime * 2;
      
      const halfPlot = this.plotSize / 2;
      if (particle.position.x > halfPlot + 20) {
        particle.position.x = -halfPlot - Math.random() * 50;
        particle.position.z = -halfPlot + Math.random() * this.plotSize;
      }
      if (particle.position.z < -halfPlot - 10) {
        particle.position.z = halfPlot + 10;
      }
      if (particle.position.z > halfPlot + 10) {
        particle.position.z = -halfPlot - 10;
      }
      
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = this.sectionHeight;
      positions[i * 3 + 2] = particle.position.z;
      
      const normalizedSpeed = Math.max(0, Math.min(1, (speed - 0) / 15));
      const color = this.getSpeedColor(normalizedSpeed);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });
    
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private getSpeedColor(t: number): { r: number; g: number; b: number } {
    const blue = { r: 0, g: 0.4, b: 1 };
    const red = { r: 1, g: 0.2, b: 0 };
    
    return {
      r: blue.r + (red.r - blue.r) * t,
      g: blue.g + (red.g - blue.g) * t,
      b: blue.b + (red.b - blue.b) * t
    };
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getArrowCount(): number {
    return this.arrows.length;
  }

  calculateSurfacePressure(building: BuildingData, faceNormal: THREE.Vector3): number {
    const isWindward = faceNormal.x < -0.5;
    const isLeeward = faceNormal.x > 0.5;
    
    if (isWindward) {
      const basePressure = 50 + (this.baseWindSpeed / 20) * 100;
      const variation = Math.random() * 30;
      return Math.min(200, basePressure + variation);
    } else if (isLeeward) {
      const basePressure = -50 - (this.baseWindSpeed / 20) * 100;
      const variation = Math.random() * 30;
      return Math.max(-200, basePressure - variation);
    } else {
      const basePressure = (Math.random() - 0.5) * 40;
      return basePressure;
    }
  }

  dispose() {
    this.arrows.forEach(arrow => {
      arrow.mesh.geometry.dispose();
      (arrow.mesh.material as THREE.Material).dispose();
    });
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
