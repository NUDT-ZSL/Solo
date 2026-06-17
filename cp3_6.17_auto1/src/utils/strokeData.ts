export interface StrokePoint {
  x: number;
  y: number;
}

export type StrokeKind =
  | '横' | '竖' | '撇' | '捺' | '点' | '提' | '撇点'
  | '横折' | '竖折' | '撇折' | '横撇' | '竖钩' | '弯钩'
  | '横钩' | '斜钩' | '卧钩' | '横折钩' | '竖弯钩' | '横折弯钩'
  | '横折折' | '横折折撇' | '竖折折钩' | '横撇弯钩' | '横折折折钩'
  | '左点' | '右点' | '长点' | '短撇' | '竖提' | '横折提';

export interface Stroke {
  id: number;
  kind: StrokeKind;
  startPoint: StrokePoint;
  endPoint: StrokePoint;
  controlPoints?: StrokePoint[];
  type: 'line' | 'curve';
  hint: string;
}

export interface CharacterStrokes {
  character: string;
  strokes: Stroke[];
  totalStrokes: number;
  offsetX: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const SINGLE_CHAR_WIDTH = CANVAS_WIDTH;

interface RawCharacterStrokes {
  character: string;
  totalStrokes: number;
  strokes: Stroke[];
}

const P = (x: number, y: number): StrokePoint => ({ x, y });

const buildCharDatabase = (): Record<string, RawCharacterStrokes> => {
  return {
    '一': {
      character: '一',
      totalStrokes: 1,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.18, 0.50), endPoint: P(0.82, 0.50), hint: '从左到右水平横写，略向右上倾斜' },
      ],
    },
    '二': {
      character: '二',
      totalStrokes: 2,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.28, 0.36), endPoint: P(0.72, 0.36), hint: '先写上横，从左到右稍短' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.18, 0.64), endPoint: P(0.82, 0.64), hint: '再写下横，从左到右略长' },
      ],
    },
    '三': {
      character: '三',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.30, 0.24), endPoint: P(0.70, 0.24), hint: '第一横短，从左到右' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.26, 0.50), endPoint: P(0.74, 0.50), hint: '第二横中，从左到右' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.18, 0.76), endPoint: P(0.82, 0.76), hint: '第三横最长，从左到右' },
      ],
    },
    '十': {
      character: '十',
      totalStrokes: 2,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.16, 0.50), endPoint: P(0.84, 0.50), hint: '先横：从左到右贯穿中部' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.50, 0.18), endPoint: P(0.50, 0.82), hint: '后竖：从上到下居中' },
      ],
    },
    '人': {
      character: '人',
      totalStrokes: 2,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.52, 0.16), endPoint: P(0.22, 0.86), hint: '先撇：从上方偏右起笔，向左下弯撇出' },
        { id: 2, kind: '捺', type: 'line', startPoint: P(0.48, 0.22), endPoint: P(0.82, 0.86), hint: '后捺：从撇中部起笔，向右下舒展捺出' },
      ],
    },
    '大': {
      character: '大',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.18, 0.38), endPoint: P(0.82, 0.38), hint: '先横：从左到右写上方一横' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.50, 0.14), endPoint: P(0.20, 0.86), hint: '再撇：从横上方居中起笔，左下撇出' },
        { id: 3, kind: '捺', type: 'line', startPoint: P(0.50, 0.20), endPoint: P(0.84, 0.86), hint: '最后捺：与撇同一起点，右下捺出' },
      ],
    },
    '小': {
      character: '小',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '竖钩', type: 'curve', startPoint: P(0.50, 0.18), endPoint: P(0.46, 0.84), controlPoints: [P(0.50, 0.80)], hint: '先写中间竖钩：从上到下，末端向左上钩' },
        { id: 2, kind: '左点', type: 'line', startPoint: P(0.28, 0.40), endPoint: P(0.38, 0.60), hint: '再写左点：从左上向右下轻落点' },
        { id: 3, kind: '右点', type: 'line', startPoint: P(0.72, 0.40), endPoint: P(0.62, 0.60), hint: '最后写右点：从右上向左下轻落点' },
      ],
    },
    '口': {
      character: '口',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.30, 0.22), endPoint: P(0.30, 0.78), hint: '先写左竖：从上到下' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.30, 0.22), endPoint: P(0.70, 0.78), controlPoints: [P(0.70, 0.22)], hint: '再写横折：先右横再向下折' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.30, 0.78), endPoint: P(0.70, 0.78), hint: '最后封口：从左到右写底横' },
      ],
    },
    '山': {
      character: '山',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.50, 0.14), endPoint: P(0.50, 0.86), hint: '先写中间长竖：从上到下' },
        { id: 2, kind: '竖折', type: 'line', startPoint: P(0.20, 0.38), endPoint: P(0.50, 0.86), controlPoints: [P(0.20, 0.86)], hint: '再写左竖折：先短竖再右横到底' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.80, 0.38), endPoint: P(0.80, 0.86), hint: '最后写右短竖：从上到下' },
      ],
    },
    '水': {
      character: '水',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '竖钩', type: 'curve', startPoint: P(0.50, 0.12), endPoint: P(0.46, 0.88), controlPoints: [P(0.50, 0.82)], hint: '先写中间竖钩' },
        { id: 2, kind: '横撇', type: 'curve', startPoint: P(0.40, 0.30), endPoint: P(0.16, 0.74), controlPoints: [P(0.28, 0.42)], hint: '左上横撇：先短横再向左下撇' },
        { id: 3, kind: '撇', type: 'line', startPoint: P(0.46, 0.50), endPoint: P(0.20, 0.86), hint: '左撇：从中间向左下撇出' },
        { id: 4, kind: '捺', type: 'line', startPoint: P(0.54, 0.50), endPoint: P(0.86, 0.86), hint: '右捺：从中间向右下捺出' },
      ],
    },
    '火': {
      character: '火',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '左点', type: 'line', startPoint: P(0.26, 0.36), endPoint: P(0.36, 0.54), hint: '左上点：从左上向右下轻落' },
        { id: 2, kind: '右点', type: 'line', startPoint: P(0.74, 0.36), endPoint: P(0.64, 0.54), hint: '右上点：从右上向左下轻落' },
        { id: 3, kind: '撇', type: 'line', startPoint: P(0.50, 0.18), endPoint: P(0.20, 0.88), hint: '中间撇：从正上方向左下长撇' },
        { id: 4, kind: '捺', type: 'line', startPoint: P(0.50, 0.22), endPoint: P(0.82, 0.88), hint: '最后捺：与撇起笔相近，右下捺出' },
      ],
    },
    '木': {
      character: '木',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.14, 0.38), endPoint: P(0.86, 0.38), hint: '先横：贯穿整个字中部' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.50, 0.12), endPoint: P(0.50, 0.88), hint: '后竖：从上到下过横的中点' },
        { id: 3, kind: '撇', type: 'line', startPoint: P(0.50, 0.38), endPoint: P(0.18, 0.82), hint: '左撇：从横竖交点向左下撇' },
        { id: 4, kind: '捺', type: 'line', startPoint: P(0.50, 0.38), endPoint: P(0.84, 0.82), hint: '右捺：从横竖交点向右下捺' },
      ],
    },
    '林': {
      character: '林',
      totalStrokes: 8,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.06, 0.38), endPoint: P(0.44, 0.38), hint: '左木上横' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.25, 0.12), endPoint: P(0.25, 0.88), hint: '左木中竖' },
        { id: 3, kind: '撇', type: 'line', startPoint: P(0.25, 0.38), endPoint: P(0.08, 0.82), hint: '左木左撇' },
        { id: 4, kind: '捺', type: 'line', startPoint: P(0.25, 0.38), endPoint: P(0.46, 0.82), hint: '左木右捺（稍短）' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.56, 0.38), endPoint: P(0.94, 0.38), hint: '右木上横' },
        { id: 6, kind: '竖', type: 'line', startPoint: P(0.75, 0.12), endPoint: P(0.75, 0.88), hint: '右木中竖' },
        { id: 7, kind: '撇', type: 'line', startPoint: P(0.75, 0.38), endPoint: P(0.58, 0.82), hint: '右木左撇' },
        { id: 8, kind: '捺', type: 'line', startPoint: P(0.75, 0.38), endPoint: P(0.94, 0.82), hint: '右木右捺（舒展）' },
      ],
    },
    '土': {
      character: '土',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.24, 0.32), endPoint: P(0.76, 0.32), hint: '先上横：从左到右' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.50, 0.14), endPoint: P(0.50, 0.86), hint: '再中竖：从上到下穿过横' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.12, 0.78), endPoint: P(0.88, 0.78), hint: '最后下横：最长，托住整字' },
      ],
    },
    '王': {
      character: '王',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.16, 0.20), endPoint: P(0.84, 0.20), hint: '第一横长' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.26, 0.50), endPoint: P(0.74, 0.50), hint: '第二横短（中横）' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.50, 0.12), endPoint: P(0.50, 0.80), hint: '中间竖贯穿两横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.10, 0.80), endPoint: P(0.90, 0.80), hint: '底横最长，托住整字' },
      ],
    },
    '田': {
      character: '田',
      totalStrokes: 5,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.26, 0.14), endPoint: P(0.26, 0.86), hint: '外框左竖' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.26, 0.14), endPoint: P(0.74, 0.86), controlPoints: [P(0.74, 0.14)], hint: '外框横折：先横再折向下' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.26, 0.50), endPoint: P(0.74, 0.50), hint: '中间横' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.50, 0.14), endPoint: P(0.50, 0.86), hint: '中间竖' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.26, 0.86), endPoint: P(0.74, 0.86), hint: '底横封口' },
      ],
    },
    '日': {
      character: '日',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.32, 0.14), endPoint: P(0.32, 0.86), hint: '左竖' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.32, 0.14), endPoint: P(0.68, 0.86), controlPoints: [P(0.68, 0.14)], hint: '横折构成右框' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.32, 0.50), endPoint: P(0.68, 0.50), hint: '中间横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.32, 0.86), endPoint: P(0.68, 0.86), hint: '底横封口' },
      ],
    },
    '月': {
      character: '月',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.36, 0.14), endPoint: P(0.22, 0.88), hint: '先撇：从右上向左下' },
        { id: 2, kind: '横折钩', type: 'curve', startPoint: P(0.36, 0.14), endPoint: P(0.40, 0.86), controlPoints: [P(0.72, 0.14), P(0.72, 0.78)], hint: '横折钩：右框带钩' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.36, 0.42), endPoint: P(0.72, 0.42), hint: '上内横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.36, 0.64), endPoint: P(0.72, 0.64), hint: '下内横' },
      ],
    },
    '明': {
      character: '明',
      totalStrokes: 8,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.08, 0.16), endPoint: P(0.08, 0.84), hint: '日字旁左竖' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.08, 0.16), endPoint: P(0.42, 0.84), controlPoints: [P(0.42, 0.16)], hint: '日字旁横折' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.08, 0.50), endPoint: P(0.42, 0.50), hint: '日字中间横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.08, 0.84), endPoint: P(0.42, 0.84), hint: '日字底横' },
        { id: 5, kind: '撇', type: 'line', startPoint: P(0.62, 0.14), endPoint: P(0.48, 0.88), hint: '月字旁撇' },
        { id: 6, kind: '横折钩', type: 'curve', startPoint: P(0.62, 0.14), endPoint: P(0.66, 0.86), controlPoints: [P(0.92, 0.14), P(0.92, 0.80)], hint: '月字旁横折钩' },
        { id: 7, kind: '横', type: 'line', startPoint: P(0.62, 0.42), endPoint: P(0.92, 0.42), hint: '月字上内横' },
        { id: 8, kind: '横', type: 'line', startPoint: P(0.62, 0.64), endPoint: P(0.92, 0.64), hint: '月字下内横' },
      ],
    },
    '好': {
      character: '好',
      totalStrokes: 6,
      strokes: [
        { id: 1, kind: '撇点', type: 'curve', startPoint: P(0.12, 0.22), endPoint: P(0.10, 0.84), controlPoints: [P(0.06, 0.50)], hint: '女字旁撇点：先撇后长点' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.26, 0.30), endPoint: P(0.02, 0.60), hint: '女字旁中撇' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.04, 0.60), endPoint: P(0.44, 0.60), hint: '女字旁底横（提）' },
        { id: 4, kind: '横撇', type: 'curve', startPoint: P(0.54, 0.18), endPoint: P(0.52, 0.52), controlPoints: [P(0.76, 0.18)], hint: '子字上横撇' },
        { id: 5, kind: '弯钩', type: 'curve', startPoint: P(0.66, 0.30), endPoint: P(0.68, 0.78), controlPoints: [P(0.60, 0.54)], hint: '子字弯钩' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.50, 0.86), endPoint: P(0.92, 0.86), hint: '子字底横' },
      ],
    },
    '子': {
      character: '子',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '横撇', type: 'curve', startPoint: P(0.26, 0.22), endPoint: P(0.22, 0.58), controlPoints: [P(0.60, 0.22)], hint: '先横撇：横后向左下撇' },
        { id: 2, kind: '弯钩', type: 'curve', startPoint: P(0.46, 0.30), endPoint: P(0.50, 0.80), controlPoints: [P(0.38, 0.58)], hint: '再弯钩：弯向下再上钩' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.14, 0.86), endPoint: P(0.86, 0.86), hint: '最后长横托底' },
      ],
    },
    '女': {
      character: '女',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '撇点', type: 'curve', startPoint: P(0.46, 0.14), endPoint: P(0.34, 0.88), controlPoints: [P(0.22, 0.46)], hint: '先撇点：先撇再向右下长点' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.70, 0.22), endPoint: P(0.16, 0.66), hint: '再撇：从右上向左下斜撇' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.06, 0.66), endPoint: P(0.94, 0.66), hint: '最后长横贯穿' },
      ],
    },
    '学': {
      character: '学',
      totalStrokes: 8,
      strokes: [
        { id: 1, kind: '点', type: 'line', startPoint: P(0.34, 0.06), endPoint: P(0.38, 0.16), hint: '上部左点' },
        { id: 2, kind: '点', type: 'line', startPoint: P(0.50, 0.04), endPoint: P(0.50, 0.14), hint: '上部中点' },
        { id: 3, kind: '点', type: 'line', startPoint: P(0.66, 0.06), endPoint: P(0.62, 0.16), hint: '上部右点' },
        { id: 4, kind: '横撇', type: 'curve', startPoint: P(0.24, 0.24), endPoint: P(0.20, 0.42), controlPoints: [P(0.44, 0.24)], hint: '冖左横撇' },
        { id: 5, kind: '竖', type: 'line', startPoint: P(0.76, 0.24), endPoint: P(0.76, 0.42), hint: '冖右短竖' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.18, 0.44), endPoint: P(0.82, 0.44), hint: '冖下横（秃宝盖）' },
        { id: 7, kind: '横撇', type: 'curve', startPoint: P(0.34, 0.54), endPoint: P(0.30, 0.76), controlPoints: [P(0.54, 0.54)], hint: '子头横撇' },
        { id: 8, kind: '横', type: 'line', startPoint: P(0.14, 0.88), endPoint: P(0.86, 0.88), hint: '子底长横' },
      ],
    },
    '中': {
      character: '中',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.50, 0.08), endPoint: P(0.50, 0.92), hint: '先写中间长竖' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.24, 0.26), endPoint: P(0.24, 0.74), controlPoints: [P(0.76, 0.26)], hint: '左外框横折（先写横折的竖）' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.24, 0.26), endPoint: P(0.76, 0.26), hint: '上横封口' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.76, 0.26), endPoint: P(0.76, 0.74), hint: '右竖封口' },
      ],
    },
    '国': {
      character: '国',
      totalStrokes: 8,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.14, 0.08), endPoint: P(0.14, 0.92), hint: '国字框左竖' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.14, 0.08), endPoint: P(0.86, 0.92), controlPoints: [P(0.86, 0.08)], hint: '国字框横折' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.28, 0.26), endPoint: P(0.72, 0.26), hint: '内部玉：上横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.28, 0.50), endPoint: P(0.72, 0.50), hint: '内部玉：中横' },
        { id: 5, kind: '竖', type: 'line', startPoint: P(0.50, 0.18), endPoint: P(0.50, 0.78), hint: '内部玉：中竖' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.28, 0.78), endPoint: P(0.72, 0.78), hint: '内部玉：下横' },
        { id: 7, kind: '点', type: 'line', startPoint: P(0.70, 0.62), endPoint: P(0.76, 0.70), hint: '玉字右下点' },
        { id: 8, kind: '横', type: 'line', startPoint: P(0.14, 0.92), endPoint: P(0.86, 0.92), hint: '国字框底横封口' },
      ],
    },
    '我': {
      character: '我',
      totalStrokes: 7,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.42, 0.08), endPoint: P(0.10, 0.36), hint: '左上撇' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.14, 0.28), endPoint: P(0.62, 0.28), hint: '上横' },
        { id: 3, kind: '竖钩', type: 'curve', startPoint: P(0.34, 0.22), endPoint: P(0.32, 0.70), controlPoints: [P(0.34, 0.66)], hint: '左竖钩' },
        { id: 4, kind: '提', type: 'line', startPoint: P(0.18, 0.58), endPoint: P(0.44, 0.48), hint: '左提（斜向上）' },
        { id: 5, kind: '斜钩', type: 'curve', startPoint: P(0.46, 0.12), endPoint: P(0.82, 0.86), controlPoints: [P(0.72, 0.40)], hint: '主笔斜钩（戈钩）' },
        { id: 6, kind: '撇', type: 'line', startPoint: P(0.64, 0.44), endPoint: P(0.42, 0.74), hint: '右上向左下撇' },
        { id: 7, kind: '点', type: 'line', startPoint: P(0.74, 0.34), endPoint: P(0.82, 0.42), hint: '右上点' },
      ],
    },
    '你': {
      character: '你',
      totalStrokes: 7,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.10, 0.14), endPoint: P(0.02, 0.42), hint: '单人旁撇' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.20, 0.20), endPoint: P(0.16, 0.88), hint: '单人旁竖' },
        { id: 3, kind: '撇', type: 'line', startPoint: P(0.42, 0.18), endPoint: P(0.32, 0.44), hint: '尔字上撇' },
        { id: 4, kind: '横撇', type: 'curve', startPoint: P(0.38, 0.32), endPoint: P(0.34, 0.58), controlPoints: [P(0.62, 0.32)], hint: '尔字横撇' },
        { id: 5, kind: '竖钩', type: 'curve', startPoint: P(0.54, 0.22), endPoint: P(0.52, 0.72), controlPoints: [P(0.54, 0.68)], hint: '尔字中竖钩' },
        { id: 6, kind: '撇', type: 'line', startPoint: P(0.44, 0.56), endPoint: P(0.32, 0.82), hint: '尔字左小撇' },
        { id: 7, kind: '点', type: 'line', startPoint: P(0.64, 0.56), endPoint: P(0.76, 0.82), hint: '尔字右点' },
      ],
    },
    '他': {
      character: '他',
      totalStrokes: 5,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.14, 0.14), endPoint: P(0.04, 0.42), hint: '单人旁撇' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.24, 0.20), endPoint: P(0.20, 0.88), hint: '单人旁竖' },
        { id: 3, kind: '横折钩', type: 'curve', startPoint: P(0.38, 0.22), endPoint: P(0.42, 0.68), controlPoints: [P(0.72, 0.22), P(0.72, 0.60)], hint: '也字横折钩' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.54, 0.16), endPoint: P(0.54, 0.76), hint: '也字中竖' },
        { id: 5, kind: '竖弯钩', type: 'curve', startPoint: P(0.78, 0.30), endPoint: P(0.92, 0.88), controlPoints: [P(0.72, 0.76)], hint: '也字竖弯钩' },
      ],
    },
    '她': {
      character: '她',
      totalStrokes: 6,
      strokes: [
        { id: 1, kind: '撇点', type: 'curve', startPoint: P(0.08, 0.22), endPoint: P(0.06, 0.84), controlPoints: [P(0.02, 0.50)], hint: '女字旁撇点' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.26, 0.30), endPoint: P(0.02, 0.60), hint: '女字旁中撇' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.04, 0.60), endPoint: P(0.40, 0.60), hint: '女字旁底横' },
        { id: 4, kind: '横折钩', type: 'curve', startPoint: P(0.50, 0.22), endPoint: P(0.54, 0.68), controlPoints: [P(0.82, 0.22), P(0.82, 0.60)], hint: '也字横折钩' },
        { id: 5, kind: '竖', type: 'line', startPoint: P(0.66, 0.16), endPoint: P(0.66, 0.76), hint: '也字中竖' },
        { id: 6, kind: '竖弯钩', type: 'curve', startPoint: P(0.88, 0.30), endPoint: P(0.98, 0.88), controlPoints: [P(0.82, 0.76)], hint: '也字竖弯钩' },
      ],
    },
    '们': {
      character: '们',
      totalStrokes: 5,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.14, 0.14), endPoint: P(0.04, 0.42), hint: '单人旁撇' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.24, 0.20), endPoint: P(0.20, 0.88), hint: '单人旁竖' },
        { id: 3, kind: '点', type: 'line', startPoint: P(0.38, 0.32), endPoint: P(0.46, 0.44), hint: '门字左上点' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.40, 0.18), endPoint: P(0.40, 0.88), hint: '门字左竖' },
        { id: 5, kind: '横折钩', type: 'curve', startPoint: P(0.40, 0.18), endPoint: P(0.44, 0.84), controlPoints: [P(0.94, 0.18), P(0.94, 0.78)], hint: '门字横折钩' },
      ],
    },
    '是': {
      character: '是',
      totalStrokes: 9,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.50, 0.06), endPoint: P(0.50, 0.26), hint: '日字上竖出头' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.30, 0.16), endPoint: P(0.70, 0.42), controlPoints: [P(0.70, 0.16)], hint: '日字横折' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.30, 0.16), endPoint: P(0.70, 0.16), hint: '日字上横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.30, 0.30), endPoint: P(0.70, 0.30), hint: '日字中横' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.30, 0.42), endPoint: P(0.70, 0.42), hint: '日字底横' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.12, 0.54), endPoint: P(0.88, 0.54), hint: '下部长横' },
        { id: 7, kind: '竖', type: 'line', startPoint: P(0.50, 0.54), endPoint: P(0.50, 0.72), hint: '下半中短竖' },
        { id: 8, kind: '撇', type: 'line', startPoint: P(0.50, 0.62), endPoint: P(0.22, 0.90), hint: '左下撇' },
        { id: 9, kind: '捺', type: 'line', startPoint: P(0.50, 0.62), endPoint: P(0.86, 0.90), hint: '右下捺' },
      ],
    },
    '的': {
      character: '的',
      totalStrokes: 8,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.26, 0.14), endPoint: P(0.04, 0.46), hint: '白字上撇' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.14, 0.20), endPoint: P(0.14, 0.56), hint: '白字左竖' },
        { id: 3, kind: '横折', type: 'line', startPoint: P(0.14, 0.20), endPoint: P(0.40, 0.56), controlPoints: [P(0.40, 0.20)], hint: '白字横折' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.14, 0.38), endPoint: P(0.40, 0.38), hint: '白字中横' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.14, 0.56), endPoint: P(0.40, 0.56), hint: '白字底横' },
        { id: 6, kind: '撇', type: 'line', startPoint: P(0.64, 0.14), endPoint: P(0.46, 0.92), hint: '勺字撇' },
        { id: 7, kind: '横折钩', type: 'curve', startPoint: P(0.54, 0.26), endPoint: P(0.58, 0.62), controlPoints: [P(0.94, 0.26), P(0.94, 0.56)], hint: '勺字横折钩' },
        { id: 8, kind: '点', type: 'line', startPoint: P(0.72, 0.50), endPoint: P(0.78, 0.58), hint: '勺字内点' },
      ],
    },
    '了': {
      character: '了',
      totalStrokes: 2,
      strokes: [
        { id: 1, kind: '横撇', type: 'curve', startPoint: P(0.34, 0.24), endPoint: P(0.20, 0.60), controlPoints: [P(0.58, 0.24)], hint: '先横撇' },
        { id: 2, kind: '弯钩', type: 'curve', startPoint: P(0.60, 0.24), endPoint: P(0.62, 0.88), controlPoints: [P(0.46, 0.58)], hint: '后弯钩' },
      ],
    },
    '不': {
      character: '不',
      totalStrokes: 4,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.12, 0.20), endPoint: P(0.88, 0.20), hint: '先长横' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.50, 0.14), endPoint: P(0.16, 0.74), hint: '再撇：从中上向左下' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.50, 0.32), endPoint: P(0.50, 0.62), hint: '中竖：从上到下不超过撇捺' },
        { id: 4, kind: '点', type: 'line', startPoint: P(0.58, 0.50), endPoint: P(0.84, 0.78), hint: '右点（长点捺）' },
      ],
    },
    '在': {
      character: '在',
      totalStrokes: 6,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.14, 0.18), endPoint: P(0.66, 0.18), hint: '上横' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.30, 0.12), endPoint: P(0.06, 0.72), hint: '左长撇' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.38, 0.30), endPoint: P(0.38, 0.76), hint: '土字竖' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.22, 0.44), endPoint: P(0.60, 0.44), hint: '土字中横' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.12, 0.76), endPoint: P(0.74, 0.76), hint: '土字底长横' },
        { id: 6, kind: '竖', type: 'line', startPoint: P(0.80, 0.36), endPoint: P(0.80, 0.62), hint: '右短竖' },
      ],
    },
    '有': {
      character: '有',
      totalStrokes: 6,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.14, 0.16), endPoint: P(0.70, 0.16), hint: '上横' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.34, 0.10), endPoint: P(0.06, 0.76), hint: '左长撇' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.38, 0.30), endPoint: P(0.38, 0.58), hint: '月字左竖' },
        { id: 4, kind: '横折钩', type: 'curve', startPoint: P(0.38, 0.30), endPoint: P(0.42, 0.82), controlPoints: [P(0.82, 0.30), P(0.82, 0.74)], hint: '月字横折钩' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.38, 0.50), endPoint: P(0.82, 0.50), hint: '月字上内横' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.38, 0.68), endPoint: P(0.82, 0.68), hint: '月字下内横' },
      ],
    },
    '和': {
      character: '和',
      totalStrokes: 8,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.16, 0.18), endPoint: P(0.06, 0.38), hint: '禾字上短撇' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.02, 0.34), endPoint: P(0.42, 0.34), hint: '禾字中横' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.22, 0.16), endPoint: P(0.22, 0.86), hint: '禾字中竖' },
        { id: 4, kind: '撇', type: 'line', startPoint: P(0.22, 0.50), endPoint: P(0.06, 0.74), hint: '禾字左撇' },
        { id: 5, kind: '捺', type: 'line', startPoint: P(0.22, 0.50), endPoint: P(0.46, 0.78), hint: '禾字右点（捺作点）' },
        { id: 6, kind: '竖', type: 'line', startPoint: P(0.56, 0.24), endPoint: P(0.56, 0.82), hint: '口字左竖' },
        { id: 7, kind: '横折', type: 'line', startPoint: P(0.56, 0.24), endPoint: P(0.94, 0.82), controlPoints: [P(0.94, 0.24)], hint: '口字横折' },
        { id: 8, kind: '横', type: 'line', startPoint: P(0.56, 0.82), endPoint: P(0.94, 0.82), hint: '口字底横封口' },
      ],
    },
    '也': {
      character: '也',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '横折钩', type: 'curve', startPoint: P(0.14, 0.22), endPoint: P(0.18, 0.70), controlPoints: [P(0.52, 0.22), P(0.52, 0.62)], hint: '先横折钩' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.34, 0.14), endPoint: P(0.34, 0.78), hint: '再中竖' },
        { id: 3, kind: '竖弯钩', type: 'curve', startPoint: P(0.62, 0.22), endPoint: P(0.88, 0.88), controlPoints: [P(0.52, 0.78)], hint: '最后竖弯钩' },
      ],
    },
    '就': {
      character: '就',
      totalStrokes: 12,
      strokes: [
        { id: 1, kind: '点', type: 'line', startPoint: P(0.06, 0.10), endPoint: P(0.10, 0.18), hint: '京字左上点' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.02, 0.22), endPoint: P(0.44, 0.22), hint: '京字上横' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.22, 0.22), endPoint: P(0.22, 0.44), hint: '口字中竖' },
        { id: 4, kind: '横折', type: 'line', startPoint: P(0.10, 0.32), endPoint: P(0.36, 0.54), controlPoints: [P(0.36, 0.32)], hint: '口字横折' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.10, 0.32), endPoint: P(0.36, 0.32), hint: '口字上横' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.10, 0.54), endPoint: P(0.36, 0.54), hint: '口字底横' },
        { id: 7, kind: '横', type: 'line', startPoint: P(0.02, 0.64), endPoint: P(0.44, 0.64), hint: '小字上横' },
        { id: 8, kind: '竖钩', type: 'curve', startPoint: P(0.22, 0.64), endPoint: P(0.20, 0.88), controlPoints: [P(0.22, 0.84)], hint: '小字竖钩' },
        { id: 9, kind: '点', type: 'line', startPoint: P(0.08, 0.76), endPoint: P(0.14, 0.84), hint: '小字左点' },
        { id: 10, kind: '点', type: 'line', startPoint: P(0.36, 0.76), endPoint: P(0.30, 0.84), hint: '小字右点' },
        { id: 11, kind: '横', type: 'line', startPoint: P(0.56, 0.46), endPoint: P(0.94, 0.46), hint: '尤字上横' },
        { id: 12, kind: '竖弯钩', type: 'curve', startPoint: P(0.70, 0.20), endPoint: P(0.94, 0.88), controlPoints: [P(0.66, 0.76)], hint: '尤字竖弯钩' },
      ],
    },
    '这': {
      character: '这',
      totalStrokes: 7,
      strokes: [
        { id: 1, kind: '点', type: 'line', startPoint: P(0.36, 0.14), endPoint: P(0.40, 0.22), hint: '文字上点' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.22, 0.28), endPoint: P(0.64, 0.28), hint: '文字上横' },
        { id: 3, kind: '撇', type: 'line', startPoint: P(0.42, 0.22), endPoint: P(0.20, 0.60), hint: '文字左撇' },
        { id: 4, kind: '捺', type: 'line', startPoint: P(0.42, 0.34), endPoint: P(0.66, 0.60), hint: '文字右捺（变为点）' },
        { id: 5, kind: '点', type: 'line', startPoint: P(0.08, 0.50), endPoint: P(0.14, 0.58), hint: '走之左上点' },
        { id: 6, kind: '横折折撇', type: 'curve', startPoint: P(0.14, 0.66), endPoint: P(0.02, 0.82), controlPoints: [P(0.34, 0.66), P(0.20, 0.74)], hint: '走之折撇' },
        { id: 7, kind: '捺', type: 'line', startPoint: P(0.12, 0.80), endPoint: P(0.96, 0.90), hint: '走之底长捺（平捺）' },
      ],
    },
    '那': {
      character: '那',
      totalStrokes: 6,
      strokes: [
        { id: 1, kind: '横折钩', type: 'curve', startPoint: P(0.04, 0.18), endPoint: P(0.08, 0.64), controlPoints: [P(0.40, 0.18), P(0.40, 0.58)], hint: '左半横折钩' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.04, 0.40), endPoint: P(0.40, 0.40), hint: '左半中内横' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.04, 0.60), endPoint: P(0.40, 0.60), hint: '左半下内横' },
        { id: 4, kind: '撇', type: 'line', startPoint: P(0.30, 0.68), endPoint: P(0.02, 0.90), hint: '左半下撇' },
        { id: 5, kind: '横撇弯钩', type: 'curve', startPoint: P(0.56, 0.16), endPoint: P(0.68, 0.74), controlPoints: [P(0.78, 0.16), P(0.86, 0.46), P(0.70, 0.70)], hint: '右耳旁横撇弯钩' },
        { id: 6, kind: '竖', type: 'line', startPoint: P(0.68, 0.52), endPoint: P(0.68, 0.92), hint: '右耳旁悬针竖' },
      ],
    },
    '上': {
      character: '上',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.50, 0.16), endPoint: P(0.50, 0.76), hint: '先竖：从上到下' },
        { id: 2, kind: '横', type: 'line', startPoint: P(0.36, 0.38), endPoint: P(0.64, 0.38), hint: '再短横' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.18, 0.82), endPoint: P(0.82, 0.82), hint: '最后长横托底' },
      ],
    },
    '下': {
      character: '下',
      totalStrokes: 3,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.12, 0.22), endPoint: P(0.88, 0.22), hint: '先长横' },
        { id: 2, kind: '竖', type: 'line', startPoint: P(0.50, 0.16), endPoint: P(0.50, 0.80), hint: '再竖：从横中点向下' },
        { id: 3, kind: '点', type: 'line', startPoint: P(0.58, 0.48), endPoint: P(0.72, 0.66), hint: '最后右点' },
      ],
    },
    '左': {
      character: '左',
      totalStrokes: 5,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.16, 0.24), endPoint: P(0.68, 0.24), hint: '先上横' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.34, 0.16), endPoint: P(0.04, 0.86), hint: '再长撇' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.24, 0.50), endPoint: P(0.64, 0.50), hint: '工上横' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.44, 0.42), endPoint: P(0.44, 0.78), hint: '工中竖' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.16, 0.78), endPoint: P(0.72, 0.78), hint: '工底长横' },
      ],
    },
    '右': {
      character: '右',
      totalStrokes: 5,
      strokes: [
        { id: 1, kind: '横', type: 'line', startPoint: P(0.20, 0.22), endPoint: P(0.70, 0.22), hint: '先上横' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.40, 0.14), endPoint: P(0.04, 0.86), hint: '再长撇' },
        { id: 3, kind: '竖', type: 'line', startPoint: P(0.34, 0.46), endPoint: P(0.34, 0.80), hint: '口字左竖' },
        { id: 4, kind: '横折', type: 'line', startPoint: P(0.34, 0.46), endPoint: P(0.72, 0.80), controlPoints: [P(0.72, 0.46)], hint: '口字横折' },
        { id: 5, kind: '横', type: 'line', startPoint: P(0.34, 0.80), endPoint: P(0.72, 0.80), hint: '口字底横封口' },
      ],
    },
    '前': {
      character: '前',
      totalStrokes: 9,
      strokes: [
        { id: 1, kind: '点', type: 'line', startPoint: P(0.26, 0.08), endPoint: P(0.30, 0.16), hint: '丷左点' },
        { id: 2, kind: '点', type: 'line', startPoint: P(0.40, 0.08), endPoint: P(0.36, 0.16), hint: '丷右点' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.10, 0.22), endPoint: P(0.54, 0.22), hint: '月上横' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.10, 0.22), endPoint: P(0.10, 0.52), hint: '月左竖' },
        { id: 5, kind: '横折钩', type: 'curve', startPoint: P(0.10, 0.22), endPoint: P(0.14, 0.52), controlPoints: [P(0.54, 0.22), P(0.54, 0.46)], hint: '月横折钩' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.10, 0.36), endPoint: P(0.54, 0.36), hint: '月内横' },
        { id: 7, kind: '横', type: 'line', startPoint: P(0.04, 0.60), endPoint: P(0.96, 0.60), hint: '下部长横' },
        { id: 8, kind: '竖', type: 'line', startPoint: P(0.72, 0.54), endPoint: P(0.72, 0.80), hint: '立刀左竖' },
        { id: 9, kind: '竖钩', type: 'curve', startPoint: P(0.88, 0.46), endPoint: P(0.88, 0.90), controlPoints: [P(0.88, 0.86)], hint: '立刀竖钩' },
      ],
    },
    '后': {
      character: '后',
      totalStrokes: 6,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.30, 0.10), endPoint: P(0.04, 0.38), hint: '左上撇' },
        { id: 2, kind: '撇', type: 'line', startPoint: P(0.50, 0.14), endPoint: P(0.08, 0.86), hint: '左长撇' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.34, 0.24), endPoint: P(0.86, 0.24), hint: '右上横' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.54, 0.24), endPoint: P(0.54, 0.52), hint: '口左竖' },
        { id: 5, kind: '横折', type: 'line', startPoint: P(0.54, 0.24), endPoint: P(0.88, 0.52), controlPoints: [P(0.88, 0.24)], hint: '口横折' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.54, 0.52), endPoint: P(0.88, 0.52), hint: '口底横' },
      ],
    },
    '里': {
      character: '里',
      totalStrokes: 7,
      strokes: [
        { id: 1, kind: '竖', type: 'line', startPoint: P(0.50, 0.10), endPoint: P(0.50, 0.38), hint: '田上中竖' },
        { id: 2, kind: '横折', type: 'line', startPoint: P(0.22, 0.18), endPoint: P(0.22, 0.62), controlPoints: [P(0.78, 0.18)], hint: '田横折' },
        { id: 3, kind: '横', type: 'line', startPoint: P(0.22, 0.18), endPoint: P(0.78, 0.18), hint: '田上横' },
        { id: 4, kind: '横', type: 'line', startPoint: P(0.22, 0.40), endPoint: P(0.78, 0.40), hint: '田中横' },
        { id: 5, kind: '竖', type: 'line', startPoint: P(0.50, 0.18), endPoint: P(0.50, 0.62), hint: '田下中竖' },
        { id: 6, kind: '横', type: 'line', startPoint: P(0.22, 0.62), endPoint: P(0.78, 0.62), hint: '田底横' },
        { id: 7, kind: '横', type: 'line', startPoint: P(0.10, 0.84), endPoint: P(0.90, 0.84), hint: '最底下长横' },
      ],
    },
    '外': {
      character: '外',
      totalStrokes: 5,
      strokes: [
        { id: 1, kind: '撇', type: 'line', startPoint: P(0.44, 0.14), endPoint: P(0.06, 0.88), hint: '夕字长撇' },
        { id: 2, kind: '横撇', type: 'curve', startPoint: P(0.18, 0.34), endPoint: P(0.12, 0.56), controlPoints: [P(0.42, 0.34)], hint: '夕字横撇' },
        { id: 3, kind: '点', type: 'line', startPoint: P(0.34, 0.54), endPoint: P(0.46, 0.70), hint: '夕字右下点' },
        { id: 4, kind: '竖', type: 'line', startPoint: P(0.66, 0.38), endPoint: P(0.66, 0.86), hint: '卜字中竖' },
        { id: 5, kind: '点', type: 'line', startPoint: P(0.78, 0.46), endPoint: P(0.92, 0.62), hint: '卜字右点' },
      ],
    },
  };
};

