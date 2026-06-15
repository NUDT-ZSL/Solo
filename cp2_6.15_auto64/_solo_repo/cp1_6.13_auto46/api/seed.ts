import { v4 as uuidv4 } from 'uuid';
import { classesDB, bookingsDB, changesDB, membersDB } from './db.js';

const stores = [
  { storeId: 'store-1', storeName: '朝阳店' },
  { storeId: 'store-2', storeName: '海淀店' },
  { storeId: 'store-3', storeName: '西城店' },
  { storeId: 'store-4', storeName: '东城店' },
  { storeId: 'store-5', storeName: '丰台店' },
  { storeId: 'store-6', storeName: '通州店' },
  { storeId: 'store-7', storeName: '昌平店' },
];

const timeSlots = [
  '06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00',
  '11:00-12:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '18:00-19:00',
];

const classTemplates = [
  { name: '晨间瑜伽', type: 'yoga', coach: '张教练', coachBio: '资深瑜伽导师，10年教学经验，擅长哈他瑜伽与流瑜伽', description: '在清晨的宁静中唤醒身体，通过瑜伽体式与呼吸练习开启活力满满的一天' },
  { name: '力量塑形', type: 'strength', coach: '李教练', coachBio: '国家级健身教练，力量训练专家，NSCA认证', description: '全身力量训练课程，结合自由重量与器械，打造强健体魄' },
  { name: '动感单车', type: 'cycling', coach: '王教练', coachBio: '动感单车认证教练，5年骑行教学经验，节奏感极强', description: '跟随音乐节奏骑行，高效燃脂的同时享受骑行的快乐' },
  { name: '普拉提核心', type: 'pilates', coach: '赵教练', coachBio: '普拉提国际认证导师，专注核心训练与体态矫正', description: '专注于核心肌群的普拉提训练，改善体态，提升身体控制力' },
  { name: '流瑜伽', type: 'yoga', coach: '孙教练', coachBio: '印度研修归来，精通阿斯汤加与流瑜伽体系', description: '流畅的体式衔接，在动态中寻找身心的平衡与和谐' },
  { name: 'HIIT燃脂', type: 'strength', coach: '周教练', coachBio: '运动科学硕士，擅长高强度间歇训练方案设计', description: '高强度间歇训练，短时间极致燃脂，提升心肺功能' },
  { name: '单车爬坡', type: 'cycling', coach: '吴教练', coachBio: '专业自行车运动员转型教练，爬坡训练专家', description: '模拟爬坡骑行，挑战自我极限，增强腿部力量与耐力' },
  { name: '垫上普拉提', type: 'pilates', coach: '郑教练', coachBio: '舞蹈背景出身，普拉提与舞蹈融合教学', description: '垫上普拉提基础课程，适合初学者，温和而有效的全身训练' },
  { name: '阴瑜伽', type: 'yoga', coach: '陈教练', coachBio: '阴瑜伽高级导师，禅修实践者，注重身心连接', description: '深度拉伸与长时间保持体式，释放筋膜紧张，找到内在宁静' },
  { name: '体能训练营', type: 'strength', coach: '刘教练', coachBio: '前特种兵体能教练，擅长功能性训练', description: '军事化体能训练，挑战极限，突破自我，全面提升身体素质' },
];

const sampleMembers = [
  {
    _id: 'member-admin',
    name: '管理员',
    phone: '13800000000',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'member-1',
    name: '张三',
    phone: '13800001111',
    role: 'member',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getDateForDay(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

export async function seedDatabase(): Promise<void> {
  const existingMembers = await membersDB.count({});
  if (existingMembers > 0) {
    return;
  }

  await membersDB.insert(sampleMembers);

  const classes: Array<Record<string, unknown>> = [];

  for (let day = 0; day < 7; day++) {
    const date = getDateForDay(day);
    const classesPerDay = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < classesPerDay; i++) {
      const store = stores[Math.floor(Math.random() * stores.length)];
      const template = classTemplates[Math.floor(Math.random() * classTemplates.length)];
      const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      const capacity = 15 + Math.floor(Math.random() * 16);
      const bookedCount = Math.floor(Math.random() * (capacity + 1));
      const bookedMembers: string[] = [];

      for (let b = 0; b < bookedCount; b++) {
        bookedMembers.push(Math.random() > 0.5 ? 'member-admin' : 'member-1');
      }

      const now = new Date().toISOString();

      classes.push({
        _id: uuidv4(),
        name: template.name,
        type: template.type,
        coach: template.coach,
        coachBio: template.coachBio,
        description: template.description,
        storeId: store.storeId,
        storeName: store.storeName,
        date,
        timeSlot,
        capacity,
        bookedCount,
        bookedMembers,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await classesDB.insert(classes);
}
