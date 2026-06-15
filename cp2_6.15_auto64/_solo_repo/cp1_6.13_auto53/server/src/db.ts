import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Room, Booking, DailyLogEntry } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');

export const roomsDB = Datastore.create({
  filename: path.join(dataDir, 'rooms.db'),
  autoload: true,
});

export const bookingsDB = Datastore.create({
  filename: path.join(dataDir, 'bookings.db'),
  autoload: true,
});

export const logsDB = Datastore.create({
  filename: path.join(dataDir, 'logs.db'),
  autoload: true,
});

const seedRooms: Room[] = [
  {
    id: 'room-1',
    type: 'standard',
    name: '标准间',
    area: 15,
    weekdayPrice: 198,
    weekendPrice: 258,
    description: '温馨舒适的基础房型，适合中小型犬',
  },
  {
    id: 'room-2',
    type: 'deluxe',
    name: '豪华房',
    area: 25,
    weekdayPrice: 328,
    weekendPrice: 398,
    description: '宽敞明亮，配备独立阳台和游乐区',
  },
  {
    id: 'room-3',
    type: 'suite',
    name: '宠物套房',
    area: 40,
    weekdayPrice: 588,
    weekendPrice: 688,
    description: '顶级套房，24小时专属看护，恒温泳池',
  },
];

export async function initDatabase() {
  const existingRooms = await roomsDB.find({});
  if (existingRooms.length === 0) {
    await roomsDB.insertMany(seedRooms);
    console.log('种子数据已初始化：3个房间类型');
  }

  const existingBookings = await bookingsDB.find({});
  if (existingBookings.length === 0) {
    const today = new Date();
    const seedBookings: Booking[] = [
      {
        id: 'booking-demo-1',
        roomId: 'room-1',
        roomName: '标准间',
        checkIn: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
        checkOut: new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0],
        petCount: 1,
        petNames: ['旺财'],
        services: { feeding: true, walking: 2, bathing: 1 },
        totalPrice: 882,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'booking-demo-2',
        roomId: 'room-2',
        roomName: '豪华房',
        checkIn: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0],
        checkOut: new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0],
        petCount: 2,
        petNames: ['豆豆', '咪咪'],
        services: { feeding: true, walking: 3, bathing: 2 },
        totalPrice: 1650,
        createdAt: new Date().toISOString(),
      },
    ];
    await bookingsDB.insertMany(seedBookings);
    console.log('种子数据已初始化：2个示例预订');

    const seedLogs: DailyLogEntry[] = [
      {
        id: 'log-demo-1',
        bookingId: 'booking-demo-1',
        timestamp: new Date().toISOString(),
        type: 'feeding',
        notes: '早餐食用完毕，食欲良好',
        rating: 5,
      },
      {
        id: 'log-demo-2',
        bookingId: 'booking-demo-1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'walking',
        notes: '户外活动30分钟，精神状态佳',
        rating: 5,
      },
    ];
    await logsDB.insertMany(seedLogs);
    console.log('种子数据已初始化：2条看护日志');
  }
}
