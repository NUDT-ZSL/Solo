import * as THREE from 'three';

export interface WaveSource {
  id: number;
  position: THREE.Vector3;
  frequency: number;
  amplitude: number;
  phase: number;
  active: boolean;
}

export interface ParticleData {
  basePosition: THREE.Vector3;
  ringIndex: number;
  radius: number;
  angle: number;
}

export class WaveSystem {
  public group: THREE.Group;
  public points: THREE.Points;
  public sources: WaveSource[] = [];
  public particleData: ParticleData[] = [];
  public particleCount: number = 0;

  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private basePositions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private opacities!: Float32Array;
  private baseRadii!: Float32Array;
  private baseAngles!: Float32Array;
  private ringIndices!: Float32Array;
  private spriteTexture: THREE.Texture;

  private readonly MAX_SOURCES = 9;
  private readonly WAVE_THRESHOLD = 2.5;
  private readonly GLOW_SPRITE_SIZE = 64;

  constructor() {
    this.group = new THREE.Group();
    this.geometry = new THREE.BufferGeometry();
    this.spriteTexture = this.createGlowTexture();
    this.material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: this.spriteTexture
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    this.createSources();
    this.createParticles();
    this.createSourceMarkers();
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = this.GLOW_SPRITE_SIZE;
    canvas.height = this.GLOW_SPRITE_SIZE;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      this.GLOW_SPRITE_SIZE / 2,
      this.GLOW_SPRITE_SIZE / 2,
      0,
      this.GLOW_SPRITE_SIZE / 2,
      this.GLOW_SPRITE_SIZE / 2,
      this.GLOW_SPRITE_SIZE / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.GLOW_SPRITE_SIZE, this.GLOW_SPRITE_SIZE);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createSources(): void {
    const positions: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(6, 2, 4),
      new THREE.Vector3(-5, -1, 5),
      new THREE.Vector3(4, -2, -6),
      new THREE.Vector3(-7, 1, -3),
      new THREE.Vector3(2, 4, 7),
      new THREE.Vector3(-3, 5, -5),
      new THREE.Vector3(8, -3, 0),
      new THREE.Vector3(-6, -4, -2)
    ];

