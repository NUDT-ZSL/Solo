import * as THREE from 'three';
import { BuildingData } from './buildingManager';

interface WindArrow {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  currentDirection: THREE.Vector3;
  targetDirection: THREE.Vector3;
  vortexTimer: number;
  inVortex: boolean;
  vortexCenter: THREE.Vector3 | null;
  vortexAngle: number;
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
  private sharedArrowGeometry: THREE.ConeGeometry;
  private sharedArrowMaterial: THREE.MeshStandardMaterial;

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
    
    const arrowLength = 8;
    const arrowRadius = 2;
    this.sharedArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    this.sharedArrowMaterial = new THREE.MeshStandardMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    this.initArrows();
    this.initParticles();
  }

  disposeAllArrows() {
    while (this.arrowGroup.children.length > 0) {
      const child = this.arrowGroup.children[0] as THREE.Mesh;
      this.arrowGroup.remove(child);
      child.geometry.dispose();
    }
    this.arrows = [];
  }

  private initArrows() {
    this.disposeAllArrows();
    
    const spacing = this.plotSize / this.gridSize;
    const halfPlot = this.plotSize / 2;
    const yLevels = [5, 10, 15, 20, 25];
    
    for (let i = 0; i <= this.gridSize; i++) {
      for (let j = 0; j <= this.gridSize; j++) {
        for (let k = 0; k < 3; k++) {
          const baseX = -halfPlot + i * spacing;
          const z = -halfPlot + j * spacing;
          const y = yLevels[k * 2] || 10;
          
          const x = baseX + (Math.random() - 0.5) * 20;
          
          this.createArrow(new THREE.Vector3(x, y, z));
        }
      }
    }
  }

  private createArrow(initialPosition: THREE.Vector3): WindArrow {
    const arrow = new THREE.Mesh(this.sharedArrowGeometry, this.sharedArrowMaterial.clone());
    arrow.position.copy(initialPosition);
    
    const initialDir = new THREE.Vector3(1, 0, 0);
    this.setArrowDirection(arrow, initialDir);
    
    this.arrowGroup.add(arrow);
    
    const windArrow: WindArrow = {
      mesh: arrow,
      position: initialPosition.clone(),
      velocity: new THREE.Vector3(this.baseWindSpeed, 0, 0),
      speed: this.baseWindSpeed,
      currentDirection: initialDir.clone(),
      targetDirection: initialDir.clone(),
      vortexTimer: 0,
      inVortex: false,
      vortexCenter: null,
      vortexAngle: 0
    };
    
    this.arrows.push(windArrow);
    return windArrow;
  }

  private setArrowDirection(arrowMesh: THREE.Mesh, direction: THREE.Vector3) {
    const up = new THREE.Vector3(0, 1, 0);
    const normalizedDir = direction.clone().normalize();
    const axis = new THREE.Vector3().crossVectors(up, normalizedDir).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(normalizedDir))));
    
    if (axis.length() > 0.001) {
      arrowMesh.setRotationFromAxisAngle(axis, -angle);
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
  }

  setBaseWindSpeed(speed: number) {
    this.baseWindSpeed = speed;
  }

  setGridSize(size: number) {
    this.gridSize = Math.max(5, Math.min(20, size));
    this.initArrows();
  }

  getGridSize(): number {
    return this.gridSize;
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

  calculateWindAtPoint(x: number, y: number, z: number): { 
    direction: THREE.Vector3; 
    speed: number;
    shouldEnterVortex: boolean;
    vortexCenter: THREE.Vector3 | null;
  } {
    let direction = new THREE.Vector3(1, 0, 0);
    let speed = this.baseWindSpeed;
    let shouldEnterVortex = false;
    let vortexCenter: THREE.Vector3 | null = null;
    
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
      
      const zInRange = z >= frontZ - 5 && z <= backZ + 5;
      const yInRange = y <= topY + 15 && y >= 0;
      
      if (zInRange && yInRange) {
        if (x < leftX && x > leftX - 40) {
          const distToBuilding = leftX - x;
          const distRatio = Math.max(0, Math.min(1, 1 - distToBuilding / 40));
          
          const deflectionAngle = distRatio * Math.PI / 4;
          
          if (y < topY) {
            const heightRatio = 1 - (y / topY);
            direction.y = Math.sin(deflectionAngle) * (0.4 + heightRatio * 0.4);
          } else {
            direction.y = Math.sin(deflectionAngle * 0.6) * 0.3;
          }
          
          direction.x = Math.cos(deflectionAngle);
          direction.z *= 0.3;
          direction.normalize();
          
          speed = this.baseWindSpeed * (1 + distRatio * 0.4);
        }
        
        if (x > rightX && x < rightX + 35) {
          const distFromBuilding = x - rightX;
          const vortexRadius = 20;
          
          if (distFromBuilding < vortexRadius * 1.5) {
            const vortexStrength = Math.max(0, 1 - distFromBuilding / (vortexRadius * 1.5));
            
            if (vortexStrength > 0.4) {
              shouldEnterVortex = true;
              vortexCenter = new THREE.Vector3(
                rightX + vortexRadius * 0.7,
                topY * 0.5,
                bz
              );
            }
            
            const swirlAngle = this.animationTime * (1 + vortexStrength * 2);
            const verticalDrop = vortexStrength * 0.4;
            const lateralSwing = Math.sin(swirlAngle) * vortexStrength * 0.3;
            
            direction.z = lateralSwing;
            direction.y = -verticalDrop;
            direction.x = Math.max(0.15, 1 - vortexStrength * 0.7);
            direction.normalize();
            
            speed = this.baseWindSpeed * (0.4 + vortexStrength * 0.5);
          }
        }
        
        if (x >= leftX - 3 && x <= rightX + 3 && z >= frontZ - 3 && z <= backZ + 3 && y < topY + 5) {
          if (y < topY) {
            const pushUp = 0.6 + (1 - y / topY) * 0.4;
            const pushAround = 0.3;
            direction.set(0.2, pushUp, (z - bz) > 0 ? pushAround : -pushAround);
          } else {
            direction.set(0.6, 0.4, 0);
          }
          direction.normalize();
          speed = this.baseWindSpeed * 0.7;
        }
      }
    }
    
    return { direction, speed, shouldEnterVortex, vortexCenter };
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
    const halfPlot = this.plotSize / 2;
    const bufferZone = 30;
    const speedMultiplier = 0.8;
    
    this.arrows.forEach((arrow) => {
      const windData = this.calculateWindAtPoint(
        arrow.position.x,
        arrow.position.y,
        arrow.position.z
      );
      
      if (arrow.inVortex) {
        arrow.vortexTimer -= deltaTime;
        arrow.vortexAngle += deltaTime * (1 + this.baseWindSpeed / 10);
        
        if (arrow.vortexCenter) {
          const radius = 8;
          arrow.position.x = arrow.vortexCenter.x + Math.cos(arrow.vortexAngle) * radius;
          arrow.position.z = arrow.vortexCenter.z + Math.sin(arrow.vortexAngle) * radius;
          arrow.position.y = arrow.vortexCenter.y + Math.sin(arrow.vortexAngle * 0.7) * 3;
          
          const tangentDir = new THREE.Vector3(
            -Math.sin(arrow.vortexAngle),
            Math.cos(arrow.vortexAngle * 0.7) * 0.5,
            Math.cos(arrow.vortexAngle)
          ).normalize();
          
          arrow.targetDirection.copy(tangentDir);
          arrow.speed = this.baseWindSpeed * 0.6;
        }
        
        if (arrow.vortexTimer <= 0) {
          arrow.inVortex = false;
          arrow.vortexCenter = null;
        }
      } else {
        if (windData.shouldEnterVortex && windData.vortexCenter && Math.random() < 0.02) {
          arrow.inVortex = true;
          arrow.vortexTimer = 2 + Math.random() * 2;
          arrow.vortexCenter = windData.vortexCenter.clone();
          arrow.vortexAngle = Math.random() * Math.PI * 2;
        } else {
          arrow.targetDirection.copy(windData.direction);
          arrow.speed = windData.speed;
          
          const moveFactor = arrow.speed * speedMultiplier * deltaTime;
          arrow.position.addScaledVector(arrow.targetDirection, moveFactor);
        }
      }
      
      if (arrow.position.x > halfPlot + bufferZone) {
        arrow.position.x = -halfPlot - Math.random() * bufferZone;
        arrow.position.z = -halfPlot + Math.random() * this.plotSize;
        arrow.position.y = 5 + Math.random() * 25;
        arrow.inVortex = false;
        arrow.vortexTimer = 0;
      }
      
      if (arrow.position.z < -halfPlot - bufferZone) {
        arrow.position.z = halfPlot + bufferZone * 0.5;
      }
      if (arrow.position.z > halfPlot + bufferZone) {
        arrow.position.z = -halfPlot - bufferZone * 0.5;
      }
      if (arrow.position.y < 1) {
        arrow.position.y = 5;
      }
      if (arrow.position.y > 50) {
        arrow.position.y = 25;
      }
      
      arrow.currentDirection.lerp(arrow.targetDirection, 0.08).normalize();
      this.setArrowDirection(arrow.mesh, arrow.currentDirection);
      
      const scale = Math.min(2.2, Math.max(0.4, arrow.speed / this.baseWindSpeed));
      const pulseScale = scale * (1 + Math.sin(this.animationTime * 3 + arrow.position.x * 0.05) * 0.08);
      arrow.mesh.scale.set(pulseScale, pulseScale, pulseScale);
      
      arrow.mesh.position.copy(arrow.position);
    });
  }

  private updateParticles(deltaTime: number) {
    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    
    this.particles.forEach((particle, i) => {
      const windData = this.calculateWindAtPoint(
        particle.position.x,
        this.sectionHeight,
        particle.position.z
      );
      
      particle.velocity.copy(windData.direction).multiplyScalar(windData.speed);
      particle.speed = windData.speed;
      
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
      
      const normalizedSpeed = Math.max(0, Math.min(1, (particle.speed - 0) / 15));
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
    this.disposeAllArrows();
    this.sharedArrowGeometry.dispose();
    this.sharedArrowMaterial.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
