import * as THREE from 'three';

function addEdgeOutline(mesh: THREE.Mesh): void {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.8 });
  const lineSegments = new THREE.LineSegments(edges, lineMat);
  mesh.add(lineSegments);
}

function createMesh(geometry: THREE.BufferGeometry, color: string): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addEdgeOutline(mesh);
  return mesh;
}

function createTrilobite(): THREE.Group {
  const group = new THREE.Group();
  const head = createMesh(new THREE.SphereGeometry(1, 16, 12), '#8B6914');
  head.scale.set(0.6, 0.4, 0.5);
  head.position.z = -0.7;
  group.add(head);
  const thorax = createMesh(new THREE.SphereGeometry(1, 16, 12), '#8B6914');
  thorax.scale.set(0.8, 0.3, 0.6);
  thorax.position.z = 0;
  group.add(thorax);
  const pygidium = createMesh(new THREE.SphereGeometry(1, 16, 12), '#8B6914');
  pygidium.scale.set(0.5, 0.3, 0.5);
  pygidium.position.z = 0.65;
  group.add(pygidium);
  return group;
}

function createAmmonite(): THREE.Group {
  const group = new THREE.Group();
  const shell = createMesh(new THREE.TorusGeometry(1, 0.3, 16, 100), '#DEB887');
  shell.scale.set(0.9, 0.9, 0.6);
  group.add(shell);
  return group;
}

function createOrthoceras(): THREE.Group {
  const group = new THREE.Group();
  const cone = createMesh(new THREE.ConeGeometry(0.3, 3, 8), '#4A4A4A');
  cone.rotation.z = Math.PI;
  group.add(cone);
  return group;
}

function createCoral(): THREE.Group {
  const group = new THREE.Group();
  const positions: [number, number, number][] = [
    [0, 0, 0],
    [0.22, 0, 0],
    [-0.22, 0, 0],
    [0.11, 0, 0.19],
    [-0.11, 0, 0.19],
    [0.11, 0, -0.19],
    [-0.11, 0, -0.19],
  ];
  for (const [x, y, z] of positions) {
    const cyl = createMesh(new THREE.CylinderGeometry(0.1, 0.15, 1, 6), '#FF6B6B');
    cyl.position.set(x, y, z);
    group.add(cyl);
  }
  return group;
}

function createBatbug(): THREE.Group {
  const group = new THREE.Group();
  const body = createMesh(new THREE.SphereGeometry(0.8, 8, 4), '#5C4033');
  body.scale.set(1, 0.2, 0.8);
  group.add(body);
  const leftWing = createMesh(new THREE.ConeGeometry(0.3, 0.6, 4), '#5C4033');
  leftWing.rotation.z = Math.PI / 2;
  leftWing.position.x = -0.7;
  leftWing.position.y = 0;
  group.add(leftWing);
  const rightWing = createMesh(new THREE.ConeGeometry(0.3, 0.6, 4), '#5C4033');
  rightWing.rotation.z = -Math.PI / 2;
  rightWing.position.x = 0.7;
  rightWing.position.y = 0;
  group.add(rightWing);
  return group;
}

function createLingula(): THREE.Group {
  const group = new THREE.Group();
  const topValve = createMesh(new THREE.SphereGeometry(0.6, 8, 4), '#6B8E23');
  topValve.scale.set(1, 0.15, 0.7);
  topValve.position.y = 0.05;
  group.add(topValve);
  const bottomValve = createMesh(new THREE.SphereGeometry(0.6, 8, 4), '#6B8E23');
  bottomValve.scale.set(1, 0.15, 0.7);
  bottomValve.position.y = -0.05;
  group.add(bottomValve);
  return group;
}

