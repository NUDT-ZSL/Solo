import * as THREE from 'three';
import { PLANET_DATA, type PlanetDataItem, type MoonData } from '../data/PlanetData';

export interface PlanetObject {
  id: string;
  data: PlanetDataItem | MoonData;
  mesh: THREE.Mesh;
  group: THREE.Group;
  orbitGroup: THREE.Group;
  orbitLine: THREE.Mesh | null;
  highlightRing: THREE.Mesh | null;
  moons: MoonObject[];
  parentOrbitRadius: number;
  orbitEccentricity: number;
  currentAngle: number;
}

export interface MoonObject {
  id: string;
  data: MoonData;
  mesh: THREE.Mesh;
  group: THREE.Group;
  orbitGroup: THREE.Group;
  orbitLine: THREE.Mesh | null;
  highlightRing: THREE.Mesh | null;
  currentAngle: number;
}

export interface PlanetSystemResult {
  planets: PlanetObject[];
  allObjects: Map<string, THREE.Mesh>;
  sunLight: THREE.PointLight;
}

const ORBIT_LINE_COLOR = 0xffedd5;
const ORBIT_LINE_OPACITY = 0.4;
const ORBIT_LINE_WIDTH = 0.15;

function createOrbitLine(semiMajorAxis: number, eccentricity: number): THREE.Mesh {
  const segments = 256;
  const points: THREE.Vector3[] = [];
  const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
  const focusOffset = semiMajorAxis * eccentricity;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * semiMajorAxis - focusOffset;
    const z = Math.sin(angle) * semiMinorAxis;
    points.push(new THREE.Vector3(x, 0, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  curve.closed = true;

  const tubeGeometry = new THREE.TubeGeometry(curve, segments, ORBIT_LINE_WIDTH, 4, true);

  const material = new THREE.MeshBasicMaterial({
    color: ORBIT_LINE_COLOR,
    transparent: true,
    opacity: ORBIT_LINE_OPACITY,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(tubeGeometry, material);
}

function createMoonOrbitLine(radius: number): THREE.Mesh {
  const segments = 64;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  curve.closed = true;
  const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.05, 4, true);
  const material = new THREE.MeshBasicMaterial({
    color: ORBIT_LINE_COLOR,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(tubeGeometry, material);
}

function createSunHalo(): { sprite: THREE.Sprite; update: (time: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const drawHalo = (opacity: number) => {
    ctx.clearRect(0, 0, 256, 256);
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, `rgba(253, 184, 19, ${opacity})`);
    gradient.addColorStop(0.2, `rgba(253, 184, 19, ${opacity * 0.8})`);
    gradient.addColorStop(0.4, `rgba(255, 140, 0, ${opacity * 0.4})`);
    gradient.addColorStop(0.6, `rgba(255, 100, 0, ${opacity * 0.2})`);
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  };

  drawHalo(0.9);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(45, 45, 1);

  return {
    sprite,
    update: (time: number) => {
      const pulse = 0.7 + Math.sin(time * 1.5) * 0.3;
      drawHalo(pulse * 0.9);
      texture.needsUpdate = true;
      sprite.scale.setScalar(40 + Math.sin(time * 0.8) * 5);
    },
  };
}

function createHighlightRing(radius: number, color: string = '#ffffff'): THREE.Mesh {
  const geometry = new THREE.RingGeometry(radius * 1.3, radius * 1.5, 64);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.rotation.y = 0;
  ring.visible = false;
  return ring;
}

function createSaturnRings(parentRadius: number): THREE.Group {
  const ringsGroup = new THREE.Group();

  const innerRadius = parentRadius * 1.3;
  const outerRadius = parentRadius * 2.2;

  const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
  const positions = ringGeometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const distance = Math.sqrt(x * x + y * y);
    const t = (distance - innerRadius) / (outerRadius - innerRadius);

    const band = Math.floor(t * 8) / 8;
    const brightness = 0.6 + Math.sin(band * Math.PI * 4) * 0.2;

    colors[i * 3] = 0.95 * brightness;
    colors[i * 3 + 1] = 0.85 * brightness;
    colors[i * 3 + 2] = 0.6 * brightness;
  }

  ringGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const ringMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  const mainRing = new THREE.Mesh(ringGeometry, ringMaterial);
  mainRing.rotation.x = -Math.PI / 2.2;
  ringsGroup.add(mainRing);

  return ringsGroup;
}

export function createPlanetSystem(scene: THREE.Scene): PlanetSystemResult {
  const planets: PlanetObject[] = [];
  const allObjects = new Map<string, THREE.Mesh>();

  const sunData = PLANET_DATA[0];
  const sunGeometry = new THREE.SphereGeometry(sunData.radius, 64, 64);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: sunData.color,
  });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = sunData.id;

  const sunHighlight = createHighlightRing(sunData.radius, sunData.color);
  sunMesh.add(sunHighlight);

  const sunLight = new THREE.PointLight(0xffcc66, 2.5, 1000, 0.5);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = false;
  scene.add(sunLight);

  const { sprite: sunHalo, update: updateSunHalo } = createSunHalo();
  sunMesh.add(sunHalo);

  scene.add(sunMesh);
  allObjects.set(sunData.id, sunMesh);

  const sunObject: PlanetObject = {
    id: sunData.id,
    data: sunData,
    mesh: sunMesh,
    group: new THREE.Group(),
    orbitGroup: new THREE.Group(),
    orbitLine: null,
    highlightRing: sunHighlight,
    moons: [],
    parentOrbitRadius: 0,
    orbitEccentricity: 0,
    currentAngle: 0,
  };
  planets.push(sunObject);

  for (let i = 1; i < PLANET_DATA.length; i++) {
    const planetData = PLANET_DATA[i];

    const eccentricity = 0.02 + ((i * 7 + 3) % 11) * 0.006;

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const orbitLine = createOrbitLine(planetData.orbitRadius, eccentricity);
    orbitGroup.add(orbitLine);

    const group = new THREE.Group();
    orbitGroup.add(group);

    const geometry = new THREE.SphereGeometry(planetData.radius, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: planetData.color,
      roughness: 0.8,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = planetData.id;

    const highlightRing = createHighlightRing(planetData.radius, '#ffffff');
    mesh.add(highlightRing);

    group.add(mesh);

    if (planetData.id === 'saturn') {
      const rings = createSaturnRings(planetData.radius);
      mesh.add(rings);
    }

    const a = planetData.orbitRadius;
    const e = eccentricity;
    const b = a * Math.sqrt(1 - e * e);
    const focusOffset = a * e;
    const initialAngle = (i * 1.1) % (Math.PI * 2);
    group.position.x = Math.cos(initialAngle) * a - focusOffset;
    group.position.z = Math.sin(initialAngle) * b;

    const moonObjects: MoonObject[] = [];
    if (planetData.moons) {
      for (const moonData of planetData.moons) {
        const moonOrbitGroup = new THREE.Group();
        mesh.add(moonOrbitGroup);

        const moonOrbitLine = createMoonOrbitLine(moonData.orbitRadius);
        moonOrbitGroup.add(moonOrbitLine);

        const moonGroup = new THREE.Group();
        moonOrbitGroup.add(moonGroup);

        const moonGeometry = new THREE.SphereGeometry(moonData.radius, 24, 24);
        const moonMaterial = new THREE.MeshStandardMaterial({
          color: moonData.color,
          roughness: 0.9,
          metalness: 0.05,
        });
        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
        moonMesh.name = moonData.id;

        const moonHighlight = createHighlightRing(moonData.radius, '#ffffff');
        moonMesh.add(moonHighlight);

        moonGroup.add(moonMesh);

        const moonInitialAngle = Math.random() * Math.PI * 2;
        moonGroup.position.x = Math.cos(moonInitialAngle) * moonData.orbitRadius;
        moonGroup.position.z = Math.sin(moonInitialAngle) * moonData.orbitRadius;

        moonObjects.push({
          id: moonData.id,
          data: moonData,
          mesh: moonMesh,
          group: moonGroup,
          orbitGroup: moonOrbitGroup,
          orbitLine: moonOrbitLine,
          highlightRing: moonHighlight,
          currentAngle: moonInitialAngle,
        });

        allObjects.set(moonData.id, moonMesh);
      }
    }

    const planetObject: PlanetObject = {
      id: planetData.id,
      data: planetData,
      mesh,
      group,
      orbitGroup,
      orbitLine,
      highlightRing,
      moons: moonObjects,
      parentOrbitRadius: planetData.orbitRadius,
      orbitEccentricity: eccentricity,
      currentAngle: initialAngle,
    };

    planets.push(planetObject);
    allObjects.set(planetData.id, mesh);
  }

  (window as unknown as { updateSunHalo?: (time: number) => void }).updateSunHalo = updateSunHalo;

  return { planets, allObjects, sunLight };
}

export function updateHighlightRing(
  ring: THREE.Mesh | null,
  selected: boolean,
  time: number
): void {
  if (!ring) return;

  if (selected) {
    ring.visible = true;
    const pulse = 0.3 + Math.sin((time * Math.PI * 2) / 1.2) * 0.2 + 0.2;
    (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
  } else {
    ring.visible = false;
  }
}

export function setOrbitsVisible(planets: PlanetObject[], visible: boolean): void {
  for (const planet of planets) {
    if (planet.orbitLine) {
      planet.orbitLine.visible = visible;
    }
    for (const moon of planet.moons) {
      if (moon.orbitLine) {
        moon.orbitLine.visible = visible;
      }
    }
  }
}
