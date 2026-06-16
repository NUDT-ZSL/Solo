export interface Station {
  id: string;
  name: string;
  lineId: string;
  x: number;
  y: number;
  passengerFlow: number[];
}

export interface Line {
  id: string;
  name: string;
  color: string;
  stationIds: string[];
}

export const lines: Line[] = [
  {
    id: 'line1',
    name: '1号线',
    color: '#e74c3c',
    stationIds: ['s1-1', 's1-2', 's1-3', 's1-4', 's1-5', 's1-6', 's1-7', 's1-8'],
  },
  {
    id: 'line2',
    name: '2号线',
    color: '#3498db',
    stationIds: ['s2-1', 's2-2', 's2-3', 's2-4', 's2-5', 's2-6', 's2-7'],
  },
  {
    id: 'line3',
    name: '3号线',
    color: '#2ecc71',
    stationIds: ['s3-1', 's3-2', 's3-3', 's3-4', 's3-5', 's3-6'],
  },
  {
    id: 'line4',
    name: '4号线',
    color: '#f39c12',
    stationIds: ['s4-1', 's4-2', 's4-3', 's4-4', 's4-5'],
  },
  {
    id: 'line5',
    name: '5号线',
    color: '#9b59b6',
    stationIds: ['s5-1', 's5-2', 's5-3', 's5-4', 's5-5', 's5-6'],
  },
];

const generatePassengerFlow = (base: number): number[] => {
  const hours = 24;
  const flow: number[] = [];
  for (let i = 0; i < hours; i++) {
    let multiplier = 0.2;
    if (i >= 7 && i <= 9) {
      multiplier = 0.8 + Math.random() * 0.2;
    } else if (i >= 17 && i <= 19) {
      multiplier = 0.9 + Math.random() * 0.1;
    } else if (i >= 12 && i <= 14) {
      multiplier = 0.5 + Math.random() * 0.2;
    } else if (i >= 6 && i <= 22) {
      multiplier = 0.3 + Math.random() * 0.3;
    }
    flow.push(Math.floor(base * multiplier));
  }
  return flow;
};

export const stations: Station[] = [
  { id: 's1-1', name: '苹果园', lineId: 'line1', x: 80, y: 200, passengerFlow: generatePassengerFlow(15000) },
  { id: 's1-2', name: '古城', lineId: 'line1', x: 150, y: 200, passengerFlow: generatePassengerFlow(12000) },
  { id: 's1-3', name: '八角游乐园', lineId: 'line1', x: 220, y: 200, passengerFlow: generatePassengerFlow(10000) },
  { id: 's1-4', name: '八宝山', lineId: 'line1', x: 290, y: 200, passengerFlow: generatePassengerFlow(18000) },
  { id: 's1-5', name: '玉泉路', lineId: 'line1', x: 360, y: 200, passengerFlow: generatePassengerFlow(20000) },
  { id: 's1-6', name: '五棵松', lineId: 'line1', x: 430, y: 200, passengerFlow: generatePassengerFlow(25000) },
  { id: 's1-7', name: '万寿路', lineId: 'line1', x: 500, y: 200, passengerFlow: generatePassengerFlow(22000) },
  { id: 's1-8', name: '公主坟', lineId: 'line1', x: 570, y: 200, passengerFlow: generatePassengerFlow(30000) },

  { id: 's2-1', name: '西直门', lineId: 'line2', x: 320, y: 80, passengerFlow: generatePassengerFlow(35000) },
  { id: 's2-2', name: '车公庄', lineId: 'line2', x: 320, y: 140, passengerFlow: generatePassengerFlow(28000) },
  { id: 's2-3', name: '阜成门', lineId: 'line2', x: 320, y: 200, passengerFlow: generatePassengerFlow(25000) },
  { id: 's2-4', name: '复兴门', lineId: 'line2', x: 320, y: 260, passengerFlow: generatePassengerFlow(32000) },
  { id: 's2-5', name: '长椿街', lineId: 'line2', x: 320, y: 320, passengerFlow: generatePassengerFlow(20000) },
  { id: 's2-6', name: '宣武门', lineId: 'line2', x: 320, y: 380, passengerFlow: generatePassengerFlow(28000) },
  { id: 's2-7', name: '和平门', lineId: 'line2', x: 320, y: 440, passengerFlow: generatePassengerFlow(18000) },

  { id: 's3-1', name: '天通苑北', lineId: 'line3', x: 450, y: 60, passengerFlow: generatePassengerFlow(20000) },
  { id: 's3-2', name: '天通苑', lineId: 'line3', x: 450, y: 120, passengerFlow: generatePassengerFlow(22000) },
  { id: 's3-3', name: '立水桥', lineId: 'line3', x: 450, y: 180, passengerFlow: generatePassengerFlow(28000) },
  { id: 's3-4', name: '北苑路北', lineId: 'line3', x: 450, y: 240, passengerFlow: generatePassengerFlow(24000) },
  { id: 's3-5', name: '大屯路东', lineId: 'line3', x: 450, y: 300, passengerFlow: generatePassengerFlow(26000) },
  { id: 's3-6', name: '惠新西街北口', lineId: 'line3', x: 450, y: 360, passengerFlow: generatePassengerFlow(30000) },

  { id: 's4-1', name: '宋家庄', lineId: 'line4', x: 180, y: 350, passengerFlow: generatePassengerFlow(25000) },
  { id: 's4-2', name: '刘家窑', lineId: 'line4', x: 250, y: 380, passengerFlow: generatePassengerFlow(20000) },
  { id: 's4-3', name: '蒲黄榆', lineId: 'line4', x: 320, y: 410, passengerFlow: generatePassengerFlow(22000) },
  { id: 's4-4', name: '天坛东门', lineId: 'line4', x: 390, y: 440, passengerFlow: generatePassengerFlow(18000) },
  { id: 's4-5', name: '磁器口', lineId: 'line4', x: 460, y: 470, passengerFlow: generatePassengerFlow(24000) },

  { id: 's5-1', name: '海淀黄庄', lineId: 'line5', x: 150, y: 280, passengerFlow: generatePassengerFlow(28000) },
  { id: 's5-2', name: '知春里', lineId: 'line5', x: 220, y: 310, passengerFlow: generatePassengerFlow(22000) },
  { id: 's5-3', name: '知春路', lineId: 'line5', x: 290, y: 340, passengerFlow: generatePassengerFlow(26000) },
  { id: 's5-4', name: '西土城', lineId: 'line5', x: 360, y: 370, passengerFlow: generatePassengerFlow(20000) },
  { id: 's5-5', name: '牡丹园', lineId: 'line5', x: 430, y: 400, passengerFlow: generatePassengerFlow(24000) },
  { id: 's5-6', name: '健德门', lineId: 'line5', x: 500, y: 430, passengerFlow: generatePassengerFlow(22000) },
];

export const getStationById = (id: string): Station | undefined => {
  return stations.find((s) => s.id === id);
};

export const getLineById = (id: string): Line | undefined => {
  return lines.find((l) => l.id === id);
};

export const getStationsByLineId = (lineId: string): Station[] => {
  return stations.filter((s) => s.lineId === lineId);
};

export const timeLabels = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];
