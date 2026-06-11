import * as THREE from 'three';
import { OceanScene } from './oceanScene';

export interface ObservationLog {
  id: number;
  x: number;
  z: number;
  temperature: number;
  salinity: number;
  timestamp: Date;
}

export class Creatures {
  public scene: THREE.Scene;
  public oceanScene: OceanScene;
  public corals: THREE.Group[] = [];
  public fishSchool!: THREE.Group;
  public fishMeshes: THREE.Mesh[] = [];
  public ripples: THREE.Mesh[] = [];
  
  private coralCount = 80 + Math.floor(Math.random() * 41);
  private fishCount = 60;
  private terrainSize = 400;
  
  private fishPathPoints: THREE.Vector3[] = [];
  private oldFishPathPoints: THREE.Vector3[] = [];
  private fishPathProgress: number = 0;
  private lastPathSwitch: number = 0;
  private pathSwitchInterval: number = 10;
  private pathTransitionProgress: number = 1;
  private pathTransitionDuration: number = 2;
  
  private schoolCenter: THREE.Vector3 = new THREE.Vector3(0, 30, 0);
  private schoolTarget: THREE.Vector3 = new THREE.Vector3(0, 30, 0);
  private lastSchoolMove: number = 0;
  private schoolMoveInterval: number = 5;
  
  private schoolSpread: number = 1;
  private spreadDirection: number = 1;
  private lastSpreadChange: number = 0;
  private spreadInterval: number = 5;
  
  private logIdCounter = 0;
  public observationLogs: ObservationLog[] = [];

  constructor(scene: THREE.Scene, oceanScene: OceanScene) {
    this.scene = scene;
    this.oceanScene = oceanScene;
    
    this.createCorals();
    this.createFishSchool();
    this.generateFishPath();
  }

  private createCorals(): void {
    const colorStart = new THREE.Color(0xFF6B6B);
    const colorEnd = new THREE.Color(0xFFD93D);
    
    for (let i = 0; i < this.coralCount; i++) {
      const coral = new THREE.Group();
      
      const x = (Math.random() - 0.5) * this.terrainSize * 0.8;
      const z = (Math.random() - 0.5) * this.terrainSize * 0.8;
      const baseY = this.oceanScene.getTerrainHeight(x, z);
      
      const ringCount = 3 + Math.floor(Math.random() * 3);
      const t = Math.random();
      const baseColor = colorStart.clone().lerp(colorEnd, t);
      
      for (let j = 0; j < ringCount; j++) {
        const scale = 1 - j * 0.18;
        const radius = (2.5 + Math.random() * 1.5) * scale;
        const tube = 0.4 + Math.random() * 0.3;
        
        const ringGeometry = new THREE.TorusGeometry(radius, tube, 8, 16);
        const ringMaterial = new THREE.MeshPhongMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.9,
          shininess: 40
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        ring.rotation.z = (Math.random() - 0.5) * 0.3;
        ring.position.y = j * 1.8 + tube;
        
        coral.add(ring);
      }
      
      coral.position.set(x, baseY, z);
      coral.rotation.y = Math.random() * Math.PI * 2;
      coral.scale.setScalar(0.9 + Math.random() * 0.8);
      
      this.corals.push(coral);
      this.scene.add(coral);
    }
  }

  private createFishShape(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(2, 0.5);
    shape.lineTo(2, -0.5);
    shape.closePath();
    
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  private createFishSchool(): void {
    this.fishSchool = new THREE.Group();
    
    const colorStart = new THREE.Color(0xD3D3D3);
    const colorEnd = new THREE.Color(0xA9A9A9);
    
    for (let i = 0; i < this.fishCount; i++) {
      const fishGeometry = this.createFishShape();
      
      const t = Math.random();
      const color = colorStart.clone().lerp(colorEnd, t);
      
      const fishMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      
      const fish = new THREE.Mesh(fishGeometry, fishMaterial);
      
      const scale = 1.5 + Math.random() * 1.5;
      fish.scale.setScalar(scale);
      
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 30;
      fish.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 15,
        Math.sin(angle) * dist
      );
      
      fish.userData = {
        baseAngle: angle,
        baseDist: dist,
        baseY: fish.position.y,
        speed: 0.8 + Math.random() * 0.4,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 2 + Math.random() * 2
      };
      
      this.fishMeshes.push(fish);
      this.fishSchool.add(fish);
    }
    
    this.fishSchool.position.copy(this.schoolCenter);
    this.scene.add(this.fishSchool);
  }

