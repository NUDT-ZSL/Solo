import * as THREE from 'three';
import { ExcavationManager } from './excavation';

export type ArtifactType = '陶片' | '骨器' | '青铜器碎片' | '石器';
export type ArtifactEra = '新石器时代' | '商周' | '汉唐' | '宋元';
export type ArtifactMaterial = '陶土' | '骨质' | '青铜' | '石料';

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  era: ArtifactEra;
  material: ArtifactMaterial;
  position: { x: number; y: number; z: number };
  discovered: boolean;
  cleaned: boolean;
  identified: boolean;
  correct: boolean | null;
  score: number;
}

export interface DustParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const ARTIFACT_TYPES: ArtifactType[] = ['陶片', '骨器', '青铜器碎片', '石器'];
const ARTIFACT_ERAS: ArtifactEra[] = ['新石器时代', '商周', '汉唐', '宋元'];
const ARTIFACT_MATERIALS: ArtifactMaterial[] = ['陶土', '骨质', '青铜', '石料'];

const TYPE_TO_COLOR: Record<ArtifactType, number> = {
  '陶片': 0xB71C1C,
  '骨器': 0xD7CCC8,
  '青铜器碎片': 0x8D6E63,
  '石器': 0x9E9E9E
};

const TYPE_TO_MATERIAL: Record<ArtifactType, ArtifactMaterial> = {
  '陶片': '陶土',
  '骨器': '骨质',
  '青铜器碎片': '青铜',
  '石器': '石料'
};

export class ArtifactManager {
  private excavationManager: ExcavationManager;
  private artifacts: ArtifactData[] = [];
  private artifactMeshes: Map<string, THREE.Group> = new Map();
  private glowMeshes: Map<string, THREE.Mesh> = new Map();
  private dustParticles: Map<string, DustParticle[]> = new Map();
  private currentArtifact: ArtifactData | null = null;
  private isCleaningMode: boolean = false;
  private cleaningProgress: Map<string, number> = new Map();
  private audioContext: AudioContext | null = null;
  private brushCursor: HTMLDivElement | null = null;
  private onIdentificationNeededCallback: ((artifact: ArtifactData) => void) | null = null;
  private onCleaningCompleteCallback: ((artifact: ArtifactData) => void) | null = null;
  private onArtifactRevealedCallback: ((artifact: ArtifactData) => void) | null = null;
  private artifactCounter: number = 0;
  private isDragging: boolean = false;
  private lastCleanPos: THREE.Vector2 | null = null;

  private readonly ARTIFACT_HEIGHT = 0.015;
  private readonly ARTIFACT_RADIUS = 0.02;
  private readonly CLEAN_RADIUS = 0.05;
  private readonly GLOW_DISTANCE = 0.03;

  constructor(excavationManager: ExcavationManager) {
    this.excavationManager = excavationManager;
    this.excavationManager.onArtifactExposed(this.onArtifactExposed.bind(this));
    this.excavationManager.addAnimationCallback(this.update.bind(this));
    this.setupEventListeners();
    this.createBrushCursor();
  }

