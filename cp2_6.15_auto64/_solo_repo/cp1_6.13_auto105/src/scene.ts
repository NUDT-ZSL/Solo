import * as THREE from 'three';
import { generateAsteroidDisplacement } from './effects';

interface Asteroid {
  mesh: THREE.Mesh;
  rotationSpeed: number;
  radius: number;
}

export interface EnergyOrb {
  mesh: THREE.Mesh;
  glow: THREE.PointLight;
  active: boolean;
  spawnTime: number;
}

let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;

const asteroids: Asteroid[] = [];
const energyOrbs: EnergyOrb[] = [];

const ASTEROID_MIN_COUNT = 30;
const ASTEROID_MAX_COUNT = 50;
const ASTEROID_MIN_RADIUS = 0.5;
const ASTEROID_MAX_RADIUS = 1.5;
const ASTEROID_FIELD_RANGE = 80;
const ASTEROID_MIN_ROTATION = 0.1;
const ASTEROID_MAX_ROTATION = 0.3;
const ASTEROID_SEGMENTS_BASE = 8;

const ORB_SPAWN_INTERVAL_MIN = 3000;
const ORB_SPAWN_INTERVAL_MAX = 5000;
const ORB_SPAWN_DISTANCE_MIN = 5;
const ORB_SPAWN_DISTANCE_MAX = 15;
const ORB_RADIUS = 0.3;
const ORB_EMISSIVE_INTENSITY = 2.0;
const ORB_POINT_LIGHT_INTENSITY = 3.0;
const ORB_POINT_LIGHT_DISTANCE = 8;

let lastOrbSpawnTime = 0;
let nextOrbSpawnInterval = ORB_SPAWN_INTERVAL_MIN;
let shipPosition = new THREE.Vector3();

const ASTEROID_COLORS = ['#6b7280', '#5b636f', '#4b5563', '#626a73', '#525a63'];

const FPS_SAMPLE_INTERVAL = 1000;
const FPS_MIN_THRESHOLD = 45;
const FPS_DEGRADE_RATIO = 0.1;
let fpsFrameCount = 0;
let fpsLastSampleTime = performance.now();
let currentFps = 60;

export function init(container: HTMLElement): void {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f172a, 0.008);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0f172a, 1);
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0x4466aa, 0x223344, 0.4);
  scene.add(hemisphereLight);

  window.addEventListener('resize', onResize);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene(): THREE.Scene {
  return scene;
}

export function getCamera(): THREE.PerspectiveCamera {
  return camera;
}

export function getRenderer(): THREE.WebGLRenderer {
  return renderer;
}

function createAsteroidMesh(radius: number): THREE.Mesh {
  const segments = ASTEROID_SEGMENTS_BASE + Math.floor(radius * 4);
  const geometry = new THREE.SphereGeometry(radius, segments, segments);

  const displacedPositions = generateAsteroidDisplacement(radius, segments, 0.15);
  const posAttr = geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setX(i, displacedPositions[i * 3]);
    posAttr.setY(i, displacedPositions[i * 3 + 1]);
    posAttr.setZ(i, displacedPositions[i * 3 + 2]);
  }
  geometry.computeVertexNormals();

  const colorHex = ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)];
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  return new THREE.Mesh(geometry, material);
}

