import * as THREE from 'three';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ConstellationData {
  name: string;
  nameZh: string;
  brightStarCount: number;
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
    brightStarCount: 7,
    bestSeason: 'spring',
    mythStory: '众神之王宙斯被凡人少女卡利斯托的美貌深深吸引，常常化为人形与她相伴。不久后卡利斯托生下了儿子阿卡斯，宙斯的妻子赫拉得知后妒火中烧，将卡利斯托变成了一只皮毛粗糙的大熊。多年后阿卡斯长大成人成为一名出色的猎人，一次狩猎中他遇见了化作大熊的母亲，正要举矛刺向她时宙斯及时出现，将他们母子一同升上天空化为大熊座和小熊座。',
    stars: [
      [60, 120, -80], [40, 100, -60], [20, 85, -50], [5, 70, -40],
      [-15, 65, -30], [-30, 75, -45], [-10, 90, -55],
    ],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]],
  },
  {
    name: 'Orion',
    nameZh: '猎户座',
    brightStarCount: 7,
    bestSeason: 'winter',
    mythStory: '海神波塞冬与欧律阿勒之子俄里翁是世间最勇猛的猎人，他夸口自己能杀死地上所有的野兽，这番狂言惹怒了大地女神盖亚。盖亚派出一只巨大的毒蝎悄悄偷袭，俄里翁被毒针刺中脚踝后毒发身亡。宙斯为纪念这位伟大的猎人将他升上天空成为猎户座，而毒蝎也被升为天蝎座，两个星座永远分居天空两侧，彼此永不相见。',
    stars: [
      [-80, -30, 60], [-60, -50, 40], [-70, -70, 50],
      [-90, -90, 55], [-50, -90, 35], [-65, -110, 45], [-85, -120, 50],
    ],
    connections: [[0,1],[1,2],[2,3],[2,4],[3,5],[4,5],[5,6]],
  },
  {
    name: 'Cassiopeia',
    nameZh: '仙后座',
    brightStarCount: 5,
    bestSeason: 'autumn',
    mythStory: '埃塞俄比亚国王克甫斯有一位美丽但极度虚荣的王后卡西奥佩亚，她当众宣称自己和女儿安德洛墨达比海中的所有仙女还要美丽。这番话触怒了海神波塞冬的妻子安菲特里忒，波塞冬为报复派出海怪刻托蹂躏埃塞俄比亚海岸。绝望的国王献祭女儿安德洛墨达后才平息神怒，而卡西奥佩亚则被缚在王座上升入天空，永远倒挂旋转作为惩罚。',
    stars: [
      [30, 160, 30], [50, 140, 20], [70, 155, 25], [90, 135, 15], [110, 150, 20],
    ],
    connections: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    name: 'Cygnus',
    nameZh: '天鹅座',
    brightStarCount: 6,
    bestSeason: 'summer',
    mythStory: '众神之王宙斯倾慕斯巴达王后勒达的绝世容颜已久，一日趁勒达在欧罗塔斯河沐浴时，他化身为一只羽毛洁白的温柔天鹅缓缓靠近。勒达被这只优雅的天鹅打动，将它紧紧拥入怀中。后来勒达生下了两枚神奇的天鹅蛋，每枚蛋中各孕育了一对双胞胎，其中便有日后引发特洛伊战争的绝代美人海伦。天鹅座便是宙斯化身的那只天鹅升上天空后的形象。',
    stars: [
      [-100, 80, -120], [-85, 60, -110], [-70, 40, -100],
      [-115, 55, -115], [-55, 55, -105], [-85, 20, -95],
    ],
    connections: [[0,1],[1,2],[1,3],[1,4],[2,5]],
  },
  {
    name: 'Hercules',
    nameZh: '武仙座',
    brightStarCount: 7,
    bestSeason: 'summer',
    mythStory: '宙斯与底比斯王后阿尔克墨涅的私生子赫拉克勒斯，从出生起就背负着天后赫拉的无尽诅咒。赫拉让他在疯狂中亲手杀死了自己的妻儿，清醒后的赫拉克勒斯为赎罪接受了十二项不可能完成的试炼。他斩杀了九头蛇许德拉、生擒了地狱恶犬刻耳柏洛斯、取回了赫斯珀里得斯的金苹果，最终以凡人之躯完成了神都难以企及的功绩。死后宙斯感念他的英勇，将他升为天空中的武仙座。',
    stars: [
      [-140, 50, 80], [-120, 35, 70], [-100, 45, 75],
      [-130, 20, 65], [-110, 15, 60], [-150, 30, 85], [-105, 55, 90],
    ],
    connections: [[0,1],[1,2],[1,3],[3,4],[0,5],[2,6],[1,6]],
  },
  {
    name: 'Lyra',
    nameZh: '天琴座',
    brightStarCount: 5,
    bestSeason: 'summer',
    mythStory: '色雷斯国王俄耳甫斯拥有一把由阿波罗亲手赠予的黄金竖琴，他的琴声能让奔流的河水驻足、凶猛的野兽俯首帖耳、甚至连岩石都会为之动容。他的妻子欧律狄刻在新婚之日不慎被毒蛇咬死，俄耳甫斯悲痛欲绝，抱着竖琴勇闯冥府。冥王被他凄美的琴声打动，破例允许他带妻子还阳，但要求他在走出冥界前绝不能回头。然而就在出口前的最后一步，俄耳甫斯忍不住回头确认妻子是否跟随，最终永远失去了她。他死后竖琴被宙斯升上天空成为天琴座。',
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

const TWEEN_DURATION = 300;

type Tween = {
  startTime: number;
  duration: number;
  from: number;
  to: number;
  onUpdate: (v: number) => void;
  onComplete?: () => void;
  ease: (t: number) => number;
};

let tweens: Tween[] = [];

function addTween(
  from: number,
  to: number,
  duration: number,
  onUpdate: (v: number) => void,
  onComplete?: () => void
): void {
  tweens.push({
    startTime: performance.now(),
    duration,
    from,
    to,
    onUpdate,
    onComplete,
    ease: (t) => 1 - Math.pow(1 - t, 3),
  });
}

function updateTweens(): void {
  const now = performance.now();
  tweens = tweens.filter((tw) => {
    const t = Math.min((now - tw.startTime) / tw.duration, 1);
    const eased = tw.ease(t);
    const v = tw.from + (tw.to - tw.from) * eased;
    tw.onUpdate(v);
    if (t >= 1) {
      tw.onComplete?.();
      return false;
    }
    return true;
  });
}

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
  mesh.userData.currentGlowScale = STAR_BASE_RADIUS;
  mesh.userData.targetGlowScale = STAR_BASE_RADIUS;
  mesh.userData.isConstellationStar = true;
  mesh.userData.tweenScale = null as null | { from: number; to: number; start: number };
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
  });
  const ls = new THREE.LineSegments(geometry, material);
  (ls.material as THREE.LineBasicMaterial).userData.currentOpacity = 0.6;
  (ls.material as THREE.LineBasicMaterial).userData.targetOpacity = 0.6;
  return ls;
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
      starMeshes.push(mesh);
      group.add(mesh);
      group.add(glow);
    });

    const lineObject = createConstellationLines(data);
    group.add(lineObject);

    scene.add(group);

    return { data, starMeshes, lineObject, group };
  });

  updateSeason(currentSeason, true);
  return constellationGroups;
}

