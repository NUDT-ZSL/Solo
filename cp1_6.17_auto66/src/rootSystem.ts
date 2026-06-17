import * as THREE from 'three';

export interface RootNode {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  children: RootNode[];
  parent: RootNode | null;
  waterContent: number;
  capillaryCount: number;
  plantType: 'wheat' | 'corn';
  baseColor: THREE.Color;
  depth: number;
}

export interface RootSystem {
  nodes: RootNode[];
  group: THREE.Group;
  wheatTotalWater: number;
  cornTotalWater: number;
  wheatAbsorptionRate: number;
  cornAbsorptionRate: number;
  updateAbsorptionRate: () => void;
}

const NODE_RADIUS = 0.15;
const CONNECTOR_RADIUS = 0.05;
const WHEAT_COLOR = new THREE.Color(0x8B5E3C);
const CORN_COLOR = new THREE.Color(0x2E8B57);

let nodeIdCounter = 0;
let lastWheatAbsorption = 0;
let lastCornAbsorption = 0;

export function addRoots(scene: THREE.Scene): RootSystem {
  const group = new THREE.Group();
  const nodes: RootNode[] = [];

  const wheatNodes = generateWheatRoots(-3, 0, 0);
  const cornNodes = generateCornRoots(3, 0, 0);

  nodes.push(...wheatNodes, ...cornNodes);

  wheatNodes.forEach(node => group.add(node.mesh));
  cornNodes.forEach(node => group.add(node.mesh));

  addConnectors(group, wheatNodes);
  addConnectors(group, cornNodes);

  scene.add(group);

  return {
    nodes,
    group,
    wheatTotalWater: 0,
    cornTotalWater: 0,
    wheatAbsorptionRate: 0,
    cornAbsorptionRate: 0,
    updateAbsorptionRate: () => {
      const wheatWater = wheatNodes.reduce((sum, n) => sum + n.waterContent, 0);
      const cornWater = cornNodes.reduce((sum, n) => sum + n.waterContent, 0);
      
      (window as any)._rootSystem = {
        ...((window as any)._rootSystem || {}),
        wheatAbsorptionRate: wheatWater - lastWheatAbsorption,
        cornAbsorptionRate: cornWater - lastCornAbsorption,
        wheatTotalWater: wheatWater,
        cornTotalWater: cornWater,
      };
      
      lastWheatAbsorption = wheatWater;
      lastCornAbsorption = cornWater;
    },
  };
}

function generateWheatRoots(x: number, y: number, z: number): RootNode[] {
  const nodes: RootNode[] = [];
  const maxDepth = 6;
  const levels = 5;

  const rootNode = createNode(x, y, z, WHEAT_COLOR, 'wheat', 0);
  nodes.push(rootNode);

  let currentLevel: RootNode[] = [rootNode];
  
  for (let level = 1; level <= levels; level++) {
    const nextLevel: RootNode[] = [];
    const depthFraction = level / levels;
    const yPos = y - maxDepth * depthFraction;

    currentLevel.forEach((parent) => {
      const lateralCount = level === 1 ? 3 : Math.floor(2 + Math.random() * 3);
      
      for (let i = 0; i < lateralCount; i++) {
        const angle = (i / lateralCount) * Math.PI * 2 + Math.random() * 0.5;
        const horizontalSpread = level < 3 ? 0.8 : 1.5;
        const spread = horizontalSpread * (1 - depthFraction * 0.7);
        const offsetX = Math.cos(angle) * spread * (0.5 + Math.random() * 0.5);
        const offsetZ = Math.sin(angle) * spread * (0.5 + Math.random() * 0.5);

        const child = createNode(
          parent.position.x + offsetX,
          yPos + (Math.random() - 0.5) * 0.3,
          parent.position.z + offsetZ,
          WHEAT_COLOR,
          'wheat',
          level
        );
        child.parent = parent;
        parent.children.push(child);
        nodes.push(child);
        nextLevel.push(child);
      }

      if (level <= levels - 1) {
        const mainChild = createNode(
          parent.position.x + (Math.random() - 0.5) * 0.2,
          yPos - maxDepth / levels + (Math.random() - 0.5) * 0.2,
          parent.position.z + (Math.random() - 0.5) * 0.2,
          WHEAT_COLOR,
          'wheat',
          level
        );
        mainChild.parent = parent;
        parent.children.push(mainChild);
        nodes.push(mainChild);
        nextLevel.push(mainChild);
      }
    });

    currentLevel = nextLevel;
  }

  return nodes;
}

