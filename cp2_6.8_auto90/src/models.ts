export interface FoldKeyframe {
  progress: number;
  vertexOffsets: Float32Array;
}

export interface OrigamiModel {
  name: string;
  gridSize: number;
  paperSize: number;
  keyframes: FoldKeyframe[];
}

const GRID_N = 16;
const PAPER_SIZE = 2;
const HALF = PAPER_SIZE / 2;
const STEP = PAPER_SIZE / GRID_N;

function createEmptyOffsets(count: number): Float32Array {
  return new Float32Array(count * 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpArray(a: Float32Array, b: Float32Array, t: number, out: Float32Array): void {
  for (let i = 0; i < a.length; i++) {
    out[i] = lerp(a[i], b[i], t);
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function getGridIndex(i: number, j: number): number {
  return j * (GRID_N + 1) + i;
}

function generateCraneKeyframes(): FoldKeyframe[] {
  const vertCount = (GRID_N + 1) * (GRID_N + 1);
  const keyframes: FoldKeyframe[] = [];

  const kf0 = createEmptyOffsets(vertCount);
  keyframes.push({ progress: 0, vertexOffsets: kf0 });

  const kf1 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const y = -HALF + j * STEP;
      if (y > 0) {
        const foldAmount = y;
        kf1[idx + 2] = foldAmount * 0.8;
        kf1[idx + 1] = -foldAmount * 0.3;
      }
    }
  }
  keyframes.push({ progress: 0.1, vertexOffsets: kf1 });

  const kf2 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      if (y > 0) {
        const foldAmount = y;
        kf2[idx + 2] = foldAmount * 1.2;
        kf2[idx + 1] = -foldAmount * 0.6;
      }
      if (x < 0) {
        const sideFold = Math.abs(x) * 0.3;
        kf2[idx + 2] += sideFold * (y > 0 ? 0.5 : 0.2);
      }
    }
  }
  keyframes.push({ progress: 0.2, vertexOffsets: kf2 });

  const kf3 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const distFromCenter = Math.sqrt(x * x + y * y);
      
      if (y > 0) {
        kf3[idx + 2] = y * 1.4;
        kf3[idx + 1] = -Math.abs(y) * 0.8;
        if (x > 0) {
          kf3[idx] -= y * 0.3;
        } else {
          kf3[idx] += y * 0.3;
        }
      }
      
      if (y < -0.3) {
        const tailFold = Math.abs(y + 0.3) * 0.6;
        kf3[idx + 2] -= tailFold * 0.8;
        kf3[idx + 1] += tailFold * 0.4;
      }
    }
  }
  keyframes.push({ progress: 0.35, vertexOffsets: kf3 });

  const kf4 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      
      if (y > 0.2) {
        const wingFold = (y - 0.2) * 1.5;
        if (x > 0.1) {
          kf4[idx] -= wingFold * 0.4;
          kf4[idx + 2] = y * 1.2 + wingFold * 0.3;
          kf4[idx + 1] = -y * 0.6 - wingFold * 0.2;
        } else if (x < -0.1) {
          kf4[idx] += wingFold * 0.4;
          kf4[idx + 2] = y * 1.2 + wingFold * 0.3;
          kf4[idx + 1] = -y * 0.6 - wingFold * 0.2;
        } else {
          kf4[idx + 2] = y * 0.9;
          kf4[idx + 1] = -y * 0.9;
        }
      } else if (y > 0) {
        kf4[idx + 2] = y * 0.7;
        kf4[idx + 1] = -y * 0.5;
      }
      
      if (y < -0.4) {
        const neckFold = Math.abs(y + 0.4);
        kf4[idx + 1] += neckFold * 1.2;
        kf4[idx + 2] = -neckFold * 0.5;
        if (Math.abs(x) < 0.3) {
          kf4[idx + 1] += neckFold * 0.5;
        }
      }
    }
  }
  keyframes.push({ progress: 0.5, vertexOffsets: kf4 });

  const kf5 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      
      if (y > 0.3) {
        const wingAmount = (y - 0.3) * 1.8;
        if (x > 0.15) {
          kf5[idx] = -wingAmount * 0.8 - 0.2;
          kf5[idx + 1] = -y * 0.7 - wingAmount * 0.15;
          kf5[idx + 2] = y * 1.1;
        } else if (x < -0.15) {
          kf5[idx] = wingAmount * 0.8 + 0.2;
          kf5[idx + 1] = -y * 0.7 - wingAmount * 0.15;
          kf5[idx + 2] = y * 1.1;
        } else {
          kf5[idx + 1] = -y * 1.1;
          kf5[idx + 2] = y * 0.6;
        }
      } else if (y > 0) {
        kf5[idx + 1] = -y * 0.6;
        kf5[idx + 2] = y * 0.9;
      }
      
      if (y < -0.5) {
        const headAmount = Math.abs(y + 0.5);
        kf5[idx + 1] = headAmount * 1.5 + 0.3;
        kf5[idx + 2] = -headAmount * 0.6 - 0.2;
        if (Math.abs(x) < 0.25) {
          kf5[idx + 1] += 0.2;
          kf5[idx + 2] -= 0.1;
        }
      } else if (y < -0.2) {
        kf5[idx + 1] += Math.abs(y + 0.2) * 0.6;
      }
    }
  }
  keyframes.push({ progress: 0.65, vertexOffsets: kf5 });

  const kf6 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      
      if (y > 0.35) {
        const wingAmount = (y - 0.35) * 2.0;
        if (x > 0.2) {
          kf6[idx] = -wingAmount * 1.0 - 0.35;
          kf6[idx + 1] = -y * 0.5 - wingAmount * 0.1;
          kf6[idx + 2] = y * 0.9 - wingAmount * 0.1;
        } else if (x < -0.2) {
          kf6[idx] = wingAmount * 1.0 + 0.35;
          kf6[idx + 1] = -y * 0.5 - wingAmount * 0.1;
          kf6[idx + 2] = y * 0.9 - wingAmount * 0.1;
        } else {
          kf6[idx + 1] = -y * 1.2;
          kf6[idx + 2] = y * 0.5;
        }
      } else if (y > 0) {
        kf6[idx + 1] = -y * 0.7;
        kf6[idx + 2] = y * 0.8;
      }
      
      if (y < -0.55) {
        const headAmount = Math.abs(y + 0.55);
        kf6[idx + 1] = headAmount * 1.8 + 0.45;
        kf6[idx + 2] = -headAmount * 0.8 - 0.3;
        if (Math.abs(x) < 0.2) {
          kf6[idx + 1] += 0.3;
          kf6[idx + 2] -= 0.15;
        }
      } else if (y < -0.2) {
        kf6[idx + 1] += Math.abs(y + 0.2) * 0.8;
        kf6[idx + 2] -= Math.abs(y + 0.2) * 0.1;
      }
    }
  }
  keyframes.push({ progress: 0.8, vertexOffsets: kf6 });

  const kf7 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      
      if (y > 0.4) {
        const wingAmount = (y - 0.4) * 2.2;
        if (x > 0.25) {
          kf7[idx] = -wingAmount * 1.1 - 0.5;
          kf7[idx + 1] = -y * 0.4 - wingAmount * 0.05;
          kf7[idx + 2] = y * 0.8;
        } else if (x < -0.25) {
          kf7[idx] = wingAmount * 1.1 + 0.5;
          kf7[idx + 1] = -y * 0.4 - wingAmount * 0.05;
          kf7[idx + 2] = y * 0.8;
        } else {
          kf7[idx + 1] = -y * 1.3;
          kf7[idx + 2] = y * 0.4;
        }
      } else if (y > 0) {
        kf7[idx + 1] = -y * 0.8;
        kf7[idx + 2] = y * 0.7;
      }
      
      if (y < -0.6) {
        const headAmount = Math.abs(y + 0.6);
        kf7[idx + 1] = headAmount * 2.0 + 0.55;
        kf7[idx + 2] = -headAmount * 1.0 - 0.4;
        if (Math.abs(x) < 0.15) {
          kf7[idx + 1] += 0.4;
          kf7[idx + 2] -= 0.2;
          if (y < -0.8) {
            kf7[idx] += x > 0 ? 0.1 : -0.1;
          }
        }
      } else if (y < -0.2) {
        kf7[idx + 1] += Math.abs(y + 0.2) * 1.0;
        kf7[idx + 2] -= Math.abs(y + 0.2) * 0.15;
      }
    }
  }
  keyframes.push({ progress: 0.9, vertexOffsets: kf7 });

  const kf8 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      
      if (y > 0.45) {
        const wingAmount = (y - 0.45) * 2.4;
        if (x > 0.3) {
          kf8[idx] = -wingAmount * 1.2 - 0.65;
          kf8[idx + 1] = -y * 0.35;
          kf8[idx + 2] = y * 0.75 + wingAmount * 0.05;
        } else if (x < -0.3) {
          kf8[idx] = wingAmount * 1.2 + 0.65;
          kf8[idx + 1] = -y * 0.35;
          kf8[idx + 2] = y * 0.75 + wingAmount * 0.05;
        } else {
          kf8[idx + 1] = -y * 1.35;
          kf8[idx + 2] = y * 0.35;
        }
      } else if (y > 0) {
        kf8[idx + 1] = -y * 0.85;
        kf8[idx + 2] = y * 0.65;
      }
      
      if (y < -0.65) {
        const headAmount = Math.abs(y + 0.65);
        kf8[idx + 1] = headAmount * 2.2 + 0.65;
        kf8[idx + 2] = -headAmount * 1.1 - 0.5;
        if (Math.abs(x) < 0.12) {
          kf8[idx + 1] += 0.5;
          kf8[idx + 2] -= 0.25;
          if (y < -0.85) {
            kf8[idx] += x > 0 ? 0.15 : -0.15;
            kf8[idx + 1] += 0.2;
          }
        }
      } else if (y < -0.2) {
        kf8[idx + 1] += Math.abs(y + 0.2) * 1.1;
        kf8[idx + 2] -= Math.abs(y + 0.2) * 0.18;
      }
    }
  }
  keyframes.push({ progress: 1.0, vertexOffsets: kf8 });

  return keyframes;
}

