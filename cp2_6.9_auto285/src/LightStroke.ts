import * as THREE from 'three';

interface StrokeLine {
  id: number;
  points: THREE.Vector3[];
  colors: Float32Array;
  sizes: Float32Array;
  geometry: THREE.BufferGeometry;
  line: THREE.Line;
  pointsMesh: THREE.Points;
  colorHex: number;
  baseColor: THREE.Color;
  isDrawing: boolean;
  releaseTime: number;
  vertexCount: number;
}

export class LightStrokeManager {
  public group: THREE.Group;
  private strokes: StrokeLine[] = [];
  private currentStroke: StrokeLine | null = null;
  private strokeIdCounter: number = 0;
  private maxTotalVertices: number = 5000;
  private trailVertexCount: number = 5;
  private lineWidth: number = 0.08;

  constructor() {
    this.group = new THREE.Group();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        }
      : { r: 1, g: 0.2, b: 0.4 };
  }

  public startStroke(point: THREE.Vector3, colorHex: string): void {
    this.cleanupOldStrokes();

    const id = ++this.strokeIdCounter;
    const baseColor = new THREE.Color(colorHex);
    const rgb = this.hexToRgb(colorHex);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3);
    const colors = new Float32Array(3);
    const sizes = new Float32Array(1);

    positions[0] = point.x;
    positions[1] = point.y;
    positions[2] = point.z;
    colors[0] = rgb.r;
    colors[1] = rgb.g;
    colors[2] = rgb.b;
    sizes[0] = this.lineWidth;

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      linewidth: 1,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, lineMaterial);
    line.frustumCulled = false;

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
    pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const pointsMaterial = new THREE.PointsMaterial({
      size: this.lineWidth * 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    pointsMesh.frustumCulled = false;

    const stroke: StrokeLine = {
      id,
      points: [point.clone()],
      colors,
      sizes,
      geometry,
      line,
      pointsMesh,
      colorHex: parseInt(colorHex.replace('#', ''), 16),
      baseColor,
      isDrawing: true,
      releaseTime: 0,
      vertexCount: 1
    };

    this.group.add(line);
    this.group.add(pointsMesh);
    this.strokes.push(stroke);
    this.currentStroke = stroke;
  }

  public addPoint(point: THREE.Vector3): void {
    if (!this.currentStroke || !this.currentStroke.isDrawing) return;

    const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1];
    if (lastPoint.distanceTo(point) < 0.02) return;

    this.currentStroke.points.push(point.clone());
    this.currentStroke.vertexCount = this.currentStroke.points.length;

    const vertexCount = this.currentStroke.points.length;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const sizes = new Float32Array(vertexCount);

    const baseRgb = {
      r: this.currentStroke.baseColor.r,
      g: this.currentStroke.baseColor.g,
      b: this.currentStroke.baseColor.b
    };

    for (let i = 0; i < vertexCount; i++) {
      const p = this.currentStroke.points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      const trailStart = Math.max(0, vertexCount - this.trailVertexCount);
      if (i >= trailStart) {
        const progress = (i - trailStart) / Math.max(1, this.trailVertexCount - 1);
        const alpha = 0.3 + progress * 0.7;
        colors[i * 3] = baseRgb.r;
        colors[i * 3 + 1] = baseRgb.g;
        colors[i * 3 + 2] = baseRgb.b;
        const whiteMix = progress * 0.3;
        colors[i * 3] = colors[i * 3] * (1 - whiteMix) + whiteMix;
        colors[i * 3 + 1] = colors[i * 3 + 1] * (1 - whiteMix) + whiteMix;
        colors[i * 3 + 2] = colors[i * 3 + 2] * (1 - whiteMix) + whiteMix;
      } else {
        colors[i * 3] = baseRgb.r;
        colors[i * 3 + 1] = baseRgb.g;
        colors[i * 3 + 2] = baseRgb.b;
      }

      sizes[i] = this.lineWidth;
    }

    this.currentStroke.colors = colors;
    this.currentStroke.sizes = sizes;

    this.currentStroke.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.currentStroke.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (this.currentStroke.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.currentStroke.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.currentStroke.geometry.computeBoundingSphere();

    const pointsPosAttr = this.currentStroke.pointsMesh.geometry.attributes.position as THREE.BufferAttribute;
    const pointsColAttr = this.currentStroke.pointsMesh.geometry.attributes.color as THREE.BufferAttribute;
    const pointsSizeAttr = this.currentStroke.pointsMesh.geometry.attributes.size as THREE.BufferAttribute;

    pointsPosAttr.array = positions.slice();
    pointsColAttr.array = colors.slice();
    pointsSizeAttr.array = sizes;
    pointsPosAttr.needsUpdate = true;
    pointsColAttr.needsUpdate = true;
    pointsSizeAttr.needsUpdate = true;
    this.currentStroke.pointsMesh.geometry.computeBoundingSphere();
  }

  public endStroke(): void {
    if (this.currentStroke) {
      this.currentStroke.isDrawing = false;
      this.currentStroke.releaseTime = performance.now();
      this.currentStroke = null;
    }
  }

  private cleanupOldStrokes(): void {
    let totalVertices = 0;
    for (const s of this.strokes) {
      totalVertices += s.vertexCount;
    }

    while (totalVertices > this.maxTotalVertices && this.strokes.length > 0) {
      const oldest = this.strokes.shift();
      if (oldest) {
        totalVertices -= oldest.vertexCount;
        this.group.remove(oldest.line);
        this.group.remove(oldest.pointsMesh);
        oldest.geometry.dispose();
        oldest.pointsMesh.geometry.dispose();
        (oldest.line.material as THREE.Material).dispose();
        (oldest.pointsMesh.material as THREE.Material).dispose();
      }
    }
  }

  public clearAll(): void {
    for (const stroke of this.strokes) {
      this.group.remove(stroke.line);
      this.group.remove(stroke.pointsMesh);
      stroke.geometry.dispose();
      stroke.pointsMesh.geometry.dispose();
      (stroke.line.material as THREE.Material).dispose();
      (stroke.pointsMesh.material as THREE.Material).dispose();
    }
    this.strokes = [];
    this.currentStroke = null;
  }

  public update(): void {
    const now = performance.now();
    const glowDuration = 3000;

    for (const stroke of this.strokes) {
      if (stroke.isDrawing) continue;

      const elapsed = now - stroke.releaseTime;
      if (elapsed > glowDuration) continue;

      const progress = elapsed / glowDuration;
      const pulse = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
      const whiteAmount = (1 - progress) * pulse * 0.35;

      const vertexCount = stroke.points.length;
      const colors = stroke.geometry.attributes.color as THREE.BufferAttribute;
      const colorsArray = colors.array as Float32Array;
      const baseRgb = { r: stroke.baseColor.r, g: stroke.baseColor.g, b: stroke.baseColor.b };

      const trailStart = Math.max(0, vertexCount - this.trailVertexCount);

      for (let i = 0; i < vertexCount; i++) {
        if (i >= trailStart) {
          const trailProgress = (i - trailStart) / Math.max(1, this.trailVertexCount - 1);
          const localWhite = whiteAmount * trailProgress;
          colorsArray[i * 3] = baseRgb.r * (1 - localWhite) + localWhite;
          colorsArray[i * 3 + 1] = baseRgb.g * (1 - localWhite) + localWhite;
          colorsArray[i * 3 + 2] = baseRgb.b * (1 - localWhite) + localWhite;
        } else {
          const baseWhite = whiteAmount * 0.1;
          colorsArray[i * 3] = baseRgb.r * (1 - baseWhite) + baseWhite;
          colorsArray[i * 3 + 1] = baseRgb.g * (1 - baseWhite) + baseWhite;
          colorsArray[i * 3 + 2] = baseRgb.b * (1 - baseWhite) + baseWhite;
        }
      }

      colors.needsUpdate = true;

      const pointsColors = stroke.pointsMesh.geometry.attributes.color as THREE.BufferAttribute;
      const pointsColorsArray = pointsColors.array as Float32Array;
      for (let i = 0; i < colorsArray.length; i++) {
        pointsColorsArray[i] = colorsArray[i];
      }
      pointsColors.needsUpdate = true;
    }
  }

  public getTotalVertices(): number {
    let total = 0;
    for (const s of this.strokes) total += s.vertexCount;
    return total;
  }
}
