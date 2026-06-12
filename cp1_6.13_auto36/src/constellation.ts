import * as THREE from 'three';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ConstellationData {
  name: string;
  nameZh: string;
  starCount: number;
  bestSeason: Season;
  mythStory: string;
  stars: [number, number, number][];
  connections: [number, number][];
}

export interface ConstellationGroup {
  data: ConstellationData;
  starMeshes: THREE.Mesh[];
  lineObject: THREE.Line;
  group: THREE.Group;
}

const CONSTELLATION_DATA: ConstellationData[] = [
  {
    name: 'Ursa Major',
    nameZh: '大熊座',
    starCount: 7,
    bestSeason: 'spring',
    mythStory: '宙斯爱上了美丽的仙女卡利斯托，将她化为大熊放在天上保护。',
    stars: [
      [60, 120, -80], [40, 100, -60], [20, 85, -50], [5, 70, -40],
      [-15, 65, -30], [-30, 75, -45], [-10, 90, -55],
    ],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]],
  },
  {
    name: 'Orion',
    nameZh: '猎户座',
    starCount: 7,
    bestSeason: 'winter',
    mythStory: '猎人俄里翁被毒蝎蛰死后被宙斯升上天空成为星座。',
    stars: [
      [-80, -30, 60], [-60, -50, 40], [-70, -70, 50],
      [-90, -90, 55], [-50, -90, 35], [-65, -110, 45], [-85, -120, 50],
    ],
    connections: [[0,1],[1,2],[2,3],[2,4],[3,5],[4,5],[5,6]],
  },
  {
    name: 'Cassiopeia',
    nameZh: '仙后座',
    starCount: 5,
    bestSeason: 'autumn',
    mythStory: '埃塞俄比亚王后卡西奥佩亚因自负被罚永远在天空旋转。',
    stars: [
      [30, 160, 30], [50, 140, 20], [70, 155, 25], [90, 135, 15], [110, 150, 20],
    ],
    connections: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    name: 'Cygnus',
    nameZh: '天鹅座',
    starCount: 6,
    bestSeason: 'summer',
    mythStory: '宙斯化身天鹅去接近斯巴达王后勒达。',
    stars: [
      [-100, 80, -120], [-85, 60, -110], [-70, 40, -100],
      [-115, 55, -115], [-55, 55, -105], [-85, 20, -95],
    ],
    connections: [[0,1],[1,2],[1,3],[1,4],[2,5]],
  },
  {
    name: 'Hercules',
    nameZh: '武仙座',
    starCount: 7,
    bestSeason: 'summer',
    mythStory: '大力神赫拉克勒斯完成十二项功绩后被升入星空。',
    stars: [
      [-140, 50, 80], [-120, 35, 70], [-100, 45, 75],
      [-130, 20, 65], [-110, 15, 60], [-150, 30, 85], [-105, 55, 90],
    ],
    connections: [[0,1],[1,2],[1,3],[3,4],[0,5],[2,6],[1,6]],
  },
  {
    name: 'Lyra',
    nameZh: '天琴座',
    starCount: 5,
    bestSeason: 'summer',
    mythStory: '俄耳甫斯的竖琴，他的音乐能让万物动容。',
    stars: [
      [-80, 100, -80], [-70, 85, -75], [-65, 90, -70],
      [-75, 80, -85], [-85, 88, -90],
    ],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,1]],
  },
];

const STAR_BASE_RADIUS = 6;
const STAR_HOVER_RADIUS = 8;
const STAR_SEASON_RADIUS = 10;
const LINE_DEFAULT_COLOR = 0xa5b4fc;
const LINE_SEASON_COLOR = 0xfbbf24;
const STAR_DEFAULT_COLOR = 0x60a5fa;
const STAR_HOVER_COLOR = 0xffffff;
const STAR_SEASON_COLOR = 0xfbbf24;

