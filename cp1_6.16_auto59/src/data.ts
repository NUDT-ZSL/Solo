import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
}

export interface Province {
  id: string;
  name: string;
  outline: Point[];
  center: Point;
}

export interface CheckInRecord {
  id: string;
  provinceId: string;
  restaurantName: string;
  address: string;
  rating: number;
  review: string;
  position: Point;
  createdAt: number;
}

export const PROVINCES: Province[] = [
  {
    id: 'beijing',
    name: '北京',
    outline: [
      { x: 520, y: 120 }, { x: 560, y: 115 }, { x: 575, y: 135 },
      { x: 570, y: 165 }, { x: 540, y: 175 }, { x: 515, y: 160 }
    ],
    center: { x: 542, y: 145 }
  },
  {
    id: 'tianjin',
    name: '天津',
    outline: [
      { x: 575, y: 155 }, { x: 600, y: 150 }, { x: 605, y: 175 },
      { x: 590, y: 190 }, { x: 570, y: 180 }
    ],
    center: { x: 587, y: 170 }
  },
  {
    id: 'hebei',
    name: '河北',
    outline: [
      { x: 500, y: 100 }, { x: 580, y: 95 }, { x: 610, y: 110 },
      { x: 615, y: 145 }, { x: 625, y: 180 }, { x: 605, y: 210 },
      { x: 570, y: 220 }, { x: 530, y: 215 }, { x: 500, y: 195 },
      { x: 490, y: 150 }
    ],
    center: { x: 555, y: 160 }
  },
  {
    id: 'shanxi',
    name: '山西',
    outline: [
      { x: 460, y: 130 }, { x: 500, y: 125 }, { x: 500, y: 200 },
      { x: 490, y: 240 }, { x: 460, y: 250 }, { x: 445, y: 210 },
      { x: 440, y: 170 }
    ],
    center: { x: 470, y: 185 }
  },
  {
    id: 'neimenggu',
    name: '内蒙古',
    outline: [
      { x: 280, y: 50 }, { x: 450, y: 40 }, { x: 550, y: 60 },
      { x: 620, y: 80 }, { x: 600, y: 100 }, { x: 530, y: 90 },
      { x: 450, y: 100 }, { x: 380, y: 110 }, { x: 320, y: 105 },
      { x: 270, y: 90 }, { x: 260, y: 70 }
    ],
    center: { x: 420, y: 75 }
  },
  {
    id: 'liaoning',
    name: '辽宁',
    outline: [
      { x: 610, y: 80 }, { x: 680, y: 70 }, { x: 720, y: 90 },
      { x: 710, y: 130 }, { x: 680, y: 155 }, { x: 640, y: 160 },
      { x: 615, y: 145 }, { x: 610, y: 110 }
    ],
    center: { x: 660, y: 115 }
  },
  {
    id: 'jilin',
    name: '吉林',
    outline: [
      { x: 650, y: 40 }, { x: 740, y: 35 }, { x: 760, y: 60 },
      { x: 745, y: 85 }, { x: 700, y: 90 }, { x: 660, y: 80 },
      { x: 645, y: 60 }
    ],
    center: { x: 700, y: 62 }
  },
  {
    id: 'heilongjiang',
    name: '黑龙江',
    outline: [
      { x: 640, y: 10 }, { x: 770, y: 5 }, { x: 790, y: 30 },
      { x: 775, y: 55 }, { x: 720, y: 50 }, { x: 660, y: 45 },
      { x: 635, y: 25 }
    ],
    center: { x: 710, y: 28 }
  },
  {
    id: 'shandong',
    name: '山东',
    outline: [
      { x: 540, y: 200 }, { x: 620, y: 195 }, { x: 660, y: 210 },
      { x: 670, y: 245 }, { x: 640, y: 270 }, { x: 580, y: 275 },
      { x: 540, y: 260 }, { x: 530, y: 230 }
    ],
    center: { x: 595, y: 235 }
  },
  {
    id: 'henan',
    name: '河南',
    outline: [
      { x: 470, y: 230 }, { x: 540, y: 225 }, { x: 550, y: 265 },
      { x: 540, y: 305 }, { x: 500, y: 320 }, { x: 460, y: 310 },
      { x: 445, y: 275 }, { x: 450, y: 245 }
    ],
    center: { x: 495, y: 275 }
  },
  {
    id: 'jiangsu',
    name: '江苏',
    outline: [
      { x: 570, y: 265 }, { x: 640, y: 260 }, { x: 660, y: 290 },
      { x: 650, y: 330 }, { x: 610, y: 345 }, { x: 575, y: 330 },
      { x: 565, y: 295 }
    ],
    center: { x: 610, y: 300 }
  },
  {
    id: 'shanghai',
    name: '上海',
    outline: [
      { x: 660, y: 320 }, { x: 680, y: 315 }, { x: 685, y: 335 },
      { x: 670, y: 345 }, { x: 655, y: 338 }
    ],
    center: { x: 670, y: 330 }
  },
  {
    id: 'zhejiang',
    name: '浙江',
    outline: [
      { x: 615, y: 335 }, { x: 660, y: 330 }, { x: 675, y: 360 },
      { x: 665, y: 400 }, { x: 630, y: 415 }, { x: 600, y: 400 },
      { x: 595, y: 365 }
    ],
    center: { x: 632, y: 370 }
  },
  {
    id: 'anhui',
    name: '安徽',
    outline: [
      { x: 520, y: 295 }, { x: 575, y: 290 }, { x: 585, y: 335 },
      { x: 580, y: 375 }, { x: 550, y: 395 }, { x: 515, y: 380 },
      { x: 500, y: 340 }, { x: 505, y: 310 }
    ],
    center: { x: 542, y: 345 }
  },
  {
    id: 'jiangxi',
    name: '江西',
    outline: [
      { x: 510, y: 380 }, { x: 560, y: 375 }, { x: 575, y: 415 },
      { x: 565, y: 465 }, { x: 530, y: 485 }, { x: 495, y: 470 },
      { x: 485, y: 425 }, { x: 490, y: 395 }
    ],
    center: { x: 530, y: 430 }
  },
  {
    id: 'fujian',
    name: '福建',
    outline: [
      { x: 575, y: 400 }, { x: 615, y: 395 }, { x: 630, y: 425 },
      { x: 625, y: 470 }, { x: 595, y: 490 }, { x: 560, y: 475 },
      { x: 555, y: 435 }
    ],
    center: { x: 592, y: 442 }
  },
  {
    id: 'hubei',
    name: '湖北',
    outline: [
      { x: 430, y: 290 }, { x: 505, y: 285 }, { x: 520, y: 320 },
      { x: 515, y: 365 }, { x: 480, y: 385 }, { x: 435, y: 375 },
      { x: 415, y: 340 }, { x: 420, y: 310 }
    ],
    center: { x: 465, y: 335 }
  },
  {
    id: 'hunan',
    name: '湖南',
    outline: [
      { x: 430, y: 375 }, { x: 495, y: 370 }, { x: 505, y: 415 },
      { x: 495, y: 470 }, { x: 455, y: 490 }, { x: 415, y: 470 },
      { x: 405, y: 425 }, { x: 410, y: 395 }
    ],
    center: { x: 452, y: 430 }
  },
  {
    id: 'guangdong',
    name: '广东',
    outline: [
      { x: 450, y: 475 }, { x: 540, y: 470 }, { x: 570, y: 495 },
      { x: 565, y: 540 }, { x: 520, y: 565 }, { x: 460, y: 555 },
      { x: 435, y: 520 }, { x: 430, y: 490 }
    ],
    center: { x: 495, y: 520 }
  },
  {
    id: 'guangxi',
    name: '广西',
    outline: [
      { x: 340, y: 470 }, { x: 425, y: 465 }, { x: 440, y: 495 },
      { x: 430, y: 540 }, { x: 390, y: 560 }, { x: 340, y: 540 },
      { x: 320, y: 505 }, { x: 325, y: 480 }
    ],
    center: { x: 378, y: 510 }
  },
  {
    id: 'hainan',
    name: '海南',
    outline: [
      { x: 420, y: 575 }, { x: 460, y: 570 }, { x: 470, y: 595 },
      { x: 455, y: 615 }, { x: 425, y: 610 }, { x: 415, y: 590 }
    ],
    center: { x: 442, y: 592 }
  },
  {
    id: 'sichuan',
    name: '四川',
    outline: [
      { x: 280, y: 280 }, { x: 390, y: 275 }, { x: 420, y: 305 },
      { x: 425, y: 365 }, { x: 395, y: 405 }, { x: 330, y: 420 },
      { x: 280, y: 395 }, { x: 260, y: 345 }, { x: 265, y: 305 }
    ],
    center: { x: 340, y: 345 }
  },
  {
    id: 'chongqing',
    name: '重庆',
    outline: [
      { x: 395, y: 330 }, { x: 430, y: 325 }, { x: 440, y: 360 },
      { x: 425, y: 390 }, { x: 390, y: 395 }, { x: 380, y: 365 }
    ],
    center: { x: 410, y: 358 }
  },
  {
    id: 'guizhou',
    name: '贵州',
    outline: [
      { x: 345, y: 410 }, { x: 410, y: 405 }, { x: 430, y: 440 },
      { x: 415, y: 480 }, { x: 370, y: 490 }, { x: 335, y: 465 },
      { x: 330, y: 430 }
    ],
    center: { x: 375, y: 448 }
  },
  {
    id: 'yunnan',
    name: '云南',
    outline: [
      { x: 250, y: 400 }, { x: 330, y: 395 }, { x: 350, y: 435 },
      { x: 340, y: 485 }, { x: 310, y: 525 }, { x: 260, y: 520 },
      { x: 230, y: 480 }, { x: 225, y: 440 }
    ],
    center: { x: 288, y: 460 }
  },
  {
    id: 'xizang',
    name: '西藏',
    outline: [
      { x: 100, y: 270 }, { x: 240, y: 260 }, { x: 270, y: 290 },
      { x: 265, y: 380 }, { x: 220, y: 410 }, { x: 140, y: 400 },
      { x: 100, y: 360 }, { x: 90, y: 310 }
    ],
    center: { x: 180, y: 335 }
  },
  {
    id: 'qinghai',
    name: '青海',
    outline: [
      { x: 200, y: 190 }, { x: 310, y: 185 }, { x: 340, y: 215 },
      { x: 335, y: 270 }, { x: 290, y: 295 }, { x: 220, y: 285 },
      { x: 195, y: 250 }, { x: 190, y: 215 }
    ],
    center: { x: 262, y: 240 }
  },
  {
    id: 'gansu',
    name: '甘肃',
    outline: [
      { x: 310, y: 160 }, { x: 440, y: 150 }, { x: 470, y: 180 },
      { x: 460, y: 230 }, { x: 420, y: 270 }, { x: 360, y: 285 },
      { x: 330, y: 265 }, { x: 320, y: 220 }, { x: 315, y: 185 }
    ],
    center: { x: 385, y: 220 }
  },
  {
    id: 'ningxia',
    name: '宁夏',
    outline: [
      { x: 435, y: 210 }, { x: 460, y: 205 }, { x: 470, y: 240 },
      { x: 455, y: 270 }, { x: 430, y: 275 }, { x: 420, y: 245 }
    ],
    center: { x: 445, y: 240 }
  },
  {
    id: 'shaanxi',
    name: '陕西',
    outline: [
      { x: 455, y: 235 }, { x: 495, y: 230 }, { x: 505, y: 285 },
      { x: 490, y: 340 }, { x: 460, y: 360 }, { x: 435, y: 335 },
      { x: 430, y: 290 }, { x: 440, y: 255 }
    ],
    center: { x: 465, y: 295 }
  },
  {
    id: 'xinjiang',
    name: '新疆',
    outline: [
      { x: 30, y: 120 }, { x: 190, y: 110 }, { x: 230, y: 140 },
      { x: 225, y: 200 }, { x: 200, y: 250 }, { x: 130, y: 260 },
      { x: 60, y: 230 }, { x: 25, y: 180 }, { x: 20, y: 150 }
    ],
    center: { x: 120, y: 185 }
  },
  {
    id: 'taiwan',
    name: '台湾',
    outline: [
      { x: 640, y: 440 }, { x: 660, y: 435 }, { x: 665, y: 470 },
      { x: 655, y: 500 }, { x: 635, y: 505 }, { x: 625, y: 475 }
    ],
    center: { x: 645, y: 468 }
  },
  {
    id: 'hongkong',
    name: '香港',
    outline: [
      { x: 545, y: 545 }, { x: 565, y: 542 }, { x: 568, y: 560 },
      { x: 555, y: 568 }, { x: 542, y: 560 }
    ],
    center: { x: 555, y: 555 }
  },
  {
    id: 'aomen',
    name: '澳门',
    outline: [
      { x: 520, y: 550 }, { x: 535, y: 548 }, { x: 538, y: 562 },
      { x: 528, y: 568 }, { x: 518, y: 560 }
    ],
    center: { x: 528, y: 558 }
  }
];