function createCalamites(): THREE.Group {
  const group = new THREE.Group();
  const stem = createMesh(new THREE.CylinderGeometry(0.2, 0.2, 2.5, 12), '#556B2F');
  group.add(stem);
  const ringPositions = [-0.8, -0.3, 0.2, 0.7];
  for (const yPos of ringPositions) {
    const ring = createMesh(new THREE.TorusGeometry(0.25, 0.03, 8, 16), '#556B2F');
    ring.position.y = yPos;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  return group;
}

function createLepidodendron(): THREE.Group {
  const group = new THREE.Group();
  const trunk = createMesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), '#2F4F2F');
  group.add(trunk);
  const bumpPositions: [number, number, number][] = [
    [0.35, 0.8, 0],
    [-0.35, 0.3, 0.1],
    [0.3, -0.2, -0.15],
    [-0.38, -0.7, 0.05],
    [0.33, -1.1, 0.12],
    [-0.3, 1.2, -0.1],
  ];
  for (const [x, y, z] of bumpPositions) {
    const bump = createMesh(new THREE.BoxGeometry(0.1, 0.15, 0.08), '#2F4F2F');
    bump.position.set(x, y, z);
    bump.rotation.y = Math.atan2(z, x);
    group.add(bump);
  }
  return group;
}

function createCordaites(): THREE.Group {
  const group = new THREE.Group();
  const stem = createMesh(new THREE.BoxGeometry(0.15, 2.5, 0.05), '#6B8E23');
  group.add(stem);
  const leaf1 = createMesh(new THREE.BoxGeometry(0.8, 1.5, 0.02), '#6B8E23');
  leaf1.position.set(0.5, 0.3, 0);
  leaf1.rotation.z = 0.15;
  group.add(leaf1);
  const leaf2 = createMesh(new THREE.BoxGeometry(0.8, 1.5, 0.02), '#6B8E23');
  leaf2.position.set(-0.5, 0.3, 0);
  leaf2.rotation.z = -0.15;
  group.add(leaf2);
  return group;
}

function createSphenophyllum(): THREE.Group {
  const group = new THREE.Group();
  const stem = createMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), '#3CB371');
  group.add(stem);
  const leafAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
  for (let i = 0; i < leafAngles.length; i++) {
    const leaf = createMesh(new THREE.ConeGeometry(0.2, 0.5, 4), '#3CB371');
    leaf.rotation.z = -Math.PI / 2;
    leaf.rotation.y = leafAngles[i];
    leaf.position.y = i % 2 === 0 ? 0.3 : -0.3;
    const dist = 0.35;
    leaf.position.x = Math.cos(leafAngles[i]) * dist;
    leaf.position.z = Math.sin(leafAngles[i]) * dist;
    group.add(leaf);
  }
  return group;
}

function createPetrifiedwood(): THREE.Group {
  const group = new THREE.Group();
  const outer = createMesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 16), '#CF8A2E');
  group.add(outer);
  const inner = createMesh(new THREE.CylinderGeometry(0.35, 0.35, 2.01, 16), '#B5781F');
  group.add(inner);
  return group;
}

function createMammothtusk(): THREE.Group {
  const group = new THREE.Group();
  const tusk = createMesh(new THREE.TorusGeometry(1.2, 0.15, 16, 32, Math.PI), '#FFFFF0');
  tusk.rotation.y = Math.PI / 2;
  group.add(tusk);
  return group;
}

export function createFossilModel(modelType: string): THREE.Group {
  let group: THREE.Group;

  switch (modelType) {
    case 'trilobite':
      group = createTrilobite();
      break;
    case 'ammonite':
      group = createAmmonite();
      break;
    case 'orthoceras':
      group = createOrthoceras();
      break;
    case 'coral':
      group = createCoral();
      break;
    case 'batbug':
      group = createBatbug();
      break;
    case 'lingula':
      group = createLingula();
      break;
    case 'calamites':
      group = createCalamites();
      break;
    case 'lepidodendron':
      group = createLepidodendron();
      break;
    case 'cordaites':
      group = createCordaites();
      break;
    case 'sphenophyllum':
      group = createSphenophyllum();
      break;
    case 'petrifiedwood':
      group = createPetrifiedwood();
      break;
    case 'mammothtusk':
      group = createMammothtusk();
      break;
    default:
      group = new THREE.Group();
  }

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 2) {
    const scale = 2 / maxDim;
    group.scale.set(scale, scale, scale);
  }

  box.setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);

  return group;
}

export default createFossilModel;