function createGlowTexture(color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

let constellationGroups: ConstellationGroup[] = [];
let currentSeason: Season = 'summer';
let selectedConstellation: ConstellationGroup | null = null;
let onConstellationSelect: ((data: ConstellationData | null) => void) | null = null;
let hoveredMesh: THREE.Mesh | null = null;
let sceneRef: THREE.Scene | null = null;
let ripples: { mesh: THREE.Mesh; startTime: number }[] = [];

function createStarMesh(pos: [number, number, number]): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(STAR_BASE_RADIUS * 0.15, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: STAR_DEFAULT_COLOR,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.userData.baseScale = 1;
  mesh.userData.targetScale = 1;
  mesh.userData.isConstellationStar = true;
  return mesh;
}

function createGlowSprite(pos: [number, number, number]): THREE.Sprite {
  const texture = createGlowTexture('#60a5fa');
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(pos[0], pos[1], pos[2]);
  sprite.scale.set(STAR_BASE_RADIUS, STAR_BASE_RADIUS, 1);
  sprite.userData.isGlow = true;
  return sprite;
}

function createConstellationLines(data: ConstellationData): THREE.Line {
  const points: THREE.Vector3[] = [];
  for (const [a, b] of data.connections) {
    points.push(new THREE.Vector3(...data.stars[a]));
    points.push(new THREE.Vector3(...data.stars[b]));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: LINE_DEFAULT_COLOR,
    transparent: true,
    opacity: 0.6,
    linewidth: 2,
  });
  return new THREE.LineSegments(geometry, material);
}

export function createConstellations(
  scene: THREE.Scene,
  onSelect: (data: ConstellationData | null) => void
): ConstellationGroup[] {
  sceneRef = scene;
  onConstellationSelect = onSelect;

  constellationGroups = CONSTELLATION_DATA.map((data) => {
    const group = new THREE.Group();
    group.userData.constellationName = data.nameZh;

    const starMeshes = data.stars.map((pos) => {
      const mesh = createStarMesh(pos);
      const glow = createGlowSprite(pos);
      mesh.userData.glowSprite = glow;
      mesh.userData.constellationName = data.nameZh;
      group.add(mesh);
      group.add(glow);
      return mesh;
    });

    const lineObject = createConstellationLines(data);
    group.add(lineObject);

    scene.add(group);

    return { data, starMeshes, lineObject, group };
  });

  updateSeason(currentSeason);
  return constellationGroups;
}

export function updateSeason(season: Season): void {
  currentSeason = season;

  for (const cg of constellationGroups) {
    const isSeasonal = cg.data.bestSeason === season;

    for (const mesh of cg.starMeshes) {
      const glow = mesh.userData.glowSprite as THREE.Sprite;

      if (isSeasonal) {
        mesh.userData.targetScale = STAR_SEASON_RADIUS / STAR_BASE_RADIUS;
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(STAR_SEASON_COLOR);
        if (glow) {
          glow.scale.set(STAR_SEASON_RADIUS, STAR_SEASON_RADIUS, 1);
          (glow.material as THREE.SpriteMaterial).opacity = 1;
          const tex = createGlowTexture('#fbbf24');
          (glow.material as THREE.SpriteMaterial).map = tex;
          (glow.material as THREE.SpriteMaterial).needsUpdate = true;
        }
      } else {
        mesh.userData.targetScale = 1;
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(STAR_DEFAULT_COLOR);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.2;
        if (glow) {
          glow.scale.set(STAR_BASE_RADIUS, STAR_BASE_RADIUS, 1);
          (glow.material as THREE.SpriteMaterial).opacity = 0.15;
          const tex = createGlowTexture('#60a5fa');
          (glow.material as THREE.SpriteMaterial).map = tex;
          (glow.material as THREE.SpriteMaterial).needsUpdate = true;
        }
      }
    }

    const lineMat = cg.lineObject.material as THREE.LineBasicMaterial;
    if (isSeasonal) {
      lineMat.color.setHex(LINE_SEASON_COLOR);
      lineMat.opacity = 0.9;
    } else {
      lineMat.color.setHex(LINE_DEFAULT_COLOR);
      lineMat.opacity = 0.12;
    }
  }
}

