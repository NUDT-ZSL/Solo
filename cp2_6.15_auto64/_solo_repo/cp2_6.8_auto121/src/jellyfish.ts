import * as THREE from 'three';

export interface JellyfishParams {
  position: THREE.Vector3;
  diameter: number;
  color: THREE.Color;
  colorName: string;
}

const COLOR_NAMES: Record<string, string> = {
  '#E2E8F0': '半透明白',
  '#B794F4': '淡紫',
  '#FC8181': '浅粉',
  '#63B3ED': '水蓝',
  '#68D391': '淡青'
};

export class Jellyfish {
  public mesh: THREE.Group;
  public cap: THREE.Mesh;
  public capMaterial: THREE.MeshPhysicalMaterial;
  public tentacles: THREE.Mesh[] = [];
  public edgeParticles: THREE.Points;
  public color: THREE.Color;
  public colorName: string;
  public baseDiameter: number;
  public currentDiameter: number;
  public currentSpeed: number = 0;

  private position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private targetDirection: THREE.Vector3 = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    0,
    (Math.random() - 0.5) * 2
  ).normalize();

  private verticalFreq: number;
  private verticalAmp: number;
  private verticalPhase: number;
  private baseY: number;

  private breathFreq: number;
  private breathPhase: number;
  private breathAmp: number = 1;

  private tentacleCount: number;
  private tentacleLength: number;
  private tentacleCurves: { curve: THREE.CatmullRomCurve3; points: THREE.Vector3[]; phase: number }[] = [];

  private turnTimer: number = 0;
  private turnInterval: number;

  private highlightIntensity: number = 0;
  private highlightTarget: number = 0;

  private globalSpeedMultiplier: number = 1;
  private globalBreathMultiplier: number = 1;

  private lastPosition: THREE.Vector3;

  constructor(params: JellyfishParams) {
    this.position = params.position.clone();
    this.baseY = params.position.y;
    this.color = params.color.clone();
    this.colorName = COLOR_NAMES['#' + this.color.getHexString().toUpperCase()] || '未知';
    this.baseDiameter = params.diameter;
    this.currentDiameter = params.diameter;
    this.lastPosition = params.position.clone();

    this.verticalFreq = 0.3 + Math.random() * 0.3;
    this.verticalAmp = 5 + Math.random() * 10;
    this.verticalPhase = Math.random() * Math.PI * 2;

    this.breathFreq = 0.8 + Math.random() * 0.4;
    this.breathPhase = Math.random() * Math.PI * 2;

    this.tentacleCount = 6 + Math.floor(Math.random() * 3);
    this.tentacleLength = this.baseDiameter * 1.2;

    this.turnInterval = 5 + Math.random() * 3;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.capMaterial = this.createCapMaterial();
    this.cap = this.createCap();
    this.mesh.add(this.cap);

    this.edgeParticles = this.createEdgeParticles();
    this.mesh.add(this.edgeParticles);

    this.createTentacles();
  }

  private createCapMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.2,
      side: THREE.DoubleSide,
      emissive: this.color.clone().multiplyScalar(0.15),
      emissiveIntensity: 0.5
    });
  }

  private createCap(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(
      this.baseDiameter / 2,
      32,
      24,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2.2
    );
    const mesh = new THREE.Mesh(geometry, this.capMaterial);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  private createEdgeParticles(): THREE.Points {
    const particleCount = 25;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const r = this.baseDiameter / 2;
    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const phi = Math.PI / 2.3 + (Math.random() - 0.5) * 0.15;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      colors[i * 3] = this.color.r;
      colors[i * 3 + 1] = this.color.g;
      colors[i * 3 + 2] = this.color.b;

      sizes[i] = 0.5 + Math.random() * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      emissive: this.color,
      emissiveIntensity: 1.0
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  private createTentacles(): void {
    const r = this.baseDiameter / 2 * 0.7;
    for (let i = 0; i < this.tentacleCount; i++) {
      const theta = (i / this.tentacleCount) * Math.PI * 2 + Math.random() * 0.2;
      const anchor = new THREE.Vector3(
        r * Math.cos(theta),
        -this.baseDiameter / 2 * 0.25,
        r * Math.sin(theta)
      );

      const segments = 12;
      const points: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const t = s / (segments - 1);
        points.push(new THREE.Vector3(
          anchor.x + (Math.random() - 0.5) * 2,
          anchor.y - t * this.tentacleLength,
          anchor.z + (Math.random() - 0.5) * 2
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      this.tentacleCurves.push({
        curve,
        points,
        phase: Math.random() * Math.PI * 2
      });

      const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.25, 6, false);
      const tubeMaterial = new THREE.MeshPhysicalMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.5,
        roughness: 0.2,
        transmission: 0.7,
        thickness: 0.2,
        emissive: this.color.clone().multiplyScalar(0.1),
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
      });

      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      this.tentacles.push(tube);
      this.mesh.add(tube);
    }
  }

  public setGlobalSpeed(mult: number): void {
    this.globalSpeedMultiplier = mult;
  }

  public setGlobalBreath(mult: number): void {
    this.globalBreathMultiplier = mult;
  }

  public triggerHighlight(): void {
    this.highlightTarget = 1;
  }

  public getClickableObjects(): THREE.Object3D[] {
    return [this.cap, this.edgeParticles, ...this.tentacles];
  }

  public update(deltaTime: number, elapsedTime: number, allJellyfish: Jellyfish[]): void {
    this.turnTimer += deltaTime;
    if (this.turnTimer >= this.turnInterval) {
      this.turnTimer = 0;
      this.turnInterval = 5 + Math.random() * 3;
      this.targetDirection.set(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ).normalize();
    }

    let separation = new THREE.Vector3();
    for (const other of allJellyfish) {
      if (other === this) continue;
      const dist = this.position.distanceTo(other.position);
      const minDist = (this.baseDiameter + other.baseDiameter) * 0.8;
      if (dist < minDist && dist > 0.01) {
        const away = new THREE.Vector3().subVectors(this.position, other.position);
        away.normalize().multiplyScalar((minDist - dist) / minDist);
        separation.add(away);
      }
    }
    separation.clampLength(0, 1);

    const moveDir = new THREE.Vector3().copy(this.targetDirection);
    moveDir.add(separation.multiplyScalar(0.8));
    moveDir.y = 0;
    if (moveDir.length() > 0.01) moveDir.normalize();

    const baseSpeed = 3;
    const speed = baseSpeed * this.globalSpeedMultiplier;
    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    const verticalOffset = Math.sin(elapsedTime * this.verticalFreq + this.verticalPhase) * this.verticalAmp;

    this.lastPosition.copy(this.position);
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    this.position.y = this.baseY + verticalOffset;

    const dx = this.position.x - this.lastPosition.x;
    const dz = this.position.z - this.lastPosition.z;
    const dy = this.position.y - this.lastPosition.y;
    this.currentSpeed = Math.sqrt(dx * dx + dy * dy + dz * dz) / Math.max(deltaTime, 0.001);

    const boundary = 60;
    if (this.position.x > boundary) { this.position.x = boundary; this.targetDirection.x *= -1; }
    if (this.position.x < -boundary) { this.position.x = -boundary; this.targetDirection.x *= -1; }
    if (this.position.z > boundary) { this.position.z = boundary; this.targetDirection.z *= -1; }
    if (this.position.z < -boundary) { this.position.z = -boundary; this.targetDirection.z *= -1; }

    const breathValue = Math.sin(elapsedTime * this.breathFreq + this.breathPhase);
    const breathScale = 1 + breathValue * 0.15 * this.globalBreathMultiplier;
    const verticalScale = 1 - breathValue * 0.2 * this.globalBreathMultiplier;
    this.currentDiameter = this.baseDiameter * breathScale;

    this.cap.scale.set(breathScale, verticalScale, breathScale);
    this.edgeParticles.scale.set(breathScale, verticalScale, breathScale);

    this.highlightIntensity += (this.highlightTarget - this.highlightIntensity) * deltaTime * 2;
    if (this.highlightTarget > 0.01) {
      this.highlightTarget = Math.max(0, this.highlightTarget - deltaTime / 1.5);
    }
    const emissiveMult = 1 + this.highlightIntensity * 1;
    this.capMaterial.emissiveIntensity = (0.5 + this.highlightIntensity * 1.5);
    this.capMaterial.emissive.copy(this.color).multiplyScalar(0.15 * emissiveMult);

    const yawAngle = Math.atan2(moveDir.x, moveDir.z);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = yawAngle * 0.3;

    this.updateTentacles(deltaTime, elapsedTime);
    this.updateEdgeParticles(elapsedTime);
  }

  private updateTentacles(deltaTime: number, elapsedTime: number): void {
    const moveFactor = Math.min(1, this.currentSpeed * 0.1);
    for (let i = 0; i < this.tentacleCurves.length; i++) {
      const { curve, points, phase } = this.tentacleCurves[i];
      const anchor = points[0];
      const segments = points.length;

      for (let s = 1; s < segments; s++) {
        const t = s / (segments - 1);
        const swayAmp = t * t * (this.baseDiameter * 0.3);
        const swayX = Math.sin(elapsedTime * 1.5 + phase + s * 0.3) * swayAmp;
        const swayZ = Math.cos(elapsedTime * 1.3 + phase + s * 0.5) * swayAmp;

        const dragX = -this.velocity.x * t * 0.15 * moveFactor;
        const dragZ = -this.velocity.z * t * 0.15 * moveFactor;

        points[s].x = anchor.x + swayX + dragX;
        points[s].z = anchor.z + swayZ + dragZ;
      }

      curve.updateArcLengths();

      const tubeGeo = this.tentacles[i].geometry as THREE.TubeGeometry;
      tubeGeo.dispose();
      this.tentacles[i].geometry = new THREE.TubeGeometry(curve, segments, 0.25, 6, false);
    }
  }

  private updateEdgeParticles(elapsedTime: number): void {
    const material = this.edgeParticles.material as THREE.PointsMaterial;
    material.opacity = 0.7 + Math.sin(elapsedTime * 2) * 0.2;
  }

  public dispose(): void {
    this.cap.geometry.dispose();
    this.capMaterial.dispose();
    this.edgeParticles.geometry.dispose();
    (this.edgeParticles.material as THREE.Material).dispose();
    for (const tentacle of this.tentacles) {
      tentacle.geometry.dispose();
      (tentacle.material as THREE.Material).dispose();
    }
  }
}
