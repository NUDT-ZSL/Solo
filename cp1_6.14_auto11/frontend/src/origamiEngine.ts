import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  CreaseLine,
  CreasePattern,
  FoldStep,
  FoldState,
  PresetMode,
  PaperColor,
  EASING_FUNCTIONS,
  PRESET_MODES
} from './types.js';

export class OrigamiEngine {
  private scene: THREE.Scene;
  private world: CANNON.World;
  private paperMesh!: THREE.Mesh;
  private paperGeometry!: THREE.BufferGeometry;
  private paperBody!: CANNON.Body;
  private creaseLines: CreaseLine[] = [];
  private creaseMeshes: THREE.Group = new THREE.Group();
  private originalPositions: Float32Array | null = null;
  private currentAngles: Map<string, number> = new Map();
  private animationState: {
    isPlaying: boolean;
    startTime: number;
    duration: number;
    startAngles: Map<string, number>;
    targetAngles: Map<string, number>;
    onComplete?: () => void;
  } | null = null;
  private foldSteps: FoldStep[] = [];
  private currentMode: string | null = null;
  private paperSize: number = 2;
  private paperSegments: number = 32;
  private paperThickness: number = 0.02;
  private paperColor: PaperColor = '#fef9e7';
  private selectionMarker: THREE.Mesh | null = null;
  private highlightMaterial: THREE.MeshBasicMaterial | null = null;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;
    this.scene.add(this.creaseMeshes);
  }

  createPaper(size: number = 2, segments: number = 32): void {
    this.paperSize = size;
    this.paperSegments = segments;

    this.paperGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const posAttr = this.paperGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.originalPositions = new Float32Array(posAttr.array as Float32Array);

    const material = this.createPaperMaterial();
    this.paperMesh = new THREE.Mesh(this.paperGeometry, material);
    this.paperMesh.rotation.x = -Math.PI / 2;
    this.paperMesh.receiveShadow = true;
    this.paperMesh.castShadow = true;
    this.scene.add(this.paperMesh);

    this.createPhysicsBody();
    this.createSelectionMarker();
  }

  private createPaperMaterial(): THREE.Material {
    if (this.paperColor === 'rainbow') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(0.2, '#feca57');
      gradient.addColorStop(0.4, '#48dbfb');
      gradient.addColorStop(0.6, '#ff9ff3');
      gradient.addColorStop(0.8, '#54a0ff');
      gradient.addColorStop(1, '#5f27cd');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1
      });
    } else if (this.paperColor === 'texture') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f5f0e1';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = `rgba(139, 119, 101, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.05
      });
    } else {
      return new THREE.MeshStandardMaterial({
        color: this.paperColor as string,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1
      });
    }
  }

  private createPhysicsBody(): void {
    const halfSize = this.paperSize / 2;
    const shape = new CANNON.Box(new CANNON.Vec3(halfSize, this.paperThickness, halfSize));
    this.paperBody = new CANNON.Body({
      mass: 0,
      shape,
      position: new CANNON.Vec3(0, 0, 0)
    });
    this.world.addBody(this.paperBody);
  }

  private createSelectionMarker(): void {
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    this.highlightMaterial = new THREE.MeshBasicMaterial({ color: '#f1c40f' });
    this.selectionMarker = new THREE.Mesh(geometry, this.highlightMaterial);
    this.selectionMarker.visible = false;
    this.scene.add(this.selectionMarker);
  }

  setPaperColor(color: PaperColor): void {
    this.paperColor = color;
    if (this.paperMesh) {
      const oldMaterial = this.paperMesh.material as THREE.Material;
      this.paperMesh.material = this.createPaperMaterial();
      oldMaterial.dispose();
    }
  }

  getPaperColor(): PaperColor {
    return this.paperColor;
  }

  applyPresetMode(modeId: string): void {
    const mode = PRESET_MODES.find(m => m.id === modeId);
    if (!mode) return;

    this.currentMode = modeId;
    this.creaseLines = JSON.parse(JSON.stringify(mode.creaseLines));
    this.currentAngles.clear();
    this.foldSteps = [];
    
    this.creaseLines.forEach(line => {
      this.currentAngles.set(line.id, 0);
    });

    this.renderCreaseLines();
    this.resetPaper();
  }

  getCurrentMode(): string | null {
    return this.currentMode;
  }

  getPresetModes(): PresetMode[] {
    return PRESET_MODES;
  }

  private renderCreaseLines(): void {
    while (this.creaseMeshes.children.length > 0) {
      const child = this.creaseMeshes.children[0]!;
      this.creaseMeshes.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    this.creaseLines.forEach(line => {
      const start = new THREE.Vector3(line.start[0], 0.01, line.start[1]);
      const end = new THREE.Vector3(line.end[0], 0.01, line.end[1]);
      
      const dashSize = line.type === 'mountain' ? 0.1 : 0.06;
      const gapSize = line.type === 'mountain' ? 0.05 : 0.06;
      const points = this.createDashedLinePoints(start, end, dashSize, gapSize);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const color = line.type === 'mountain' ? '#e74c3c' : '#3498db';
      const lineWidth = line.type === 'mountain' ? 3 : 2;
      const material = new THREE.LineBasicMaterial({ 
        color,
        linewidth: lineWidth,
        transparent: true,
        opacity: 0.95
      });
      
      const lineMesh = new THREE.LineSegments(geometry, material);
      lineMesh.userData.creaseId = line.id;
      lineMesh.userData.creaseType = line.type;
      this.creaseMeshes.add(lineMesh);
    });
  }

  private createDashedLinePoints(
    start: THREE.Vector3,
    end: THREE.Vector3,
    dashSize: number,
    gapSize: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const distance = start.distanceTo(end);
    const direction = end.clone().sub(start).normalize();
    const segmentSize = dashSize + gapSize;
    const dashCount = Math.floor(distance / segmentSize);

    for (let i = 0; i < dashCount; i++) {
      const dashStart = start.clone().add(
        direction.clone().multiplyScalar(i * segmentSize)
      );
      const dashEnd = start.clone().add(
        direction.clone().multiplyScalar(i * segmentSize + dashSize)
      );
      points.push(dashStart, dashEnd);
    }

    const remaining = distance - dashCount * segmentSize;
    if (remaining > dashSize * 0.5) {
      const lastStart = start.clone().add(
        direction.clone().multiplyScalar(dashCount * segmentSize)
      );
      const lastEnd = start.clone().add(
        direction.clone().multiplyScalar(Math.min(dashCount * segmentSize + dashSize, distance))
      );
      points.push(lastStart, lastEnd);
    }

    return points;
  }

  async foldPaper(creaseLineId: string, targetAngle: number, duration: number = 500): Promise<void> {
    if (this.animationState?.isPlaying) {
      this.animationState.isPlaying = false;
    }

    const startAngles = new Map(this.currentAngles);
    const targetAngles = new Map(this.currentAngles);
    targetAngles.set(creaseLineId, targetAngle);

    const existingStep = this.foldSteps.find(s => s.creaseLineId === creaseLineId);
    if (existingStep) {
      existingStep.targetAngle = targetAngle;
      existingStep.currentAngle = targetAngle;
      existingStep.timestamp = Date.now();
    } else {
      this.foldSteps.push({
        creaseLineId,
        targetAngle,
        currentAngle: targetAngle,
        timestamp: Date.now()
      });
    }

    return new Promise(resolve => {
      this.animationState = {
        isPlaying: true,
        startTime: performance.now(),
        duration,
        startAngles,
        targetAngles,
        onComplete: resolve
      };
    });
  }

  async unfoldPaper(duration: number = 2000): Promise<void> {
    if (this.animationState?.isPlaying) {
      this.animationState.isPlaying = false;
    }

    const startAngles = new Map(this.currentAngles);
    const targetAngles = new Map<string, number>();
    this.creaseLines.forEach(line => {
      targetAngles.set(line.id, 0);
    });

    return new Promise(resolve => {
      this.animationState = {
        isPlaying: true,
        startTime: performance.now(),
        duration,
        startAngles,
        targetAngles,
        onComplete: () => {
          this.foldSteps = [];
          resolve();
        }
      };
    });
  }

  update(deltaTime: number): void {
    if (this.animationState?.isPlaying) {
      const now = performance.now();
      const elapsed = now - this.animationState.startTime;
      const progress = Math.min(elapsed / this.animationState.duration, 1);
      const easedProgress = EASING_FUNCTIONS.easeInOutCubic(progress);

      this.animationState.targetAngles.forEach((targetAngle, creaseId) => {
        const startAngle = this.animationState!.startAngles.get(creaseId) || 0;
        const currentAngle = startAngle + (targetAngle - startAngle) * easedProgress;
        this.currentAngles.set(creaseId, currentAngle);
      });

      this.updatePaperFold();

      const creaseOpacity = 1 - easedProgress * 0.5;
      this.creaseMeshes.children.forEach(child => {
        if (child instanceof THREE.Line) {
          (child.material as THREE.LineBasicMaterial).opacity = 0.9 * creaseOpacity;
        }
      });

      if (progress >= 1) {
        this.animationState.isPlaying = false;
        if (this.animationState.onComplete) {
          this.animationState.onComplete();
        }
        this.animationState = null;
      }
    }

    this.updatePhysicsBody();
  }

  private getPositionArray(): Float32Array {
    const posAttr = this.paperGeometry.getAttribute('position') as THREE.BufferAttribute;
    return posAttr.array as Float32Array;
  }

  private setPositionNeedsUpdate(): void {
    const posAttr = this.paperGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }

  private updatePaperFold(): void {
    if (!this.paperGeometry || !this.originalPositions) return;

    const positions = this.getPositionArray();
    positions.set(this.originalPositions);

    this.creaseLines.forEach(line => {
      const angle = this.currentAngles.get(line.id) || 0;
      if (angle !== 0) {
        this.applyFoldToVertices(positions, line, angle);
      }
    });

    this.applyLayerThickness(positions);
    this.setPositionNeedsUpdate();
    this.paperGeometry.computeVertexNormals();

    this.updateCreaseLinePositions();
  }

  private applyFoldToVertices(positions: Float32Array, creaseLine: CreaseLine, angleDeg: number): void {
    const angleRad = (angleDeg * Math.PI) / 180;
    const direction = creaseLine.type === 'mountain' ? 1 : -1;

    const p1 = new THREE.Vector3(creaseLine.start[0], 0, creaseLine.start[1]);
    const p2 = new THREE.Vector3(creaseLine.end[0], 0, creaseLine.end[1]);
    const lineDir = p2.clone().sub(p1).normalize();
    const lineNormal = new THREE.Vector3(-lineDir.z, 0, lineDir.x).normalize();

    const vertexCount = positions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      const x = positions[i3]!;
      const y = positions[i3 + 1]!;
      const z = positions[i3 + 2]!;
      const point = new THREE.Vector3(x, y, z);

      const toPoint = point.clone().sub(p1);
      const side = toPoint.dot(lineNormal);

      if (side * direction > 0.001) {
        const projOnLine = p1.clone().add(
          lineDir.clone().multiplyScalar(toPoint.dot(lineDir))
        );
        const perpVec = point.clone().sub(projOnLine);
        const perpLen = perpVec.length();

        const rotationAxis = lineDir.clone();
        const foldAngle = angleRad * direction;
        
        const quaternion = new THREE.Quaternion().setFromAxisAngle(
          rotationAxis,
          foldAngle
        );

        const foldedVec = perpVec.clone().applyQuaternion(quaternion);
        const newPos = projOnLine.clone().add(foldedVec);

        positions[i3] = newPos.x;
        positions[i3 + 1] = newPos.y;
        positions[i3 + 2] = newPos.z;
      }
    }
  }

  private applyLayerThickness(positions: Float32Array): void {
    const vertexCount = positions.length / 3;
    const layerOrder = this.calculateLayerOrder();

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      const layerIndex = this.getVertexLayer(i, layerOrder);
      positions[i3 + 1] += layerIndex * this.paperThickness;
    }
  }

  private calculateLayerOrder(): string[] {
    const foldedLines = this.creaseLines.filter(
      line => Math.abs(this.currentAngles.get(line.id) || 0) > 1
    );
    return foldedLines.map(l => l.id);
  }

  private getVertexLayer(vertexIndex: number, layerOrder: string[]): number {
    let layer = 0;
    const pos = this.originalPositions!;
    const x = pos[vertexIndex * 3]!;
    const z = pos[vertexIndex * 3 + 2]!;

    layerOrder.forEach(creaseId => {
      const line = this.creaseLines.find(l => l.id === creaseId);
      if (line) {
        const p1 = new THREE.Vector2(line.start[0], line.start[1]);
        const p2 = new THREE.Vector2(line.end[0], line.end[1]);
        const point = new THREE.Vector2(x, z);

        const lineDir = p2.clone().sub(p1).normalize();
        const perp = new THREE.Vector2(-lineDir.y, lineDir.x);
        const toPoint = point.clone().sub(p1);
        const side = toPoint.dot(perp);

        const angle = this.currentAngles.get(creaseId) || 0;
        const direction = line.type === 'mountain' ? 1 : -1;

        if (side * direction * angle > 0) {
          layer++;
        }
      }
    });

    return layer;
  }

  private updateCreaseLinePositions(): void {
    const positions = this.getPositionArray();

    this.creaseMeshes.children.forEach((child, index) => {
      if (child instanceof THREE.Line) {
        const line = this.creaseLines[index];
        if (line) {
          const geoPosAttr = child.geometry.getAttribute('position') as THREE.BufferAttribute;
          const geoPositions = geoPosAttr.array as Float32Array;
          const newPositions = this.calculateFoldedCreaseLine(line, positions);
          const len = Math.min(newPositions.length, geoPositions.length);
          for (let i = 0; i < len; i++) {
            geoPositions[i] = newPositions[i]!;
          }
          geoPosAttr.needsUpdate = true;
        }
      }
    });
  }

  private calculateFoldedCreaseLine(creaseLine: CreaseLine, positions: Float32Array): number[] {
    const result: number[] = [];
    const dashCount = 10;
    const dashGap = 0.08;

    const start = new THREE.Vector3(creaseLine.start[0], 0, creaseLine.start[1]);
    const end = new THREE.Vector3(creaseLine.end[0], 0, creaseLine.end[1]);
    const lineDir = end.clone().sub(start).normalize();
    const length = start.distanceTo(end);

    for (let i = 0; i < dashCount; i++) {
      const t1 = (i * 2 * dashGap) / length;
      const t2 = ((i * 2 + 1) * dashGap) / length;
      
      if (t2 <= 1) {
        const p1 = start.clone().add(lineDir.clone().multiplyScalar(t1 * length));
        const p2 = start.clone().add(lineDir.clone().multiplyScalar(t2 * length));
        
        const foldedP1 = this.getFoldedPoint(p1, positions);
        const foldedP2 = this.getFoldedPoint(p2, positions);
        
        result.push(foldedP1.x, foldedP1.y + 0.01, foldedP1.z);
        result.push(foldedP2.x, foldedP2.y + 0.01, foldedP2.z);
      }
    }

    return result;
  }

  private getFoldedPoint(point: THREE.Vector3, positions: Float32Array): THREE.Vector3 {
    const halfSize = this.paperSize / 2;
    const segments = this.paperSegments;
    const u = (point.x + halfSize) / this.paperSize;
    const v = (point.z + halfSize) / this.paperSize;

    const col = Math.floor(u * segments);
    const row = Math.floor(v * segments);

    const i = Math.min(Math.max(row * (segments + 1) + col, 0), (segments + 1) * (segments + 1) - 1);
    const i3 = i * 3;

    return new THREE.Vector3(
      positions[i3] || 0,
      positions[i3 + 1] || 0,
      positions[i3 + 2] || 0
    );
  }

  private updatePhysicsBody(): void {
    if (!this.paperBody || !this.paperMesh) return;

    this.paperBody.position.set(
      this.paperMesh.position.x,
      this.paperMesh.position.y,
      this.paperMesh.position.z
    );
    this.paperBody.quaternion.copy(this.paperMesh.quaternion as any);
  }

  resetPaper(): void {
    if (this.animationState?.isPlaying) {
      this.animationState.isPlaying = false;
    }
    this.currentAngles.clear();
    this.creaseLines.forEach(line => {
      this.currentAngles.set(line.id, 0);
    });
    this.foldSteps = [];
    this.updatePaperFold();
    
    this.creaseMeshes.children.forEach(child => {
      if (child instanceof THREE.Line) {
        (child.material as THREE.LineBasicMaterial).opacity = 0.9;
      }
    });
  }

  getCurrentState(): FoldState {
    return {
      currentStep: this.foldSteps.length,
      totalSteps: this.creaseLines.length,
      angles: new Map(this.currentAngles),
      isAnimating: this.animationState?.isPlaying || false
    };
  }

  getCreasePattern(): CreasePattern {
    const vertices: [number, number][] = [];
    if (this.originalPositions) {
      const pos = this.originalPositions;
      for (let i = 0; i < pos.length; i += 3) {
        vertices.push([pos[i]!, pos[i + 2]!]);
      }
    }

    return {
      lines: JSON.parse(JSON.stringify(this.creaseLines)),
      vertices
    };
  }

  getFoldSteps(): FoldStep[] {
    return [...this.foldSteps];
  }

  getCreaseAngle(creaseLineId: string): number {
    return this.currentAngles.get(creaseLineId) || 0;
  }

  getFirstCreaseLineId(): string | null {
    return this.creaseLines[0]?.id || null;
  }

  getCreaseLines(): CreaseLine[] {
    return [...this.creaseLines];
  }

  getPaperMesh(): THREE.Mesh {
    return this.paperMesh;
  }

  selectVertex(vertexIndex: number): void {
    if (!this.selectionMarker || !this.paperGeometry) return;

    const positions = this.getPositionArray();
    const i3 = vertexIndex * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];

    if (x !== undefined && y !== undefined && z !== undefined) {
      this.selectionMarker.position.set(x, y + 0.05, z);
      this.selectionMarker.visible = true;
    }
  }

  clearSelection(): void {
    if (this.selectionMarker) {
      this.selectionMarker.visible = false;
    }
  }

  exportStepImage(width: number, height: number, stepNumber: number): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#2c3e50');
      gradient.addColorStop(1, '#1a252f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.3;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-Math.PI / 6);

      const positions = this.paperGeometry.attributes.position.array as Float32Array;
      const segments = this.paperSegments;
      const faces: { vertices: [number, number, number]; depth: number }[] = [];

      for (let row = 0; row < segments; row++) {
        for (let col = 0; col < segments; col++) {
          const i1 = row * (segments + 1) + col;
          const i2 = row * (segments + 1) + col + 1;
          const i3 = (row + 1) * (segments + 1) + col;
          const i4 = (row + 1) * (segments + 1) + col + 1;

          faces.push({
            vertices: [i1, i2, i3],
            depth: (positions[i1 * 3 + 1]! + positions[i2 * 3 + 1]! + positions[i3 * 3 + 1]!) / 3
          });
          faces.push({
            vertices: [i2, i4, i3],
            depth: (positions[i2 * 3 + 1]! + positions[i4 * 3 + 1]! + positions[i3 * 3 + 1]!) / 3
          });
        }
      }

      faces.sort((a, b) => a.depth - b.depth);

      const colorStr = typeof this.paperColor === 'string' && this.paperColor.startsWith('#')
        ? this.paperColor
        : '#fef9e7';

      faces.forEach(face => {
        const [i1, i2, i3] = face.vertices;
        ctx.beginPath();
        ctx.moveTo(positions[i1 * 3]! * scale, -positions[i1 * 3 + 2]! * scale);
        ctx.lineTo(positions[i2 * 3]! * scale, -positions[i2 * 3 + 2]! * scale);
        ctx.lineTo(positions[i3 * 3]! * scale, -positions[i3 * 3 + 2]! * scale);
        ctx.closePath();

        const shade = 0.7 + face.depth * 0.3;
        ctx.fillStyle = this.adjustBrightness(colorStr, shade);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      this.creaseLines.forEach(line => {
        const angle = this.currentAngles.get(line.id) || 0;
        if (Math.abs(angle) > 1) {
          ctx.beginPath();
          const startX = line.start[0] * scale;
          const startY = -line.start[1] * scale;
          const endX = line.end[0] * scale;
          const endY = -line.end[1] * scale;

          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          const foldOffset = Math.sin(angle * Math.PI / 180) * scale * 0.3;

          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(midX, midY - foldOffset, endX, endY);
          
          ctx.strokeStyle = line.type === 'mountain' ? '#e74c3c' : '#3498db';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`步骤 ${stepNumber}`, 40, 60);

      ctx.font = '20px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`UnfoldOrigami`, 40, height - 40);

      const legendY = 80;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(40, legendY, 20, 3);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px -apple-system, sans-serif';
      ctx.fillText('山折', 70, legendY + 6);

      ctx.fillStyle = '#3498db';
      ctx.fillRect(140, legendY, 20, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('谷折', 170, legendY + 6);

      resolve(canvas.toDataURL('image/png'));
    });
  }

  private adjustBrightness(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const newR = Math.min(255, Math.floor(r * factor));
    const newG = Math.min(255, Math.floor(g * factor));
    const newB = Math.min(255, Math.floor(b * factor));

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  exportCreasePatternSVG(): string {
    const size = 500;
    const padding = 40;
    const paperSize = this.paperSize;
    const scale = (size - padding * 2) / paperSize;

    const svgContent: string[] = [];
    svgContent.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    svgContent.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`);
    
    svgContent.push(`<rect x="${padding - 5}" y="${padding - 5}" width="${size - (padding - 5) * 2}" height="${size - (padding - 5) * 2}" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>`);

    const toSvgX = (x: number) => padding + (x + paperSize / 2) * scale;
    const toSvgY = (y: number) => padding + (y + paperSize / 2) * scale;

    this.creaseLines.forEach(line => {
      const x1 = toSvgX(line.start[0]);
      const y1 = toSvgY(line.start[1]);
      const x2 = toSvgX(line.end[0]);
      const y2 = toSvgY(line.end[1]);

      const color = line.type === 'mountain' ? '#e74c3c' : '#3498db';
      const dashArray = line.type === 'mountain' ? '10,5' : '5,5';

      svgContent.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="2" stroke-dasharray="${dashArray}"/>`);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const angle = this.currentAngles.get(line.id) || 0;
      const angleRad = Math.atan2(y2 - y1, x2 - x1);
      const labelX = midX + Math.sin(angleRad) * 15;
      const labelY = midY - Math.cos(angleRad) * 15;

      svgContent.push(`<text x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" font-size="12" fill="${color}" text-anchor="middle" dominant-baseline="middle">${angle.toFixed(0)}°</text>`);
    });

    svgContent.push(`<rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" fill="none" stroke="#333333" stroke-width="2"/>`);

    svgContent.push(`<text x="${size / 2}" y="${size - 15}" font-size="14" fill="#666666" text-anchor="middle">Crease Pattern - UnfoldOrigami</text>`);

    const legendY = 20;
    svgContent.push(`<line x1="${padding}" y1="${legendY}" x2="${padding + 30}" y2="${legendY}" stroke="#e74c3c" stroke-width="2" stroke-dasharray="10,5"/>`);
    svgContent.push(`<text x="${padding + 38}" y="${legendY + 4}" font-size="12" fill="#e74c3c">山折</text>`);
    
    svgContent.push(`<line x1="${padding + 100}" y1="${legendY}" x2="${padding + 130}" y2="${legendY}" stroke="#3498db" stroke-width="2" stroke-dasharray="5,5"/>`);
    svgContent.push(`<text x="${padding + 138}" y="${legendY + 4}" font-size="12" fill="#3498db">谷折</text>`);

    svgContent.push(`</svg>`);

    return svgContent.join('\n');
  }

  dispose(): void {
    if (this.paperGeometry) {
      this.paperGeometry.dispose();
    }
    if (this.paperMesh) {
      (this.paperMesh.material as THREE.Material).dispose();
      this.scene.remove(this.paperMesh);
    }
    if (this.paperBody) {
      this.world.removeBody(this.paperBody);
    }
    if (this.selectionMarker) {
      this.scene.remove(this.selectionMarker);
      this.selectionMarker.geometry.dispose();
      this.highlightMaterial?.dispose();
    }
    
    while (this.creaseMeshes.children.length > 0) {
      const child = this.creaseMeshes.children[0]!;
      this.creaseMeshes.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }
}
