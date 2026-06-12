import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  _id: string;
  nickname: string;
  email: string;
  createdAt: number;
  avatar?: string;
}

export interface Skill {
  _id: string;
  userId: string;
  userNickname: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
}

export interface ExchangeRequest {
  _id: string;
  fromUserId: string;
  toUserId: string;
  skillId: string;
  skillName: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: number;
}

export interface Message {
  _id: string;
  exchangeId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  read: boolean;
  createdAt: number;
}

const dataDir = './data';

export const db = {
  users: Datastore.create({ filename: `${dataDir}/users.db`, autoload: true }),
  skills: Datastore.create({ filename: `${dataDir}/skills.db`, autoload: true }),
  exchanges: Datastore.create({ filename: `${dataDir}/exchanges.db`, autoload: true }),
  messages: Datastore.create({ filename: `${dataDir}/messages.db`, autoload: true }),
};

async function initIndexes() {
  await db.users.ensureIndex({ fieldName: 'email', unique: true });
  await db.skills.ensureIndex({ fieldName: 'userId' });
  await db.exchanges.ensureIndex({ fieldName: 'fromUserId' });
  await db.exchanges.ensureIndex({ fieldName: 'toUserId' });
  await db.messages.ensureIndex({ fieldName: 'exchangeId' });
  await db.messages.ensureIndex({ fieldName: 'fromUserId' });
  await db.messages.ensureIndex({ fieldName: 'toUserId' });
  await db.messages.ensureIndex({ fieldName: 'createdAt' });
  await db.exchanges.ensureIndex({ fieldName: 'createdAt' });
  await db.skills.ensureIndex({ fieldName: 'createdAt' });
}