export const MOCK_CHECKINS: CheckInRecord[] = [
  {
    id: uuidv4(),
    provinceId: 'beijing',
    restaurantName: '北京烤鸭店',
    address: '北京市东城区前门大街12号',
    rating: 5,
    review: '正宗北京烤鸭，皮脆肉嫩，配上荷叶饼和甜面酱，味道绝佳！',
    position: { x: 542, y: 145 },
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: uuidv4(),
    provinceId: 'beijing',
    restaurantName: '铜锅涮肉',
    address: '北京市西城区牛街5号',
    rating: 4,
    review: '老北京铜锅涮羊肉，肉质鲜嫩，麻酱料碗很地道。',
    position: { x: 530, y: 155 },
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: uuidv4(),
    provinceId: 'shanghai',
    restaurantName: '南翔小笼馆',
    address: '上海市黄浦区豫园路88号',
    rating: 5,
    review: '皮薄馅大，汤汁鲜美，一口一个超满足！',
    position: { x: 670, y: 330 },
    createdAt: Date.now() - 86400000 * 5
  },
  {
    id: uuidv4(),
    provinceId: 'guangdong',
    restaurantName: '陶陶居',
    address: '广州市荔湾区上下九步行街',
    rating: 5,
    review: '百年老字号，早茶点心精致美味，虾饺皇必点！',
    position: { x: 495, y: 520 },
    createdAt: Date.now() - 86400000 * 7
  },
  {
    id: uuidv4(),
    provinceId: 'sichuan',
    restaurantName: '老成都火锅',
    address: '成都市锦江区春熙路',
    rating: 5,
    review: '麻辣鲜香，牛油锅底浓郁，毛肚鸭肠超脆嫩！',
    position: { x: 340, y: 345 },
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: uuidv4(),
    provinceId: 'shandong',
    restaurantName: '青岛海鲜大排档',
    address: '青岛市市南区登州路',
    rating: 4,
    review: '新鲜海鲜配上青岛啤酒，夏天的绝配！',
    position: { x: 620, y: 225 },
    createdAt: Date.now() - 86400000 * 6
  },
  {
    id: uuidv4(),
    provinceId: 'hunan',
    restaurantName: '长沙臭豆腐',
    address: '长沙市天心区坡子街',
    rating: 4,
    review: '闻着臭吃着香，外酥里嫩，酱料一绝！',
    position: { x: 452, y: 430 },
    createdAt: Date.now() - 86400000 * 1
  },
  {
    id: uuidv4(),
    provinceId: 'zhejiang',
    restaurantName: '西湖醋鱼',
    address: '杭州市西湖区孤山路',
    rating: 4,
    review: '酸甜可口，鱼肉鲜嫩，西湖边的经典美味。',
    position: { x: 632, y: 370 },
    createdAt: Date.now() - 86400000 * 8
  }
];

