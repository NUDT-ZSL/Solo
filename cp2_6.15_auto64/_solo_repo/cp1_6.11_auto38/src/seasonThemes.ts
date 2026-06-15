export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ParticleConfig {
  minCount: number;
  maxCount: number;
  minSize: number;
  maxSize: number;
  colorStart: string;
  colorEnd: string;
  primaryColor: string;
  behavior: 'petal' | 'wave' | 'leaf' | 'snow';
}

export interface SeasonTheme {
  name: SeasonName;
  displayName: string;
  particle: ParticleConfig;
  edgeEffect: 'burn' | 'ink';
  iconSVG: string;
  proverbs: string[];
  musicUrl: string;
}

const cherryBlossomSVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cb-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFEBEE"/>
      <stop offset="60%" stop-color="#F8BBD9"/>
      <stop offset="100%" stop-color="#F48FB1"/>
    </radialGradient>
  </defs>
  <g fill="url(#cb-grad)" stroke="#F06292" stroke-width="1.5" stroke-linejoin="round">
    <ellipse cx="100" cy="55" rx="22" ry="30" transform="rotate(0 100 100)"/>
    <ellipse cx="145" cy="75" rx="22" ry="30" transform="rotate(72 145 75)"/>
    <ellipse cx="138" cy="130" rx="22" ry="30" transform="rotate(144 138 130)"/>
    <ellipse cx="62" cy="130" rx="22" ry="30" transform="rotate(216 62 130)"/>
    <ellipse cx="55" cy="75" rx="22" ry="30" transform="rotate(288 55 75)"/>
  </g>
  <circle cx="100" cy="100" r="12" fill="#FFEB3B" stroke="#FBC02D" stroke-width="1"/>
  <g fill="#FFD54F">
    <circle cx="94" cy="96" r="2.5"/>
    <circle cx="106" cy="96" r="2.5"/>
    <circle cx="92" cy="104" r="2.5"/>
    <circle cx="108" cy="104" r="2.5"/>
    <circle cx="100" cy="109" r="2.5"/>
  </g>
</svg>`;

const sunSVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sun-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="40%" stop-color="#FFEB3B"/>
      <stop offset="100%" stop-color="#FF9800"/>
    </radialGradient>
  </defs>
  <g stroke="#FF9800" stroke-width="4" stroke-linecap="round">
    <line x1="100" y1="15" x2="100" y2="40"/>
    <line x1="100" y1="160" x2="100" y2="185"/>
    <line x1="15" y1="100" x2="40" y2="100"/>
    <line x1="160" y1="100" x2="185" y2="100"/>
    <line x1="40" y1="40" x2="58" y2="58"/>
    <line x1="142" y1="142" x2="160" y2="160"/>
    <line x1="160" y1="40" x2="142" y2="58"/>
    <line x1="58" y1="142" x2="40" y2="160"/>
  </g>
  <circle cx="100" cy="100" r="45" fill="url(#sun-grad)" stroke="#FFB300" stroke-width="2"/>
  <g fill="#FF8F00" opacity="0.7">
    <circle cx="85" cy="90" r="4"/>
    <circle cx="115" cy="90" r="4"/>
    <path d="M 82 115 Q 100 130 118 115" stroke="#FF8F00" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

const mapleLeafSVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ml-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="50%" stop-color="#FF7043"/>
      <stop offset="100%" stop-color="#D84315"/>
    </linearGradient>
  </defs>
  <path d="
    M 100 170
    L 95 130
    L 60 125
    L 65 100
    L 30 90
    L 55 70
    L 40 40
    L 75 55
    L 100 20
    L 125 55
    L 160 40
    L 145 70
    L 170 90
    L 135 100
    L 140 125
    L 105 130
    L 100 170
    Z
  " fill="url(#ml-grad)" stroke="#BF360C" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 100 170 L 100 30" stroke="#BF360C" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M 100 100 L 55 75" stroke="#BF360C" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M 100 100 L 145 75" stroke="#BF360C" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M 100 70 L 70 50" stroke="#BF360C" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M 100 70 L 130 50" stroke="#BF360C" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M 100 130 L 75 120" stroke="#BF360C" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M 100 130 L 125 120" stroke="#BF360C" stroke-width="1.5" fill="none" opacity="0.4"/>
</svg>`;

const snowflakeSVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="50%" stop-color="#E0F7FA"/>
      <stop offset="100%" stop-color="#81D4FA"/>
    </linearGradient>
    <filter id="sf-glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g stroke="url(#sf-grad)" stroke-width="4" stroke-linecap="round" fill="none" filter="url(#sf-glow)">
    <line x1="100" y1="25" x2="100" y2="175"/>
    <line x1="35" y1="62" x2="165" y2="138"/>
    <line x1="35" y1="138" x2="165" y2="62"/>
    <g stroke-width="3">
      <line x1="100" y1="45" x2="85" y2="30"/>
      <line x1="100" y1="45" x2="115" y2="30"/>
      <line x1="100" y1="155" x2="85" y2="170"/>
      <line x1="100" y1="155" x2="115" y2="170"/>
      <line x1="55" y1="72" x2="45" y2="55"/>
      <line x1="55" y1="72" x2="40" y2="78"/>
      <line x1="145" y1="128" x2="155" y2="145"/>
      <line x1="145" y1="128" x2="160" y2="122"/>
      <line x1="55" y1="128" x2="45" y2="145"/>
      <line x1="55" y1="128" x2="40" y2="122"/>
      <line x1="145" y1="72" x2="155" y2="55"/>
      <line x1="145" y1="72" x2="160" y2="78"/>
    </g>
    <g stroke-width="2.5">
      <line x1="100" y1="85" x2="85" y2="75"/>
      <line x1="100" y1="85" x2="115" y2="75"/>
      <line x1="100" y1="115" x2="85" y2="125"/>
      <line x1="100" y1="115" x2="115" y2="125"/>
    </g>
  </g>
  <circle cx="100" cy="100" r="6" fill="#B3E5FC" opacity="0.8"/>
</svg>`;

export const seasonThemes: Record<SeasonName, SeasonTheme> = {
  spring: {
    name: 'spring',
    displayName: '春芽',
    particle: {
      minCount: 120,
      maxCount: 180,
      minSize: 2,
      maxSize: 6,
      colorStart: '#8BC34A',
      colorEnd: '#FFEB3B',
      primaryColor: '#8BC34A',
      behavior: 'petal'
    },
    edgeEffect: 'ink',
    iconSVG: cherryBlossomSVG,
    proverbs: [
      '春来无事，只为花忙',
      '桃花一簇开无主，可爱深红爱浅红',
      '春风得意马蹄疾，一日看尽长安花',
      '好雨知时节，当春乃发生',
      '人面不知何处去，桃花依旧笑春风',
      '春眠不觉晓，处处闻啼鸟',
      '竹外桃花三两枝，春江水暖鸭先知',
      '等闲识得东风面，万紫千红总是春',
      '春色满园关不住，一枝红杏出墙来',
      '乱花渐欲迷人眼，浅草才能没马蹄'
    ],
    musicUrl: 'placeholder://spring-music.mp3'
  },
  summer: {
    name: 'summer',
    displayName: '夏浪',
    particle: {
      minCount: 150,
      maxCount: 200,
      minSize: 2,
      maxSize: 5,
      colorStart: '#00BCD4',
      colorEnd: '#01579B',
      primaryColor: '#00BCD4',
      behavior: 'wave'
    },
    edgeEffect: 'ink',
    iconSVG: sunSVG,
    proverbs: [
      '小荷才露尖尖角，早有蜻蜓立上头',
      '接天莲叶无穷碧，映日荷花别样红',
      '水晶帘动微风起，满架蔷薇一院香',
      '夏条绿已密，朱萼缀明鲜',
      '芳菲歇去何须恨，夏木阴阴正可人',
      '漠漠水田飞白鹭，阴阴夏木啭黄鹂',
      '日长睡起无情思，闲看儿童捉柳花',
      '墙头雨细垂纤草，水面风回聚落花',
      '夜热依然午热同，开门小立月明中',
      '风蒲猎猎小池塘，过雨荷花满院香'
    ],
    musicUrl: 'placeholder://summer-music.mp3'
  },
  autumn: {
    name: 'autumn',
    displayName: '秋枫',
    particle: {
      minCount: 80,
      maxCount: 140,
      minSize: 3,
      maxSize: 6,
      colorStart: '#FF7043',
      colorEnd: '#FFD700',
      primaryColor: '#FF7043',
      behavior: 'leaf'
    },
    edgeEffect: 'burn',
    iconSVG: mapleLeafSVG,
    proverbs: [
      '停车坐爱枫林晚，霜叶红于二月花',
      '自古逢秋悲寂寥，我言秋日胜春朝',
      '空山新雨后，天气晚来秋',
      '落霞与孤鹜齐飞，秋水共长天一色',
      '银烛秋光冷画屏，轻罗小扇扑流萤',
      '秋风萧瑟天气凉，草木摇落露为霜',
      '一年好景君须记，最是橙黄橘绿时',
      '树树皆秋色，山山唯落晖',
      '长风万里送秋雁，对此可以酣高楼',
      '碧云天，黄叶地，秋色连波，波上寒烟翠'
    ],
    musicUrl: 'placeholder://autumn-music.mp3'
  },
  winter: {
    name: 'winter',
    displayName: '冬雪',
    particle: {
      minCount: 100,
      maxCount: 160,
      minSize: 2,
      maxSize: 5,
      colorStart: '#E0F7FA',
      colorEnd: '#FFFFFF',
      primaryColor: '#B3E5FC',
      behavior: 'snow'
    },
    edgeEffect: 'burn',
    iconSVG: snowflakeSVG,
    proverbs: [
      '忽如一夜春风来，千树万树梨花开',
      '窗含西岭千秋雪，门泊东吴万里船',
      '孤舟蓑笠翁，独钓寒江雪',
      '遥知不是雪，为有暗香来',
      '柴门闻犬吠，风雪夜归人',
      '千山鸟飞绝，万径人踪灭',
      '白雪却嫌春色晚，故穿庭树作飞花',
      '梅须逊雪三分白，雪却输梅一段香',
      '日暮苍山远，天寒白屋贫',
      '燕山雪花大如席，片片吹落轩辕台'
    ],
    musicUrl: 'placeholder://winter-music.mp3'
  }
};

export function getRandomProverb(season: SeasonName): string {
  const proverbs = seasonThemes[season].proverbs;
  return proverbs[Math.floor(Math.random() * proverbs.length)];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

export function lerpColor(colorStart: string, colorEnd: string, t: number): string {
  const s = hexToRgb(colorStart);
  const e = hexToRgb(colorEnd);
  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
