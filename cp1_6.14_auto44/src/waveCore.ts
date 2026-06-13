import * as THREE from 'three';

export interface WaveformBar {
  position: THREE.Vector3;
  height: number;
  frequency: number;
  normalizedFrequency: number;
  centerFrequencyHz: number;
  amplitude: number;
  color: THREE.Color;
}

export interface WaveformConfig {
  heightMultiplier: number;
  barThickness: number;
  barSpacing: number;
  barCount: number;
  rowsCount: number;
}

export interface VisualConfig {
  colorLowHex: number;
  colorHighHex: number;
  spectrumColorLowHex: number;
  spectrumColorHighHex: number;
  inheritParticleColor: boolean;
  easingDurationMs: number;
}

export class WaveCore {
  private config: WaveformConfig = {
    heightMultiplier: 1.5,
    barThickness: 4,
    barSpacing: 2,
    barCount: 128,
    rowsCount: 4
  };

  private visualConfig: VisualConfig = {
    colorLowHex: 0x1e90ff,
    colorHighHex: 0xff4500,
    spectrumColorLowHex: 0x00bfff,
    spectrumColorHighHex: 0x8a2be2,
    inheritParticleColor: true,
    easingDurationMs: 300
  };

  private sampleRate = 44100;
  private nyquist = 22050;

  private bars: WaveformBar[] = [];
  private barMeshes: THREE.Mesh[] = [];
  private barGeometries: Map<string, THREE.BoxGeometry> = new Map();
  private barMaterials: THREE.MeshStandardMaterial[] = [];

  constructor() {
    this.initializeBars();
  }

  setSampleRate(rate: number): void {
    this.sampleRate = rate;
    this.nyquist = rate / 2;
  }

  getVisualConfig(): VisualConfig {
    return { ...this.visualConfig };
  }

  setVisualConfigKey<K extends keyof VisualConfig>(key: K, value: VisualConfig[K]): void {
    this.visualConfig[key] = value;
  }

  private initializeBars(): void {
    this.bars = [];
    this.barMeshes = [];
    this.barGeometries.clear();
    this.barMaterials = [];

    const { barCount, rowsCount, barThickness, barSpacing } = this.config;
    const totalWidth = barCount * (barThickness + barSpacing);
    const totalDepth = rowsCount * (barThickness + barSpacing);
    const startX = -totalWidth / 2;
    const startZ = -totalDepth / 2;

    for (let row = 0; row < rowsCount; row++) {
      for (let col = 0; col < barCount; col++) {
        const x = startX + col * (barThickness + barSpacing) + barThickness / 2;
        const z = startZ + row * (barThickness + barSpacing) + barThickness / 2;
        const frequency = col / barCount;

        const bar: WaveformBar = {
          position: new THREE.Vector3(x, 0, z),
          height: 0.1,
          frequency,
          normalizedFrequency: frequency,
          centerFrequencyHz: frequency * this.nyquist,
          amplitude: 0,
          color: this.getColorForHeight(0, frequency)
        };

        this.bars.push(bar);
      }
    }
  }

  getColorForHeight(normalizedHeight: number, normalizedFrequency: number): THREE.Color {
    const freqLowColor = new THREE.Color(this.visualConfig.colorLowHex);
    const freqHighColor = new THREE.Color(this.visualConfig.colorHighHex);
    
    const freqT = Math.max(0, Math.min(1, normalizedFrequency));
    const baseColor = freqLowColor.clone().lerp(freqHighColor, freqT);
    
    const brightness = 0.4 + Math.max(0, Math.min(1, normalizedHeight)) * 0.6;
    const saturated = baseColor.clone();
    saturated.offsetHSL(0, 0, (brightness - 0.5) * 0.5);
    
    return saturated;
  }

  getSpectrumColor(normalizedFreq: number): string {
    const lowColor = new THREE.Color(this.visualConfig.spectrumColorLowHex);
    const highColor = new THREE.Color(this.visualConfig.spectrumColorHighHex);
    const t = Math.max(0, Math.min(1, normalizedFreq));
    const color = lowColor.clone().lerp(highColor, t);
    return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  }

