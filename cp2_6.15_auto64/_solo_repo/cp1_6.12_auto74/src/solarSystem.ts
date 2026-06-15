import * as THREE from 'three';

export interface PlanetData {
  name: string;
  nameCN: string;
  color: number;
  emissiveColor: number;
  radius: number;
  realRadius: string;
  orbitRadiusAU: number;
  orbitRadiusVisual: number;
  orbitPeriodYears: number;
  rotationSpeed: number;
  tilt: number;
  description: string;
  moonCount: number;
  moons: MoonData[];
  hasRing?: boolean;
}

export interface MoonData {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: number;
}

const BASE_ANGULAR_VELOCITY = 0.8;

function computeOrbitSpeed(orbitRadiusAU: number): number {
  return BASE_ANGULAR_VELOCITY / Math.pow(orbitRadiusAU, 1.5);
}

export const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury', nameCN: '水星', color: 0x8c7e6d, emissiveColor: 0x3a3530,
    radius: 0.5, realRadius: '2,440 km', orbitRadiusAU: 0.387, orbitRadiusVisual: 10,
    orbitPeriodYears: 0.24, rotationSpeed: 0.005, tilt: 0.03,
    description: '水星是太阳系中最小、最靠近太阳的行星，表面温差极大，白天可达430°C，夜间降至-180°C。没有大气层保护，布满陨石坑。',
    moonCount: 0, moons: []
  },
  {
    name: 'Venus', nameCN: '金星', color: 0xe8c56d, emissiveColor: 0x5a4a25,
    radius: 0.9, realRadius: '6,052 km', orbitRadiusAU: 0.723, orbitRadiusVisual: 16,
    orbitPeriodYears: 0.62, rotationSpeed: -0.002, tilt: 3.1,
    description: '金星是太阳系中最热的行星，浓密的二氧化碳大气产生极强的温室效应，表面温度高达465°C。逆向自转，一天比一年还长。',
    moonCount: 0, moons: []
  },
  {
    name: 'Earth', nameCN: '地球', color: 0x4a90d9, emissiveColor: 0x1a3050,
    radius: 1.0, realRadius: '6,371 km', orbitRadiusAU: 1.0, orbitRadiusVisual: 22,
    orbitPeriodYears: 1.0, rotationSpeed: 0.02, tilt: 0.41,
    description: '地球是目前已知唯一存在生命的行星，拥有液态水海洋和氮氧大气层。强大的磁场保护生命免受太阳风侵袭。',
    moonCount: 1,
    moons: [
      { name: 'Moon', radius: 0.27, orbitRadius: 2.5, orbitSpeed: 1.2, color: 0xcccccc }
    ]
  },
  {
    name: 'Mars', nameCN: '火星', color: 0xc1440e, emissiveColor: 0x4a1a06,
    radius: 0.7, realRadius: '3,390 km', orbitRadiusAU: 1.524, orbitRadiusVisual: 30,
    orbitPeriodYears: 1.88, rotationSpeed: 0.019, tilt: 0.44,
    description: '火星因表面氧化铁呈红色，拥有太阳系最高的火山奥林匹斯山和最长的峡谷水手号峡谷。稀薄的大气主要是二氧化碳。',
    moonCount: 2, moons: []
  },
  {
    name: 'Jupiter', nameCN: '木星', color: 0xc88b3a, emissiveColor: 0x4a3515,
    radius: 2.8, realRadius: '69,911 km', orbitRadiusAU: 5.203, orbitRadiusVisual: 44,
    orbitPeriodYears: 11.86, rotationSpeed: 0.04, tilt: 0.05,
    description: '木星是太阳系最大的行星，质量是其他行星总和的2.5倍。大红斑是持续数百年的巨型风暴，直径超过地球。拥有强大的磁场。',
    moonCount: 95,
    moons: [
      { name: 'Io', radius: 0.22, orbitRadius: 4.5, orbitSpeed: 1.8, color: 0xeedd44 },
      { name: 'Europa', radius: 0.2, orbitRadius: 5.5, orbitSpeed: 1.3, color: 0xbbaa88 },
      { name: 'Ganymede', radius: 0.28, orbitRadius: 7.0, orbitSpeed: 0.85, color: 0x998877 },
      { name: 'Callisto', radius: 0.25, orbitRadius: 8.5, orbitSpeed: 0.55, color: 0x776655 }
    ]
  },
  {
    name: 'Saturn', nameCN: '土星', color: 0xd4b86a, emissiveColor: 0x4a4025,
    radius: 2.3, realRadius: '58,232 km', orbitRadiusAU: 9.537, orbitRadiusVisual: 58,
    orbitPeriodYears: 29.46, rotationSpeed: 0.038, tilt: 0.47,
    hasRing: true,
    description: '土星以壮观的环系统闻名，环主要由冰粒和岩石碎片组成。密度低于水，是太阳系唯一能"漂浮"的行星。风速可达1800km/h。',
    moonCount: 146, moons: []
  },
  {
    name: 'Uranus', nameCN: '天王星', color: 0x72b5c4, emissiveColor: 0x2a4550,
    radius: 1.6, realRadius: '25,362 km', orbitRadiusAU: 19.19, orbitRadiusVisual: 72,
    orbitPeriodYears: 84.01, rotationSpeed: -0.03, tilt: 1.71,
    description: '天王星的自转轴几乎平行于公转轨道面，像是"躺着"公转。蓝绿色来自大气中的甲烷吸收红光。拥有暗淡的环系统。',
    moonCount: 27, moons: []
  },
  {
    name: 'Neptune', nameCN: '海王星', color: 0x3355bb, emissiveColor: 0x152050,
    radius: 1.5, realRadius: '24,622 km', orbitRadiusAU: 30.07, orbitRadiusVisual: 86,
    orbitPeriodYears: 164.8, rotationSpeed: 0.032, tilt: 0.49,
    description: '海王星是太阳系最远的行星，风速可达2100km/h，是太阳系中风速最快的行星。深蓝色同样来自甲烷。拥有14颗已知卫星。',
    moonCount: 16, moons: []
  }
];

