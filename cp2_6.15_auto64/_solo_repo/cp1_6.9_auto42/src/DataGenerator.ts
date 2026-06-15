export interface DataSet {
  samples: number[][];
  clusterLabels: number[];
  clusterCenters: number[][];
  clusterSampleCounts: number[];
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function generateDataset(seed: number = 42): DataSet {
  const rng = mulberry32(seed);
  const SAMPLE_COUNT = 200;
  const DIM = 6;
  const CLUSTER_COUNT = 3;

  const trueCenters: number[][] = [];
  const HUES = [240, 140, 30];

  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const center: number[] = new Array(DIM).fill(0);
    const hueBase = (HUES[c] ?? 0) / 360;
    for (let d = 0; d < DIM; d++) {
      center[d] = 2.5 * Math.cos(hueBase * 2 * Math.PI + (d * Math.PI) / 3) + 3.0;
      center[d] += (rng() - 0.5) * 0.3;
    }
    trueCenters.push(center);
  }

  for (let i = 0; i < CLUSTER_COUNT; i++) {
    for (let j = i + 1; j < CLUSTER_COUNT; j++) {
      while (euclideanDistance(trueCenters[i]!, trueCenters[j]!) < 3.2) {
        for (let d = 0; d < DIM; d++) {
          trueCenters[j]![d] = (trueCenters[j]![d] ?? 0) + 0.4 * (rng() - 0.3);
        }
      }
    }
  }

  const samples: number[][] = [];
  const clusterLabels: number[] = [];
  const clusterSampleCounts: number[] = new Array(CLUSTER_COUNT).fill(0);

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const c = i % CLUSTER_COUNT;
    const center = trueCenters[c]!;
    const sample: number[] = new Array(DIM);
    for (let d = 0; d < DIM; d++) {
      const stdDev = 0.55 + 0.25 * Math.sin(d * 1.3 + c);
      sample[d] = center[d]! + gaussian(rng) * stdDev;
    }
    samples.push(sample);
    clusterLabels.push(c);
    clusterSampleCounts[c] = (clusterSampleCounts[c] ?? 0) + 1;
  }

  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const offset = Math.floor(rng() * 15);
    for (let k = 0; k < offset; k++) {
      const idx = c * 66 + k;
      if (idx < SAMPLE_COUNT && clusterLabels[idx] === c) {
        const swap = SAMPLE_COUNT - 1 - idx;
        if (swap >= 0 && swap < SAMPLE_COUNT && clusterLabels[swap] !== c) {
          const tmpLbl = clusterLabels[idx];
          clusterLabels[idx] = clusterLabels[swap]!;
          clusterLabels[swap] = tmpLbl!;
        }
      }
    }
  }

  const clusterCenters: number[][] = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const centroid: number[] = new Array(DIM).fill(0);
    let cnt = 0;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      if (clusterLabels[i] === c) {
        for (let d = 0; d < DIM; d++) {
          centroid[d] = (centroid[d] ?? 0) + (samples[i]![d] ?? 0);
        }
        cnt++;
      }
    }
    clusterSampleCounts[c] = cnt;
    for (let d = 0; d < DIM; d++) {
      centroid[d] = (centroid[d] ?? 0) / cnt;
    }
    clusterCenters.push(centroid);
  }

  return {
    samples,
    clusterLabels,
    clusterCenters,
    clusterSampleCounts,
  };
}
