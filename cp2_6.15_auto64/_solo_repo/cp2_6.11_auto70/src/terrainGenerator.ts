import * as THREE from 'three';

export type ColorTheme = 'default' | 'neon' | 'ice' | 'lava';

interface ThemeColors {
  lowFreq: THREE.Color;
  midFreq: THREE.Color;
  highFreq: THREE.Color;
}

const themes: Record<ColorTheme, ThemeColors> = {
  default: {
    lowFreq: new THREE.Color(0xff3333),
    midFreq: new THREE.Color(0x33ff33),
    highFreq: new THREE.Color(0x3366ff)
  },
  neon: {
    lowFreq: new THREE.Color(0xff00ff),
    midFreq: new THREE.Color(0x00ffff),
    highFreq: new THREE.Color(0xffff00)
  },
  ice: {
    lowFreq: new THREE.Color(0x66ccff),
    midFreq: new THREE.Color(0x99eeee),
    highFreq: new THREE.Color(0xffffff)
  },
  lava: {
    lowFreq: new THREE.Color(0x990000),
    midFreq: new THREE.Color(0xff6600),
    highFreq: new THREE.Color(0xffcc00)
  }
};

export class TerrainGenerator {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private segments: number = 128;
  private size: number = 20;
  private heightScale: number = 4;
  private rotationSpeed: number = 0.5;
  private theme: ColorTheme = 'default';
  private baseHeights: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.geometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.segments - 1,
      this.segments - 1
    );

    this.geometry.rotateX(-Math.PI / 2);

    const positions = this.geometry.attributes.position;
    this.baseHeights = new Float32Array(positions.count);
    this.colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      this.baseHeights[i] = 0;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      wireframe: false,
      flatShading: true,
      shininess: 30,
      transparent: true,
      opacity: 0.95
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.position.y = -1;

    const wireframe = new THREE.WireframeGeometry(this.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1
    });
    const line = new THREE.LineSegments(wireframe, lineMaterial);
    this.mesh.add(line);

    this.scene.add(this.mesh);
    this.updateColors();
  }

  update(frequencyData: Uint8Array, volume: number, time: number): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const count = posAttr.count;
    const themeColors = themes[this.theme];

    const freqBins = frequencyData.length;
    const amplifiedVolume = Math.max(volume * 4, 0.05);

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      const distance = Math.sqrt(x * x + z * z);
      const maxDist = this.size / 2;
      const distRatio = Math.min(distance / maxDist, 1);

      const angle = Math.atan2(z, x);
      const normalizedAngle = (angle + Math.PI) / (Math.PI * 2);

      const freqIndex = Math.floor(normalizedAngle * freqBins) % freqBins;
      const freqValue = frequencyData[freqIndex] / 255;

      const breathing = Math.sin(time * 0.5 + distRatio * Math.PI * 2) * 0.3 + 0.7;
      const wave = Math.sin(time * 0.8 + angle * 3) * 0.15;

      const height = freqValue * this.heightScale * amplifiedVolume * 3 + breathing * 0.5 + wave;

      const falloff = 1 - distRatio * 0.4;
      const finalHeight = height * falloff;

      posAttr.setY(i, finalHeight);

      const t = distRatio;
      let r: number, g: number, b: number;

      if (t < 0.5) {
        const localT = t * 2;
        r = themeColors.lowFreq.r + (themeColors.midFreq.r - themeColors.lowFreq.r) * localT;
        g = themeColors.lowFreq.g + (themeColors.midFreq.g - themeColors.lowFreq.g) * localT;
        b = themeColors.lowFreq.b + (themeColors.midFreq.b - themeColors.lowFreq.b) * localT;
      } else {
        const localT = (t - 0.5) * 2;
        r = themeColors.midFreq.r + (themeColors.highFreq.r - themeColors.midFreq.r) * localT;
        g = themeColors.midFreq.g + (themeColors.highFreq.g - themeColors.midFreq.g) * localT;
        b = themeColors.midFreq.b + (themeColors.highFreq.b - themeColors.midFreq.b) * localT;
      }

      const brightness = 0.35 + freqValue * 0.5 + amplifiedVolume * 0.3 + breathing * 0.1;
      colorAttr.setXYZ(i, r * brightness, g * brightness, b * brightness);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.mesh.rotation.y = time * this.rotationSpeed * 0.2;
  }

  private updateColors(): void {
    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const positions = this.geometry.attributes.position;
    const themeColors = themes[this.theme];
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const distance = Math.sqrt(x * x + z * z);
      const maxDist = this.size / 2;
      const t = Math.min(distance / maxDist, 1);

      let r: number, g: number, b: number;

      if (t < 0.5) {
        const localT = t * 2;
        r = themeColors.lowFreq.r + (themeColors.midFreq.r - themeColors.lowFreq.r) * localT;
        g = themeColors.lowFreq.g + (themeColors.midFreq.g - themeColors.lowFreq.g) * localT;
        b = themeColors.lowFreq.b + (themeColors.midFreq.b - themeColors.lowFreq.b) * localT;
      } else {
        const localT = (t - 0.5) * 2;
        r = themeColors.midFreq.r + (themeColors.highFreq.r - themeColors.midFreq.r) * localT;
        g = themeColors.midFreq.g + (themeColors.highFreq.g - themeColors.midFreq.g) * localT;
        b = themeColors.midFreq.b + (themeColors.highFreq.b - themeColors.midFreq.b) * localT;
      }

      colors.setXYZ(i, r * 0.5, g * 0.5, b * 0.5);
    }

    colors.needsUpdate = true;
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = Math.max(0, Math.min(1, speed));
  }

  setColorTheme(theme: ColorTheme): void {
    this.theme = theme;
    this.updateColors();
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getThemeColors(): ThemeColors {
    return themes[this.theme];
  }

  getSize(): number {
    return this.size;
  }
}