async function seedData() {
  const existingSkills = await db.skills.find({});
  if (existingSkills.length > 0) return;

  const mockUsers: Omit<User, '_id' | 'createdAt'>[] = [
    { nickname: '小明', email: 'xiaoming@example.com' },
    { nickname: '小红', email: 'xiaohong@example.com' },
    { nickname: '张三', email: 'zhangsan@example.com' },
    { nickname: '李四', email: 'lisi@example.com' },
    { nickname: '王五', email: 'wangwu@example.com' },
    { nickname: '赵六', email: 'zhaoliu@example.com' },
  ];

  const createdUsers: User[] = [];
  const now = Date.now();

  for (const user of mockUsers) {
    try {
      const newUser: User = {
        ...user,
        _id: uuidv4(),
        createdAt: now - Math.random() * 30 * 24 * 60 * 60 * 1000,
      };
      await db.users.insert(newUser);
      createdUsers.push(newUser);
    } catch (e) {
      const existing = await db.users.findOne({ email: user.email });
      if (existing) createdUsers.push(existing);
    }
  }

  const mockSkills: Omit<Skill, '_id' | 'createdAt'>[] = [
    {
      userId: createdUsers[0]._id,
      userNickname: createdUsers[0].nickname,
      name: 'Photoshop修图',
      description: '精通PS人像修图、风景调色、海报设计，可以教你从基础到进阶的修图技巧。',
      tags: ['设计', '修图', '创意'],
    },
    {
      userId: createdUsers[1]._id,
      userNickname: createdUsers[1].nickname,
      name: 'Python编程',
      description: '5年Python开发经验，擅长数据分析、Web开发、自动化脚本编写。从零开始教学，循序渐进。',
      tags: ['编程', '数据', '后端'],
    },
    {
      userId: createdUsers[2]._id,
      userNickname: createdUsers[2].nickname,
      name: '吉他教学',
      description: '民谣吉他10年弹奏经验，可教基础指法、弹唱、指弹。提供练习曲目和指导视频。',
      tags: ['音乐', '乐器', '弹唱'],
    },
    {
      userId: createdUsers[3]._id,
      userNickname: createdUsers[3].nickname,
      name: '摄影技巧',
      description: '专业摄影师，擅长人像、风光摄影。可以教你构图、用光、后期调色全流程。',
      tags: ['摄影', '艺术', '美学'],
    },
    {
      userId: createdUsers[4]._id,
      userNickname: createdUsers[4].nickname,
      name: '英语辅导',
      description: '英语专业八级，5年教学经验。可辅导口语、听力、阅读、写作，四六级雅思托福都可。',
      tags: ['语言', '英语', '考试'],
    },
    {
      userId: createdUsers[5]._id,
      userNickname: createdUsers[5].nickname,
      name: '瑜伽指导',
      description: '认证瑜伽教练，可教哈他瑜伽、流瑜伽、阴瑜伽。提供适合不同水平的练习方案。',
      tags: ['健身', '瑜伽', '养生'],
    },
    {
      userId: createdUsers[0]._id,
      userNickname: createdUsers[0].nickname,
      name: 'UI设计',
      description: '互联网公司UI设计师，精通Figma、Sketch。可教设计规范、组件库搭建、交互动效。',
      tags: ['设计', 'UI', '产品'],
    },
    {
      userId: createdUsers[1]._id,
      userNickname: createdUsers[1].nickname,
      name: '日语N2备考',
      description: '日语N1满分通过，可辅导N2考试的语法、阅读、听力。提供学习计划和真题讲解。',
      tags: ['语言', '日语', '考试'],
    },
    {
      userId: createdUsers[2]._id,
      userNickname: createdUsers[2].nickname,
      name: '电子琴教学',
      description: '从小学习电子琴，可教基础乐理、和弦、流行曲弹奏。适合零基础成人和小朋友。',
      tags: ['音乐', '键盘', '乐理'],
    },
    {
      userId: createdUsers[3]._id,
      userNickname: createdUsers[3].nickname,
      name: '视频剪辑',
      description: '熟练使用Premiere、Final Cut Pro、剪映。可教剪辑技巧、调色、转场、字幕制作。',
      tags: ['视频', '剪辑', '创作'],
    },
    {
      userId: createdUsers[4]._id,
      userNickname: createdUsers[4].nickname,
      name: '烹饪烘焙',
      description: '中级厨师证，擅长家常菜、西餐、烘焙。可教你做出美味又好看的料理和甜点。',
      tags: ['美食', '烹饪', '烘焙'],
    },
    {
      userId: createdUsers[5]._id,
      userNickname: createdUsers[5].nickname,
      name: '书法入门',
      description: '学习软笔书法8年，擅长楷书、行书。可教基本笔画、结构、临帖方法。',
      tags: ['书法', '艺术', '传统文化'],
    },
    {
      userId: createdUsers[0]._id,
      userNickname: createdUsers[0].nickname,
      name: '前端开发',
      description: '3年前端开发经验，精通React、Vue、TypeScript。可从HTML/CSS教起，循序渐进。',
      tags: ['编程', '前端', 'Web'],
    },
    {
      userId: createdUsers[1]._id,
      userNickname: createdUsers[1].nickname,
      name: '数学辅导',
      description: '数学系毕业，可辅导初中、高中数学。擅长解题思路和方法教学。',
      tags: ['数学', '辅导', '理科'],
    },
    {
      userId: createdUsers[2]._id,
      userNickname: createdUsers[2].nickname,
      name: '插画手绘',
      description: '自由插画师，擅长日系、韩系、Q版风格。可教数位板绘画、上色、构图技巧。',
      tags: ['绘画', '插画', '设计'],
    },
  ];

  for (let i = 0; i < mockSkills.length; i++) {
    const skill: Skill = {
      ...mockSkills[i],
      _id: uuidv4(),
      createdAt: now - (mockSkills.length - i) * 60 * 60 * 1000,
    };
    await db.skills.insert(skill);
  }

  console.log('Seed data initialized');
}

export async function initDb() {
  await initIndexes();
  await seedData();
}
