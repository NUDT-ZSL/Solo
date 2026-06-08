import * as THREE from 'three';

export interface ConstellationInfo {
  name: string;
  nameEn: string;
  mainStars: string[];
  mythology: string;
}

interface ConstellationData {
  info: ConstellationInfo;
  stars: { name: string; position: THREE.Vector3 }[];
  lines: [number, number][];
}

const S = 35;

const CONSTELLATIONS_DATA: ConstellationData[] = [
  {
    info: {
      name: '猎户座',
      nameEn: 'Orion',
      mainStars: ['参宿四 (Betelgeuse)', '参宿七 (Rigel)', '参宿五 (Bellatrix)', '参宿三 (Mintaka)', '参宿二 (Alnilam)', '参宿一 (Alnitak)'],
      mythology: '猎户座在希腊神话中是巨大而英俊的猎人俄里翁（Orion）。他曾夸口能杀死任何野兽，因而惹怒了大地女神盖亚，派出蝎子将他蛰死。宙斯将他升上天空成为猎户座，而蝎子则成为天蝎座，两者永远不会同时出现在天空中。猎户座最显著的特征是由三颗亮星组成的"猎户腰带"。'
    },
    stars: [
      { name: '参宿四', position: new THREE.Vector3(-S * 0.35, S * 0.55, S * 0.2) },
      { name: '参宿五', position: new THREE.Vector3(S * 0.3, S * 0.5, S * 0.15) },
      { name: '参宿七', position: new THREE.Vector3(S * 0.35, -S * 0.5, S * 0.1) },
      { name: '参宿六', position: new THREE.Vector3(-S * 0.25, -S * 0.45, S * 0.15) },
      { name: '参宿三', position: new THREE.Vector3(-S * 0.15, S * 0.05, S * 0.4) },
      { name: '参宿二', position: new THREE.Vector3(0, S * 0.05, S * 0.42) },
      { name: '参宿一', position: new THREE.Vector3(S * 0.15, S * 0.05, S * 0.4) },
      { name: '猎户星云', position: new THREE.Vector3(0, -S * 0.15, S * 0.45) }
    ],
    lines: [[0, 1], [0, 4], [1, 6], [4, 5], [5, 6], [4, 7], [6, 2], [7, 3], [2, 3]]
  },
  {
    info: {
      name: '大熊座',
      nameEn: 'Ursa Major',
      mainStars: ['天枢 (Dubhe)', '天璇 (Merak)', '天玑 (Phecda)', '天权 (Megrez)', '玉衡 (Alioth)', '开阳 (Mizar)', '摇光 (Alkaid)'],
      mythology: '大熊座在希腊神话中是美丽的少女卡利斯托（Callisto），她被宙斯所爱并生下儿子阿卡斯。天后赫拉出于嫉妒将她变成了一只大熊。多年后她的儿子在狩猎时几乎将她杀死，宙斯便将他们母子一同升上天空，成为大熊座和牧夫座中的大角星附近。大熊座中的北斗七星是北半球最容易辨认的星群。'
    },
    stars: [
      { name: '天枢', position: new THREE.Vector3(-S * 0.8, S * 0.5, -S * 0.15) },
      { name: '天璇', position: new THREE.Vector3(-S * 0.7, S * 0.2, -S * 0.1) },
      { name: '天玑', position: new THREE.Vector3(-S * 0.45, S * 0.15, -S * 0.05) },
      { name: '天权', position: new THREE.Vector3(-S * 0.35, S * 0.35, 0) },
      { name: '玉衡', position: new THREE.Vector3(-S * 0.1, S * 0.4, S * 0.05) },
      { name: '开阳', position: new THREE.Vector3(S * 0.15, S * 0.5, S * 0.05) },
      { name: '摇光', position: new THREE.Vector3(S * 0.35, S * 0.7, S * 0.1) }
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]
  },
  {
    info: {
      name: '小熊座',
      nameEn: 'Ursa Minor',
      mainStars: ['勾陈一 (Polaris 北极星)', '天枢 (Kochab)', '天璇 (Pherkad)', '天帝 (Yildun)', '北极一', '北极二'],
      mythology: '小熊座在神话中通常被认为是阿卡斯（Arcas），即卡利斯托的儿子，被宙斯升上天空以保护他的母亲。小熊座的尾巴末端就是著名的北极星（勾陈一），它几乎正好位于地球自转轴的延长线上，因此看起来是固定不动的，其他星星都围绕它旋转，自古以来就是航海者的指路明灯。'
    },
    stars: [
      { name: '勾陈一', position: new THREE.Vector3(0, S * 0.95, 0) },
      { name: '勾陈二', position: new THREE.Vector3(S * 0.08, S * 0.7, S * 0.1) },
      { name: '勾陈三', position: new THREE.Vector3(-S * 0.05, S * 0.5, S * 0.08) },
      { name: '天枢', position: new THREE.Vector3(S * 0.25, S * 0.35, S * 0.15) },
      { name: '天璇', position: new THREE.Vector3(S * 0.15, S * 0.2, S * 0.18) },
      { name: '天权', position: new THREE.Vector3(-S * 0.08, S * 0.22, S * 0.12) },
      { name: '天玑', position: new THREE.Vector3(-S * 0.18, S * 0.4, S * 0.1) }
    ],
    lines: [[0, 1], [1, 2], [2, 6], [6, 5], [5, 4], [4, 3], [3, 2]]
  },
  {
    info: {
      name: '狮子座',
      nameEn: 'Leo',
      mainStars: ['轩辕十四 (Regulus)', '五帝座一 (Denebola)', '轩辕十二 (Algieba)', '轩辕九 (Adhafera)', '轩辕十三 (Eta Leonis)'],
      mythology: '狮子座代表的是赫拉克勒斯十二功绩中杀死的尼米亚猛狮。这头狮子拥有刀枪不入的皮毛，祸害一方。赫拉克勒斯用双手将它扼死，并剥下它的皮毛作为自己的铠甲。宙斯为纪念这头巨狮的强悍，将它升上天空成为狮子座。狮子座头部的星群构成一个反写的问号或镰刀形状，非常有辨识度。'
    },
    stars: [
      { name: '轩辕十四', position: new THREE.Vector3(S * 0.5, -S * 0.15, -S * 0.5) },
      { name: '轩辕十三', position: new THREE.Vector3(S * 0.4, S * 0.05, -S * 0.55) },
      { name: '轩辕十二', position: new THREE.Vector3(S * 0.25, S * 0.2, -S * 0.55) },
      { name: '轩辕九', position: new THREE.Vector3(S * 0.1, S * 0.3, -S * 0.52) },
      { name: '轩辕八', position: new THREE.Vector3(-S * 0.05, S * 0.32, -S * 0.48) },
      { name: '西上相', position: new THREE.Vector3(-S * 0.1, S * 0.05, -S * 0.5) },
      { name: '五帝座一', position: new THREE.Vector3(-S * 0.4, -S * 0.25, -S * 0.35) },
      { name: '太微右垣五', position: new THREE.Vector3(-S * 0.25, -S * 0.05, -S * 0.45) },
      { name: '太微右垣四', position: new THREE.Vector3(S * 0.15, -S * 0.25, -S * 0.42) }
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 7], [7, 8], [8, 0], [7, 6], [6, 8]]
  },
  {
    info: {
      name: '天蝎座',
      nameEn: 'Scorpius',
      mainStars: ['心宿二 (Antares)', '尾宿八 (Shaula)', '尾宿九 (Lesath)', '房宿四 (Graffias)', '房宿三 (Dschubba)'],
      mythology: '天蝎座就是大地女神盖亚派出蛰死猎人俄里翁的那只大蝎子。由于这个神话渊源，天蝎座和猎户座永远不会同时出现在天空中——当天蝎座从东方升起时，猎户座已经从西方落下。天蝎座最亮的心宿二（Antares）是一颗红色超巨星，其名字的意思是"火星的对手"，因颜色火红常被误认为火星。'
    },
    stars: [
      { name: '房宿四', position: new THREE.Vector3(-S * 0.2, -S * 0.1, S * 0.85) },
      { name: '房宿三', position: new THREE.Vector3(-S * 0.1, -S * 0.2, S * 0.85) },
      { name: '房宿二', position: new THREE.Vector3(0, -S * 0.28, S * 0.88) },
      { name: '心宿三', position: new THREE.Vector3(S * 0.15, -S * 0.35, S * 0.88) },
      { name: '心宿二', position: new THREE.Vector3(S * 0.25, -S * 0.55, S * 0.82) },
      { name: '心宿一', position: new THREE.Vector3(S * 0.35, -S * 0.7, S * 0.75) },
      { name: '尾宿五', position: new THREE.Vector3(S * 0.5, -S * 0.8, S * 0.65) },
      { name: '尾宿六', position: new THREE.Vector3(S * 0.6, -S * 0.88, S * 0.55) },
      { name: '尾宿七', position: new THREE.Vector3(S * 0.7, -S * 0.92, S * 0.45) },
      { name: '尾宿八', position: new THREE.Vector3(S * 0.78, -S * 0.85, S * 0.3) },
      { name: '尾宿九', position: new THREE.Vector3(S * 0.82, -S * 0.78, S * 0.18) }
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]]
  }
];

