import * as THREE from 'three';
import { RootNode, updateNodeWaterContent, getNodesByType } from './rootSystem';

const WATER_MOLECULE_RADIUS = 0.05;
const FALL_SPEED = 0.5;
const MAX_WATER_MOLECULES = 500;
const INITIAL_WATER_COUNT = 200;

export interface WaterSystem {
  molecules: THREE.Mesh[];
  group: THREE.Group;
  timeScale: number;
  totalAbsorbedWheat: number;
  totalAbsorbedCorn: number;
  absorptionCountWheat: number;
  absorptionCountCorn: number;
  soilDryness: number;
}

export function createWaterSystem(
  scene: THREE.Scene
): WaterSystem {
  const group = new THREE.Group();
  const molecules: THREE.Mesh[] = [];

  for (let i = 0; i < INITIAL_WATER_COUNT; i++) {
    const molecule = createWaterMolecule();
    molecules.push(molecule);
    group.add(molecule);
  }

  scene.add(group);

  return {
    molecules,
    group,
    timeScale: 1,
    totalAbsorbedWheat: 0,
    totalAbsorbedCorn: 0,
    absorptionCountWheat: 0,
    absorptionCountCorn: 0,
    soilDryness: 0,
  };
}

function createWaterMolecule(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(WATER_MOLECULE_RADIUS, 6, 6);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00BFFF,
    transparent: true,
    opacity: 0.5,
  });
  const molecule = new THREE.Mesh(geometry, material);

  molecule.position.set(
    (Math.random() - 0.5) * 11,
    -Math.random() * 7.5 - 0.2,
    (Math.random() - 0.5) * 11
  );

  const velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.1,
    -FALL_SPEED * (0.8 + Math.random() * 0.4),
    (Math.random() - 0.5) * 0.1
  );
  (molecule as any).velocity = velocity;

  return molecule;
}

export function updateWater(
  system: WaterSystem,
  delta: number,
  rootNodes: RootNode[],
  soilMaterial: THREE.MeshPhongMaterial
): void {
  const scaledDelta = delta * system.timeScale;
  const wheatNodes = getNodesByType(rootNodes, 'wheat');
  const cornNodes = getNodesByType(rootNodes, 'corn');

  system.absorptionCountWheat = 0;
  system.absorptionCountCorn = 0;

  for (let i = system.molecules.length - 1; i >= 0; i--) {
    const molecule = system.molecules[i];
    const velocity = (molecule as any).velocity as THREE.Vector3;

    molecule.position.add(velocity.clone().multiplyScalar(scaledDelta));

    if (molecule.position.y < -7.8) {
      resetMolecule(molecule);
      continue;
    }

    let absorbed = false;
    const allNodes = molecule.position.x < 0 ? wheatNodes : cornNodes;

    for (const node of allNodes) {
      const distance = molecule.position.distanceTo(node.position);
      if (distance < 0.25) {
        absorbed = true;
        updateNodeWaterContent(node, 1);
        
        if (node.plantType === 'wheat') {
          system.totalAbsorbedWheat += 1;
          system.absorptionCountWheat += 1;
        } else {
          system.totalAbsorbedCorn += 1;
          system.absorptionCountCorn += 1;
        }

        break;
      }
    }

    if (absorbed) {
      resetMolecule(molecule);
    }
  }

  const totalAbsorbed = system.totalAbsorbedWheat + system.totalAbsorbedCorn;
  system.soilDryness = Math.min(1, totalAbsorbed / 3000);
  updateSoilColor(soilMaterial, system.soilDryness);
}

function resetMolecule(molecule: THREE.Mesh): void {
  molecule.position.set(
    (Math.random() - 0.5) * 11,
    -0.1,
    (Math.random() - 0.5) * 11
  );
  const velocity = (molecule as any).velocity as THREE.Vector3;
  velocity.set(
    (Math.random() - 0.5) * 0.1,
    -FALL_SPEED * (0.8 + Math.random() * 0.4),
    (Math.random() - 0.5) * 0.1
  );
}

function updateSoilColor(
  material: THREE.MeshPhongMaterial,
  dryness: number
): void {
  const wetColor = new THREE.Color(0x4E342E);
  const dryColor = new THREE.Color(0xA1887F);
  
  const currentColor = wetColor.clone().lerp(dryColor, dryness);
  material.color.copy(currentColor);
}

export function setTimeScale(system: WaterSystem, scale: number): void {
  system.timeScale = scale;
}

export function addWaterMolecules(
  system: WaterSystem,
  count: number
): void {
  const newCount = Math.min(
    count,
    MAX_WATER_MOLECULES - system.molecules.length
  );

  for (let i = 0; i < newCount; i++) {
    const molecule = createWaterMolecule();
    system.molecules.push(molecule);
    system.group.add(molecule);
  }
}
