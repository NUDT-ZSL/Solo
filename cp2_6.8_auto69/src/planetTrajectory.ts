import * as THREE from 'three';

export interface PlanetConfig {
  name: string;
  color: number;
  emissive: number;
  a: number;
  b: number;
  inclination: number;
  speed: number;
  radius: number;
  lightIntensity: number;
}

export interface PlanetObject {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  orbit: THREE.Line;
  trail: THREE.Points;
  config: PlanetConfig;
  angle: number;
  trailPositions: THREE.Vector3[];
}

export interface PlanetTrajectoryResult {
  group: THREE.Group;
  planets: PlanetObject[];
  update: (delta: number, speedMultiplier: number) => void;
}

const PLANET_CONFIGS: PlanetConfig[] = [
  {
    name: '金星',
    color: 0xffffff,
    emissive: 0xffffee,
    a: 22,
    b: 20,
    inclination: 0.05,
    speed: 0.35,
    radius: 0.9,
    lightIntensity: 1.2
  },
  {
    name: '火星',
    color: 0xe57373,
    emissive: 0xff4422,
    a: 32,
    b: 29,
    inclination: 0.09,
    speed: 0.24,
    radius: 0.7,
    lightIntensity: 0.9
  },
  {
    name: '木星',
    color: 0xf5e6b8,
    emissive: 0xffdd88,
    a: 45,
    b: 41,
    inclination: 0.03,
    speed: 0.12,
    radius: 1.6,
    lightIntensity: 1.5
  }
];

const TRAIL_LENGTH = 18;

function createOrbitLine(a: number, b: number, inclination: number): THREE.Line {
  const points: THREE.Vector3[] = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = a * Math.cos(t);
    const z = b * Math.sin(t);
    const y = z * Math.sin(inclination);
    const zr = z * Math.cos(inclination);
    points.push(new THREE.Vector3(x, y, zr));
  }
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({
    color: 0xc9a93e,
    transparent: true,
    opacity: 0.35,
    dashSize: 1.2,
    gapSize: 0.8,
    depthWrite: false
  });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

function createPlanetMesh(color: number, emissive: number, radius: number): THREE.Mesh {
  const geom = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geom, mat);
  return mesh;
}

function createTrail(color: number): THREE.Points {
  const positions = new Float32Array(TRAIL_LENGTH * 3);
  const sizes = new Float32Array(TRAIL_LENGTH);
  const colors = new Float32Array(TRAIL_LENGTH * 3);
  const c = new THREE.Color(color);

  for (let i = 0; i < TRAIL_LENGTH; i++) {
    sizes[i] = 0.4 * (1 - i / TRAIL_LENGTH);
    const alpha = 1 - i / TRAIL_LENGTH;
    colors[i * 3] = c.r * alpha;
    colors[i * 3 + 1] = c.g * alpha;
    colors[i * 3 + 2] = c.b * alpha;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,200,150,0.7)');
  grad.addColorStop(1, 'rgba(255,150,100,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);

  const mat = new THREE.PointsMaterial({
    size: 0.8,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  return new THREE.Points(geom, mat);
}

export function createPlanets(scene: THREE.Scene): PlanetTrajectoryResult {
  const group = new THREE.Group();
  const planets: PlanetObject[] = [];

  PLANET_CONFIGS.forEach((config, index) => {
    const orbit = createOrbitLine(config.a, config.b, config.inclination);
    group.add(orbit);

    const mesh = createPlanetMesh(config.color, config.emissive, config.radius);
    group.add(mesh);

    const light = new THREE.PointLight(config.emissive, config.lightIntensity, 50, 2);
    mesh.add(light);

    const trail = createTrail(config.color);
    group.add(trail);

    const angle = (index * Math.PI * 2) / PLANET_CONFIGS.length + Math.random() * Math.PI;
    const trailPositions: THREE.Vector3[] = [];

    planets.push({ mesh, light, orbit, trail, config, angle, trailPositions });
  });

  scene.add(group);

  function update(delta: number, speedMultiplier: number): void {
    planets.forEach((planet) => {
      planet.angle += delta * planet.config.speed * speedMultiplier;

      const { a, b, inclination } = planet.config;
      const x = a * Math.cos(planet.angle);
      const z = b * Math.sin(planet.angle);
      const y = z * Math.sin(inclination);
      const zr = z * Math.cos(inclination);

      const newPos = new THREE.Vector3(x, y, zr);
      planet.mesh.position.copy(newPos);
      planet.mesh.rotation.y += delta * 0.8;

      planet.trailPositions.unshift(newPos.clone());
      if (planet.trailPositions.length > TRAIL_LENGTH) {
        planet.trailPositions.pop();
      }

      const posAttr = planet.trail.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        if (i < planet.trailPositions.length) {
          const p = planet.trailPositions[i];
          posAttr.array[i * 3] = p.x;
          posAttr.array[i * 3 + 1] = p.y;
          posAttr.array[i * 3 + 2] = p.z;
        } else {
          posAttr.array[i * 3] = x;
          posAttr.array[i * 3 + 1] = y;
          posAttr.array[i * 3 + 2] = zr;
        }
      }
      posAttr.needsUpdate = true;
    });
  }

  return { group, planets, update };
}

export { PLANET_CONFIGS };