const constellationLines: Map<string, THREE.LineSegments> = new Map();
const constellationHitSpheres: Map<string, { mesh: THREE.Mesh; name: string }[]> = new Map();

const DEFAULT_COLOR = new THREE.Color(0x64b4ff);
const HIGHLIGHT_COLOR = new THREE.Color(0xffff80);

export function createConstellations(scene: THREE.Scene): THREE.Object3D[] {
  const hitObjects: THREE.Object3D[] = [];

  CONSTELLATIONS_DATA.forEach((data) => {
    const positions: number[] = [];
    data.lines.forEach(([a, b]) => {
      const pa = data.stars[a].position;
      const pb = data.stars[b].position;
      positions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: DEFAULT_COLOR,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const lineSegments = new THREE.LineSegments(geometry, material);
    lineSegments.userData.constellationName = data.info.name;
    scene.add(lineSegments);
    constellationLines.set(data.info.name, lineSegments);

    const spheres: { mesh: THREE.Mesh; name: string }[] = [];
    data.stars.forEach((star) => {
      const sphereGeo = new THREE.SphereGeometry(1.8, 8, 8);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(star.position);
      sphere.userData.constellationName = data.info.name;
      sphere.userData.hittable = true;
      scene.add(sphere);
      spheres.push({ mesh: sphere, name: data.info.name });
      hitObjects.push(sphere);
    });
    constellationHitSpheres.set(data.info.name, spheres);
  });

  return hitObjects;
}

export function highlightConstellation(name: string): void {
  constellationLines.forEach((line, key) => {
    const mat = line.material as THREE.LineBasicMaterial;
    if (key === name) {
      mat.color.copy(HIGHLIGHT_COLOR);
      mat.opacity = 1.0;
      (line.material as THREE.LineBasicMaterial).needsUpdate = true;
    } else {
      mat.color.copy(DEFAULT_COLOR);
      mat.opacity = 0.3;
      (line.material as THREE.LineBasicMaterial).needsUpdate = true;
    }
  });
}

export function clearHighlight(): void {
  constellationLines.forEach((line) => {
    const mat = line.material as THREE.LineBasicMaterial;
    mat.color.copy(DEFAULT_COLOR);
    mat.opacity = 0.6;
    (line.material as THREE.LineBasicMaterial).needsUpdate = true;
  });
}

export function getConstellationNames(): string[] {
  return CONSTELLATIONS_DATA.map((d) => d.info.name);
}

export function getConstellationInfo(name: string): ConstellationInfo | null {
  const data = CONSTELLATIONS_DATA.find((d) => d.info.name === name);
  return data ? data.info : null;
}