  private generateFishPath(): void {
    this.oldFishPathPoints = [...this.fishPathPoints];
    
    const newPathPoints: THREE.Vector3[] = [];
    const pointCount = 4;
    
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 50 + Math.random() * 30;
      newPathPoints.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        20 + Math.random() * 40,
        Math.sin(angle) * radius
      ));
    }
    
    this.fishPathPoints = newPathPoints;
    this.pathTransitionProgress = 0;
  }

  private getBezierPoint(t: number, points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length < 2) return points[0] || new THREE.Vector3();
    
    const n = points.length - 1;
    const segIndex = Math.min(Math.floor(t * n), n - 1);
    const segT = (t * n) - segIndex;
    
    const p0 = points[segIndex];
    const p1 = points[(segIndex + 1) % points.length];
    const p2 = points[(segIndex + 2) % points.length];
    const p3 = points[(segIndex + 3) % points.length];
    
    const t2 = segT * segT;
    const t3 = t2 * segT;
    
    return new THREE.Vector3(
      0.5 * (2 * p0.x + (-p0.x + p2.x) * segT + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      0.5 * (2 * p0.y + (-p0.y + p2.y) * segT + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      0.5 * (2 * p0.z + (-p0.z + p2.z) * segT + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
    );
  }

  private getBezierTangent(t: number, points: THREE.Vector3[]): THREE.Vector3 {
    const p0 = this.getBezierPoint(Math.max(0, t - 0.01), points);
    const p1 = this.getBezierPoint(Math.min(1, t + 0.01), points);
    return new THREE.Vector3().subVectors(p1, p0).normalize();
  }

  public createRipple(x: number, y: number, z: number): void {
    const rippleGroup = new THREE.Group();
    
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.RingGeometry(0.5, 1, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      ring.userData = { startDelay: i * 0.3, age: 0 };
      rippleGroup.add(ring);
    }
    
    rippleGroup.position.set(x, y, z);
    this.scene.add(rippleGroup);
    this.ripples.push(rippleGroup as unknown as THREE.Mesh);
  }

  public update(delta: number, camera: THREE.Camera): void {
    const time = performance.now() / 1000;
    
    this.updateCorals(delta);
    this.updateFishSchool(delta, time, camera);
    this.updateRipples(delta);
  }

  private updateCorals(delta: number): void {
    for (let i = 0; i < this.corals.length; i++) {
      const coral = this.corals[i];
      coral.rotation.y += delta * 0.05 * (i % 2 === 0 ? 1 : -1);
      
      coral.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.z += delta * 0.1 * Math.sin(index + i);
        }
      });
    }
  }

  private updateFishSchool(delta: number, time: number, camera: THREE.Camera): void {
    if (time - this.lastPathSwitch > this.pathSwitchInterval) {
      this.generateFishPath();
      this.lastPathSwitch = time;
    }
    
    this.fishPathProgress += delta * 0.05;
    if (this.fishPathProgress > 1) this.fishPathProgress -= 1;
    
    const pathPos = this.getBezierPoint(this.fishPathProgress, this.fishPathPoints);
    const pathTangent = this.getBezierTangent(this.fishPathProgress, this.fishPathPoints);
    
    if (time - this.lastSchoolMove > this.schoolMoveInterval) {
      this.schoolTarget.set(
        (Math.random() - 0.5) * 200,
        20 + Math.random() * 40,
        (Math.random() - 0.5) * 200
      );
      this.lastSchoolMove = time;
    }
    
    this.schoolCenter.lerp(this.schoolTarget, delta * 0.1);
    
    const cameraPos = camera.position;
    const distToCamera = this.schoolCenter.distanceTo(cameraPos);
    if (distToCamera < 20) {
      const pushDir = new THREE.Vector3().subVectors(this.schoolCenter, cameraPos).normalize();
      this.schoolCenter.add(pushDir.multiplyScalar((20 - distToCamera) * 0.1));
    }
    
    const halfSize = 195;
    this.schoolCenter.x = Math.max(-halfSize, Math.min(halfSize, this.schoolCenter.x));
    this.schoolCenter.y = Math.max(10, Math.min(70, this.schoolCenter.y));
    this.schoolCenter.z = Math.max(-halfSize, Math.min(halfSize, this.schoolCenter.z));
    
    this.fishSchool.position.copy(this.schoolCenter);
    
    if (time - this.lastSpreadChange > this.spreadInterval) {
      this.spreadDirection *= -1;
      this.lastSpreadChange = time;
    }
    this.schoolSpread += this.spreadDirection * delta * 0.1;
    this.schoolSpread = Math.max(0.5, Math.min(1.5, this.schoolSpread));
    
    for (let i = 0; i < this.fishMeshes.length; i++) {
      const fish = this.fishMeshes[i];
      const data = fish.userData;
      
      data.wobble += delta * data.wobbleSpeed;
      
      const angle = data.baseAngle + time * 0.3 * data.speed;
      const dist = data.baseDist * this.schoolSpread;
      
      fish.position.x = Math.cos(angle) * dist;
      fish.position.z = Math.sin(angle) * dist;
      fish.position.y = data.baseY + Math.sin(data.wobble) * 2;
      
      const targetRotation = Math.atan2(
        -Math.sin(angle) * dist,
        Math.cos(angle) * dist
      );
      fish.rotation.y = targetRotation;
      fish.rotation.z = Math.sin(data.wobble * 0.5) * 0.2;
    }
    
    this.fishSchool.rotation.y = Math.atan2(pathTangent.x, pathTangent.z);
  }

  private updateRipples(delta: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      let allDead = true;
      
      ripple.children.forEach((ring) => {
        if (ring instanceof THREE.Mesh) {
          const data = ring.userData;
          data.age += delta;
          
          if (data.age > data.startDelay) {
            allDead = false;
            const life = data.age - data.startDelay;
            const maxLife = 4;
            const t = life / maxLife;
            
            if (t < 1) {
              const scale = 1 + t * 30;
              ring.scale.setScalar(scale);
              (ring.material as THREE.Material).opacity = 0.6 * (1 - t);
            } else {
              (ring.material as THREE.Material).opacity = 0;
            }
          }
        }
      });
      
      if (allDead) {
        this.scene.remove(ripple);
        this.ripples.splice(i, 1);
      }
    }
  }

  public addObservationLog(x: number, z: number, temperature: number, salinity: number): ObservationLog {
    const log: ObservationLog = {
      id: ++this.logIdCounter,
      x: Math.round(x * 100) / 100,
      z: Math.round(z * 100) / 100,
      temperature: Math.round(temperature * 10) / 10,
      salinity: Math.round(salinity * 100) / 100,
      timestamp: new Date()
    };
    
    this.observationLogs.unshift(log);
    
    if (this.observationLogs.length > 50) {
      this.observationLogs.pop();
    }
    
    return log;
  }

  public deleteObservationLog(id: number): boolean {
    const index = this.observationLogs.findIndex(log => log.id === id);
    if (index !== -1) {
      this.observationLogs.splice(index, 1);
      return true;
    }
    return false;
  }

  public getNearbyCreature(x: number, z: number): { type: string; distance: number } | null {
    let closestCoralDist = Infinity;
    
    for (const coral of this.corals) {
      const dist = Math.sqrt(
        Math.pow(coral.position.x - x, 2) + 
        Math.pow(coral.position.z - z, 2)
      );
      if (dist < closestCoralDist) {
        closestCoralDist = dist;
      }
    }
    
    const schoolDist = Math.sqrt(
      Math.pow(this.schoolCenter.x - x, 2) + 
      Math.pow(this.schoolCenter.z - z, 2)
    );
    
    const threshold = 20;
    
    if (closestCoralDist < threshold && schoolDist < threshold) {
      return closestCoralDist < schoolDist 
        ? { type: 'coral', distance: closestCoralDist }
        : { type: 'fish', distance: schoolDist };
    } else if (closestCoralDist < threshold) {
      return { type: 'coral', distance: closestCoralDist };
    } else if (schoolDist < threshold) {
      return { type: 'fish', distance: schoolDist };
    }
    
    return null;
  }
}
