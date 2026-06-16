export enum EventType {
  PERSON = 'person',
  VEHICLE = 'vehicle',
  ACTIVITY = 'activity',
  ENVIRONMENT = 'environment'
}

export interface EventItem {
  time: string;
  type: EventType;
  description: string;
  position: { x: number; y: number };
}

export interface Block {
  id: number;
  name: string;
  events: EventItem[];
}

const eventDescriptions: Record<EventType, string[]> = {
  [EventType.PERSON]: [
    '一位行人匆匆走过街角',
    '两名学生在路口交谈',
    '上班族快步走向地铁站',
    '老人牵着小狗散步',
    '摄影师在拍摄街景',
    '快递员派送包裹',
    '情侣手牵手漫步',
    '街头艺人开始表演'
  ],
  [EventType.VEHICLE]: [
    '一辆出租车驶过路口',
    '公交车缓缓靠站',
    '外卖电动车快速穿行',
    '私家车排队等红灯',
    '洒水车清洁路面',
    '共享单车被骑走',
    '警车鸣笛经过',
    '快递货车卸货中'
  ],
  [EventType.ACTIVITY]: [
    '街边小店开始营业',
    '广场上有人跳广场舞',
    '咖啡馆外坐满了客人',
    '夜市摊位陆续开张',
    '孩子们在公园玩耍',
    '街头展览吸引路人',
    '音乐演出即将开始',
    '美食节香气四溢'
  ],
  [EventType.ENVIRONMENT]: [
    '夕阳染红了天际',
    '路灯依次亮起',
    '微风拂过树叶沙沙作响',
    '霓虹灯开始闪烁',
    '月亮悄悄爬上夜空',
    '薄雾笼罩着街道',
    '星光点点夜空璀璨',
    '城市渐渐安静下来'
  ]
};

function generateEvents(blockId: number): EventItem[] {
  const events: EventItem[] = [];
  const types = Object.values(EventType);
  const startTime = 18;
  const endTime = 23;
  const numEvents = 8 + (blockId % 5);

  for (let i = 0; i < numEvents; i++) {
    const hour = startTime + Math.floor((i / numEvents) * (endTime - startTime));
    const minute = Math.floor(Math.random() * 60 / 30) * 30;
    const type = types[Math.floor(Math.random() * types.length)];
    const descriptions = eventDescriptions[type];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    events.push({
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      type,
      description,
      position: {
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80
      }
    });
  }

  events.sort((a, b) => {
    const [ah, am] = a.time.split(':').map(Number);
    const [bh, bm] = b.time.split(':').map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  return events;
}

function generateBlocks(): Block[] {
  const blocks: Block[] = [];
  const blockNames = [
    '中央广场', '商业大街', '老城区', '科技园区', '滨江路', '文化街',
    '火车站', '美食巷', '艺术区', '金融中心', '居民小区', '公园北门',
    '大学城', '体育中心', '医院前街', '购物中心', '软件园', '湖畔花园',
    '影视城', '图书馆', '博物馆', '音乐厅', '美术馆', '科技馆',
    '步行街', '古玩城', '花鸟市场', '数码城', '家具城', '建材市场',
    '物流园', '工业园', '开发区', '保税区', '港口区', '机场快线'
  ];

  for (let i = 0; i < 36; i++) {
    blocks.push({
      id: i,
      name: blockNames[i] || `街区 ${i + 1}`,
      events: generateEvents(i)
    });
  }

  return blocks;
}

export const blocks: Block[] = generateBlocks();

export function getBlockById(id: number): Block | undefined {
  return blocks.find(b => b.id === id);
}

export function getEventTypeColor(type: EventType): string {
  switch (type) {
    case EventType.PERSON:
      return '#FF6B6B';
    case EventType.VEHICLE:
      return '#4ECDC4';
    case EventType.ACTIVITY:
      return '#FFE66D';
    case EventType.ENVIRONMENT:
      return '#95E1D3';
    default:
      return '#FFFFFF';
  }
}

export function getEventTypeName(type: EventType): string {
  switch (type) {
    case EventType.PERSON:
      return '人物出现';
    case EventType.VEHICLE:
      return '车辆经过';
    case EventType.ACTIVITY:
      return '活动发生';
    case EventType.ENVIRONMENT:
      return '环境变化';
    default:
      return '未知';
  }
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
