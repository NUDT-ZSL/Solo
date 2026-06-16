import { Organism, EnvironmentParams, EcosystemConfig, SpeciesType, Particle } from './types';
import { DEFAULT_ECOSYSTEM_CONFIG, SPECIES_COLORS, SPECIES_SIZES } from './config';

type Listener = (state: { organisms: Organism[]; particles: Particle[] }) => void;

export class SimulationEngine {
  private organisms: Organism[] = [];
  private particles: Particle[] = [];
  private environment: EnvironmentParams;
  private config: EcosystemConfig;
  private tickInterval: number | null = null;
  private animationFrame: number | null = null;
  private listeners: Set<Listener> = new Set();
  private isPaused: boolean = false;
  private idCounter: number = 0;

  constructor(initialEnvironment: EnvironmentParams) {
    this.environment = initialEnvironment;
    this.config = JSON.parse(JSON.stringify(DEFAULT_ECOSYSTEM_CONFIG));
  }

  start() {
    this.tickInterval = window.setInterval(() => this.tick(), 5000);
    this.startAnimationLoop();
  }

  stop() {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  getIsPaused() {
    return this.isPaused;
  }

  setEnvironment(env: Partial<EnvironmentParams>) {
    this.environment = { ...this.environment, ...env };
    this.notifyListeners();
  }

  getEnvironment(): EnvironmentParams {
    return { ...this.environment };
  }

  setConfig(config: EcosystemConfig) {
    this.config = JSON.parse(JSON.stringify(config));
  }

  getConfig(): EcosystemConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  getOrganisms(): Organism[] {
    return [...this.organisms];
  }

  addOrganism(species: SpeciesType, x: number, y: number): Organism | null {
    if (this.organisms.length >= 60) return null;
    const id = `org_${++this.idCounter}`;
    const organism: Organism = {
      id,
      species,
      x,
      y,
      health: 80,
      isNew: true
    };
    this.organisms.push(organism);
    this.spawnParticles(x, y, species, true);
    setTimeout(() => {
      const org = this.organisms.find(o => o.id === id);
      if (org) org.isNew = false;
    }, 300);
    this.notifyListeners();
    return organism;
  }

  removeOrganism(id: string) {
    const organism = this.organisms.find(o => o.id === id);
    if (organism) {
      this.spawnParticles(organism.x, organism.y, organism.species, false);
    }
    this.organisms = this.organisms.filter(o => o.id !== id);
    this.notifyListeners();
  }

  moveOrganism(id: string, x: number, y: number) {
    const organism = this.organisms.find(o => o.id === id);
    if (organism) {
      organism.x = x;
      organism.y = y;
      this.notifyListeners();
    }
  }

  private tick() {
    if (this.isPaused) return;
    
    const organismsToRemove: string[] = [];
    
    this.organisms.forEach(organism => {
      const healthDelta = this.calculateHealthDelta(organism);
      organism.health = Math.max(0, Math.min(100, organism.health + healthDelta));
      if (organism.health <= 0) {
        organismsToRemove.push(organism.id);
      }
    });

    organismsToRemove.forEach(id => {
      const org = this.organisms.find(o => o.id === id);
      if (org) {
        this.spawnParticles(org.x, org.y, org.species, false);
      }
    });
    this.organisms = this.organisms.filter(o => !organismsToRemove.includes(o.id));
    
    this.notifyListeners();
  }

  private calculateHealthDelta(organism: Organism): number {
    const speciesConfig = this.config.species[organism.species];
    const { light, humidity, temperature } = this.environment;
    
    let delta = -speciesConfig.healthDecayPerTick;
    
    const lightFactor = 1 - Math.abs(light - speciesConfig.optimalLight) / 1000;
    const humidityFactor = 1 - Math.abs(humidity - speciesConfig.optimalHumidity) / 100;
    const temperatureFactor = 1 - Math.abs(temperature - speciesConfig.optimalTemperature) / 20;
    
    const envFactor = (lightFactor + humidityFactor + temperatureFactor) / 3;
    delta += speciesConfig.baseHealthIncrease * Math.max(0, envFactor);
    
    const nearbyCounts: Record<SpeciesType, number> = {
      plant: 0,
      fungus: 0,
      decomposer: 0
    };
    
    this.organisms.forEach(other => {
      if (other.id === organism.id) return;
      const dist = Math.hypot(other.x - organism.x, other.y - organism.y);
      if (dist < 100) {
        nearbyCounts[other.species]++;
      }
    });
    
    this.config.relations.forEach(relation => {
      if (relation.target !== organism.species) return;
      const count = nearbyCounts[relation.source];
      if (relation.threshold !== undefined && count < relation.threshold) return;
      delta += relation.coefficient * count;
    });
    
    return delta;
  }

  private spawnParticles(x: number, y: number, species: SpeciesType, isSpawning: boolean) {
    const baseColor = SPECIES_COLORS[species];
    const organismCount = this.organisms.length;
    const minCount = organismCount > 40 ? 4 : 8;
    const maxCount = organismCount > 40 ? 6 : 12;
    const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isSpawning ? Math.random() * 1.5 + 0.5 : Math.random() * 2 + 1;
      const particle: Particle = {
        id: `p_${++this.idCounter}_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSpawning ? 1 : 0),
        color: this.deriveColor(baseColor),
        life: 0,
        maxLife: 0.4,
        size: Math.random() * 4 + 2
      };
      this.particles.push(particle);
    }
  }

  private deriveColor(baseColor: string): string {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const variation = () => Math.floor(Math.random() * 40) - 20;
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    return `rgb(${clamp(r + variation())}, ${clamp(g + variation())}, ${clamp(b + variation())})`;
  }

  private startAnimationLoop() {
    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      this.particles = this.particles.filter(p => {
        p.life += dt;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 2 * dt;
        return p.life < p.maxLife;
      });
      
      this.notifyListeners();
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const state = {
      organisms: this.getOrganisms(),
      particles: [...this.particles]
    };
    this.listeners.forEach(l => l(state));
  }
}
