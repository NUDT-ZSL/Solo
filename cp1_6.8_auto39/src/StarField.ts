import * as THREE from 'three';

const SENTIMENT_COLORS: Record<string, number> = {
  positive: 0xffd56b,
  neutral: 0x7eb8ff,
  negative: 0xb07aff,
};

const SENTIMENT_GRADIENT: Record<string, [number, number]> = {
  positive: [0xffd56b, 0xff7eb3],
  neutral: [0x7eb8ff, 0xb07aff],
  negative: [0xb07aff, 0x5a2d82],
};

interface StarData {
  id: string;
  content: string;
  emoji: string;
  sentiment: string;
  created_at: string;
  resonance_count: number;
  has_resonance?: boolean;
  user_id: string;
}

interface StarObject {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  data: StarData;
  baseScale: number;
  targetScale: number;
  breathPhase: number;
  breathSpeed: number;
  driftX: number;
  driftY: number;
  driftZ: number;
  hovered: boolean;
  particles: Particle[];
  isBursting: boolean;
  burstTime: number;
  resonanceAnim: ResonanceAnim | null;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ResonanceAnim {
  shadowStar: THREE.Mesh;
  shadowGlow: THREE.Mesh;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  duration: number;
}

type HoverCallback = (data: StarData | null, x: number, y: number) => void;
type ClickCallback = (data: StarData) => void;

export class StarField {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stars: StarObject[] = [];
  private backgroundStars: THREE.Points;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private container: HTMLElement;
  private animationId: number = 0;
  private clock = new THREE.Clock();
  private hoveredStar: StarObject | null = null;
  private onHover: HoverCallback;
  private onClick: ClickCallback;
  private isMobile: boolean;
  private baseStarSize: number;
  private frameCount = 0;
  private lastFpsTime = 0;

  constructor(
    container: HTMLElement,
    onHover: HoverCallback,
    onClick: ClickCallback
  ) {
    this.container = container;
    this.onHover = onHover;
    this.onClick = onClick;
    this.isMobile = window.innerWidth < 768;
    this.baseStarSize = this.isMobile ? 0.35 : 0.5;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 30;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.backgroundStars = this.createBackgroundStars();
    this.scene.add(this.backgroundStars);

    window.addEventListener('resize', this.onResize);
    container.addEventListener('mousemove', this.onMouseMove);
    container.addEventListener('click', this.onMouseClick);
    container.addEventListener('touchstart', this.onTouchStart, { passive: true });
    container.addEventListener('touchend', this.onTouchEnd);
  }

  private createBackgroundStars(): THREE.Points {
    const count = this.isMobile ? 800 : 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 120;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = (Math.random() - 0.5) * 60 - 10;

      const brightness = 0.3 + Math.random() * 0.7;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness + Math.random() * 0.1;

      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  addStar(data: StarData): void {
    const color = SENTIMENT_COLORS[data.sentiment] || SENTIMENT_COLORS.neutral;
    const size = this.baseStarSize;

    const position = this.findFreePosition();

    const starGeometry = new THREE.SphereGeometry(size, 16, 16);
    const starMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(starGeometry, starMaterial);
    mesh.position.copy(position);

    const glowSize = size * 3;
    const glowGeometry = new THREE.SphereGeometry(glowSize, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);

    this.scene.add(mesh);
    this.scene.add(glow);

    const starObj: StarObject = {
      mesh,
      glow,
      data,
      baseScale: 1,
      targetScale: 1,
      breathPhase: Math.random() * Math.PI * 2,
      breathSpeed: 0.8 + Math.random() * 0.6,
      driftX: (Math.random() - 0.5) * 0.003,
      driftY: (Math.random() - 0.5) * 0.003,
      driftZ: (Math.random() - 0.5) * 0.001,
      hovered: false,
      particles: [],
      isBursting: false,
      burstTime: 0,
      resonanceAnim: null,
    };

    this.stars.push(starObj);
  }

  private findFreePosition(): THREE.Vector3 {
    const range = this.isMobile ? 18 : 25;
    const rangeY = this.isMobile ? 12 : 16;
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = (Math.random() - 0.5) * range;
      const y = (Math.random() - 0.5) * rangeY;
      const z = (Math.random() - 0.5) * 10 - 5;

      let tooClose = false;
      for (const star of this.stars) {
        const dist = star.mesh.position.distanceTo(new THREE.Vector3(x, y, z));
        if (dist < 2.5) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        return new THREE.Vector3(x, y, z);
      }
    }

    return new THREE.Vector3(
      (Math.random() - 0.5) * range,
      (Math.random() - 0.5) * rangeY,
      (Math.random() - 0.5) * 10 - 5
    );
  }

