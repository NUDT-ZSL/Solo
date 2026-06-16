export const CONFIG = {
  STAR_COUNT: 100,
  CONSTELLATION_COUNT: 5,
  MIN_CONSTELLATION_STARS: 3,
  MAX_CONSTELLATION_STARS: 5,
  FIREFLY_COUNT: 50,

  COLORS: {
    BG_TOP: '#0a0a2e',
    BG_BOTTOM: '#1a0a3e',
    GROUND: '#1a3a1a',
    STAR: '#ffffff',
    FIREFLY: '#ffff99',
    CONSTELLATION_LINE: '#4488ff',
    CONSTELLATION_LINE_HIGHLIGHT: '#ffffff',
    CONSTELLATION_TEXT: '#d4a574',
    PANEL_BG: '#f5e6c8',
    PANEL_BORDER: '#b8860b',
    PANEL_TEXT: '#3a2a1a',
    COUNTDOWN: '#cc3333',
    BUTTON: '#d4a574',
    BUTTON_HOVER: '#e8c49a'
  },

  ANIMATION: {
    PANEL_SLIDE_DURATION: 400,
    LOG_SLIDE_DURATION: 300,
    TRANSITION_DURATION: 300,
    STAR_BREATH_MIN: 0.3,
    STAR_BREATH_MAX: 0.8
  },

  SIZES: {
    STAR_MIN: 1,
    STAR_MAX: 3,
    FIREFLY_MIN: 2,
    FIREFLY_MAX: 4,
    CONSTELLATION_LINE_ALPHA: 0.4,
    CONSTELLATION_LINE_HIGHLIGHT_ALPHA: 0.8,
    FIREFLY_OPACITY_MIN: 0.6,
    FIREFLY_OPACITY_MAX: 1.0,
    STAR_HIGHLIGHT_SCALE: 1.5,
    DIVINATION_PANEL_WIDTH: 380,
    DIVINATION_PANEL_HEIGHT: 320,
    LOG_PANEL_WIDTH: 280,
    LOG_BUTTON_SIZE: 40
  },

  TIME: {
    FIREFLY_BLINK_MIN: 500,
    FIREFLY_BLINK_MAX: 3000,
    DIVINATION_COOLDOWN: 24 * 60 * 60 * 1000
  }
};

export const CONSTELLATION_NAMES = [
  { name: '紫微垣', zodiac: '北斗七星' },
  { name: '太微垣', zodiac: '五帝座' },
  { name: '天市垣', zodiac: '斗宿' },
  { name: '东方苍龙', zodiac: '角宿' },
  { name: '北方玄武', zodiac: '牛宿' },
  { name: '西方白虎', zodiac: '奎宿' },
  { name: '南方朱雀', zodiac: '井宿' },
  { name: '天罡星', zodiac: '魁星' }
];

export const FORTUNE_LEVELS = [
  { level: '大吉', color: '#2e7d32' },
  { level: '上吉', color: '#2e7d32' },
  { level: '中吉', color: '#2e7d32' },
  { level: '中平', color: '#e65100' },
  { level: '小凶', color: '#e65100' },
  { level: '下凶', color: '#c62828' },
  { level: '大凶', color: '#c62828' }
];

export const FORTUNE_ASPECTS = [
  { icon: '⭐', label: '运势' },
  { icon: '💰', label: '财运' },
  { icon: '❤️', label: '健康' }
];

export const AUSPICIOUS_ITEMS = [
  '出行', '求财', '嫁娶', '开市', '读书', '祭祀',
  '搬家', '会友', '祈福', '签约', '修造', '纳畜',
  '栽种', '入宅', '安床', '赴任'
];

export const INAUSPICIOUS_ITEMS = [
  '动土', '安葬', '破土', '远行', '争吵', '签约',
  '嬉戏', '荤腥', '独处', '掘井', '开仓', '纳采',
  '造桥', '行舟', '伐木', '作灶'
];

export const DIVINATION_TEXTS = [
  '今日宜出行，忌动土，万事顺遂',
  '今日宜静守，忌远行，财运亨通',
  '今日宜嫁娶，忌争吵，姻缘美满',
  '今日宜开市，忌签约，商机无限',
  '今日宜读书，忌嬉戏，学业有成',
  '今日宜祭祀，忌荤腥，祈福安康',
  '今日宜搬家，忌破土，安居乐业',
  '今日宜会友，忌独处，贵人相助'
];

export const WEATHER_ICONS = ['☀️', '⛅', '🌧️', '❄️', '🌙', '⭐', '🌈', '🌪️'];
