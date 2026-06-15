import * as THREE from 'three';

export type Emotion = 'joy' | 'sadness' | 'confusion' | 'anger';

export const EmotionColors: Record<Emotion, string> = {
  joy: '#FFD700',
  sadness: '#5B9BD5',
  confusion: '#9B59B6',
  anger: '#E74C3C',
};

interface ParticleData {
  originalPos: THREE.Vector3;
  phase: number;
}

interface FloatingText {
  sprite: THREE.Sprite;
  startTime: number;
  duration: number;
  vy: number;
  vr: number;
}

interface AnimationState {
  type: 'emotion' | 'replay' | 'resonate' | 'dissolve' | null;
  emotion?: Emotion;
  emotion2?: Emotion;
  startTime: number;
  duration: number;
}

export class FogRenderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points;
  private particleData: ParticleData[] = [];
  private floatingTexts: FloatingText[] = [];
  private animationState: AnimationState = { type: null, startTime: 0, duration: 0 };
  private isDragging = false;
  private lastMouseX = 0;
  private targetRotationY = 0;
  private currentRotationY = 0;
  private baseParticleCount = 500;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.z = 16;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.particles = new THREE.Points();
    this.scene.add(this.particles);

    this.initParticles(this.baseParticleCount);

    this.setupEventListeners();
    this.render();

    window.addEventListener('resize', this.handleResize);
  }

  private initParticles(count: number) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.particleData = [];

    for (let i = 0; i < count; i++) {
      const r = Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.particleData.push({
        originalPos: new THREE.Vector3(x, y, z),
        phase: Math.random() * Math.PI * 2,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      color: 0xffffff,
      sizeAttenuation: true,
    });

    if (this.particles) {
      (this.particles.geometry as THREE.BufferGeometry).dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    this.particles.geometry = geometry;
    this.particles.material = material;
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private handleMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.lastMouseX;
    this.lastMouseX = e.clientX;
    this.targetRotationY += deltaX * 0.005;
    this.targetRotationY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationY));
  };

  private handleMouseUp = () => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.camera.position.z += e.deltaY * 0.01;
    this.camera.position.z = Math.max(8, Math.min(32, this.camera.position.z));
  };

  private handleResize = () => {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  };

  private addParticles(targetCount: number) {
    const currentCount = this.particleData.length;
    if (targetCount <= currentCount) return;

    const geometry = this.particles.geometry as THREE.BufferGeometry;
    const oldPositions = geometry.attributes.position.array as Float32Array;
    const newPositions = new Float32Array(targetCount * 3);

    newPositions.set(oldPositions);

    for (let i = currentCount; i < targetCount; i++) {
      const r = Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      newPositions[i * 3] = x;
      newPositions[i * 3 + 1] = y;
      newPositions[i * 3 + 2] = z;

      this.particleData.push({
        originalPos: new THREE.Vector3(x, y, z),
        phase: Math.random() * Math.PI * 2,
      });
    }

    geometry.dispose();
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    this.particles.geometry = newGeometry;
  }

  private removeParticles(targetCount: number) {
    const currentCount = this.particleData.length;
    if (targetCount >= currentCount) return;

    this.particleData = this.particleData.slice(0, targetCount);

    const geometry = this.particles.geometry as THREE.BufferGeometry;
    const oldPositions = geometry.attributes.position.array as Float32Array;
    const newPositions = new Float32Array(targetCount * 3);

    for (let i = 0; i < targetCount; i++) {
      newPositions[i * 3] = oldPositions[i * 3];
      newPositions[i * 3 + 1] = oldPositions[i * 3 + 1];
      newPositions[i * 3 + 2] = oldPositions[i * 3 + 2];
    }

    geometry.dispose();
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    this.particles.geometry = newGeometry;

    const material = this.particles.material as THREE.PointsMaterial;
    material.opacity = 0.6;
  }

  private createFloatingText(text: string, emotion: Emotion) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = EmotionColors[emotion];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = EmotionColors[emotion];
    ctx.shadowBlur = 20;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1);
    sprite.position.set(
      (Math.random() - 0.5) * 2,
      Math.random() * 2 - 1,
      (Math.random() - 0.5) * 2
    );

    this.scene.add(sprite);
    this.floatingTexts.push({
      sprite,
      startTime: performance.now(),
      duration: 8000,
      vy: 0.003 + Math.random() * 0.002,
      vr: 0.001 + Math.random() * 0.001,
    });
  }

  private updateFloatingTexts() {
    const now = performance.now();
    this.floatingTexts = this.floatingTexts.filter((ft) => {
      const elapsed = now - ft.startTime;
      if (elapsed >= ft.duration) {
        this.scene.remove(ft.sprite);
        (ft.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (ft.sprite.material as THREE.SpriteMaterial).dispose();
        return false;
      }
      ft.sprite.position.y += ft.vy;
      (ft.sprite.material as THREE.SpriteMaterial).rotation += ft.vr;
      const alpha = 1 - elapsed / ft.duration;
      (ft.sprite.material as THREE.SpriteMaterial).opacity = alpha;
      return true;
    });
  }

  triggerEmotion(emotion: Emotion, text?: string) {
    this.addParticles(2000);
    if (text) {
      this.createFloatingText(text, emotion);
    }
    this.animationState = {
      type: 'emotion',
      emotion,
      startTime: performance.now(),
      duration: 8000,
    };
  }

  triggerReplay(emotion: Emotion | null) {
    if (!emotion) {
      this.animationState = { type: null, startTime: 0, duration: 0 };
      return;
    }
    this.animationState = {
      type: 'replay',
      emotion,
      startTime: performance.now(),
      duration: 4000,
    };
  }

  triggerResonate(emotion1?: Emotion, emotion2?: Emotion) {
    const e1 = emotion1 || 'joy';
    const e2 = emotion2 || 'sadness';
    this.animationState = {
      type: 'resonate',
      emotion: e1,
      emotion2: e2,
      startTime: performance.now(),
      duration: 6000,
    };
  }

  triggerDissolve() {
    this.animationState = {
      type: 'dissolve',
      startTime: performance.now(),
      duration: 10000,
    };
  }

  dissolve() {
    this.triggerDissolve();
  }

  reset() {
    this.removeParticles(this.baseParticleCount);
    this.animationState = { type: null, startTime: 0, duration: 0 };
    this.floatingTexts.forEach((ft) => {
      this.scene.remove(ft.sprite);
      (ft.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (ft.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.floatingTexts = [];
    const material = this.particles.material as THREE.PointsMaterial;
    material.opacity = 0.6;
    material.color.setHex(0xffffff);
  }

  private applyEmotionAnimation(emotion: Emotion, elapsed: number, positions: Float32Array, intensity: number) {
    const t = elapsed / 1000;

    if (emotion === 'joy') {
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        const angle = Math.atan2(pd.originalPos.z, pd.originalPos.x) + t * 2 + pd.phase;
        const radius = Math.sqrt(pd.originalPos.x ** 2 + pd.originalPos.z ** 2);
        const yRise = t * 0.5 + pd.originalPos.y;
        const x = pd.originalPos.x + (Math.cos(angle) * radius - pd.originalPos.x) * intensity;
        const z = pd.originalPos.z + (Math.sin(angle) * radius - pd.originalPos.z) * intensity;
        const y = pd.originalPos.y + (yRise - pd.originalPos.y) * intensity;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
    } else if (emotion === 'sadness') {
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        const yDrop = pd.originalPos.y - t * 0.3;
        const waveX = Math.sin(t * 3 + pd.phase) * 0.1;
        const waveZ = Math.cos(t * 2 + pd.phase) * 0.1;
        positions[i * 3] = pd.originalPos.x + waveX * intensity;
        positions[i * 3 + 1] = pd.originalPos.y + (yDrop - pd.originalPos.y) * intensity;
        positions[i * 3 + 2] = pd.originalPos.z + waveZ * intensity;
      }
    } else if (emotion === 'confusion') {
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        const noise1 = Math.sin(t * 1.5 + pd.phase * 2) * 0.5;
        const noise2 = Math.cos(t * 2.3 + pd.phase * 1.7) * 0.3;
        const noise3 = Math.sin(t * 3.1 + pd.phase * 0.9) * 0.2;
        positions[i * 3] = pd.originalPos.x + (noise1 + noise2) * intensity;
        positions[i * 3 + 1] = pd.originalPos.y + (noise2 + noise3) * intensity;
        positions[i * 3 + 2] = pd.originalPos.z + (noise3 + noise1) * intensity;
      }
    } else if (emotion === 'anger') {
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        const dir = pd.originalPos.clone().normalize();
        const decay = Math.exp(-t * 0.5);
        const expand = (1 - decay) * 3;
        positions[i * 3] = pd.originalPos.x + dir.x * expand * intensity;
        positions[i * 3 + 1] = pd.originalPos.y + dir.y * expand * intensity;
        positions[i * 3 + 2] = pd.originalPos.z + dir.z * expand * intensity;
      }
    }
  }

  private mixColors(color1Hex: string, color2Hex: string, ratio: number): THREE.Color {
    const c1 = new THREE.Color(color1Hex);
    const c2 = new THREE.Color(color2Hex);
    return c1.lerp(c2, ratio);
  }

  private updateParticles() {
    const geometry = this.particles.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const material = this.particles.material as THREE.PointsMaterial;
    const now = performance.now();
    const { type, startTime, duration, emotion, emotion2 } = this.animationState;
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);

    if (type === null) {
      const t = this.clock.getElapsedTime();
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        const breathe = Math.sin(t * 0.5 + pd.phase) * 0.05;
        positions[i * 3] = pd.originalPos.x + breathe;
        positions[i * 3 + 1] = pd.originalPos.y + breathe * 0.5;
        positions[i * 3 + 2] = pd.originalPos.z + breathe;
      }
      material.opacity = 0.6;
      material.color.setHex(0xffffff);
    } else if (type === 'emotion' && emotion) {
      let intensity: number;
      if (progress < 0.1) {
        intensity = progress / 0.1;
      } else if (progress > 0.9) {
        intensity = (1 - progress) / 0.1;
      } else {
        intensity = 1;
      }
      this.applyEmotionAnimation(emotion, elapsed, positions, intensity);
      material.color.set(EmotionColors[emotion]);
      material.opacity = 0.6 * intensity + 0.3 * (1 - intensity);

      if (elapsed >= duration) {
        this.animationState = { type: null, startTime: 0, duration: 0 };
        this.removeParticles(this.baseParticleCount);
      }
    } else if (type === 'replay' && emotion) {
      const intensity = Math.sin(progress * Math.PI);
      this.applyEmotionAnimation(emotion, elapsed, positions, intensity);
      material.color.set(EmotionColors[emotion]);
      material.opacity = 0.5 * intensity + 0.3;

      if (elapsed >= duration) {
        this.animationState = { type: null, startTime: 0, duration: 0 };
      }
    } else if (type === 'resonate' && emotion && emotion2) {
      const t = elapsed / 1000;
      const intensity = Math.sin(progress * Math.PI);
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        const helix = i % 2 === 0 ? 1 : -1;
        const angle = t * 2 + pd.phase + helix * Math.PI * progress;
        const radius = 1 + Math.sin(t + pd.phase) * 0.5;
        const x = Math.cos(angle) * radius * helix;
        const z = Math.sin(angle) * radius;
        const y = pd.originalPos.y + t * 0.3 * helix * 0.3;
        positions[i * 3] = pd.originalPos.x + (x - pd.originalPos.x) * intensity;
        positions[i * 3 + 1] = pd.originalPos.y + (y - pd.originalPos.y) * intensity;
        positions[i * 3 + 2] = pd.originalPos.z + (z - pd.originalPos.z) * intensity;
      }
      const mixRatio = (Math.sin(t * 2) + 1) / 2;
      const mixedColor = this.mixColors(EmotionColors[emotion], EmotionColors[emotion2], mixRatio);
      material.color.copy(mixedColor);
      material.opacity = 0.5 * intensity + 0.3;

      if (elapsed >= duration) {
        this.animationState = { type: null, startTime: 0, duration: 0 };
      }
    } else if (type === 'dissolve') {
      const t = elapsed / 1000;
      const threshold = 2 - progress * 4;
      material.opacity = 0.6;
      for (let i = 0; i < this.particleData.length; i++) {
        const pd = this.particleData[i];
        positions[i * 3] = pd.originalPos.x + Math.sin(t + pd.phase) * 0.02;
        positions[i * 3 + 1] = pd.originalPos.y;
        positions[i * 3 + 2] = pd.originalPos.z + Math.cos(t + pd.phase) * 0.02;
      }
      const dissolveProgress = progress;
      material.opacity = 0.6 * (1 - dissolveProgress * 0.9);

      if (elapsed >= duration) {
        this.animationState = { type: null, startTime: 0, duration: 0 };
      }
    }

    geometry.attributes.position.needsUpdate = true;
  }

  private render = () => {
    this.animationFrameId = requestAnimationFrame(this.render);

    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;
    this.particles.rotation.y = this.currentRotationY;
    this.particles.rotation.y += 0.001;

    this.updateParticles();
    this.updateFloatingTexts();

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);

    this.floatingTexts.forEach((ft) => {
      this.scene.remove(ft.sprite);
      (ft.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (ft.sprite.material as THREE.SpriteMaterial).dispose();
    });

    (this.particles.geometry as THREE.BufferGeometry).dispose();
    (this.particles.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}

export default FogRenderer;