  updateWave(frequencyData: Uint8Array, waveformData: Float32Array): void {
    const { barCount, rowsCount, heightMultiplier } = this.config;
    const totalBins = frequencyData.length;
    if (totalBins === 0) return;

    const binsPerBar = Math.floor(totalBins / barCount);
    const hzPerBin = this.nyquist / totalBins;

    for (let row = 0; row < rowsCount; row++) {
      const rowOffset = Math.floor((row / rowsCount) * binsPerBar);
      
      for (let col = 0; col < barCount; col++) {
        const barIndex = row * barCount + col;
        if (barIndex >= this.bars.length) continue;

        let amplitude = 0;
        const binStart = Math.max(0, col * binsPerBar + rowOffset);
        const binEnd = Math.min(totalBins, binStart + binsPerBar);
        
        for (let i = binStart; i < binEnd; i++) {
          amplitude += frequencyData[i] / 255;
        }
        const binCount = Math.max(1, binEnd - binStart);
        amplitude = amplitude / binCount;

        const centerBinIndex = binStart + Math.floor(binCount / 2);
        const centerHz = centerBinIndex * hzPerBin;
        const normalizedFreq = Math.max(0, Math.min(1, centerBinIndex / totalBins));

        const waveIndex = Math.min(waveformData.length - 1, Math.floor((col / barCount) * waveformData.length));
        const waveAmplitude = Math.abs(waveformData[waveIndex] || 0);
        
        const combinedAmplitude = (amplitude * 0.7 + waveAmplitude * 0.3);
        const height = Math.max(0.1, combinedAmplitude * heightMultiplier * 10);

        this.bars[barIndex].height = height;
        this.bars[barIndex].amplitude = combinedAmplitude;
        this.bars[barIndex].frequency = normalizedFreq;
        this.bars[barIndex].normalizedFrequency = normalizedFreq;
        this.bars[barIndex].centerFrequencyHz = centerHz;
        this.bars[barIndex].color = this.getColorForHeight(combinedAmplitude, normalizedFreq);
      }
    }
  }

  getGeometryForHeight(height: number): THREE.BoxGeometry {
    const { barThickness } = this.config;
    const key = `${barThickness}_${height.toFixed(2)}`;
    
    if (!this.barGeometries.has(key)) {
      const geometry = new THREE.BoxGeometry(
        barThickness * 0.1,
        height,
        barThickness * 0.1
      );
      this.barGeometries.set(key, geometry);
    }
    
    return this.barGeometries.get(key)!;
  }

  getBarMeshes(): THREE.Mesh[] {
    if (this.barMeshes.length !== this.bars.length) {
      this.recreateMeshes();
    }

    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];
      const mesh = this.barMeshes[i];
      
      if (mesh) {
        mesh.position.copy(bar.position);
        mesh.position.y = bar.height / 2;
        
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.color.copy(bar.color);
        material.emissive.copy(bar.color);
        material.emissiveIntensity = 0.3;
        
        const targetScaleY = bar.height;
        mesh.scale.y = targetScaleY;
      }
    }

    return this.barMeshes;
  }

  recreateMeshes(): void {
    this.barMeshes.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    
    this.barGeometries.forEach(geo => geo.dispose());
    this.barGeometries.clear();
    
    this.barMaterials.forEach(mat => mat.dispose());
    this.barMaterials = [];
    
    this.barMeshes = [];

    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];
      const geometry = new THREE.BoxGeometry(
        this.config.barThickness * 0.1,
        1,
        this.config.barThickness * 0.1
      );
      
      const material = new THREE.MeshStandardMaterial({
        color: bar.color,
        emissive: bar.color,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.4
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(bar.position);
      mesh.position.y = bar.height / 2;
      mesh.scale.y = bar.height;
      
      this.barMeshes.push(mesh);
      this.barMaterials.push(material);
    }
  }

  setConfig(key: keyof WaveformConfig, value: number): void {
    if (this.config[key] !== value) {
      this.config[key] = value;
      if (key === 'barThickness' || key === 'barSpacing' || key === 'barCount' || key === 'rowsCount') {
        this.initializeBars();
      }
    }
  }

  getConfig(): WaveformConfig {
    return { ...this.config };
  }

  getBars(): WaveformBar[] {
    return this.bars;
  }

  getActiveBarHeights(): number[] {
    return this.bars.map(bar => bar.height);
  }

  getActiveBarPositions(): THREE.Vector3[] {
    return this.bars.map(bar => bar.position.clone());
  }

  getActiveBarColors(): THREE.Color[] {
    return this.bars.map(bar => bar.color.clone());
  }

  cleanup(): void {
    this.barMeshes.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    
    this.barGeometries.forEach(geo => geo.dispose());
    this.barGeometries.clear();
    
    this.barMaterials.forEach(mat => mat.dispose());
    this.barMaterials = [];
    
    this.barMeshes = [];
    this.bars = [];
  }
}