  private createBrushCursor(): void {
    this.brushCursor = document.createElement('div');
    this.brushCursor.style.cssText = `
      position: fixed;
      pointer-events: none;
      width: 50px;
      height: 50px;
      border: 2px solid rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transform: translate(-50%, -50%);
      z-index: 1000;
      display: none;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    `;
    
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      transform: translate(-50%, -50%);
    `;
    crosshair.innerHTML = `
      <div style="position:absolute;top:50%;left:0;width:100%;height:1px;background:rgba(255,255,255,0.9);"></div>
      <div style="position:absolute;top:0;left:50%;width:1px;height:100%;background:rgba(255,255,255,0.9);"></div>
    `;
    this.brushCursor.appendChild(crosshair);
    document.body.appendChild(this.brushCursor);
  }

  private setupEventListeners(): void {
    const canvas = this.excavationManager.getRenderer().domElement;

    canvas.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });

    canvas.addEventListener('mousedown', (e) => {
      if (this.isCleaningMode && e.button === 0) {
        this.isDragging = true;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
        this.lastCleanPos = null;
      }
    });

    canvas.addEventListener('click', (e) => {
      this.handleClick(e);
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.lastCleanPos = null;
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isCleaningMode && this.brushCursor) {
      this.brushCursor.style.left = event.clientX + 'px';
      this.brushCursor.style.top = event.clientY + 'px';
    }

    const raycaster = this.excavationManager.getRaycaster();
    const mouse = this.excavationManager.getMouse();
    const camera = this.excavationManager.getCamera();
    const renderer = this.excavationManager.getRenderer();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    let closestArtifact: ArtifactData | null = null;
    let closestDist = Infinity;

    for (const artifact of this.artifacts) {
      if (!artifact.discovered || artifact.cleaned) continue;
      
      const mesh = this.artifactMeshes.get(artifact.id);
      if (!mesh) continue;

      const screenPos = mesh.position.clone().project(camera);
      const mouseWorldPos = new THREE.Vector3(mouse.x, mouse.y, screenPos.z).unproject(camera);
      const dist = mesh.position.distanceTo(mouseWorldPos);

      if (dist < this.GLOW_DISTANCE * 3 && dist < closestDist) {
        closestDist = dist;
        closestArtifact = artifact;
      }
    }

    for (const [id, glowMesh] of this.glowMeshes) {
      const artifact = this.artifacts.find(a => a.id === id);
      if (artifact && closestArtifact && artifact.id === closestArtifact.id) {
        glowMesh.visible = true;
      } else {
        glowMesh.visible = false;
      }
    }

    if (this.isCleaningMode && this.isDragging && this.currentArtifact) {
      const artifactMesh = this.artifactMeshes.get(this.currentArtifact.id);
      if (artifactMesh) {
        const intersects = raycaster.intersectObject(artifactMesh, true);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          this.applyCleaning(this.currentArtifact, point, event);
        }
      }
    }
  }

  private handleClick(event: MouseEvent): void {
    if (this.isCleaningMode) return;

    const raycaster = this.excavationManager.getRaycaster();
    const mouse = this.excavationManager.getMouse();
    const camera = this.excavationManager.getCamera();
    const renderer = this.excavationManager.getRenderer();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    for (const artifact of this.artifacts) {
      if (!artifact.discovered || artifact.cleaned) continue;

      const mesh = this.artifactMeshes.get(artifact.id);
      if (!mesh) continue;

      const intersects = raycaster.intersectObject(mesh, true);
      if (intersects.length > 0) {
        this.startCleaning(artifact);
        return;
      }
    }
  }

  private onArtifactExposed(x: number, z: number, depth: number): void {
    const type = ARTIFACT_TYPES[Math.floor(Math.random() * ARTIFACT_TYPES.length)];
    const era = ARTIFACT_ERAS[Math.floor(Math.random() * ARTIFACT_ERAS.length)];
    const material = TYPE_TO_MATERIAL[type];

    this.artifactCounter++;
    const id = `W-${String(this.artifactCounter).padStart(3, '0')}`;

    const artifact: ArtifactData = {
      id,
      type,
      era,
      material,
      position: { x, y: -depth + this.ARTIFACT_HEIGHT * 0.3, z },
      discovered: true,
      cleaned: false,
      identified: false,
      correct: null,
      score: 0
    };

    this.artifacts.push(artifact);
    this.createArtifactMesh(artifact);

    if (this.onArtifactRevealedCallback) {
      this.onArtifactRevealedCallback(artifact);
    }
  }

  private createArtifactMesh(artifact: ArtifactData): void {
    const group = new THREE.Group();

    const bodyGeom = new THREE.ConeGeometry(this.ARTIFACT_RADIUS, this.ARTIFACT_HEIGHT, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: TYPE_TO_COLOR[artifact.type],
      roughness: 0.7,
      metalness: artifact.type === '青铜器碎片' ? 0.6 : 0.1,
      side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI;
    body.position.y = this.ARTIFACT_HEIGHT / 2;
    body.castShadow = true;
    group.add(body);

    const linesGeom = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const startR = Math.random() * this.ARTIFACT_RADIUS * 0.8;
      const endR = startR + 0.002 + Math.random() * 0.005;
      const yPos = Math.random() * this.ARTIFACT_HEIGHT * 0.6;
      
      linePositions.push(
        Math.cos(angle) * startR, yPos, Math.sin(angle) * startR,
        Math.cos(angle) * endR, yPos + 0.001, Math.sin(angle) * endR
      );
    }
    linesGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const linesMat = new THREE.LineBasicMaterial({ 
      color: 0x3E2723, 
      transparent: true, 
      opacity: 0 
    });
    const lines = new THREE.LineSegments(linesGeom, linesMat);
    lines.rotation.x = Math.PI;
    lines.position.y = this.ARTIFACT_HEIGHT / 2;
    lines.name = 'decorLines';
    group.add(lines);

    const dustGroup = new THREE.Group();
    dustGroup.name = 'dustGroup';
    const dustParticles: DustParticle[] = [];
    
    for (let i = 0; i < 20; i++) {
      const dustGeom = new THREE.SphereGeometry(0.001 + Math.random() * 0.001, 4, 4);
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0x8D6E63,
        transparent: true,
        opacity: 0.8
      });
      const dust = new THREE.Mesh(dustGeom, dustMat);
      
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.ARTIFACT_RADIUS * 0.9;
      const y = Math.random() * this.ARTIFACT_HEIGHT * 0.7;
      
      dust.position.set(
        Math.cos(angle) * r,
        this.ARTIFACT_HEIGHT / 2 + y,
        Math.sin(angle) * r
      );
      dust.rotation.x = Math.PI;
      dustGroup.add(dust);
      
      dustParticles.push({
        mesh: dust,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          0.005 + Math.random() * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        life: 0.4,
        maxLife: 0.4
      });
    }
    group.add(dustGroup);
    this.dustParticles.set(artifact.id, dustParticles);

    group.position.set(artifact.position.x, artifact.position.y, artifact.position.z);
    group.scale.set(1, 0.3, 1);
    group.rotation.y = Math.random() * Math.PI;

    this.excavationManager.getScene().add(group);
    this.artifactMeshes.set(artifact.id, group);
    this.cleaningProgress.set(artifact.id, 0);

    const glowGeom = new THREE.ConeGeometry(this.ARTIFACT_RADIUS * 1.5, this.ARTIFACT_HEIGHT * 0.5, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFD54F,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.rotation.x = Math.PI;
    glow.position.set(artifact.position.x, artifact.position.y + this.ARTIFACT_HEIGHT * 0.15, artifact.position.z);
    glow.visible = false;
    glow.scale.set(1, 0.3, 1);
    this.excavationManager.getScene().add(glow);
    this.glowMeshes.set(artifact.id, glow);
  }

  private startCleaning(artifact: ArtifactData): void {
    this.currentArtifact = artifact;
    this.isCleaningMode = true;
    this.excavationManager.getControls().enabled = false;
    
    if (this.brushCursor) {
      this.brushCursor.style.display = 'block';
    }

    if (this.onCleaningStartCallback) {
      this.onCleaningStartCallback(artifact);
    }
  }

  private onCleaningStartCallback: ((artifact: ArtifactData) => void) | null = null;

  public onCleaningStart(callback: (artifact: ArtifactData) => void): void {
    this.onCleaningStartCallback = callback;
  }

  private applyCleaning(artifact: ArtifactData, point: THREE.Vector3, event: MouseEvent): void {
    const currentPos = new THREE.Vector2(event.clientX, event.clientY);
    
    if (this.lastCleanPos) {
      const dist = currentPos.distanceTo(this.lastCleanPos);
      if (dist < 2) return;
    }
    
    this.lastCleanPos = currentPos;

    const progress = this.cleaningProgress.get(artifact.id) || 0;
    const increment = 0.02;
    const newProgress = Math.min(1, progress + increment);
    this.cleaningProgress.set(artifact.id, newProgress);

    const dust = this.dustParticles.get(artifact.id);
    if (dust) {
      const toDisperse = Math.ceil(dust.length * 0.1);
      for (let i = 0; i < toDisperse && dust.length > 0; i++) {
        const idx = Math.floor(Math.random() * dust.length);
        const particle = dust[idx];
        particle.mesh.visible = true;
        dust.splice(idx, 1);
      }
    }

    if (this.onCleaningProgressCallback) {
      this.onCleaningProgressCallback(artifact, newProgress);
    }

    if (newProgress >= 1 && !artifact.cleaned) {
      this.completeCleaning(artifact);
    }
  }

  private onCleaningProgressCallback: ((artifact: ArtifactData, progress: number) => void) | null = null;

  public onCleaningProgress(callback: (artifact: ArtifactData, progress: number) => void): void {
    this.onCleaningProgressCallback = callback;
  }

  private completeCleaning(artifact: ArtifactData): void {
    artifact.cleaned = true;
    this.isCleaningMode = false;
    this.currentArtifact = null;
    this.excavationManager.getControls().enabled = true;

    if (this.brushCursor) {
      this.brushCursor.style.display = 'none';
    }

    const group = this.artifactMeshes.get(artifact.id);
    if (group) {
      const dustGroup = group.getObjectByName('dustGroup');
      if (dustGroup) {
        dustGroup.visible = false;
      }
      const decorLines = group.getObjectByName('decorLines') as THREE.LineSegments;
      if (decorLines && decorLines.material) {
        const mat = decorLines.material as THREE.LineBasicMaterial;
        mat.transparent = true;
        mat.opacity = 0.6;
      }
      group.scale.set(1, 1, 1);
      group.position.y = artifact.position.y + this.ARTIFACT_HEIGHT * 0.2;
    }

    const glow = this.glowMeshes.get(artifact.id);
    if (glow) {
      glow.visible = false;
    }

    this.playBellSound();

    if (this.onCleaningCompleteCallback) {
      this.onCleaningCompleteCallback(artifact);
    }

    setTimeout(() => {
      if (this.onIdentificationNeededCallback) {
        this.onIdentificationNeededCallback(artifact);
      }
    }, 500);
  }

  private playBellSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, this.audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  private update(delta: number): void {
    const time = Date.now() * 0.001;
    
    for (const [id, glowMesh] of this.glowMeshes) {
      if (glowMesh.visible) {
        const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 0.6);
        (glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.3;
        glowMesh.scale.setScalar(1 + pulse * 0.1);
      }
    }

    for (const [id, particles] of this.dustParticles) {
      for (const p of particles) {
        if (p.life < p.maxLife) {
          p.life -= delta;
          p.mesh.position.add(p.velocity.clone().multiplyScalar(delta * 60));
          p.velocity.y -= 0.001;
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.maxLife) * 0.8;
          
          if (p.life <= 0) {
            p.mesh.visible = false;
          }
        }
      }
    }
  }

  public onIdentificationNeeded(callback: (artifact: ArtifactData) => void): void {
    this.onIdentificationNeededCallback = callback;
  }

  public onCleaningComplete(callback: (artifact: ArtifactData) => void): void {
    this.onCleaningCompleteCallback = callback;
  }

  public onArtifactRevealed(callback: (artifact: ArtifactData) => void): void {
    this.onArtifactRevealedCallback = callback;
  }

  public submitIdentification(artifactId: string, type: ArtifactType, era: ArtifactEra, material: ArtifactMaterial): boolean {
    const artifact = this.artifacts.find(a => a.id === artifactId);
    if (!artifact) return false;

    artifact.identified = true;
    const isCorrect = artifact.type === type && artifact.era === era && artifact.material === material;
    artifact.correct = isCorrect;
    artifact.score = isCorrect ? 10 : -5;

    if (!isCorrect) {
      this.reBuryArtifact(artifact);
    }

    return isCorrect;
  }

  private reBuryArtifact(artifact: ArtifactData): void {
    const group = this.artifactMeshes.get(artifact.id);
    if (group) {
      group.scale.set(1, 0.3, 1);
      group.position.y = artifact.position.y;
      
      const dustGroup = group.getObjectByName('dustGroup');
      if (dustGroup) {
        dustGroup.visible = true;
      }
      const decorLines = group.getObjectByName('decorLines') as THREE.LineSegments;
      if (decorLines && decorLines.material) {
        const mat = decorLines.material as THREE.LineBasicMaterial;
        mat.opacity = 0;
      }
    }

    artifact.cleaned = false;
    this.cleaningProgress.set(artifact.id, 0);
  }

  public getArtifacts(): ArtifactData[] {
    return [...this.artifacts];
  }

  public getArtifactById(id: string): ArtifactData | undefined {
    return this.artifacts.find(a => a.id === id);
  }

  public getDiscoveredCount(): number {
    return this.artifacts.filter(a => a.discovered).length;
  }

  public getArtifactMesh(id: string): THREE.Group | undefined {
    return this.artifactMeshes.get(id);
  }

  public exitCleaningMode(): void {
    this.isCleaningMode = false;
    this.currentArtifact = null;
    this.excavationManager.getControls().enabled = true;
    if (this.brushCursor) {
      this.brushCursor.style.display = 'none';
    }
  }

  public isInCleaningMode(): boolean {
    return this.isCleaningMode;
  }
}