function applyStarState(
  mesh: THREE.Mesh,
  targetScale: number,
  colorHex: number,
  opacity: number,
  glowColor: string,
  glowScale: number,
  glowOpacity: number,
  immediate = false
): void {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  const glow = mesh.userData.glowSprite as THREE.Sprite;
  const glowMat = glow.material as THREE.SpriteMaterial;

  if (mat.color.getHex() !== colorHex) {
    mat.color.setHex(colorHex);
  }
  if (glowMat.map !== getCachedGlowTexture(glowColor)) {
    glowMat.map = getCachedGlowTexture(glowColor);
    glowMat.needsUpdate = true;
  }

  const fromScale = mesh.userData.currentScale as number;
  const toScale = targetScale;
  const fromGlow = mesh.userData.currentGlowScale as number;
  const toGlow = glowScale;
  const fromOpacity = mat.opacity;
  const toOpacity = opacity;
  const fromGlowOpacity = glowMat.opacity;
  const toGlowOpacity = glowOpacity;

  if (immediate) {
    mesh.userData.currentScale = toScale;
    mesh.scale.setScalar(toScale);
    mesh.userData.targetScale = toScale;
    mesh.userData.currentGlowScale = toGlow;
    glow.scale.set(toGlow, toGlow, 1);
    mesh.userData.targetGlowScale = toGlow;
    mat.opacity = toOpacity;
    glowMat.opacity = toGlowOpacity;
    return;
  }

  mesh.userData.targetScale = toScale;
  mesh.userData.targetGlowScale = toGlow;
  addTween(fromScale, toScale, TWEEN_DURATION, (v) => {
    mesh.userData.currentScale = v;
    mesh.scale.setScalar(v);
  });
  addTween(fromGlow, toGlow, TWEEN_DURATION, (v) => {
    mesh.userData.currentGlowScale = v;
    glow.scale.set(v, v, 1);
  });
  addTween(fromOpacity, toOpacity, TWEEN_DURATION, (v) => {
    mat.opacity = v;
  });
  addTween(fromGlowOpacity, toGlowOpacity, TWEEN_DURATION, (v) => {
    glowMat.opacity = v;
  });
}

