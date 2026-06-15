import * as THREE from 'three';

export interface PlanetData {
  name: string;
  color: number;
  radius: number;
  orbitA: number;
  orbitB: number;
  inclination: number;
  period: number;
  angle: number;
  mesh: THREE.Mesh;
  group: THREE.Group;
  orbitLine: THREE.Line;
  highlightRing: THREE.Mesh;
  selected: boolean;
  inclMatrix: THREE.Matrix4;
}

export interface StarSystem {
  group: THREE.Group;
  star: THREE.Mesh;
  planets: PlanetData[];
  backgroundStars: THREE.Points;
  update: (deltaTime: number, speedMultiplier: number) => void;
}

const PLANET_CONFIGS = [
  { name: 'Mercury', color: 0x4488ff, a: 5, b: 4.2, inclination: 0,  period: 10, size: 0.6 },
  { name: 'Venus',   color: 0x44cc44, a: 8, b: 7.0, inclination: 15, period: 18, size: 0.8 },
  { name: 'Mars',    color: 0xff4444, a: 12, b: 10.5, inclination: 30, period: 30, size: 0.7 }
];

function createOrbitLine(a: number, b: number, inclRad: number): THREE.Line {
  const points: THREE.Vector3[] = [];
  const segments = 256;
  const m = new THREE.Matrix4().makeRotationX(inclRad);
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const v = new THREE.Vector3(
      Math.cos(theta) * a,
      0,
      Math.sin(theta) * b
    );
    v.applyMatrix4(m);
    points.push(v);
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.2
  });
  return new THREE.Line(geometry, material);
}

function createHighlightRing(_color: number, size: number): THREE.Mesh {
  const geometry = new THREE.RingGeometry(size * 1.0, size * 1.05, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x66aaff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  (ring.userData as { baseSize: number }).baseSize = size;
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
    const inclRad = THREE.MathUtils.degToRad(config.inclination);
    const inclMatrix = new THREE.Matrix4().makeRotationX(inclRad);

    const planetGroup = new THREE.Group();

    const orbitLine = createOrbitLine(config.a, config.b, inclRad);
    planetGroup.add(orbitLine);

    const planetGeometry = new THREE.SphereGeometry(config.size, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.3,
      roughness: 0.6
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);

    const initialAngle = Math.random() * Math.PI * 2;
    const initPos = new THREE.Vector3(
      Math.cos(initialAngle) * config.a,
      0,
      Math.sin(initialAngle) * config.b
    );
    initPos.applyMatrix4(inclMatrix);
    planetMesh.position.copy(initPos);
    planetMesh.userData = { planetIndex: planets.length };
    planetGroup.add(planetMesh);

    const highlightRing = createHighlightRing(config.color, config.size);
    planetMesh.add(highlightRing);

    group.add(planetGroup);

    planets.push({
      name: config.name,
      color: config.color,
      radius: config.size,
      orbitA: config.a,
      orbitB: config.b,
      inclination: config.inclination,
      period: config.period,
      angle: initialAngle,
      mesh: planetMesh,
      group: planetGroup,
      orbitLine,
      highlightRing,
      selected: false,
      inclMatrix
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
    positions[i3]     = radius * Math.sin(phi) * Math.cos(theta);
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

      const localPos = new THREE.Vector3(
        Math.cos(planet.angle) * planet.orbitA,
        0,
        Math.sin(planet.angle) * planet.orbitB
      );
      localPos.applyMatrix4(planet.inclMatrix);
      planet.mesh.position.copy(localPos);

      planet.mesh.rotation.y += deltaTime * 0.5;

      const baseSize = (planet.highlightRing.userData as { baseSize: number }).baseSize;
      planet.highlightRing.scale.setScalar(1);
      planet.highlightRing.position.set(0, 0, 0);
      void baseSize;
    });

    star.rotation.y += deltaTime * 0.1;
  };

  return { group, star, planets, backgroundStars, update };
}