function generateBoatKeyframes(): FoldKeyframe[] {
  const vertCount = (GRID_N + 1) * (GRID_N + 1);
  const keyframes: FoldKeyframe[] = [];

  const kf0 = createEmptyOffsets(vertCount);
  keyframes.push({ progress: 0, vertexOffsets: kf0 });

  const kf1 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const y = -HALF + j * STEP;
      if (y > 0) {
        kf1[idx + 1] = -y * 0.5;
        kf1[idx + 2] = y * 0.4;
      }
    }
  }
  keyframes.push({ progress: 0.12, vertexOffsets: kf1 });

  const kf2 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const y = -HALF + j * STEP;
      if (y > 0) {
        kf2[idx + 1] = -y * 1.0;
        kf2[idx + 2] = y * 0.05;
      } else {
        kf2[idx + 1] = y * 0.1;
      }
    }
  }
  keyframes.push({ progress: 0.25, vertexOffsets: kf2 });

  const kf3 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const absX = Math.abs(x);
      
      if (y > 0) {
        kf3[idx + 1] = -y * 0.9;
        kf3[idx + 2] = y * 0.1;
        if (absX > 0.7) {
          kf3[idx] = x > 0 ? -0.15 : 0.15;
        }
      } else {
        if (absX > 0.6) {
          const sideFold = (absX - 0.6) * 1.5;
          kf3[idx] = x > 0 ? -sideFold - 0.1 : sideFold + 0.1;
          kf3[idx + 1] = y - sideFold * 0.3;
          kf3[idx + 2] = sideFold * 0.5;
        }
      }
    }
  }
  keyframes.push({ progress: 0.4, vertexOffsets: kf3 });

  const kf4 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      
      if (y > 0.1) {
        kf4[idx + 1] = -y * 0.7;
        kf4[idx + 2] = y * 0.15;
        if (absX > 0.5) {
          const foldAmt = (absX - 0.5) * 0.8;
          kf4[idx] = x > 0 ? -foldAmt * 0.5 : foldAmt * 0.5;
          kf4[idx + 1] -= foldAmt * 0.4;
        }
      } else if (y > 0) {
        kf4[idx + 1] = -y * 0.5;
        kf4[idx + 2] = y * 0.3;
      } else {
        if (absX > 0.5) {
          const sideFold = (absX - 0.5) * 1.8;
          kf4[idx] = x > 0 ? -sideFold - 0.2 : sideFold + 0.2;
          kf4[idx + 1] = y * 0.5 - sideFold * 0.4;
          kf4[idx + 2] = sideFold * 0.6;
        } else {
          kf4[idx + 1] = y * 0.3;
          kf4[idx + 2] = absX * 0.2;
        }
      }
    }
  }
  keyframes.push({ progress: 0.55, vertexOffsets: kf4 });

  const kf5 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const absX = Math.abs(x);
      
      if (y > 0.2) {
        const sailFold = (y - 0.2) * 1.5;
        kf5[idx + 1] = -0.2 - sailFold * 0.3;
        kf5[idx + 2] = sailFold * 0.8 + 0.1;
        if (absX > 0.4) {
          kf5[idx] = x > 0 ? -0.3 : 0.3;
          kf5[idx + 1] -= 0.1;
        }
      } else if (y > 0) {
        kf5[idx + 1] = -y * 0.8;
        kf5[idx + 2] = y * 0.4;
        if (absX > 0.5) {
          kf5[idx] = x > 0 ? -0.15 : 0.15;
        }
      } else {
        if (absX > 0.4) {
          const hullFold = (absX - 0.4) * 2.0;
          kf5[idx] = x > 0 ? -hullFold - 0.3 : hullFold + 0.3;
          kf5[idx + 1] = -0.3 - hullFold * 0.5;
          kf5[idx + 2] = hullFold * 0.4;
        } else {
          kf5[idx + 1] = -0.2 - absX * 0.3;
          kf5[idx + 2] = (0.4 - absX) * 0.4;
        }
      }
    }
  }
  keyframes.push({ progress: 0.7, vertexOffsets: kf5 });

  const kf6 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const absX = Math.abs(x);
      
      if (y > 0.3) {
        const sailFold = (y - 0.3) * 1.8;
        kf6[idx + 1] = -0.3 - sailFold * 0.2;
        kf6[idx + 2] = sailFold + 0.2;
        if (absX > 0.35) {
          kf6[idx] = x > 0 ? -0.4 : 0.4;
          kf6[idx + 1] -= 0.15;
        } else {
          kf6[idx + 1] -= (0.35 - absX) * 0.3;
        }
      } else if (y > 0) {
        kf6[idx + 1] = -y * 1.0 - 0.05;
        kf6[idx + 2] = y * 0.5;
        if (absX > 0.45) {
          kf6[idx] = x > 0 ? -0.2 : 0.2;
        }
      } else {
        if (absX > 0.35) {
          const hullFold = (absX - 0.35) * 2.2;
          kf6[idx] = x > 0 ? -hullFold - 0.45 : hullFold + 0.45;
          kf6[idx + 1] = -0.5 - hullFold * 0.4;
          kf6[idx + 2] = hullFold * 0.3;
        } else {
          kf6[idx + 1] = -0.35 - absX * 0.4;
          kf6[idx + 2] = (0.35 - absX) * 0.5;
        }
      }
    }
  }
  keyframes.push({ progress: 0.85, vertexOffsets: kf6 });

  const kf7 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const absX = Math.abs(x);
      
      if (y > 0.35) {
        const sailFold = (y - 0.35) * 2.0;
        kf7[idx + 1] = -0.35 - sailFold * 0.15;
        kf7[idx + 2] = sailFold * 1.1 + 0.3;
        if (absX > 0.3) {
          kf7[idx] = x > 0 ? -0.5 : 0.5;
          kf7[idx + 1] -= 0.2;
        } else {
          kf7[idx] = x * 0.5;
          kf7[idx + 1] -= (0.3 - absX) * 0.4;
        }
      } else if (y > 0) {
        kf7[idx + 1] = -y * 1.1 - 0.1;
        kf7[idx + 2] = y * 0.55;
        if (absX > 0.4) {
          kf7[idx] = x > 0 ? -0.25 : 0.25;
        }
      } else {
        if (absX > 0.3) {
          const hullFold = (absX - 0.3) * 2.5;
          kf7[idx] = x > 0 ? -hullFold - 0.55 : hullFold + 0.55;
          kf7[idx + 1] = -0.6 - hullFold * 0.35;
          kf7[idx + 2] = hullFold * 0.25;
        } else {
          kf7[idx + 1] = -0.45 - absX * 0.5;
          kf7[idx + 2] = (0.3 - absX) * 0.6;
        }
      }
    }
  }
  keyframes.push({ progress: 1.0, vertexOffsets: kf7 });

  return keyframes;
}

