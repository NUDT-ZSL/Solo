import { v4 as uuidv4 } from "uuid";
import { classDB, bookingDB, memberDB, classChangeDB } from "./index";
import { ClassType, STORES, TIME_SLOTS, UserRole } from "../constants/classTypes";
import type { GymClass, Member } from "../types/models";

function formatDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const MEMBER_NAMES = [
  "张三",
  "李四",
  "王五",
  "赵六",
  "陈七",
  "孙八",
  "周九",
  "吴十",
  "郑十一",
  "冯十二",
];

const COACHES = [
  { name: "王教练", bio: "10年健身教练经验，国家一级运动员，擅长力量训练与体脂管理" },
  { name: "李教练", bio: "瑜伽高级导师，印度RYS500认证，专注身心平衡教学8年" },
  { name: "张教练", bio: "动感单车金牌教练，莱美体系认证，节奏把控大师" },
  { name: "陈教练", bio: "普拉提国际认证教练，擅长体态矫正与核心训练" },
  { name: "刘教练", bio: "前国家队体能教练，CrossFit L2认证，功能性训练专家" },
];

const CLASS_TEMPLATES = [
  {
    name: "流瑜伽",
    type: ClassType.YOGA,
    coach: COACHES[1],
    description: "以流畅的体式串联呼吸，提升身体柔韧性和心肺功能，适合有一定基础的学员。",
  },
  {
    name: "哈他瑜伽",
    type: ClassType.YOGA,
    coach: COACHES[1],
    description: "经典瑜伽体式教学，注重呼吸与体式的结合，适合初学者。",
  },
  {
    name: "力量塑形",
    type: ClassType.STRENGTH,
    coach: COACHES[0],
    description: "通过自由重量和器械进行全身力量训练，打造紧致线条，提升基础代谢。",
  },
  {
    name: "功能性训练",
    type: ClassType.STRENGTH,
    coach: COACHES[4],
    description: "多关节复合动作训练，提升日常生活中的运动表现和身体协调性。",
  },
  {
    name: "燃脂单车",
    type: ClassType.CYCLING,
    coach: COACHES[2],
    description: "高强度间歇骑行训练，配合动感音乐，45分钟高效燃脂。",
  },
  {
    name: "节奏单车",
    type: ClassType.CYCLING,
    coach: COACHES[2],
    description: "跟随音乐节奏进行有氧骑行，释放压力的同时燃烧卡路里。",
  },
  {
    name: "垫上普拉提",
    type: ClassType.PILATES,
    coach: COACHES[3],
    description: "核心肌群精准控制训练，改善体态，增强身体控制能力。",
  },
  {
    name: "塑形普拉提",
    type: ClassType.PILATES,
    coach: COACHES[3],
    description: "结合小器械的普拉提训练，重点塑造臀部和腹部线条。",
  },
];

export async function seedIfEmpty(): Promise<void> {
  const existingCount = await classDB.count({});
  if (existingCount > 0) {
    console.log("Database already has seed data, skipping.");
    return;
  }

  console.log("Seeding database with sample data...");

  const members: Member[] = MEMBER_NAMES.map((name, idx) => ({
    _id: uuidv4(),
    name,
    role: idx === 0 ? UserRole.ADMIN : UserRole.MEMBER,
  }));
  await memberDB.insert(members);

  const classes: GymClass[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = formatDate(dayOffset);

    for (let s = 0; s < STORES.length; s++) {
      const store = STORES[s];
      const slotsPerStore = 2 + Math.floor(Math.random() * 3);
      const usedSlots = new Set<number>();

      for (let c = 0; c < slotsPerStore; c++) {
        let slotIdx: number;
        do {
          slotIdx = Math.floor(Math.random() * TIME_SLOTS.length);
        } while (usedSlots.has(slotIdx));
        usedSlots.add(slotIdx);

        const template =
          CLASS_TEMPLATES[Math.floor(Math.random() * CLASS_TEMPLATES.length)];
        const capacity = 10 + Math.floor(Math.random() * 15);
        const bookedCount = Math.floor(Math.random() * (capacity + 1));
        const bookedMemberIds: string[] = [];

        for (let b = 0; b < bookedCount; b++) {
          const member = members[1 + Math.floor(Math.random() * (members.length - 1))];
          if (!bookedMemberIds.includes(member._id)) {
            bookedMemberIds.push(member._id);
          }
        }

        const now = new Date().toISOString();
        const gymClass: GymClass = {
          _id: uuidv4(),
          name: template.name,
          type: template.type,
          coach: template.coach.name,
          coachBio: template.coach.bio,
          description: template.description,
          storeId: store.id,
          storeName: store.name,
          date,
          timeSlot: TIME_SLOTS[slotIdx],
          capacity,
          bookedCount: bookedMemberIds.length,
          bookedMembers: bookedMemberIds,
          createdAt: now,
          updatedAt: now,
        };
        classes.push(gymClass);
      }
    }
  }

  await classDB.insert(classes);

  const bookings = [];
  for (const cls of classes) {
    for (const memberId of cls.bookedMembers) {
      const member = members.find((m) => m._id === memberId);
      if (member) {
        bookings.push({
          _id: uuidv4(),
          classId: cls._id,
          memberId,
          memberName: member.name,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
  if (bookings.length > 0) {
    await bookingDB.insert(bookings);
  }

  await classChangeDB.ensureIndex({ fieldName: "timestamp" });

  console.log(
    `Seeded: ${classes.length} classes, ${bookings.length} bookings, ${members.length} members`
  );
}
