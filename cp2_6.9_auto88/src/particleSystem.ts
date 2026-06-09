import * as THREE from 'three';

interface ParticleData {
  basePosition: THREE.Vector3;
  baseSize: number;
  baseHue: number;
  currentHue: number;
  targetHue: number;
  currentScale: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private particleData: ParticleData[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particleCount: number = 2048;
  private radius: number = 200;
  private rotationSpeed: number = 0.003;
  private lastTime: number = 0;

  private smoothedLow: number = 0;
  private smoothedMid: number = 0;
  private smoothedHigh: number = 0;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    this.initParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();

      const x = this.radius * Math.sin(phi) * Math.cos(theta);
      const y = this.radius * Math.sin(phi) * Math.sin(theta);
      const z = this.radius * Math.cos(phi);

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      const distance = Math.sqrt(x * x + y * y + z * z);
      const normalizedDist = distance / this.radius;
      const hue = 220 + normalizedDist * (340 - 220);

      const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      const baseSize = 2 + Math.random() * 4;
      this.sizes[i] = baseSize;

      this.particleData.push({
        basePosition: new THREE.Vector3(x, y, z),
        baseSize,
        baseHue: hue,
        currentHue: hue,
        targetHue: hue,
        currentScale: 1
      });
    }
  }

  public createBackgroundStars(scene: THREE.Scene): void {
    const starCount = 100;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const distance = 500 + Math.random() * 1000;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();

      starPositions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = distance * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public update(spectrum: Uint8Array, bands: { low: number; mid: number; high: number }, deltaTime: number): void {
    const smoothing = 1 - Math.pow(0.001, deltaTime);
    this.smoothedLow = this.lerp(this.smoothedLow, bands.low, smoothing);
    this.smoothedMid = this.lerp(this.smoothedMid, bands.mid, smoothing);
    this.smoothedHigh = this.lerp(this.smoothedHigh, bands.high, smoothing);

    const colorSmoothing = 1 - Math.pow(0.01, deltaTime / 0.3);
    const scaleSmoothing = 1 - Math.pow(0.001, deltaTime);

    const maxOffset = 80;
    const nyquist = 22050;
    const binWidth = nyquist / spectrum.length;

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      const normalizedIndex = i / this.particleCount;
      const freq = normalizedIndex * nyquist;

      let bandEnergy: number;
      let bandType: 'low' | 'mid' | 'high';
      let targetHue: number;

      if (freq < 200) {
        bandType = 'low';
        bandEnergy = this.smoothedLow;
        const bandBin = Math.floor(freq / binWidth);
        if (spectrum[bandBin] !== undefined) {
          bandEnergy = spectrum[bandBin] / 255;
        }
        targetHue = this.lerp(0, 20, bandEnergy);
      } else if (freq < 2000) {
        bandType = 'mid';
        bandEnergy = this.smoothedMid;
        const bandBin = Math.floor(freq / binWidth);
        if (spectrum[bandBin] !== undefined) {
          bandEnergy = spectrum[bandBin] / 255;
        }
        targetHue = this.lerp(100, 140, bandEnergy);
      } else {
        bandType = 'high';
        bandEnergy = this.smoothedHigh;
        const bandBin = Math.floor(freq / binWidth);
        if (spectrum[bandBin] !== undefined) {
          bandEnergy = spectrum[bandBin] / 255;
        }
        targetHue = this.lerp(200, 240, bandEnergy);
      }

      const effectiveEnergy = Math.max(bandEnergy, (this.smoothedLow + this.smoothedMid + this.smoothedHigh) / 3 * 0.3);
      data.targetHue = this.lerp(data.baseHue, targetHue, effectiveEnergy);
      data.currentHue = this.lerp(data.currentHue, data.targetHue, colorSmoothing);

      const easedEnergy = this.easeInOut(effectiveEnergy);
      const targetScale = this.lerp(0.5, 3, easedEnergy);
      data.currentScale = this.lerp(data.currentScale, targetScale, scaleSmoothing);

      const offset = maxOffset * easedEnergy;
      let offsetX = 0, offsetY = 0, offsetZ = 0;

      if (bandType === 'low') {
        offsetY = Math.sin(normalizedIndex * Math.PI * 20 + this.lastTime * 2) * offset;
      } else if (bandType === 'mid') {
        offsetX = Math.sin(normalizedIndex * Math.PI * 30 + this.lastTime * 3) * offset;
      } else {
        offsetZ = Math.sin(normalizedIndex * Math.PI * 50 + this.lastTime * 4) * offset;
      }

      offsetX += (this.smoothedMid - 0.5) * maxOffset * 0.3 * (data.basePosition.x > 0 ? 1 : -1);
      offsetY += (this.smoothedLow - 0.5) * maxOffset * 0.3 * (data.basePosition.y > 0 ? 1 : -1);
      offsetZ += (this.smoothedHigh - 0.5) * maxOffset * 0.3 * (data.basePosition.z > 0 ? 1 : -1);

      this.positions[i * 3] = data.basePosition.x + offsetX;
      this.positions[i * 3 + 1] = data.basePosition.y + offsetY;
      this.positions[i * 3 + 2] = data.basePosition.z + offsetZ;

      const color = new THREE.Color().setHSL(data.currentHue / 360, 0.8, 0.5 + effectiveEnergy * 0.3);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = data.baseSize * data.currentScale;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;

    this.points.rotation.y += this.rotationSpeed * deltaTime * 60;
    this.points.rotation.x += this.rotationSpeed * 0.3 * deltaTime * 60;

    this.lastTime += deltaTime;
  }
}
