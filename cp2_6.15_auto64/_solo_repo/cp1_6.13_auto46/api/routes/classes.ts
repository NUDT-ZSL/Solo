import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { classDB } from "../db";
import { broadcastToMembers } from "../ws";
import type {
  CreateClassInput,
  GymClass,
  UpdateClassInput,
  ClassChange,
  WsMessageClassUpdate,
} from "../types/models";
import { classChangeDB } from "../db";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const query: Record<string, unknown> = {};
    if (startDate || endDate) {
      const dateQuery: Record<string, string> = {};
      if (startDate) dateQuery.$gte = startDate;
      if (endDate) dateQuery.$lte = endDate;
      query.date = dateQuery;
    }
    const classes = await classDB.find<GymClass>(query).sort({ date: 1, timeSlot: 1 });
    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const cls = await classDB.findOne<GymClass>({ _id: req.params.id });
    if (!cls) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    res.status(200).json({ success: true, data: cls });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateClassInput;
    const now = new Date().toISOString();
    const newClass: GymClass = {
      _id: uuidv4(),
      ...input,
      bookedCount: 0,
      bookedMembers: [],
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await classDB.insert<GymClass>(newClass);
    res.status(201).json({ success: true, data: inserted });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await classDB.findOne<GymClass>({ _id: req.params.id });
    if (!existing) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    const update = req.body as UpdateClassInput;
    const updated: GymClass = {
      ...existing,
      ...update,
      _id: existing._id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const result = await classDB.update<GymClass>(
      { _id: req.params.id },
      { $set: updated },
      { returnUpdatedDocs: true }
    );
    const updatedDoc = (result as { documents: GymClass[] }).documents?.[0] ?? updated;

    if (existing.bookedMembers.length > 0) {
      const changeRecord: ClassChange = {
        _id: uuidv4(),
        classId: existing._id,
        className: updatedDoc.name,
        changeType: "updated",
        affectedMembers: existing.bookedMembers,
        timestamp: new Date().toISOString(),
      };
      await classChangeDB.insert(changeRecord);

      const msg: WsMessageClassUpdate = {
        type: "class_updated",
        classId: existing._id,
        className: updatedDoc.name,
        affectedMembers: existing.bookedMembers,
        timestamp: changeRecord.timestamp,
      };
      broadcastToMembers(msg);
    }

    res.status(200).json({ success: true, data: updatedDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await classDB.findOne<GymClass>({ _id: req.params.id });
    if (!existing) {
      res.status(404).json({ success: false, error: "Class not found" });
      return;
    }
    await classDB.remove({ _id: req.params.id }, {});

    if (existing.bookedMembers.length > 0) {
      const changeRecord: ClassChange = {
        _id: uuidv4(),
        classId: existing._id,
        className: existing.name,
        changeType: "cancelled",
        affectedMembers: existing.bookedMembers,
        timestamp: new Date().toISOString(),
      };
      await classChangeDB.insert(changeRecord);

      const msg: WsMessageClassUpdate = {
        type: "class_cancelled",
        classId: existing._id,
        className: existing.name,
        affectedMembers: existing.bookedMembers,
        timestamp: changeRecord.timestamp,
      };
      broadcastToMembers(msg);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
