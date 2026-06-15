import * as THREE from 'three';
import { StarData } from './starField';

interface FusionRipple {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  color: THREE.Color;
  age: number;
  lifespan: number;
  startRadius: number;
  endRadius: number;
  material: THREE.ShaderMaterial;
}

interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  age: number;
  lifespan: number;
  size: number;
  trail: THREE.Vector3[];
  trailMaxLength: number;
}

interface TrailSegment {
  position: THREE.Vector3;
  color: THREE.Color;
  age: number;
  lifespan: number;
}

export class EffectSystem {
  private parentGroup: THREE.Group;
  private fusionRipples: FusionRipple[] = [];
  private burstParticles: BurstParticle[] = [];
  private trailSegments: TrailSegment[] = [];
  private burstPoints!: THREE.Points;
  private trailPoints!: THREE.Points;
  private burstGeometry!: THREE.BufferGeometry;
  private trailGeometry!: THREE.BufferGeometry;

  private MAX_BURST = 500;
  private MAX_TRAILS = 2000;

  private burstPositions: Float32Array;
  private burstColors: Float32Array;
  private burstSizes: Float32Array;
  private burstAlphas: Float32Array;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailAlphas: Float32Array;

  private audioContext: AudioContext | null = null;

  constructor(_scene: THREE.Scene, parentGroup: THREE.Group) {
    this.parentGroup = parentGroup;

    this.burstPositions = new Float32Array(this.MAX_BURST * 3);
    this.burstColors = new Float32Array(this.MAX_BURST * 3);
    this.burstSizes = new Float32Array(this.MAX_BURST);
    this.burstAlphas = new Float32Array(this.MAX_BURST);
    this.trailPositions = new Float32Array(this.MAX_TRAILS * 3);
    this.trailColors = new Float32Array(this.MAX_TRAILS * 3);
    this.trailAlphas = new Float32Array(this.MAX_TRAILS);

    this.createGeometries();
    this.initAudio();
  }

