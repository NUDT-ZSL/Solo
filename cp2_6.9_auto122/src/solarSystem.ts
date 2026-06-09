import * as THREE from 'three';

export interface PlanetConfig {
  name: string;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  ascendingNode: number;
  colorStart: string;
  colorEnd: string;
  planetRadius: number;
  planetColor: number;
}

export const PLANET_CONFIGS: PlanetConfig[] = [
  {
    name: '水星',
    semiMajorAxis: 6.5,
    eccentricity: 0.206,
    inclination: 0.12,
    ascendingNode: 0.0,
    colorStart: '#FF6B6B',
    colorEnd: '#FFA94D',
    planetRadius: 0.35,
    planetColor: 0xFF8C42
  },
  {
    name: '金星',
    semiMajorAxis: 9.0,
    eccentricity: 0.007,
    inclination: 0.06,
    ascendingNode: 1.2,
    colorStart: '#FFA94D',
    colorEnd: '#FFD93D',
    planetRadius: 0.45,
    planetColor: 0xFFD700
  },
  {
    name: '地球',
    semiMajorAxis: 11.5,
    eccentricity: 0.017,
    inclination: 0.03,
    ascendingNode: 2.5,
    colorStart: '#4ECDC4',
    colorEnd: '#45B7D1',
    planetRadius: 0.5,
    planetColor: 0x4A90D9
  },
  {
    name: '火星',
    semiMajorAxis: 14.0,
    eccentricity: 0.093,
    inclination: 0.09,
    ascendingNode: 3.8,
    colorStart: '#45B7D1',
    colorEnd: '#96CEB4',
    planetRadius: 0.4,
    planetColor: 0xCD5C5C
  }
];

const TRAIL_POINT_COUNT = 200;

export class Sun {
  public mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private rotationSpeed = 0.01;
  private time = 0;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xFFAA00,
      transparent: true,
      opacity: 0.95
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(0, 0, 0);

    const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(glow);

    scene.add(this.mesh);
    this.createFireTexture();
  }

  private createFireTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    (this.material as THREE.MeshBasicMaterial).map = texture;
    (this.material as THREE.MeshBasicMaterial).color.setHex(0xFFFFFF);
    (this.material as any)._canvas = canvas;
    (this.material as any)._ctx = ctx;
    (this.material as any)._texture = texture;
  }

  private updateFireTexture(dt: number): void {
    const mat = this.material as any;
    if (!mat._canvas) return;
    const canvas = mat._canvas as HTMLCanvasElement;
    const ctx = mat._ctx as CanvasRenderingContext2D;
    const texture = mat._texture as THREE.CanvasTexture;

    this.time += dt;
    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    grad.addColorStop(0, '#FFEE88');
    grad.addColorStop(0.3, '#FFAA22');
    grad.addColorStop(0.7, '#FF6600');
    grad.addColorStop(1, '#CC2200');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(this.time * 0.5 + i * 1.7) * 0.5 + 0.5) * w;
      const y = (Math.cos(this.time * 0.4 + i * 2.3) * 0.5 + 0.5) * h;
      const r = 10 + Math.sin(this.time + i) * 6;
      const flameGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
      flameGrad.addColorStop(0, 'rgba(255,230,150,0.8)');
      flameGrad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    texture.needsUpdate = true;
  }

  public update(dt: number): void {
    this.mesh.rotation.y += this.rotationSpeed;
    this.updateFireTexture(dt);
  }
}

