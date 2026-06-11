import * as THREE from 'three';

export interface PlanetData {
  name: string;
  color: number;
  radius: number;
  orbitRadius: number;
  inclination: number;
  period: number;
  angle: number;
  mesh: THREE.Mesh;
  group: THREE.Group;
  orbitLine: THREE.Line;
  highlightRing: THREE.Mesh;
  selected: boolean;
}

export interface StarSystem {
  group: THREE.Group;
  star: THREE.Mesh;
  planets: PlanetData[];
  backgroundStars: THREE.Points;
  update: (deltaTime: number, speedMultiplier: number) => void;
}

const PLANET_CONFIGS = [
  { name: 'Mercury', color: 0x4488ff, orbitRadius: 5, inclination: 0, period: 10, size: 0.6 },
  { name: 'Venus', color: 0x44cc44, orbitRadius: 8, inclination: 15, period: 18, size: 0.8 },
  { name: 'Mars', color: 0xff4444, orbitRadius: 12, inclination: 30, period: 30, size: 0.7 }
];

function createOrbitLine(radius: number, inclination: number): THREE.Line {
  const points: THREE.Vector3[] = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(theta) * radius,
      0,
      Math.sin(theta) * radius
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.2
  });
  const line = new THREE.Line(geometry, material);
  line.rotation.x = THREE.MathUtils.degToRad(inclination);
  return line;
}

function createHighlightRing(_color: number, size: number): THREE.Mesh {
  const geometry = new THREE.RingGeometry(size * 1.3, size * 1.8, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x66aaff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export function createStarSystem(): StarSystem {
  const group = new THREE.Group();

  const starGeometry = new THREE.SphereGeometry(2, 32, 32);
  const starMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdd88,
    emissive: 0xffdd44,
    emissiveIntensity: 1.5,
    metalness: 0,
    roughness: 1
  });
  const star = new THREE.Mesh(starGeometry, starMaterial);
  group.add(star);

  const starLight = new THREE.PointLight(0xffeecc, 2, 100);
  star.add(starLight);

  const planets: PlanetData[] = [];

  PLANET_CONFIGS.forEach((config) => {
    const planetGroup = new THREE.Group();
    planetGroup.rotation.x = THREE.MathUtils.degToRad(config.inclination);

    const orbitLine = createOrbitLine(config.orbitRadius, 0);
    planetGroup.add(orbitLine);

    const planetGeometry = new THREE.SphereGeometry(config.size, 24, 24);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.3,
      roughness: 0.6
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.position.x = config.orbitRadius;
    planetMesh.userData = { planetIndex: planets.length };
    planetGroup.add(planetMesh);

    const highlightRing = createHighlightRing(config.color, config.size);
    planetMesh.add(highlightRing);

    group.add(planetGroup);

    planets.push({
      name: config.name,
      color: config.color,
      radius: config.size,
      orbitRadius: config.orbitRadius,
      inclination: config.inclination,
      period: config.period,
      angle: Math.random() * Math.PI * 2,
      mesh: planetMesh,
      group: planetGroup,
      orbitLine,
      highlightRing,
      selected: false
    });
  });

  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 5000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = 200 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9
  });
  const backgroundStars = new THREE.Points(starsGeometry, starsMaterial);
  group.add(backgroundStars);

  const update = (deltaTime: number, speedMultiplier: number) => {
    planets.forEach((planet) => {
      const angularVelocity = (Math.PI * 2) / planet.period;
      planet.angle += angularVelocity * deltaTime * speedMultiplier;
      planet.mesh.position.x = Math.cos(planet.angle) * planet.orbitRadius;
      planet.mesh.position.z = Math.sin(planet.angle) * planet.orbitRadius;
      planet.mesh.position.y = 0;
      planet.mesh.rotation.y += deltaTime * 0.5;
    });

    star.rotation.y += deltaTime * 0.1;
  };

  return { group, star, planets, backgroundStars, update };
}
