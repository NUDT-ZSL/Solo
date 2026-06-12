import * as THREE from 'three';
import type { Building, Tree, StreetLight, RoofType } from '../experiment/types';

export function createBuildingMesh(building: Building): THREE.Group {
  const group = new THREE.Group();
  group.name = `building-${building.id}`;
  group.userData = { buildingId: building.id };

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
    case 'slant': {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(0, 1.5);
      shape.lineTo(width / 2, 0);
      shape.lineTo(-width / 2, 0);

      const extrudeSettings = { depth: depth * 1.05, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.translate(0, 0, -depth * 1.05 / 2);
      return new THREE.Mesh(geo, material);
    }
    case 'dome': {
      const geo = new THREE.SphereGeometry(Math.min(width, depth) * 0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      return new THREE.Mesh(geo, material);
    }
    case 'traditional': {
      const group = new THREE.Group();

      const baseGeo = new THREE.BoxGeometry(width * 1.15, 0.3, depth * 1.15);
      const base = new THREE.Mesh(baseGeo, material);
      group.add(base);

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
      group.add(top);

      return group as unknown as THREE.Mesh;
    }
  }
}

export function createTreeMesh(tree: Tree): THREE.Group {
  const group = new THREE.Group();
  group.name = `tree-${tree.id}`;
  group.userData = { treeId: tree.id, baseScale: tree.scale };

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

  const