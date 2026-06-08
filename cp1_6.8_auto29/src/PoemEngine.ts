export type PoemStyle = '豪放' | '婉约' | '禅意';
export type PoemFormat = '五言' | '七言';

export interface PoemLine {
  chars: string[];
  tonalPattern: ('平' | '仄')[];
}

export interface GeneratedPoem {
  lines: PoemLine[];
  style: PoemStyle;
  format: PoemFormat;
  imageryUsed: string[];
  tonalCompliance: number;
}

interface StyleWordBank {
  nouns: string[];
  verbs: string[];
  adjectives: string[];
  particles: string[];
  templates: string[][];
}

const TONE_MAP: Record<string, '平' | '仄'> = {};

function initToneMap() {
  const pingChars = '一二三四五六七八九十千万人天地日月风云雨雪山水花木草石金玉铁光明暗春夏秋冬东西南北上下中大小多少长短高低远近深浅新旧老幼轻重新清白红青绿黄紫黑碧翠丹赤苍朱银星河江湖海波涛浪潮浪峰岭崖谷溪涧泉瀑霜露霞雾烟尘沙土泥路桥船帆舟桨灯烛琴棋书剑酒茶诗梦歌声笛鼓角旗箭弓刀霜雪梅兰竹菊松柏柳桃杏莲荷菊桐枫桂蓉鸥鹤鹰雁燕莺鹭鸦鸿雀龙凤牛马羊鸡犬猫鱼蝉蝶蜂萤蚁鼠兔鹿猴狐猪蛇象虎豹狮狼驴骡驼鲸龟蟹蚌螺蛙蚁蛾虹霞霓霄霁霏霂霪霁霎霏霖霁霆霹雷震霈霪霖霪霁霁';
  for (const ch of pingChars) {
    if (!TONE_MAP[ch]) TONE_MAP[ch] = '平';
  }
}

initToneMap();

