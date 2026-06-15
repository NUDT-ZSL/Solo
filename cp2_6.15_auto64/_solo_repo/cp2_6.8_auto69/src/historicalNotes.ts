import * as THREE from 'three';

export interface HistoricalNote {
  id: string;
  title: string;
  year: string;
  description: string;
  position: { lat: number; lon: number; radius: number };
}

export interface HistoricalNoteResult {
  group: THREE.Group;
  notes: HistoricalNote[];
  sprites: THREE.Sprite[];
  getNoteAtPoint: (point: THREE.Vector3, threshold: number) => HistoricalNote | null;
}

const NOTES: HistoricalNote[] = [
  {
    id: 'halley',
    title: '哈雷彗星记录',
    year: '公元前230年',
    description: '中国秦朝时期的天文学家首次详细记录了哈雷彗星的出现。《史记·秦始皇本纪》记载："始皇七年，彗星先出东方，见北方，五月见西方。"这是世界上关于哈雷彗星最早的确切记录之一，比西方早了数百年。',
    position: { lat: 30, lon: 45, radius: 70 }
  },
  {
    id: 'venus',
    title: '唐朝金星凌日',
    year: '公元670年',
    description: '唐代天文学家李淳风在《麟德历》中精确记录了金星凌日现象。他观测到金星如小黑点般从日面经过，并推算出其运行周期。这一记录比欧洲天文学家开普勒的预测早了近千年。',
    position: { lat: 15, lon: 120, radius: 72 }
  },
  {
    id: 'supernova',
    title: '客星出现（超新星）',
    year: '公元1054年',
    description: '北宋至和元年，天文学家观测到一颗明亮的"客星"出现在天关星附近，白天可见，持续二十三天。这就是著名的蟹状星云超新星爆发，是人类历史上最亮的天文事件之一。',
    position: { lat: 22, lon: 185, radius: 75 }
  },
  {
    id: 'eclipse',
    title: '仲康日食',
    year: '约公元前2137年',
    description: '《尚书·胤征》记载了夏朝仲康时期发生的日食事件："乃季秋月朔，辰弗集于房。"这是世界上最早的日食记录之一，比巴比伦最早的日食记录还要早约六百年。',
    position: { lat: -10, lon: 250, radius: 71 }
  },
  {
    id: 'meteor',
    title: '狮子座流星雨',
    year: '公元931年',
    description: '五代十国时期，《旧五代史》记载："五鼓初，有流星大如斗，出东北，浊有尾迹，长数丈，蛇行屈曲，凝著天，良久，渐没。"这是关于狮子座流星雨的珍贵记录。',
    position: { lat: 40, lon: 320, radius: 73 }
  }
];

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createScrollTexture(title: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;

  const padding = 24;
  ctx.fillStyle = 'rgba(245, 230, 200, 0.85)';
  ctx.beginPath();
  const r = 14;
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
  ctx.lineTo(r, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(139, 90, 43, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(201, 169, 62, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding + 4);
  ctx.lineTo(canvas.width - padding, padding + 4);
  ctx.moveTo(padding, canvas.height - padding - 4);
  ctx.lineTo(canvas.width - padding, canvas.height - padding - 4);
  ctx.stroke();

  ctx.fillStyle = '#3d2817';
  ctx.font = 'bold 32px "KaiTi", "楷体", "STKaiti", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = '#8b5a2b';
  ctx.font = '18px "KaiTi", "楷体", serif';
  ctx.fillText('点击查看详情', canvas.width / 2, canvas.height - padding - 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createHistoricalNotes(scene: THREE.Scene): HistoricalNoteResult {
  const group = new THREE.Group();
  const sprites: THREE.Sprite[] = [];

  NOTES.forEach((note) => {
    const tex = createScrollTexture(note.title);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(9, 5, 1);

    const pos = latLonToVector3(note.position.lat, note.position.lon, note.position.radius);
    sprite.position.copy(pos);
    (sprite as any).userData = { noteId: note.id, basePosition: pos.clone() };

    sprites.push(sprite);
    group.add(sprite);
  });

  scene.add(group);

  function getNoteAtPoint(point: THREE.Vector3, threshold: number): HistoricalNote | null {
    for (const sprite of sprites) {
      if (sprite.position.distanceTo(point) < threshold) {
        const id = (sprite as any).userData.noteId;
        return NOTES.find((n) => n.id === id) || null;
      }
    }
    return null;
  }

  return { group, notes: NOTES, sprites, getNoteAtPoint };
}

export { NOTES };
