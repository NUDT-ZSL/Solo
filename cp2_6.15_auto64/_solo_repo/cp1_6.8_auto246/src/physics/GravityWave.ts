import * as THREE from "three";
import { GRAVITY_WAVE } from "../utils/constants";
import type { Universe } from "../scene/Universe";

interface WaveRing {
  mesh: THREE.Mesh;
  radius: number;
  age: number;
  maxAge: number;
  hitPlanets: Set<number>;
}

interface PulseEffect {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

export class GravityWaveSystem {
  private waves: WaveRing[] = [];
  private pulses: PulseEffect[] = [];
  private scene: THREE.Scene;
  private universe: Universe;
  private intensity: number = GRAVITY_WAVE.DEFAULT_INTENSITY;

  constructor(scene: THREE.Scene, universe: Universe) {
    this.scene = scene;
    this.universe = universe;
  }

  public emit(origin: THREE.Vector3): void {
    const numRings = GRAVITY_WAVE.RINGS_PER_WAVE;
    const maxAge = GRAVITY_WAVE.MAX_RADIUS / GRAVITY_WAVE.SPEED;

    for (let i = 0; i < numRings; i++) {
      const ring = this.createRingMesh();
      ring.position.copy(origin);
      ring.position.y += 0.05 * i;
      this.scene.add(ring);

      this.waves.push({
        mesh: ring,
        radius: 0.1,
        age: -i * 0.08,
        maxAge: maxAge,
        hitPlanets: new Set(),
      });
    }

    const pulse = this.createPulseMesh();
    pulse.position.copy(origin);
    this.scene.add(pulse);
    this.pulses.push({
      mesh: pulse,
      age: 0,
      maxAge: GRAVITY_WAVE.PULSE_DURATION,
    });
  }

  private createRingMesh(): THREE.Mesh {
    const geo = new THREE.RingGeometry(0.5, 0.5 + GRAVITY_WAVE.RING_WIDTH, GRAVITY_WAVE.RING_SEGMENTS);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uOpacity: { value: 1.0 },
        uColor: { value: new THREE.Color(0x7c4dff) },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float pulse = sin(vUv.x * 6.28318 * 3.0 + uTime * 8.0) * 0.5 + 0.5;
          float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
          vec3 col = mix(uColor, vec3(0.9, 0.85, 1.0), pulse * 0.4);
          gl_FragColor = vec4(col, uOpacity * edgeFade * (0.7 + pulse * 0.3));
        }
      `,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createPulseMesh(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0xb388ff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float alpha = rim * (1.0 - uProgress) * 2.0;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    return new THREE.Mesh(geo, mat);
  }

  public update(delta: number, time: number): void {
    this.updateWaves(delta, time);
    this.updatePulses(delta);
    this.checkCollisions();
  }

  private updateWaves(delta: number, time: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.age += delta;

      if (w.age < 0) continue;

      w.radius += GRAVITY_WAVE.SPEED * delta;

      if (w.radius >= GRAVITY_WAVE.MAX_RADIUS || w.age >= w.maxAge) {
        this.scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        (w.mesh.material as THREE.ShaderMaterial).dispose();
        this.waves.splice(i, 1);
        continue;
      }

      const progress = w.radius / GRAVITY_WAVE.MAX_RADIUS;
      const opacity = Math.max(0, 1.0 - progress) * this.intensity;

      const innerR = Math.max(0.01, w.radius - GRAVITY_WAVE.RING_WIDTH * 0.5);
      const outerR = w.radius + GRAVITY_WAVE.RING_WIDTH * 0.5;

      w.mesh.geometry.dispose();
      w.mesh.geometry = new THREE.RingGeometry(innerR, outerR, GRAVITY_WAVE.RING_SEGMENTS);

      const mat = w.mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = opacity;
      mat.uniforms.uTime.value = time;

      w.mesh.lookAt(
        w.mesh.position.x,
        w.mesh.position.y + 100,
        w.mesh.position.z
      );
    }
  }

  private updatePulses(delta: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.age += delta;

      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.ShaderMaterial).dispose();
        this.pulses.splice(i, 1);
        continue;
      }

      const progress = p.age / p.maxAge;
      const scale = 1 + progress * GRAVITY_WAVE.PULSE_INTENSITY * 10;
      p.mesh.scale.set(scale, scale, scale);

      const mat = p.mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uProgress.value = progress;
    }
  }

  private checkCollisions(): void {
    for (const w of this.waves) {
      if (w.age < 0) continue;

      for (let pi = 0; pi < this.universe.planets.length; pi++) {
        if (w.hitPlanets.has(pi)) continue;

        const planet = this.universe.planets[pi];
        const dist = w.mesh.position.distanceTo(planet.mesh.position);
        const ringInner = Math.max(0.01, w.radius - GRAVITY_WAVE.RING_WIDTH);
        const ringOuter = w.radius + GRAVITY_WAVE.RING_WIDTH;

        if (dist >= ringInner && dist <= ringOuter) {
          w.hitPlanets.add(pi);
          this.applyDeflection(pi, w);
        }
      }
    }
  }

  private applyDeflection(planetIndex: number, wave: WaveRing): void {
    const planet = this.universe.planets[planetIndex];
    const direction = planet.mesh.position.clone().sub(wave.mesh.position).normalize();

    const force = direction.multiplyScalar(
      GRAVITY_WAVE.DEFLECTION_FORCE * this.intensity
    );

    const tangent = new THREE.Vector3(-direction.z, direction.y * 0.3, direction.x);
    force.add(tangent.multiplyScalar(0.5 * this.intensity));

    planet.velocity.add(force);
    planet.perturbed = true;
    planet.perturbTimer = 0.5;

    const planetColor = new THREE.Color(planet.baseColor);
    const trailColor = new THREE.Color().lerpColors(
      planetColor,
      new THREE.Color(0xb388ff),
      0.5
    );

    this.universe.emitParticles(planet.mesh.position.clone(), trailColor, 15);
  }

  public setIntensity(value: number): void {
    this.intensity = value;
  }

  public reset(): void {
    for (const w of this.waves) {
      this.scene.remove(w.mesh);
      w.mesh.geometry.dispose();
      (w.mesh.material as THREE.ShaderMaterial).dispose();
    }
    this.waves.length = 0;

    for (const p of this.pulses) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.ShaderMaterial).dispose();
    }
    this.pulses.length = 0;
  }
}
