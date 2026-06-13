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
  lineObject: THREE.LineSegments;
  group: THREE.Group;
}

const CONSTELLATION_DATA: ConstellationData[] = [
  {
    name: 'Ursa Major',
    nameZh: '大熊座',
    starCount: 7,
    bestSeason: 'spring',
    mythStory: '宙斯爱上了美丽的仙女卡利斯托，将她化为大熊放在天上保护。北斗七星就是她的尾巴和腰身，在春季夜空中最为明亮醒目。',
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
    mythStory: '猎人俄里翁被毒蝎蛰死后被宙斯升上天空成为星座。腰带上的三颗亮星是他的腰带，左右两肩和两膝构成他雄壮的身躯。',
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
    mythStory: '埃塞俄比亚王后卡西奥佩亚因自负被罚永远在天空旋转。五颗亮星组成的"W"或"M"形就是她坐在王座上的形象。',
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
    mythStory: '宙斯化身天鹅去接近斯巴达王后勒达。十字形的亮星结构犹如一只展翅飞翔的天鹅，天津四是他高高翘起的尾部。',
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
    mythStory: '大力神赫拉克勒斯完成十二项功绩后被升入星空。虽然没有特别明亮的星，但他拱顶石般的梯形结构（Keystone）很容易辨认。',
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
    mythStory: '俄耳甫斯的竖琴，他的音乐能让万物动容。最亮的织女星就是琴弦顶端的明珠，与周围四颗星组成精巧的小菱形。',
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
const NON_SEASON_OPACITY = 0.2;

function createGlowTexture(colorHex: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(0.3, colorHex);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let constellationGroups: ConstellationGroup[] = [];
let currentSeason: Season = 'summer';
let selectedConstellation: ConstellationGroup | null = null;
let onConstellationSelect: ((data: ConstellationData | null) => void) | null = null;
let onRipple: (() => void) | null = null;
let hoveredMesh: THREE.Mesh | null = null;

const textureCache = new Map<string, THREE.Texture>();
function getCachedGlowTexture(colorHex: string): THREE.Texture {
  if (!textureCache.has(colorHex)) {
    textureCache.set(colorHex, createGlowTexture(colorHex));
  }
  return textureCache.get(colorHex)!;
}

function createStarMesh(pos: [number, number, number]): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(STAR_BASE_RADIUS * 0.5, 20, 20);
  const material = new THREE.MeshBasicMaterial({
    color: STAR_DEFAULT_COLOR,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.userData.currentScale = 1;
  mesh.userData.targetScale = 1;
  mesh.userData.isConstellationStar = true;
  return mesh;
}

function createGlowSprite(pos: [number, number, number]): THREE.Sprite {
  const texture = getCachedGlowTexture('#60a5fa');
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
  sprite.userData.currentGlowScale = STAR_BASE_RADIUS;
  sprite.userData.targetGlowScale = STAR_BASE_RADIUS;
  return sprite;
}

function createConstellationLines(data: ConstellationData): THREE.LineSegments {
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
  onSelect: (data: ConstellationData | null) => void,
  rippleCb: () => void
): ConstellationGroup[] {
  onConstellationSelect = onSelect;
  onRipple = rippleCb;

  constellationGroups = CONSTELLATION_DATA.map((data) => {
    const group = new THREE.Group();
    group.userData.constellationName = data.nameZh;

    const starMeshes: THREE.Mesh[] = [];
    data.stars.forEach((pos) => {
      const mesh = createStarMesh(pos);
      const glow = createGlowSprite(pos);
      mesh.userData.glowSprite = glow;
      mesh.userData.constellationName = data.nameZh;
      mesh.userData.constellationIndex = constellationGroups.length;
      starMeshes.push(mesh);
      group.add(mesh);
      group.add(glow);
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
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const glow = mesh.userData.glowSprite as THREE.Sprite;
      const glowMat = glow.material as THREE.SpriteMaterial;

      if (mesh === hoveredMesh) {
        mesh.userData.targetScale = STAR_HOVER_RADIUS / STAR_BASE_RADIUS;
        mat.color.setHex(STAR_HOVER_COLOR);
        mat.opacity = 1;
        mesh.userData.glowSprite.userData.targetGlowScale = STAR_HOVER_RADIUS;
        glowMat.map = getCachedGlowTexture('#ffffff');
        glowMat.opacity = 1;
        continue;
      }

      if (isSeasonal) {
        mesh.userData.targetScale = STAR_SEASON_RADIUS / STAR_BASE_RADIUS;
        mat.color.setHex(STAR_SEASON_COLOR);
        mat.opacity = 1;
        glow.userData.targetGlowScale = STAR_SEASON_RADIUS;
        glowMat.map = getCachedGlowTexture('#fbbf24');
        glowMat.opacity = 1;
      } else {
        mesh.userData.targetScale = 1;
        mat.color.setHex(STAR_DEFAULT_COLOR);
        mat.opacity = NON_SEASON_OPACITY;
        glow.userData.targetGlowScale = STAR_BASE_RADIUS;
        glowMat.map = getCachedGlowTexture('#60a5fa');
        glowMat.opacity = NON_SEASON_OPACITY * 0.9;
      }
      glowMat.needsUpdate = true;
    }

    const lineMat = cg.lineObject.material as THREE.LineBasicMaterial;
    if (isSeasonal) {
      lineMat.color.setHex(LINE_SEASON_COLOR);
      lineMat.opacity = 0.95;
    } else {
      lineMat.color.setHex(LINE_DEFAULT_COLOR);
      lineMat.opacity = NON_SEASON_OPACITY * 0.7;
    }
  }
}

function getAllStarMeshes(): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  for (const cg of constellationGroups) {
    result.push(...cg.starMeshes);
  }
  return result;
}

function findConstellationByName(name: string): ConstellationGroup | undefined {
  return constellationGroups.find((cg) => cg.data.nameZh === name);
}

export function handleHover(raycaster: THREE.Raycaster): void {
  if (!constellationGroups.length) return;

  const allMeshes = getAllStarMeshes();
  const intersects = raycaster.intersectObjects(allMeshes, false);

  if (hoveredMesh) {
    const mat = hoveredMesh.material as THREE.MeshBasicMaterial;
    const glow = hoveredMesh.userData.glowSprite as THREE.Sprite;
    const glowMat = glow.material as THREE.SpriteMaterial;
    const cg = findConstellationByName(hoveredMesh.userData.constellationName);
    const isSeasonal = cg ? cg.data.bestSeason === currentSeason : false;

    if (isSeasonal) {
      hoveredMesh.userData.targetScale = STAR_SEASON_RADIUS / STAR_BASE_RADIUS;
      mat.color.setHex(STAR_SEASON_COLOR);
      mat.opacity = 1;
      glow.userData.targetGlowScale = STAR_SEASON_RADIUS;
      glowMat.map = getCachedGlowTexture('#fbbf24');
      glowMat.opacity = 1;
    } else {
      hoveredMesh.userData.targetScale = 1;
      mat.color.setHex(STAR_DEFAULT_COLOR);
      mat.opacity = NON_SEASON_OPACITY;
      glow.userData.targetGlowScale = STAR_BASE_RADIUS;
      glowMat.map = getCachedGlowTexture('#60a5fa');
      glowMat.opacity = NON_SEASON_OPACITY * 0.9;
    }
    glowMat.needsUpdate = true;
    hoveredMesh = null;
  }

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    if (mesh.userData.isConstellationStar) {
      hoveredMesh = mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const glow = mesh.userData.glowSprite as THREE.Sprite;
      const glowMat = glow.material as THREE.SpriteMaterial;
      mesh.userData.targetScale = STAR_HOVER_RADIUS / STAR_BASE_RADIUS;
      mat.color.setHex(STAR_HOVER_COLOR);
      mat.opacity = 1;
      glow.userData.targetGlowScale = STAR_HOVER_RADIUS;
      glowMat.map = getCachedGlowTexture('#ffffff');
      glowMat.opacity = 1;
      glowMat.needsUpdate = true;
      document.body.style.cursor = 'pointer';
      return;
    }
  }

  document.body.style.cursor = 'default';
}

export function handleClick(raycaster: THREE.Raycaster): void {
  if (!constellationGroups.length) return;

  const allMeshes = getAllStarMeshes();
  const intersects = raycaster.intersectObjects(allMeshes, false);

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object as THREE.Mesh;
    const cName = clickedMesh.userData.constellationName;
    const cg = findConstellationByName(cName);
    if (cg) {
      selectedConstellation = cg;
      onConstellationSelect?.(cg.data);
      onRipple?.();
      return;
    }
  }
}

export function updateAnimations(): void {
  for (const mesh of constellationGroups.flatMap((cg) => cg.starMeshes)) {
    const current = mesh.userData.currentScale as number;
    const target = mesh.userData.targetScale as number;
    const diff = target - current;
    if (Math.abs(diff) > 0.001) {
      const newScale = current + diff * 0.15;
      mesh.userData.currentScale = newScale;
      mesh.scale.setScalar(newScale);
    }
    const glow = mesh.userData.glowSprite as THREE.Sprite;
    if (glow) {
      const gCur = glow.userData.currentGlowScale as number;
      const gTgt = glow.userData.targetGlowScale as number;
      const gDiff = gTgt - gCur;
      if (Math.abs(gDiff) > 0.001) {
        const gNew = gCur + gDiff * 0.15;
        glow.userData.currentGlowScale = gNew;
        glow.scale.set(gNew, gNew, 1);
      }
    }
  }
}