  triggerBurst(starId: string): void {
    const star = this.stars.find((s) => s.data.id === starId);
    if (!star || star.isBursting) return;

    star.isBursting = true;
    star.burstTime = 0;

    const color = SENTIMENT_COLORS[star.data.sentiment] || SENTIMENT_COLORS.neutral;
    const particleCount = this.isMobile ? 12 : 20;

    for (let i = 0; i < particleCount; i++) {
      const pSize = 0.06 + Math.random() * 0.06;
      const pGeom = new THREE.SphereGeometry(pSize, 6, 6);
      const pMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.position.copy(star.mesh.position);
      this.scene.add(pMesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 4;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      star.particles.push({
        mesh: pMesh,
        velocity,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
      });
    }
  }

  triggerResonance(starId: string): void {
    const star = this.stars.find((s) => s.data.id === starId);
    if (!star) return;

    const color = SENTIMENT_COLORS[star.data.sentiment] || SENTIMENT_COLORS.neutral;

    const startPos = new THREE.Vector3(
      star.mesh.position.x + (Math.random() - 0.5) * 10,
      star.mesh.position.y + 5 + Math.random() * 5,
      star.mesh.position.z + 3
    );

    const shadowGeom = new THREE.SphereGeometry(this.baseStarSize * 0.6, 12, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x7eb8ff,
      transparent: true,
      opacity: 0.7,
    });
    const shadowStar = new THREE.Mesh(shadowGeom, shadowMat);
    shadowStar.position.copy(startPos);
    this.scene.add(shadowStar);

    const shadowGlowGeom = new THREE.SphereGeometry(this.baseStarSize * 1.5, 12, 12);
    const shadowGlowMat = new THREE.MeshBasicMaterial({
      color: 0x7eb8ff,
      transparent: true,
      opacity: 0.1,
    });
    const shadowGlow = new THREE.Mesh(shadowGlowGeom, shadowGlowMat);
    shadowGlow.position.copy(startPos);
    this.scene.add(shadowGlow);

    star.resonanceAnim = {
      shadowStar,
      shadowGlow,
      startPos,
      targetPos: star.mesh.position.clone(),
      progress: 0,
      duration: 1.2,
    };
  }

  updateStarColor(starId: string, sentiment: string, hasResonance: boolean): void {
    const star = this.stars.find((s) => s.data.id === starId);
    if (!star) return;

    if (hasResonance) {
      const gradient = SENTIMENT_GRADIENT[sentiment] || SENTIMENT_GRADIENT.neutral;
      const color1 = new THREE.Color(gradient[0]);
      const color2 = new THREE.Color(gradient[1]);
      const blended = color1.clone().lerp(color2, 0.5);
      (star.mesh.material as THREE.MeshBasicMaterial).color.copy(blended);
      (star.glow.material as THREE.MeshBasicMaterial).color.copy(blended);
    } else {
      const color = SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.neutral;
      (star.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (star.glow.material as THREE.MeshBasicMaterial).color.setHex(color);
    }
  }

  removeStar(starId: string): void {
    const idx = this.stars.findIndex((s) => s.data.id === starId);
    if (idx === -1) return;

    const star = this.stars[idx];
    this.scene.remove(star.mesh);
    this.scene.remove(star.glow);
    star.mesh.geometry.dispose();
    (star.mesh.material as THREE.Material).dispose();
    star.glow.geometry.dispose();
    (star.glow.material as THREE.Material).dispose();

    for (const p of star.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }

    if (star.resonanceAnim) {
      this.scene.remove(star.resonanceAnim.shadowStar);
      this.scene.remove(star.resonanceAnim.shadowGlow);
      star.resonanceAnim.shadowStar.geometry.dispose();
      (star.resonanceAnim.shadowStar.material as THREE.Material).dispose();
      star.resonanceAnim.shadowGlow.geometry.dispose();
      (star.resonanceAnim.shadowGlow.material as THREE.Material).dispose();
    }

    this.stars.splice(idx, 1);
  }

  private onResize = (): void => {
    this.isMobile = window.innerWidth < 768;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.checkHover(event.clientX, event.clientY);
  };

  private onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  };

