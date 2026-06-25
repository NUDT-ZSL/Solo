import * as THREE from 'three';

interface BuildingConfig {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: number;
  type: 'box' | 'cylinder' | 'pyramid';
}

const BUILDING_CONFIGS: BuildingConfig[] = [
  {
    position: [-40, 0, -30],
    width: 30,
    depth: 30,
    height: 100,
    color: 0xe0e0e0,
    type: 'box',
  },
  {
    position: [40, 0, -40],
    width: 24,
    depth: 24,
    height: 120,
    color: 0xd7cdc7,
    type: 'cylinder',
  },
  {
    position: [-50, 0, 40],
    width: 35,
    depth: 25,
    height: 70,
    color: 0xc9b8a8,
    type: 'box',
  },
  {
    position: [50, 0, 35],
    width: 28,
    depth: 28,
    height: 50,
    color: 0xbcaaa4,
    type: 'pyramid',
  },
  {
    position: [0, 0, 0],
    width: 40,
    depth: 35,
    height: 85,
    color: 0xa1887f,
    type: 'box',
  },
  {
    position: [-30, 0, 50],
    width: 20,
    depth: 20,
    height: 65,
    color: 0xd1c4c0,
    type: 'cylinder',
  },
  {
    position: [30, 0, -5],
    width: 25,
    depth: 22,
    height: 90,
    color: 0xbfb0a5,
    type: 'box',
  },
];

function createBuilding(config: BuildingConfig): THREE.Group {
  const group = new THREE.Group();
  const { position, width, depth, height, color, type } = config;

  let geometry: THREE.BufferGeometry;
  if (type === 'cylinder') {
    geometry = new THREE.CylinderGeometry(
      width / 2,
      width / 2,
      height,
      32
    );
  } else if (type === 'pyramid') {
    geometry = new THREE.ConeGeometry(width / 2, height, 4);
  } else {
    geometry = new THREE.BoxGeometry(width, height, depth);
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, height / 2, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (type === 'box' && height > 60) {
    const antennaGeom = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0x757575,
      roughness: 0.5,
      metalness: 0.8,
    });
    const antenna = new THREE.Mesh(antennaGeom, antennaMat);
    antenna.position.set(0, height + 4, 0);
    antenna.castShadow = true;
    group.add(antenna);
  }

  if (type === 'box') {
    const windowRows = Math.floor(height / 8);
    const windowCols = Math.floor(width / 6);
    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < windowCols; c++) {
        const wGeom = new THREE.PlaneGeometry(2.5, 3.5);
        const isLit = Math.random() > 0.3;
        const wMat = new THREE.MeshStandardMaterial({
          color: isLit ? 0xfff8e1 : 0x90a4ae,
          emissive: isLit ? 0x332200 : 0x000000,
          roughness: 0.3,
          metalness: 0.6,
        });
        const wMesh = new THREE.Mesh(wGeom, wMat);
        const xPos = -width / 2 + 4 + c * 6;
        const yPos = 6 + r * 8;
        wMesh.position.set(xPos, yPos, depth / 2 + 0.1);
        group.add(wMesh);

        const wMeshBack = wMesh.clone();
        wMeshBack.position.set(xPos, yPos, -depth / 2 - 0.1);
        wMeshBack.rotation.y = Math.PI;
        group.add(wMeshBack);
      }
    }
  }

  group.position.set(position[0], position[1], position[2]);

  return group;
}

export function createBuildings(): THREE.Group {
  const cityGroup = new THREE.Group();
  for (const config of BUILDING_CONFIGS) {
    const building = createBuilding(config);
    cityGroup.add(building);
  }
  return cityGroup;
}

export function createGround(): THREE.Group {
  const groundGroup = new THREE.Group();

  const groundGeom = new THREE.PlaneGeometry(400, 400);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x37474f,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  groundGroup.add(ground);

  const gridSize = 400;
  const gridStep = 10;
  const gridDivisions = gridSize / gridStep;

  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x000000, 0x000000);
  const gridMaterial = (gridHelper.material as THREE.Material);
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.25;
  gridHelper.position.y = 0.01;
  groundGroup.add(gridHelper);

  return groundGroup;
}