const DATABASE = buildCharDatabase();
export const SUPPORTED_CHARACTERS = Object.keys(DATABASE);

export function isCharacterSupported(char: string): boolean {
  return Object.prototype.hasOwnProperty.call(DATABASE, char);
}

export function getSingleCharacterStroke(char: string): CharacterStrokes | null {
  const raw = DATABASE[char];
  if (!raw) return null;
  const strokes = raw.strokes.map<Stroke>((s) => ({
    ...s,
    startPoint: { x: s.startPoint.x * CANVAS_WIDTH, y: s.startPoint.y * CANVAS_HEIGHT },
    endPoint: { x: s.endPoint.x * CANVAS_WIDTH, y: s.endPoint.y * CANVAS_HEIGHT },
    controlPoints: s.controlPoints?.map((p) => ({ x: p.x * CANVAS_WIDTH, y: p.y * CANVAS_HEIGHT })),
  }));
  return {
    character: raw.character,
    strokes,
    totalStrokes: raw.totalStrokes,
    offsetX: 0,
  };
}

export function getCharacterStrokes(characters: string): CharacterStrokes[] {
  const result: CharacterStrokes[] = [];
  const chars = Array.from(characters).slice(0, 4);
  const charCount = chars.length;
  if (charCount === 0) return result;

  const layoutWidth = SINGLE_CHAR_WIDTH / charCount;
  const paddingX = layoutWidth * 0.08;
  const effectiveWidth = layoutWidth - paddingX * 2;
  const scale = effectiveWidth / SINGLE_CHAR_WIDTH;
  const scaleY = 0.9;

  chars.forEach((ch, idx) => {
    const raw = DATABASE[ch];
    const centerX = layoutWidth * idx + layoutWidth / 2;
    const offsetX = centerX - (SINGLE_CHAR_WIDTH / 2) * scale;
    const offsetY = (CANVAS_HEIGHT - CANVAS_HEIGHT * scaleY) / 2;

    if (!raw) {
      result.push({ character: ch, strokes: [], totalStrokes: 0, offsetX: 0 });
      return;
    }

    const transformedStrokes: Stroke[] = raw.strokes.map((s) => {
      const toAbs = (p: StrokePoint): StrokePoint => ({
        x: offsetX + p.x * CANVAS_WIDTH * scale,
        y: offsetY + p.y * CANVAS_HEIGHT * scaleY,
      });
      return {
        ...s,
        startPoint: toAbs(s.startPoint),
        endPoint: toAbs(s.endPoint),
        controlPoints: s.controlPoints?.map(toAbs),
      };
    });

    result.push({
      character: raw.character,
      strokes: transformedStrokes,
      totalStrokes: raw.totalStrokes,
      offsetX,
    });
  });

  return result;
}
