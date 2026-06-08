interface StrokeData {
  totalLength: number;
  pointCount: number;
  avgSpeed: number;
  directionChanges: number;
  duration: number;
}

type MoodCategory = 'mountain' | 'flower' | 'rain' | 'zen' | 'moon' | 'spring';

interface PoemEntry {
  text: string;
  author: string;
  category: MoodCategory;
}

const POETRY_LIBRARY: PoemEntry[] = [
  { text: '千山鸟飞绝，万径人踪灭', author: '柳宗元', category: 'mountain' },
  { text: '空山新雨后，天气晚来秋', author: '王维', category: 'mountain' },
  { text: '远上寒山石径斜，白云生处有人家', author: '杜牧', category: 'mountain' },
  { text: '横看成岭侧成峰，远近高低各不同', author: '苏轼', category: 'mountain' },
  { text: '会当凌绝顶，一览众山小', author: '杜甫', category: 'mountain' },
  { text: '采菊东篱下，悠然见南山', author: '陶渊明', category: 'flower' },
  { text: '人面不知何处去，桃花依旧笑春风', author: '崔护', category: 'flower' },
  { text: '接天莲叶无穷碧，映日荷花别样红', author: '杨万里', category: 'flower' },
  { text: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', category: 'flower' },
  { text: '落红不是无情物，化作春泥更护花', author: '龚自珍', category: 'flower' },
  { text: '好雨知时节，当春乃发生', author: '杜甫', category: 'rain' },
  { text: '夜阑卧听风吹雨，铁马冰河入梦来', author: '陆游', category: 'rain' },
  { text: '水光潋滟晴方好，山色空蒙雨亦奇', author: '苏轼', category: 'rain' },
  { text: '渭城朝雨浥轻尘，客舍青青柳色新', author: '王维', category: 'rain' },
  { text: '黑云翻墨未遮山，白雨跳珠乱入船', author: '苏轼', category: 'rain' },
  { text: '行到水穷处，坐看云起时', author: '王维', category: 'zen' },
  { text: '菩提本无树，明镜亦非台', author: '慧能', category: 'zen' },
  { text: '人生到处知何似，应似飞鸿踏雪泥', author: '苏轼', category: 'zen' },
  { text: '问君何能尔，心远地自偏', author: '陶渊明', category: 'zen' },
  { text: '本来无一物，何处惹尘埃', author: '慧能', category: 'zen' },
  { text: '举头望明月，低头思故乡', author: '李白', category: 'moon' },
  { text: '明月几时有，把酒问青天', author: '苏轼', category: 'moon' },
  { text: '海上生明月，天涯共此时', author: '张九龄', category: 'moon' },
  { text: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', category: 'moon' },
  { text: '春江潮水连海平，海上明月共潮生', author: '张若虚', category: 'moon' },
  { text: '春色满园关不住，一枝红杏出墙来', author: '叶绍翁', category: 'spring' },
  { text: '等闲识得东风面，万紫千红总是春', author: '朱熹', category: 'spring' },
  { text: '不知细叶谁裁出，二月春风似剪刀', author: '贺知章', category: 'spring' },
  { text: '春风又绿江南岸，明月何时照我还', author: '王安石', category: 'spring' },
  { text: '乱花渐欲迷人眼，浅草才能没马蹄', author: '白居易', category: 'spring' },
];

function analyzeStroke(stroke: StrokeData): MoodCategory {
  const { totalLength, avgSpeed, directionChanges, duration } = stroke;

  if (totalLength > 400 || directionChanges >= 4) {
    return 'mountain';
  }
  if (avgSpeed < 0.3 && duration > 800) {
    return 'zen';
  }
  if (directionChanges >= 2 && avgSpeed > 0.5) {
    return 'rain';
  }
  if (avgSpeed < 0.5 && totalLength < 200) {
    return 'flower';
  }
  if (totalLength > 200 && directionChanges <= 1) {
    return 'moon';
  }
  return 'spring';
}

export function matchPoem(stroke: StrokeData): PoemEntry | null {
  if (stroke.pointCount < 2) return null;

  const category = analyzeStroke(stroke);
  const candidates = POETRY_LIBRARY.filter((p) => p.category === category);

  if (candidates.length === 0) return null;

  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}