    for (let i = 0; i < this.MAX_SOURCES; i++) {
      this.sources.push({
        id: i,
        position: positions[i],
        frequency: 0.5 + Math.random() * 1.0,
        amplitude: 0.8 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        active: i === 0
      });
    }
  }

  private createSourceMarkers(): void {
    for (const source of this.sources) {
      const markerGeometry = new THREE.SphereGeometry(0.25, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3c3c,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(source.position);
      marker.visible = source.active;
      marker.userData.sourceId = source.id;
      marker.name = `source-marker-${source.id}`;
      this.group.add(marker);
    }
  }

  public updateSourceMarkerVisibility(sourceId: number, active: boolean): void {
    const marker = this.group.getObjectByName(`source-marker-${sourceId}`);
    if (marker) {
      marker.visible = active;
    }
  }

  private createParticles(): void {
    const ringCount = 8 + Math.floor(Math.random() * 4);
    const particlesPerRing = 110;
    this.particleCount = ringCount * particlesPerRing;

    this.basePositions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.opacities = new Float32Array(this.particleCount);
    this.baseRadii = new Float32Array(this.particleCount);
    this.baseAngles = new Float32Array(this.particleCount);
    this.ringIndices = new Float32Array(this.particleCount);

    const minRadius = 1.0;
    const maxRadius = 10.0;
    const color = new THREE.Color();

    for (let ring = 0; ring < ringCount; ring++) {
      const ringRadius = minRadius + (maxRadius - minRadius) * (ring / (ringCount - 1));
      const t = ring / (ringCount - 1);

      for (let i = 0; i < particlesPerRing; i++) {
        const idx = ring * particlesPerRing + i;
        const angle = (i / particlesPerRing) * Math.PI * 2;

        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius;

        this.basePositions[idx * 3] = x;
        this.basePositions[idx * 3 + 1] = 0;
        this.basePositions[idx * 3 + 2] = z;

        this.baseRadii[idx] = ringRadius;
        this.baseAngles[idx] = angle;
        this.ringIndices[idx] = ring;

        const hue = 180 + (300 - 180) * t;
        color.setHSL(hue / 360, 0.8, 0.6);
        this.colors[idx * 3] = color.r;
        this.colors[idx * 3 + 1] = color.g;
        this.colors[idx * 3 + 2] = color.b;

        this.sizes[idx] = 0.3;
        this.opacities[idx] = 0.8;

        this.particleData.push({
          basePosition: new THREE.Vector3(x, 0, z),
          ringIndex: ring,
          radius: ringRadius,
          angle: angle
        });
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.basePositions.slice(), 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  public toggleSource(id: number): boolean {
    if (id >= 0 && id < this.sources.length) {
      this.sources[id].active = !this.sources[id].active;
      this.updateSourceMarkerVisibility(id, this.sources[id].active);
      return this.sources[id].active;
    }
    return false;
  }

  public setSourceFrequency(id: number, freq: number): void {
    if (id >= 0 && id < this.sources.length) {
      this.sources[id].frequency = Math.max(0.1, Math.min(3.0, freq));
    }
  }

  public setSourceAmplitude(id: number, amp: number): void {
    if (id >= 0 && id < this.sources.length) {
      this.sources[id].amplitude = Math.max(0.2, Math.min(2.0, amp));
    }
  }

  public update(time: number): void {
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;

    const color = new THREE.Color();
    const activeSources = this.sources.filter(s => s.active);
    const hasInterference = activeSources.length > 1;

    for (let i = 0; i < this.particleCount; i++) {
      const x = this.basePositions[i * 3];
      const z = this.basePositions[i * 3 + 2];
      const radius = this.baseRadii[i];
      const t = this.ringIndices[i] / 11;

      let totalHeight = 0;
      let totalAmplitude = 0;

      for (const source of activeSources) {
        const dx = x - source.position.x;
        const dz = z - source.position.z;
        const dy = -source.position.y;
        const distance = Math.sqrt(dx * dx + dz * dz + dy * dy);

        const waveLength = 3.0 + source.frequency * 0.5;
        const k = (2 * Math.PI) / waveLength;
        const omega = 2 * Math.PI * source.frequency;
        const decay = Math.exp(-distance * 0.08);
        const wave = source.amplitude * decay * Math.sin(k * distance - omega * time + source.phase);

        totalHeight += wave;
        totalAmplitude += source.amplitude * decay;
      }

      if (activeSources.length === 0) {
        const ringFreq = 0.2 + (this.ringIndices[i] % 12) * 0.1;
        const ringPhase = this.ringIndices[i] * 0.5;
        totalHeight = Math.sin(radius * 0.6 - 2 * Math.PI * ringFreq * time + ringPhase) * 0.8;
      }

      positions[i * 3 + 1] = totalHeight;

      const absHeight = Math.abs(totalHeight);
      const size = 0.1 + Math.min(0.4, absHeight * 0.25);
      (this.geometry.getAttribute('size') as THREE.BufferAttribute).array[i] = size;

      const pulsate = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 3.0 + radius * 0.5));
      this.opacities[i] = pulsate * (0.6 + Math.min(0.4, absHeight * 0.15));

      if (hasInterference && absHeight > this.WAVE_THRESHOLD) {
        color.setRGB(1, 1, 1);
      } else {
        const hue = 180 + (300 - 180) * t;
        const lightness = 0.5 + Math.min(0.2, absHeight * 0.08);
        color.setHSL(hue / 360, 0.8, lightness);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    (this.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
    this.material.opacity = 0.9;
    this.material.size = 0.3;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.spriteTexture.dispose();

    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
