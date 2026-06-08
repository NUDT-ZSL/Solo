export interface StarData {
  id: number;
  x: number;
  y: number;
  brightness: number;
  colorTemp: number;
  distance: number;
  name: string;
  phase: number;
  size: number;
}

const STAR_NAMES = [
  '织女', '牛郎', '天狼', '参宿四', '北极', '心宿二', '天津四', '角宿一',
  '大角', '南门二', '五车二', '河鼓二', '天枢', '天璇', '天玑', '天权',
  '玉衡', '开阳', '摇光', '北落师门', '参宿一', '参宿二', '参宿三', '参宿五',
  '参宿六', '参宿七', '井宿一', '井宿三', '柳宿一', '星宿一', '张宿一', '翼宿一',
  '轸宿一', '亢宿一', '氐宿一', '房宿一', '尾宿一', '箕宿一', '斗宿一', '女宿一',
  '虚宿一', '危宿一', '室宿一', '壁宿一', '奎宿一', '娄宿一', '胃宿一', '昴宿一',
  '毕宿一', '觜宿一', '鬼宿一', '星宿二', '张宿二', '翼宿二', '轸宿二', '亢宿二',
  '氐宿二', '房宿二', '尾宿二', '箕宿二', '斗宿二', '女宿二', '虚宿二', '危宿二',
  '室宿二', '壁宿二', '奎宿二', '娄宿二', '胃宿二', '昴宿二', '毕宿二', '觜宿二',
  '紫微', '太微', '天市', '少微', '长垣', '三台', '文昌', '内阶',
  '天床', '天厨', '天棓', '天枪', '天戈', '天盾', '天纲', '天纪',
];

const MAP_SIZE = 4000;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateStars(count: number): StarData[] {
  const rand = seededRandom(42);
  const stars: StarData[] = [];

  for (let i = 0; i < count; i++) {
    const colorTemp = Math.floor(rand() * 35000) + 2000;
    const distance = Math.floor(rand() * 10000) + 1;
    const brightness = rand() * 0.7 + 0.3;
    const size = brightness > 0.7 ? 10 : brightness > 0.5 ? 8 : 6;

    stars.push({
      id: i,
      x: rand() * MAP_SIZE - MAP_SIZE / 2,
      y: rand() * MAP_SIZE - MAP_SIZE / 2,
      brightness,
      colorTemp,
      distance,
      name: STAR_NAMES[i % STAR_NAMES.length] + (i >= STAR_NAMES.length ? `-${Math.floor(i / STAR_NAMES.length) + 1}` : ''),
      phase: rand() * Math.PI * 2,
      size,
    });
  }

  return stars;
}

export function colorTempToRgb(temp: number): [number, number, number] {
  temp = temp / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return [Math.round(r), Math.round(g), Math.round(b)];
}

export { MAP_SIZE };