export function spawnAsteroids(): void {
  clearAsteroids();

  const count = ASTEROID_MIN_COUNT + Math.floor(
    Math.random() * (ASTEROID_MAX_COUNT - ASTEROID_MIN_COUNT + 1)
  );

  for (let i = 0; i < count; i++) {
    const radius = ASTEROID_MIN_RADIUS + Math.random() * (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
    const mesh = createAsteroidMesh(radius);

    let x: number, y: number, z: number;
    do {
      x = (Math.random() - 0.5) * ASTEROID_FIELD_RANGE;
      y = (Math.random() - 0.5) * ASTEROID_FIELD_RANGE * 0.5;
      z = (Math.random() - 0.5) * ASTEROID_FIELD_RANGE;
    } while (Math.sqrt(x * x + y * y + z * z) < 8);

    mesh.position.set(x, y, z);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const rotationSpeed = ASTEROID_MIN_ROTATION + Math.random() * (ASTEROID_MAX_ROTATION - ASTEROID_MIN_ROTATION);

    scene.add(mesh);
    asteroids.push({ mesh, rotationSpeed, radius });
  }
}

function clearAsteroids(): void {
  for (const asteroid of asteroids) {
    scene.remove(asteroid.mesh);
    asteroid.mesh.geometry.dispose();
    (asteroid.mesh.material as THREE.Material).dispose();
  }
  asteroids.length = 0;
}

export function createEnergyOrb(): void {
  const geometry = new THREE.SphereGeometry(ORB_RADIUS, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: ORB_EMISSIVE_INTENSITY,
    transparent: true,
    opacity: 0.9,
    roughness: 0.2,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const dir = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();

  const distance = ORB_SPAWN_DISTANCE_MIN + Math.random() * (ORB_SPAWN_DISTANCE_MAX - ORB_SPAWN_DISTANCE_MIN);
  mesh.position.copy(shipPosition).add(dir.multiplyScalar(distance));
  mesh.position.y += 2;

  scene.add(mesh);

  const glow = new THREE.PointLight(0x22c55e, ORB_POINT_LIGHT_INTENSITY, ORB_POINT_LIGHT_DISTANCE);
  glow.position.copy(mesh.position);
  scene.add(glow);

  energyOrbs.push({
    mesh,
    glow,
    active: true,
    spawnTime: performance.now(),
  });
}

export function removeEnergyOrb(orb: EnergyOrb): void {
  scene.remove(orb.mesh);
  scene.remove(orb.glow);
  orb.mesh.geometry.dispose();
  (orb.mesh.material as THREE.Material).dispose();
  orb.glow.dispose();
  orb.active = false;

  const index = energyOrbs.indexOf(orb);
  if (index > -1) {
    energyOrbs.splice(index, 1);
  }
}

export function getEnergyOrbs(): EnergyOrb[] {
  return energyOrbs;
}

export function getAsteroids(): Array<{ mesh: THREE.Mesh; radius: number }> {
  return asteroids;
}

export function updateShipPosition(pos: THREE.Vector3): void {
  shipPosition.copy(pos);
}

function adjustAsteroidCountByFps(): void {
  if (currentFps < FPS_MIN_THRESHOLD && asteroids.length > ASTEROID_MIN_COUNT) {
    const excess = asteroids.length - ASTEROID_MIN_COUNT;
    const removeCount = Math.max(1, Math.ceil(excess * FPS_DEGRADE_RATIO));
    for (let i = 0; i < removeCount && asteroids.length > ASTEROID_MIN_COUNT; i++) {
      const removed = asteroids.pop()!;
      scene.remove(removed.mesh);
      removed.mesh.geometry.dispose();
      (removed.mesh.material as THREE.Material).dispose();
    }
  }
}

export function update(delta: number): void {
  for (const asteroid of asteroids) {
    asteroid.mesh.rotation.x += asteroid.rotationSpeed * delta;
    asteroid.mesh.rotation.y += asteroid.rotationSpeed * delta * 0.7;
  }

  const now = performance.now();
  if (now - lastOrbSpawnTime > nextOrbSpawnInterval) {
    createEnergyOrb();
    lastOrbSpawnTime = now;
    nextOrbSpawnInterval = ORB_SPAWN_INTERVAL_MIN + Math.random() * (ORB_SPAWN_INTERVAL_MAX - ORB_SPAWN_INTERVAL_MIN);
  }

  for (const orb of energyOrbs) {
    if (!orb.active) continue;
    const pulse = Math.sin(now * 0.005) * 0.3 + 1.0;
    (orb.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = ORB_EMISSIVE_INTENSITY * pulse;
    orb.glow.intensity = ORB_POINT_LIGHT_INTENSITY * pulse;
    orb.mesh.rotation.y += delta * 2.0;
  }

  fpsFrameCount++;
  if (now - fpsLastSampleTime >= FPS_SAMPLE_INTERVAL) {
    currentFps = fpsFrameCount;
    fpsFrameCount = 0;
    fpsLastSampleTime = now;
    adjustAsteroidCountByFps();
  }

  renderer.render(scene, camera);
}

export function reset(): void {
  clearAsteroids();

  for (const orb of energyOrbs) {
    scene.remove(orb.mesh);
    scene.remove(orb.glow);
    orb.mesh.geometry.dispose();
    (orb.mesh.material as THREE.Material).dispose();
    orb.glow.dispose();
  }
  energyOrbs.length = 0;

  lastOrbSpawnTime = 0;
  nextOrbSpawnInterval = ORB_SPAWN_INTERVAL_MIN;
}

export function getFps(): number {
  return currentFps;
}