function applyLineState(
  ls: THREE.LineSegments,
  colorHex: number,
  opacity: number,
  immediate = false
): void {
  const mat = ls.material as THREE.LineBasicMaterial;
  if (mat.color.getHex() !== colorHex) {
    mat.color.setHex(colorHex);
  }
  const from = (mat.userData.currentOpacity as number) ?? mat.opacity;
  const to = opacity;
  if (immediate) {
    mat.opacity = to;
    mat.userData.currentOpacity = to;
    mat.userData.targetOpacity = to;
    return;
  }
  mat.userData.targetOpacity = to;
  addTween(from, to, TWEEN_DURATION, (v) => {
    mat.opacity = v;
    mat.userData.currentOpacity = v;
  });
}

export function updateSeason(season: Season, immediate = false): void {
  currentSeason = season;

  for (const cg of constellationGroups) {
    const isSeasonal = cg.data.bestSeason === season;

    for (const mesh of cg.starMeshes) {
      if (mesh === hoveredMesh) continue;

      if (isSeasonal) {
        applyStarState(
          mesh,
          STAR_SEASON_RADIUS / STAR_BASE_RADIUS,
          STAR_SEASON_COLOR,
          1,
          '#fbbf24',
          STAR_SEASON_RADIUS,
          1,
          immediate
        );
      } else {
        applyStarState(
          mesh,
          1,
          STAR_DEFAULT_COLOR,
          NON_SEASON_OPACITY,
          '#60a5fa',
          STAR_BASE_RADIUS,
          NON_SEASON_OPACITY * 0.9,
          immediate
        );
      }
    }

    if (isSeasonal) {
      applyLineState(cg.lineObject, LINE_SEASON_COLOR, 0.95, immediate);
    } else {
      applyLineState(cg.lineObject, LINE_DEFAULT_COLOR, NON_SEASON_OPACITY * 0.7, immediate);
    }
  }
}

function getAllStarMeshes(): THREE.Mesh[] {
  return constellationGroups.flatMap((cg) => cg.starMeshes);
}

function findConstellationByName(name: string): ConstellationGroup | undefined {
  return constellationGroups.find((cg) => cg.data.nameZh === name);
}

export function handleHover(raycaster: THREE.Raycaster): void {
  if (!constellationGroups.length) return;

  const allMeshes = getAllStarMeshes();
  const intersects = raycaster.intersectObjects(allMeshes, false);

  if (hoveredMesh) {
    const cg = findConstellationByName(hoveredMesh.userData.constellationName);
    const isSeasonal = cg ? cg.data.bestSeason === currentSeason : false;
    if (isSeasonal) {
      applyStarState(
        hoveredMesh,
        STAR_SEASON_RADIUS / STAR_BASE_RADIUS,
        STAR_SEASON_COLOR,
        1,
        '#fbbf24',
        STAR_SEASON_RADIUS,
        1
      );
    } else {
      applyStarState(
        hoveredMesh,
        1,
        STAR_DEFAULT_COLOR,
        NON_SEASON_OPACITY,
        '#60a5fa',
        STAR_BASE_RADIUS,
        NON_SEASON_OPACITY * 0.9
      );
    }
    hoveredMesh = null;
  }

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    if (mesh.userData.isConstellationStar) {
      hoveredMesh = mesh;
      applyStarState(
        mesh,
        STAR_HOVER_RADIUS / STAR_BASE_RADIUS,
        STAR_HOVER_COLOR,
        1,
        '#ffffff',
        STAR_HOVER_RADIUS,
        1
      );
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
  updateTweens();
}
