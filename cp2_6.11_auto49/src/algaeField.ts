import * as THREE from 'three';
import { AudioFeatures } from './audioManager';
import { RippleEffect, RippleImpact } from './rippleEffect';

interface Algae {
  id: number;
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  baseHeight: number;
  targetHeight: number;
  currentHeight: number;
  baseBendOffset: THREE.Vector2;
  currentBend: THREE.Vector2;
  targetBend: THREE.Vector2;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  baseOpacity: number;
  currentOpacity: number;
  targetOpacity: number;
  bendCurve: THREE.CatmullRomCurve3;
  controlPoints: THREE.Vector3[];
  growthBoostTime: number;
  growthBoostFactor: number;
  clickAnimTime: number;
  clickAnimActive: boolean;
  phaseOffset: number;
  segmentCount: number;
}

interface ClickAnimation {
  algae: Algae;
  startTime: number;
  duration: number;
  peakHeight: number;
}

export class AlgaeField {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private rippleEffect: RippleEffect;
  private algae: Algae[] = [];
  private clickAnimations: ClickAnimation[] = [];
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private audioFeatures: AudioFeatures = {
    volume: 0,
    lowFrequency: 0,
    midFrequency: 0,
    highFrequency: 0,
    spectralCentroid: 0.5,
    energy: 0
  };
  private readonly ALGAE_MIN = 20;
  private readonly ALGAE_MAX = 50;
  private readonly HEIGHT_MIN = 50;
  private readonly HEIGHT_MAX = 300;
  private readonly FIELD_RADIUS = 250;
  private readonly UPDATES_PER_FRAME = 50;
  private updateCursor: number = 0;
  private time: number = 0;

  private readonly COLOR_WARM = new THREE.Color(0xFF6B6B);
  private readonly COLOR_MID = new THREE.Color(0x4ECDC4);
  private readonly COLOR_COOL = new THREE.Color(0x6BCB77);
  private readonly COLOR_PURPLE = new THREE.Color(0x9B59B6);

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    rippleEffect: RippleEffect
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.rippleEffect = rippleEffect;

