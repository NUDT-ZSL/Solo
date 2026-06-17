import * as THREE from 'three';
import { Plant from './apiService';
import { getPlants } from './apiService';

const modelCache: Map<string, THREE.Group> = new Map();
let plantsData: Plant[] = [];

export async function loadPlantsData(): Promise<Plant[]> {
  if (plantsData.length === 0) {
    plantsData = await getPlants();
  }
  return plantsData;
}

export function getPlantData(plantId: string): Plant | undefined {
  return plantsData.find(p => p.id === plantId);
}

export function createPlantModel(plantId: string, potColor: string, scale: number = 1): THREE.Group {
  const cacheKey = `${plantId}_${potColor}_${scale}`;
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!.clone();
  }

  const plantData = getPlantData(plantId);
  if (!plantData) {
    return new THREE.Group();
  }

  const group = new THREE.Group();
  const heightScale = scale * (plantData.defaultHeight / 100);

  const pot = createPot(potColor, heightScale);
  group.add(pot);

  let foliage: THREE.Group;
  switch (plantData.modelType) {
    case 'succulent':
      foliage = createSucculent(plantData.color, heightScale);
      break;
    case 'fern':
      foliage = createFern(plantData.color, heightScale);
      break;
    case 'monstera':
      foliage = createMonstera(plantData.color, heightScale);
      break;
    case 'cactus':
      foliage = createCactus(plantData.color, heightScale);
      break;
    case 'rose':
      foliage = createRose(plantData.color, heightScale);
      break;
    case 'lavender':
      foliage = createLavender(plantData.color, heightScale);
      break;
    default:
      foliage = createGenericPlant(plantData.color, heightScale);
  }

  foliage.position.y = heightScale * 0.4;
  group.add(foliage);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  modelCache.set(cacheKey, group.clone());
  return group;
}

function createPot(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();

  const potGeo = new THREE.CylinderGeometry(0.25 * scale, 0.2 * scale, 0.4 * scale, 8);
  const potMat = new THREE.MeshLambertMaterial({ color: color });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.2 * scale;
  group.add(pot);

  const soilGeo = new THREE.CircleGeometry(0.22 * scale, 8);
  const soilMat = new THREE.MeshLambertMaterial({ color: '#5d4037 });
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.38 * scale;
  group.add(soil);

  return group;
}

function createSucculent(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshLambertMaterial({ color });

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const leafGeo = new THREE.SphereGeometry(0.12 * scale, 6, 4);
    leafGeo.scale(1, 0.6, 0.5);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(
      Math.cos(angle) * 0.1 * scale,
      0.1 * scale + Math.sin(i * 0.5) * 0.05 * scale,
      Math.sin(angle) * 0.1 * scale
    );
    leaf.rotation.y = angle;
    leaf.rotation.z = 0.3;
    group.add(leaf);
  }

  const centerGeo = new THREE.SphereGeometry(0.08 * scale, 6, 4);
  const center = new THREE.Mesh(centerGeo, leafMat);
  center.position.y = 0.15 * scale;
  group.add(center);

  return group;
}

function createFern(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshLambertMaterial({ color });

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const leafGroup = new THREE.Group();
    
    const leafGeo = new THREE.BoxGeometry(0.02 * scale, 0.3 * scale, 0.08 * scale);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = 0.15 * scale;
    leafGroup.add(leaf);

    for (let j = 0; j < 5; j++) {
      const subLeafGeo = new THREE.BoxGeometry(0.06 * scale, 0.01 * scale, 0.02 * scale);
      const subLeaf1 = new THREE.Mesh(subLeafGeo, leafMat);
      subLeaf1.position.set(0.04 * scale, 0.05 * scale + j * 0.05 * scale, 0);
      leafGroup.add(subLeaf1);
      const subLeaf2 = new THREE.Mesh(subLeafGeo, leafMat);
      subLeaf2.position.set(-0.04 * scale, 0.05 * scale + j * 0.05 * scale, 0);
      leafGroup.add(subLeaf2);
    }

    leafGroup.position.set(
      Math.cos(angle) * 0.05 * scale,
      0,
      Math.sin(angle) * 0.05 * scale
    );
    leafGroup.rotation.y = angle;
    leafGroup.rotation.z = 0.2 + Math.random() * 0.2;
    group.add(leafGroup);
  }

  return group;
}

