import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, roomsDB, bookingsDB, logsDB } from './db';
import type { Room, Booking, ScheduleItem, DailyLogEntry, BookingCreateDTO, DailyLogCreateDTO } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDatesBetween(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const current = new Date(start);
  
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function calculatePrice(
  room: Room,
  checkIn: string,
  checkOut: string,
  services: { feeding: boolean; walking: number; bathing: number }
): number {
  const dates = getDatesBetween(checkIn, checkOut);
  let roomTotal = 0;
  
  for (const date of dates) {
    roomTotal += isWeekend(date) ? room.weekendPrice : room.weekdayPrice;
  }
  
  const days = dates.length;
  const feedingPrice = services.feeding ? 30 * days : 0;
  const walkingPrice = services.walking * 50;
  const bathingPrice = services.bathing * 80;
  
  return roomTotal + feedingPrice + walkingPrice + bathingPrice;
}

async function checkBookingConflict(roomId: string, checkIn: string, checkOut: string, excludeId?: string): Promise<boolean> {
  const allBookings = await bookingsDB.find({ roomId }) as Booking[];
  const newDates = new Set(getDatesBetween(checkIn, checkOut));
  
  for (const booking of allBookings) {
    if (excludeId && booking.id === excludeId) continue;
    const existingDates = getDatesBetween(booking.checkIn, booking.checkOut);
    for (const d of existingDates) {
      if (newDates.has(d)) {
        return true;
      }
    }
  }
  return false;
}

app.get('/api/rooms', async (_req, res) => {
  try {
    const rooms = await roomsDB.find({}) as Room[];
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: '获取房间列表失败' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, petCount, petNames, services } = req.body as BookingCreateDTO;
    
    if (!roomId || !checkIn || !checkOut || !petCount || !petNames || !services) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    const room = await roomsDB.findOne({ id: roomId }) as Room | null;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    const hasConflict = await checkBookingConflict(roomId, checkIn, checkOut);
    if (hasConflict) {
      return res.status(409).json({ error: '该房间在所选日期已被预订' });
    }
    
    const totalPrice = calculatePrice(room, checkIn, checkOut, services);
    
    const newBooking: Booking = {
      id: uuidv4(),
      roomId,
      roomName: room.name,
      checkIn,
      checkOut,
      petCount,
      petNames,
      services,
      totalPrice,
      createdAt: new Date().toISOString(),
    };
    
    const result = await bookingsDB.insert(newBooking);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: '创建预订失败' });
  }
});

app.get('/api/bookings/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await bookingsDB.findOne({ id }) as Booking | null;
    
    if (!booking) {
      return res.status(404).json({ error: '预订不存在' });
    }
    
    const dates = getDatesBetween(booking.checkIn, booking.checkOut);
    const schedule: ScheduleItem[] = [];
    
    for (const date of dates) {
      const hasConflict = await checkBookingConflict(booking.roomId, date, 
        new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0],
        booking.id
      );
      
      schedule.push({
        date,
        roomId: booking.roomId,
        bookingId: booking.id,
        petNames: booking.petNames,
        isConflict: hasConflict,
      });
    }
    
    res.json({
      booking,
      schedule,
      dailyBreakdown: dates.map(date => ({
        date,
        isWeekend: isWeekend(date),
        basePrice: isWeekend(date) 
          ? (await roomsDB.findOne({ id: booking.roomId }) as Room).weekendPrice
          : (await roomsDB.findOne({ id: booking.roomId }) as Room).weekdayPrice,
        services: {
          feeding: booking.services.feeding ? 30 : 0,
        }
      }))
    });
  } catch (error) {
    res.status(500).json({ error: '获取日程失败' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { bookingId, type, notes, photoUrl, rating } = req.body as DailyLogCreateDTO;
    
    if (!bookingId || !type || !notes) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    const booking = await bookingsDB.findOne({ id: bookingId }) as Booking | null;
    if (!booking) {
      return res.status(404).json({ error: '预订不存在' });
    }
    
    const newLog: DailyLogEntry = {
      id: uuidv4(),
      bookingId,
      timestamp: new Date().toISOString(),
      type,
      notes,
      photoUrl,
      rating,
    };
    
    const result = await logsDB.insert(newLog);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: '创建日志失败' });
  }
});

app.get('/api/logs/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const logs = await logsDB.find({ bookingId }).sort({ timestamp: -1 }) as DailyLogEntry[];
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: '获取日志失败' });
  }
});

app.get('/api/bookings', async (_req, res) => {
  try {
    const bookings = await bookingsDB.find({}).sort({ createdAt: -1 }) as Booking[];
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: '获取预订列表失败' });
  }
});

app.get('/api/schedule', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const rooms = await roomsDB.find({}) as Room[];
    const allBookings = await bookingsDB.find({}) as Booking[];
    
    const startDate = new Date();
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const scheduleByRoom: Record<string, ScheduleItem[]> = {};
    
    for (const room of rooms) {
      scheduleByRoom[room.id] = [];
      
      for (const date of dates) {
        const nextDate = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0];
        const dayBookings = allBookings.filter(b => {
          if (b.roomId !== room.id) return false;
          const bDates = getDatesBetween(b.checkIn, b.checkOut);
          return bDates.includes(date);
        });
        
        if (dayBookings.length > 0) {
          for (const booking of dayBookings) {
            scheduleByRoom[room.id].push({
              date,
              roomId: room.id,
              bookingId: booking.id,
              petNames: booking.petNames,
              isConflict: dayBookings.length > 1,
            });
          }
        }
      }
    }
    
    res.json({
      dates,
      rooms,
      schedule: scheduleByRoom,
    });
  } catch (error) {
    res.status(500).json({ error: '获取日程看板失败' });
  }
});

app.get('/api/price/calculate', async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, feeding, walking, bathing } = req.query;
    
    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ error: '缺少必填参数' });
    }
    
    const room = await roomsDB.findOne({ id: roomId as string }) as Room | null;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    const services = {
      feeding: feeding === 'true',
      walking: parseInt(walking as string) || 0,
      bathing: parseInt(bathing as string) || 0,
    };
    
    const totalPrice = calculatePrice(room, checkIn as string, checkOut as string, services);
    const dates = getDatesBetween(checkIn as string, checkOut as string);
    
    res.json({
      totalPrice,
      days: dates.length,
      breakdown: {
        roomTotal: totalPrice - (services.feeding ? 30 * dates.length : 0) - services.walking * 50 - services.bathing * 80,
        feeding: services.feeding ? 30 * dates.length : 0,
        walking: services.walking * 50,
        bathing: services.bathing * 80,
      }
    });
  } catch (error) {
    res.status(500).json({ error: '计算价格失败' });
  }
});

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`PetHotel 后端服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();
