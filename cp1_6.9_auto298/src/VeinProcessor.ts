import type { VeinData, VeinNode } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class VeinProcessor {
  private width = 0;
  private height = 0;

  toGrayScale(imageData: ImageData): Uint8ClampedArray {
    const { data, width, height } = imageData;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
    }
    return gray;
  }

  private applyGaussianBlur(
    gray: Uint8ClampedArray,
    width: number,
    height: number
  ): Uint8ClampedArray {
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const divisor = 16;
    const out = new Uint8ClampedArray(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += gray[(y + ky) * width + (x + kx)] * kernel[ki++];
          }
        }
        out[y * width + x] = Math.min(255, Math.round(sum / divisor));
      }
    }
    return out;
  }

  sobelEdgeDetect(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const blurred = this.applyGaussianBlur(gray, width, height);
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const out = new Uint8ClampedArray(width * height);
    let maxGrad = 0;
    const magnitudes = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sx = 0,
          sy = 0,
          ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = blurred[(y + ky) * width + (x + kx)];
            sx += px * gx[ki];
            sy += px * gy[ki];
            ki++;
          }
        }
        const mag = Math.sqrt(sx * sx + sy * sy);
        magnitudes[y * width + x] = mag;
        if (mag > maxGrad) maxGrad = mag;
      }
    }

    const threshold = maxGrad * 0.18;
    for (let i = 0; i < magnitudes.length; i++) {
      out[i] = magnitudes[i] > threshold ? 255 : 0;
    }
    return out;
  }

  skeletonize(binary: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const img = new Uint8ClampedArray(binary);
    const countNonZero = (arr: Uint8ClampedArray) => {
      let c = 0;
      for (let i = 0; i < arr.length; i++) if (arr[i]) c++;
      return c;
    };

    let prevCount = countNonZero(img);
    const maxIter = 40;

    for (let iter = 0; iter < maxIter; iter++) {
      const toRemove: number[] = [];

      for (let pass = 0; pass < 2; pass++) {
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (img[idx] === 0) continue;

            const p2 = img[(y - 1) * width + x] ? 1 : 0;
            const p3 = img[(y - 1) * width + (x + 1)] ? 1 : 0;
            const p4 = img[y * width + (x + 1)] ? 1 : 0;
            const p5 = img[(y + 1) * width + (x + 1)] ? 1 : 0;
            const p6 = img[(y + 1) * width + x] ? 1 : 0;
            const p7 = img[(y + 1) * width + (x - 1)] ? 1 : 0;
            const p8 = img[y * width + (x - 1)] ? 1 : 0;
            const p9 = img[(y - 1) * width + (x - 1)] ? 1 : 0;

            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;

            let A = 0;
            const seq = [p2, p3, p4, p5, p6, p7, p8, p9];
            for (let k = 0; k < 8; k++) {
              if (seq[k] === 0 && seq[(k + 1) % 8] === 1) A++;
            }
            if (A !== 1) continue;

            if (pass === 0) {
              if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
                toRemove.push(idx);
              }
            } else {
              if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
                toRemove.push(idx);
              }
            }
          }
        }
        for (const r of toRemove) img[r] = 0;
        toRemove.length = 0;
      }

      const newCount = countNonZero(img);
      if (newCount === prevCount) break;
      prevCount = newCount;
    }

    return img;
  }

  private pruneBranches(
    skeleton: Uint8ClampedArray,
    width: number,
    height: number,
    minLength: number = 8
  ): Uint8ClampedArray {
    const img = new Uint8ClampedArray(skeleton);
    const visited = new Uint8Array(width * height);

    const getNeighbors = (x: number, y: number) => {
      const n: { x: number; y: number; idx: number }[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nidx = ny * width + nx;
          if (img[nidx]) n.push({ x: nx, y: ny, idx: nidx });
        }
      }
      return n;
    };

    const endpointNeighbor = (x: number, y: number) => {
      const n = getNeighbors(x, y);
      if (n.length !== 1) return null;
      return n[0];
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!img[idx] || visited[idx]) continue;
        const nb = endpointNeighbor(x, y);
        if (!nb) continue;

        const path: { x: number; y: number; idx: number }[] = [{ x, y, idx }];
        let cx = x,
          cy = y;
        visited[idx] = 1;

        for (let step = 0; step < 500; step++) {
          const next = getNeighbors(cx, cy).filter((n) => !visited[n.idx]);
          if (next.length === 0) break;
          const pick = next[0];
          path.push(pick);
          visited[pick.idx] = 1;
          cx = pick.x;
          cy = pick.y;
          if (getNeighbors(cx, cy).length > 2) break;
        }

        if (path.length < minLength) {
          for (const p of path) img[p.idx] = 0;
        }
      }
    }

    return img;
  }

  extractVeinGraph(
    skeleton: Uint8ClampedArray,
    width: number,
    height: number
  ): { nodes: VeinNode[]; edges: [number, number][] } {
    const pruned = this.pruneBranches(skeleton, width, height);
    const nodeIndexMap = new Map<number, number>();
    const nodes: VeinNode[] = [];
    const edges: [number, number][] = [];
    const visited = new Uint8Array(width * height);

    const getNeighbors = (x: number, y: number) => {
      const n: { x: number; y: number; idx: number }[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nidx = ny * width + nx;
          if (pruned[nidx]) n.push({ x: nx, y: ny, idx: nidx });
        }
      }
      return n;
    };

    const addNode = (x: number, y: number, idx: number): number => {
      if (nodeIndexMap.has(idx)) return nodeIndexMap.get(idx)!;
      const ni = nodes.length;
      nodes.push({ x, y });
      nodeIndexMap.set(idx, ni);
      return ni;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!pruned[idx] || visited[idx]) continue;

        const nbrs = getNeighbors(x, y);
        if (nbrs.length !== 1 && nbrs.length !== 3) continue;

        const startNodeIdx = addNode(x, y, idx);
        visited[idx] = 1;

        for (const startNbr of nbrs) {
          if (visited[startNbr.idx]) continue;

          let prevIdx = idx;
          let cx = startNbr.x,
            cy = startNbr.y,
            cidx = startNbr.idx;
          visited[cidx] = 1;
          let lastNodeIdx = -1;
          const stepLimit = 2000;

          for (let step = 0; step < stepLimit; step++) {
            const cnbrs = getNeighbors(cx, cy);
            const degree = cnbrs.length;

            if (degree === 0 || (degree !== 2 && step > 0)) {
              lastNodeIdx = addNode(cx, cy, cidx);
              break;
            }

            let foundNext = false;
            for (const nb of cnbrs) {
              if (nb.idx !== prevIdx && !visited[nb.idx]) {
                prevIdx = cidx;
                cx = nb.x;
                cy = nb.y;
                cidx = nb.idx;
                visited[cidx] = 1;
                foundNext = true;
                break;
              }
            }
            if (!foundNext) {
              lastNodeIdx = addNode(cx, cy, cidx);
              break;
            }
          }

          if (lastNodeIdx >= 0 && lastNodeIdx !== startNodeIdx) {
            const exists = edges.some(
              ([a, b]) =>
                (a === startNodeIdx && b === lastNodeIdx) ||
                (a === lastNodeIdx && b === startNodeIdx)
            );
            if (!exists) edges.push([startNodeIdx, lastNodeIdx]);
          }
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (pruned[idx] && !visited[idx]) {
          addNode(x, y, idx);
        }
      }
    }

    if (nodes.length < 2) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (pruned[idx]) addNode(x, y, idx);
        }
      }
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push([i, i + 1]);
      }
    }

    return { nodes, edges };
  }

  async processImage(imageEl: HTMLImageElement, imageId: string): Promise<VeinData> {
    const startTime = performance.now();
    this.width = imageEl.naturalWidth;
    this.height = imageEl.naturalHeight;

    const maxDim = 1600;
    let scale = 1;
    if (this.width > maxDim || this.height > maxDim) {
      scale = Math.min(maxDim / this.width, maxDim / this.height);
    }
    const procW = Math.round(this.width * scale);
    const procH = Math.round(this.height * scale);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = procW;
    offCanvas.height = procH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true })!;
    offCtx.drawImage(imageEl, 0, 0, procW, procH);

    const imageData = offCtx.getImageData(0, 0, procW, procH);
    const gray = this.toGrayScale(imageData);
    const edge = this.sobelEdgeDetect(gray, procW, procH);
    const skeleton = this.skeletonize(edge, procW, procH);
    const { nodes, edges } = this.extractVeinGraph(skeleton, procW, procH);

    const restoreScale = 1 / scale;
    const restoredNodes = nodes.map((n) => ({
      x: Math.round(n.x * restoreScale),
      y: Math.round(n.y * restoreScale),
    }));

    console.log(
      `[VeinProcessor] 完成，耗时 ${(performance.now() - startTime).toFixed(
        1
      )}ms，节点 ${restoredNodes.length}，边 ${edges.length}`
    );

    return {
      id: uuidv4(),
      imageId,
      nodes: restoredNodes,
      edges,
      width: this.width,
      height: this.height,
      createdAt: new Date().toISOString(),
    };
  }

  findNearestNode(
    veinData: VeinData,
    clickX: number,
    clickY: number,
    threshold: number = 30
  ): { index: number; distance: number } | null {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < veinData.nodes.length; i++) {
      const n = veinData.nodes[i];
      const d = Math.hypot(n.x - clickX, n.y - clickY);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestDist <= threshold) return { index: bestIdx, distance: bestDist };
    return null;
  }
}

export const veinProcessor = new VeinProcessor();
