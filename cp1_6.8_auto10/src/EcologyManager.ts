export interface EcologyState {
  vitality: number;
  evolutionSpeed: number;
  particleDensity: number;
}

export interface TerrainEcologyData {
  name: string;
  ecologyIndex: number;
  interactionLog: string[];
  pulsePhase: number;
  flowOffset: number;
}

export type TerrainType = 'tundra' | 'crystal' | 'lava';

const TERRAIN_NAMES: Record<TerrainType, string> = {
  tundra: '发光苔原',
  crystal: '晶石沙漠',
  lava: '熔岩裂谷',
};

export class EcologyManager {
  private state: EcologyState = {
    vitality: 0.5,
    evolutionSpeed: 0.5,
    particleDensity: 0.5,
  };

  private terrainData: Record<TerrainType, TerrainEcologyData> = {
    tundra: {
      name: TERRAIN_NAMES.tundra,
      ecologyIndex: 72,
      interactionLog: [],
      pulsePhase: 0,
      flowOffset: 0,
    },
    crystal: {
      name: TERRAIN_NAMES.crystal,
      ecologyIndex: 45,
      interactionLog: [],
      pulsePhase: 0,
      flowOffset: 0,
    },
    lava: {
      name: TERRAIN_NAMES.lava,
      ecologyIndex: 88,
      interactionLog: [],
      pulsePhase: 0,
      flowOffset: 0,
    },
  };

  private listeners: Set<() => void> = new Set();
  private animationTime: number = 0;

  getState(): EcologyState {
    return { ...this.state };
  }

  getTerrainData(type: TerrainType): TerrainEcologyData {
    return { ...this.terrainData[type] };
  }

  getAllTerrainData(): Record<TerrainType, TerrainEcologyData> {
    return {
      tundra: { ...this.terrainData.tundra },
      crystal: { ...this.terrainData.crystal },
      lava: { ...this.terrainData.lava },
    };
  }

  setVitality(value: number): void {
    this.state.vitality = Math.max(0, Math.min(1, value));
    this.recalculateIndices();
    this.notify();
  }

  setEvolutionSpeed(value: number): void {
    this.state.evolutionSpeed = Math.max(0, Math.min(1, value));
    this.notify();
  }

  setParticleDensity(value: number): void {
    this.state.particleDensity = Math.max(0, Math.min(1, value));
    this.notify();
  }

  recordInteraction(type: TerrainType, description: string): void {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const entry = `[${timestamp}] ${description}`;
    this.terrainData[type].interactionLog.unshift(entry);
    if (this.terrainData[type].interactionLog.length > 10) {
      this.terrainData[type].interactionLog.pop();
    }
    this.terrainData[type].ecologyIndex = Math.min(
      100,
      this.terrainData[type].ecologyIndex + Math.random() * 3
    );
    this.notify();
  }

  update(delta: number): void {
    const speed = this.state.evolutionSpeed;
    this.animationTime += delta * speed;

    for (const key of Object.keys(this.terrainData) as TerrainType[]) {
      const data = this.terrainData[key];
      data.pulsePhase = this.animationTime * 1.2;
      data.flowOffset = this.animationTime * 0.3;

      if (key === 'tundra') {
        data.ecologyIndex += (Math.sin(this.animationTime * 0.5) * 0.02) * this.state.vitality;
      } else if (key === 'lava') {
        data.ecologyIndex += (Math.sin(this.animationTime * 0.8) * 0.015) * this.state.vitality;
      } else {
        data.ecologyIndex += (Math.sin(this.animationTime * 0.3) * 0.01) * this.state.vitality;
      }
      data.ecologyIndex = Math.max(0, Math.min(100, data.ecologyIndex));
    }
  }

  getGlowIntensity(): number {
    return 0.3 + this.state.vitality * 0.7;
  }

  getFlowSpeed(): number {
    return 0.2 + this.state.evolutionSpeed * 1.8;
  }

  getActiveParticleRatio(): number {
    return this.state.particleDensity;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private recalculateIndices(): void {
    const v = this.state.vitality;
    this.terrainData.tundra.ecologyIndex = 40 + v * 55 + Math.sin(this.animationTime) * 5;
    this.terrainData.crystal.ecologyIndex = 25 + v * 40 + Math.sin(this.animationTime * 0.7) * 3;
    this.terrainData.lava.ecologyIndex = 60 + v * 35 + Math.sin(this.animationTime * 1.1) * 4;
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