    this.createField();
    this.setupEventListeners();
  }

  private createField(): void {
    const count = Math.floor(Math.random() * (this.ALGAE_MAX - this.ALGAE_MIN + 1)) + this.ALGAE_MIN;

    for (let i = 0; i < count; i++) {
      const algae = this.createAlgae(i);
      this.algae.push(algae);
    }
  }

  private createAlgae(id: number): Algae {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.FIELD_RADIUS;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const basePosition = new THREE.Vector3(x, 0, z);

    const baseHeight = this.HEIGHT_MIN + Math.random() * (this.HEIGHT_MAX - this.HEIGHT_MIN);

    const colorT = Math.random();
    let baseColor: THREE.Color;
    if (colorT < 0.33) {
      baseColor = this.COLOR_WARM.clone().lerp(this.COLOR_MID, colorT * 3);
    } else if (colorT < 0.66) {
      baseColor = this.COLOR_MID.clone().lerp(this.COLOR_COOL, (colorT - 0.33) * 3);
    } else {
      baseColor = this.COLOR_COOL.clone().lerp(this.COLOR_PURPLE, (colorT - 0.66) * 3);
    }

    const baseOpacity = 0.6 + Math.random() * 0.4;

    const segmentCount = 8 + Math.floor(Math.random() * 4);
    const controlPoints = this.generateControlPoints(basePosition, baseHeight, segmentCount);
    const bendCurve = new THREE.CatmullRomCurve3(controlPoints);

    const geometry = this.createAlgaeGeometry(bendCurve, segmentCount);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      transparent: true,
      opacity: baseOpacity,
      emissive: baseColor,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.6,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(basePosition);
    mesh.userData = { algaeId: id };
    this.scene.add(mesh);

    const baseBendOffset = new THREE.Vector2(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 30
    );

    return {
      id,
      mesh,
      basePosition: basePosition.clone(),
      baseHeight,
      targetHeight: baseHeight,
      currentHeight: baseHeight,
      baseBendOffset,
      currentBend: new THREE.Vector2(0, 0),
      targetBend: new THREE.Vector2(0, 0),
      baseColor,
      currentColor: baseColor.clone(),
      targetColor: baseColor.clone(),
      baseOpacity,
      currentOpacity: baseOpacity,
      targetOpacity: baseOpacity,
      bendCurve,
      controlPoints,
      growthBoostTime: 0,
      growthBoostFactor: 1,
      clickAnimTime: 0,
      clickAnimActive: false,
      phaseOffset: Math.random() * Math.PI * 2,
      segmentCount
    };
  }

  private generateControlPoints(base: THREE.Vector3, height: number, _segments: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const numControlPoints = 5;

    for (let i = 0; i < numControlPoints; i++) {
      const t = i / (numControlPoints - 1);
      const y = t * height;
      const bendAmount = t * t * 20;
      const bendAngle = (i / numControlPoints) * Math.PI * 2 + base.x * 0.01;

      const x = Math.cos(bendAngle) * bendAmount + (Math.random() - 0.5) * 10;
      const z = Math.sin(bendAngle) * bendAmount + (Math.random() - 0.5) * 10;

      points.push(new THREE.Vector3(base.x + x, y, base.z + z));
    }

    return points;
  }

  private createAlgaeGeometry(curve: THREE.CatmullRomCurve3, segments: number): THREE.BufferGeometry {
    const tubularSegments = segments * 3;
    const radialSegments = 6;
    const bottomRadius = 3;
    const topRadius = 1;

    const points: THREE.Vector3[] = curve.getPoints(tubularSegments);
    const vertexCount = (tubularSegments + 1) * (radialSegments + 1);
    const indexCount = tubularSegments * radialSegments * 6;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(indexCount);

    let vertexIndex = 0;
    let uvIndex = 0;

    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const radius = bottomRadius + (topRadius - bottomRadius) * t * t;

      const P = points[i];
      const T: THREE.Vector3 = i < tubularSegments
        ? new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize()
        : new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();

      const N: THREE.Vector3 = Math.abs(T.y) < 0.9
        ? new THREE.Vector3().crossVectors(T, new THREE.Vector3(0, 1, 0)).normalize()
        : new THREE.Vector3().crossVectors(T, new THREE.Vector3(1, 0, 0)).normalize();
      const B: THREE.Vector3 = new THREE.Vector3().crossVectors(T, N).normalize();

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);

        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;

        positions[vertexIndex] = P.x + radius * nx;
        positions[vertexIndex + 1] = P.y + radius * ny;
        positions[vertexIndex + 2] = P.z + radius * nz;

        normals[vertexIndex] = nx;
        normals[vertexIndex + 1] = ny;
        normals[vertexIndex + 2] = nz;

        uvs[uvIndex] = t;
        uvs[uvIndex + 1] = j / radialSegments;

        vertexIndex += 3;
        uvIndex += 2;
      }
    }

    let indexPos = 0;
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + 1;
        const c = a + radialSegments + 1;
        const d = c + 1;

        indices[indexPos] = a;
        indices[indexPos + 1] = c;
        indices[indexPos + 2] = b;

        indices[indexPos + 3] = b;
        indices[indexPos + 4] = c;
        indices[indexPos + 5] = d;

        indexPos += 6;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    return geometry;
  }

  private updateAlgaeGeometry(algae: Algae): void {
    const height = algae.currentHeight;

    for (let i = 0; i < algae.controlPoints.length; i++) {
      const t = i / (algae.controlPoints.length - 1);
      algae.controlPoints[i].y = t * height;

      const bendT = t * t;
      const totalBendX = algae.currentBend.x + algae.baseBendOffset.x;
      const totalBendZ = algae.currentBend.y + algae.baseBendOffset.y;

      algae.controlPoints[i].x = algae.basePosition.x + totalBendX * bendT +
        Math.sin(this.time * 0.002 + algae.phaseOffset + t * 2) * 5 * t;
      algae.controlPoints[i].z = algae.basePosition.z + totalBendZ * bendT +
        Math.cos(this.time * 0.0015 + algae.phaseOffset + t * 2) * 5 * t;
    }

    algae.bendCurve.points = algae.controlPoints;

    const tubularSegments = algae.segmentCount * 3;
    const radialSegments = 6;
    const bottomRadius = 3;
    const topRadius = 1;

    const points = algae.bendCurve.getPoints(tubularSegments);
    const geometry = algae.mesh.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const normals = normalAttr.array as Float32Array;

    let vertexIndex = 0;

    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const radius = bottomRadius + (topRadius - bottomRadius) * t * t;

      const P = points[i];
      const T: THREE.Vector3 = i < tubularSegments
        ? new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize()
        : new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();

      const N: THREE.Vector3 = Math.abs(T.y) < 0.9
        ? new THREE.Vector3().crossVectors(T, new THREE.Vector3(0, 1, 0)).normalize()
        : new THREE.Vector3().crossVectors(T, new THREE.Vector3(1, 0, 0)).normalize();
      const B: THREE.Vector3 = new THREE.Vector3().crossVectors(T, N).normalize();

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);

        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;

        positions[vertexIndex] = P.x + radius * nx;
        positions[vertexIndex + 1] = P.y + radius * ny;
        positions[vertexIndex + 2] = P.z + radius * nz;

        normals[vertexIndex] = nx;
        normals[vertexIndex + 1] = ny;
        normals[vertexIndex + 2] = nz;

        vertexIndex += 3;
      }
    }

    positionAttr.needsUpdate = true;
    normalAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (event: PointerEvent) => {
      if (event.button !== 0) return;

      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);

      const meshes = this.algae.map(a => a.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const algaeId = hitMesh.userData.algaeId as number;
        const algae = this.algae.find(a => a.id === algaeId);
        if (algae) {
          this.handleAlgaeClick(algae);
        }
      } else {
        const worldPoint = new THREE.Vector3();
        this.raycaster.ray.at(
          (200 - this.raycaster.ray.origin.y) / this.raycaster.ray.direction.y,
          worldPoint
        );
        if (isFinite(worldPoint.x) && isFinite(worldPoint.z)) {
          this.handleGroundClick(worldPoint);
        }
      }
    });
  }

  private handleAlgaeClick(algae: Algae): void {
    algae.clickAnimActive = true;
    algae.clickAnimTime = performance.now();

    this.clickAnimations.push({
      algae,
      startTime: performance.now(),
      duration: 1500,
      peakHeight: 400
    });

    this.rippleEffect.trigger(algae.basePosition, algae.currentColor);
  }

  private handleGroundClick(position: THREE.Vector3): void {
    const randomColor = new THREE.Color().setHSL(
      0.3 + Math.random() * 0.3,
      0.8,
      0.5
    );
    this.rippleEffect.trigger(position, randomColor);
  }

  updateAudioFeatures(features: AudioFeatures): void {
    this.audioFeatures = { ...features };
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    const rippleImpacts = this.rippleEffect.update();

    this.updateClickAnimations();
    this.processRippleImpacts(rippleImpacts);
    this.calculateTargets();
    this.updateAlgaeBatch(deltaTime);
  }

  private updateClickAnimations(): void {
    const now = performance.now();
    const activeAnims: ClickAnimation[] = [];

    for (const anim of this.clickAnimations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (progress >= 1) {
        anim.algae.clickAnimActive = false;
        continue;
      }

      activeAnims.push(anim);

      let phase: number;
      if (progress < 0.2) {
        phase = progress / 0.2;
        anim.algae.currentHeight = anim.algae.baseHeight * (1 - phase * 0.95);
      } else if (progress < 0.5) {
        phase = (progress - 0.2) / 0.3;
        const eased = 1 - Math.pow(1 - phase, 3);
        anim.algae.currentHeight = 10 + (anim.peakHeight - 10) * eased;
      } else {
        phase = (progress - 0.5) / 0.5;
        const eased = 1 - Math.pow(1 - phase, 2);
        const effectiveBase = anim.algae.baseHeight * anim.algae.growthBoostFactor;
        anim.algae.currentHeight = anim.peakHeight + (effectiveBase - anim.peakHeight) * eased;
      }
    }

    this.clickAnimations = activeAnims;
  }

  private processRippleImpacts(impacts: RippleImpact[]): void {
    const now = performance.now();

    for (const algae of this.algae) {
      for (const impact of impacts) {
        const dx = algae.basePosition.x - impact.center.x;
        const dz = algae.basePosition.z - impact.center.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist >= impact.innerRadius && dist <= impact.outerRadius) {
          algae.growthBoostTime = now;
          algae.growthBoostFactor = 1.5;

          const blendT = 1 - impact.progress;
          algae.targetColor.lerpColors(algae.baseColor, impact.color, blendT * 0.7);
        }
      }
    }
  }

  private calculateTargets(): void {
    const af = this.audioFeatures;
    const volumeBoost = 1 + af.volume * 0.5;

    for (let i = 0; i < this.algae.length; i++) {
      const algae = this.algae[i];

      if (algae.clickAnimActive) continue;

      const algaeFreqPhase = (i / this.algae.length) * Math.PI * 2;

      const freqResponse =
        af.lowFrequency * 0.4 +
        af.midFrequency * Math.sin(algaeFreqPhase + Math.PI / 3) * 0.3 +
        af.highFrequency * Math.cos(algaeFreqPhase) * 0.3;

      const heightVariation = 50 + freqResponse * 200;
      const effectiveBase = algae.baseHeight * algae.growthBoostFactor;
      algae.targetHeight = Math.min(
        this.HEIGHT_MAX * 1.5,
        effectiveBase * (0.7 + heightVariation * 0.01) * volumeBoost
      );

      algae.targetBend.x = (af.lowFrequency - 0.3) * 50 + Math.sin(algaeFreqPhase) * 20;
      algae.targetBend.y = (af.midFrequency - 0.3) * 50 + Math.cos(algaeFreqPhase) * 20;

      const brightness = 0.1 + af.volume * 0.9;
      const colorShift = af.spectralCentroid;

      let targetColor: THREE.Color;
      if (colorShift < 0.33) {
        targetColor = this.COLOR_WARM.clone().lerp(this.COLOR_MID, colorShift * 3);
      } else if (colorShift < 0.66) {
        targetColor = this.COLOR_MID.clone().lerp(this.COLOR_COOL, (colorShift - 0.33) * 3);
      } else {
        targetColor = this.COLOR_COOL.clone().lerp(this.COLOR_PURPLE, (colorShift - 0.66) * 3);
      }

      algae.targetColor.lerp(targetColor, 0.6);
      algae.targetColor.multiplyScalar(0.7 + brightness * 0.8);
      algae.targetColor.r = Math.min(Math.max(algae.targetColor.r, 0), 1);
      algae.targetColor.g = Math.min(Math.max(algae.targetColor.g, 0), 1);
      algae.targetColor.b = Math.min(Math.max(algae.targetColor.b, 0), 1);

      algae.targetOpacity = algae.baseOpacity * (0.7 + brightness * 0.6);
    }
  }

  private updateAlgaeBatch(deltaTime: number): void {
    const now = performance.now();
    const totalCount = this.algae.length;
    const startIdx = this.updateCursor % totalCount;
    const endIdx = Math.min(startIdx + this.UPDATES_PER_FRAME, totalCount);

    for (let i = startIdx; i < endIdx; i++) {
      const algae = this.algae[i];
      this.interpolateAlgae(algae, deltaTime, now);
      this.updateAlgaeGeometry(algae);
      this.applyMaterial(algae);
    }

    if (endIdx < startIdx + this.UPDATES_PER_FRAME) {
      const wrapCount = (startIdx + this.UPDATES_PER_FRAME) - totalCount;
      for (let i = 0; i < Math.min(wrapCount, totalCount); i++) {
        const algae = this.algae[i];
        this.interpolateAlgae(algae, deltaTime, now);
        this.updateAlgaeGeometry(algae);
        this.applyMaterial(algae);
      }
    }

    this.updateCursor = (startIdx + this.UPDATES_PER_FRAME) % totalCount;

    for (let i = 0; i < totalCount; i++) {
      const algae = this.algae[i];
      if (algae.growthBoostFactor > 1 && now - algae.growthBoostTime > 2000) {
        algae.growthBoostFactor = Math.max(1, algae.growthBoostFactor - deltaTime * 0.001);
      }
    }
  }

  private interpolateAlgae(algae: Algae, deltaTime: number, now: number): void {
    const lerpSpeed = Math.min(deltaTime * 0.008, 0.3);

    if (!algae.clickAnimActive) {
      algae.currentHeight += (algae.targetHeight - algae.currentHeight) * lerpSpeed;
    }

    algae.currentBend.x += (algae.targetBend.x - algae.currentBend.x) * lerpSpeed;
    algae.currentBend.y += (algae.targetBend.y - algae.currentBend.y) * lerpSpeed;

    algae.currentColor.lerp(algae.targetColor, lerpSpeed);
    algae.currentOpacity += (algae.targetOpacity - algae.currentOpacity) * lerpSpeed;

    algae.currentHeight += Math.sin(now * 0.001 + algae.phaseOffset) * 0.5;
  }

  private applyMaterial(algae: Algae): void {
    const material = algae.mesh.material as THREE.MeshStandardMaterial;
    material.color.copy(algae.currentColor);
    material.emissive.copy(algae.currentColor);
    material.emissiveIntensity = 0.2 + algae.currentOpacity * 0.5;
    material.opacity = algae.currentOpacity;
    material.needsUpdate = true;
  }

  getAlgaeCount(): number {
    return this.algae.length;
  }

  destroy(): void {
    for (const algae of this.algae) {
      this.scene.remove(algae.mesh);
      algae.mesh.geometry.dispose();
      const material = algae.mesh.material as THREE.Material;
      material.dispose();
    }
    this.algae = [];
    this.clickAnimations = [];
  }
}