export function handleHover(raycaster: THREE.Raycaster): void {
  if (!constellationGroups.length) return;

  const allMeshes: THREE.Mesh[] = [];
  for (const cg of constellationGroups) {
    if (cg.data.bestSeason !== currentSeason) continue;
    allMeshes.push(...cg.starMeshes);
  }

  const intersects = raycaster.intersectObjects(allMeshes, false);

  if (hoveredMesh && hoveredMesh !== selectedConstellation?.starMeshes?.[0]) {
    const glow = hoveredMesh.userData.glowSprite as THREE.Sprite;
    const isSeason = hoveredMesh.userData.constellationName
      ? constellationGroups.find(
          (cg) => cg.data.nameZh === hoveredMesh.userData.constellationName
        )?.data.bestSeason === currentSeason
      : false;
    hoveredMesh.userData.targetScale = isSeason
      ? STAR_SEASON_RADIUS / STAR_BASE_RADIUS
      : 1;
    (hoveredMesh.material as THREE.MeshBasicMaterial).color.setHex(
      isSeason ? STAR_SEASON_COLOR : STAR_DEFAULT_COLOR
    );
    if (glow) (glow.material as THREE.SpriteMaterial).opacity = isSeason ? 1 : 0.8;
  }

  if (intersects.length > 0) {
    hoveredMesh = intersects[0].object as THREE.Mesh;
    hoveredMesh.userData.targetScale = STAR_HOVER_RADIUS / STAR_BASE_RADIUS;
    (hoveredMesh.material as THREE.MeshBasicMaterial).color.setHex(STAR_HOVER_COLOR);
    (hoveredMesh.material as THREE.MeshBasicMaterial).opacity = 1;
    const glow = hoveredMesh.userData.glowSprite as THREE.Sprite;
    if (glow) {
      (glow.material as THREE.SpriteMaterial).opacity = 1;
      glow.scale.set(STAR_HOVER_RADIUS, STAR_HOVER_RADIUS, 1);
    }
    document.body.style.cursor = 'pointer';
  } else {
    hoveredMesh = null;
    document.body.style.cursor = 'default';
  }
}

export function handleClick(raycaster: THREE.Raycaster): void {
  if (!constellationGroups.length) return;

  const allMeshes: THREE.Mesh[] = [];
  for (const cg of constellationGroups) {
    if (cg.data.bestSeason !== currentSeason) continue;
    allMeshes.push(...cg.starMeshes);
  }

  const intersects = raycaster.intersectObjects(allMeshes, false);

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object as THREE.Mesh;
    const cName = clickedMesh.userData.constellationName;
    const cg = constellationGroups.find((c) => c.data.nameZh === cName);
    if (cg) {
      selectedConstellation = cg;
      onConstellationSelect?.(cg.data);
      spawnRipple(clickedMesh.position.clone());
    }
  } else {
    selectedConstellation = null;
    onConstellationSelect?.(null);
  }
}

function spawnRipple(position: THREE.Vector3): void {
  const geometry = new THREE.RingGeometry(0.5, 1, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.lookAt(position.clone().multiplyScalar(2));
  sceneRef!.add(mesh);
  ripples.push({ mesh, startTime: performance.now() });
}

export function updateAnimations(): void {
  const now = performance.now();

  for (const mesh of constellationGroups.flatMap((cg) => cg.starMeshes)) {
    const current = mesh.userData.baseScale as number;
    const target = mesh.userData.targetScale as number;
    const newScale = current + (target - current) * 0.1;
    mesh.userData.baseScale = newScale;
    mesh.scale.setScalar(newScale);

    const glow = mesh.userData.glowSprite as THREE.Sprite;
    if (glow) {
      const isSeason =
        constellationGroups.find(
          (cg) => cg.data.nameZh === mesh.userData.constellationName
        )?.data.bestSeason === currentSeason;
      const baseGlow = isSeason ? STAR_SEASON_RADIUS : STAR_BASE_RADIUS;
      const targetGlow = mesh === hoveredMesh ? STAR_HOVER_RADIUS : baseGlow;
      const currentGlow = glow.scale.x;
      const newGlow = currentGlow + (targetGlow - currentGlow) * 0.1;
      glow.scale.set(newGlow, newGlow, 1);
    }
  }

  ripples = ripples.filter((ripple) => {
    const elapsed = (now - ripple.startTime) / 1000;
    if (elapsed > 0.5) {
      sceneRef!.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      (ripple.mesh.material as THREE.Material).dispose();
      return false;
    }
    const progress = elapsed / 0.5;
    const scale = progress * 80;
    ripple.mesh.scale.setScalar(scale);
    (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - progress);
    return true;
  });
}