  private createGeometries(): void {
    const burstVS = `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const burstFS = `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float d = length(cxy);
        if (d > 1.0) discard;
        float a = pow(1.0 - d, 1.5) * vAlpha;
        gl_FragColor = vec4(vColor, a);
      }
    `;

    const trailFS = `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float d = length(cxy);
        if (d > 1.0) discard;
        float a = pow(1.0 - d, 2.0) * vAlpha * 0.6;
        gl_FragColor = vec4(vColor, a);
      }
    `;

    const burstMaterial = new THREE.ShaderMaterial({
      vertexShader: burstVS,
      fragmentShader: burstFS,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const trailMaterial = new THREE.ShaderMaterial({
      vertexShader: burstVS,
      fragmentShader: trailFS,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.burstGeometry = new THREE.BufferGeometry();
    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(this.burstPositions, 3));
    this.burstGeometry.setAttribute('color', new THREE.BufferAttribute(this.burstColors, 3));
    this.burstGeometry.setAttribute('size', new THREE.BufferAttribute(this.burstSizes, 1));
    this.burstGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.burstAlphas, 1));
    this.burstGeometry.setDrawRange(0, 0);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(this.MAX_TRAILS).fill(4), 1));
    this.trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.trailAlphas, 1));
    this.trailGeometry.setDrawRange(0, 0);

    this.burstPoints = new THREE.Points(this.burstGeometry, burstMaterial);
    this.trailPoints = new THREE.Points(this.trailGeometry, trailMaterial);

    this.parentGroup.add(this.trailPoints);
    this.parentGroup.add(this.burstPoints);
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      this.audioContext = null;
    }
  }

  private resumeAudio(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playFusionSound(): void {
    this.resumeAudio();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.3;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  public playBurstSound(): void {
    this.resumeAudio();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.4;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(80, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  public createFusionRipple(position: THREE.Vector3, color: THREE.Color): void {
    const rippleVS = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const rippleFS = `
      uniform float uProgress;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c) * 2.0;
        float ringWidth = 0.12;
        float ring = smoothstep(0.5 - ringWidth, 0.5, d) * (1.0 - smoothstep(0.5, 0.5 + ringWidth, d));
        float centerGlow = (1.0 - smoothstep(0.0, 0.35, d)) * 0.5;
        float alpha = (ring + centerGlow) * (1.0 - uProgress);
        vec3 edgeColor = vec3(1.0);
        vec3 finalColor = mix(uColor, edgeColor, ring);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader: rippleVS,
      fragmentShader: rippleFS,
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(color) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const geometry = new THREE.CircleGeometry(3, 48);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(position);
    const normal = position.clone().normalize();
    mesh.lookAt(normal.multiplyScalar(1000));

    this.parentGroup.add(mesh);

    this.fusionRipples.push({
      mesh,
      position: position.clone(),
      color: color.clone(),
      age: 0,
      lifespan: 0.8,
      startRadius: 3,
      endRadius: 60,
      material
    });

    this.playFusionSound();
  }

  public createBurst(star: StarData): void {
    const particleCount = 20;
    const basePos = star.position.clone();
    const baseColor = star.baseColor.clone();

    for (let i = 0; i < particleCount; i++) {
      if (this.burstParticles.length >= this.MAX_BURST) break;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 40 + Math.random() * 80;

      const colorVariation = new THREE.Color().setHSL(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.15
      );
      const pColor = baseColor.clone().add(colorVariation);

      this.burstParticles.push({
        position: basePos.clone(),
        velocity: dir.multiplyScalar(speed),
        color: pColor,
        age: 0,
        lifespan: 3.0,
        size: 2 + Math.random() * 3,
        trail: [],
        trailMaxLength: 12
      });
    }

    this.playBurstSound();
  }

  private updateBurstParticles(dt: number): void {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.age += dt;

      if (p.age >= p.lifespan) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      if (p.trailMaxLength > 0) {
        p.trail.unshift(p.position.clone());
        if (p.trail.length > p.trailMaxLength) {
          p.trail.pop();
        }

        for (let j = 0; j < p.trail.length; j++) {
          if (this.trailSegments.length >= this.MAX_TRAILS) break;
          this.trailSegments.push({
            position: p.trail[j].clone(),
            color: p.color.clone(),
            age: j * 0.03,
            lifespan: 1.0
          });
        }
      }

      p.velocity.multiplyScalar(0.985);
      p.position.add(p.velocity.clone().multiplyScalar(dt));
    }

    for (let i = 0; i < this.MAX_BURST; i++) {
      if (i < this.burstParticles.length) {
        const p = this.burstParticles[i];
        const t = p.age / p.lifespan;
        const alpha = 1 - t;

        this.burstPositions[i * 3] = p.position.x;
        this.burstPositions[i * 3 + 1] = p.position.y;
        this.burstPositions[i * 3 + 2] = p.position.z;

        this.burstColors[i * 3] = p.color.r;
        this.burstColors[i * 3 + 1] = p.color.g;
        this.burstColors[i * 3 + 2] = p.color.b;

        this.burstSizes[i] = p.size * (1 - t * 0.6);
        this.burstAlphas[i] = alpha;
      } else {
        this.burstSizes[i] = 0;
        this.burstAlphas[i] = 0;
      }
    }
    this.burstGeometry.setDrawRange(0, Math.min(this.burstParticles.length, this.MAX_BURST));

    if (this.burstGeometry.attributes.position) this.burstGeometry.attributes.position.needsUpdate = true;
    if (this.burstGeometry.attributes.color) this.burstGeometry.attributes.color.needsUpdate = true;
    if (this.burstGeometry.attributes.size) this.burstGeometry.attributes.size.needsUpdate = true;
    if (this.burstGeometry.attributes.alpha) this.burstGeometry.attributes.alpha.needsUpdate = true;
  }

  private updateTrailSegments(dt: number): void {
    for (let i = this.trailSegments.length - 1; i >= 0; i--) {
      const seg = this.trailSegments[i];
      seg.age += dt;
      if (seg.age >= seg.lifespan) {
        this.trailSegments.splice(i, 1);
      }
    }

    const segCount = Math.min(this.trailSegments.length, this.MAX_TRAILS);
    for (let i = 0; i < this.MAX_TRAILS; i++) {
      if (i < segCount) {
        const seg = this.trailSegments[i];
        const t = seg.age / seg.lifespan;
        const alpha = (1 - t) * 0.5;

        this.trailPositions[i * 3] = seg.position.x;
        this.trailPositions[i * 3 + 1] = seg.position.y;
        this.trailPositions[i * 3 + 2] = seg.position.z;

        this.trailColors[i * 3] = seg.color.r;
        this.trailColors[i * 3 + 1] = seg.color.g;
        this.trailColors[i * 3 + 2] = seg.color.b;

        this.trailAlphas[i] = alpha;
      } else {
        this.trailAlphas[i] = 0;
      }
    }
    this.trailGeometry.setDrawRange(0, segCount);

    if (this.trailGeometry.attributes.position) this.trailGeometry.attributes.position.needsUpdate = true;
    if (this.trailGeometry.attributes.color) this.trailGeometry.attributes.color.needsUpdate = true;
    if (this.trailGeometry.attributes.alpha) this.trailGeometry.attributes.alpha.needsUpdate = true;
  }

  private updateFusionRipples(dt: number): void {
    for (let i = this.fusionRipples.length - 1; i >= 0; i--) {
      const ripple = this.fusionRipples[i];
      ripple.age += dt;

      if (ripple.age >= ripple.lifespan) {
        this.parentGroup.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        ripple.material.dispose();
        this.fusionRipples.splice(i, 1);
        continue;
      }

      const progress = ripple.age / ripple.lifespan;
      const radius = THREE.MathUtils.lerp(ripple.startRadius, ripple.endRadius, easeOutCubic(progress));
      ripple.mesh.scale.setScalar(radius / ripple.startRadius);
      ripple.material.uniforms.uProgress.value = progress;
    }
  }

  public update(dt: number): void {
    this.updateFusionRipples(dt);
    this.updateBurstParticles(dt);
    this.updateTrailSegments(dt);
  }

  public dispose(): void {
    for (const ripple of this.fusionRipples) {
      this.parentGroup.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.material.dispose();
    }
    this.fusionRipples = [];

    this.burstGeometry.dispose();
    this.trailGeometry.dispose();
    (this.burstPoints.material as THREE.Material).dispose();
    (this.trailPoints.material as THREE.Material).dispose();

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
