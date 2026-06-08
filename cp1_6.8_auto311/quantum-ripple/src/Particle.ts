import * as THREE from 'three';

export enum ParticleState {
  SPAWNING,
  ALIVE,
  DYING,
  DEAD,
}

export class Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  state: ParticleState;
  spiralAngle: number;
  spiralRadius: number;
  spiralSpeed: number;
  spiralAxis: THREE.Vector3;
  inbound: boolean;
  baseRadius: number;
  trailPositions: THREE.Vector3[];
  trailMaxLength: number;

  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.color = new THREE.Color();
    this.life = 0;
    this.maxLife = 1;
    this.state = ParticleState.DEAD;
    this.spiralAngle = 0;
    this.spiralRadius = 0;
    this.spiralSpeed = 0;
    this.spiralAxis = new THREE.Vector3(0, 1, 0);
    this.inbound = true;
    this.baseRadius = 0;
    this.trailPositions = [];
    this.trailMaxLength = 20;
  }

  spawn(
    origin: THREE.Vector3,
    inbound: boolean,
    baseRadius: number,
    colorHue: number,
  ): void {
    this.state = ParticleState.SPAWNING;
    this.life = 0;
    this.maxLife = 3 + Math.random() * 4;
    this.inbound = inbound;
    this.baseRadius = baseRadius;

    const hue = colorHue;
    this.color.setHSL(hue, 0.8, 0.6);

    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);

    this.spiralAngle = phi;
    this.spiralRadius = baseRadius;
    this.spiralSpeed = (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1);

    this.spiralAxis.set(
      Math.sin(theta) * Math.cos(phi + Math.PI / 2),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi + Math.PI / 2),
    ).normalize();

    const startRadius = inbound ? baseRadius * (1.5 + Math.random()) : 0.5;
    const endRadius = inbound ? 0.5 : baseRadius * (1.5 + Math.random());

    const startAngle = phi + (inbound ? 0 : Math.PI);
    this.position.copy(origin).add(
      new THREE.Vector3(
        Math.sin(theta) * Math.cos(startAngle) * startRadius,
        Math.cos(theta) * startRadius * 0.3,
        Math.sin(theta) * Math.sin(startAngle) * startRadius,
      ),
    );

    this.velocity.set(0, 0, 0);
    this.trailPositions = [];
  }

  update(delta: number, origin: THREE.Vector3, showTrails: boolean): void {
    if (this.state === ParticleState.DEAD) return;

    this.life += delta;
    const t = this.life / this.maxLife;

    if (t >= 1) {
      this.state = ParticleState.DEAD;
      return;
    }

    if (t < 0.1) {
      this.state = ParticleState.SPAWNING;
    } else if (t > 0.85) {
      this.state = ParticleState.DYING;
    } else {
      this.state = ParticleState.ALIVE;
    }

    this.spiralAngle += this.spiralSpeed * delta;

    const spiralT = t;
    const radius = this.inbound
      ? THREE.MathUtils.lerp(this.baseRadius * 1.8, 0.3, spiralT)
      : THREE.MathUtils.lerp(0.3, this.baseRadius * 1.8, spiralT);

    const verticalOffset = Math.sin(spiralT * Math.PI * 2) * 0.5;

    const cosA = Math.cos(this.spiralAngle);
    const sinA = Math.sin(this.spiralAngle);

    const perpendicular = new THREE.Vector3();
    if (Math.abs(this.spiralAxis.y) < 0.99) {
      perpendicular.crossVectors(this.spiralAxis, new THREE.Vector3(0, 1, 0)).normalize();
    } else {
      perpendicular.crossVectors(this.spiralAxis, new THREE.Vector3(1, 0, 0)).normalize();
    }
    const secondPerp = new THREE.Vector3().crossVectors(this.spiralAxis, perpendicular).normalize();

    this.position.copy(origin).addScaledVector(perpendicular, cosA * radius);
    this.position.addScaledVector(secondPerp, sinA * radius);
    this.position.addScaledVector(this.spiralAxis, verticalOffset);

    if (showTrails) {
      this.trailPositions.push(this.position.clone());
      if (this.trailPositions.length > this.trailMaxLength) {
        this.trailPositions.shift();
      }
    } else {
      if (this.trailPositions.length > 0) {
        this.trailPositions.shift();
      }
    }
  }

  getOpacity(): number {
    const t = this.life / this.maxLife;
    if (t < 0.1) return t / 0.1;
    if (t > 0.85) return (1 - t) / 0.15;
    return 1;
  }

  getSize(): number {
    const t = this.life / this.maxLife;
    if (t < 0.1) return 0.5 + (t / 0.1) * 0.5;
    if (t > 0.85) return 0.5 + ((1 - t) / 0.15) * 0.5;
    return 1;
  }

  isDead(): boolean {
    return this.state === ParticleState.DEAD;
  }
}