const MAX_TOTAL_PARTICLES = 1500;

export class SolarSystem {
  public scene: THREE.Scene;
  public sun: THREE.Object3D;
  public planets: { pivot: THREE.Object3D; mesh: THREE.Mesh; data: PlanetData; moons: { pivot: THREE.Object3D; mesh: THREE.Mesh }[] }[] = [];
  public orbits: THREE.LineLoop[] = [];
  private sunHaloParticles: THREE.Points | null = null;
  private saturnRingParticles: THREE.Points | null = null;
  private totalParticles = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sun = new THREE.Object3D();
    this.sun.name = 'Sun';
    this.scene.add(this.sun);
    this.createSun();
    this.createPlanets();
  }

  private checkParticleBudget(requested: number): number {
    const allowed = Math.min(requested, MAX_TOTAL_PARTICLES - this.totalParticles);
    if (allowed < 0) return 0;
    this.totalParticles += allowed;
    return allowed;
  }

  private createSun(): void {
    const sunGeo = new THREE.SphereGeometry(4, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.name = 'Sun';
    this.sun.add(sunMesh);

    const pointLight = new THREE.PointLight(0xffffff, 2.5, 300);
    pointLight.position.set(0, 0, 0);
    this.sun.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x222244, 0.3);
    this.scene.add(ambientLight);

    this.createSunHalo();
  }

  private createSunHalo(): void {
    const haloParticleCount = this.checkParticleBudget(200);
    if (haloParticleCount === 0) return;

    const positions = new Float32Array(haloParticleCount * 3);
    const sizes = new Float32Array(haloParticleCount);

    for (let i = 0; i < haloParticleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4.5 + Math.random() * 3.0;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.1 + Math.random() * 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.sunHaloParticles = new THREE.Points(geo, mat);
    this.sun.add(this.sunHaloParticles);
  }

  private createPlanets(): void {
    for (const data of PLANET_DATA) {
      const pivot = new THREE.Object3D();
      pivot.name = `${data.name}_pivot`;
      this.sun.add(pivot);

      const planetGroup = new THREE.Object3D();
      planetGroup.name = data.name;
      planetGroup.position.x = data.orbitRadiusVisual;
      pivot.add(planetGroup);

      const geo = new THREE.SphereGeometry(Math.max(0.1, data.radius), 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.emissiveColor,
        emissiveIntensity: 0.15,
        roughness: 0.7,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = data.name;
      mesh.rotation.z = data.tilt;
      planetGroup.add(mesh);

      const moonEntries: { pivot: THREE.Object3D; mesh: THREE.Mesh }[] = [];

      for (const moonData of data.moons) {
        const moonPivot = new THREE.Object3D();
        moonPivot.name = `${moonData.name}_pivot`;
        planetGroup.add(moonPivot);

        const moonGeo = new THREE.SphereGeometry(Math.max(0.05, moonData.radius), 12, 12);
        const moonMat = new THREE.MeshStandardMaterial({
          color: moonData.color,
          emissive: moonData.color,
          emissiveIntensity: 0.1,
          roughness: 0.8,
          metalness: 0.0,
        });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.name = moonData.name;
        moonMesh.position.x = moonData.orbitRadius;
        moonPivot.add(moonMesh);

        moonEntries.push({ pivot: moonPivot, mesh: moonMesh });
      }

      if (data.hasRing) {
        this.createSaturnRing(planetGroup, data.radius);
      }

      this.createOrbitLine(data.orbitRadiusVisual);

      this.planets.push({ pivot, mesh, data, moons: moonEntries });
    }
  }

  private createSaturnRing(parent: THREE.Object3D, planetRadius: number): void {
    const ringParticleCount = this.checkParticleBudget(200);
    if (ringParticleCount === 0) return;

    const positions = new Float32Array(ringParticleCount * 3);
    const colors = new Float32Array(ringParticleCount * 3);
    const innerR = planetRadius * 1.4;
    const outerR = planetRadius * 2.6;

    for (let i = 0; i < ringParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = innerR + Math.random() * (outerR - innerR);
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const t = (r - innerR) / (outerR - innerR);
      const brightness = 0.7 - t * 0.4;
      colors[i * 3] = 0.85 * brightness;
      colors[i * 3 + 1] = 0.75 * brightness;
      colors[i * 3 + 2] = 0.55 * brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.saturnRingParticles = new THREE.Points(geo, mat);
    this.saturnRingParticles.rotation.x = Math.PI * 0.08;
    parent.add(this.saturnRingParticles);
  }

  private createOrbitLine(orbitRadius: number): void {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        0,
        Math.sin(angle) * orbitRadius
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x4455aa,
      transparent: true,
      opacity: 0.15,
    });
    const line = new THREE.LineLoop(geo, mat);
    this.scene.add(line);
    this.orbits.push(line);
  }

  update(deltaTime: number, speedMultiplier: number): void {
    const sunRotationSpeed = (Math.PI * 2) / 6;
    this.sun.rotation.y += sunRotationSpeed * deltaTime * speedMultiplier;

    if (this.sunHaloParticles) {
      this.sunHaloParticles.rotation.y += deltaTime * 0.05 * speedMultiplier;
    }

    if (this.saturnRingParticles) {
      this.saturnRingParticles.rotation.y += deltaTime * 0.02 * speedMultiplier;
    }

    for (const planet of this.planets) {
      const orbitSpeed = computeOrbitSpeed(planet.data.orbitRadiusAU);
      planet.pivot.rotation.y += orbitSpeed * deltaTime * speedMultiplier;

      planet.mesh.rotation.y += planet.data.rotationSpeed * deltaTime * speedMultiplier * 10;

      for (const moon of planet.moons) {
        moon.pivot.rotation.y += moon.pivot.userData.orbitSpeed
          ? moon.pivot.userData.orbitSpeed * deltaTime * speedMultiplier
          : 1.0 * deltaTime * speedMultiplier;
      }
    }
  }

  getPlanetMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const sunMesh = this.sun.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
    if (sunMesh) meshes.push(sunMesh);
    for (const planet of this.planets) {
      meshes.push(planet.mesh);
    }
    return meshes;
  }

  getPlanetDataByMesh(mesh: THREE.Mesh): PlanetData | null {
    for (const planet of this.planets) {
      if (planet.mesh === mesh || planet.mesh.name === mesh.name) {
        return planet.data;
      }
    }
    return null;
  }

  getWorldPositionOfPlanetMesh(mesh: THREE.Mesh): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    return worldPos;
  }
}

