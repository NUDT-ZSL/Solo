import * as THREE from 'three';

interface TrailSegment {
  line: THREE.Line;
  glowLine: THREE.Line;
  points: THREE.Vector3[];
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

const COLOR_PALETTE = [
  { start: new THREE.Color('#6366f1'), end: new THREE.Color('#f59e0b') },
  { start: new THREE.Color('#818cf8'), end: new THREE.Color('#fb923c') },
  { start: new THREE.Color('#a78bfa'), end: new THREE.Color('#fbbf24') },
  { start: new THREE.Color('#7c3aed'), end: new THREE.Color('#ea580c') },
  { start: new THREE.Color('#4f46e5'), end: new THREE.Color('#d97706') },
];

export class LightBrush {
  private scene: THREE.Scene;
  private trails: TrailSegment[] = [];
  private activeTrail: TrailSegment | null = null;
  private isDrawing = false;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private lineWidth = 1.5;
  private minDistance = 0.5;
  private depthOffset = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setLineWidth(width: number): void {
    this.lineWidth = width;
  }

  getTrails(): TrailSegment[] {
    return this.trails;
  }

  startStroke(mouseX: number, mouseY: number, camera: THREE.Camera): void {
    const point = this.getPlaneIntersection(mouseX, mouseY, camera);
    if (!point) return;

    const palette = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    this.depthOffset = (Math.random() - 0.5) * 10;

    this.activeTrail = {
      line: this.createLine(palette, this.lineWidth),
      glowLine: this.createGlowLine(palette, this.lineWidth * 3),
      points: [point],
      colorStart: palette.start.clone(),
      colorEnd: palette.end.clone(),
    };

    this.scene.add(this.activeTrail.line);
    this.scene.add(this.activeTrail.glowLine);
    this.trails.push(this.activeTrail);
    this.isDrawing = true;
  }

  continueStroke(mouseX: number, mouseY: number, camera: THREE.Camera): void {
    if (!this.isDrawing || !this.activeTrail) return;

    const point = this.getPlaneIntersection(mouseX, mouseY, camera);
    if (!point) return;

    const lastPoint = this.activeTrail.points[this.activeTrail.points.length - 1];
    if (point.distanceTo(lastPoint) < this.minDistance) return;

    this.activeTrail.points.push(point);
    this.updateTrailGeometry(this.activeTrail);
  }

  endStroke(): void {
    this.isDrawing = false;
    this.activeTrail = null;
  }

  hitTest(mouseX: number, mouseY: number, camera: THREE.Camera): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    let closestPoint: THREE.Vector3 | null = null;
    let closestDist = Infinity;

    for (const trail of this.trails) {
      for (const pt of trail.points) {
        const dist = this.raycaster.ray.distanceToPoint(pt);
        if (dist < 1.5 && dist < closestDist) {
          closestDist = dist;
          closestPoint = pt.clone();
        }
      }
    }

    return closestPoint;
  }

  removeTrailAt(point: THREE.Vector3): void {
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.trails.length; i++) {
      for (const pt of this.trails[i].points) {
        const dist = pt.distanceTo(point);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
    }

    if (closestIdx >= 0) {
      const trail = this.trails[closestIdx];
      this.scene.remove(trail.line);
      this.scene.remove(trail.glowLine);
      trail.line.geometry.dispose();
      (trail.line.material as THREE.Material).dispose();
      trail.glowLine.geometry.dispose();
      (trail.glowLine.material as THREE.Material).dispose();
      this.trails.splice(closestIdx, 1);
    }
  }

  clearAll(): void {
    for (const trail of this.trails) {
      this.scene.remove(trail.line);
      this.scene.remove(trail.glowLine);
      trail.line.geometry.dispose();
      (trail.line.material as THREE.Material).dispose();
      trail.glowLine.geometry.dispose();
      (trail.glowLine.material as THREE.Material).dispose();
    }
    this.trails = [];
    this.activeTrail = null;
    this.isDrawing = false;
  }

  update(): void {
  }

  private getPlaneIntersection(mouseX: number, mouseY: number, camera: THREE.Camera): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const target = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.plane, target);
    if (result) {
      target.z += this.depthOffset;
    }
    return result;
  }

  private createLine(palette: { start: THREE.Color; end: THREE.Color }, _width: number): THREE.Line {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }

  private createGlowLine(palette: { start: THREE.Color; end: THREE.Color }, _width: number): THREE.Line {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }

  private updateTrailGeometry(trail: TrailSegment): void {
    const pts = trail.points;
    if (pts.length < 2) return;

    const positions = new Float32Array(pts.length * 3);
    const colors = new Float32Array(pts.length * 3);

    for (let i = 0; i < pts.length; i++) {
      const t = pts.length > 1 ? i / (pts.length - 1) : 0;
      positions[i * 3] = pts[i].x;
      positions[i * 3 + 1] = pts[i].y;
      positions[i * 3 + 2] = pts[i].z;

      const color = new THREE.Color().lerpColors(trail.colorStart, trail.colorEnd, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    trail.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trail.line.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    trail.glowLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    trail.glowLine.geometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
  }

  getTrailColorAt(point: THREE.Vector3): { start: THREE.Color; end: THREE.Color } | null {
    let closestDist = Infinity;
    let closestTrail: TrailSegment | null = null;

    for (const trail of this.trails) {
      for (const pt of trail.points) {
        const dist = pt.distanceTo(point);
        if (dist < closestDist) {
          closestDist = dist;
          closestTrail = trail;
        }
      }
    }

    if (closestTrail) {
      return { start: closestTrail.colorStart, end: closestTrail.colorEnd };
    }
    return null;
  }
}
