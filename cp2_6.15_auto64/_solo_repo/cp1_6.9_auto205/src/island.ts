import * as THREE from 'three';

export interface ThemeColors {
  warm: THREE.Color;
  cool: THREE.Color;
  glow: THREE.Color;
  ripple: THREE.Color;
}

export const THEMES: Record<string, ThemeColors> = {
  coral: {
    warm: new THREE.Color(0xff8a65),
    cool: new THREE.Color(0x4fc3f7),
    glow: new THREE.Color(0xff6b6b),
    ripple: new THREE.Color(0xff4081)
  },
  aurora: {
    warm: new THREE.Color(0x69f0ae),
    cool: new THREE.Color(0x7c4dff),
    glow: new THREE.Color(0x4fc3f7),
    ripple: new THREE.Color(0x00e5ff)
  },
  lava: {
    warm: new THREE.Color(0xffab40),
    cool: new THREE.Color(0xff5252),
    glow: new THREE.Color(0xff8c00),
    ripple: new THREE.Color(0xffd740)
  },
  deep: {
    warm: new THREE.Color(0xffd54f),
    cool: new THREE.Color(0x3d5afe),
    glow: new THREE.Color(0x7c4dff),
    ripple: new THREE.Color(0xb388ff)
  }
};

const islandVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vElevation;

  uniform float uTime;
  uniform float uWaveSpeed;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    vElevation = length(position);

    vec3 pos = position;
    
    float noise1 = sin(pos.x * 2.0 + uTime * uWaveSpeed) * cos(pos.z * 2.0 + uTime * uWaveSpeed * 0.7) * 0.08;
    float noise2 = sin(pos.y * 3.0 + uTime * uWaveSpeed * 1.3) * 0.05;
    pos += normal * (noise1 + noise2);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const islandFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vElevation;

  uniform float uTime;
  uniform float uWaveSpeed;
  uniform vec3 uWarmColor;
  uniform vec3 uCoolColor;
  uniform vec3 uGlowColor;
  uniform vec3 uRippleCenter;
  uniform float uRippleRadius;
  uniform float uRippleStrength;
  uniform float uColorShift;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;

    float distFromCenter = length(vPosition.xy);
    float centerFactor = 1.0 - smoothstep(0.0, 6.0, distFromCenter);

    float time = uTime * uWaveSpeed;
    vec2 waveUV = uv * 4.0 + vec2(time * 0.1, time * 0.15);
    float wavePattern = fbm(waveUV);
    
    vec2 radialUV = vec2(distFromCenter * 0.5, atan(vPosition.y, vPosition.x) * 0.3);
    float radialWave = sin(radialUV.x * 6.0 - time * 1.5 + fbm(radialUV * 2.0) * 3.0);
    radialWave = radialWave * 0.5 + 0.5;

    float lightPattern = mix(wavePattern, radialWave, 0.6);
    lightPattern += centerFactor * 0.4;

    float warmFactor = centerFactor * 0.8 + smoothstep(0.4, 0.9, lightPattern) * 0.5 + uColorShift;
    warmFactor = clamp(warmFactor, 0.0, 1.0);

    vec3 baseColor = mix(uCoolColor, uWarmColor, warmFactor);

    float rippleDist = length(vPosition.xz - uRippleCenter.xz);
    float rippleWave = sin(rippleDist * 8.0 - uRippleRadius * 20.0) * 0.5 + 0.5;
    float rippleMask = smoothstep(uRippleRadius + 2.0, uRippleRadius - 1.0, rippleDist) * uRippleStrength;
    baseColor = mix(baseColor, uWarmColor + uGlowColor, rippleMask * rippleWave * 0.6);

    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    baseColor += uGlowColor * fresnel * 0.5;

    float alpha = 0.75 + lightPattern * 0.15 + fresnel * 0.1 + rippleMask * 0.1;
    alpha = clamp(alpha, 0.0, 1.0);

    float glowIntensity = (lightPattern + fresnel * 0.5 + rippleMask * rippleWave) * 0.4;
    baseColor += baseColor * glowIntensity;

    gl_FragColor = vec4(baseColor, alpha);
  }
`;

const rippleVertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rippleFragmentShader = `
  varying vec3 vPosition;
  uniform float uRadius;
  uniform float uMaxRadius;
  uniform vec3 uColor;
  uniform float uStrength;

  void main() {
    float dist = length(vPosition.xz);
    float ringWidth = 1.5;
    float edge1 = uRadius - ringWidth;
    float edge2 = uRadius + ringWidth;
    
    float ring = smoothstep(edge1, uRadius, dist) * (1.0 - smoothstep(uRadius, edge2, dist));
    ring = pow(ring, 1.5);

    float fadeOut = 1.0 - smoothstep(0.0, uMaxRadius, uRadius);
    float alpha = ring * fadeOut * uStrength;

    vec3 color = uColor;
    color += color * ring * 0.5;

    gl_FragColor = vec4(color, alpha * 0.8);
  }