const WORD_BANKS: Record<PoemStyle, StyleWordBank> = {
  '豪放': {
    nouns: ['大漠', '孤烟', '烈酒', '长剑', '狂风', '铁马', '苍穹', '黄河', '烽火', '壮志', '雄鹰', '怒涛', '霜刃', '关山', '落日', '金戈', '铁甲', '旌旗', '长河', '朔风', '战鼓', '惊雷', '奔马', '破浪', '飞沙'],
    verbs: ['破', '踏', '斩', '吞', '纵横', '驰骋', '激荡', '呼啸', '冲', '跃', '横扫', '凌', '啸', '饮', '搏', '破', '掷', '飞'],
    adjectives: ['壮阔', '苍茫', '雄浑', '磅礴', '豪迈', '峥嵘', '凛冽', '浩荡', '苍凉', '雄健'],
    particles: ['何', '且', '欲', '更', '曾', '莫', '休', '纵', '任', '但'],
    templates: [
      ['{n0}{v0}{n1}', '{a0}{n2}{p0}{v1}', '{n3}{v2}{a1}', '{p1}{n4}{v3}'],
      ['{a0}{n0}{v0}', '{n1}{p0}{v1}{n2}', '{n3}{a1}{v2}', '{p1}{v3}{n4}'],
      ['{v0}{n0}{p0}{n1}', '{a0}{n2}{v1}', '{n3}{v2}{n4}', '{p1}{a1}{v3}'],
    ],
  },
  '婉约': {
    nouns: ['细雨', '残月', '柳絮', '落花', '春水', '微风', '翠竹', '红楼', '珠帘', '罗帐', '寒蝉', '秋波', '芳草', '烟雨', '碧桃', '兰舟', '霜菊', '杏花', '梨花', '丁香', '相思', '离愁', '蝶梦', '烛泪', '春风'],
    verbs: ['啼', '舞', '飘', '落', '照', '映', '拂', '凝', '褪', '含', '染', '伤', '忆', '思', '怨', '愁', '叹', '惜', '望', '守'],
    adjectives: ['清冷', '朦胧', '婉转', '柔美', '幽怨', '凄迷', '淡雅', '缱绻', '缠绵', '幽静'],
    particles: ['犹', '空', '独', '怎', '偏', '却', '又', '已', '似', '若'],
    templates: [
      ['{n0}{p0}{v0}', '{a0}{n1}{v1}{n2}', '{n3}{p1}{a1}', '{v2}{n4}{v3}'],
      ['{a0}{n0}{v0}', '{n1}{p0}{v1}{n2}', '{n3}{v2}{a1}{n4}', '{p1}{v3}'],
      ['{n0}{v0}{p0}{n1}', '{a0}{n2}{v1}', '{n3}{p1}{v2}', '{v3}{a1}{n4}'],
    ],
  },
  '禅意': {
    nouns: ['古寺', '落叶', '流水', '青灯', '孤云', '空山', '幽径', '清泉', '寒松', '明月', '老僧', '禅房', '钟声', '竹影', '苔痕', '石桥', '白云', '清风', '晨露', '暮鼓', '莲台', '菩提', '虚舟', '静水', '远山'],
    verbs: ['悟', '觉', '观', '照', '空', '忘', '化', '归', '隐', '寂', '净', '舍', '放', '息', '照', '明', '通', '息', '坐', '行'],
    adjectives: ['空寂', '清幽', '淡泊', '虚静', '寂寥', '澄明', '空灵', '幽远', '恬淡', '清净'],
    particles: ['本', '自', '亦', '皆', '无', '不', '空', '唯', '且', '已'],
    templates: [
      ['{n0}{v0}{n1}', '{a0}{n2}{p0}{v1}', '{n3}{v2}{p1}', '{a1}{n4}{v3}'],
      ['{p0}{v0}{n0}', '{n1}{a0}{v1}', '{n2}{p1}{n3}', '{v2}{a1}{v3}'],
      ['{n0}{p0}{v0}', '{a0}{n1}{v1}{n2}', '{n3}{v2}{a1}', '{p1}{v3}{n4}'],
    ],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomUnique<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function fillTemplate(
  template: string[],
  bank: StyleWordBank
): { line: string; imagery: string[] }[] {
  const nouns = pickRandomUnique(bank.nouns, 5);
  const verbs = pickRandomUnique(bank.verbs, 4);
  const adjectives = pickRandomUnique(bank.adjectives, 2);
  const particles = pickRandomUnique(bank.particles, 2);

  const vars: Record<string, string> = {};
  nouns.forEach((n, i) => (vars[`n${i}`] = n));
  verbs.forEach((v, i) => (vars[`v${i}`] = v));
  adjectives.forEach((a, i) => (vars[`a${i}`] = a));
  particles.forEach((p, i) => (vars[`p${i}`] = p));

  return template.map((tpl) => {
    let line = tpl;
    const usedImagery: string[] = [];
    for (const [key, val] of Object.entries(vars)) {
      if (line.includes(`{${key}}`)) {
        line = line.replace(`{${key}}`, val);
        if (key.startsWith('n')) {
          usedImagery.push(val);
        }
      }
    }
    return { line, imagery: usedImagery };
  });
}

function adjustToFiveChars(line: string): string {
  if (line.length === 5) return line;
  if (line.length > 5) return line.substring(0, 5);
  const fillers = ['中', '里', '上', '下', '间', '处', '时', '前', '后', '头'];
  while (line.length < 5) {
    const pos = Math.floor(Math.random() * (line.length + 1));
    line = line.slice(0, pos) + pickRandom(fillers) + line.slice(pos);
  }
  return line;
}

function adjustToSevenChars(line: string): string {
  if (line.length === 7) return line;
  if (line.length > 7) return line.substring(0, 7);
  const fillers5to7 = ['之中', '之上', '之下', '之间', '深处', '尽头', '依旧', '已然', '恰似', '犹如'];
  const fillers = ['中', '里', '上', '下', '间', '处', '时', '前', '后', '头'];
  if (line.length === 5) {
    const suffix = pickRandom(fillers5to7);
    return line + suffix;
  }
  if (line.length === 6) {
    const pos = Math.floor(Math.random() * 2) ? 0 : line.length;
    line = pos === 0 ? pickRandom(fillers) + line : line + pickRandom(fillers);
  }
  while (line.length < 7) {
    const pos = Math.floor(Math.random() * (line.length + 1));
    line = line.slice(0, pos) + pickRandom(fillers) + line.slice(pos);
  }
  return line;
}

export function getTone(char: string): '平' | '仄' {
  if (TONE_MAP[char]) return TONE_MAP[char];

  const pingRhymes = '一二三四五六七八九十千天风云花山水春光明秋月星河白红青黄绿蓝紫金银玉珠东西南北中上大小长少新清高深远近低飞来归去行过回看听闻坐立行走出入开闭起落生灭有无虚实明暗空色动静显隐真幻悲喜怒哀乐怨愁思忆望想知觉悟了达通会得能可应须当将欲且更犹尚亦还再已曾莫勿休别岂怎偏却空自本从向在於以与为及于对被把比同若如似';
  const zeRhymes = '烈壮阔骤骤破踏斩吞纵横驰骋激荡呼啸冲跃横扫凌啸饮搏掷剑铁甲战鼓怒涛铁马烽火落日关山朔风破浪飞沙大漠孤烟长河苍穹壮志旌旗铁马霜刃烈酒狂风';
  
  if (pingRhymes.includes(char)) return '平';
  if (zeRhymes.includes(char)) return '仄';
  
  const code = char.charCodeAt(0);
  return code % 2 === 0 ? '平' : '仄';
}

function checkTonalCompliance(lines: string[][]): number {
  const wuyanPatterns: ('平' | '仄')[][] = [
    ['平平仄仄平', '仄仄仄平平', '仄仄平平仄', '平平仄仄平'],
    ['仄仄平平仄', '平平仄仄平', '平平平仄仄', '仄仄仄平平'],
  ];

  let totalMatch = 0;
  let totalChars = 0;

  for (const line of lines) {
    const lineStr = line.join('');
    for (const pattern of wuyanPatterns) {
      for (const pat of pattern) {
        if (pat.length === lineStr.length) {
          for (let i = 0; i < pat.length; i++) {
            totalChars++;
            if (getTone(lineStr[i]) === (pat[i] as '平' | '仄')) {
              totalMatch++;
            }
          }
        }
      }
    }
  }

  return totalChars > 0 ? totalMatch / totalChars : 0;
}

export function generatePoem(style: PoemStyle, format: PoemFormat = '五言'): GeneratedPoem {
  const bank = WORD_BANKS[style];
  const template = pickRandom(bank.templates);
  const filled = fillTemplate(template, bank);

  const adjustFn = format === '五言' ? adjustToFiveChars : adjustToSevenChars;

  const lines: PoemLine[] = filled.map(({ line }) => {
    const adjusted = adjustFn(line);
    const chars = adjusted.split('');
    const tonalPattern = chars.map(getTone);
    return { chars, tonalPattern };
  });

  const imageryUsed = filled.flatMap((f) => f.imagery);
  const tonalCompliance = checkTonalCompliance(lines.map((l) => l.chars));

  return {
    lines,
    style,
    format,
    imageryUsed: [...new Set(imageryUsed)],
    tonalCompliance: Math.round(tonalCompliance * 100) / 100,
  };
}

export function getAlternatives(style: PoemStyle, currentChar: string): string[] {
  const bank = WORD_BANKS[style];
  const allChars = [
    ...bank.nouns.join(''),
    ...bank.verbs.join(''),
    ...bank.adjectives.join(''),
    ...bank.particles.join(''),
  ];
  const uniqueChars = [...new Set(allChars)].filter((c) => c !== currentChar);
  const shuffled = uniqueChars.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}

export function getWordAlternatives(style: PoemStyle, currentWord: string): string[] {
  const bank = WORD_BANKS[style];
  const allWords = [...bank.nouns, ...bank.verbs, ...bank.adjectives, ...bank.particles];
  const filtered = allWords.filter((w) => w !== currentWord);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

export function getAllStyleWordBank(style: PoemStyle): StyleWordBank {
  return WORD_BANKS[style];
}
