import * as THREE from 'three';
import { THEMES } from './island';

const jellyfishVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aType;
  varying float vPhase;
  varying float vType;
  varying vec3 vColor;
  uniform float uTime;
  uniform vec3 uWarmColor;
  uniform vec3 uCoolColor;

  void main() {
    vPhase = aPhase;
    vType = aType;

    float pulse = sin(uTime * 2.0 + aPhase) * 0.15 + 1.0;
    float size = aSize * pulse;

    vColor = mix(uCoolColor, uWarmColor, aType);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const jellyfishFragmentShader = `
  varying float vPhase;
  varying float vType;
  varying vec3 vColor;
  uniform float uTime;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float tentaclePattern = 0.0;
    for (int i = 0; i < 6; i++) {
      float angle = float(i) * 3.14159 / 3.0 + uTime * 0.5 + vPhase;
      vec2 dir = vec2(cos(angle), sin(angle));
      float proj = abs(dot(center * 2.0, dir));
      float perp = length(center * 2.0 - proj * dir);
      tentaclePattern += smoothstep(0.15, 0.0, perp) * smoothstep(0.1, 0.5, proj);
    }

    float dome = smoothstep(0.5, 0.25, dist);
    float innerGlow = smoothstep(0.3, 0.0, dist);

    float alpha = dome * 0.8 + innerGlow * 0.6 + tentaclePattern * 0.4;
    alpha = clamp(alpha, 0.0, 1.0);

    vec3 color = vColor;
    color += color * innerGlow * 0.8;
    color += vec3(1.0) * tentaclePattern * 0.3;

    gl_FragColor = vec4(color, alpha);
  }
`;

const connectionVertexShader = `
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const connectionFragmentShader = `
  varying float vAlpha;
  uniform vec3 uColor;

  void main() {
    gl_FragColor = vec4(uColor, vAlpha * 0.35);
  }
`;

interface ParticleData {
  velocity: THREE.Vector3;
  originalVelocity: THREE.Vector3;
  phase: number;
  size: number;
  type: number;
  influenceTimer: number;
  influenceVelocity: THREE.Vector3;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleCount: number;
  private particles: THREE.Points;
  private particleData: ParticleData[];
  private particleMaterial: THREE.ShaderMaterial;

  private connectionLines: THREE.LineSegments;
  private connectionGeometry: THREE.BufferGeometry;
  private connectionMaterial: THREE.ShaderMaterial;
  private maxConnectionDistance: number = 10;

  private bounds: THREE.Box3 = new THREE.Box3(
    new THREE.Vector3(-45, -20, -45),
    new THREE.Vector3(45, 20, 45)
  );

  private positions: Float32Array;
  private sizes: Float32Array;
  private phases: Float32Array;
  private types: Float32Array;

  constructor(scene: THREE.Scene, count: number = 200, theme: string = 'deep') {
    this.scene = scene;
    this.particleCount = count;
    this.particleData = [];

    this.positions = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.phases = new Float32Array(this.particleCount);
    this.types = new Float32Array(this.particleCount);

    this.particleMaterial = this.createParticleMaterial(theme);
    this.particles = this.createParticles();

    this.connectionMaterial = this.createConnectionMaterial(theme);
    this.connectionGeometry = new THREE.BufferGeometry();
    this.connectionLines = new THREE.LineSegments(this.connectionGeometry, this.connectionMaterial);
    this.connectionLines.frustumCulled = false;

    this.scene.add(this.particles);
    this.scene.add(this.connectionLines);
  }

  private createParticleMaterial(theme: string): THREE.ShaderMaterial {
    const colors = THEMES[theme] || THEMES.deep;
    return new THREE.ShaderMaterial({
      vertexShader: jellyfishVertexShader,
      fragmentShader: jellyfishFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWarmColor: { value: colors.warm },
        uCoolColor: { value: colors.cool }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false
    });
  }

  private createConnectionMaterial(theme: string): THREE.ShaderMaterial {
    const colors = THEMES[theme] || THEMES.deep;
    return new THREE.ShaderMaterial({
      vertexShader: connectionVertexShader,
      fragmentShader: connectionFragmentShader,
      uniforms: {
        uColor: { value: colors.cool.clone().lerp(colors.warm, 0.5) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();

    for (let i = 0; i < this.particleCount; i++) {
      const pos = this.randomPosition();
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      this.sizes[i] = 2.5 + Math.random() * 4;
      this.phases[i] = Math.random() * Math.PI * 2;
      this.types[i] = Math.random();

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1.5
      );
      this.particleData.push({
        velocity: velocity.clone(),
        originalVelocity: velocity.clone(),
        phase: this.phases[i],
        size: this.sizes[i],
        type: this.types[i],
        influenceTimer: 0,
        influenceVelocity: new THREE.Vector3()
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
    geometry.setAttribute('aType', new THREE.BufferAttribute(this.types, 1));

    return new THREE.Points(geometry, this.particleMaterial);
  }

  private randomPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(80),
      THREE.MathUtils.randFloatSpread(30),
      THREE.MathUtils.randFloatSpread(80)
    );
  }

  public update(
    delta: number,
    elapsed: number,
    rippleInfos: { position: THREE.Vector3; radius: number; strength: number }[]
  ): void {
    this.particleMaterial.uniforms.uTime.value = elapsed;

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];

      for (const ripple of rippleInfos) {
        const particlePos = new THREE.Vector3(
          this.positions[i * 3],
          this.positions[i * 3 + 1],
          this.positions[i * 3 + 2]
        );
        const dx = particlePos.x - ripple.position.x;
        const dz = particlePos.z - ripple.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const ringWidth = 3;

        if (Math.abs(dist - ripple.radius) < ringWidth) {
          const ringFactor = 1 - Math.abs(dist - ripple.radius) / ringWidth;
          const pushForce = ripple.strength * ringFactor * 8;
          const dir = new THREE.Vector3(dx, 0, dz).normalize();

          data.influenceVelocity.add(dir.multiplyScalar(pushForce * delta));
          data.influenceTimer = Math.max(data.influenceTimer, 2 * ripple.strength);

          const yJitter = (Math.random() - 0.5) * ripple.strength * ringFactor * 3;
          data.influenceVelocity.y += yJitter * delta * 5;
        }
      }

      if (data.influenceTimer > 0) {
        data.velocity.lerp(data.influenceVelocity, 0.1);
        data.influenceTimer -= delta;
        data.influenceVelocity.multiplyScalar(0.95);
      } else {
        data.velocity.lerp(data.originalVelocity, 0.02);
      }

      const turbulence = new THREE.Vector3(
        Math.sin(elapsed * 0.5 + data.phase) * 0.3,
        Math.cos(elapsed * 0.4 + data.phase * 1.3) * 0.2,
        Math.sin(elapsed * 0.6 + data.phase * 0.7) * 0.3
      );
      data.velocity.add(turbulence.multiplyScalar(delta));

      const maxSpeed = 4;
      if (data.velocity.length() > maxSpeed) {
        data.velocity.setLength(maxSpeed);
      }

      this.positions[i * 3] += data.velocity.x * delta;
      this.positions[i * 3 + 1] += data.velocity.y * delta;
      this.positions[i * 3 + 2] += data.velocity.z * delta;

      const margin = 5;
      if (this.positions[i * 3] < this.bounds.min.x - margin) {
        this.positions[i * 3] = this.bounds.max.x + margin;
      } else if (this.positions[i * 3] > this.bounds.max.x + margin) {
        this.positions[i * 3] = this.bounds.min.x - margin;
      }
      if (this.positions[i * 3 + 1] < this.bounds.min.y - margin) {
        this.positions[i * 3 + 1] = this.bounds.max.y + margin;
      } else if (this.positions[i * 3 + 1] > this.bounds.max.y + margin) {
        this.positions[i * 3 + 1] = this.bounds.min.y - margin;
      }
      if (this.positions[i * 3 + 2] < this.bounds.min.z - margin) {
        this.positions[i * 3 + 2] = this.bounds.max.z + margin;
      } else if (this.positions[i * 3 + 2] > this.bounds.max.z + margin) {
        this.positions[i * 3 + 2] = this.bounds.min.z - margin;
      }
    }

    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    this.updateConnections();
  }

  private updateConnections(): void {
    const maxConnections = 1500;
    const connectionPositions: number[] = [];
    const connectionAlphas: number[] = [];

    const dx = new Float32Array(this.particleCount);
    const dy = new Float32Array(this.particleCount);
    const dz = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      dx[i] = this.positions[i * 3];
      dy[i] = this.positions[i * 3 + 1];
      dz[i] = this.positions[i * 3 + 2];
    }

    let connectionCount = 0;
    const maxDistSq = this.maxConnectionDistance * this.maxConnectionDistance;

    for (let i = 0; i < this.particleCount && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < this.particleCount && connectionCount < maxConnections; j++) {
        const ddX = dx[i] - dx[j];
        const ddY = dy[i] - dy[j];
        const ddZ = dz[i] - dz[j];
        const distSq = ddX * ddX + ddY * ddY + ddZ * ddZ;

        if (distSq < maxDistSq) {
          const alpha = 1 - Math.sqrt(distSq) / this.maxConnectionDistance;

          connectionPositions.push(dx[i], dy[i], dz[i]);
          connectionPositions.push(dx[j], dy[j], dz[j]);
          connectionAlphas.push(alpha, alpha);
          connectionCount++;
        }
      }
    }

    const posAttr = new Float32Array(connectionPositions);
    const alphaAttr = new Float32Array(connectionAlphas);

    this.connectionGeometry.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
    this.connectionGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphaAttr, 1));
    this.connectionGeometry.attributes.position.needsUpdate = true;
    this.connectionGeometry.attributes.aAlpha.needsUpdate = true;
    this.connectionGeometry.computeBoundingSphere();
  }

  public setTheme(theme: string): void {
    const colors = THEMES[theme] || THEMES.deep;
    this.particleMaterial.uniforms.uWarmColor.value = colors.warm;
    this.particleMaterial.uniforms.uCoolColor.value = colors.cool;
    this.connectionMaterial.uniforms.uColor.value = colors.cool.clone().lerp(colors.warm, 0.5);
  }

  public dispose(): void {
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
    this.connectionGeometry.dispose();
    this.connectionMaterial.dispose();
    this.scene.remove(this.particles);
    this.scene.remove(this.connectionLines);
  }
}
