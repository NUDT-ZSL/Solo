export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonalData {
  height: number
  color: string
  description: string
}

export interface Plant {
  id: string
  name: string
  icon: string
  minHeight: number
  maxHeight: number
  trunkRadius: number
  canopyRadius: number
  seasonalHeight: Record<Season, number>
  seasonalColor: Record<Season, string>
  seasonalDescription: Record<Season, string>
}

export const plants: Plant[] = [
  {
    id: 'sakura',
    name: '樱花',
    icon: '🌸',
    minHeight: 4,
    maxHeight: 8,
    trunkRadius: 0.15,
    canopyRadius: 1.8,
    seasonalHeight: {
      spring: 6,
      summer: 7,
      autumn: 6.5,
      winter: 5
    },
    seasonalColor: {
      spring: '#ffb7c5',
      summer: '#4caf50',
      autumn: '#e65100',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：繁花似锦，粉色满枝',
      summer: '夏季：绿叶成荫，枝叶茂盛',
      autumn: '秋季：红叶渐黄，落叶纷飞',
      winter: '冬季：枯枝裸露，静待春来'
    }
  },
  {
    id: 'ginkgo',
    name: '银杏',
    icon: '🍂',
    minHeight: 8,
    maxHeight: 20,
    trunkRadius: 0.25,
    canopyRadius: 2.5,
    seasonalHeight: {
      spring: 12,
      summer: 14,
      autumn: 13,
      winter: 11
    },
    seasonalColor: {
      spring: '#81c784',
      summer: '#388e3c',
      autumn: '#fdd835',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：新叶嫩绿，生机盎然',
      summer: '夏季：浓荫如盖，碧绿苍翠',
      autumn: '秋季：满树金黄，灿若黄金',
      winter: '冬季：枝干挺拔，落叶归根'
    }
  },
  {
    id: 'maple',
    name: '红枫',
    icon: '🍁',
    minHeight: 3,
    maxHeight: 8,
    trunkRadius: 0.12,
    canopyRadius: 1.5,
    seasonalHeight: {
      spring: 5,
      summer: 6,
      autumn: 5.5,
      winter: 4
    },
    seasonalColor: {
      spring: '#ef9a9a',
      summer: '#2e7d32',
      autumn: '#d32f2f',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：嫩叶浅红，清新可人',
      summer: '夏季：叶色深绿，浓密遮阴',
      autumn: '秋季：层林尽染，火红似焰',
      winter: '冬季：枝条萧瑟，红叶落尽'
    }
  },
  {
    id: 'wisteria',
    name: '紫藤',
    icon: '💜',
    minHeight: 3,
    maxHeight: 10,
    trunkRadius: 0.1,
    canopyRadius: 2.0,
    seasonalHeight: {
      spring: 6,
      summer: 8,
      autumn: 7,
      winter: 4
    },
    seasonalColor: {
      spring: '#ab47bc',
      summer: '#4caf50',
      autumn: '#ff8f00',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：紫穗垂挂，芬芳馥郁',
      summer: '夏季：藤蔓缠绕，绿意盎然',
      autumn: '秋季：叶片泛黄，荚果低垂',
      winter: '冬季：藤干盘曲，苍劲有力'
    }
  },
  {
    id: 'hydrangea',
    name: '绣球',
    icon: '💐',
    minHeight: 1,
    maxHeight: 2,
    trunkRadius: 0.06,
    canopyRadius: 1.0,
    seasonalHeight: {
      spring: 1.2,
      summer: 1.8,
      autumn: 1.5,
      winter: 0.8
    },
    seasonalColor: {
      spring: '#7986cb',
      summer: '#42a5f5',
      autumn: '#8d6e63',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：花苞初绽，蓝紫渐变',
      summer: '夏季：花团锦簇，蓝白交映',
      autumn: '秋季：花色渐褪，叶转棕褐',
      winter: '冬季：枯茎残叶，蛰伏休眠'
    }
  },
  {
    id: 'peach',
    name: '碧桃',
    icon: '🍑',
    minHeight: 3,
    maxHeight: 6,
    trunkRadius: 0.13,
    canopyRadius: 1.6,
    seasonalHeight: {
      spring: 5,
      summer: 5.5,
      autumn: 5,
      winter: 4
    },
    seasonalColor: {
      spring: '#f48fb1',
      summer: '#66bb6a',
      autumn: '#ff6f00',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：桃花灼灼，粉面含春',
      summer: '夏季：绿叶浓密，果实初成',
      autumn: '秋季：叶色橙黄，硕果累累',
      winter: '冬季：枝条舒展，休养生息'
    }
  },
  {
    id: 'osmanthus',
    name: '桂花',
    icon: '🌕',
    minHeight: 3,
    maxHeight: 8,
    trunkRadius: 0.14,
    canopyRadius: 1.8,
    seasonalHeight: {
      spring: 5,
      summer: 6,
      autumn: 6.5,
      winter: 5
    },
    seasonalColor: {
      spring: '#66bb6a',
      summer: '#2e7d32',
      autumn: '#f9a825',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：新叶萌发，翠绿欲滴',
      summer: '夏季：枝叶繁茂，浓绿苍翠',
      autumn: '秋季：金桂飘香，满园芬芳',
      winter: '冬季：常绿尚存，暗香犹在'
    }
  },
  {
    id: 'plum',
    name: '梅花',
    icon: '🌺',
    minHeight: 3,
    maxHeight: 7,
    trunkRadius: 0.12,
    canopyRadius: 1.4,
    seasonalHeight: {
      spring: 5,
      summer: 5.5,
      autumn: 5,
      winter: 4.5
    },
    seasonalColor: {
      spring: '#ef5350',
      summer: '#4caf50',
      autumn: '#ff8a65',
      winter: '#e91e63'
    },
    seasonalDescription: {
      spring: '春季：花谢叶生，嫩绿新芽',
      summer: '夏季：枝叶浓密，青翠欲滴',
      autumn: '秋季：叶渐泛黄，果实成熟',
      winter: '冬季：凌寒独放，傲雪绽放'
    }
  },
  {
    id: 'magnolia',
    name: '玉兰',
    icon: '🤍',
    minHeight: 5,
    maxHeight: 12,
    trunkRadius: 0.18,
    canopyRadius: 2.0,
    seasonalHeight: {
      spring: 8,
      summer: 9,
      autumn: 8.5,
      winter: 7
    },
    seasonalColor: {
      spring: '#ffffff',
      summer: '#4caf50',
      autumn: '#ffb74d',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：白花满枝，洁白如玉',
      summer: '夏季：宽叶浓荫，翠绿成盖',
      autumn: '秋季：叶片渐黄，层叠掉落',
      winter: '冬季：枝干光洁，花苞暗孕'
    }
  },
  {
    id: 'willow',
    name: '垂柳',
    icon: '🌿',
    minHeight: 6,
    maxHeight: 15,
    trunkRadius: 0.2,
    canopyRadius: 2.8,
    seasonalHeight: {
      spring: 10,
      summer: 12,
      autumn: 11,
      winter: 9
    },
    seasonalColor: {
      spring: '#aed581',
      summer: '#558b2f',
      autumn: '#f9a825',
      winter: '#9e9e9e'
    },
    seasonalDescription: {
      spring: '春季：柳丝吐绿，随风摇曳',
      summer: '夏季：柳荫浓密，枝条垂地',
      autumn: '秋季：柳叶泛黄，金丝飘落',
      winter: '冬季：枯柳独立，线条清瘦'
    }
  }
]
