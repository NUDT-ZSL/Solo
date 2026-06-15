export interface ScoreNote {
  string: number;
  hui: number;
  frequency: number;
}

export interface ScoreData {
  id: string;
  name: string;
  difficulty: number;
  notes: ScoreNote[];
}

export const HUI_POSITIONS: number[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export const STRING_BASE_FREQUENCIES: number[] = [
  130.81,
  146.83,
  164.81,
  174.61,
  196.00,
  220.00,
  246.94
];

function getFrequency(stringIdx: number, huiIdx: number): number {
  const baseFreq = STRING_BASE_FREQUENCIES[stringIdx];
  const hui = HUI_POSITIONS[huiIdx];
  const effectiveLength = (13 - hui) / 13;
  return baseFreq / effectiveLength;
}

function n(str: number, h: number): ScoreNote {
  return {
    string: str,
    hui: h,
    frequency: getFrequency(str, h)
  };
}

export const SCORES: ScoreData[] = [
  {
    id: 'gaoshan',
    name: '《高山》',
    difficulty: 2,
    notes: [
      n(4, 9),
      n(4, 7),
      n(5, 7),
      n(5, 9),
      n(6, 9),
      n(6, 7),
      n(7, 7),
      n(7, 5)
    ]
  },
  {
    id: 'liushui',
    name: '《流水》',
    difficulty: 3,
    notes: [
      n(2, 10),
      n(2, 8),
      n(3, 9),
      n(3, 7),
      n(4, 8),
      n(4, 6),
      n(5, 7),
      n(5, 5)
    ]
  },
  {
    id: 'guanglingsan',
    name: '《广陵散》',
    difficulty: 3,
    notes: [
      n(1, 10),
      n(1, 8),
      n(2, 9),
      n(2, 7),
      n(3, 8),
      n(3, 6),
      n(4, 7),
      n(4, 5)
    ]
  },
  {
    id: 'meihua',
    name: '《梅花三弄》',
    difficulty: 2,
    notes: [
      n(5, 10),
      n(5, 8),
      n(5, 7),
      n(5, 9),
      n(6, 10),
      n(6, 8),
      n(6, 7),
      n(6, 9)
    ]
  },
  {
    id: 'pingsha',
    name: '《平沙落雁》',
    difficulty: 1,
    notes: [
      n(3, 9),
      n(3, 7),
      n(4, 9),
      n(4, 7),
      n(5, 9),
      n(5, 7),
      n(6, 9),
      n(6, 7)
    ]
  },
  {
    id: 'yuge',
    name: '《渔歌》',
    difficulty: 2,
    notes: [
      n(4, 10),
      n(4, 8),
      n(4, 7),
      n(5, 10),
      n(5, 8),
      n(5, 7),
      n(6, 10),
      n(6, 8)
    ]
  },
  {
    id: 'zuiyu',
    name: '《醉渔唱晚》',
    difficulty: 2,
    notes: [
      n(2, 9),
      n(3, 9),
      n(4, 9),
      n(3, 7),
      n(4, 7),
      n(5, 7),
      n(4, 5),
      n(5, 5)
    ]
  },
  {
    id: 'fenglei',
    name: '《风雷引》',
    difficulty: 1,
    notes: [
      n(5, 9),
      n(5, 7),
      n(6, 9),
      n(6, 7),
      n(7, 9),
      n(7, 7),
      n(6, 5),
      n(7, 5)
    ]
  }
];

export function getJianziPu(stringIdx: number, huiIdx: number): string {
  const fingerNames = ['大', '食', '中', '名', '无', '少', '大'];
  const finger = fingerNames[stringIdx % 7];
  const hui = HUI_POSITIONS[huiIdx];
  return `${finger}${hui}`;
}

export function getNoteName(frequency: number): string {
  const noteNames = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  const A4 = 440;
  const noteNum = Math.round(12 * Math.log2(frequency / A4)) + 69;
  return noteNames[noteNum % 12];
}
