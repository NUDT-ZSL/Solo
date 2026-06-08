import * as THREE from 'three';
import { TimeSystem } from './TimeSystem';

const crystalVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUvCoord;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vUvCoord = uv;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const crystalFragmentShader = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uEmissive;
  uniform float uTime;
  uniform float uPulseProgress;
  uniform float uPulseIntensity;
  uniform vec3 uPulseOrigin;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUvCoord;

  vec3 rainbow(float t) {
    vec3 c = 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
    return c;
  }

  float flowPattern(vec3 p, float t) {
    float n = sin(p.x * 3.0 + t * 0.8) * cos(p.y * 2.5 + t * 0.6) * sin(p.z * 2.0 + t * 0.7);
    n += sin(p.x * 5.0 - t * 1.2) * cos(p.z * 4.0 + t * 0.9) * 0.3;
    return n * 0.5 + 0.5;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

    float flow = flowPattern(vLocalPosition, uTime);
    vec3 baseColor = mix(uColorA, uColorB, flow);

    float shimmer = sin(vLocalPosition.y * 12.0 + uTime * 2.0) * 0.5 + 0.5;
    shimmer *= sin(vLocalPosition.x * 8.0 - uTime * 1.5) * 0.5 + 0.5;
    baseColor += vec3(shimmer * 0.08);

    float pulseRipple = 0.0;
    if (uPulseIntensity > 0.001) {
      float dist = distance(vWorldPosition, uPulseOrigin);
      float rippleRadius = uPulseProgress * 8.0;
      float rippleWidth = 1.2;
      float ring = abs(dist - rippleRadius);
      pulseRipple = uPulseIntensity * smoothstep(rippleWidth, 0.0, ring);

      float rainbowPhase = dist * 0.5 - uPulseProgress * 2.0;
      vec3 rainbowColor = rainbow(rainbowPhase);
      baseColor = mix(baseColor, rainbowColor, pulseRipple);
    }

    vec3 emissiveGlow = uEmissive * (fresnel * 0.4 + 0.15);
    emissiveGlow += uEmissive * flow * 0.1;
    emissiveGlow += vec3(pulseRipple * 0.6);

    vec3 lightDir = normalize(vec3(1.0, 1.5, 0.8));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.3 + 0.7;

    vec3 finalColor = baseColor * diffuse + emissiveGlow;
    finalColor += fresnel * uColorA * 0.3;

    float alpha = uOpacity * (0.45 + fresnel * 0.35 + pulseRipple * 0.2);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface CrystalShard {
  mesh: THREE.Mesh;
  baseScale: THREE.Vector3;
  phaseOffset: number;
  baseRotation: THREE.Euler;
}

export class Crystal {
  public group: THREE.Group;
  private shards: CrystalShard[] = [];
  private material: THREE.ShaderMaterial;
  private pulseOrigin: THREE.Vector3 = new THREE.Vector3();
  private pulseProgress: number = 0;
  private pulseIntensity: number = 0;
  private isPulsing: boolean = false;

  constructor(private timeSystem: TimeSystem) {
    this.group = new THREE.Group();
    this.material = this._createMaterial();
    this._buildCluster();
  }

  triggerPulse(hitPoint?: THREE.Vector3): void {
    this.pulseOrigin.copy(hitPoint ?? new THREE.Vector3(0, 0, 0));
    this.pulseProgress = 0;
    this.pulseIntensity = 1.0;
    this.isPulsing = true;
  }

  update(delta: number, elapsed: number): void {
    const colorA = this.timeSystem.getColorA();
    const colorB = this.timeSystem.getColorB();
    const emissive = this.timeSystem.getEmissiveColor();

    this.material.uniforms.uColorA.value.copy(colorA);
    this.material.uniforms.uColorB.value.copy(colorB);
    this.material.uniforms.uEmissive.value.copy(emissive);
    this.material.uniforms.uTime.value = elapsed;

    if (this.isPulsing) {
      this.pulseProgress += delta * 0.5;
      this.pulseIntensity = Math.max(0, 1.0 - this.pulseProgress);
      this.material.uniforms.uPulseProgress.value = this.pulseProgress;
      this.material.uniforms.uPulseIntensity.value = this.pulseIntensity;
      this.material.uniforms.uPulseOrigin.value.copy(this.pulseOrigin);
      if (this.pulseIntensity <= 0.001) {
        this.isPulsing = false;
        this.pulseProgress = 0;
        this.pulseIntensity = 0;
        this.material.uniforms.uPulseIntensity.value = 0;
      }
    }

    for (const shard of this.shards) {
      const breathe = 1.0 + Math.sin(elapsed * 0.8 + shard.phaseOffset) * 0.02;
      shard.mesh.scale.set(
        shard.baseScale.x * breathe,
        shard.baseScale.y * (1.0 + Math.sin(elapsed * 0.5 + shard.phaseOffset) * 0.015),
        shard.baseScale.z * breathe
      );
      shard.mesh.rotation.y = shard.baseRotation.y + Math.sin(elapsed * 0.3 + shard.phaseOffset) * 0.02;
    }
  }

  getHitObject(): THREE.Object3D {
    return this.group;
  }

  private _createMaterial(): THREE.ShaderMaterial {
    const colorA = this.timeSystem.getColorA();
    const colorB = this.timeSystem.getColorB();
    const emissive = this.timeSystem.getEmissiveColor();

    return new THREE.ShaderMaterial({
      vertexShader: crystalVertexShader,
      fragmentShader: crystalFragmentShader,
      uniforms: {
        uColorA: { value: colorA.clone() },
        uColorB: { value: colorB.clone() },
        uEmissive: { value: emissive.clone() },
        uTime: { value: 0 },
        uPulseProgress: { value: 0 },
        uPulseIntensity: { value: 0 },
        uPulseOrigin: { value: new THREE.Vector3() },
        uOpacity: { value: 0.78 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  private _buildCluster(): void {
    const configs = [
      { pos: [0, 0, 0], rot: [0, 0, 0], h: 3.2, r: 0.38, tipH: 1.4 },
      { pos: [0.65, -0.3, 0.3], rot: [0.15, 0.3, 0.1], h: 2.6, r: 0.3, tipH: 1.1 },
      { pos: [-0.55, -0.2, -0.4], rot: [-0.1, -0.4, 0.15], h: 2.8, r: 0.32, tipH: 1.2 },
      { pos: [0.3, -0.5, -0.6], rot: [0.2, -0.2, -0.1], h: 2.2, r: 0.26, tipH: 0.9 },
      { pos: [-0.35, 0.2, 0.55], rot: [-0.15, 0.5, 0.08], h: 2.4, r: 0.28, tipH: 1.0 },
      { pos: [0.1, 0.6, 0.2], rot: [0.08, -0.15, 0.05], h: 1.8, r: 0.22, tipH: 0.75 },
      { pos: [-0.2, -0.6, 0.35], rot: [0.12, 0.6, -0.12], h: 1.6, r: 0.2, tipH: 0.65 },
      { pos: [0.45, 0.15, -0.3], rot: [-0.2, -0.3, 0.18], h: 2.0, r: 0.24, tipH: 0.85 },
    ];

    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const geom = this._createCrystalGeometry(cfg.h, cfg.r, cfg.tipH);
      const mesh = new THREE.Mesh(geom, this.material);

      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);

      const baseScale = new THREE.Vector3(1, 1, 1);
      const phaseOffset = i * 1.3;

      this.shards.push({
        mesh,
        baseScale,
        phaseOffset,
        baseRotation: mesh.rotation.clone(),
      });
      this.group.add(mesh);
    }

    const glowGeom = new THREE.SphereGeometry(2.5, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNorm;
        void main() {
          vNorm = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlowColor;
        uniform float uTime;
        varying vec3 vNorm;
        void main() {
          float intensity = pow(0.65 - dot(vNorm, vec3(0.0, 0.0, 1.0)), 3.0);
          float pulse = 0.8 + sin(uTime * 0.6) * 0.2;
          gl_FragColor = vec4(uGlowColor * intensity * pulse, intensity * 0.25);
        }
      `,
      uniforms: {
        uGlowColor: { value: this.timeSystem.getEmissiveColor().clone() },
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    this.group.add(glowMesh);
    (this.group.userData as Record<string, unknown>).glowMat = glowMat;
  }

  updateGlow(elapsed: number): void {
    const glowMat = (this.group.userData as Record<string, unknown>).glowMat as THREE.ShaderMaterial;
    if (glowMat) {
      glowMat.uniforms.uGlowColor.value.copy(this.timeSystem.getEmissiveColor());
      glowMat.uniforms.uTime.value = elapsed;
    }
  }

  private _createCrystalGeometry(height: number, radius: number, tipHeight: number): THREE.BufferGeometry {
    const sides = 6;
    const prismGeom = new THREE.CylinderGeometry(radius, radius * 1.05, height, sides, 1, false);
    const tipGeom = new THREE.ConeGeometry(radius, tipHeight, sides, 1, false);

    prismGeom.translate(0, height / 2, 0);
    tipGeom.translate(0, height + tipHeight / 2, 0);

    const merged = this._mergeGeometries(prismGeom, tipGeom);
    return merged;
  }

  private _mergeGeometries(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
    const posA = a.getAttribute('position') as THREE.BufferAttribute;
    const posB = b.getAttribute('position') as THREE.BufferAttribute;
    const normA = a.getAttribute('normal') as THREE.BufferAttribute;
    const normB = b.getAttribute('normal') as THREE.BufferAttribute;
    const uvA = a.getAttribute('uv') as THREE.BufferAttribute;
    const uvB = b.getAttribute('uv') as THREE.BufferAttribute;

    const totalVerts = posA.count + posB.count;
    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);

    positions.set(new Float32Array(posA.array), 0);
    positions.set(new Float32Array(posB.array), posA.count * 3);
    normals.set(new Float32Array(normA.array), 0);
    normals.set(new Float32Array(normB.array), normA.count * 3);

    if (uvA && uvB) {
      uvs.set(new Float32Array(uvA.array), 0);
      uvs.set(new Float32Array(uvB.array), uvA.count * 2);
    }

    const idxA = a.getIndex();
    const idxB = b.getIndex();

    let indices: Uint32Array;
    if (idxA && idxB) {
      indices = new Uint32Array(idxA.count + idxB.count);
      indices.set(new Uint32Array(idxA.array), 0);
      for (let i = 0; i < idxB.count; i++) {
        indices[idxA.count + i] = idxB.array[i] + posA.count;
      }
    } else {
      const countA = posA.count;
      const countB = posB.count;
      indices = new Uint32Array(countA + countB);
      for (let i = 0; i < countA; i++) indices[i] = i;
      for (let i = 0; i < countB; i++) indices[countA + i] = i + posA.count;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();
    return geom;
  }
}
