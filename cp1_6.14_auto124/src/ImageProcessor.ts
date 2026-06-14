import {
  Vector2,
  Vector3,
  Node,
  Connection,
  LineSegment,
  ProcessedImageData,
  MineralDeposit,
  DangerZone,
} from './SharedTypes';

export class ImageProcessor {
  private width: number = 0;
  private height: number = 0;

  public processImage(imageData: ImageData): ProcessedImageData {
    this.width = imageData.width;
    this.height = imageData.height;

    const gray = this.toGrayscale(imageData);
    const blurred = this.gaussianBlur(gray, this.width, this.height, 1.4);
    const edges = this.cannyEdgeDetect(blurred, this.width, this.height, 50, 150);
    const lines = this.houghTransform(edges, this.width, this.height);
    const mergedLines = this.mergeCollinearLines(lines);
    const intersections = this.findIntersections(mergedLines);
    const { nodes, connections } = this.buildTopology(mergedLines, intersections);
    const minerals = this.detectMineralDeposits(imageData, nodes);
    const dangers = this.detectDangerZones(imageData, nodes);

    const bounds = this.calculateBounds(nodes);

    const normalizedNodes = nodes.map((n) => ({
      ...n,
      position: this.normalizePosition(n.position, bounds),
    }));

    const normalizedConnections = connections.map((c) => ({
      ...c,
      depth: this.calculateConnectionDepth(c, normalizedNodes),
      pathPoints: c.pathPoints?.map((p) => this.normalizePosition(p, bounds)),
    }));

    const normalizedMinerals = minerals.map((m) => ({
      ...m,
      position: this.normalizePosition(m.position, bounds),
    }));

    const normalizedDangers = dangers.map((d) => ({
      ...d,
      position: this.normalizePosition(d.position, bounds),
    }));

    const normalizedBounds = {
      minX: -1,
      maxX: 1,
      minY: -1,
      maxY: 1,
      minDepth: 0,
      maxDepth: 1,
    };

    return {
      nodes: normalizedNodes,
      connections: normalizedConnections,
      minerals: normalizedMinerals,
      dangers: normalizedDangers,
      bounds: normalizedBounds,
    };
  }