export class Planet {
  public config: PlanetConfig;
  public mesh: THREE.Mesh;
  public orbitLine: THREE.Line;
  public trail: THREE.Line;
  public trueAnomaly: number = 0;
  public precessionAngle: number = 0;
  public precessionRate: number = 0;
  public orbitalPeriod: number;
  public baseSemiMajorAxis: number;
  public currentSemiMajorAxis: number;
  public isPerturbed: boolean = false;
  private trailPoints: THREE.Vector3[] = [];
  private trailGeometry: THREE.BufferGeometry;
  private orbitGeometry: THREE.BufferGeometry;
  private baseOrbitPoints: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene, config: PlanetConfig) {
    this.config = config;
    this.baseSemiMajorAxis = config.semiMajorAxis;
    this.currentSemiMajorAxis = config.semiMajorAxis;

    const geometry = new THREE.SphereGeometry(config.planetRadius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: config.planetColor,
      roughness: 0.8,
      metalness: 0.1,
      emissive: config.planetColor,
      emissiveIntensity: 0.15
    });
    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);

    this.orbitGeometry = new THREE.BufferGeometry();
    this.orbitLine = new THREE.Line(
      this.orbitGeometry,
      new THREE.LineBasicMaterial({
        color: 0x444466,
        transparent: true,
        opacity: 0.4
      })
    );
    scene.add(this.orbitLine);

    this.trailGeometry = new THREE.BufferGeometry();
    const colorStart = new THREE.Color(config.colorStart);
    const colorEnd = new THREE.Color(config.colorEnd);
    const colors = new Float32Array(TRAIL_POINT_COUNT * 3);
    for (let i = 0; i < TRAIL_POINT_COUNT; i++) {
      const t = i / (TRAIL_POINT_COUNT - 1);
      const c = colorStart.clone().lerp(colorEnd, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trail = new THREE.Line(
      this.trailGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    scene.add(this.trail);

    for (let i = 0; i < TRAIL_POINT_COUNT; i++) {
      this.trailPoints.push(new THREE.Vector3());
    }
    const positions = new Float32Array(TRAIL_POINT_COUNT * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.orbitalPeriod = Math.pow(config.semiMajorAxis, 1.5);
    this.trueAnomaly = Math.random() * Math.PI * 2;
    this.updateOrbitLine();
  }

  public getOrbitalRadius(): number {
    const e = this.config.eccentricity;
    const a = this.currentSemiMajorAxis;
    const nu = this.trueAnomaly;
    return a * (1 - e * e) / (1 + e * Math.cos(nu));
  }

  public getPosition(): THREE.Vector3 {
    const r = this.getOrbitalRadius();
    const i = this.config.inclination;
    const omega = this.config.ascendingNode + this.precessionAngle;
    const nu = this.trueAnomaly;

    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    const x = xOrb * Math.cos(omega) - yOrb * Math.cos(i) * Math.sin(omega);
    const y = yOrb * Math.sin(i);
    const z = xOrb * Math.sin(omega) + yOrb * Math.cos(i) * Math.cos(omega);

    return new THREE.Vector3(x, y, z);
  }

  private updateOrbitLine(): void {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const nu = (i / segments) * Math.PI * 2;
      const e = this.config.eccentricity;
      const a = this.currentSemiMajorAxis;
      const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
      const inc = this.config.inclination;
      const omega = this.config.ascendingNode + this.precessionAngle;

      const xOrb = r * Math.cos(nu);
      const yOrb = r * Math.sin(nu);

      const x = xOrb * Math.cos(omega) - yOrb * Math.cos(inc) * Math.sin(omega);
      const y = yOrb * Math.sin(inc);
      const z = xOrb * Math.sin(omega) + yOrb * Math.cos(inc) * Math.cos(omega);

      points.push(new THREE.Vector3(x, y, z));
    }
    this.orbitGeometry.setFromPoints(points);
    this.orbitGeometry.computeBoundingSphere();
  }

  public update(dt: number, speedMultiplier: number, gravityWellPos: THREE.Vector3 | null, gravityWellMass: number): void {
    const baseOmega = (2 * Math.PI) / this.orbitalPeriod;
    let omega = baseOmega * speedMultiplier;

    this.isPerturbed = false;
    this.precessionRate = 0;
    this.currentSemiMajorAxis = this.baseSemiMajorAxis;

    if (gravityWellPos) {
      const pos = this.getPosition();
      const dist = pos.distanceTo(gravityWellPos);
      const influenceRadius = this.baseSemiMajorAxis * 2;

      if (dist < influenceRadius) {
        this.isPerturbed = true;
        const strength = (1 - dist / influenceRadius) * gravityWellMass * 0.002;
        this.precessionRate = strength;
        omega = baseOmega * speedMultiplier * (1 + strength * 3);
        this.currentSemiMajorAxis = this.baseSemiMajorAxis * 0.95;
      }
    }

    this.precessionAngle += this.precessionRate * dt * 60;
    this.precessionAngle = this.precessionAngle % (Math.PI * 2);
    if (this.precessionAngle < 0) this.precessionAngle += Math.PI * 2;

    this.trueAnomaly += omega * dt;
    this.trueAnomaly = this.trueAnomaly % (Math.PI * 2);
    if (this.trueAnomaly < 0) this.trueAnomaly += Math.PI * 2;

    const pos = this.getPosition();
    this.mesh.position.copy(pos);

    this.updateTrail(pos);
    this.updateOrbitLine();
  }

  private updateTrail(pos: THREE.Vector3): void {
    for (let i = this.trailPoints.length - 1; i > 0; i--) {
      this.trailPoints[i].copy(this.trailPoints[i - 1]);
    }
    this.trailPoints[0].copy(pos);

    const positions = this.trailGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.trailPoints.length; i++) {
      positions[i * 3] = this.trailPoints[i].x;
      positions[i * 3 + 1] = this.trailPoints[i].y;
      positions[i * 3 + 2] = this.trailPoints[i].z;
    }
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.computeBoundingSphere();
  }

  public clearTrail(): void {
    const pos = this.getPosition();
    for (let i = 0; i < this.trailPoints.length; i++) {
      this.trailPoints[i].copy(pos);
    }
    const positions = this.trailGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.trailPoints.length; i++) {
      positions[i * 3] = this.trailPoints[i].x;
      positions[i * 3 + 1] = this.trailPoints[i].y;
      positions[i * 3 + 2] = this.trailPoints[i].z;
    }
    this.trailGeometry.attributes.position.needsUpdate = true;
  }

  public resetOrbit(): void {
    this.precessionAngle = 0;
    this.trueAnomaly = Math.random() * Math.PI * 2;
    this.currentSemiMajorAxis = this.baseSemiMajorAxis;
    this.clearTrail();
  }

  public getPrecessionDegrees(): number {
    return (this.precessionAngle * 180) / Math.PI;
  }
}

