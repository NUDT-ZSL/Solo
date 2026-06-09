import * as THREE from 'three';

export interface GalaxyParams {
  arms: number;
  tightness: number;
  count: number;
  rotationSpeed: number;
  particleSize: number;
  offsetAmount: number;
  colorCenterStart: string;
  colorCenterEnd: string;
  colorOuterStart: string;
  colorOuterEnd: string;
}

export class GalaxySystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;

  private basePositions: Float32Array;
  private randomOffsets: Float32Array;
  private randomSpeeds: Float32Array;
  private twinklePhases: Float32Array;
  private twinkleSpeeds: Float32Array;
  private distances: Float32Array;
  private baseColors: Float32Array;

  private params: GalaxyParams;

  private static readonly MAX_COUNT = 15000;
  private static readonly GALAXY_RADIUS = 60;

  constructor(params: GalaxyParams) {
    this.params = { ...params };

    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(GalaxySystem.MAX_COUNT * 3);
    this.randomOffsets = new Float32Array(GalaxySystem.MAX_COUNT * 3);
    this.randomSpeeds = new Float32Array(GalaxySystem.MAX_COUNT * 3);
    this.twinklePhases = new Float32Array(GalaxySystem.MAX_COUNT);
    this.twinkleSpeeds = new Float32Array(GalaxySystem.MAX_COUNT);
    this.distances = new Float32Array(GalaxySystem.MAX_COUNT);
    this.baseColors = new Float32Array(GalaxySystem.MAX_COUNT * 3);

    this.material = this.createShaderMaterial();
    this.points = new THREE.Points(this.geometry, this.material);

    this.allocateBuffers();
    this.rebuildGeometry();
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: this.params.particleSize },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aTwinkle;
        attribute vec3 aBaseColor;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uSize;
        uniform float uPixelRatio;
        void main() {
          vColor = aBaseColor;
          vTwinkle = aTwinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = uSize * (300.0 / -mvPosition.z) * uPixelRatio * (0.7 + 0.3 * aTwinkle);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, dist);
          float core = smoothstep(0.15, 0.0, dist) * 1.5;
          float alpha = glow + core;
          float brightness = 0.7 + 0.6 * vTwinkle;
          vec3 finalColor = vColor * brightness;
          finalColor += core * vec3(1.0, 1.0, 0.9) * 0.4;
          gl_FragColor = vec4(finalColor, alpha * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private allocateBuffers(): void {
    const emptyPositions = new Float32Array(GalaxySystem.MAX_COUNT * 3);
    const emptyColors = new Float32Array(GalaxySystem.MAX_COUNT * 3);
    const emptyTwinkle = new Float32Array(GalaxySystem.MAX_COUNT);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(emptyPositions, 3));
    this.geometry.setAttribute('aBaseColor', new THREE.BufferAttribute(emptyColors, 3));
    this.geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(emptyTwinkle, 1));
  }

  public rebuildGeometry(): void {
    const { arms, tightness, count, offsetAmount } = this.params;
    const radius = GalaxySystem.GALAXY_RADIUS;

    const cStart = new THREE.Color(this.params.colorCenterStart);
    const cEnd = new THREE.Color(this.params.colorCenterEnd);
    const oStart = new THREE.Color(this.params.colorOuterStart);
    const oEnd = new THREE.Color(this.params.colorOuterEnd);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const armIndex = i % arms;
      const t = i / count;
      const armOffset = (armIndex / arms) * Math.PI * 2;

      const spiralT = Math.pow(t, 0.7);
      const theta = spiralT * (8 + (1 - tightness) * 12) + armOffset;
      const r = spiralT * radius;

      const randAngle = Math.random() * Math.PI * 2;
      const randRadius = Math.random() * offsetAmount * (1 + r * 0.015) * radius * 0.25;

      const x = Math.cos(theta) * r + Math.cos(randAngle) * randRadius;
      const z = Math.sin(theta) * r + Math.sin(randAngle) * randRadius;

      const thickness = (1 - spiralT * 0.7) * 4 + 0.5;
      const y = (Math.random() - 0.5) * thickness * (1 + Math.random() * 0.5);

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      this.distances[i] = r;

      this.randomOffsets[i3] = (Math.random() - 0.5) * 0.3;
      this.randomOffsets[i3 + 1] = (Math.random() - 0.5) * 0.15;
      this.randomOffsets[i3 + 2] = (Math.random() - 0.5) * 0.3;

      this.randomSpeeds[i3] = 0.01 + Math.random() * 0.04;
      this.randomSpeeds[i3 + 1] = 0.005 + Math.random() * 0.02;
      this.randomSpeeds[i3 + 2] = 0.01 + Math.random() * 0.04;

      this.twinklePhases[i] = Math.random() * Math.PI * 2;
      this.twinkleSpeeds[i] = Math.PI + Math.random() * Math.PI * 3;

      const centerMix = Math.min(1, r / (radius * 0.25));
      const innerColor = new THREE.Color().lerpColors(cStart, cEnd, Math.random());
      const outerColor = new THREE.Color().lerpColors(oStart, oEnd, Math.random());
      const finalColor = new THREE.Color().lerpColors(innerColor, outerColor, centerMix);

      const brightness = 0.7 + Math.random() * 0.5;
      this.baseColors[i3] = finalColor.r * brightness;
      this.baseColors[i3 + 1] = finalColor.g * brightness;
      this.baseColors[i3 + 2] = finalColor.b * brightness;
    }

    this.geometry.setDrawRange(0, count);
    this.updateGeometryAttributes(0);
    this.material.uniforms.uSize.value = this.params.particleSize;
  }

  public updateGeometryAttributes(time: number): void {
    const count = this.params.count;
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('aBaseColor') as THREE.BufferAttribute;
    const twinkleAttr = this.geometry.getAttribute('aTwinkle') as THREE.BufferAttribute;

    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;
    const twinkles = twinkleAttr.array as Float32Array;

    const radius = GalaxySystem.GALAXY_RADIUS;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const dx = Math.sin(time * this.randomSpeeds[i3] + this.twinklePhases[i]) * this.randomOffsets[i3];
      const dy = Math.sin(time * this.randomSpeeds[i3 + 1] + this.twinklePhases[i] * 1.3) * this.randomOffsets[i3 + 1];
      const dz = Math.cos(time * this.randomSpeeds[i3 + 2] + this.twinklePhases[i] * 0.7) * this.randomOffsets[i3 + 2];

      positions[i3] = this.basePositions[i3] + dx;
      positions[i3 + 1] = this.basePositions[i3 + 1] + dy;
      positions[i3 + 2] = this.basePositions[i3 + 2] + dz;

      colors[i3] = this.baseColors[i3];
      colors[i3 + 1] = this.baseColors[i3 + 1];
      colors[i3 + 2] = this.baseColors[i3 + 2];

      const distanceFactor = 0.3 + (this.distances[i] / radius) * 0.7;
      twinkles[i] = 0.5 + 0.5 * Math.sin(time * this.twinkleSpeeds[i] + this.twinklePhases[i]) * distanceFactor;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    twinkleAttr.needsUpdate = true;
  }

  public update(time: number, deltaTime: number): void {
    this.points.rotation.y += this.params.rotationSpeed * deltaTime * 0.1;
    this.material.uniforms.uTime.value = time;
    this.updateGeometryAttributes(time);
  }

  public updateParam<K extends keyof GalaxyParams>(key: K, value: GalaxyParams[K]): void {
    const oldValue = this.params[key];
    this.params[key] = value;

    if (key === 'particleSize') {
      this.material.uniforms.uSize.value = value as number;
    } else if (key === 'rotationSpeed') {
    } else {
      this.rebuildGeometry();
    }
  }

  public getParams(): GalaxyParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
