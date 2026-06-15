import * as THREE from 'three';
import type { TerrainObject } from './terrainLoader';

export interface TerrainRenderable {
  group: THREE.Group;
  lod: THREE.LOD;
  meshes: Map<string, THREE.Mesh[]>;
  dirLight: THREE.DirectionalLight;
  ambLight: THREE.AmbientLight;
  currentLOD: 'high' | 'medium';
  fadeInDuration: number;
}

export interface LODLevel {
  level: 'high' | 'medium' | 'low';
  skip: number;
  distance: number;
}

const LOD_LEVELS: LODLevel[] = [
  { level: 'high', skip: 1, distance: 0 },
  { level: 'medium', skip: 2, distance: 300 },
  { level: 'low', skip: 4, distance: 500 },
];

function createTerrainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.03,
    flatShading: false,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
}

function fadeInMesh(mesh: THREE.Mesh, duration: number = 300): void {
  const mat = mesh.material as THREE.MeshStandardMaterial;
  const start = performance.now();
  function tick() {
    const elapsed = performance.now() - start;
    const t = Math.min(elapsed / duration, 1);
    mat.opacity = t;
    mat.needsUpdate = true;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function createTerrainRenderable(terrain: TerrainObject): TerrainRenderable {
  const group = new THREE.Group();
  const lod = new THREE.LOD();
  group.add(lod);

  const highMat = createTerrainMaterial();
  const highMesh = new THREE.Mesh(terrain.geometry, highMat);
  highMesh.name = 'terrain_high';
  highMesh.receiveShadow = true;
  highMesh.castShadow = true;
  lod.addLevel(highMesh, 0);

  fadeInMesh(highMesh, 300);

  const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.5);
  dirLight.position.set(180, 280, 160);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 800;
  dirLight.shadow.camera.left = -350;
  dirLight.shadow.camera.right = 350;
  dirLight.shadow.camera.top = 350;
  dirLight.shadow.camera.bottom = -350;
  dirLight.shadow.bias = -0.0005;
  group.add(dirLight);

  const ambLight = new THREE.AmbientLight(0x445577, 0.55);
  group.add(ambLight);

  const hemLight = new THREE.HemisphereLight(0x88aaff, 0x443322, 0.35);
  group.add(hemLight);

  const meshes = new Map<string, THREE.Mesh[]>();
  meshes.set('high', [highMesh]);

  return {
    group,
    lod,
    meshes,
    dirLight,
    ambLight,
    currentLOD: 'high',
    fadeInDuration: 300,
  };
}

export function addMediumLOD(
  renderable: TerrainRenderable,
  terrain: TerrainObject,
  distance: number = 300
): void {
  if (renderable.meshes.has('medium')) return;

  const medMat = createTerrainMaterial();
  const medMesh = new THREE.Mesh(terrain.geometry, medMat);
  medMesh.name = 'terrain_medium';
  medMesh.receiveShadow = true;
  medMesh.castShadow = true;

  renderable.lod.addLevel(medMesh, distance);
  renderable.meshes.set('medium', [medMesh]);

  fadeInMesh(medMesh, 300);
}

export function updateLOD(
  renderable: TerrainRenderable,
  camera: THREE.Camera
): 'high' | 'medium' | 'low' {
  renderable.lod.update(camera);

  const levels = renderable.lod.levels;
  let currentLevel: 'high' | 'medium' | 'low' = 'high';
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    const mesh = level.object as THREE.Mesh;
    if (mesh.visible) {
      if (mesh.name === 'terrain_medium') currentLevel = 'medium';
      else if (mesh.name === 'terrain_low') currentLevel = 'low';
      else currentLevel = 'high';
      break;
    }
  }
  renderable.currentLOD = currentLevel;
  return currentLevel;
}

export function getCurrentMesh(renderable: TerrainRenderable): THREE.Mesh | null {
  const levels = renderable.lod.levels;
  for (let i = 0; i < levels.length; i++) {
    const mesh = levels[i].object as THREE.Mesh;
    if (mesh.visible) return mesh;
  }
  return null;
}

export function getHighestMesh(renderable: TerrainRenderable): THREE.Mesh | null {
  const high = renderable.meshes.get('high');
  return high ? high[0] : null;
}

export { LOD_LEVELS };
