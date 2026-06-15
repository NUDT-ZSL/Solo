import * as THREE from 'three';

export interface PlanetInfo {
  name: string;
  nameEn: string;
  color: number;
  colorHex: string;
  radius: number;
  orbitalPeriod: number;
  distanceAU: number;
}

interface PlanetData {
  name: string;
  nameEn: string;
  radius: number;
  color: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitalPeriod: number;
  distanceAU: number;
  hasRing?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: number;
}

const PLANETS_DATA: PlanetData[] = [
  {
    name: '水星', nameEn: 'Mercury',
    radius: 1, color: 0x9e9e9e,
    orbitRadius: 15, orbitSpeed: 4.15,
    orbitalPeriod: 88, distanceAU: 0.39
  },
  {
    name: '金星', nameEn: 'Venus',
    radius: 1.5, color: 0xe8c873,
    orbitRadius: 22, orbitSpeed: 1.62,
    orbitalPeriod: 225, distanceAU: 0.72
  },
  {
    name: '地球', nameEn: 'Earth',
    radius: 1.6, color: 0x3f7cbf,
    orbitRadius: 30, orbitSpeed: 1.0,
    orbitalPeriod: 365, distanceAU: 1.0
  },
  {
    name: '火星', nameEn: 'Mars',
    radius: 1.2, color: 0xd96344,
    orbitRadius: 38, orbitSpeed: 0.53,
    orbitalPeriod: 687, distanceAU: 1.52
  },
  {
    name: '木星', nameEn: 'Jupiter',
    radius: 4, color: 0xd2a679,
    orbitRadius: 50, orbitSpeed: 0.084,
    orbitalPeriod: 4333, distanceAU: 5.2
  },
  {
    name: '土星', nameEn: 'Saturn',
    radius: 3.4, color: 0xe4c987,
    orbitRadius: 62, orbitSpeed: 0.034,
    orbitalPeriod: 10759, distanceAU: 9.58,
    hasRing: true, ringInnerRadius: 4.5, ringOuterRadius: 7, ringColor: 0xd4b87a
  },
  {
    name: '天王星', nameEn: 'Uranus',
    radius: 2.4, color: 0x8ed6d6,
    orbitRadius: 72, orbitSpeed: 0.012,
    orbitalPeriod: 30687, distanceAU: 19.22
  },
  {
    name: '海王星', nameEn: 'Neptune',
    radius: 2.3, color: 0x4b70dd,
    orbitRadius: 82, orbitSpeed: 0.006,
    orbitalPeriod: 60190, distanceAU: 30.05
  }
];

export interface PlanetObject {
  data: PlanetData;
  pivot: THREE.Object3D;
  mesh: THREE.Mesh;
  info: PlanetInfo;
}

export interface SolarSystem {
  sunGroup: THREE.Group;
  planetsGroup: THREE.Group;
  orbitsGroup: THREE.Group;
  stars: THREE.Points;
  planetObjects: PlanetObject[];
  update: (delta: number, speedMultiplier: number) => void;
}

function toHexString(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

function createSun(): THREE.Group {
  const group = new THREE.Group();

  const geometry = new THREE.SphereGeometry(8, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffdd33,
  });
  const sun = new THREE.Mesh(geometry, material);
  group.add(sun);

  const glowGeometry = new THREE.SphereGeometry(9, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glow);

  const pointLight = new THREE.PointLight(0xffffff, 2.5, 0, 0);
  group.add(pointLight);

  return group;
}

function createOrbitLine(radius: number): THREE.Line {
  const segments = 128;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.35
  });
  return new THREE.Line(geometry, material);
}

function createPlanet(data: PlanetData): PlanetObject {
  const pivot = new THREE.Object3D();
  pivot.rotation.y = Math.random() * Math.PI * 2;

  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: data.color,
    roughness: 0.8,
    metalness: 0.15
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = data.orbitRadius;
  mesh.userData = { planetIndex: true };
  pivot.add(mesh);

  if (data.hasRing && data.ringInnerRadius && data.ringOuterRadius) {
    const ringGeometry = new THREE.RingGeometry(
      data.ringInnerRadius, data.ringOuterRadius, 64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: data.ringColor ?? 0xd4b87a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.3;
    mesh.add(ring);
  }

  const info: PlanetInfo = {
    name: data.name,
    nameEn: data.nameEn,
    color: data.color,
    colorHex: toHexString(data.color),
    radius: data.radius,
    orbitalPeriod: data.orbitalPeriod,
    distanceAU: data.distanceAU
  };

  return { data, pivot, mesh, info };
}

function createStars(count: number = 500): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const radius = 400 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  });

  return new THREE.Points(geometry, material);
}

export function createSolarSystem(): SolarSystem {
  const sunGroup = createSun();
  const planetsGroup = new THREE.Group();
  const orbitsGroup = new THREE.Group();
  const planetObjects: PlanetObject[] = [];

  for (const data of PLANETS_DATA) {
    const orbit = createOrbitLine(data.orbitRadius);
    orbitsGroup.add(orbit);

    const planet = createPlanet(data);
    planetsGroup.add(planet.pivot);
    planetObjects.push(planet);
  }

  const stars = createStars(500);

  let time = 0;

  const update = (delta: number, speedMultiplier: number) => {
    time += delta;

    sunGroup.rotation.y += delta * 0.1;

    for (const planet of planetObjects) {
      planet.pivot.rotation.y += delta * planet.data.orbitSpeed * speedMultiplier * 0.3;
      planet.mesh.rotation.y += delta * planet.data.orbitSpeed * speedMultiplier * 0.9;
    }

    const positions = stars.geometry.attributes.position as THREE.BufferAttribute;
    const colors = stars.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 1.5 + i * 0.7);
      colors.setXYZ(i, twinkle, twinkle, twinkle);
    }
    colors.needsUpdate = true;
  };

  return {
    sunGroup,
    planetsGroup,
    orbitsGroup,
    stars,
    planetObjects,
    update
  };
}
