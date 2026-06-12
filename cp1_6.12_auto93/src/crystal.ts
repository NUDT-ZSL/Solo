import * as THREE from 'three';

export interface CrystalClusterData {
  id: string;
  streak: number;
  colorTheme: string;
  group: THREE.Group;
  mainBody: THREE.Mesh;
  mainTip: THREE.Mesh;
  smallCrystals: THREE.Mesh[];
  lightBand: THREE.Mesh | null;
}

const MAIN_RADIUS = 0.15;
const MAIN_INITIAL_HEIGHT = 0.5;
const MAX_HEIGHT = 3.5;
const GROWTH_PER_DAY = 0.08;
const TIP_HEIGHT_RATIO = 0.4;

function streakToHeight(streak: number): number {
  return Math.min(MAIN_INITIAL_HEIGHT + streak * GROWTH_PER_DAY, MAX_HEIGHT);
}

function streakToColor(streak: number): THREE.Color {
  if (streak <= 0) {
    return new THREE.Color().setHSL(0, 0, 0.45);
  }

  if (streak <= 7) {
    const t = streak / 7;
    const h = THREE.MathUtils.lerp(0, 0.75, t);
    const s = THREE.MathUtils.lerp(0, 0.75, t);
    const l = THREE.MathUtils.lerp(0.45, 0.55, t);
    return new THREE.Color().setHSL(h, s, l);
  }

  if (streak <= 30) {
    const t = (streak - 7) / 23;
    const h = THREE.MathUtils.lerp(0.75, 0.12, t);
    const s = THREE.MathUtils.lerp(0.75, 0.9, t);
    const l = THREE.MathUtils.lerp(0.55, 0.65, t);
    return new THREE.Color().setHSL(h, s, l);
  }

  return new THREE.Color().setHSL(0.12, 0.9, 0.7);
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
  const bodyHeight = streakToHeight(streak);
  const tipHeight = bodyHeight * TIP_HEIGHT_RATIO;

  const bodyGeom = new THREE.CylinderGeometry(
    MAIN_RADIUS,
    MAIN_RADIUS * 1.1,
    bodyHeight,
    6,
    1,
    false
  );
  const bodyMat = createCrystalMaterial(color);
  const mainBody = new THREE.Mesh(bodyGeom, bodyMat);
  mainBody.position.y = bodyHeight / 2;
  mainBody.userData.part = 'mainBody';
  group.add(mainBody);

  const tipGeom = new THREE.ConeGeometry(MAIN_RADIUS, tipHeight, 6, 1, false);
  const tipMat = createCrystalMaterial(color.clone().offsetHSL(0, 0, 0.1));
  const mainTip = new THREE.Mesh(tipGeom, tipMat);
  mainTip.position.y = bodyHeight + tipHeight / 2;
  mainTip.userData.part = 'mainTip';
  group.add(mainTip);

  const smallCrystals: THREE.Mesh[] = [];
  const smallCount = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < smallCount; i++) {
    const angle = (i / smallCount) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 0.2 + Math.random() * 0.15;
    const sHeight = 0.2 + Math.random() * 0.2;
    const sRadius = 0.05 + Math.random() * 0.04;

    const sGeom = new THREE.ConeGeometry(sRadius, sHeight, 3, 1, false);
    const sColor = color.clone().offsetHSL(
      Math.random() * 0.05 - 0.025,
      Math.random() * 0.1 - 0.05,
      Math.random() * 0.1 - 0.05
    );
    const sMat = createCrystalMaterial(sColor);
    const sMesh = new THREE.Mesh(sGeom, sMat);

    const tiltX = (Math.random() - 0.5) * 0.4;
    const tiltZ = (Math.random() - 0.5) * 0.4;
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
    MAIN_RADIUS * 1.3,
    MAIN_RADIUS * 1.3,
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
    group.scale.set(0.01, 0.01, 0.01);
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
    mainBody,
    mainTip,
    smallCrystals,
    lightBand,
  };
}

export function updateCrystalHeight(cluster: CrystalClusterData, streak: number): void {
  cluster.streak = streak;
  const newHeight = streakToHeight(streak);
  const tipHeight = newHeight * TIP_HEIGHT_RATIO;

  cluster.mainBody.geometry.dispose();
  cluster.mainBody.geometry = new THREE.CylinderGeometry(
    MAIN_RADIUS,
    MAIN_RADIUS * 1.1,
    newHeight,
    6,
    1,
    false
  );
  cluster.mainBody.position.y = newHeight / 2;

  cluster.mainTip.geometry.dispose();
  cluster.mainTip.geometry = new THREE.ConeGeometry(MAIN_RADIUS, tipHeight, 6, 1, false);
  cluster.mainTip.position.y = newHeight + tipHeight / 2;

  if (cluster.lightBand) {
    cluster.lightBand.geometry.dispose();
    cluster.lightBand.geometry = new THREE.CylinderGeometry(
      MAIN_RADIUS * 1.3,
      MAIN_RADIUS * 1.3,
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

  const bodyMat = cluster.mainBody.material as THREE.MeshPhysicalMaterial;
  bodyMat.color.copy(color);

  const tipMat = cluster.mainTip.material as THREE.MeshPhysicalMaterial;
  tipMat.color.copy(color.clone().offsetHSL(0, 0, 0.1));

  cluster.smallCrystals.forEach((sc) => {
    const mat = sc.material as THREE.MeshPhysicalMaterial;
    mat.color.copy(
      color.clone().offsetHSL(
        Math.random() * 0.05 - 0.025,
        Math.random() * 0.1 - 0.05,
        Math.random() * 0.1 - 0.05
      )
    );
  });
}

export function getStreakColor(streak: number): string {
  const color = streakToColor(streak);
  return '#' + color.getHexString();
}
