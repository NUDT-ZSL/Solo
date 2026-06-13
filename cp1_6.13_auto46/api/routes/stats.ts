import { Router, type Request, type Response } from 'express';
import { classesDB } from '../db.js';

const router = Router();

const allTimeSlots = [
  '06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00',
  '11:00-12:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '18:00-19:00',
];

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const query: Record<string, unknown> = {};

    if (startDate || endDate) {
      const dateFilter: Record<string, string> = {};
      if (startDate) dateFilter.$gte = String(startDate);
      if (endDate) dateFilter.$lte = String(endDate);
      query.date = dateFilter;
    }

    const classes = await classesDB.find(query);

    const storeMap = new Map<string, { storeId: string; storeName: string; classes: typeof classes }>();
    for (const cls of classes) {
      if (!storeMap.has(cls.storeId)) {
        storeMap.set(cls.storeId, { storeId: cls.storeId, storeName: cls.storeName, classes: [] });
      }
      storeMap.get(cls.storeId)!.classes.push(cls);
    }

    const result = Array.from(storeMap.values()).map(store => {
      const timeSlots = allTimeSlots.map(timeSlot => {
        const slotClasses = store.classes.filter(c => c.timeSlot === timeSlot);
        const totalCapacity = slotClasses.reduce((sum, c) => sum + (c.capacity as number), 0);
        const totalBooked = slotClasses.reduce((sum, c) => sum + (c.bookedCount as number), 0);
        const fillRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 10000) / 100 : 0;

        return {
          timeSlot,
          totalCapacity,
          totalBooked,
          fillRate,
          classes: slotClasses,
        };
      });

      return {
        storeId: store.storeId,
        storeName: store.storeName,
        timeSlots,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

export default router;
