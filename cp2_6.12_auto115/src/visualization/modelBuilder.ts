import * as THREE from 'three';
import type { Building, Tree, StreetLight, RoofType } from '../experiment/types';

export function createBuildingMesh(building: Building): THREE.Group {
  const group = new THREE.Group();
  group.name = `building-${building.id}`;
  group.userData = { buildingId: building.id, originalData: building };

  const wallGeometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(building.color),
    roughness: 0.8,
    metalness: 0.1,
  });
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.castShadow = true;
  walls.receiveShadow = true;
  walls.name = 'walls';
  group.add(walls);

  const roof = createRoof(building.roofType, building.width, building.depth, building.roofColor || building.color);
  roof.position.y = building.height / 2;
  roof.castShadow = true;
  roof.name = 'roof';
  group.add(roof);

  group.position.set(...building.position);
  return group;
}

function createRoof(type: RoofType, width: number, depth: number, color: string): THREE.Mesh {
  const roofColor = new THREE.Color(color).multiplyScalar(0.7);
  const material = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.9,
    metalness: 0.05,
  });

  switch (type) {
    case 'flat': {
      const geo = new THREE.BoxGeometry(width * 1.05, 0.2, depth * 1.05);
      return new THREE.Mesh(geo, material);
    }
    case 'gable': {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(0, heightForRoof(width, depth));
      shape.lineTo(width / 2, 0);
      shape.lineTo(-width / 2, 0);

      const extrudeSettings = { depth: depth * 1.05, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.translate(0, 0, -depth * 1.05 / 2);
      return new THREE.Mesh(geo, material);
    }
    case 'hip': {
      const group = new THREE.Group() as unknown as THREE.Mesh;
      const hipHeight = heightForRoof(width, depth) * 0.7;

      const frontShape = new THREE.Shape();
      frontShape.moveTo(-width / 2, 0);
      frontShape.lineTo(-width * 0.3, hipHeight);
      frontShape.lineTo(width * 0.3, hipHeight);
      frontShape.lineTo(width / 2, 0);
      frontShape.lineTo(-width / 2, 0);

      const frontExtrude = { depth: depth * 0.45, bevelEnabled: false };
      const frontGeo = new THREE.ExtrudeGeometry(frontShape, frontExtrude);
      frontGeo.translate(0, 0, -depth * 0.45 / 2);
      const front = new THREE.Mesh(frontGeo, material);
      (group as unknown as THREE.Group).add(front);

      const sideShape = new THREE.Shape();
      sideShape.moveTo(-depth / 2, 0);
      sideShape.lineTo(0, hipHeight);
      sideShape.lineTo(depth / 2, 0);
      sideShape.lineTo(-depth / 2, 0);

      const sideExtrude = { depth: width * 0.6, bevelEnabled: false };
      const sideGeo = new THREE.ExtrudeGeometry(sideShape, sideExtrude);
      sideGeo.rotateY(Math.PI / 2);
      sideGeo.translate(0, 0, -width * 0.6 / 2);
      const side = new THREE.Mesh(sideGeo, material);
      (group as unknown as THREE.Group).add(side);

      return group;
    }
    case 'dome': {
      const geo = new THREE.SphereGeometry(Math.min(width, depth) * 0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      return new THREE.Mesh(geo, material);
    }
    case 'traditional': {
      const group = new THREE.Group() as unknown as THREE.Mesh;

      const baseGeo = new THREE.BoxGeometry(width * 1.15, 0.3, depth * 1.15);
      const base = new THREE.Mesh(baseGeo, material);
      (group as unknown as THREE.Group).add(base);

      const topShape = new THREE.Shape();
      topShape.moveTo(-width * 0.55, 0);
      topShape.lineTo(-width * 0.35, 1.2);
      topShape.lineTo(width * 0.35, 1.2);
      topShape.lineTo(width * 0.55, 0);
      topShape.lineTo(-width * 0.55, 0);

      const topExtrude = { depth: depth * 0.95, bevelEnabled: false };
      const topGeo = new THREE.ExtrudeGeometry(topShape, topExtrude);
      topGeo.translate(0, 0.15, -depth * 0.95 / 2);
      const top = new THREE.Mesh(topGeo, material);
      (group as unknown as THREE.Group).add(top);

      return group;
    }
  }
}

function heightForRoof(width: number, depth: number): number {
  return Math.min(width, depth) * 0.35 + 0.5;
}

export function createTreeMesh(tree: Tree): THREE.Group {
  const group = new THREE.Group();
  group.name = `tree-${tree.id}`;
  group.userData = { treeId: tree.id, baseScale: tree.scale, targetScale: tree.scale };

  const trunkHeight = 2 * tree.scale;
  const trunkGeo = new THREE.CylinderGeometry(0.15 * tree.scale, 0.2 * tree.scale, trunkHeight, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tree.trunkColor || '#8B4513'),
    roughness: 0.95,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.name = 'trunk';
  group.add(trunk);

  const foliageRadius = 1.2 * tree.scale;
  const foliageGeo = new THREE.SphereGeometry(foliageRadius, 12, 8);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tree.foliageColor || '#228B22'),
    roughness: 0.85,
  });
  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.y = trunkHeight + foliageRadius * 0.6;
  foliage.castShadow = true;
  foliage.name = 'foliage';
  group.add(foliage);

  group.position.set(...tree.position);
  return group;
}

