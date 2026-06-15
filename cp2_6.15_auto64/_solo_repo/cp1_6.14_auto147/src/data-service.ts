import Dexie, { Table } from 'dexie';

export interface TimelineEntry {
  id?: number;
  title: string;
  content: string;
  summary: string;
  date: string;
  images: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

class TimelineDatabase extends Dexie {
  entries!: Table<TimelineEntry, number>;

  constructor() {
    super('TimelineWeaverDB');
    this.version(1).stores({
      entries: '++id, date, createdAt, updatedAt'
    });
  }
}

const db = new TimelineDatabase();

export async function addEntry(entry: Omit<TimelineEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = Date.now();
  return await db.entries.add({
    ...entry,
    createdAt: now,
    updatedAt: now
  });
}

export async function updateEntry(id: number, updates: Partial<Omit<TimelineEntry, 'id' | 'createdAt'>>): Promise<void> {
  await db.entries.update(id, {
    ...updates,
    updatedAt: Date.now()
  });
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id);
}

export async function getEntryById(id: number): Promise<TimelineEntry | undefined> {
  return await db.entries.get(id);
}

export async function getAllEntries(): Promise<TimelineEntry[]> {
  const entries = await db.entries.orderBy('date').reverse().toArray();
  return entries;
}

export async function getEntriesByDateRange(startDate: string, endDate: string): Promise<TimelineEntry[]> {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime() + 86400000 - 1;

  const entries = await db.entries.toArray();
  const filtered = entries.filter((e) => {
    const entryTime = new Date(e.date).getTime();
    return entryTime >= start && entryTime <= end;
  });

  return filtered.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeB - timeA;
  });
}

export async function getEntriesByYearRange(startYear: number, endYear: number): Promise<TimelineEntry[]> {
  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;
  return getEntriesByDateRange(startDate, endDate);
}