function generateFlowerKeyframes(): FoldKeyframe[] {
  const vertCount = (GRID_N + 1) * (GRID_N + 1);
  const keyframes: FoldKeyframe[] = [];

  const kf0 = createEmptyOffsets(vertCount);
  keyframes.push({ progress: 0, vertexOffsets: kf0 });

  const kf1 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      
      if (r > 0.6) {
        const foldAmt = (r - 0.6) * 0.8;
        kf1[idx + 2] = foldAmt;
        kf1[idx + 1] = -foldAmt * 0.4;
      }
    }
  }
  keyframes.push({ progress: 0.1, vertexOffsets: kf1 });

  const kf2 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      
      if (r > 0.5) {
        const foldAmt = (r - 0.5) * 1.2;
        const petalWave = Math.sin(angle * 4) * 0.3;
        kf2[idx + 2] = foldAmt * (0.8 + petalWave * 0.2);
        kf2[idx + 1] = -foldAmt * 0.6;
        
        const inward = (r - 0.5) * 0.4;
        kf2[idx] = x - (x / r) * inward;
        kf2[idx + 1] -= (y / r) * inward * 0.3;
      }
    }
  }
  keyframes.push({ progress: 0.2, vertexOffsets: kf2 });

  const kf3 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      
      if (r > 0.4) {
        const foldAmt = (r - 0.4) * 1.5;
        const petalWave = Math.sin(angle * 4) * 0.5 + 0.5;
        kf3[idx + 2] = foldAmt * (0.5 + petalWave * 0.7);
        kf3[idx + 1] = -foldAmt * 0.7;
        
        const inward = (r - 0.4) * 0.7;
        kf3[idx] = x - (x / r) * inward;
        kf3[idx + 1] = (y - (y / r) * inward) * 0.8;
      } else {
        kf3[idx + 1] = -0.1 + r * 0.25;
      }
    }
  }
  keyframes.push({ progress: 0.35, vertexOffsets: kf3 });

  const kf4 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      
      if (r > 0.35) {
        const petalIndex = Math.floor((angle + Math.PI) / (Math.PI / 2)) % 4;
        const petalCenterAngle = -Math.PI + petalIndex * (Math.PI / 2) + Math.PI / 4;
        const angleDiff = Math.abs(((angle - petalCenterAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const petalShape = Math.max(0, 1 - angleDiff / (Math.PI / 3));
        
        const foldAmt = (r - 0.35) * 1.8;
        kf4[idx + 2] = foldAmt * (0.3 + petalShape * 0.9);
        kf4[idx + 1] = -foldAmt * (0.5 + petalShape * 0.4);
        
        const inward = (r - 0.35) * 0.9;
        kf4[idx] = x - (x / r) * inward * (0.6 + petalShape * 0.4);
        kf4[idx + 1] = (y - (y / r) * inward * 0.5) * 0.7;
        
        if (petalShape > 0.5) {
          kf4[idx + 2] += petalShape * 0.3;
        }
      } else {
        kf4[idx + 1] = -0.2 + r * 0.5;
        kf4[idx + 2] = (0.35 - r) * 0.3;
      }
    }
  }
  keyframes.push({ progress: 0.5, vertexOffsets: kf4 });

  const kf5 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      
      if (r > 0.3) {
        const petalIndex = Math.floor((angle + Math.PI) / (Math.PI / 2)) % 4;
        const petalCenterAngle = -Math.PI + petalIndex * (Math.PI / 2) + Math.PI / 4;
        let angleDiff = ((angle - petalCenterAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const petalShape = Math.max(0, 1 - Math.abs(angleDiff) / (Math.PI / 3.5));
        
        const foldAmt = (r - 0.3) * 2.0;
        kf5[idx + 2] = foldAmt * (0.2 + petalShape * 1.0);
        kf5[idx + 1] = -foldAmt * (0.4 + petalShape * 0.5);
        
        const inward = (r - 0.3) * 1.1;
        kf5[idx] = x - (x / r) * inward * (0.5 + petalShape * 0.5);
        kf5[idx + 1] = (y - (y / r) * inward * 0.4) * 0.55;
        
        if (petalShape > 0.6) {
          const curl = (petalShape - 0.6) * 2.5;
          kf5[idx + 2] += curl * 0.4;
          kf5[idx + 1] -= curl * 0.15;
        }
      } else {
        kf5[idx + 1] = -0.3 + r * 0.8;
        kf5[idx + 2] = (0.3 - r) * 0.6;
      }
    }
  }
  keyframes.push({ progress: 0.65, vertexOffsets: kf5 });

  const kf6 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      
      if (r > 0.25) {
        const petalIndex = Math.floor((angle + Math.PI) / (Math.PI / 2)) % 4;
        const petalCenterAngle = -Math.PI + petalIndex * (Math.PI / 2) + Math.PI / 4;
        let angleDiff = ((angle - petalCenterAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const petalShape = Math.max(0, 1 - Math.abs(angleDiff) / (Math.PI / 4));
        
        const foldAmt = (r - 0.25) * 2.2;
        kf6[idx + 2] = foldAmt * (0.15 + petalShape * 1.1);
        kf6[idx + 1] = -foldAmt * (0.3 + petalShape * 0.6);
        
        const inward = (r - 0.25) * 1.3;
        kf6[idx] = x - (x / r) * inward * (0.4 + petalShape * 0.6);
        kf6[idx + 1] = (y - (y / r) * inward * 0.3) * 0.4;
        
        if (petalShape > 0.5) {
          const curl = (petalShape - 0.5) * 2.0;
          kf6[idx + 2] += curl * 0.6;
          kf6[idx + 1] -= curl * 0.25;
          const perpX = -y / r;
          const perpY = x / r;
          kf6[idx] += perpX * angleDiff * curl * 0.3;
          kf6[idx + 1] += perpY * angleDiff * curl * 0.2;
        }
      } else {
        kf6[idx + 1] = -0.4 + r * 1.2;
        kf6[idx + 2] = (0.25 - r) * 0.9;
      }
    }
  }
  keyframes.push({ progress: 0.8, vertexOffsets: kf6 });

  const kf7 = createEmptyOffsets(vertCount);
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const idx = getGridIndex(i, j) * 3;
      const x = -HALF + i * STEP;
      const y = -HALF + j * STEP;
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      
      if (r > 0.22) {
        const petalIndex = Math.floor((angle + Math.PI) / (Math.PI / 2)) % 4;
        const petalCenterAngle = -Math.PI + petalIndex * (Math.PI / 2) + Math.PI / 4;
        let angleDiff = ((angle - petalCenterAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const petalShape = Math.max(0, 1 - Math.abs(angleDiff) / (Math.PI / 4.5));
        
        const foldAmt = (r - 0.22) * 2.4;
        kf7[idx + 2] = foldAmt * (0.1 + petalShape * 1.2);
        kf7[idx + 1] = -foldAmt * (0.25 + petalShape * 0.65);
        
        const inward = (r - 0.22) * 1.5;
        kf7[idx] = x - (x / r) * inward * (0.35 + petalShape * 0.65);
        kf7[idx + 1] = (y - (y / r) * inward * 0.25) * 0.3;
        
        if (petalShape > 0.45) {
          const curl = (petalShape - 0.45) * 1.8;
          kf7[idx + 2] += curl * 0.75;
          kf7[idx + 1] -= curl * 0.35;
          const perpX = -y / r;
          const perpY = x / r;
          kf7[idx] += perpX * angleDiff * curl * 0.4;
          kf7[idx + 1] += perpY * angleDiff * curl * 0.25;
        }
        
        if (r > 0.8 && petalShape > 0.3) {
          const tipCurl = (r - 0.8) * 2.0;
          kf7[idx + 2] += tipCurl * 0.5;
          kf7[idx + 1] -= tipCurl * 0.3;
        }
      } else {
        kf7[idx + 1] = -0.5 + r * 1.5;
        kf7[idx + 2] = (0.22 - r) * 1.1;
        if (r < 0.1) {
          kf7[idx + 1] -= (0.1 - r) * 0.5;
          kf7[idx + 2] += (0.1 - r) * 0.3;
        }
      }
    }
  }
  keyframes.push({ progress: 1.0, vertexOffsets: kf7 });

  return keyframes;
}