export class StarField {
  private points: THREE.Points;
  private twinkleTimer = 0;
  private readonly twinkleInterval = 2.0;
  private opacityBuffer: Float32Array;
  private baseOpacities: Float32Array;

  constructor(scene: THREE.Scene, count: number = 1000) {
    const positions = new Float32Array(count * 3);
    this.opacityBuffer = new Float32Array(count);
    this.baseOpacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 100;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      this.baseOpacities[i] = 0.3 + Math.random() * 0.7;
      this.opacityBuffer[i] = this.baseOpacities[i];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.name = 'StarField';
    scene.add(this.points);
  }

  update(deltaTime: number): void {
    this.twinkleTimer += deltaTime;
    if (this.twinkleTimer >= this.twinkleInterval) {
      this.twinkleTimer -= this.twinkleInterval;
      const count = this.opacityBuffer.length;
      for (let i = 0; i < count; i++) {
        this.baseOpacities[i] = 0.2 + Math.random() * 0.8;
      }
    }

    const lerpFactor = Math.min(1, deltaTime * 2);
    for (let i = 0; i < this.opacityBuffer.length; i++) {
      this.opacityBuffer[i] += (this.baseOpacities[i] - this.opacityBuffer[i]) * lerpFactor;
    }

    const material = this.points.material as THREE.PointsMaterial;
    const avgOpacity = this.opacityBuffer.reduce((a, b) => a + b, 0) / this.opacityBuffer.length;
    material.opacity = avgOpacity;
  }
}
