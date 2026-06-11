import * as THREE from 'three';
import type { TerrainData, TerrainObject } from './terrainLoader';

export interface TerrainRendererResult {
  group: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  dirLight: THREE.DirectionalLight;
  ambLight: THREE.AmbientLight;
}

export interface LODState {
  currentLevel: 'high' | 'medium';
  vertexCount: number;
  switchTime: number;
}

export function createTerrainRenderable(terrain: TerrainObject): TerrainRendererResult {
  const group = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.05,
    flatShading: false,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0,
  });

  const mesh = new THREE.Mesh(terrain.geometry, material);
  mesh.name = 'terrainMesh';
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.6);
  dirLight.position.set(200, 300, 150);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 1000;
  dirLight.shadow.camera.left = -300;
  dirLight.shadow.camera.right = 300;
  dirLight.shadow.camera.top = 300;
  dirLight.shadow.camera.bottom = -300;
  group.add(dirLight);

  const ambLight = new THREE.AmbientLight(0x445577, 0.6);
  group.add(ambLight);

  fadeInMaterial(material);

  return { group, mesh, material, dirLight, ambLight };
}

function fadeInMaterial(material: THREE.MeshStandardMaterial): void {
  const start = performance.now();
  const duration = 300;
  function tick() {
    const elapsed = performance.now() - start;
    const t = Math.min(elapsed / duration, 1);
    material.opacity = t;
    material.needsUpdate = true;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function checkAndApplyLOD(
  terrain: TerrainObject,
  renderer: TerrainRendererResult,
  csvUrl: string,
  scaleXZ: number,
  scaleY: number,
  onLoad: (newTerrain: TerrainObject, newRenderer: TerrainRendererResult) => void
): LODState {
  const vertexCount = terrain.data.vertexCount;
  if (vertexCount <= 1_000_000) {
    return { currentLevel: 'high', vertexCount, switchTime: 0 };
  }

  const skip = Math.ceil(Math.sqrt(vertexCount / (vertexCount * 0.3)));
  const t0 = performance.now();

  import('./terrainLoader').then(({ loadTerrainFromCSV }) => {
    loadTerrainFromCSV(csvUrl, scaleXZ, scaleY, skip).then((newTerrain) => {
      renderer.group.remove(renderer.mesh);
      renderer.mesh.geometry.dispose();
      renderer.material.dispose();

      const newMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.05,
        flatShading: false,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0,
      });

      const newMesh = new THREE.Mesh(newTerrain.geometry, newMaterial);
      newMesh.name = 'terrainMesh';
      newMesh.receiveShadow = true;
      newMesh.castShadow = true;
      renderer.group.add(newMesh);

      fadeInMaterial(newMaterial);

      renderer.mesh = newMesh;
      renderer.material = newMaterial;

      const switchTime = performance.now() - t0;
      onLoad(newTerrain, renderer);
    });
  });

  return { currentLevel: 'medium', vertexCount: Math.floor(vertexCount * 0.3), switchTime: 0 };
}
