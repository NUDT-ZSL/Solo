import * as THREE from 'three';
import { Room, EmotionType, emotionToHex, ROOM_SIZE, CORRIDOR_WIDTH } from './labyrinth';

type WallSide = 'north' | 'south' | 'east' | 'west' | 'door';
type AnimationState = 'idle' | 'rising' | 'displaying' | 'fading';

interface WallData {
  side: WallSide;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  basePositions: Float32Array;
  colors: Float32Array;
  particleCount: number;
  isDoor: boolean;
}

export class MemoryRoom {
  public group: THREE.Group;
  private room: Room;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  private walls: Map<WallSide, WallData> = new Map();
  private doorWall!: WallData;
  private doorNormal: THREE.Vector3 = new THREE.Vector3();
  
  private textGroup: THREE.Group = new THREE.Group();
  private textMeshes: THREE.Mesh[] = [];
  private convergeParticles: THREE.Points | null = null;
  
  private animationState: AnimationState = 'idle';
  private animationTimer: number = 0;
  private breatheTimer: number = 0;
  
  private hasEntered: boolean = false;
  private isNearDoor: boolean = false;
  private doorVortexTimer: number = 0;
  
  private readonly WALL_HEIGHT = 3;
  private readonly PARTICLE_SIZE = 2;
  private readonly RISE_DURATION = 1.5;
  private readonly DISPLAY_DURATION = 5;
  private readonly FADE_DURATION = 2;
  private readonly BREATHE_PERIOD = 4;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, room: Room) {
    this.scene = scene;
    this.camera = camera;
    this.room = room;
    
    this.group = new THREE.Group();
    this.group.position.set(room.x, 0, room.z);
    
    this.createWalls();
    this.createText();
    this.createConvergeParticles();
    
    scene.add(this.group);
  }

  private createWalls(): void {
    const halfSize = ROOM_SIZE / 2;
    const emotion = this.room.memory.emotion;
    
    const wallConfigs = [
      { side: 'north' as WallSide, x: 0, z: -halfSize, rotY: 0 },
      { side: 'south' as WallSide, x: 0, z: halfSize, rotY: Math.PI },
      { side: 'east' as WallSide, x: halfSize, z: 0, rotY: Math.PI / 2 },
      { side: 'west' as WallSide, x: -halfSize, z: 0, rotY: -Math.PI / 2 },
    ];

    const doorSide = this.getDoorSide();
    
    for (const config of wallConfigs) {
      const isDoor = config.side === doorSide;
      const wall = this.createWall(emotion, isDoor);
      
      wall.points.position.set(config.x, this.WALL_HEIGHT / 2, config.z);
      wall.points.rotation.y = config.rotY;
      
      if (isDoor) {
        this.doorWall = wall;
        this.doorNormal.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), config.rotY);
      }
      
      this.walls.set(config.side, wall);
      this.group.add(wall.points);
    }
  }

  private getDoorSide(): WallSide {
    const sides: WallSide[] = ['north', 'south', 'east', 'west'];
    return sides[Math.floor(Math.random() * sides.length)] || 'north';
  }

  private createWall(emotion: EmotionType, isDoor: boolean): WallData {
    const particleCount = isDoor ? 3500 : 4500;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    
    const baseColor = emotionToHex(emotion);
    const baseHSL = new THREE.Color(baseColor);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      const u = Math.random();
      const v = Math.random();
      
      const x = (u - 0.5) * ROOM_SIZE;
      const y = v * this.WALL_HEIGHT;
      const z = 0;
      
      positions[i3] = x + (Math.random() - 0.5) * 0.1;
      positions[i3 + 1] = y + (Math.random() - 0.5) * 0.1;
      positions[i3 + 2] = z + (Math.random() - 0.5) * 0.1;
      
      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;
      
      const hueOffset = (Math.random() - 0.5) * 15;
      const particleColor = emotionToHex(emotion, hueOffset);
      const color = new THREE.Color(particleColor);
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: this.PARTICLE_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const points = new THREE.Points(geometry, material);
    
    return {
      side: isDoor ? 'door' : (this.walls.size === 0 ? 'north' : 'south'),
      geometry,
      material,
      points,
      basePositions,
      colors,
      particleCount,
      isDoor
    };
  }

  private createText(): void {
    const memory = this.room.memory;
    const textLines = [
      `${memory.weather}  ${memory.date}`,
      '',
      memory.title,
      '',
      `👥 ${memory.people.join(' · ')}`,
      `💭 ${memory.mood}`
    ];

    let yOffset = 0;
    for (let i = textLines.length - 1; i >= 0; i--) {
      const line = textLines[i];
      if (!line) {
        yOffset += 0.3;
        continue;
      }
      
      const isTitle = i === 2;
      const canvas = this.createTextCanvas(line, isTitle);
      const texture = new THREE.CanvasTexture(canvas);
      
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0
      });
      
      const aspect = canvas.width / canvas.height;
      const height = isTitle ? 0.8 : 0.4;
      const width = height * aspect;
      
      const geometry = new THREE.PlaneGeometry(width, height);
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.y = -this.WALL_HEIGHT / 2 - 1;
      mesh.position.z = 0;
      mesh.userData = { baseY: yOffset, isTitle };
      
      this.textMeshes.push(mesh);
      this.textGroup.add(mesh);
      
      yOffset += isTitle ? 1 : 0.5;
    }
    
    this.group.add(this.textGroup);
  }

  private createTextCanvas(text: string, isTitle: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const fontSize = isTitle ? 120 : 60;
    const fontWeight = isTitle ? 'bold' : 'normal';
    
    ctx.font = `${fontWeight} ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    
    canvas.width = textWidth + 80;
    canvas.height = fontSize + 60;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${fontWeight} ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    return canvas;
  }

  private createConvergeParticles(): void {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 2;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = -this.WALL_HEIGHT / 2 + Math.random() * this.WALL_HEIGHT;
      positions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const color = emotionToHex(this.room.memory.emotion);
    const material = new THREE.PointsMaterial({
      size: 3,
      color: color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    
    this.convergeParticles = new THREE.Points(geometry, material);
    this.group.add(this.convergeParticles);
  }

  public update(deltaTime: number, cameraPosition: THREE.Vector3): void {
    this.breatheTimer += deltaTime;
    const breatheAlpha = (Math.sin(this.breatheTimer * Math.PI * 2 / this.BREATHE_PERIOD) + 1) / 2;
    const breatheOpacity = 0.8 + breatheAlpha * 0.2;
    
    for (const [, wall] of this.walls) {
      if (!wall.isDoor) {
        wall.material.opacity = 0.85 * breatheOpacity;
      }
    }
    
    this.updateParticleMotion(deltaTime, cameraPosition);
    this.updateDoorVortex(deltaTime, cameraPosition);
    this.updateAnimation(deltaTime);
    this.checkRoomEntry(cameraPosition);
  }

  private updateParticleMotion(deltaTime: number, cameraPosition: THREE.Vector3): void {
    const worldCamPos = cameraPosition.clone();
    
    for (const [, wall] of this.walls) {
      const positions = wall.geometry.attributes.position.array as Float32Array;
      const basePositions = wall.basePositions;
      
      const wallWorldPos = new THREE.Vector3();
      wall.points.getWorldPosition(wallWorldPos);
      
      const wallNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(wall.points.quaternion);
      
      const toCamera = new THREE.Vector3().subVectors(worldCamPos, wallWorldPos);
      const dist = Math.abs(toCamera.dot(wallNormal));
      
      const bulgeAmount = dist < 2 ? (1 - dist / 2) * 0.5 : 0;
      
      for (let i = 0; i < wall.particleCount; i++) {
        const i3 = i * 3;
        
        const brownianX = (Math.random() - 0.5) * 0.01;
        const brownianY = (Math.random() - 0.5) * 0.01;
        const brownianZ = (Math.random() - 0.5) * 0.01;
        
        positions[i3] = THREE.MathUtils.clamp(
          positions[i3] + brownianX,
          basePositions[i3] - 0.05,
          basePositions[i3] + 0.05
        );
        positions[i3 + 1] = THREE.MathUtils.clamp(
          positions[i3 + 1] + brownianY,
          basePositions[i3 + 1] - 0.05,
          basePositions[i3 + 1] + 0.05
        );
        positions[i3 + 2] = THREE.MathUtils.clamp(
          positions[i3 + 2] + brownianZ,
          basePositions[i3 + 2] - 0.05,
          basePositions[i3 + 2] + 0.05
        );
        
        if (bulgeAmount > 0) {
          const particleLocalPos = new THREE.Vector3(
            basePositions[i3],
            basePositions[i3 + 1],
            basePositions[i3 + 2]
          );
          const particleWorldPos = particleLocalPos.clone().applyMatrix4(wall.points.matrixWorld);
          const distToCamera = particleWorldPos.distanceTo(worldCamPos);
          
          if (distToCamera < 2) {
            const attractFactor = (1 - distToCamera / 2) * bulgeAmount * 0.3;
            positions[i3 + 2] = basePositions[i3 + 2] - attractFactor;
          }
        }
      }
      
      wall.geometry.attributes.position.needsUpdate = true;
    }
  }

  private updateDoorVortex(deltaTime: number, cameraPosition: THREE.Vector3): void {
    const doorWorldPos = new THREE.Vector3();
    this.doorWall.points.getWorldPosition(doorWorldPos);
    
    const distToDoor = cameraPosition.distanceTo(doorWorldPos);
    const wasNearDoor = this.isNearDoor;
    this.isNearDoor = distToDoor < 3;
    
    if (this.isNearDoor && !wasNearDoor) {
      this.doorVortexTimer = 0;
    }
    
    if (this.isNearDoor) {
      this.doorVortexTimer += deltaTime * 3;
      
      const positions = this.doorWall.geometry.attributes.position.array as Float32Array;
      const basePositions = this.doorWall.basePositions;
      
      for (let i = 0; i < this.doorWall.particleCount; i++) {
        const i3 = i * 3;
        const x = basePositions[i3];
        const y = basePositions[i3 + 1];
        
        const distFromCenter = Math.sqrt(x * x + (y - this.WALL_HEIGHT / 2) * (y - this.WALL_HEIGHT / 2));
        const vortexStrength = Math.max(0, 1 - distFromCenter / (ROOM_SIZE / 2));
        
        const angle = this.doorVortexTimer + distFromCenter * 0.5;
        const radius = vortexStrength * 0.3;
        
        positions[i3] = basePositions[i3] + Math.cos(angle) * radius;
        positions[i3 + 1] = basePositions[i3 + 1] + Math.sin(angle) * radius;
        positions[i3 + 2] = basePositions[i3 + 2] - vortexStrength * 0.2;
      }
      
      this.doorWall.geometry.attributes.position.needsUpdate = true;
      this.doorWall.material.opacity = 0.95;
    } else if (wasNearDoor) {
      const positions = this.doorWall.geometry.attributes.position.array as Float32Array;
      const basePositions = this.doorWall.basePositions;
      
      for (let i = 0; i < this.doorWall.particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = basePositions[i3];
        positions[i3 + 1] = basePositions[i3 + 1];
        positions[i3 + 2] = basePositions[i3 + 2];
      }
      
      this.doorWall.geometry.attributes.position.needsUpdate = true;
      this.doorWall.material.opacity = 0.9;
    }
  }

  private updateAnimation(deltaTime: number): void {
    if (this.animationState === 'idle') return;
    
    this.animationTimer += deltaTime;
    
    switch (this.animationState) {
      case 'rising':
        this.updateRising();
        break;
      case 'displaying':
        this.updateDisplaying();
        break;
      case 'fading':
        this.updateFading();
        break;
    }
  }

  private updateRising(): void {
    const progress = Math.min(1, this.animationTimer / this.RISE_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    for (const mesh of this.textMeshes) {
      const baseY = mesh.userData.baseY as number;
      const startY = -this.WALL_HEIGHT / 2 - 1;
      const targetY = baseY - 1;
      
      mesh.position.y = startY + (targetY - startY) * eased;
      mesh.material.opacity = eased;
    }
    
    if (this.convergeParticles) {
      this.convergeParticles.material.opacity = eased * 0.8;
      
      const positions = this.convergeParticles.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] *= 1 - deltaTime * 0.5;
        positions[i3 + 1] += deltaTime * 0.5;
        positions[i3 + 2] *= 1 - deltaTime * 0.5;
      }
      
      this.convergeParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    if (progress >= 1) {
      this.animationState = 'displaying';
      this.animationTimer = 0;
    }
  }

  private updateDisplaying(): void {
    if (this.convergeParticles) {
      this.convergeParticles.material.opacity *= 1 - deltaTime * 2;
    }
    
    if (this.animationTimer >= this.DISPLAY_DURATION) {
      this.animationState = 'fading';
      this.animationTimer = 0;
    }
  }

  private updateFading(): void {
    const progress = Math.min(1, this.animationTimer / this.FADE_DURATION);
    
    for (const mesh of this.textMeshes) {
      mesh.material.opacity = 1 - progress;
    }
    
    if (progress >= 1) {
      this.animationState = 'idle';
      this.animationTimer = 0;
      
      if (this.convergeParticles) {
        this.convergeParticles.material.opacity = 0;
      }
    }
  }

  private checkRoomEntry(cameraPosition: THREE.Vector3): void {
    const roomMinX = this.room.x - ROOM_SIZE / 2;
    const roomMaxX = this.room.x + ROOM_SIZE / 2;
    const roomMinZ = this.room.z - ROOM_SIZE / 2;
    const roomMaxZ = this.room.z + ROOM_SIZE / 2;
    
    const isInside = 
      cameraPosition.x >= roomMinX &&
      cameraPosition.x <= roomMaxX &&
      cameraPosition.z >= roomMinZ &&
      cameraPosition.z <= roomMaxZ;
    
    if (isInside && !this.hasEntered) {
      this.hasEntered = true;
      this.triggerMemoryAnimation();
    }
  }

  public triggerMemoryAnimation(): void {
    this.animationState = 'rising';
    this.animationTimer = 0;
    
    if (this.convergeParticles) {
      const positions = this.convergeParticles.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 2;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = -this.WALL_HEIGHT / 2 + Math.random() * this.WALL_HEIGHT;
        positions[i3 + 2] = Math.sin(angle) * radius;
      }
      
      this.convergeParticles.geometry.attributes.position.needsUpdate = true;
      this.convergeParticles.material.opacity = 0.8;
    }
    
    for (const mesh of this.textMeshes) {
      mesh.position.y = -this.WALL_HEIGHT / 2 - 1;
      mesh.material.opacity = 0;
    }
  }

  public replayAnimation(): void {
    if (this.hasEntered) {
      this.triggerMemoryAnimation();
    }
  }

  public getRoom(): Room {
    return this.room;
  }

  public isUserInside(cameraPosition: THREE.Vector3): boolean {
    const roomMinX = this.room.x - ROOM_SIZE / 2;
    const roomMaxX = this.room.x + ROOM_SIZE / 2;
    const roomMinZ = this.room.z - ROOM_SIZE / 2;
    const roomMaxZ = this.room.z + ROOM_SIZE / 2;
    
    return (
      cameraPosition.x >= roomMinX &&
      cameraPosition.x <= roomMaxX &&
      cameraPosition.z >= roomMinZ &&
      cameraPosition.z <= roomMaxZ
    );
  }

  public getCollisionBoxes(): THREE.Box3[] {
    const boxes: THREE.Box3[] = [];
    const halfSize = ROOM_SIZE / 2;
    
    for (const [side, wall] of this.walls) {
      if (wall.isDoor) continue;
      
      const worldPos = new THREE.Vector3();
      wall.points.getWorldPosition(worldPos);
      
      let minX = worldPos.x - halfSize;
      let maxX = worldPos.x + halfSize;
      let minZ = worldPos.z - 0.1;
      let maxZ = worldPos.z + 0.1;
      
      if (side === 'north' || side === 'south') {
        minZ = worldPos.z - 0.1;
        maxZ = worldPos.z + 0.1;
      } else {
        minX = worldPos.x - 0.1;
        maxX = worldPos.x + 0.1;
        minZ = worldPos.z - halfSize;
        maxZ = worldPos.z + halfSize;
      }
      
      boxes.push(new THREE.Box3(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, this.WALL_HEIGHT, maxZ)
      ));
    }
    
    return boxes;
  }

  public dispose(): void {
    for (const [, wall] of this.walls) {
      wall.geometry.dispose();
      wall.material.dispose();
    }
    
    for (const mesh of this.textMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
    }
    
    if (this.convergeParticles) {
      this.convergeParticles.geometry.dispose();
      this.convergeParticles.material.dispose();
    }
    
    this.scene.remove(this.group);
  }
}
