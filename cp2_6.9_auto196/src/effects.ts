import * as THREE from 'three';

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export const lerpColor = (
  from: THREE.Color,
  to: THREE.Color,
  t: number
): THREE.Color => {
  const result = new THREE.Color();
  result.copy(from).lerp(to, easeInOutQuad(t));
  return result;
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * easeInOutQuad(t);
};

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;
  private pool: THREE.Mesh[] = [];
  private maxParticles: number = 400;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.pool.push(mesh);
      this.scene.add(mesh);
    }
  }

  spawn(
    position: THREE.Vector3,
    color: number,
    count: number = 15,
    size: number = 0.08
  ): void {
    for (let i = 0; i < count; i++) {
      const mesh = this.getPooledMesh();
      if (!mesh) continue;

      mesh.scale.setScalar(size / 0.05);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      mesh.position.copy(position);
      mesh.visible = true;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      this.particles.push({
        mesh,
        velocity,
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  private getPooledMesh(): THREE.Mesh | null {
    for (const mesh of this.pool) {
      if (!mesh.visible) return mesh;
    }
    return null;
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        p.mesh.visible = false;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.velocity, deltaTime * 2);
      p.velocity.y -= deltaTime * 0.5;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t;
    }
  }
}

export class UIParticle {
  element: HTMLDivElement;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, color: string) {
    this.element = document.createElement('div');
    this.element.className = 'particle';
    const size = 2 + Math.random() * 2;
    this.element.style.width = size + 'px';
    this.element.style.height = size + 'px';
    this.element.style.background = color;
    this.element.style.left = x + 'px';
    this.element.style.top = y + 'px';
    this.element.style.boxShadow = `0 0 ${size * 2}px ${color}`;
    document.body.appendChild(this.element);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1;
    this.maxLife = 0.5;
    this.life = this.maxLife;
  }

  update(delta: number): boolean {
    this.life -= delta;
    if (this.life <= 0) {
      this.element.remove();
      return false;
    }
    const t = this.life / this.maxLife;
    this.vy += delta * 6;
    this.element.style.left = parseFloat(this.element.style.left) + this.vx + 'px';
    this.element.style.top = parseFloat(this.element.style.top) + this.vy + 'px';
    this.element.style.opacity = String(t);
    return true;
  }
}

export class UIParticleSystem {
  private particles: UIParticle[] = [];

  spawn(x: number, y: number, color: string, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(new UIParticle(x, y, color));
    }
  }

  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(delta)) {
        this.particles.splice(i, 1);
      }
    }
  }
}

export interface AnimationState {
  startTime: number;
  duration: number;
  fromColor: THREE.Color;
  toColor: THREE.Color;
  fromRotation: number;
  toRotation: number;
  fromOpacity: number;
  toOpacity: number;
}

export class LightAnimator {
  private animations: Map<number, AnimationState> = new Map();

  startAnimation(
    lightId: number,
    targetColor: THREE.Color,
    targetRotation: number,
    targetOpacity: number,
    duration: number
  ): void {
    const existing = this.animations.get(lightId);
    const now = performance.now() / 1000;

    let fromColor = new THREE.Color(0x888888);
    let fromRotation = 0;
    let fromOpacity = 0.2;

    if (existing) {
      const t = Math.min(1, (now - existing.startTime) / existing.duration);
      fromColor = lerpColor(existing.fromColor, existing.toColor, t);
      fromRotation = lerp(existing.fromRotation, existing.toRotation, t);
      fromOpacity = lerp(existing.fromOpacity, existing.toOpacity, t);
    }

    this.animations.set(lightId, {
      startTime: now,
      duration,
      fromColor,
      toColor: targetColor.clone(),
      fromRotation,
      toRotation: targetRotation,
      fromOpacity,
      toOpacity: targetOpacity
    });
  }

  update(
    lightId: number
  ): { color: THREE.Color; rotation: number; opacity: number } | null {
    const anim = this.animations.get(lightId);
    if (!anim) return null;

    const now = performance.now() / 1000;
    const t = Math.min(1, (now - anim.startTime) / anim.duration);

    return {
      color: lerpColor(anim.fromColor, anim.toColor, t),
      rotation: lerp(anim.fromRotation, anim.toRotation, t),
      opacity: lerp(anim.fromOpacity, anim.toOpacity, t)
    };
  }

  reset(lightId: number): void {
    this.animations.delete(lightId);
  }

  resetAll(): void {
    this.animations.clear();
  }
}