function createMonstera(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshLambertMaterial({ color });
  const stemMat = new THREE.MeshLambertMaterial({ color: '#5d4037 });

  const stemGeo = new THREE.CylinderGeometry(0.02 * scale, 0.03 * scale, 0.3 * scale, 6);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.15 * scale;
  group.add(stem);

  const leafPositions = [
    { x: 0.1, y: 0.35, z: 0, rotY: 0, rotZ: -0.3 },
    { x: -0.12, y: 0.3, z: 0.05, rotY: 0.5, rotZ: 0.2 },
    { x: 0.05, y: 0.25, z: -0.1, rotY: -0.8, rotZ: -0.1 },
    { x: -0.08, y: 0.4, z: -0.05, rotY: 1.2, rotZ: 0.3 }
  ];

  leafPositions.forEach((pos) => {
    const leafGeo = new THREE.CircleGeometry(0.15 * scale, 8);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
    leaf.rotation.y = pos.rotY;
    leaf.rotation.z = pos.rotZ;
    group.add(leaf);
  });

  return group;
}

function createCactus(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const cactusMat = new THREE.MeshLambertMaterial({ color });

  const mainGeo = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.4 * scale, 8);
  const main = new THREE.Mesh(mainGeo, cactusMat);
  main.position.y = 0.2 * scale;
  group.add(main);

  const arm1Geo = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.15 * scale, 6);
  const arm1 = new THREE.Mesh(arm1Geo, cactusMat);
  arm1.position.set(0.12 * scale, 0.25 * scale, 0);
  arm1.rotation.z = -0.5;
  group.add(arm1);

  const arm2Geo = new THREE.CylinderGeometry(0.035 * scale, 0.045 * scale, 0.12 * scale, 6);
  const arm2 = new THREE.Mesh(arm2Geo, cactusMat);
  arm2.position.set(-0.1 * scale, 0.18 * scale, 0.05 * scale);
  arm2.rotation.z = 0.6;
  arm2.rotation.y = 0.3;
  group.add(arm2);

  return group;
}

function createRose(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const leafMat = new THREE.MeshLambertMaterial({ color: '#2e7d32' });
  const flowerMat = new THREE.MeshLambertMaterial({ color });
  const stemMat = new THREE.MeshLambertMaterial({ color: '#33691e' });

  const stemGeo = new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.35 * scale, 6);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.175 * scale;
  group.add(stem);

  const leafPositions = [
    { x: 0.06, y: 0.15, z: 0, rotY: 0 },
    { x: -0.05, y: 0.2, z: 0.02, rotY: 0.8 }
  ];

  leafPositions.forEach((pos) => {
    const leafGeo = new THREE.SphereGeometry(0.05 * scale, 5, 3);
    leafGeo.scale(1.5, 0.3, 1);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
    leaf.rotation.y = pos.rotY;
    group.add(leaf);
  });

  const flowerGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const petalGeo = new THREE.SphereGeometry(0.06 * scale, 6, 4);
    petalGeo.scale(1, 0.5, 0.8);
    const petal = new THREE.Mesh(petalGeo, flowerMat);
    const angle = (i / 5) * Math.PI * 2;
    petal.position.set(
      Math.cos(angle) * 0.04 * scale,
      0.02 * scale,
      Math.sin(angle) * 0.04 * scale
    );
    petal.rotation.y = angle;
    flowerGroup.add(petal);
  }

  const centerGeo = new THREE.SphereGeometry(0.04 * scale, 6, 4);
  const center = new THREE.Mesh(centerGeo, new THREE.MeshLambertMaterial({ color: '#ffeb3b' }));
  flowerGroup.add(center);

  flowerGroup.position.y = 0.38 * scale;
  group.add(flowerGroup);

  return group;
}

function createLavender(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshLambertMaterial({ color: '#7cb342' });
  const flowerMat = new THREE.MeshLambertMaterial({ color });

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const stemGroup = new THREE.Group();

    const stemGeo = new THREE.CylinderGeometry(0.008 * scale, 0.01 * scale, 0.25 * scale, 4);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.125 * scale;
    stemGroup.add(stem);

    for (let j = 0; j < 6; j++) {
      const floretGeo = new THREE.SphereGeometry(0.025 * scale, 4, 3);
      const floret = new THREE.Mesh(floretGeo, flowerMat);
      floret.position.y = 0.2 * scale + j * 0.03 * scale;
      floret.scale.set(
        0.8 - j * 0.1,
        1,
        0.8 - j * 0.1
      );
      stemGroup.add(floret);
    }

    stemGroup.position.set(
      Math.cos(angle) * 0.06 * scale,
      0,
      Math.sin(angle) * 0.06 * scale
    );
    stemGroup.rotation.z = 0.1 + Math.random() * 0.1;
    group.add(stemGroup);
  }

  return group;
}

function createGenericPlant(color: string, scale: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const geo = new THREE.SphereGeometry(0.15 * scale, 8, 6);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.15 * scale;
  group.add(mesh);
  return group;
}

export function createPlantThumbnail(plantId: string): string {
  const plantData = getPlantData(plantId);
  if (!plantData) return '';
  
  const canvas = document.createElement('canvas');
  canvas.width = 90;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const centerX = 45;
  const centerY = 45;

  ctx.beginPath();
  ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#16213e';
  ctx.fill();

  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.moveTo(30, 60);
  ctx.lineTo(60, 60);
  ctx.lineTo(55, 75);
  ctx.lineTo(35, 75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = plantData.color;
  
  switch (plantData.modelType) {
    case 'succulent':
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * 12;
        const y = centerY - 5 + Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 10, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(centerX, centerY - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cactus':
      ctx.fillRect(38, 25, 14, 35);
      ctx.fillRect(52, 35, 10, 15);
      ctx.fillRect(28, 30, 10, 12);
      break;
    case 'rose':
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(43, 35, 4, 30);
      ctx.fillStyle = plantData.color;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(centerX + Math.cos(angle) * 8, 30 + Math.sin(angle) * 6, 7, 9, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(centerX, 30, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(centerX, centerY - 5, 20, 0, Math.PI * 2);
      ctx.fill();
  }

  return canvas.toDataURL();
}
