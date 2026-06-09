import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  baseSpeed: number;
  phase: 'falling' | 'ejecting' | 'rising';
  heightProgress: number;
  spiralAngle: number;
  spiralSpeed: number;
  radiusOffset: number;
  trail: THREE.Vector3[];
  trailMax: number;
  jitterPhase: number;
  jitterPeriod: number;
  jitterAmp: number;
  disturbVel: THREE.Vector3;
  age: number;
  active: boolean;
}

interface SandglassParams {
  topHeight: number;
  bottomHeight: number;
  topRadius: number;
  neckRadius: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  public trailLines: THREE.LineSegments;
  private scene: THREE.Scene;
  private params: SandglassParams;
  private baseCount: number = 800;
  private currentCount: number = 800;
  private particles: Particle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private disturbTimer: number = 0;
  private disturbDuration: number = 0.8;
  private isDisturbed: boolean = false;
  private densityTimer: number = 0;
  private densityPeriod: number = 6;
  private normalizedMouse: THREE.Vector2 = new THREE.Vector2(-10, -10);
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private camera: THREE.PerspectiveCamera;
  private mouseWorldPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private fpsSamples: number[] = [];
  private fpsAccum: number = 0;
  private fpsFrames: number = 0;

  constructor(scene: THREE.Scene, params: SandglassParams, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.params = params;
    this.camera = camera;

    const maxTrailPoints = 6;
    const maxTrailSegmentCount = this.baseCount * (maxTrailPoints - 1) * 2;

    this.positions = new Float32Array(this.baseCount * 3);
    this.colors = new Float32Array(this.baseCount * 3);
    this.sizes = new Float32Array(this.baseCount);
    this.trailPositions = new Float32Array(maxTrailSegmentCount * 3);
    this.trailColors = new Float32Array(maxTrailSegmentCount * 4);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setDrawRange(0, this.currentCount);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vAlpha = smoothstep(0.0, 0.15, size);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float glow = smoothstep(0.5, 0.15, d) * 0.5;
          float alpha = (core + glow) * vAlpha;
          vec3 color = vColor * (1.0 + glow);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 4));
    trailGeo.setDrawRange(0, 0);

    const trailMat = new THREE.LineBasicMaterial({
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    });

    this.trailLines = new THREE.LineSegments(trailGeo, trailMat);
    this.trailLines.frustumCulled = false;

    this.scene.add(this.points);
    this.scene.add(this.trailLines);

    this.initParticles(this.baseCount);
  }

  private initParticles(count: number) {
    this.particles = [];
    for (let i = 0; i < this.baseCount; i++) {
      const p = this.createParticle(i);
      p.active = i < count;
      if (!p.active) {
        p.pos.set(0, -1000, 0);
      }
      this.particles.push(p);
    }
  }

  private createParticle(seed: number): Particle {
    const phase = Math.random() < 0.55 ? 'falling' : 'rising';
    const jitterPeriod = 0.5 + Math.random() * 1.0;
    const maxTrail = 6;
    const trail: THREE.Vector3[] = [];
    for (let i = 0; i < maxTrail; i++) {
      trail.push(new THREE.Vector3());
    }
    const p: Particle = {
      pos: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      speed: 0.3,
      baseSpeed: 0.3 + Math.random() * 0.05,
      phase: phase,
      heightProgress: Math.random(),
      spiralAngle: Math.random() * Math.PI * 2 + seed * 0.07,
      spiralSpeed: 0.6 + Math.random() * 0.4,
      radiusOffset: Math.random() * 0.85,
      trail: trail,
      trailMax: maxTrail,
      jitterPhase: Math.random() * Math.PI * 2,
      jitterPeriod: jitterPeriod,
      jitterAmp: 0.02,
      disturbVel: new THREE.Vector3(),
      age: Math.random() * 10,
      active: true,
    };
    this.positionParticle(p);
    for (let i = 0; i < p.trailMax; i++) {
      p.trail[i].copy(p.pos);
    }
    return p;
  }

  private resetParticle(p: Particle) {
    p.age = 0;
    p.phase = 'falling';
    p.heightProgress = 0;
    p.spiralAngle = Math.random() * Math.PI * 2;
    p.radiusOffset = Math.random() * 0.85;
    p.disturbVel.set(0, 0, 0);
    this.positionParticle(p);
    for (let i = 0; i < p.trailMax; i++) {
      p.trail[i].copy(p.pos);
    }
  }

  private positionParticle(p: Particle) {
    const { topHeight, bottomHeight, topRadius, neckRadius } = this.params;
    const totalH = topHeight + bottomHeight;

    if (p.phase === 'falling') {
      const topY = topHeight / 2;
      const y = topY - p.heightProgress * (totalH);
      let r: number;
      if (y > 0) {
        const t = 1 - y / (topHeight / 2);
        r = topRadius * (1 - t) + neckRadius * t;
      } else {
        const t = -y / (bottomHeight / 2);
        r = neckRadius * (1 - t) + topRadius * t;
      }
      r *= p.radiusOffset;
      const a = p.spiralAngle;
      p.pos.set(Math.cos(a) * r, y, Math.sin(a) * r);
    } else if (p.phase === 'rising' || p.phase === 'ejecting') {
      const bottomY = -bottomHeight / 2;
      const y = bottomY + p.heightProgress * totalH;
      let r: number;
      if (y < 0) {
        const t = 1 + y / (bottomHeight / 2);
        r = topRadius * (1 - t) + neckRadius * t;
      } else {
        const t = y / (topHeight / 2);
        r = neckRadius * (1 - t) + topRadius * t;
      }
      r *= p.radiusOffset;
      const a = p.spiralAngle;
      p.pos.set(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }

  public disturb() {
    this.isDisturbed = true;
    this.disturbTimer = 0;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const strength = 0.8 + Math.random() * 0.6;
      const perp = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      p.disturbVel.set(
        (dir.x + perp.x * 0.7) * strength,
        (dir.y + perp.y * 0.7) * strength,
        (dir.z + perp.z * 0.7) * strength
      );
    }
  }

  public reset() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.active = i < this.currentCount;
      this.resetParticle(p);
      if (!p.active) p.pos.set(0, -1000, 0);
    }
    this.isDisturbed = false;
    this.disturbTimer = 0;
  }

  public setMouse(n: THREE.Vector2) {
    this.normalizedMouse.copy(n);
  }

  private updateMouseWorldPoint() {
    this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
    const origin = this.raycaster.ray.origin;
    const dir = this.raycaster.ray.direction;
    const t = -origin.y / dir.y;
    if (t > 0 && t < 30) {
      this.mouseWorldPoint.copy(origin).addScaledVector(dir, t);
      this.mouseWorldPoint.y = Math.max(-this.params.bottomHeight, Math.min(this.params.topHeight, this.mouseWorldPoint.y));
    }
  }

  private elasticOut(t: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  }

  public update(delta: number) {
    delta = Math.min(delta, 0.05);
    const { topHeight, bottomHeight } = this.params;
    const totalH = topHeight + bottomHeight;

    this.fpsAccum += delta;
    this.fpsFrames++;
    if (this.fpsAccum >= 1.0) {
      const fps = this.fpsFrames / this.fpsAccum;
      this.fpsSamples.push(fps);
      if (this.fpsSamples.length > 10) this.fpsSamples.shift();
      const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      if (avg < 28 && this.currentCount > 600) {
        this.currentCount = 600;
        (this.points.geometry.attributes.position as THREE.BufferAttribute).setDrawRange(0, this.currentCount);
      }
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    this.densityTimer += delta;
    const densityWave = Math.sin((this.densityTimer / this.densityPeriod) * Math.PI * 2) * 0.5 + 0.5;
    const targetCount = Math.round(800 + densityWave * 50);
    const clampedTarget = Math.min(targetCount, this.baseCount);
    if (this.currentCount > 600 || clampedTarget < this.currentCount) {
      if (this.currentCount < clampedTarget) this.currentCount = Math.min(this.currentCount + 5, clampedTarget);
      else if (this.currentCount > clampedTarget && this.currentCount > 600) this.currentCount = Math.max(600, this.currentCount - 5);
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).setDrawRange(0, this.currentCount);

    let disturbFactor = 0;
    let restoreFactor = 0;
    if (this.isDisturbed) {
      this.disturbTimer += delta;
      if (this.disturbTimer >= this.disturbDuration) {
        this.isDisturbed = false;
        this.disturbTimer = 0;
        disturbFactor = 0;
        restoreFactor = 1;
      } else {
        const t = this.disturbTimer / this.disturbDuration;
        if (t < 0.3) {
          disturbFactor = 1 - t / 0.3;
          restoreFactor = 0;
        } else {
          disturbFactor = 0;
          restoreFactor = this.elasticOut((t - 0.3) / 0.7);
        }
      }
    } else {
      restoreFactor = 1;
    }

    this.updateMouseWorldPoint();
    const hoverRadius = 3;
    const hoverAccel = 1.5;

    let trailSegIndex = 0;
    const maxTrailSeg = this.trailPositions.length / 3;

    for (let i = 0; i < this.baseCount; i++) {
      const p = this.particles[i];
      if (i < this.currentCount) {
        if (!p.active) {
          p.active = true;
          this.resetParticle(p);
        }
      } else {
        if (p.active) p.active = false;
        this.positions[i * 3 + 0] = 0;
        this.positions[i * 3 + 1] = -1000;
        this.positions[i * 3 + 2] = 0;
        this.colors[i * 3 + 0] = 0;
        this.colors[i * 3 + 1] = 0;
        this.colors[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        continue;
      }

      p.age += delta;

      const y = p.pos.y;
      let progressToNeck: number;
      if (y > 0) {
        progressToNeck = 1 - y / (topHeight / 2);
      } else {
        progressToNeck = 1 + y / (bottomHeight / 2);
      }
      progressToNeck = Math.max(0, Math.min(1, progressToNeck));
      p.speed = 0.3 + progressToNeck * progressToNeck * (1.2 - 0.3);

      let hoverBoost = 1;
      const dx = p.pos.x - this.mouseWorldPoint.x;
      const dy = p.pos.y - this.mouseWorldPoint.y;
      const dz = p.pos.z - this.mouseWorldPoint.z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 < hoverRadius * hoverRadius) {
        const dist = Math.sqrt(dist2);
        hoverBoost = 1 + (1 - dist / hoverRadius) * hoverAccel;
      }
      const effSpeed = p.speed * hoverBoost * p.baseSpeed / 0.325;

      if (p.phase === 'falling') {
        p.heightProgress += (effSpeed * delta) / totalH;
        p.spiralAngle += p.spiralSpeed * delta * (0.7 + progressToNeck * 1.5);

        if (p.heightProgress >= 1) {
          p.phase = 'ejecting';
          p.heightProgress = 0;
          const angle = Math.random() * Math.PI * 2;
          const upAngle = 0.3 + Math.random() * 0.7;
          const ejectStrength = 0.6 + Math.random() * 0.6;
          p.velocity.set(
            Math.cos(angle) * Math.sin(upAngle) * ejectStrength,
            Math.cos(upAngle) * ejectStrength * 1.2,
            Math.sin(angle) * Math.sin(upAngle) * ejectStrength
          );
          p.disturbVel.add(p.velocity);
        } else {
          this.positionParticle(p);
        }
      }

      if (p.phase === 'ejecting') {
        p.velocity.y -= 0.5 * delta;
        p.pos.x += p.velocity.x * delta;
        p.pos.y += p.velocity.y * delta;
        p.pos.z += p.velocity.z * delta;

        const distFromAxis = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
        let maxR: number;
        if (p.pos.y > 0) {
          const t = 1 - p.pos.y / (topHeight / 2);
          maxR = topRadius * (1 - t) + 2 * t;
        } else {
          const t = 1 + p.pos.y / (bottomHeight / 2);
          maxR = 2 * (1 - t) + topRadius * t;
        }
        if (distFromAxis > maxR * 0.95) {
          const scale = (maxR * 0.95) / distFromAxis;
          p.pos.x *= scale;
          p.pos.z *= scale;
        }

        if (p.velocity.y <= 0 && p.pos.y > 0) {
          p.phase = 'rising';
          p.heightProgress = (p.pos.y + bottomHeight / 2) / totalH;
          p.spiralAngle = Math.atan2(p.pos.z, p.pos.x);
          const currentR = distFromAxis;
          let expectedR: number;
          if (p.pos.y > 0) {
            const t = 1 - p.pos.y / (topHeight / 2);
            expectedR = topRadius * (1 - t) + 2 * t;
          } else {
            const t = 1 + p.pos.y / (bottomHeight / 2);
            expectedR = 2 * (1 - t) + topRadius * t;
          }
          p.radiusOffset = Math.min(0.98, currentR / Math.max(0.01, expectedR));
          p.velocity.set(0, 0, 0);
        }

        if (p.pos.y > topHeight / 2) {
          p.phase = 'falling';
          p.heightProgress = 0;
          p.velocity.set(0, 0, 0);
        }
      }

      if (p.phase === 'rising') {
        p.heightProgress += (effSpeed * 0.9 * delta) / totalH;
        p.spiralAngle -= p.spiralSpeed * delta * (0.6 + progressToNeck * 1.2);
        if (p.heightProgress >= 1) {
          p.phase = 'falling';
          p.heightProgress = 0;
          p.spiralAngle += Math.PI;
        } else {
          this.positionParticle(p);
        }
      }

      p.jitterPhase += delta * (Math.PI * 2 / p.jitterPeriod);
      const jx = Math.sin(p.jitterPhase) * p.jitterAmp;
      const jy = Math.sin(p.jitterPhase * 1.3 + 1.7) * p.jitterAmp;
      const jz = Math.cos(p.jitterPhase * 0.9 + 0.5) * p.jitterAmp;

      for (let ti = p.trailMax - 1; ti > 0; ti--) {
        p.trail[ti].copy(p.trail[ti - 1]);
      }
      p.trail[0].copy(p.pos);

      if (this.isDisturbed && disturbFactor > 0) {
        p.pos.x += p.disturbVel.x * delta * disturbFactor * 3;
        p.pos.y += p.disturbVel.y * delta * disturbFactor * 3;
        p.pos.z += p.disturbVel.z * delta * disturbFactor * 3;
        p.disturbVel.multiplyScalar(1 - delta * 0.8);
      } else if (restoreFactor < 1) {
        p.disturbVel.multiplyScalar(0.9);
      }

      p.pos.x += jx;
      p.pos.y += jy;
      p.pos.z += jz;

      const hNorm = (p.pos.y + bottomHeight / 2) / totalH;
      let hue: number;
      if (hNorm < 0.5) {
        const t = hNorm / 0.5;
        hue = 0 + (270 - 0) * t;
      } else {
        const t = (hNorm - 0.5) / 0.5;
        hue = 270 + (210 - 270) * t;
      }
      const brightness = 0.55 + (p.speed / 1.2) * 0.45;
      const tmpColor = new THREE.Color().setHSL(hue / 360, 1.0, brightness);

      this.positions[i * 3 + 0] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.colors[i * 3 + 0] = tmpColor.r;
      this.colors[i * 3 + 1] = tmpColor.g;
      this.colors[i * 3 + 2] = tmpColor.b;
      this.sizes[i] = (2.0 + p.speed * 2.5 + (hoverBoost - 1) * 3);

      for (let ti = 0; ti < p.trailMax - 1; ti++) {
        if (trailSegIndex >= maxTrailSeg) break;
        const a = p.trail[ti];
        const b = p.trail[ti + 1];
        this.trailPositions[trailSegIndex * 3 + 0] = a.x;
        this.trailPositions[trailSegIndex * 3 + 1] = a.y;
        this.trailPositions[trailSegIndex * 3 + 2] = a.z;
        this.trailPositions[trailSegIndex * 3 + 3] = b.x;
        this.trailPositions[trailSegIndex * 3 + 4] = b.y;
        this.trailPositions[trailSegIndex * 3 + 5] = b.z;

        const alpha1 = 1 - ti / (p.trailMax - 1);
        const alpha2 = 1 - (ti + 1) / (p.trailMax - 1);
        this.trailColors[trailSegIndex * 4 + 0] = tmpColor.r;
        this.trailColors[trailSegIndex * 4 + 1] = tmpColor.g;
        this.trailColors[trailSegIndex * 4 + 2] = tmpColor.b;
        this.trailColors[trailSegIndex * 4 + 3] = alpha1 * 0.45;
        this.trailColors[trailSegIndex * 4 + 4] = tmpColor.r;
        this.trailColors[trailSegIndex * 4 + 5] = tmpColor.g;
        this.trailColors[trailSegIndex * 4 + 6] = tmpColor.b;
        this.trailColors[trailSegIndex * 4 + 7] = alpha2 * 0.45;

        trailSegIndex += 2;
      }
    }

    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.trailLines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trailLines.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.trailLines.geometry as THREE.BufferGeometry).setDrawRange(0, trailSegIndex);
  }

  public getActiveCount(): number {
    return this.currentCount;
  }

  public dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.trailLines.geometry.dispose();
    (this.trailLines.material as THREE.Material).dispose();
    this.scene.remove(this.points);
    this.scene.remove(this.trailLines);
  }
}