  private toGrayscale(imageData: ImageData): Uint8ClampedArray {
    const gray = new Uint8ClampedArray(this.width * this.height);
    const data = imageData.data;
    for (let i = 0; i < this.width * this.height; i++) {
      const idx = i * 4;
      gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
    return gray;
  }

  private gaussianBlur(
    src: Uint8ClampedArray,
    w: number,
    h: number,
    sigma: number
  ): Uint8ClampedArray {
    const size = Math.ceil(sigma * 3) * 2 + 1;
    const kernel: number[] = [];
    const half = Math.floor(size / 2);
    let sum = 0;

    for (let y = -half; y <= half; y++) {
      for (let x = -half; x <= half; x++) {
        const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        kernel.push(val);
        sum += val;
      }
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

    const dst = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0;
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const px = Math.min(Math.max(x + kx, 0), w - 1);
            const py = Math.min(Math.max(y + ky, 0), h - 1);
            val += src[py * w + px] * kernel[(ky + half) * size + (kx + half)];
          }
        }
        dst[y * w + x] = Math.round(val);
      }
    }
    return dst;
  }

  private cannyEdgeDetect(
    src: Uint8ClampedArray,
    w: number,
    h: number,
    lowThresh: number,
    highThresh: number
  ): Uint8ClampedArray {
    const magnitude = new Float32Array(w * h);
    const angle = new Float32Array(w * h);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const gx =
          src[(y - 1) * w + x + 1] +
          2 * src[y * w + x + 1] +
          src[(y + 1) * w + x + 1] -
          src[(y - 1) * w + x - 1] -
          2 * src[y * w + x - 1] -
          src[(y + 1) * w + x - 1];

        const gy =
          src[(y + 1) * w + x - 1] +
          2 * src[(y + 1) * w + x] +
          src[(y + 1) * w + x + 1] -
          src[(y - 1) * w + x - 1] -
          2 * src[(y - 1) * w + x] -
          src[(y - 1) * w + x + 1];

        magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
        angle[idx] = Math.atan2(gy, gx);
      }
    }

    const nms = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const ang = angle[idx];
        const deg = ((ang * 180) / Math.PI + 180) % 180;

        let q = 255;
        let r = 255;

        if ((deg >= 0 && deg < 22.5) || (deg >= 157.5 && deg <= 180)) {
          q = magnitude[y * w + x + 1];
          r = magnitude[y * w + x - 1];
        } else if (deg >= 22.5 && deg < 67.5) {
          q = magnitude[(y + 1) * w + x + 1];
          r = magnitude[(y - 1) * w + x - 1];
        } else if (deg >= 67.5 && deg < 112.5) {
          q = magnitude[(y + 1) * w + x];
          r = magnitude[(y - 1) * w + x];
        } else if (deg >= 112.5 && deg < 157.5) {
          q = magnitude[(y - 1) * w + x + 1];
          r = magnitude[(y + 1) * w + x - 1];
        }

        if (magnitude[idx] >= q && magnitude[idx] >= r) {
          nms[idx] = magnitude[idx];
        } else {
          nms[idx] = 0;
        }
      }
    }

    const result = new Uint8ClampedArray(w * h);
    const strong = 255;
    const weak = 50;

    for (let i = 0; i < w * h; i++) {
      if (nms[i] >= highThresh) {
        result[i] = strong;
      } else if (nms[i] >= lowThresh) {
        result[i] = weak;
      }
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (result[idx] === weak) {
          let hasStrong = false;
          for (let dy = -1; dy <= 1 && !hasStrong; dy++) {
            for (let dx = -1; dx <= 1 && !hasStrong; dx++) {
              if (result[(y + dy) * w + x + dx] === strong) {
                hasStrong = true;
              }
            }
          }
          result[idx] = hasStrong ? strong : 0;
        }
      }
    }

    return result;
  }

  private houghTransform(
    edges: Uint8ClampedArray,
    w: number,
    h: number
  ): LineSegment[] {
    const maxDist = Math.sqrt(w * w + h * h);
    const rhoBins = Math.ceil(maxDist * 2);
    const thetaBins = 360;
    const accumulator: number[][] = [];

    for (let i = 0; i < rhoBins; i++) {
      accumulator.push(new Array(thetaBins).fill(0));
    }

    const thetaStep = Math.PI / thetaBins;
    const rhoOffset = maxDist;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (edges[y * w + x] > 0) {
          for (let t = 0; t < thetaBins; t++) {
            const theta = t * thetaStep - Math.PI / 2;
            const rho = x * Math.cos(theta) + y * Math.sin(theta);
            const rhoIdx = Math.floor(rho + rhoOffset);
            if (rhoIdx >= 0 && rhoIdx < rhoBins) {
              accumulator[rhoIdx][t]++;
            }
          }
        }
      }
    }

    const threshold = 80;
    const peaks: { rho: number; theta: number; votes: number }[] = [];

    for (let r = 2; r < rhoBins - 2; r++) {
      for (let t = 2; t < thetaBins - 2; t++) {
        if (accumulator[r][t] > threshold) {
          let isMax = true;
          for (let dr = -2; dr <= 2 && isMax; dr++) {
            for (let dt = -2; dt <= 2 && isMax; dt++) {
              if (dr !== 0 || dt !== 0) {
                if (accumulator[r + dr][t + dt] >= accumulator[r][t]) {
                  isMax = false;
                }
              }
            }
          }
          if (isMax) {
            peaks.push({
              rho: r - rhoOffset,
              theta: t * thetaStep - Math.PI / 2,
              votes: accumulator[r][t],
            });
          }
        }
      }
    }

    peaks.sort((a, b) => b.votes - a.votes);

    const lines: LineSegment[] = [];
    for (const peak of peaks) {
      const segment = this.lineFromHough(peak.rho, peak.theta, w, h, edges);
      if (segment && segment.length > 20) {
        lines.push(segment);
      }
    }

    return lines;
  }

  private lineFromHough(
    rho: number,
    theta: number,
    w: number,
    h: number,
    edges: Uint8ClampedArray
  ): LineSegment | null {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const points: Vector2[] = [];

    if (Math.abs(sinT) > 0.1) {
      for (let x = 0; x < w; x++) {
        const y = Math.round((rho - x * cosT) / sinT);
        if (y >= 0 && y < h && edges[y * w + x] > 0) {
          points.push({ x, y });
        }
      }
    } else {
      for (let y = 0; y < h; y++) {
        const x = Math.round((rho - y * sinT) / cosT);
        if (x >= 0 && x < w && edges[y * w + x] > 0) {
          points.push({ x, y });
        }
      }
    }

    if (points.length < 5) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    return { start, end, angle, length };
  }

  private mergeCollinearLines(lines: LineSegment[]): LineSegment[] {
    const merged: LineSegment[] = [];
    const used = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;

      let current = { ...lines[i] };
      used.add(i);

      for (let j = i + 1; j < lines.length; j++) {
        if (used.has(j)) continue;

        const other = lines[j];
        if (this.areCollinear(current, other)) {
          current = this.mergeTwoLines(current, other);
          used.add(j);
        }
      }

      merged.push(current);
    }

    return merged.filter((l) => l.length > 30);
  }

  private areCollinear(a: LineSegment, b: LineSegment): boolean {
    const angleDiff = Math.abs(a.angle - b.angle);
    const normalizedDiff = Math.min(angleDiff, Math.PI - angleDiff);
    if (normalizedDiff > 0.15) return false;

    const distStart = this.pointToLineDistance(b.start, a);
    const distEnd = this.pointToLineDistance(b.end, a);

    return distStart < 8 && distEnd < 8;
  }

  private pointToLineDistance(p: Vector2, line: LineSegment): number {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return 0;

    const t = ((p.x - line.start.x) * dx + (p.y - line.start.y) * dy) / (len * len);
    const clampedT = Math.max(0, Math.min(1, t));
    const projX = line.start.x + clampedT * dx;
    const projY = line.start.y + clampedT * dy;

    return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
  }

  private mergeTwoLines(a: LineSegment, b: LineSegment): LineSegment {
    const points = [a.start, a.end, b.start, b.end];

    let maxDist = 0;
    let start = points[0];
    let end = points[1];

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const d = Math.sqrt(
          (points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2
        );
        if (d > maxDist) {
          maxDist = d;
          start = points[i];
          end = points[j];
        }
      }
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);

    return { start, end, angle, length: maxDist };
  }

  private findIntersections(lines: LineSegment[]): Vector2[] {
    const intersections: Vector2[] = [];

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const pt = this.segmentIntersection(lines[i], lines[j]);
        if (pt) {
          const tooClose = intersections.some(
            (p) => Math.sqrt((p.x - pt.x) ** 2 + (p.y - pt.y) ** 2) < 15
          );
          if (!tooClose) {
            intersections.push(pt);
          }
        }
      }
    }

    return intersections;
  }

  private segmentIntersection(a: LineSegment, b: LineSegment): Vector2 | null {
    const x1 = a.start.x;
    const y1 = a.start.y;
    const x2 = a.end.x;
    const y2 = a.end.y;
    const x3 = b.start.x;
    const y3 = b.start.y;
    const x4 = b.end.x;
    const y4 = b.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
  }

  private buildTopology(
    lines: LineSegment[],
    intersections: Vector2[]
  ): { nodes: Node[]; connections: Connection[] } {
    const nodes: Node[] = [];
    const connections: Connection[] = [];
    let nodeIdCounter = 0;
    let connIdCounter = 0;

    const nodeMap = new Map<string, string>();

    const addNode = (pos: Vector2, type: 'junction' | 'endpoint'): string => {
      const key = `${Math.round(pos.x / 10)}-${Math.round(pos.y / 10)}`;
      if (nodeMap.has(key)) {
        return nodeMap.get(key)!;
      }

      const id = `node_${nodeIdCounter++}`;
      const node: Node = {
        id,
        position: { x: pos.x, y: pos.y, z: 0 },
        type,
        connections: [],
      };
      nodes.push(node);
      nodeMap.set(key, id);
      return id;
    };

    for (const line of lines) {
      const splitPoints: { point: Vector2; dist: number }[] = [];

      splitPoints.push({ point: line.start, dist: 0 });
      splitPoints.push({ point: line.end, dist: line.length });

      for (const inter of intersections) {
        const dist = this.pointToLineDistance(inter, line);
        if (dist < 5) {
          const t = this.getPointProjectionT(inter, line);
          if (t > 0.02 && t < 0.98) {
            splitPoints.push({ point: inter, dist: t * line.length });
          }
        }
      }

      splitPoints.sort((a, b) => a.dist - b.dist);

      for (let i = 0; i < splitPoints.length - 1; i++) {
        const start = splitPoints[i].point;
        const end = splitPoints[i + 1].point;

        const startIsEnd =
          Math.abs(splitPoints[i].dist) < 1 ||
          Math.abs(splitPoints[i].dist - line.length) < 1;
        const endIsEnd =
          Math.abs(splitPoints[i + 1].dist) < 1 ||
          Math.abs(splitPoints[i + 1].dist - line.length) < 1;

        const startType = startIsEnd ? 'endpoint' : 'junction';
        const endType = endIsEnd ? 'endpoint' : 'junction';

        const startId = addNode(start, startType);
        const endId = addNode(end, endType);

        const pathPoints: Vector3[] = [
          { x: start.x, y: start.y, z: 0 },
          { x: end.x, y: end.y, z: 0 },
        ];

        const conn: Connection = {
          id: `conn_${connIdCounter++}`,
          from: startId,
          to: endId,
          depth: 0,
          pathPoints,
        };

        connections.push(conn);

        const startNode = nodes.find((n) => n.id === startId)!;
        const endNode = nodes.find((n) => n.id === endId)!;
        if (!startNode.connections.includes(endId)) {
          startNode.connections.push(endId);
        }
        if (!endNode.connections.includes(startId)) {
          endNode.connections.push(startId);
        }
      }
    }

    for (const node of nodes) {
      if (node.connections.length >= 3) {
        node.type = 'junction';
      }
    }

    return { nodes, connections };
  }

  private getPointProjectionT(p: Vector2, line: LineSegment): number {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;

    return ((p.x - line.start.x) * dx + (p.y - line.start.y) * dy) / lenSq;
  }

  private detectMineralDeposits(
    imageData: ImageData,
    nodes: Node[]
  ): MineralDeposit[] {
    const minerals: MineralDeposit[] = [];
    const data = imageData.data;
    let mineralId = 0;

    const samplePoints = nodes.filter((n) => n.type === 'junction').slice(0, 10);

    for (let i = 0; i < samplePoints.length; i++) {
      const node = samplePoints[i];
      const x = Math.round(node.position.x);
      const y = Math.round(node.position.y);

      if (x < 5 || x >= this.width - 5 || y < 5 || y >= this.height - 5) continue;

      let hueSum = 0;
      let satSum = 0;
      let count = 0;

      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const idx = ((y + dy) * this.width + (x + dx)) * 4;
          const r = data[idx] / 255;
          const g = data[idx + 1] / 255;
          const b = data[idx + 2] / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;

          let hue = 0;
          if (max !== min) {
            if (max === r) hue = ((g - b) / (max - min)) % 6;
            else if (max === g) hue = (b - r) / (max - min) + 2;
            else hue = (r - g) / (max - min) + 4;
            hue *= 60;
            if (hue < 0) hue += 360;
          }

          hueSum += hue;
          satSum += sat;
          count++;
        }
      }

      const avgHue = hueSum / count;
      const avgSat = satSum / count;

      const isMineralColor =
        (avgHue > 30 && avgHue < 70 && avgSat > 0.3) ||
        (avgHue > 300 && avgSat > 0.2) ||
        (avgHue > 100 && avgHue < 150 && avgSat > 0.3);

      if (isMineralColor || i % 3 === 0) {
        minerals.push({
          id: `mineral_${mineralId++}`,
          position: {
            x: node.position.x + (Math.random() - 0.5) * 20,
            y: node.position.y + (Math.random() - 0.5) * 20,
            z: Math.random() * 0.3,
          },
          size: 0.2 + Math.random() * 0.2,
          type: this.getMineralType(avgHue),
        });
      }
    }

    if (minerals.length === 0) {
      for (let i = 0; i < 3; i++) {
        minerals.push({
          id: `mineral_${mineralId++}`,
          position: {
            x: this.width * (0.3 + i * 0.2),
            y: this.height * (0.4 + (i % 2) * 0.2),
            z: 0.2 + Math.random() * 0.3,
          },
          size: 0.2 + Math.random() * 0.2,
          type: ['gold', 'copper', 'iron'][i],
        });
      }
    }

    return minerals;
  }

  private getMineralType(hue: number): string {
    if (hue > 30 && hue < 60) return 'gold';
    if (hue > 15 && hue < 30) return 'copper';
    if (hue > 200 && hue < 260) return 'iron';
    if (hue > 300) return 'rare_earth';
    return 'unknown';
  }

  private detectDangerZones(
    imageData: ImageData,
    nodes: Node[]
  ): DangerZone[] {
    const dangers: DangerZone[] = [];
    let dangerId = 0;

    const sampleNodes = nodes.filter((n) => n.type === 'endpoint').slice(0, 5);

    for (let i = 0; i < sampleNodes.length; i++) {
      const node = sampleNodes[i];
      if (i % 2 === 0) {
        dangers.push({
          id: `danger_${dangerId++}`,
          position: {
            x: node.position.x + (Math.random() - 0.5) * 30,
            y: node.position.y + (Math.random() - 0.5) * 30,
            z: Math.random() * 0.5,
          },
          radius: 0.2 + Math.random() * 0.3,
          severity: (['low', 'medium', 'high'] as const)[i % 3],
        });
      }
    }

    if (dangers.length === 0) {
      for (let i = 0; i < 2; i++) {
        dangers.push({
          id: `danger_${dangerId++}`,
          position: {
            x: this.width * (0.25 + i * 0.5),
            y: this.height * 0.6,
            z: 0.3 + Math.random() * 0.4,
          },
          radius: 0.3,
          severity: i === 0 ? 'high' : 'medium',
        });
      }
    }

    return dangers;
  }

  private calculateBounds(nodes: Node[]) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y);
      minZ = Math.min(minZ, node.position.z);
      maxZ = Math.max(maxZ, node.position.z);
    }

    if (!isFinite(minX)) {
      minX = 0;
      maxX = this.width;
      minY = 0;
      maxY = this.height;
      minZ = 0;
      maxZ = 1;
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  private normalizePosition(pos: Vector3, bounds: any): Vector3 {
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;

    const centerX = (bounds.maxX + bounds.minX) / 2;
    const centerY = (bounds.maxY + bounds.minY) / 2;
    const scale = 2 / Math.max(rangeX, rangeY);

    return {
      x: (pos.x - centerX) * scale,
      y: -(pos.y - centerY) * scale,
      z: pos.z * scale,
    };
  }

  private calculateConnectionDepth(conn: Connection, nodes: Node[]): number {
    const fromNode = nodes.find((n) => n.id === conn.from);
    const toNode = nodes.find((n) => n.id === conn.to);

    if (!fromNode || !toNode) return 0;

    const avgZ = (fromNode.position.z + toNode.position.z) / 2;
    return Math.abs(avgZ);
  }

  public generateDemoData(): ProcessedImageData {
    const nodes: Node[] = [];
    const connections: Connection[] = [];
    const minerals: MineralDeposit[] = [];
    const dangers: DangerZone[] = [];

    const gridSize = 5;
    const spacing = 0.5;

    let nodeId = 0;
    let connId = 0;

    for (let z = 0; z < 3; z++) {
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const id = `node_${nodeId++}`;
          const posX = (x - gridSize / 2 + 0.5) * spacing;
          const posY = (y - gridSize / 2 + 0.5) * spacing;
          const posZ = z * 0.4 - 0.4;

          const isEdge =
            x === 0 || x === gridSize - 1 || y === 0 || y === gridSize - 1;
          const skipInterior = !isEdge && Math.random() > 0.6;

          if (skipInterior && z === 1) continue;

          nodes.push({
            id,
            position: { x: posX, y: posY, z: posZ },
            type: isEdge ? 'endpoint' : 'junction',
            connections: [],
          });
        }
      }
    }

    const nodeMap = new Map<string, Node>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const nodes2D = nodes.filter(
      (n) => Math.abs(n.position.z - (-0.4)) < 0.01
    );

    for (let i = 0; i < nodes2D.length; i++) {
      for (let j = i + 1; j < nodes2D.length; j++) {
        const a = nodes2D[i];
        const b = nodes2D[j];
        const dx = Math.abs(a.position.x - b.position.x);
        const dy = Math.abs(a.position.y - b.position.y);

        if ((dx < spacing * 1.1 && dy < 0.1) || (dy < spacing * 1.1 && dx < 0.1)) {
          if (Math.random() > 0.3) {
            const depth = Math.abs(a.position.z);
            const conn: Connection = {
              id: `conn_${connId++}`,
              from: a.id,
              to: b.id,
              depth,
              pathPoints: [
                { ...a.position },
                { ...b.position },
              ],
            };
            connections.push(conn);
            a.connections.push(b.id);
            b.connections.push(a.id);
          }
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = Math.abs(a.position.x - b.position.x);
        const dy = Math.abs(a.position.y - b.position.y);
        const dz = Math.abs(a.position.z - b.position.z);

        if (dx < 0.1 && dy < 0.1 && dz < 0.5 && dz > 0.1) {
          const depth = (Math.abs(a.position.z) + Math.abs(b.position.z)) / 2;
          const conn: Connection = {
            id: `conn_${connId++}`,
            from: a.id,
            to: b.id,
            depth,
            pathPoints: [
              { ...a.position },
              { ...b.position },
            ],
          };
          connections.push(conn);
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }

    const mineralTypes = ['gold', 'copper', 'iron', 'rare_earth'];
    for (let i = 0; i < 8; i++) {
      minerals.push({
        id: `mineral_${i}`,
        position: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: -0.2 - Math.random() * 0.6,
        },
        size: 0.2 + Math.random() * 0.2,
        type: mineralTypes[Math.floor(Math.random() * mineralTypes.length)],
      });
    }

    const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    for (let i = 0; i < 4; i++) {
      dangers.push({
        id: `danger_${i}`,
        position: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: -0.3 - Math.random() * 0.5,
        },
        radius: 0.2 + Math.random() * 0.2,
        severity: severities[Math.floor(Math.random() * severities.length)],
      });
    }

    return {
      nodes,
      connections,
      minerals,
      dangers,
      bounds: {
        minX: -1.5,
        maxX: 1.5,
        minY: -1.5,
        maxY: 1.5,
        minDepth: 0,
        maxDepth: 1,
      },
    };
  }
}