function generateCornRoots(x: number, y: number, z: number): RootNode[] {
  const nodes: RootNode[] = [];
  const maxDepth = 3;
  const levels = 4;

  const rootNode = createNode(x, y, z, CORN_COLOR, 'corn', 0);
  nodes.push(rootNode);

  let currentLevel: RootNode[] = [rootNode];

  for (let level = 1; level <= levels; level++) {
    const nextLevel: RootNode[] = [];
    const depthFraction = level / levels;
    const yPos = y - maxDepth * depthFraction;

    currentLevel.forEach((parent) => {
      const lateralCount = level === 1 ? 5 : Math.floor(3 + Math.random() * 4);
      
      for (let i = 0; i < lateralCount; i++) {
        const angle = (i / lateralCount) * Math.PI * 2 + Math.random() * 0.3;
        const horizontalSpread = 2.5;
        const spread = horizontalSpread * depthFraction * 1.5;
        const offsetX = Math.cos(angle) * spread * (0.7 + Math.random() * 0.6);
        const offsetZ = Math.sin(angle) * spread * (0.7 + Math.random() * 0.6);

        const child = createNode(
          parent.position.x + offsetX,
          yPos + (Math.random() - 0.5) * 0.3,
          parent.position.z + offsetZ,
          CORN_COLOR,
          'corn',
          level
        );
        child.parent = parent;
        parent.children.push(child);
        nodes.push(child);
        nextLevel.push(child);
      }

      if (level <= levels - 2) {
        const mainChild = createNode(
          parent.position.x + (Math.random() - 0.5) * 0.3,
          yPos - maxDepth / levels * 0.8 + (Math.random() - 0.5) * 0.2,
          parent.position.z + (Math.random() - 0.5) * 0.3,
          CORN_COLOR,
          'corn',
          level
        );
        mainChild.parent = parent;
        parent.children.push(mainChild);
        nodes.push(mainChild);
        nextLevel.push(mainChild);
      }
    });

    currentLevel = nextLevel;
  }

  return nodes;
}

function createNode(
  x: number,
  y: number,
  z: number,
  color: THREE.Color,
  plantType: 'wheat' | 'corn',
  depth: number
): RootNode {
  const geometry = new THREE.SphereGeometry(NODE_RADIUS, 12, 12);
  const material = new THREE.MeshPhongMaterial({
    color: color.clone(),
    emissive: color.clone().multiplyScalar(0.1),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;

  const node: RootNode = {
    id: `node_${nodeIdCounter++}`,
    position: mesh.position,
    mesh,
    children: [],
    parent: null,
    waterContent: 10 + Math.random() * 20,
    capillaryCount: Math.floor(3 + Math.random() * 8),
    plantType,
    baseColor: color.clone(),
    depth,
  };

  (mesh as any).rootNode = node;

  return node;
}

function addConnectors(group: THREE.Group, nodes: RootNode[]): void {
  nodes.forEach((node) => {
    if (node.parent) {
      const start = node.parent.position;
      const end = node.position;
      const distance = start.distanceTo(end);

      const geometry = new THREE.CylinderGeometry(
        CONNECTOR_RADIUS,
        CONNECTOR_RADIUS,
        distance,
        8
      );
      const material = new THREE.MeshPhongMaterial({
        color: node.baseColor,
      });
      const connector = new THREE.Mesh(geometry, material);

      const midPoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);
      connector.position.copy(midPoint);

      connector.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3().subVectors(end, start).normalize()
      );

      group.add(connector);
    }
  });
}

export function highlightRoot(node: RootNode): void {
  const nodesToHighlight: RootNode[] = [];
  
  const collectChildren = (n: RootNode, level: number) => {
    if (level > 2) return;
    nodesToHighlight.push(n);
    n.children.forEach((child) => collectChildren(child, level + 1));
  };
  
  collectChildren(node, 0);

  nodesToHighlight.forEach((n) => {
    const material = n.mesh.material as THREE.MeshPhongMaterial;
    const originalEmissiveIntensity = material.emissiveIntensity;
    
    material.emissiveIntensity = 1.5;
    material.emissive = n.baseColor.clone().multiplyScalar(0.5);

    setTimeout(() => {
      material.emissiveIntensity = originalEmissiveIntensity;
      material.emissive = n.baseColor.clone().multiplyScalar(0.1);
    }, 1500);
  });
}

export function updateNodeWaterContent(node: RootNode, amount: number): void {
  node.waterContent = Math.min(100, node.waterContent + amount);
  
  const material = node.mesh.material as THREE.MeshPhongMaterial;
  const saturationBoost = node.waterContent / 100 * 0.3;
  const brightenedColor = node.baseColor.clone();
  brightenedColor.offsetHSL(0, saturationBoost, saturationBoost * 0.3);
  material.color.copy(brightenedColor);
}

export function getNodesByType(nodes: RootNode[], type: 'wheat' | 'corn'): RootNode[] {
  return nodes.filter((n) => n.plantType === type);
}
