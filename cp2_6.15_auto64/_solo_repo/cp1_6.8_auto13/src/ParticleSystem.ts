import * as THREE from 'three';

const SNOW_COUNT = 3000;
const LIGHT_DUST_COUNT = 500;

interface SnowParticle {
  velocity: THREE.Vector3;
  wobble: number;
  wobbleSpeed: number;
}

interface DustBurst {
  position: THREE.Vector3;
  energy: number;
  time: number;
  maxTime: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private snowGeometry: THREE.BufferGeometry;
  private snowMaterial: THREE.ShaderMaterial;
  private snowMesh: THREE.Points;
  private snowData: SnowParticle[] = [];
  private snowPositions: Float32Array;

  private dustBursts: DustBurst[] = [];
  private dustGeometry: THREE.BufferGeometry;
  private dustMaterial: THREE.ShaderMaterial;
  private dustMesh: THREE.Points;
  private dustPositions: Float32Array;
  private dustAlphas: Float32Array;
  private dustVelocities: THREE.Vector3[] = [];

  private density: number = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.snowPositions = new Float32Array(SNOW_COUNT * 3);
    this.snowGeometry = new THREE.BufferGeometry();
    this.initSnow();

    const snowUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.7 },
    };
    this.snowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: snowUniforms,
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (120.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha * uOpacity;
          gl_FragColor = vec4(0.85, 0.9, 1.0, alpha);
        }
      `,
    });
    this.snowMesh = new THREE.Points(this.snowGeometry, this.snowMaterial);
    this.scene.add(this.snowMesh);

    this.dustPositions = new Float32Array(LIGHT_DUST_COUNT * 3);
    this.dustAlphas = new Float32Array(LIGHT_DUST_COUNT);
    this.dustGeometry = new THREE.BufferGeometry();
    this.initDust();

    this.dustMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0x66aaff) },
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    this.dustMesh = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.scene.add(this.dustMesh);
  }

  private initSnow(): void {
    const sizes = new Float32Array(SNOW_COUNT);
    const alphas = new Float32Array(SNOW_COUNT);

    for (let i = 0; i < SNOW_COUNT; i++) {
      const x = (Math.random() - 0.5) * 120;
      const y = Math.random() * 50;
      const z = (Math.random() - 0.5) * 120;

      this.snowPositions[i * 3] = x;
      this.snowPositions[i * 3 + 1] = y;
      this.snowPositions[i * 3 + 2] = z;

      sizes[i] = 0.3 + Math.random() * 0.8;
      alphas[i] = 0.3 + Math.random() * 0.7;

      this.snowData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          -(0.5 + Math.random() * 1.0) * 0.3,
          (Math.random() - 0.5) * 0.02
        ),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 1.5,
      });
    }

    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snowGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.snowGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  }

  private initDust(): void {
    const sizes = new Float32Array(LIGHT_DUST_COUNT);

    for (let i = 0; i < LIGHT_DUST_COUNT; i++) {
      this.dustPositions[i * 3] = 0;
      this.dustPositions[i * 3 + 1] = -100;
      this.dustPositions[i * 3 + 2] = 0;

      this.dustAlphas[i] = 0;
      sizes[i] = 0.5 + Math.random() * 1.0;

      this.dustVelocities.push(new THREE.Vector3());
    }

    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.dustAlphas, 1));
    this.dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  }

  triggerLightDust(position: THREE.Vector3, energy: number): void {
    const normalizedEnergy = Math.min(energy / 100, 1);
    const count = Math.floor(LIGHT_DUST_COUNT * 0.4 * this.density);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.2) * Math.PI;
      const speed = (2 + Math.random() * 4) * normalizedEnergy;

      this.dustPositions[i * 3] = position.x;
      this.dustPositions[i * 3 + 1] = position.y;
      this.dustPositions[i * 3 + 2] = position.z;

      this.dustAlphas[i] = 0.8 + Math.random() * 0.2;

      this.dustVelocities[i].set(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed * 0.8 + 2,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
    }

    this.dustGeometry.attributes.position.needsUpdate = true;
    this.dustGeometry.attributes.aAlpha.needsUpdate = true;

    this.dustBursts.push({
      position: position.clone(),
      energy: normalizedEnergy,
      time: 0,
      maxTime: 2.0 + normalizedEnergy,
    });
  }

  setDensity(value: number): void {
    this.density = value;
  }

  update(delta: number, elapsed: number): void {
    const activeSnow = Math.floor(SNOW_COUNT * this.density);

    for (let i = 0; i < SNOW_COUNT; i++) {
      if (i >= activeSnow) {
        this.snowPositions[i * 3 + 1] = -100;
        continue;
      }

      const data = this.snowData[i];
      data.wobble += data.wobbleSpeed * delta;

      this.snowPositions[i * 3] += data.velocity.x + Math.sin(data.wobble) * 0.01;
      this.snowPositions[i * 3 + 1] += data.velocity.y * delta * 60;
      this.snowPositions[i * 3 + 2] += data.velocity.z + Math.cos(data.wobble) * 0.01;

      if (this.snowPositions[i * 3 + 1] < -1) {
        this.snowPositions[i * 3] = (Math.random() - 0.5) * 120;
        this.snowPositions[i * 3 + 1] = 45 + Math.random() * 10;
        this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
    }
    this.snowGeometry.attributes.position.needsUpdate = true;
    this.snowMaterial.uniforms.uTime.value = elapsed;

    for (let b = this.dustBursts.length - 1; b >= 0; b--) {
      const burst = this.dustBursts[b];
      burst.time += delta;

      if (burst.time >= burst.maxTime) {
        this.dustBursts.splice(b, 1);
        continue;
      }

      const count = Math.floor(LIGHT_DUST_COUNT * 0.4 * this.density);
      for (let i = 0; i < count; i++) {
        this.dustPositions[i * 3] += this.dustVelocities[i].x * delta;
        this.dustPositions[i * 3 + 1] += this.dustVelocities[i].y * delta;
        this.dustPositions[i * 3 + 2] += this.dustVelocities[i].z * delta;

        this.dustVelocities[i].y -= 3 * delta;
        this.dustVelocities[i].multiplyScalar(1 - 1.5 * delta);

        const progress = burst.time / burst.maxTime;
        this.dustAlphas[i] = Math.max(0, (1 - progress) * 0.8);
      }

      this.dustGeometry.attributes.position.needsUpdate = true;
      this.dustGeometry.attributes.aAlpha.needsUpdate = true;
    }
  }

  dispose(): void {
    this.snowGeometry.dispose();
    this.snowMaterial.dispose();
    this.scene.remove(this.snowMesh);
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
    this.scene.remove(this.dustMesh);
  }
}