function ensureMinKeyframes(keyframes: FoldKeyframe[], minCount: number = 10): FoldKeyframe[] {
  if (keyframes.length >= minCount) return keyframes;
  
  const result: FoldKeyframe[] = [...keyframes];
  
  while (result.length < minCount) {
    let maxGapIndex = 0;
    let maxGap = 0;
    for (let i = 0; i < result.length - 1; i++) {
      const gap = result[i + 1].progress - result[i].progress;
      if (gap > maxGap) {
        maxGap = gap;
        maxGapIndex = i;
      }
    }
    
    const kfA = result[maxGapIndex];
    const kfB = result[maxGapIndex + 1];
    const midProgress = (kfA.progress + kfB.progress) / 2;
    const midOffsets = new Float32Array(kfA.vertexOffsets.length);
    lerpArray(kfA.vertexOffsets, kfB.vertexOffsets, 0.5, midOffsets);
    
    result.splice(maxGapIndex + 1, 0, {
      progress: midProgress,
      vertexOffsets: midOffsets
    });
  }
  
  return result;
}

export const origamiModels: Record<string, OrigamiModel> = {
  crane: {
    name: '纸鹤',
    gridSize: GRID_N,
    paperSize: PAPER_SIZE,
    keyframes: ensureMinKeyframes(generateCraneKeyframes(), 12)
  },
  boat: {
    name: '纸船',
    gridSize: GRID_N,
    paperSize: PAPER_SIZE,
    keyframes: ensureMinKeyframes(generateBoatKeyframes(), 12)
  },
  flower: {
    name: '纸花',
    gridSize: GRID_N,
    paperSize: PAPER_SIZE,
    keyframes: ensureMinKeyframes(generateFlowerKeyframes(), 12)
  }
};

export function interpolateKeyframes(
  keyframes: FoldKeyframe[],
  progress: number,
  out: Float32Array
): void {
  if (keyframes.length === 0) return;
  if (keyframes.length === 1) {
    out.set(keyframes[0].vertexOffsets);
    return;
  }

  progress = Math.max(0, Math.min(1, progress));

  let kfIndex = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i].progress && progress <= keyframes[i + 1].progress) {
      kfIndex = i;
      break;
    }
    if (i === keyframes.length - 2) {
      kfIndex = progress < keyframes[0].progress ? 0 : keyframes.length - 2;
    }
  }

  const kfA = keyframes[kfIndex];
  const kfB = keyframes[kfIndex + 1];
  
  const range = kfB.progress - kfA.progress;
  const localT = range > 0 ? (progress - kfA.progress) / range : 0;
  const easedT = easeInOut(localT);

  lerpArray(kfA.vertexOffsets, kfB.vertexOffsets, easedT, out);
}