export async function seedSampleData(): Promise<void> {
  const count = await db.entries.count();
  if (count > 0) return;

  const sampleEntries: Omit<TimelineEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: '大学毕业典礼',
      content: '今天是我人生中一个重要的里程碑。经过四年的努力学习，终于顺利从大学毕业了。站在毕业典礼的舞台上，接过毕业证书的那一刻，我感受到了前所未有的成就感和对未来的期待。回想起这四年的时光，有欢笑也有泪水，有奋斗也有迷茫。感谢所有帮助过我的老师和同学，感谢一直支持我的家人。从今天开始，我将踏上新的征程，勇敢面对未来的挑战。',
      summary: '四年努力换来的珍贵时刻，新的人生征程从这里开始...',
      date: '2020-06-20',
      images: [],
      tags: ['毕业', '大学', '里程碑']
    },
    {
      title: '入职第一家公司',
      content: '今天是我正式上班的第一天，心情既紧张又兴奋。公司位于市中心的一栋高层写字楼里，办公环境非常现代化。HR带我熟悉了公司的各个部门，介绍了许多新同事。我的工位在靠窗的位置，可以俯瞰整个城市的景色。我的直属领导是一位经验丰富的技术专家，他耐心地向我介绍了项目的整体架构和我的工作职责。我对这份工作充满期待，希望能在这里快速成长，为团队创造价值。',
      summary: '职业生涯的起点，第一份正式工作带来的期待与挑战...',
      date: '2020-09-15',
      images: [],
      tags: ['工作', '职业', '新开始']
    },
    {
      title: '第一次独立负责项目',
      content: '经过半年多的学习和历练，领导终于将一个完整的项目交给我独立负责。这是一个面向企业客户的内部管理系统，涉及用户管理、权限控制、数据报表等多个模块。接到任务的那一刻，我既感到责任重大，又充满了干劲。从需求分析、技术选型到架构设计，每一步我都反复斟酌，力求做到最好。经过三个月的奋战，项目终于顺利上线并获得了客户的好评。这次经历让我在技术和项目管理方面都有了长足的进步。',
      summary: '三个月的独立奋战，项目成功上线并获得客户认可...',
      date: '2021-04-10',
      images: [],
      tags: ['项目', '成长', '技术']
    },
    {
      title: '西藏自驾之旅',
      content: '筹备了半年的西藏自驾之旅终于启程了。我们一行四人，开着一辆SUV，从成都出发，沿着318国道一路向西。沿途的风景美得令人窒息：新都桥的光影变幻、稻城亚丁的雪山圣湖、怒江七十二拐的惊险刺激、然乌湖的宁静秀美...每一处都是大自然馈赠的视觉盛宴。经过十多天的跋涉，我们终于抵达了心中的圣地——拉萨。站在布达拉宫前，仰望这座神圣的宫殿，所有的旅途辛劳都化为乌有。这次旅行不仅让我领略了壮美的高原风光，更让我学会了敬畏自然、珍惜当下。',
      summary: '318国道上的朝圣之旅，雪山圣湖净化心灵的震撼体验...',
      date: '2021-09-01',
      images: [],
      tags: ['旅行', '西藏', '自驾', '风景']
    },
    {
      title: '获得年度优秀员工',
      content: '今天的公司年会上，我被评选为年度优秀员工。当听到自己的名字被念出时，我一时有些恍惚，直到同事们的掌声响起才回过神来。站在领奖台上，从CEO手中接过奖杯和证书，我的眼眶不禁湿润了。这一年来的日日夜夜在脑海中飞速闪过：无数次的加班调试、棘手问题的苦思冥想、项目上线后的如释重负...这一刻，所有的付出都得到了最好的回报。感谢公司的认可，感谢团队的支持，这个奖项是我们所有人共同努力的结果。',
      summary: '一年奋斗的最好回报，奖杯背后是无数个日夜的付出...',
      date: '2022-01-20',
      images: [],
      tags: ['荣誉', '工作', '认可']
    },
    {
      title: '买房安家',
      content: '今天是值得纪念的一天，我终于拿到了属于自己的房子钥匙。回想这几年的拼搏，从刚毕业时的一无所有，到现在拥有一个真正属于自己的家，其中的酸甜苦辣只有自己最清楚。这个两居室的房子虽然不算很大，但每一寸空间都是我精心挑选和设计的。站在阳台上，看着远处的城市灯火，我的心中充满了安定和满足感。从今天起，在这个陌生的大城市里，我终于有了一个可以停靠的港湾。',
      summary: '奋斗多年的梦想成真，终于有了属于自己的温暖港湾...',
      date: '2022-05-18',
      images: [],
      tags: ['生活', '买房', '里程碑']
    },
    {
      title: '晋升为技术主管',
      content: '收到公司的正式通知，我被晋升为技术部主管，带领一个八人的开发团队。这既是对我过往工作的肯定，也是一个全新的挑战。以前我只需要管好自己的代码和任务，现在需要对整个团队的成长和项目的成败负责。新的角色意味着新的责任：我需要帮助团队成员解决技术难题，协调跨部门沟通，制定技术规划和发展路线。虽然压力变大了，但我相信通过持续学习和团队协作，我一定能胜任这个新角色，带领团队做出更好的成绩。',
      summary: '从技术骨干到团队Leader，新的角色开启新的成长篇章...',
      date: '2023-03-10',
      images: [],
      tags: ['晋升', '管理', '成长']
    },
    {
      title: '团队完成重大技术升级',
      content: '经过六个月的艰苦奋战，我们团队终于完成了公司核心系统的全面技术升级。这次升级涵盖了从前端框架迁移、后端架构改造到数据库优化的全链路重构，是公司成立以来规模最大的一次技术改造。上线当天，所有团队成员都守在监控大屏前，手心捏着一把汗。当流量峰值顺利通过，系统各项指标全部正常时，办公室里爆发出了欢呼声。这次升级不仅将系统性能提升了三倍，也为公司未来三年的业务发展奠定了坚实的技术基础。',
      summary: '六个月全链路重构，系统性能提升三倍的重大技术突破...',
      date: '2023-11-25',
      images: [],
      tags: ['技术', '团队', '架构']
    },
    {
      title: '日本京都赏枫之旅',
      content: '趁着年假，我和家人一起去了日本京都赏枫。十一月的京都，仿佛被大自然打翻了调色盘，到处都是绚烂的红叶。我们漫步在清水寺的古老石阶上，穿行于岚山的竹林小径间，泛舟于保津川的碧水之上...每一处都是如诗如画的美景。在祗园的花见小路上，我们还偶遇了穿着和服的艺伎，优雅的身姿和古典的妆容让人仿佛穿越回了古代。除了美景，京都的美食也让人流连忘返：怀石料理的精致、抹茶甜品的细腻、拉面的浓郁...这次旅行让我在繁忙的工作之余，找到了内心的宁静与放松。',
      summary: '红叶季的古都漫步，美景美食交织的完美假期...',
      date: '2024-11-12',
      images: [],
      tags: ['旅行', '日本', '家庭', '文化']
    },
    {
      title: '结婚五周年纪念',
      content: '今天是我和妻子结婚五周年的纪念日。五年前，我们在亲友的祝福声中携手步入婚姻的殿堂；五年后，我们依然像热恋时一样甜蜜。感谢她这五年来的陪伴与支持，无论是我工作失意时的安慰鼓励，还是我事业上升时的默默付出，她始终是我最坚实的后盾。为了庆祝这个特别的日子，我精心准备了一场惊喜：重现我们第一次约会的路线——从那家老电影院到街角的咖啡馆，最后在我们第一次说"我爱你"的公园里，我为她戴上了一枚新的戒指。她流下了感动的泪水，那一刻我明白了：真正的爱情是细水长流，是陪伴，是懂得。',
      summary: '五年相伴相知，重现初恋路线的浪漫纪念日...',
      date: '2025-02-14',
      images: [],
      tags: ['家庭', '爱情', '纪念日']
    }
  ];

  for (const entry of sampleEntries) {
    await addEntry(entry);
  }
}
