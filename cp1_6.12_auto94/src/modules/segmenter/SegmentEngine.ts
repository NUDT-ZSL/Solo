export type ComponentType = 'button' | 'input' | 'card' | 'navbar' | 'container' | 'text' | 'image';

export const COMPONENT_TYPES: ComponentType[] = ['button', 'input', 'card', 'navbar', 'container', 'text', 'image'];

export interface ComponentNode {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  children: ComponentNode[];
  imageData?: string;
}

export interface SegmentResult {
  root: ComponentNode;
  imageWidth: number;
  imageHeight: number;
  timestamp: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Region extends Rect {
  id: string;
  area: number;
  pixelDensity: number;
  edgeStrength: number;
  children: Region[];
}

export class SegmentEngine {
  private edgeThreshold = 30;
  private minRegionArea = 200;
  private maxTextDensity = 0.15;
  private navbarHeightRatio = 0.12;

  async segmentImage(imageDataUrl: string): Promise<SegmentResult> {
    const startTime = performance.now();

    const { imageData, width, height } = await this.loadImageToCanvas(imageDataUrl);
    const grayData = this.grayscale(imageData, width, height);
    const edgeMap = this.detectEdges(grayData, width, height);

    const hProjection = this.horizontalProjection(edgeMap, width, height);
    const vProjection = this.verticalProjection(edgeMap, width, height);

    const rowSegments = this.findSegmentsFromProjection(hProjection, height, this.edgeThreshold * 0.3);
    const colSegments = this.findSegmentsFromProjection(vProjection, width, this.edgeThreshold * 0.3);

    const rawRegions = this.extractRegionsFromGrid(
      edgeMap, grayData, width, height, rowSegments, colSegments
    );

    const mergedRegions = this.mergeAdjacentRegions(rawRegions, width, height);
    const filteredRegions = this.filterSmallRegions(mergedRegions);

    const nestedRegions = this.buildNestedHierarchy(filteredRegions);
    const classifiedRegions = this.classifyRegions(nestedRegions, width, height);

    const root = this.buildComponentTree(classifiedRegions, width, height, imageData);

    const timestamp = Date.now();
    console.log(`[SegmentEngine] 分割完成，耗时 ${(performance.now() - startTime).toFixed(0)}ms，检测到 ${classifiedRegions.length} 个区域`);

    return { root, imageWidth: width, imageHeight: height, timestamp };
  }

