import { Router, type Request, type Response } from "express";
import { classDB } from "../db";
import { STORES, TIME_SLOTS } from "../constants/classTypes";
import type { GymClass, HeatmapCell, HeatmapMatrix, Store } from "../types/models";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const classes = await classDB.find<GymClass>({});

    const storeList: Store[] = STORES.map((s) => ({ _id: s.id, name: s.name }));

    const cells: HeatmapCell[][] = STORES.map((store) =>
      TIME_SLOTS.map((timeSlot) => {
        const storeClasses = classes.filter(
          (c) => c.storeId === store.id && c.timeSlot === timeSlot
        );
        const totalCapacity = storeClasses.reduce((sum, c) => sum + c.capacity, 0);
        const totalBooked = storeClasses.reduce((sum, c) => sum + c.bookedCount, 0);
        const fillRate = totalCapacity > 0 ? totalBooked / totalCapacity : 0;
        return {
          storeId: store.id,
          storeName: store.name,
          timeSlot,
          fillRate,
          totalCapacity,
          totalBooked,
          classes: storeClasses,
        } as HeatmapCell;
      })
    );

    const matrix: HeatmapMatrix = {
      stores: storeList,
      timeSlots: TIME_SLOTS,
      cells,
    };

    res.status(200).json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
