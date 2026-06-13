import * as THREE from 'three';

export interface WaveformBar {
  position: THREE.Vector3;
  height: number;
  frequency: number;
  color: THREE.Color;
}

export interface WaveformConfig {
  heightMultiplier: number;
  barThickness: number;
  barSpacing: number;
  barCount: number;
  rowsCount: number;
}

export class WaveCore {
  private config: WaveformConfig = {
    heightMultiplier: 1.5,
    barThickness: 4,
    barSpacing: 2,
    barCount: 128,
    rowsCount: 4
  };

  private bars: WaveformBar[] = [];
  private barMeshes: THREE.Mesh[] = [];
  private barGeometries: Map<string, THREE.BoxGeometry> = new Map();
  private barMaterials: THREE.MeshStandardMaterial[] = [];

  constructor() {
    this.initializeBars();
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
          color: this.getColorForHeight(0, frequency)
        };

        this.bars.push(bar);
      }
    }
  }

  getColorForHeight(normalizedHeight: number, frequency: number): THREE.Color {
    const freqLowColor = new THREE.Color(0x1e90ff);
    const freqHighColor = new THREE.Color(0xff4500);
    
    const freqT = Math.max(0, Math.min(1, frequency));
    const baseColor = freqLowColor.clone().lerp(freqHighColor, freqT);
    
    const brightness = 0.4 + Math.max(0, Math.min(1, normalizedHeight)) * 0.6;
    const saturated = baseColor.clone();
    saturated.offsetHSL(0, 0, (brightness - 0.5) * 0.5);
    
    return saturated;
  }

  getSpectrumColor(normalizedFreq: number): string {
    const lowColor = new THREE.Color(0x00bfff);
    const highColor = new THREE.Color(0x8a2be2);
    const t = Math.max(0, Math.min(1, normalizedFreq));
    const color = lowColor.clone().lerp(highColor, t);
    return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  }

  updateWave(frequencyData: Uint8Array, waveformData: Float32Array): void {
    const { barCount, rowsCount, heightMultiplier } = this.config;
    const freqStep = Math.floor(frequencyData.length / barCount);

    for (let row = 0; row < rowsCount; row++) {
      const rowOffset = Math.floor((row / rowsCount) * freqStep);
      
      for (let col = 0; col < barCount; col++) {
        const barIndex = row * barCount + col;
        if (barIndex >= this.bars.length) continue;

        let amplitude = 0;
        const freqStart = Math.max(0, col * freqStep + rowOffset);
        const freqEnd = Math.min(frequencyData.length, freqStart + freqStep);
        
        for (let i = freqStart; i < freqEnd; i++) {
          amplitude += frequencyData[i] / 255;
        }
        amplitude = amplitude / (freqEnd - freqStart);

        const waveIndex = Math.floor((col / barCount) * waveformData.length);
        const waveAmplitude = Math.abs(waveformData[waveIndex] || 0);
        
        const combinedAmplitude = (amplitude * 0.7 + waveAmplitude * 0.3);
        const height = Math.max(0.1, combinedAmplitude * heightMultiplier * 10);

        this.bars[barIndex].height = height;
        this.bars[barIndex].frequency = col / barCount;
        this.bars[barIndex].color = this.getColorForHeight(combinedAmplitude, col / barCount);
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
