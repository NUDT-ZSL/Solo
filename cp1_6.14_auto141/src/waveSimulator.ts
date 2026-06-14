import { eventBus, type EarthquakeParams, type TerrainData } from './eventBus';

export const GRID_SIZE = 49;
export const VERTEX_COUNT = (GRID_SIZE + 1) * (GRID_SIZE + 1);
export const TERRAIN_WIDTH = 500;
export const TERRAIN_HEIGHT = 500;

const RAMP_UP_DURATION = 3000;
const RECOVERY_DURATION = 10000;
const PERMANENT_DEFORMATION_RATIO = 0.1;
const WAVE_SPEED_BASE = 50;
const MAX_WAVE_RADIUS = 300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

const workerCode = `
  const GRID_SIZE = ${GRID_SIZE};
  const VERTEX_COUNT = ${VERTEX_COUNT};
  const TERRAIN_WIDTH = ${TERRAIN_WIDTH};
  const TERRAIN_HEIGHT = ${TERRAIN_HEIGHT};
  const RAMP_UP_DURATION = ${RAMP_UP_DURATION};
  const RECOVERY_DURATION = ${RECOVERY_DURATION};
  const PERMANENT_DEFORMATION_RATIO = ${PERMANENT_DEFORMATION_RATIO};
  const WAVE_SPEED_BASE = ${WAVE_SPEED_BASE};
  const MAX_WAVE_RADIUS = ${MAX_WAVE_RADIUS};

  let params = null;
  let startTime = 0;
  let running = false;
  let animationId = null;
  let baseDisplacements = null;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function computeBaseDisplacements(p) {
    const displacements = new Float32Array(VERTEX_COUNT);
    const maxAmplitude = p.magnitude * 0.5;
    const epiX = (p.longitude / 180) * (TERRAIN_WIDTH / 2);
    const epiZ = (p.latitude / 90) * (TERRAIN_HEIGHT / 2);
    const decayFactor = Math.max(0.005, 0.02 - p.depth * 0.00015);

    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        const idx = i * (GRID_SIZE + 1) + j;
        const x = (j / GRID_SIZE - 0.5) * TERRAIN_WIDTH;
        const z = (i / GRID_SIZE - 0.5) * TERRAIN_HEIGHT;
        const dx = x - epiX;
        const dz = z - epiZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const attenuation = Math.exp(-dist * decayFactor);
        displacements[idx] = maxAmplitude * attenuation;
      }
    }
    return displacements;
  }

  function computeFrame(elapsed) {
    if (!params || !baseDisplacements) return null;

    const displacements = new Float32Array(VERTEX_COUNT);
    let progress = 0;
    let scale = 0;

    if (elapsed < RAMP_UP_DURATION) {
      progress = elapsed / RAMP_UP_DURATION;
      scale = easeOutCubic(progress);
    } else {
      const recoveryElapsed = elapsed - RAMP_UP_DURATION;
      const recoveryProgress = Math.min(1, recoveryElapsed / RECOVERY_DURATION);
      scale = 1 - (1 - PERMANENT_DEFORMATION_RATIO) * easeOutCubic(recoveryProgress);
      progress = 1 + recoveryProgress;
    }

    const waveSpeed = WAVE_SPEED_BASE * (1 + params.depth * 0.005);
    const waveRadius = Math.min(MAX_WAVE_RADIUS, (elapsed / 1000) * waveSpeed);
    const epiX = (params.longitude / 180) * (TERRAIN_WIDTH / 2);
    const epiZ = (params.latitude / 90) * (TERRAIN_HEIGHT / 2);
    const wavelength = 30 + params.depth * 0.3;

    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        const idx = i * (GRID_SIZE + 1) + j;
        const x = (j / GRID_SIZE - 0.5) * TERRAIN_WIDTH;
        const z = (i / GRID_SIZE - 0.5) * TERRAIN_HEIGHT;
        const dx = x - epiX;
        const dz = z - epiZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        let waveOffset = 0;
        if (dist < waveRadius && dist > waveRadius - wavelength * 2) {
          const waveProgress = (waveRadius - dist) / (wavelength * 2);
          const waveShape = Math.sin(waveProgress * Math.PI * 2) * 0.5 + 0.5;
          waveOffset = baseDisplacements[idx] * waveShape * 0.4;
        }

        displacements[idx] = baseDisplacements[idx] * scale + waveOffset;
      }
    }

    return { displacements, progress };
  }

  function tick() {
    if (!running) return;
    const elapsed = performance.now() - startTime;
    const result = computeFrame(elapsed);
    if (result) {
      self.postMessage({
        type: 'terrain:update',
        displacements: result.displacements.buffer,
        progress: result.progress,
        timestamp: performance.now()
      }, [result.displacements.buffer]);
    }
    animationId = requestAnimationFrame(tick);
  }

  self.onmessage = function(e) {
    if (e.data.type === 'start') {
      params = e.data.params;
      baseDisplacements = computeBaseDisplacements(params);
      startTime = performance.now();
      running = true;
      tick();
    } else if (e.data.type === 'stop') {
      running = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
  };
`;

export class WaveSimulator {
  private worker: Worker | null = null;

  constructor() {
    this.initWorker();
    eventBus.on('earthquake:trigger', this.handleTrigger.bind(this));
  }

  private initWorker(): void {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);

    this.worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'terrain:update') {
        const data: TerrainData = {
          displacements: new Float32Array(e.data.displacements),
          timestamp: e.data.timestamp,
          progress: e.data.progress
        };
        eventBus.emit('terrain:update', data);
      }
    };
  }

  private handleTrigger(params: EarthquakeParams): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.postMessage({ type: 'start', params });
    }
  }

  public destroy(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }
    eventBus.clear();
  }
}
