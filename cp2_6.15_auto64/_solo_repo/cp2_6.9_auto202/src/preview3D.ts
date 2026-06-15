import * as THREE from 'three';
import { Point, OrigamiTemplate, CENTER, HALF } from './templates';

interface ThreeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Preview3D {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private paperMesh: THREE.Mesh | null = null;
  private foldMeshes: THREE.Mesh[] = [];
  private audioContext: AudioContext | null = null;
  private particles: ThreeParticle[] = [];
  private readonly MAX_PARTICLES = 100;

  private foldProgress: number = 0;
  private foldAngles: number[] = [0, 0, 0];
  private targetAngles: number[] = [0, 0, 0];
  private currentStep: number = 0;
  private isComplete: boolean = false;
  private color: string = '#E74C3C';

  private startTime: number = 0;
  private animationFrameId: number | null = null;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = canvas;
    this.container = canvas.parentElement!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    const aspect = 1;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(2.5, 2.5, 2.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLights();
    this.createPaper();
    this.setupResize();
    this.startTime = performance.now();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(3, 5, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.3);
    fillLight.position.set(-3, 2, -3);
    this.scene.add(fillLight);

    const pointLight = new THREE.PointLight(0xe94560, 0.4, 10);
    pointLight.position.set(0, 2, 2);
    this.scene.add(pointLight);
  }

  private createPaper(): void {
    const geometry = new THREE.PlaneGeometry(1.6, 1.6, 4, 4);
    const material = new THREE.MeshPhongMaterial({
      color: this.color,
      side: THREE.DoubleSide,
      shininess: 80,
      transparent: true,
      opacity: 0.95
    });

    this.paperMesh = new THREE.Mesh(geometry, material);
    this.paperMesh.rotation.x = -Math.PI / 2;
    this.paperMesh.position.y = 0;
    this.paperMesh.castShadow = true;
    this.paperMesh.receiveShadow = true;
    this.scene.add(this.paperMesh);

    const plateGeometry = new THREE.CircleGeometry(1.4, 32);
    const plateMaterial = new THREE.MeshPhongMaterial({
      color: 0x16213e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = -0.01;
    this.scene.add(plate);
  }

  private updatePaperGeometry(): void {
    if (!this.paperMesh) return;

    const positions = this.paperMesh.geometry.attributes.position;
    const originalGeometry = new THREE.PlaneGeometry(1.6, 1.6, 4, 4);
    const originalPositions = originalGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const ox = originalPositions.getX(i);
      const oy = originalPositions.getY(i);
      let z = 0;

      const stepFolds = Math.min(this.currentStep, this.foldAngles.length);
      for (let s = 0; s < stepFolds; s++) {
        const angle = this.foldAngles[s];
        if (angle === 0) continue;

        const foldAxis = this.getFoldAxis(s);
        if (!foldAxis) continue;

        const { point, normal } = foldAxis;
        const dist = (ox - point.x) * normal.x + (oy - point.y) * normal.y;

        if (dist > 0) {
          const foldAmount = Math.sin(angle) * Math.abs(dist) * 0.8;
          z += foldAmount;
        }
      }

      positions.setXYZ(i, ox, oy, z);
    }

    positions.needsUpdate = true;
    this.paperMesh.geometry.computeVertexNormals();
    originalGeometry.dispose();
  }

  private getFoldAxis(stepIndex: number): { point: THREE.Vector2; normal: THREE.Vector2 } | null {
    const center = new THREE.Vector2(0, 0);
    switch (stepIndex) {
      case 0:
        return { point: center, normal: new THREE.Vector2(1, 1).normalize() };
      case 1:
        return { point: center, normal: new THREE.Vector2(-1, 1).normalize() };
      case 2:
        return { point: new THREE.Vector2(0, 0.8), normal: new THREE.Vector2(0, 1) };
      default:
        return null;
    }
  }

  public updateFoldState(data: { corners: Point[]; stepIndex: number; progress?: number }): void {
    this.currentStep = data.stepIndex;
    if (data.progress !== undefined) {
      this.foldProgress = data.progress;
    }
  }

  public completeStep(stepIndex: number): void {
    if (stepIndex < this.targetAngles.length) {
      this.targetAngles[stepIndex] = Math.PI / 3;
    }
    this.playDingSound();
  }

  public setTemplate(template: OrigamiTemplate, color: string): void {
    this.color = color;
    this.currentStep = 0;
    this.foldAngles = [0, 0, 0];
    this.targetAngles = [0, 0, 0];
    this.isComplete = false;
    this.foldProgress = 0;

    if (this.paperMesh) {
      const material = this.paperMesh.material as THREE.MeshPhongMaterial;
      material.color.set(this.color);
    }
    this.updatePaperGeometry();
  }

  public setAllComplete(): void {
    this.isComplete = true;
    this.playWindChime();
    this.spawnCelebrationParticles();
  }

  private setupResize(): void {
    const resize = () => {
      const rect = this.container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height, 640);
      this.renderer.setSize(size, size, false);
      this.camera.aspect = 1;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();
  }

  private playDingSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private playWindChime(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.5);
        }, i * 150);
      });
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private spawnCelebrationParticles(): void {
    if (!this.paperMesh) return;
    for (let i = 0; i < 30 && this.particles.length < this.MAX_PARTICLES; i++) {
      const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 8, 8);
      const colors = [0xFFD700, 0xF39C12, 0xE94560, 0x2ECC71, 0x3498DB];
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 0.8,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.8
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.01 + Math.random() * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        life: 2000,
        maxLife: 2000
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.add(p.velocity);
      p.velocity.y -= 0.0005;
      p.life -= dt;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = p.life / p.maxLife;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private lastTime: number = performance.now();

  private animate(): void {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    for (let i = 0; i < this.foldAngles.length; i++) {
      const diff = this.targetAngles[i] - this.foldAngles[i];
      this.foldAngles[i] += diff * 0.1;
    }
    this.updatePaperGeometry();

    if (this.paperMesh) {
      if (this.isComplete) {
        const elapsed = (now - this.startTime) / 1000;
        this.paperMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.05;
        this.paperMesh.position.y = Math.sin(elapsed * 2) * 0.03;
      } else {
        this.paperMesh.rotation.y += 0.003;
      }
    }

    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.particles.forEach(p => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.renderer.dispose();
  }
}
