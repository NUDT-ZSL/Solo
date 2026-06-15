import * as THREE from 'three';

export interface CrystalClusterData {
  id: string;
  streak: number;
  colorTheme: string;
  group: THREE.Group;
  mainCrystal: THREE.Mesh;
  smallCrystals: THREE.Mesh[];
  lightBand: THREE.Mesh | null;
}

const MAIN_BOTTOM_RADIUS = 0.2;
const MAIN_INITIAL_HEIGHT = 0.5;
const MAX_HEIGHT = 3.5;
const GROWTH_PER_DAY = 0.08;

function streakToHeight(streak: number): number {
  return Math.min(MAIN_INITIAL_HEIGHT + streak * GROWTH_PER_DAY, MAX_HEIGHT);
}

function streakToColor(streak: number): THREE.Color {
  const hPurple = 270 / 360;
  const hGold = 50 / 360 + 1;

  if (streak <= 0) {
    return new THREE.Color().setHSL(0, 0, 0.5);
  }

  if (streak <= 7) {
    const t = streak / 7;
    const s = THREE.MathUtils.lerp(0, 1, t);
    const l = 0.5;
    return new THREE.Color().setHSL(hPurple, s, l);
  }

  const t = Math.min((streak - 7) / 23, 1);
  const h = THREE.MathUtils.lerp(hPurple, hGold, t) % 1;
  const s = 1.0;
  const l = THREE.MathUtils.lerp(0.5, 0.6, t);
  return new THREE.Color().setHSL(h, s, l);
}

function createCrystalMaterial(color: THREE.Color): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    transparent: true,
    opacity: 0.88,
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
}

function createLightBandMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: color.clone().multiplyScalar(2),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createCrystalCluster(
  streak: number,
  colorTheme: string,
  animated = false
): CrystalClusterData {
  const id = Math.random().toString(36).substring(2, 10);
  const group = new THREE.Group();
  group.userData.clusterId = id;

  const color = streakToColor(streak);
  const height = streakToHeight(streak);

  const mainGeom = new THREE.CylinderGeometry(
    0,
    MAIN_BOTTOM_RADIUS,
    height,
    6,
    1,
    false
  );
  const mainMat = createCrystalMaterial(color);
  const mainCrystal = new THREE.Mesh(mainGeom, mainMat);
  mainCrystal.position.y = height / 2;
  mainCrystal.userData.part = 'mainCrystal';
  group.add(mainCrystal);

  const smallCrystals: THREE.Mesh[] = [];
  const smallCount = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < smallCount; i++) {
    const angle = (i / smallCount) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 0.18 + Math.random() * 0.12;
    const sHeight = 0.2 + Math.random() * 0.2;
    const sRadius = 0.05 + Math.random() * 0.04;

    const sGeom = new THREE.CylinderGeometry(0, sRadius, sHeight, 3, 1, false);
    const sColor = color.clone().offsetHSL(
      Math.random() * 0.04 - 0.02,
      Math.random() * 0.08 - 0.04,
      Math.random() * 0.08 - 0.04
    );
    const sMat = createCrystalMaterial(sColor);
    const sMesh = new THREE.Mesh(sGeom, sMat);

    const tiltX = (Math.random() - 0.5) * 0.35;
    const tiltZ = (Math.random() - 0.5) * 0.35;
    sMesh.rotation.set(tiltX, angle, tiltZ);
    sMesh.position.set(
      Math.cos(angle) * dist,
      sHeight / 2,
      Math.sin(angle) * dist
    );
    sMesh.userData.part = 'smallCrystal';
    group.add(sMesh);
    smallCrystals.push(sMesh);
  }

  const bandGeom = new THREE.CylinderGeometry(
    MAIN_BOTTOM_RADIUS * 1.3,
    MAIN_BOTTOM_RADIUS * 1.3,
    0.08,
    6,
    1,
    true
  );
  const bandMat = createLightBandMaterial(color);
  const lightBand = new THREE.Mesh(bandGeom, bandMat);
  lightBand.position.y = 0;
  lightBand.visible = false;
  lightBand.userData.part = 'lightBand';
  group.add(lightBand);

  if (animated) {
    group.scale.set(0.6, 0.05, 0.6);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part !== 'lightBand') {
        const mat = child.material as THREE.MeshPhysicalMaterial;
        mat.opacity = 0;
      }
    });
  }

  return {
    id,
    streak,
    colorTheme,
    group,
    mainCrystal,
    smallCrystals,
    lightBand,
  };
}

export function updateCrystalHeight(cluster: CrystalClusterData, streak: number): void {
  cluster.streak = streak;
  const newHeight = streakToHeight(streak);

  cluster.mainCrystal.geometry.dispose();
  cluster.mainCrystal.geometry = new THREE.CylinderGeometry(
    0,
    MAIN_BOTTOM_RADIUS,
    newHeight,
    6,
    1,
    false
  );
  cluster.mainCrystal.position.y = newHeight / 2;

  if (cluster.lightBand) {
    cluster.lightBand.geometry.dispose();
    cluster.lightBand.geometry = new THREE.CylinderGeometry(
      MAIN_BOTTOM_RADIUS * 1.3,
      MAIN_BOTTOM_RADIUS * 1.3,
      0.08,
      6,
      1,
      true
    );
  }

  updateCrystalColor(cluster, streak);
}

export function updateCrystalColor(cluster: CrystalClusterData, streak: number): void {
  const color = streakToColor(streak);

  const mainMat = cluster.mainCrystal.material as THREE.MeshPhysicalMaterial;
  mainMat.color.copy(color);

  cluster.smallCrystals.forEach((sc) => {
    const mat = sc.material as THREE.MeshPhysicalMaterial;
    mat.color.copy(
      color.clone().offsetHSL(
        Math.random() * 0.04 - 0.02,
        Math.random() * 0.08 - 0.04,
        Math.random() * 0.08 - 0.04
      )
    );
  });
}

export function getStreakColor(streak: number): string {
  const color = streakToColor(streak);
  return '#' + color.getHexString();
}

export function getMainHeight(cluster: CrystalClusterData): number {
  return cluster.mainCrystal.position.y * 2;
}
