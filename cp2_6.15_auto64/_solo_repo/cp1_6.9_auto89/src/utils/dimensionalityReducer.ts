interface WorkerInput {
  data: { features: number[]; category: number; id: number }[];
  dimensions: number;
  iterations: number;
  perplexity: number;
}

interface WorkerOutputPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  category: number;
  features: number[];
}

interface WorkerOutput {
  points: WorkerOutputPoint[];
  progress: number;
  done: boolean;
}

const ctx: Worker = self as unknown as Worker;

function euclideanDistSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

function computeP(
  data: number[][],
  n: number,
  perplexity: number,
  tol: number = 1e-4,
  maxIter: number = 50
): Float64Array {
  const P = new Float64Array(n * n);
  const targetEntropy = Math.log(perplexity);

  for (let i = 0; i < n; i++) {
    let betaMin = -Infinity;
    let betaMax = Infinity;
    let beta = 1.0;

    for (let iter = 0; iter < maxIter; iter++) {
      let sumP = 0;
      let entropy = 0;
      const rowStart = i * n;

      for (let j = 0; j < n; j++) {
        if (i === j) {
          P[rowStart + j] = 0;
          continue;
        }
        const dist = euclideanDistSq(data[i], data[j]);
        const val = Math.exp(-dist * beta);
        P[rowStart + j] = val;
        sumP += val;
      }

      if (sumP === 0) sumP = 1e-12;

      for (let j = 0; j < n; j++) {
        P[rowStart + j] /= sumP;
        if (P[rowStart + j] > 0) {
          entropy -= P[rowStart + j] * Math.log(P[rowStart + j]);
        }
      }

      const diff = entropy - targetEntropy;
      if (Math.abs(diff) < tol) break;

      if (diff > 0) {
        betaMin = beta;
        beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
      } else {
        betaMax = beta;
        beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
      }
    }
  }

  const symP = new Float64Array(n * n);
  const n2 = n * 2;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      symP[i * n + j] = (P[i * n + j] + P[j * n + i]) / n2;
    }
  }
  return symP;
}

function tsneReduce(
  data: number[][],
  n: number,
  dims: number,
  iterations: number,
  perplexity: number
): Float64Array {
  const Y = new Float64Array(n * dims);
  const rand = () => (Math.random() - 0.5) * 0.0001;

  for (let i = 0; i < n * dims; i++) {
    Y[i] = rand();
  }

  const P = computeP(data, n, perplexity);
  const dY = new Float64Array(n * dims);
  const iY = new Float64Array(n * dims);
  const gains = new Float64Array(n * dims).fill(1);

  const minGain = 0.01;
  const eta = 200;
  const momentum = 0.5;
  const finalMomentum = 0.8;
  const switchIter = Math.floor(iterations * 0.25);

  const exaggerateIters = Math.floor(iterations * 0.1);
  const exaggerationFactor = 4.0;

  const Q = new Float64Array(n * n);
  const qFlat = new Float64Array(n * n);

  for (let iter = 0; iter < iterations; iter++) {
    let sumQ = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          qFlat[i * n + j] = 0;
          continue;
        }
        let distSq = 0;
        for (let d = 0; d < dims; d++) {
          const diff = Y[i * dims + d] - Y[j * dims + d];
          distSq += diff * diff;
        }
        const q = 1.0 / (1.0 + distSq);
        qFlat[i * n + j] = q;
        sumQ += q;
      }
    }

    if (sumQ === 0) sumQ = 1e-12;
    for (let i = 0; i < n * n; i++) {
      Q[i] = qFlat[i] / sumQ;
    }

    const mult = iter < exaggerateIters ? exaggerationFactor : 1.0;

    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dims; d++) {
        let grad = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const pVal = P[i * n + j] * mult;
          const qVal = Q[i * n + j];
          const diff = Y[i * dims + d] - Y[j * dims + d];
          grad += 4 * (pVal - qVal) * diff * qFlat[i * n + j];
        }
        const idx = i * dims + d;
        dY[idx] = grad;
      }
    }

    const mom = iter < switchIter ? momentum : finalMomentum;
    for (let i = 0; i < n * dims; i++) {
      if (dY[i] > 0) {
        gains[i] = (iY[i] > 0) ? gains[i] * 0.8 : Math.max(gains[i] + 0.2, minGain);
      } else if (dY[i] < 0) {
        gains[i] = (iY[i] < 0) ? gains[i] * 0.8 : Math.max(gains[i] + 0.2, minGain);
      }
      iY[i] = mom * iY[i] - eta * gains[i] * dY[i];
      Y[i] += iY[i];
    }

    let mean: number[] = new Array(dims).fill(0);
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dims; d++) {
        mean[d] += Y[i * dims + d];
      }
    }
    for (let d = 0; d < dims; d++) mean[d] /= n;
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dims; d++) {
        Y[i * dims + d] -= mean[d];
      }
    }

    if (iter % 10 === 0 || iter === iterations - 1) {
      ctx.postMessage({
        progress: ((iter + 1) / iterations) * 100,
        done: false,
      });
    }
  }

  return Y;
}

ctx.onmessage = (e: MessageEvent) => {
  const { data, dimensions, iterations, perplexity }: WorkerInput = e.data;
  const n = data.length;

  const featureMatrix: number[][] = data.map((p) => p.features);

  const Y = tsneReduce(featureMatrix, n, dimensions, iterations, perplexity);

  const result: WorkerOutputPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = {
      id: data[i].id,
      x: Y[i * dimensions],
      y: Y[i * dimensions + 1],
      z: dimensions >= 3 ? Y[i * dimensions + 2] : 0,
      category: data[i].category,
      features: data[i].features,
    };
  }

  const xs = result.map((p) => p.x);
  const ys = result.map((p) => p.y);
  const zs = result.map((p) => p.z);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const zMin = Math.min(...zs), zMax = Math.max(...zs);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const zRange = zMax - zMin || 1;
  const maxRange = Math.max(xRange, yRange, zRange);
  const scale = 10 / maxRange;

  result.forEach((p) => {
    p.x = (p.x - (xMin + xMax) / 2) * scale;
    p.y = (p.y - (yMin + yMax) / 2) * scale;
    p.z = (p.z - (zMin + zMax) / 2) * scale;
  });

  ctx.postMessage({
    points: result,
    progress: 100,
    done: true,
  });
};

export {};