export function createStreetLightMesh(light: StreetLight): THREE.Group {
  const group = new THREE.Group();
  group.name = `light-${light.id}`;
  group.userData = { lightId: light.id };

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, light.height, 8);
  const poleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2F2F2F'),
    roughness: 0.6,
    metalness: 0.3,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = light.height / 2;
  pole.castShadow = true;
  pole.name = 'pole';
  group.add(pole);

  const armGeo = new THREE.BoxGeometry(1, 0.08, 0.08);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.5, light.height - 0.3, 0);
  arm.name = 'arm';
  group.add(arm);

  const lampGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lampMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(light.color || '#FFFACD'),
    emissive: new THREE.Color(light.color || '#FFFACD'),
    emissiveIntensity: 0.5,
  });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(1, light.height - 0.3, 0);
  lamp.name = 'lamp';
  group.add(lamp);

  const pointLight = new THREE.PointLight(
    new THREE.Color(light.color || '#FFFACD'),
    light.intensity || 1.0,
    15
  );
  pointLight.position.set(1, light.height - 0.3, 0);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = 512;
  pointLight.shadow.mapSize.height = 512;
  pointLight.name = 'pointLight';
  group.add(pointLight);

  group.position.set(...light.position);
  return group;
}

export function createGround(width: number, length: number, color: string): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, length);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.9,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  return ground;
}

export function createStreetGrid(width: number, length: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'streetGrid';

  const material = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.3 });

  const halfW = width / 2;
  const halfL = length / 2;

  for (let i = -halfW; i <= halfW; i += 5) {
    const points = [new THREE.Vector3(i, 0.01, -halfL), new THREE.Vector3(i, 0.01, halfL)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }

  for (let i = -halfL; i <= halfL; i += 5) {
    const points = [new THREE.Vector3(-halfW, 0.01, i), new THREE.Vector3(halfW, 0.01, i)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }

  return group;
}

export function createStreetSceneGroup(
  buildings: Building[],
  trees: Tree[],
  lights: StreetLight[],
  groundWidth: number,
  groundLength: number,
  groundColor: string
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'streetScene';

  const ground = createGround(groundWidth, groundLength, groundColor);
  group.add(ground);

  const grid = createStreetGrid(groundWidth, groundLength);
  group.add(grid);

  const buildingsGroup = new THREE.Group();
  buildingsGroup.name = 'buildings';
  buildings.forEach(b => buildingsGroup.add(createBuildingMesh(b)));
  group.add(buildingsGroup);

  const treesGroup = new THREE.Group();
  treesGroup.name = 'trees';
  trees.forEach(t => treesGroup.add(createTreeMesh(t)));
  group.add(treesGroup);

  const lightsGroup = new THREE.Group();
  lightsGroup.name = 'streetLights';
  lights.forEach(l => lightsGroup.add(createStreetLightMesh(l)));
  group.add(lightsGroup);

  return group;
}

export function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = new THREE.Color(colorA);
  const b = new THREE.Color(colorB);
  const result = new THREE.Color().lerpColors(a, b, Math.max(0, Math.min(1, t)));
  return '#' + result.getHexString();
}