export class SolarSystem {
  public sun: Sun;
  public planets: Planet[] = [];
  public scene: THREE.Scene;
  public simTime: number = 0;
  public speedMultiplier: number = 1;
  private stars: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sun = new Sun(scene);
    this.createStars();

    for (const config of PLANET_CONFIGS) {
      this.planets.push(new Planet(scene, config));
    }
  }

  private createStars(): void {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 100;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.2 + Math.random() * 1.0;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    });

    this.stars = new THREE.Points(geometry, material);
    (this.stars as any)._time = 0;
    this.scene.add(this.stars);
  }

  public update(dt: number, gravityWellPos: THREE.Vector3 | null, gravityWellMass: number): void {
    this.sun.update(dt);
    this.simTime += dt * this.speedMultiplier * 0.02;

    for (const planet of this.planets) {
      planet.update(dt, this.speedMultiplier, gravityWellPos, gravityWellMass);
    }

    (this.stars as any)._time += dt;
    const t = (this.stars as any)._time;
    const phases = this.stars.geometry.attributes.phase.array as Float32Array;
    const mat = this.stars.material as THREE.PointsMaterial;
    mat.opacity = 0.7 + Math.sin(t * 0.4) * 0.2;
  }

  public clearAllTrails(): void {
    for (const planet of this.planets) {
      planet.clearTrail();
    }
  }

  public resetAllOrbits(): void {
    this.simTime = 0;
    for (const planet of this.planets) {
      planet.resetOrbit();
    }
  }

  public isAnyPerturbed(): boolean {
    return this.planets.some(p => p.isPerturbed);
  }
}
