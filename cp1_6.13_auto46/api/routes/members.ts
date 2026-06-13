import { Router, type Request, type Response } from "express";
import { memberDB } from "../db";
import type { Member } from "../types/models";
import { UserRole } from "../constants/classTypes";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const members = await memberDB.find<Member>({});
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get("/current", async (_req: Request, res: Response): Promise<void> => {
  try {
    const admin = await memberDB.findOne<Member>({ role: UserRole.ADMIN });
    const member =
      admin ??
      ({
        _id: "demo-member",
        name: "演示会员",
        role: UserRole.MEMBER,
      } as Member);
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