  private async loadImageToCanvas(dataUrl: string): Promise<{ imageData: ImageData; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取 Canvas 2D 上下文'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve({ imageData, width: canvas.width, height: canvas.height });
      };
      img.onerror = () => reject(new Error('图像加载失败'));
      img.src = dataUrl;
    });
  }

  private grayscale(imageData: ImageData, width: number, height: number): Uint8ClampedArray {
    const gray = new Uint8ClampedArray(width * height);
    const data = imageData.data;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(
        data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      );
    }
    return gray;
  }

  private detectEdges(grayData: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const edges = new Uint8ClampedArray(width * height);
    const threshold = this.edgeThreshold;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx =
          -grayData[idx - width - 1] - 2 * grayData[idx - 1] - grayData[idx + width - 1] +
          grayData[idx - width + 1] + 2 * grayData[idx + 1] + grayData[idx + width + 1];
        const gy =
          -grayData[idx - width - 1] - 2 * grayData[idx - width] - grayData[idx - width + 1] +
          grayData[idx + width - 1] + 2 * grayData[idx + width] + grayData[idx + width + 1];
        const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        edges[idx] = magnitude > threshold ? magnitude : 0;
      }
    }
    return edges;
  }

  private horizontalProjection(edgeMap: Uint8ClampedArray, width: number, height: number): Int32Array {
    const proj = new Int32Array(height);
    for (let y = 0; y < height; y++) {
      let sum = 0;
      const rowStart = y * width;
      for (let x = 0; x < width; x++) {
        sum += edgeMap[rowStart + x] > 0 ? 1 : 0;
      }
      proj[y] = sum;
    }
    return proj;
  }

  private verticalProjection(edgeMap: Uint8ClampedArray, width: number, height: number): Int32Array {
    const proj = new Int32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = 0; y < height; y++) {
        sum += edgeMap[y * width + x] > 0 ? 1 : 0;
      }
      proj[x] = sum;
    }
    return proj;
  }

  private findSegmentsFromProjection(projection: Int32Array, length: number, minValue: number): Array<{ start: number; end: number }> {
    const segments: Array<{ start: number; end: number }> = [];
    let inSegment = false;
    let start = 0;
    const gapThreshold = Math.max(3, Math.floor(length * 0.01));

    for (let i = 0; i < length; i++) {
      if (projection[i] >= minValue) {
        if (!inSegment) {
          inSegment = true;
          start = i;
        }
      } else {
        if (inSegment) {
          let gap = 1;
          let j = i + 1;
          while (j < length && projection[j] < minValue && gap < gapThreshold) {
            gap++;
            j++;
          }
          if (j < length && projection[j] >= minValue) {
            i = j;
            continue;
          }
          inSegment = false;
          if (i - start >= 2) {
            segments.push({ start, end: i - 1 });
          }
        }
      }
    }
    if (inSegment && length - start >= 2) {
      segments.push({ start, end: length - 1 });
    }
    return segments;
  }

  private extractRegionsFromGrid(
    edgeMap: Uint8ClampedArray,
    grayData: Uint8ClampedArray,
    width: number,
    height: number,
    rowSegments: Array<{ start: number; end: number }>,
    colSegments: Array<{ start: number; end: number }>
  ): Region[] {
    const regions: Region[] = [];
    let regionId = 0;

    const expandedRows = this.expandSegments(rowSegments, height, 2);
    const expandedCols = this.expandSegments(colSegments, width, 2);

    for (const rowSeg of expandedRows) {
      for (const colSeg of expandedCols) {
        const x = colSeg.start;
        const y = rowSeg.start;
        const w = colSeg.end - colSeg.start + 1;
        const h = rowSeg.end - rowSeg.start + 1;
        const area = w * h;

        if (area < this.minRegionArea * 0.5) continue;

        let edgeCount = 0;
        let pixelSum = 0;
        let pixelCount = 0;

        for (let yy = y; yy < y + h; yy++) {
          for (let xx = x; xx < x + w; xx++) {
            const idx = yy * width + xx;
            if (edgeMap[idx] > 0) edgeCount++;
            pixelSum += grayData[idx];
            pixelCount++;
          }
        }

        const density = edgeCount / area;
        const avgGray = pixelCount > 0 ? pixelSum / pixelCount : 128;
        const edgeStrength = edgeCount > 0 ? edgeMap.reduce((a, b) => a + b, 0) / edgeCount : 0;

        if (density < 0.005 && area < this.minRegionArea * 2) continue;

        regions.push({
          id: `region-${regionId++}`,
          x,
          y,
          width: w,
          height: h,
          area,
          pixelDensity: density,
          edgeStrength,
          children: [],
        });

        void avgGray;
      }
    }

    return regions;
  }

  private expandSegments(
    segments: Array<{ start: number; end: number }>,
    max: number,
    expand: number
  ): Array<{ start: number; end: number }> {
    return segments.map(s => ({
      start: Math.max(0, s.start - expand),
      end: Math.min(max - 1, s.end + expand),
    }));
  }

  private mergeAdjacentRegions(regions: Region[], width: number, height: number): Region[] {
    if (regions.length <= 1) return regions;

    let merged = [...regions];
    const maxIterations = 5;

    for (let iter = 0; iter < maxIterations; iter++) {
      let anyMerged = false;
      const result: Region[] = [];
      const used = new Set<number>();

      merged.sort((a, b) => a.y - b.y || a.x - b.x);

      for (let i = 0; i < merged.length; i++) {
        if (used.has(i)) continue;
        let current = { ...merged[i], children: [...merged[i].children] };

        for (let j = i + 1; j < merged.length; j++) {
          if (used.has(j)) continue;
          const other = merged[j];

          if (this.shouldMerge(current, other, width, height)) {
            current = this.unionRegions(current, other);
            used.add(j);
            anyMerged = true;
          }
        }
        result.push(current);
      }

      merged = result;
      if (!anyMerged) break;
    }

    return merged;
  }

  private shouldMerge(a: Region, b: Region, width: number, height: number): boolean {
    const iou = this.intersectionOverUnion(a, b);
    if (iou > 0.3) return true;

    const verticalDist = this.verticalDistance(a, b);
    const horizontalDist = this.horizontalDistance(a, b);

    const isNesting = this.isNested(a, b) || this.isNested(b, a);
    if (isNesting) return false;

    const gapThreshold = Math.min(width, height) * 0.02;
    const sameRow = Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)) < Math.max(a.height, b.height) * 0.5;
    const sameCol = Math.abs((a.x + a.width / 2) - (b.x + b.width / 2)) < Math.max(a.width, b.width) * 0.5;

    if (sameRow && horizontalDist < gapThreshold && verticalDist < Math.max(a.height, b.height) * 0.3) {
      return true;
    }
    if (sameCol && verticalDist < gapThreshold && horizontalDist < Math.max(a.width, b.width) * 0.3) {
      return true;
    }

    return false;
  }

  private unionRegions(a: Region, b: Region): Region {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.max(a.x + a.width, b.x + b.width) - x;
    const height = Math.max(a.y + a.height, b.y + b.height) - y;
    const area = width * height;

    return {
      id: a.id,
      x,
      y,
      width,
      height,
      area,
      pixelDensity: (a.pixelDensity * a.area + b.pixelDensity * b.area) / (a.area + b.area),
      edgeStrength: (a.edgeStrength * a.area + b.edgeStrength * b.area) / (a.area + b.area),
      children: [...a.children, ...b.children],
    };
  }

  private intersectionOverUnion(a: Region, b: Region): number {
    const ix1 = Math.max(a.x, b.x);
    const iy1 = Math.max(a.y, b.y);
    const ix2 = Math.min(a.x + a.width, b.x + b.width);
    const iy2 = Math.min(a.y + a.height, b.y + b.height);

    if (ix2 <= ix1 || iy2 <= iy1) return 0;

    const intersection = (ix2 - ix1) * (iy2 - iy1);
    const union = a.area + b.area - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private isNested(inner: Region, outer: Region): boolean {
    const padding = 2;
    return (
      inner.x >= outer.x - padding &&
      inner.y >= outer.y - padding &&
      inner.x + inner.width <= outer.x + outer.width + padding &&
      inner.y + inner.height <= outer.y + outer.height + padding &&
      inner.area < outer.area * 0.9
    );
  }

  private verticalDistance(a: Region, b: Region): number {
    if (a.y + a.height <= b.y) return b.y - (a.y + a.height);
    if (b.y + b.height <= a.y) return a.y - (b.y + b.height);
    return 0;
  }

  private horizontalDistance(a: Region, b: Region): number {
    if (a.x + a.width <= b.x) return b.x - (a.x + a.width);
    if (b.x + b.width <= a.x) return a.x - (b.x + b.width);
    return 0;
  }

  private filterSmallRegions(regions: Region[]): Region[] {
    return regions.filter(r => r.area >= this.minRegionArea);
  }

  private buildNestedHierarchy(regions: Region[]): Region[] {
    if (regions.length <= 1) return regions;

    const sorted = [...regions].sort((a, b) => b.area - a.area);
    const roots: Region[] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      if (assigned.has(sorted[i].id)) continue;

      const current = sorted[i];
      let parent: Region | null = null;
      let minAreaDiff = Infinity;

      for (let j = 0; j < i; j++) {
        const candidate = sorted[j];
        if (this.isNested(current, candidate)) {
          const areaDiff = candidate.area - current.area;
          if (areaDiff < minAreaDiff) {
            minAreaDiff = areaDiff;
            parent = candidate;
          }
        }
      }

      if (parent) {
        parent.children.push(current);
        assigned.add(current.id);
      } else {
        roots.push(current);
      }
    }

    return roots;
  }

  private classifyRegions(regions: Region[], imgWidth: number, imgHeight: number): Region[] {
    const navbarMaxY = imgHeight * this.navbarHeightRatio;

    const classify = (region: Region, depth: number): Region => {
      const aspectRatio = region.width / Math.max(1, region.height);
      const areaRatio = region.area / (imgWidth * imgHeight);
      const isTop = region.y < navbarMaxY;

      const classifiedChildren = region.children.map(c => classify(c, depth + 1));

      let type: ComponentType = 'container';

      if (isTop && aspectRatio > 4 && areaRatio > 0.03 && areaRatio < 0.2 && depth === 0) {
        type = 'navbar';
      } else if (region.pixelDensity > this.maxTextDensity && areaRatio < 0.15 && aspectRatio > 0.3 && aspectRatio < 10) {
        type = 'text';
      } else if (aspectRatio > 3 && region.height < imgHeight * 0.08 && areaRatio < 0.15) {
        type = 'input';
      } else if (aspectRatio > 0.5 && aspectRatio < 4 && areaRatio >= 0.005 && areaRatio < 0.08 && region.pixelDensity > 0.02) {
        type = 'button';
      } else if (aspectRatio > 0.8 && aspectRatio < 2.5 && areaRatio >= 0.05) {
        type = 'card';
      } else if (classifiedChildren.length > 0 && areaRatio >= 0.02) {
        type = 'container';
      } else if (areaRatio >= 0.01) {
        type = 'card';
      } else if (region.pixelDensity < 0.03 && areaRatio >= 0.02) {
        type = 'image';
      }

      return { ...region, type, children: classifiedChildren } as Region & { type: ComponentType };
    };

    return regions.map(r => classify(r, 0));
  }

  private buildComponentTree(
    regions: Region[],
    width: number,
    height: number,
    imageData: ImageData
  ): ComponentNode {
    const root: ComponentNode = {
      id: 'root',
      type: 'container',
      x: 0,
      y: 0,
      width,
      height,
      children: [],
    };

    let nodeCounter = 0;
    const generateId = () => `node-${nodeCounter++}`;

    const toComponentNode = (region: Region, parentImageData?: ImageData): ComponentNode => {
      const regionType = (region as Region & { type?: ComponentType }).type || 'container';
      const node: ComponentNode = {
        id: generateId(),
        type: regionType,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        children: [],
      };

      if (regionType === 'image' && parentImageData) {
        try {
          node.imageData = this.extractRegionImageData(
            parentImageData,
            region.x,
            region.y,
            region.width,
            region.height
          );
        } catch {
          // ignore extraction errors
        }
      }

      node.children = region.children.map(child => toComponentNode(child, parentImageData || imageData));
      return node;
    };

    root.children = regions.map(r => toComponentNode(r, imageData));
    return root;
  }

  private extractRegionImageData(
    source: ImageData,
    x: number,
    y: number,
    width: number,
    height: number
  ): ImageData {
    const result = new ImageData(width, height);
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const srcIdx = ((y + dy) * source.width + (x + dx)) * 4;
        const dstIdx = (dy * width + dx) * 4;
        result.data[dstIdx] = source.data[srcIdx];
        result.data[dstIdx + 1] = source.data[srcIdx + 1];
        result.data[dstIdx + 2] = source.data[srcIdx + 2];
        result.data[dstIdx + 3] = source.data[srcIdx + 3];
      }
    }
    return result;
  }
}
