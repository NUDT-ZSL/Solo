import * as THREE from 'three';
import { clamp } from '../utils/animation';

export interface ParticleCloudOptions {
  count?: number;
  innerRadius?: number;
  outerRadius?: number;
  spiralArms?: number;
}

export interface InterferenceEvent {
  position: THREE.Vector3;
  intensity: number;
  age: number;
}

export class ParticleCloud {
  group: THREE.Group;
  particleCount: number;
  innerRadius: number;
  outerRadius: number;
  spiralArms: number;
  density: number;

  private points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private basePositions: Float32Array;
  private spiralPhases: Float32Array;
  private armIndices: Float32Array;
  private radialDistances: Float32Array;
  private interferences: InterferenceEvent[];
  private ringGroup: THREE.Group;

  constructor(opts: ParticleCloudOptions = {}) {
    this.particleCount = opts.count ?? 3000;
    this.innerRadius = opts.innerRadius ?? 3;
    this.outerRadius = opts.outerRadius ?? 12;
    this.spiralArms = opts.spiralArms ?? 3;
    this.density = 1.0;
    this.interferences = [];

    this.group = new THREE.Group();
    this.ringGroup = new THREE.Group();
    this.group.add(this.ringGroup);

    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.spiralPhases = new Float32Array(this.particleCount);
    this.armIndices = new Float32Array(this.particleCount);
    this.radialDistances = new Float32Array(this.particleCount);

    this.initParticles();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uInterferencePos: { value: new THREE.Vector3() },
        uInterferenceIntensity: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec3 uInterferencePos;
        uniform float uInterferenceIntensity;
        attribute float aSpiralPhase;
        attribute float aArmIndex;
        attribute float aRadialDist;
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          vec3 pos = position;
          float angle = aSpiralPhase + uTime * 0.15 * (1.0 + aArmIndex * 0.2);
          float r = aRadialDist;
          pos.x = r * cos(angle);
          pos.z = r * sin(angle);
          pos.y += sin(uTime * 0.5 + aSpiralPhase * 2.0) * 0.3;

          vec3 toInterf = pos - uInterferencePos;
          float dist = length(toInterf);
          float interference = uInterferenceIntensity * exp(-dist * 0.3);
          pos += normalize(toInterf) * interference * 0.8;
          pos.y += sin(dist * 3.0 - uTime * 4.0) * interference * 0.4;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = (2.0 + interference * 4.0) * uPixelRatio * (80.0 / -mvPos.z);

          float armColor = aArmIndex / 3.0;
          vec3 baseCol = mix(
            vec3(0.4, 0.2, 0.9),
            vec3(0.6, 0.4, 1.0),
            armColor
          );
          vColor = baseCol + vec3(0.3, 0.5, 1.0) * interference;
          vAlpha = 0.4 + interference * 0.6;
          vAlpha *= smoothstep(13.0, 10.0, r);
          vAlpha *= smoothstep(2.5, 4.0, r);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = vAlpha * smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.basePositions, 3));
    this.geometry.setAttribute('aSpiralPhase', new THREE.BufferAttribute(this.spiralPhases, 1));
    this.geometry.setAttribute('aArmIndex', new THREE.BufferAttribute(this.armIndices, 1));
    this.geometry.setAttribute('aRadialDist', new THREE.BufferAttribute(this.radialDistances, 1));

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  private initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const arm = Math.floor(Math.random() * this.spiralArms);
      const armAngle = (arm / this.spiralArms) * Math.PI * 2;

      const t = Math.random();
      const r = this.innerRadius + (this.outerRadius - this.innerRadius) * t;

      const spiralAngle = armAngle + t * Math.PI * 1.5;
      const scatter = (Math.random() - 0.5) * 0.8 * (0.5 + t);

      this.spiralPhases[i] = spiralAngle + scatter;
      this.armIndices[i] = arm;
      this.radialDistances[i] = r;

      this.basePositions[i * 3] = r * Math.cos(spiralAngle);
      this.basePositions[i * 3 + 1] = (Math.random() - 0.5) * 1.5 * (0.3 + t * 0.7);
      this.basePositions[i * 3 + 2] = r * Math.sin(spiralAngle);
    }
  }

  addInterference(position: THREE.Vector3, intensity: number) {
    this.interferences.push({ position: position.clone(), intensity, age: 0 });
    this.spawnDiffractionRing(position, intensity);
  }

  private spawnDiffractionRing(position: THREE.Vector3, intensity: number) {
    const ringCount = Math.min(Math.ceil(intensity * 2), 5);
    for (let i = 0; i < ringCount; i++) {
      const ringRadius = 1.5 + i * 1.2;
      const geo = new THREE.RingGeometry(ringRadius, ringRadius + 0.15, 128);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uAge: { value: 0 },
          uIntensity: { value: intensity },
          uHue: { value: i * 0.15 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uAge;
          uniform float uIntensity;
          uniform float uHue;
          varying vec2 vUv;
          void main() {
            float fade = 1.0 - smoothstep(0.0, 1.0, uAge);
            vec3 col = vec3(
              0.5 + 0.5 * sin(uHue + uAge * 2.0),
              0.3 + 0.4 * sin(uHue + uAge * 2.0 + 2.0),
              0.8 + 0.2 * sin(uHue + uAge * 2.0 + 4.0)
            );
            float alpha = fade * 0.6 * uIntensity;
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const ring = new THREE.Mesh(geo, mat);
      ring.position.copy(position);
      ring.lookAt(0, 0, 0);
      this.ringGroup.add(ring);

      const startTime = performance.now();
      const lifespan = 2000 + i * 400;
      const animate = () => {
        const age = (performance.now() - startTime) / lifespan;
        mat.uniforms.uAge.value = age;
        const s = 1 + age * 2;
        ring.scale.set(s, s, s);
        if (age < 1) {
          requestAnimationFrame(animate);
        } else {
          this.ringGroup.remove(ring);
          geo.dispose();
          mat.dispose();
        }
      };
      requestAnimationFrame(animate);
    }
  }

  setDensity(density: number) {
    this.density = clamp(density, 0.1, 2.0);
    this.material.uniforms.uPixelRatio.value = density;
  }

  setParticleCount(count: number) {
    if (count === this.particleCount) return;
    this.particleCount = count;

    this.basePositions = new Float32Array(count * 3);
    this.spiralPhases = new Float32Array(count);
    this.armIndices = new Float32Array(count);
    this.radialDistances = new Float32Array(count);
    this.initParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.basePositions, 3));
    this.geometry.setAttribute('aSpiralPhase', new THREE.BufferAttribute(this.spiralPhases, 1));
    this.geometry.setAttribute('aArmIndex', new THREE.BufferAttribute(this.armIndices, 1));
    this.geometry.setAttribute('aRadialDist', new THREE.BufferAttribute(this.radialDistances, 1));
    this.geometry.attributes.position.needsUpdate = true;
  }

  update(delta: number, elapsed: number) {
    this.material.uniforms.uTime.value = elapsed;

    if (this.interferences.length > 0) {
      const inf = this.interferences[0];
      inf.age += delta;
      const fade = Math.max(0, 1 - inf.age / 2);
      this.material.uniforms.uInterferencePos.value.copy(inf.position);
      this.material.uniforms.uInterferenceIntensity.value = inf.intensity * fade;

      if (inf.age > 2) {
        this.interferences.shift();
      }
    } else {
      this.material.uniforms.uInterferenceIntensity.value *= 0.9;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    while (this.ringGroup.children.length > 0) {
      const child = this.ringGroup.children[0] as THREE.Mesh;
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
      this.ringGroup.remove(child);
    }
  }
}
