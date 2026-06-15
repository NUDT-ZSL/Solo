import * as THREE from 'three';
import { Constellation, CONSTELLATIONS } from './constellationData';

export interface StarObject {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  constellationId: string;
  starId: string;
  highlighted: boolean;
}

export interface LineObject {
  line: THREE.Line;
  from: string;
  to: string;
  constellationId: string;
  permanent: boolean;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
}

export interface MythIcon {
  sprite: THREE.Sprite;
  constellationId: string;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private starObjects: Map<string, StarObject> = new Map();
  private lineObjects: LineObject[] = [];
  private particles: Particle[] = [];
  private mythIcons: Map<string, MythIcon> = new Map();
  private selectedStar: StarObject | null = null;
  private currentConstellationId: string | null = null;
  private completedConstellations: Set<string> = new Set();
  private connectedEdges: Map<string, Set<string>> = new Map();
  private onConstellationComplete: ((constellationId: string) => void) | null = null;
  private onMythIconClick: ((constellationId: string) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.initializeStars();
  }

  private initializeStars(): void {
    CONSTELLATIONS.forEach(constellation => {
      constellation.stars.forEach(star => {
        const starGeometry = new THREE.SphereGeometry(0.3 * star.brightness, 16, 16);
        const starMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.7
        });
        const starMesh = new THREE.Mesh(starGeometry, starMaterial);
        starMesh.position.copy(star.position);
        this.scene.add(starMesh);

        const haloGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
        const haloMaterial = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
        });
        const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
        haloMesh.position.copy(star.position);
        this.scene.add(haloMesh);

        this.starObjects.set(`${constellation.id}-${star.id}`, {
          mesh: starMesh,
          halo: haloMesh,
          constellationId: constellation.id,
          starId: star.id,
          highlighted: false
        });
      });

      this.connectedEdges.set(constellation.id, new Set());
    });
  }

  public setCurrentConstellation(constellationId: string | null): void {
    this.currentConstellationId = constellationId;
    this.selectedStar = null;

    this.starObjects.forEach(starObj => {
      if (starObj.constellationId === constellationId) {
        this.highlightStar(starObj);
      } else {
        this.unhighlightStar(starObj);
      }
    });
  }

  private highlightStar(starObj: StarObject): void {
    starObj.highlighted = true;
    const material = starObj.mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(0xffd700);
    material.opacity = 1.0;
  }

  private unhighlightStar(starObj: StarObject): void {
    starObj.highlighted = false;
    const material = starObj.mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(0xffffff);
    material.opacity = 0.7;
    const haloMaterial = starObj.halo.material as THREE.MeshBasicMaterial;
    haloMaterial.opacity = 0;
  }

  public handleClick(event: MouseEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const mythSpriteMeshes = Array.from(this.mythIcons.values()).map(icon => icon.sprite);
    const mythIntersects = this.raycaster.intersectObjects(mythSpriteMeshes);
    if (mythIntersects.length > 0) {
      const clickedSprite = mythIntersects[0].object as THREE.Sprite;
      const mythIcon = Array.from(this.mythIcons.values()).find(icon => icon.sprite === clickedSprite);
      if (mythIcon && this.onMythIconClick) {
        this.onMythIconClick(mythIcon.constellationId);
        return;
      }
    }

    const starMeshes = Array.from(this.starObjects.values())
      .filter(s => s.highlighted)
      .map(s => s.mesh);
    const intersects = this.raycaster.intersectObjects(starMeshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const starObj = Array.from(this.starObjects.values()).find(s => s.mesh === clickedMesh);
      if (starObj) {
        this.handleStarClick(starObj);
      }
    }
  }

  private handleStarClick(starObj: StarObject): void {
    if (!this.currentConstellationId) return;

    if (!this.selectedStar) {
      this.selectedStar = starObj;
      this.pulseStar(starObj);
      return;
    }

    if (this.selectedStar === starObj) {
      this.selectedStar = null;
      return;
    }

    const isConnected = this.tryConnectStars(this.selectedStar, starObj);
    this.selectedStar = null;

    if (isConnected) {
      this.checkConstellationComplete(starObj.constellationId);
    }
  }

  private pulseStar(starObj: StarObject): void {
    const material = starObj.mesh.material as THREE.MeshBasicMaterial;
    const originalScale = starObj.mesh.scale.x;
    let t = 0;
    const pulseDuration = 0.3;
    const startTime = performance.now();

    const animate = () => {
      t = (performance.now() - startTime) / 1000;
      if (t < pulseDuration) {
        const scale = originalScale * (1 + 0.3 * Math.sin(t * Math.PI / pulseDuration));
        starObj.mesh.scale.setScalar(scale);
        requestAnimationFrame(animate);
      } else {
        starObj.mesh.scale.setScalar(originalScale);
      }
    };
    animate();
  }

  private tryConnectStars(star1: StarObject, star2: StarObject): boolean {
    if (star1.constellationId !== star2.constellationId) return false;

    const constellation = CONSTELLATIONS.find(c => c.id === star1.constellationId);
    if (!constellation) return false;

    const isEdge = constellation.edges.some(
      e => (e.from === star1.starId && e.to === star2.starId) ||
           (e.from === star2.starId && e.to === star1.starId)
    );

    if (!isEdge) return false;

    const edgeKey = this.getEdgeKey(star1.starId, star2.starId);
    const connectedSet = this.connectedEdges.get(star1.constellationId);
    if (connectedSet && connectedSet.has(edgeKey)) return false;

    this.createGlowingLine(star1, star2, constellation);
    connectedSet?.add(edgeKey);
    return true;
  }

  private getEdgeKey(id1: string, id2: string): string {
    return [id1, id2].sort().join('-');
  }

  private createGlowingLine(star1: StarObject, star2: StarObject, constellation: Constellation): void {
    const points = [star1.mesh.position.clone(), star2.mesh.position.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const glowMaterial = new THREE.LineBasicMaterial({
      color: 0xe0e7ff,
      transparent: true,
      opacity: 1,
      linewidth: 2
    });

    const glowLine = new THREE.Line(geometry, glowMaterial);
    this.scene.add(glowLine);

    const tempLineObj: LineObject = {
      line: glowLine,
      from: star1.starId,
      to: star2.starId,
      constellationId: constellation.id,
      permanent: false
    };
    this.lineObjects.push(tempLineObj);

    let t = 0;
    const duration = 500;
    const startTime = performance.now();

    const animateGlow = () => {
      t = performance.now() - startTime;
      const progress = t / duration;

      if (progress < 1) {
        glowMaterial.opacity = 1 - progress * 0.5;
        requestAnimationFrame(animateGlow);
      } else {
        this.scene.remove(glowLine);
        glowMaterial.dispose();
        geometry.dispose();

        this.lineObjects = this.lineObjects.filter(lo => lo !== tempLineObj);
        this.createPermanentLine(star1, star2, constellation);
      }
    };
    animateGlow();
  }

  private createPermanentLine(star1: StarObject, star2: StarObject, constellation: Constellation): void {
    const points = [star1.mesh.position.clone(), star2.mesh.position.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0x9ca3af,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.lineObjects.push({
      line,
      from: star1.starId,
      to: star2.starId,
      constellationId: constellation.id,
      permanent: true
    });
  }

  private checkConstellationComplete(constellationId: string): void {
    const constellation = CONSTELLATIONS.find(c => c.id === constellationId);
    if (!constellation) return;

    const connectedSet = this.connectedEdges.get(constellationId);
    if (!connectedSet) return;

    if (connectedSet.size >= constellation.edges.length) {
      this.completedConstellations.add(constellationId);
      this.createFireworks(constellation.center);
      this.createMythIcon(constellation);

      if (this.onConstellationComplete) {
        this.onConstellationComplete(constellationId);
      }
    }
  }

  private createFireworks(center: THREE.Vector3): void {
    const colors = [0xff6b6b, 0xffa07a, 0xffd93d, 0x6bcb77, 0x4ecdc4, 0x96ceb4];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 8, 8);
      const colorIndex = Math.floor(Math.random() * colors.length);
      const material = new THREE.MeshBasicMaterial({
        color: colors[colorIndex],
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 10 + Math.random() * 20;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle) * speed,
        Math.sin(phi) * Math.sin(angle) * speed,
        Math.cos(phi) * speed
      );

      const life = 1.5 + Math.random() * 0.5;
      this.particles.push({
        mesh,
        velocity,
        life,
        maxLife: life,
        startColor: new THREE.Color(colors[colorIndex]),
        endColor: new THREE.Color(0x0a0a12)
      });
    }
  }

  private createMythIcon(constellation: Constellation): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(30, 41, 82, 0.9)');
    gradient.addColorStop(1, 'rgba(10, 10, 18, 0.7)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 168, 83, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 120px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#D4A853';
    ctx.fillText(constellation.symbol, 128, 135);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(constellation.center);
    sprite.position.y += 12;
    sprite.scale.set(15, 15, 1);
    this.scene.add(sprite);

    this.mythIcons.set(constellation.id, {
      sprite,
      constellationId: constellation.id
    });

    let t = 0;
    const duration = 1000;
    const startTime = performance.now();

    const fadeIn = () => {
      t = performance.now() - startTime;
      const progress = Math.min(t / duration, 1);
      material.opacity = progress;
      sprite.scale.setScalar(15 * (0.5 + 0.5 * progress));

      if (progress < 1) {
        requestAnimationFrame(fadeIn);
      }
    };
    fadeIn();
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.starObjects.forEach(starObj => {
      if (starObj.highlighted) {
        const haloMaterial = starObj.halo.material as THREE.MeshBasicMaterial;
        const pulse = 0.3 + 0.4 * Math.abs(Math.sin(elapsedTime * 4));
        haloMaterial.opacity = pulse;
        const haloScale = 1 + 0.5 * Math.sin(elapsedTime * 4);
        starObj.halo.scale.setScalar(haloScale);
      }
    });

    this.particles = this.particles.filter(particle => {
      particle.life -= deltaTime;
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        return false;
      }

      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      particle.velocity.y -= 5 * deltaTime;

      const progress = 1 - particle.life / particle.maxLife;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - progress;
      material.color.lerpColors(particle.startColor, particle.endColor, progress);
      particle.mesh.scale.setScalar(1 - 0.5 * progress);

      return true;
    });

    this.mythIcons.forEach(icon => {
      icon.sprite.material.opacity = 0.8 + 0.2 * Math.sin(elapsedTime * 2);
    });
  }

  public resetAll(): void {
    this.lineObjects.forEach(lineObj => {
      this.scene.remove(lineObj.line);
      lineObj.line.geometry.dispose();
      (lineObj.line.material as THREE.Material).dispose();
    });
    this.lineObjects = [];

    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];

    this.mythIcons.forEach(icon => {
      this.scene.remove(icon.sprite);
      icon.sprite.geometry.dispose();
      (icon.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.mythIcons.clear();

    this.selectedStar = null;
    this.currentConstellationId = null;
    this.completedConstellations.clear();
    this.connectedEdges.clear();
    CONSTELLATIONS.forEach(c => this.connectedEdges.set(c.id, new Set()));

    this.starObjects.forEach(starObj => this.unhighlightStar(starObj));
  }

  public isConstellationCompleted(id: string): boolean {
    return this.completedConstellations.has(id);
  }

  public setOnConstellationComplete(callback: (id: string) => void): void {
    this.onConstellationComplete = callback;
  }

  public setOnMythIconClick(callback: (id: string) => void): void {
    this.onMythIconClick = callback;
  }

  public getStarObjects(): Map<string, StarObject> {
    return this.starObjects;
  }

  public getLineObjects(): LineObject[] {
    return this.lineObjects;
  }
}
