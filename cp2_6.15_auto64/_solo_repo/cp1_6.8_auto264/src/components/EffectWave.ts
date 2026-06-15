import * as THREE from 'three';

interface Wave {
  ring: THREE.Mesh;
  age: number;
  maxAge: number;
  origin: THREE.Vector3;
  triggered: boolean;
}

interface DispersionStripe {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  color: THREE.Color;
  direction: THREE.Vector3;
  origin: THREE.Vector3;
}

interface TrailParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  colorLerp: number;
}

export class EffectWave {
  group: THREE.Group;
  private waves: Wave[] = [];
  private dispersions: DispersionStripe[] = [];
  private particleSystem: THREE.Points;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;
  private particles: TrailParticle[] = [];
  private maxParticles: number;
  private intensity: number = 1.0;
  private particleCount: number = 200;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.maxParticles = 600;

    const geo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleColors = new Float32Array(this.maxParticles * 3);
    this.particleSizes = new Float32Array(this.maxParticles);

    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.particleSystem = new THREE.Points(geo, particleMat);
    this.group.add(this.particleSystem);
  }

  setIntensity(v: number): void {
    this.intensity = v;
  }

  setParticleCount(v: number): void {
    this.particleCount = Math.round(v);
  }

  trigger(origin: THREE.Vector3): void {
    const ringGeo = new THREE.RingGeometry(0.1, 0.4, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.85, 0.9, 1.0),
      transparent: true,
      opacity: 0.9 * this.intensity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(origin);
    ring.lookAt(origin.clone().add(new THREE.Vector3(0, 1, 0)));
    this.group.add(ring);

    this.waves.push({
      ring,
      age: 0,
      maxAge: 3.0,
      origin: origin.clone(),
      triggered: false,
    });

    this.spawnParticles(origin);
    this.playSound();
  }

  checkDispersion(geometryMeshes: THREE.Mesh[]): void {
    for (const wave of this.waves) {
      if (wave.triggered) continue;
      const waveRadius = wave.age * 8 * this.intensity;
      for (const mesh of geometryMeshes) {
        const dist = wave.origin.distanceTo(mesh.position);
        if (Math.abs(dist - waveRadius) < 1.5) {
          wave.triggered = true;
          this.createDispersion(mesh.position, wave.origin);
          break;
        }
      }
    }
  }

  private createDispersion(hitPos: THREE.Vector3, waveOrigin: THREE.Vector3): void {
    const rainbowColors = [
      new THREE.Color(1.0, 0.2, 0.2),
      new THREE.Color(1.0, 0.55, 0.1),
      new THREE.Color(1.0, 1.0, 0.15),
      new THREE.Color(0.2, 1.0, 0.3),
      new THREE.Color(0.2, 0.5, 1.0),
      new THREE.Color(0.5, 0.2, 1.0),
      new THREE.Color(0.8, 0.2, 0.8),
    ];

    const baseDir = hitPos.clone().sub(waveOrigin).normalize();

    for (let i = 0; i < rainbowColors.length; i++) {
      const angle = ((i - 3) * 0.18);
      const dir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

      const stripeGeo = new THREE.PlaneGeometry(3.5, 0.12);
      const stripeMat = new THREE.MeshBasicMaterial({
        color: rainbowColors[i],
        transparent: true,
        opacity: 0.75 * this.intensity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.copy(hitPos);
      stripe.lookAt(hitPos.clone().add(dir));
      this.group.add(stripe);

      this.dispersions.push({
        mesh: stripe,
        age: 0,
        maxAge: 2.5,
        color: rainbowColors[i],
        direction: dir,
        origin: hitPos.clone(),
      });
    }

    this.spawnDispersionParticles(hitPos, rainbowColors);
  }

  private spawnParticles(origin: THREE.Vector3): void {
    const count = this.particleCount;
    const coldWhite = new THREE.Color(0.85, 0.9, 1.0);
    const warmGold = new THREE.Color(1.0, 0.85, 0.4);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4;
      const speed = (0.3 + Math.random() * 0.7) * this.intensity;
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.3 + 0.1,
        Math.sin(phi) * Math.sin(theta) * speed
      );
      const lerp = Math.random();

      this.particles.push({
        position: origin.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        )),
        velocity: vel,
        age: 0,
        maxAge: 1.5 + Math.random() * 1.5,
        colorLerp: lerp,
      });
    }
  }

  private spawnDispersionParticles(origin: THREE.Color, _colors: THREE.Color[]): void {
    const pos = new THREE.Vector3();
    if (origin instanceof THREE.Vector3) {
      pos.copy(origin);
    }

    const count = Math.round(this.particleCount * 0.3);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(0.5 + Math.random() * 0.5);

      this.particles.push({
        position: pos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        )),
        velocity: dir,
        age: 0,
        maxAge: 1.0 + Math.random() * 1.0,
        colorLerp: Math.random(),
      });
    }
  }

  private playSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(220, now + 0.8);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, now);
      osc2.frequency.exponentialRampToValueAtTime(330, now + 0.6);

      gain.gain.setValueAtTime(0.06 * this.intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.0);
    } catch (_e) {
      // Web Audio API not available
    }
  }

  update(delta: number, geometryMeshes: THREE.Mesh[]): void {
    const coldWhite = new THREE.Color(0.85, 0.9, 1.0);
    const warmGold = new THREE.Color(1.0, 0.85, 0.4);

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.age += delta;
      const progress = w.age / w.maxAge;
      const radius = w.age * 8 * this.intensity;

      w.ring.scale.setScalar(Math.max(0.01, radius));
      (w.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.7);

      if (progress >= 1) {
        this.group.remove(w.ring);
        w.ring.geometry.dispose();
        (w.ring.material as THREE.Material).dispose();
        this.waves.splice(i, 1);
      }
    }

    this.checkDispersion(geometryMeshes);

    for (let i = this.dispersions.length - 1; i >= 0; i--) {
      const d = this.dispersions[i];
      d.age += delta;
      const progress = d.age / d.maxAge;

      d.mesh.position.copy(d.origin).addScaledVector(d.direction, d.age * 3);
      (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.6);
      d.mesh.scale.setScalar(1 + progress * 0.5);

      if (progress >= 1) {
        this.group.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this.dispersions.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      p.position.add(p.velocity.clone().multiplyScalar(delta * 2));
      p.velocity.y -= delta * 0.15;
      p.velocity.multiplyScalar(0.98);

      if (p.age >= p.maxAge) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.particlePositions[i * 3] = p.position.x;
        this.particlePositions[i * 3 + 1] = p.position.y;
        this.particlePositions[i * 3 + 2] = p.position.z;

        const col = coldWhite.clone().lerp(warmGold, p.colorLerp);
        const lifeRatio = 1 - p.age / p.maxAge;
        this.particleColors[i * 3] = col.r;
        this.particleColors[i * 3 + 1] = col.g;
        this.particleColors[i * 3 + 2] = col.b;
        this.particleSizes[i] = (0.15 + p.colorLerp * 0.1) * lifeRatio;
      } else {
        this.particlePositions[i * 3] = 0;
        this.particlePositions[i * 3 + 1] = -100;
        this.particlePositions[i * 3 + 2] = 0;
        this.particleSizes[i] = 0;
      }
    }

    const posAttr = this.particleSystem.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.particleSystem.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.particleSystem.geometry.attributes.size as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }
}
