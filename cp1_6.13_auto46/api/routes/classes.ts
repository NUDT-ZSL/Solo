import { Router, type Request, type Response } from 'express';
import { classesDB, changesDB } from '../db.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const query: Record<string, unknown> = {};

    if (startDate || endDate) {
      const dateFilter: Record<string, string> = {};
      if (startDate) dateFilter.$gte = String(startDate);
      if (endDate) dateFilter.$lte = String(endDate);
      query.date = dateFilter;
    }

    if (storeId) {
      query.storeId = String(storeId);
    }

    const classes = await classesDB.find(query).sort({ date: 1, timeSlot: 1 });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const fitnessClass = await classesDB.findOne({ _id: req.params.id });
    if (!fitnessClass) {
      res.status(404).json({ success: false, error: 'Class not found' });
      return;
    }
    res.json({ success: true, data: fitnessClass });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const newClass = {
      ...req.body,
      bookedCount: req.body.bookedCount || 0,
      bookedMembers: req.body.bookedMembers || [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await classesDB.insert(newClass);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await classesDB.findOne({ _id: req.params.id });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Class not found' });
      return;
    }

    const now = new Date().toISOString();
    const updateData = { ...req.body, updatedAt: now };
    await classesDB.update({ _id: req.params.id }, { $set: updateData });

    await changesDB.insert({
      classId: req.params.id,
      className: existing.name,
      changeType: 'updated',
      affectedMembers: existing.bookedMembers || [],
      storeId: existing.storeId,
      storeName: existing.storeName,
      date: existing.date,
      timeSlot: existing.timeSlot,
      createdAt: now,
    });

    const updated = await classesDB.findOne({ _id: req.params.id });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await classesDB.findOne({ _id: req.params.id });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Class not found' });
      return;
    }

    const now = new Date().toISOString();
    await classesDB.remove({ _id: req.params.id }, {});

    await changesDB.insert({
      classId: req.params.id,
      className: existing.name,
      changeType: 'cancelled',
      affectedMembers: existing.bookedMembers || [],
      storeId: existing.storeId,
      storeName: existing.storeName,
      date: existing.date,
      timeSlot: existing.timeSlot,
      createdAt: now,
    });

    res.json({ success: true, data: existing });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

export default router;
