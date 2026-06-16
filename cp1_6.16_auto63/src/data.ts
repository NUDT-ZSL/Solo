export interface TravelRecord {
  id: string;
  date: string;
  title: string;
  photoUrl: string;
  thoughts: string;
}

export interface CityData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  year: number;
  month: number;
  records: TravelRecord[];
}

export const mockData: CityData[] = [
  {
    id: 'tokyo-2019',
    name: '东京',
    lat: 35.6762,
    lng: 139.6503,
    year: 2019,
    month: 3,
    records: [
      {
        id: 'r1',
        date: '2019-03-15',
        title: '浅草寺初体验',
        photoUrl: '',
        thoughts: '清晨的浅草寺格外宁静，雷门前的仲见世商店街已经飘着铜锣烧的香气。'
      },
      {
        id: 'r2',
        date: '2019-03-17',
        title: '新宿御苑赏樱',
        photoUrl: '',
        thoughts: '粉色的樱花雨落在肩上，这是春天最温柔的问候。'
      }
    ]
  },
  {
    id: 'kyoto-2019',
    name: '京都',
    lat: 35.0116,
    lng: 135.7681,
    year: 2019,
    month: 5,
    records: [
      {
        id: 'r3',
        date: '2019-05-02',
        title: '伏见稻荷大社千本鸟居',
        photoUrl: '',
        thoughts: '穿行在朱红色的鸟居隧道中，仿佛走进了另一个时空。'
      }
    ]
  },
  {
    id: 'paris-2020',
    name: '巴黎',
    lat: 48.8566,
    lng: 2.3522,
    year: 2020,
    month: 1,
    records: [
      {
        id: 'r4',
        date: '2020-01-10',
        title: '埃菲尔铁塔之夜',
        photoUrl: '',
        thoughts: '整点的灯光闪烁如同星河倾泻，整座城市都变得浪漫起来。'
      },
      {
        id: 'r5',
        date: '2020-01-12',
        title: '卢浮宫的蒙娜丽莎',
        photoUrl: '',
        thoughts: '在无数名画中穿行，终于站在了那抹神秘微笑面前。'
      }
    ]
  },
  {
    id: 'rome-2020',
    name: '罗马',
    lat: 41.9028,
    lng: 12.4964,
    year: 2020,
    month: 7,
    records: [
      {
        id: 'r6',
        date: '2020-07-20',
        title: '古罗马斗兽场',
        photoUrl: '',
        thoughts: '站在两千年的历史遗迹前，想象着曾经的角斗士与观众的欢呼声。'
      }
    ]
  },
  {
    id: 'chengdu-2021',
    name: '成都',
    lat: 30.5728,
    lng: 104.0668,
    year: 2021,
    month: 4,
    records: [
      {
        id: 'r7',
        date: '2021-04-08',
        title: '大熊猫繁育研究基地',
        photoUrl: '',
        thoughts: '看着圆滚滚的熊猫啃着竹子，时间仿佛都慢了下来。'
      },
      {
        id: 'r8',
        date: '2021-04-09',
        title: '锦里古街的夜',
        photoUrl: '',
        thoughts: '红灯笼高挂，川剧变脸的喝彩声和火锅的香气交织在一起。'
      }
    ]
  },
  {
    id: 'hangzhou-2021',
    name: '杭州',
    lat: 30.2741,
    lng: 120.1551,
    year: 2021,
    month: 9,
    records: [
      {
        id: 'r9',
        date: '2021-09-15',
        title: '西湖断桥残雪',
        photoUrl: '',
        thoughts: '秋日的西湖，杨柳依依，断桥之上，许仙与白娘子的传说犹在耳边。'
      }
    ]
  },
  {
    id: 'iceland-2022',
    name: '雷克雅未克',
    lat: 64.1466,
    lng: -21.9426,
    year: 2022,
    month: 2,
    records: [
      {
        id: 'r10',
        date: '2022-02-18',
        title: '追逐极光',
        photoUrl: '',
        thoughts: '零下二十度的寒夜，绿色的光带在星空下舞动，美得让人忘记了寒冷。'
      },
      {
        id: 'r11',
        date: '2022-02-20',
        title: '蓝湖温泉',
        photoUrl: '',
        thoughts: '在冰天雪地中泡着暖暖的温泉，敷着白色的火山泥面膜，这是冰火之国的极致体验。'
      }
    ]
  },
  {
    id: 'newyork-2022',
    name: '纽约',
    lat: 40.7128,
    lng: -74.0060,
    year: 2022,
    month: 10,
    records: [
      {
        id: 'r12',
        date: '2022-10-05',
        title: '中央公园的秋天',
        photoUrl: '',
        thoughts: '金黄的落叶铺满草地，曼哈顿的天际线在远方若隐若现。'
      }
    ]
  },
  {
    id: 'lisbon-2023',
    name: '里斯本',
    lat: 38.7223,
    lng: -9.1393,
    year: 2023,
    month: 5,
    records: [
      {
        id: 'r13',
        date: '2023-05-12',
        title: '贝伦塔的黄昏',
        photoUrl: '',
        thoughts: '夕阳下的古老灯塔，见证了大航海时代无数探险家的出发与归来。'
      },
      {
        id: 'r14',
        date: '2023-05-14',
        title: '28路有轨电车',
        photoUrl: '',
        thoughts: '叮当作响的黄色电车穿行在狭窄的老街中，每一个转角都是一幅画。'
      }
    ]
  },
  {
    id: 'dali-2023',
    name: '大理',
    lat: 25.6067,
    lng: 100.2679,
    year: 2023,
    month: 8,
    records: [
      {
        id: 'r15',
        date: '2023-08-22',
        title: '洱海环湖骑行',
        photoUrl: '',
        thoughts: '风穿过洱海的水，阳光洒在苍山的雪，所有的烦恼都被吹散了。'
      }
    ]
  },
  {
    id: 'kyoto-2024',
    name: '京都',
    lat: 35.0116,
    lng: 135.7681,
    year: 2024,
    month: 3,
    records: [
      {
        id: 'r16',
        date: '2024-03-15',
        title: '哲学之道漫步',
        photoUrl: '',
        thoughts: '樱花飘落的小径，溪水潺潺，适合慢慢走，慢慢想。'
      },
      {
        id: 'r17',
        date: '2024-03-17',
        title: '岚山竹林',
        photoUrl: '',
        thoughts: '阳光穿过竹叶的缝隙，风吹过的沙沙声是大自然最美的乐章。'
      }
    ]
  },
  {
    id: 'chiangmai-2024',
    name: '清迈',
    lat: 18.7883,
    lng: 98.9853,
    year: 2024,
    month: 11,
    records: [
      {
        id: 'r18',
        date: '2024-11-05',
        title: '水灯节之夜',
        photoUrl: '',
        thoughts: '漫天的孔明灯带着愿望飞向星空，河面的水灯载着祝福漂向远方。'
      },
      {
        id: 'r19',
        date: '2024-11-07',
        title: '素贴山双龙寺',
        photoUrl: '',
        thoughts: '金色的佛塔在阳光下闪耀，俯瞰整座清迈城，心静如水。'
      },
      {
        id: 'r20',
        date: '2024-11-09',
        title: '宁曼路咖啡馆漫游',
        photoUrl: '',
        thoughts: '一家又一家有格调的咖啡馆，每一杯都有独特的故事。'
      }
    ]
  }
];