`;

export class Island {
  public mesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public rippleMesh: THREE.Mesh;
  public position: THREE.Vector3;

  private material: THREE.ShaderMaterial;
  private rippleMaterial: THREE.ShaderMaterial;
  private rippleActive: boolean = false;
  private rippleRadius: number = 0;
  private rippleStrength: number = 0;
  private readonly RIPPLE_MAX_RADIUS = 15;

  private baseY: number;
  private phaseOffset: number;
  private rotationSpeed: THREE.Vector3;

  constructor(position: THREE.Vector3, theme: string) {
    this.position = position.clone();
    this.baseY = position.y;
    this.phaseOffset = Math.random() * Math.PI * 2;
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.0005,
      (Math.random() - 0.5) * 0.001,
      (Math.random() - 0.5) * 0.0005
    );

    const geometry = this.createGeometry();
    this.material = this.createMaterial(theme);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(this.position);
    this.mesh.userData.island = this;

    this.glowMesh = this.createGlowMesh(theme);
    this.glowMesh.position.copy(this.position);

    this.rippleMaterial = this.createRippleMaterial(theme);
    this.rippleMesh = this.createRippleMesh();
    this.rippleMesh.position.copy(this.position);
    this.rippleMesh.visible = false;
  }

  private createGeometry(): THREE.BufferGeometry {
    const radius = 2 + Math.random() * 3;
    const detail = 3;
    const geometry = new THREE.IcosahedronGeometry(radius, detail);

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const normals: number[] = [];

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const noise = this.simplexLikeNoise(
        vertex.x * 0.8 + this.position.x * 0.1,
        vertex.y * 0.8 + this.position.y * 0.1,
        vertex.z * 0.8 + this.position.z * 0.1
      );
      const scale = 0.7 + noise * 0.6;
      vertex.multiplyScalar(scale);
      positions.setXYZ(i, vertex.x, vertex.y * 0.5, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  private simplexLikeNoise(x: number, y: number, z: number): number {
    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];

    const perm = new Array(512);
    for (let i = 0; i < 256; i++) {
      perm[i] = p[i];
      perm[i + 256] = p[i];
    }

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t: number, a: number, b: number) => a + t * (b - a);

    const grad = (hash: number, x: number, y: number, z: number) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    return lerp(
      z,
      lerp(
        y,
        lerp(x, grad(perm[X + perm[Y + perm[Z]]], x, y, z), grad(perm[X + 1 + perm[Y + perm[Z]]], x - 1, y, z)),
        lerp(x, grad(perm[X + perm[Y + 1 + perm[Z]]], x, y - 1, z), grad(perm[X + 1 + perm[Y + 1 + perm[Z]]], x - 1, y - 1, z))
      ),
      lerp(
        y,
        lerp(x, grad(perm[X + perm[Y + perm[Z + 1]]], x, y, z - 1), grad(perm[X + 1 + perm[Y + perm[Z + 1]]], x - 1, y, z - 1)),
        lerp(x, grad(perm[X + perm[Y + 1 + perm[Z + 1]]], x, y - 1, z - 1), grad(perm[X + 1 + perm[Y + 1 + perm[Z + 1]]], x - 1, y - 1, z - 1))
      )
    );
  }

  private createMaterial(theme: string): THREE.ShaderMaterial {
    const colors = THEMES[theme] || THEMES.deep;
    return new THREE.ShaderMaterial({
      vertexShader: islandVertexShader,
      fragmentShader: islandFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWaveSpeed: { value: 1.0 },
        uWarmColor: { value: colors.warm },
        uCoolColor: { value: colors.cool },
        uGlowColor: { value: colors.glow },
        uRippleCenter: { value: new THREE.Vector3(0, 0, 0) },
        uRippleRadius: { value: 0 },
        uRippleStrength: { value: 0 },
        uColorShift: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createGlowMesh(theme: string): THREE.Mesh {
    const colors = THEMES[theme] || THEMES.deep;
    const glowGeometry = new THREE.IcosahedronGeometry(2.5, 1);
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uGlowColor;
        void main() {
          float intensity = pow(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(uGlowColor, intensity * 0.5);
        }
      `,
      uniforms: {
        uGlowColor: { value: colors.glow }
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.scale.setScalar(1.8);
    return mesh;
  }

  private createRippleMaterial(theme: string): THREE.ShaderMaterial {
    const colors = THEMES[theme] || THEMES.deep;
    return new THREE.ShaderMaterial({
      vertexShader: rippleVertexShader,
      fragmentShader: rippleFragmentShader,
      uniforms: {
        uRadius: { value: 0 },
        uMaxRadius: { value: this.RIPPLE_MAX_RADIUS },
        uColor: { value: colors.ripple },
        uStrength: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createRippleMesh(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(this.RIPPLE_MAX_RADIUS, 64);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, this.rippleMaterial);
    mesh.position.y -= 0.5;
    return mesh;
  }

  public triggerRipple(localPoint: THREE.Vector3): void {
    this.rippleActive = true;
    this.rippleRadius = 0;
    this.rippleStrength = 1;

    const worldLocal = this.position.clone();
    (this.material.uniforms.uRippleCenter.value as THREE.Vector3).copy(
      new THREE.Vector3(localPoint.x - worldLocal.x, 0, localPoint.z - worldLocal.z)
    );
    this.material.uniforms.uRippleStrength.value = 1;
  }

  public update(delta: number, elapsed: number, waveSpeed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uWaveSpeed.value = waveSpeed;

    const floatY = this.baseY + Math.sin(elapsed * 0.5 + this.phaseOffset) * 0.6;
    this.mesh.position.y = floatY;
    this.glowMesh.position.y = floatY;
    this.rippleMesh.position.y = floatY - 0.5;

    this.mesh.rotation.x += this.rotationSpeed.x;
    this.mesh.rotation.y += this.rotationSpeed.y;
    this.mesh.rotation.z += this.rotationSpeed.z;
    this.glowMesh.rotation.copy(this.mesh.rotation);

    if (this.rippleActive) {
      this.rippleRadius += delta * 8;
      this.rippleStrength = Math.max(0, 1 - this.rippleRadius / this.RIPPLE_MAX_RADIUS);

      this.rippleMaterial.uniforms.uRadius.value = this.rippleRadius;
      this.rippleMaterial.uniforms.uStrength.value = this.rippleStrength;
      this.rippleMesh.visible = true;

      this.material.uniforms.uRippleRadius.value = this.rippleRadius;
      this.material.uniforms.uRippleStrength.value = this.rippleStrength;

      if (this.rippleRadius >= this.RIPPLE_MAX_RADIUS) {
        this.rippleActive = false;
        this.rippleMesh.visible = false;
      }
    }

    const currentShift = this.material.uniforms.uColorShift.value as number;
    if (currentShift > 0) {
      this.material.uniforms.uColorShift.value = Math.max(0, currentShift - delta * 0.3);
    }
  }

  public setTheme(theme: string): void {
    const colors = THEMES[theme] || THEMES.deep;
    this.material.uniforms.uWarmColor.value = colors.warm;
    this.material.uniforms.uCoolColor.value = colors.cool;
    this.material.uniforms.uGlowColor.value = colors.glow;
    (this.glowMesh.material as THREE.ShaderMaterial).uniforms.uGlowColor.value = colors.glow;
    this.rippleMaterial.uniforms.uColor.value = colors.ripple;
    this.material.uniforms.uColorShift.value = 0.5;
  }

  public getRippleInfo(): { position: THREE.Vector3; radius: number; strength: number } | null {
    if (!this.rippleActive) return null;
    return {
      position: this.mesh.position.clone(),
      radius: this.rippleRadius,
      strength: this.rippleStrength
    };
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.rippleMesh.geometry.dispose();
    this.rippleMaterial.dispose();
  }
}

export class IslandManager {
  private scene: THREE.Scene;
  public islands: Island[] = [];
  private theme: string;
  private waveSpeed: number = 1.0;

  constructor(scene: THREE.Scene, theme: string = 'deep') {
    this.scene = scene;
    this.theme = theme;
  }

  public generateIslands(count: number): void {
    this.clearIslands();

    const positions: THREE.Vector3[] = [];
    const minDistance = 8;

    for (let i = 0; i < count; i++) {
      let pos: THREE.Vector3;
      let attempts = 0;
      do {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 10;
        pos = new THREE.Vector3(x, y, z);
        attempts++;
      } while (
        attempts < 50 &&
        positions.some(p => p.distanceTo(pos) < minDistance)
      );

      positions.push(pos);
      const island = new Island(pos, this.theme);
      this.islands.push(island);
      this.scene.add(island.mesh);
      this.scene.add(island.glowMesh);
      this.scene.add(island.rippleMesh);
    }
  }

  public clearIslands(): void {
    for (const island of this.islands) {
      this.scene.remove(island.mesh);
      this.scene.remove(island.glowMesh);
      this.scene.remove(island.rippleMesh);
      island.dispose();
    }
    this.islands = [];
  }

  public getMeshes(): THREE.Mesh[] {
    return this.islands.map(i => i.mesh);
  }

  public update(delta: number, elapsed: number): void {
    for (const island of this.islands) {
      island.update(delta, elapsed, this.waveSpeed);
    }
  }

  public setWaveSpeed(speed: number): void {
    this.waveSpeed = speed;
  }

  public setTheme(theme: string): void {
    this.theme = theme;
    for (const island of this.islands) {
      island.setTheme(theme);
    }
  }

  public getAllRippleInfos(): { position: THREE.Vector3; radius: number; strength: number }[] {
    const infos: { position: THREE.Vector3; radius: number; strength: number }[] = [];
    for (const island of this.islands) {
      const info = island.getRippleInfo();
      if (info) infos.push(info);
    }
    return infos;
  }

  public getIslandCount(): number {
    return this.islands.length;
  }
}