export function getProvinceById(id: string): Province | undefined {
  return PROVINCES.find(p => p.id === id);
}

export function getCheckInsByProvince(checkIns: CheckInRecord[], provinceId: string): CheckInRecord[] {
  return checkIns.filter(c => c.provinceId === provinceId);
}

export function hasCheckInInProvince(checkIns: CheckInRecord[], provinceId: string): boolean {
  return checkIns.some(c => c.provinceId === provinceId);
}

export function addCheckIn(
  checkIns: CheckInRecord[],
  record: Omit<CheckInRecord, 'id' | 'createdAt'>
): CheckInRecord[] {
  const newRecord: CheckInRecord = {
    ...record,
    id: uuidv4(),
    createdAt: Date.now()
  };
  return [...checkIns, newRecord];
}

export function updateCheckIn(
  checkIns: CheckInRecord[],
  id: string,
  updates: Partial<CheckInRecord>
): CheckInRecord[] {
  return checkIns.map(c => (c.id === id ? { ...c, ...updates } : c));
}

export function deleteCheckIn(checkIns: CheckInRecord[], id: string): CheckInRecord[] {
  return checkIns.filter(c => c.id !== id);
}

export function getProvinceBounds(province: Province): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = province.outline.map(p => p.x);
  const ys = province.outline.map(p => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}
