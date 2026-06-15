import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { bookingDB, classDB } from "../db";
import type { BookClassInput, Booking, CancelBookingInput, GymClass } from "../types/models";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, memberId, memberName } = req.body as BookClassInput;
    const cls = await classDB.findOne<GymClass>({ _id: classId });
    if (!cls) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    if (cls.bookedMembers.includes(memberId)) {
      res.status(400).json({ success: false, error: "已经预约过该课程" });
      return;
    }
    if (cls.bookedCount >= cls.capacity) {
      res.status(400).json({ success: false, error: "该课程已满员" });
      return;
    }

    const booking: Booking = {
      _id: uuidv4(),
      classId,
      memberId,
      memberName,
      createdAt: new Date().toISOString(),
    };
    await bookingDB.insert(booking);

    const updated = await classDB.update<GymClass>(
      { _id: classId },
      {
        $set: {
          bookedCount: cls.bookedCount + 1,
          bookedMembers: [...cls.bookedMembers, memberId],
          updatedAt: new Date().toISOString(),
        },
      },
      { returnUpdatedDocs: true }
    );
    const updatedDoc = (updated as { documents: GymClass[] }).documents?.[0];

    res.status(201).json({ success: true, data: { booking, class: updatedDoc } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.delete("/:classId/:memberId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, memberId } = req.params as CancelBookingInput;
    const cls = await classDB.findOne<GymClass>({ _id: classId });
    if (!cls) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    if (!cls.bookedMembers.includes(memberId)) {
      res.status(400).json({ success: false, error: "未预约该课程" });
      return;
    }

    await bookingDB.remove({ classId, memberId }, { multi: true });

    const newBookedMembers = cls.bookedMembers.filter((id) => id !== memberId);
    const updated = await classDB.update<GymClass>(
      { _id: classId },
      {
        $set: {
          bookedCount: newBookedMembers.length,
          bookedMembers: newBookedMembers,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnUpdatedDocs: true }
    );
    const updatedDoc = (updated as { documents: GymClass[] }).documents?.[0];

    res.status(200).json({ success: true, data: { class: updatedDoc } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
