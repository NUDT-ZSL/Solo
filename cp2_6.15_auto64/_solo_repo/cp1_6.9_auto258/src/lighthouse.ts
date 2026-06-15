import * as THREE from 'three';

export interface LighthouseLayer {
  mesh: THREE.Object3D;
  rotationSpeed: number;
  baseScale: number;
  pulsePhase: number;
  material: THREE.MeshBasicMaterial;
}

export class Lighthouse {
  public group: THREE.Group;
  public layers: LighthouseLayer[] = [];
  public lightBeam!: THREE.Mesh;
  public lightBeamMaterial!: THREE.MeshBasicMaterial;
  public lightBeamGlow!: THREE.Mesh;
  public lightBeamGlowMaterial!: THREE.MeshBasicMaterial;
  public beamDirection: THREE.Vector3 = new THREE.Vector3();
  public beamAngle = Math.PI / 12;
  public beamOpenAngle = Math.PI / 3;
  public beamRotationSpeed = THREE.MathUtils.degToRad(30);
  public beamRotation = 0;
  public baseBeamSpeed = THREE.MathUtils.degToRad(30);
  public beamSpeedBoost = 1;
  public beamSpeedBoostTimer = 0;
  public flashIntensity = 1;
  public flashDecay = 0;
  public bottomHalo!: THREE.Mesh;
  public layerCount: number;
  public onFlash: (() => void) | null = null;

  private topPosition: THREE.Vector3;

  constructor(layerCount = 4) {
    this.layerCount = layerCount;
    this.group = new THREE.Group();
    this.topPosition = new THREE.Vector3();

    this.createLayers();
    this.createLightBeam();
    this.createBottomHalo();
  }

  private createLayers() {
    for (let i = 0; i < this.layerCount; i++) {
      const t = i / Math.max(1, this.layerCount - 1);
      const radius = THREE.MathUtils.lerp(0.5, 2.5, 1 - t);
      const hue = THREE.MathUtils.lerp(200 / 360, 30 / 360, t);
      const speed = THREE.MathUtils.lerp(0.8, 0.2, t) * (i % 2 === 0 ? 1 : -1);
      const y = (this.layerCount / 2 - i) * 1.2;

      let geometry: THREE.BufferGeometry;
      if (i % 2 === 0) {
        geometry = new THREE.TorusGeometry(radius, 0.08, 16, 100);
      } else {
        const points: THREE.Vector3[] = [];
        const segments = 6;
        for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ));
        }
        geometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points, true),
          80, 0.08, 8, true
        );
      }

      const color = new THREE.Color().setHSL(hue, 0.85, 0.55);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      mesh.rotation.x = Math.PI / 2 + (i * 0.15);
      this.group.add(mesh);

      this.layers.push({
        mesh,
        rotationSpeed: speed,
        baseScale: 1,
        pulsePhase: Math.random() * Math.PI * 2,
        material
      });
    }

    const topLayer = this.layers[0];
    this.topPosition.copy(topLayer.mesh.position);
    this.topPosition.y += 0.8;
  }

  private createLightBeam() {
    const length = 12;
    const angle = this.beamOpenAngle;
    const bottomRadius = Math.tan(angle / 2) * length;

    const geometry = new THREE.ConeGeometry(bottomRadius, length, 48, 1, true);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, length / 2);

    this.lightBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.lightBeam = new THREE.Mesh(geometry, this.lightBeamMaterial);
    this.lightBeam.position.copy(this.topPosition);
    this.group.add(this.lightBeam);

    const glowGeometry = new THREE.ConeGeometry(bottomRadius * 1.25, length, 48, 1, true);
    glowGeometry.rotateX(-Math.PI / 2);
    glowGeometry.translate(0, 0, length / 2);

    this.lightBeamGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.lightBeamGlow = new THREE.Mesh(glowGeometry, this.lightBeamGlowMaterial);
    this.lightBeamGlow.position.copy(this.topPosition);
    this.group.add(this.lightBeamGlow);
  }

  private createBottomHalo() {
    const geometry = new THREE.RingGeometry(0.5, 3.0, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.bottomHalo = new THREE.Mesh(geometry, material);
    this.bottomHalo.rotation.x = -Math.PI / 2;
    this.bottomHalo.position.y = -(this.layerCount / 2) * 1.2 - 0.2;
    this.group.add(this.bottomHalo);
  }

  public update(delta: number, elapsed: number) {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      layer.mesh.rotation.y += layer.rotationSpeed * delta;

      const pulse = Math.sin(elapsed * 2 + layer.pulsePhase) * 0.02;
      const scale = 1 + pulse;
      layer.mesh.scale.setScalar(scale * this.flashIntensity);

      const mult = this.flashIntensity;
      layer.material.opacity = 0.85 * Math.min(1, mult);
    }

    if (this.flashDecay > 0) {
      this.flashDecay -= delta;
      this.flashIntensity = 1 + Math.max(0, this.flashDecay / 0.5);
    } else {
      this.flashIntensity = 1;
    }

    if (this.beamSpeedBoostTimer > 0) {
      this.beamSpeedBoostTimer -= delta;
      const t = Math.max(0, this.beamSpeedBoostTimer / 2);
      this.beamRotationSpeed = this.baseBeamSpeed * (1 + 0.2 * t);
    } else {
      this.beamRotationSpeed = this.baseBeamSpeed;
    }

    this.beamRotation += this.beamRotationSpeed * delta;

    this.lightBeam.rotation.set(this.beamAngle, this.beamRotation, 0);
    this.lightBeamGlow.rotation.copy(this.lightBeam.rotation);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.lightBeam.quaternion);
    this.beamDirection.copy(forward).normalize();
  }

  public triggerFlash() {
    this.flashDecay = 0.5;
    this.flashIntensity = 2;
    this.beamSpeedBoostTimer = 2;
    this.beamSpeedBoost = 1.2;
    if (this.onFlash) this.onFlash();
  }

  public getTopWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.lightBeam.getWorldPosition(pos);
    return pos;
  }

  public getBeamWorldMatrix(): THREE.Matrix4 {
    return this.lightBeam.matrixWorld;
  }
}