  private onTouchEnd = (event: TouchEvent): void => {
    if (this.stars.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.stars.map((s) => s.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const star = this.stars.find((s) => s.mesh === intersects[0].object);
      if (star) {
        this.onClick(star.data);
      }
    }
  };

  private onMouseClick = (): void => {
    if (this.hoveredStar) {
      this.onClick(this.hoveredStar.data);
    }
  };

  private checkHover(clientX: number, clientY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.stars.map((s) => s.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    let newHovered: StarObject | null = null;

    if (intersects.length > 0) {
      newHovered = this.stars.find((s) => s.mesh === intersects[0].object) || null;
    }

    if (this.hoveredStar && this.hoveredStar !== newHovered) {
      this.hoveredStar.hovered = false;
      this.hoveredStar.targetScale = 1;
      this.onHover(null, 0, 0);
    }

    if (newHovered) {
      newHovered.hovered = true;
      newHovered.targetScale = 1.5;
      this.onHover(newHovered.data, clientX, clientY);
    }

    this.hoveredStar = newHovered;
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('click', this.onMouseClick);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchend', this.onTouchEnd);
    this.renderer.dispose();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.frameCount++;
    if (elapsed - this.lastFpsTime >= 1) {
      this.lastFpsTime = elapsed;
      this.frameCount = 0;
    }

    if (this.backgroundStars) {
      this.backgroundStars.rotation.y += 0.0001;
      this.backgroundStars.rotation.x += 0.00005;
    }

    for (const star of this.stars) {
      this.updateStar(star, delta, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateStar(star: StarObject, delta: number, elapsed: number): void {
    star.mesh.position.x += star.driftX;
    star.mesh.position.y += star.driftY;
    star.mesh.position.z += star.driftZ;

    const boundary = this.isMobile ? 18 : 25;
    const boundaryY = this.isMobile ? 12 : 16;
    if (Math.abs(star.mesh.position.x) > boundary) star.driftX *= -1;
    if (Math.abs(star.mesh.position.y) > boundaryY) star.driftY *= -1;
    if (Math.abs(star.mesh.position.z) > 10) star.driftZ *= -1;

    star.glow.position.copy(star.mesh.position);

    const breathScale = 1 + Math.sin(elapsed * star.breathSpeed + star.breathPhase) * 0.1;
    const currentScale = star.baseScale + (star.targetScale - star.baseScale) * 0.1;
    star.baseScale = currentScale;
    const finalScale = currentScale * breathScale;

    star.mesh.scale.setScalar(finalScale);
    star.glow.scale.setScalar(finalScale * 1.2);

    const glowMaterial = star.glow.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = 0.08 + Math.sin(elapsed * star.breathSpeed + star.breathPhase) * 0.04;

    if (star.isBursting) {
      star.burstTime += delta;
      if (star.burstTime > 1.5) {
        star.isBursting = false;
      }
    }

    for (let i = star.particles.length - 1; i >= 0; i--) {
      const p = star.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        star.particles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.96);

      const pMat = p.mesh.material as THREE.MeshBasicMaterial;
      pMat.opacity = 1 - t;
      p.mesh.scale.setScalar(1 - t * 0.5);
    }

    if (star.resonanceAnim) {
      const anim = star.resonanceAnim;
      anim.progress += delta / anim.duration;

      if (anim.progress >= 1) {
        this.scene.remove(anim.shadowStar);
        this.scene.remove(anim.shadowGlow);
        anim.shadowStar.geometry.dispose();
        (anim.shadowStar.material as THREE.Material).dispose();
        anim.shadowGlow.geometry.dispose();
        (anim.shadowGlow.material as THREE.Material).dispose();
        star.resonanceAnim = null;
      } else {
        const easeT = 1 - Math.pow(1 - anim.progress, 3);
        anim.shadowStar.position.lerpVectors(anim.startPos, anim.targetPos, easeT);
        anim.shadowGlow.position.copy(anim.shadowStar.position);

        const shadowMat = anim.shadowStar.material as THREE.MeshBasicMaterial;
        const shadowGlowMat = anim.shadowGlow.material as THREE.MeshBasicMaterial;
        shadowMat.opacity = 0.7 * (1 - easeT);
        shadowGlowMat.opacity = 0.1 * (1 - easeT);

        const scale = 0.6 + easeT * 0.4;
        anim.shadowStar.scale.setScalar(scale);
        anim.shadowGlow.scale.setScalar(scale * 2);
      }
    }
  }

  getStarData(id: string): StarData | undefined {
    const star = this.stars.find((s) => s.data.id === id);
    return star?.data;
  }
}
