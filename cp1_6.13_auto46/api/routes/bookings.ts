import { Router, type Request, type Response } from 'express';
import { classesDB, bookingsDB } from '../db.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, memberId, memberName } = req.body;

    if (!classId || !memberId || !memberName) {
      res.status(400).json({ success: false, error: 'classId, memberId and memberName are required' });
      return;
    }

    const fitnessClass = await classesDB.findOne({ _id: classId });
    if (!fitnessClass) {
      res.status(404).json({ success: false, error: 'Class not found' });
      return;
    }

    const bookedMembers: string[] = fitnessClass.bookedMembers || [];
    if (bookedMembers.includes(memberId)) {
      res.status(400).json({ success: false, error: 'Already booked' });
      return;
    }

    if (fitnessClass.bookedCount >= fitnessClass.capacity) {
      res.status(400).json({ success: false, error: 'Class is full' });
      return;
    }

    const now = new Date().toISOString();
    const booking = {
      classId,
      memberId,
      memberName,
      createdAt: now,
    };

    await bookingsDB.insert(booking);

    await classesDB.update(
      { _id: classId },
      {
        $set: { updatedAt: now },
        $inc: { bookedCount: 1 },
        $push: { bookedMembers: memberId },
      },
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

router.delete('/:classId/:memberId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, memberId } = req.params;

    const fitnessClass = await classesDB.findOne({ _id: classId });
    if (!fitnessClass) {
      res.status(404).json({ success: false, error: 'Class not found' });
      return;
    }

    const bookedMembers: string[] = fitnessClass.bookedMembers || [];
    if (!bookedMembers.includes(memberId)) {
      res.status(400).json({ success: false, error: 'Booking not found' });
      return;
    }

    await bookingsDB.remove({ classId, memberId }, { multi: true });

    const now = new Date().toISOString();
    await classesDB.update(
      { _id: classId },
      {
        $set: { updatedAt: now },
        $inc: { bookedCount: -1 },
        $pull: { bookedMembers: memberId },
      },
    );

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

export default router;
