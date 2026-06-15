import { v4 as uuidv4 } from 'uuid';
import { Book, Customer, BorrowRecord } from './types';

export const mockBooks: Book[] = [
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    isbn: '9787544291170',
    category: '文学',
    cover: '',
    stock: 5,
    tags: ['魔幻现实主义', '经典', '拉美文学', '家族史'],
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。',
    borrowCount: 42
  },
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    isbn: '9787506365437',
    category: '文学',
    cover: '',
    stock: 8,
    tags: ['现实主义', '经典', '中国文学', '生命'],
    description: '讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业，一贫如洗。',
    borrowCount: 56
  },
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    isbn: '9787536692930',
    category: '科普',
    cover: '',
    stock: 12,
    tags: ['科幻', '硬科幻', '宇宙', '三体问题'],
    description: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。',
    borrowCount: 89
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    isbn: '9787508647357',
    category: '社科',
    cover: '',
    stock: 6,
    tags: ['历史', '人类学', '认知革命', '社会发展'],
    description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史。',
    borrowCount: 67
  },
  {
    id: uuidv4(),
    title: '小王子',
    author: '圣埃克苏佩里',
    isbn: '9787020042494',
    category: '少儿',
    cover: '',
    stock: 15,
    tags: ['童话', '经典', '成长', '哲理'],
    description: '以一位飞行员作为故事叙述者，讲述了小王子从自己星球出发前往地球的过程中，所经历的各种历险。',
    borrowCount: 103
  },
  {
    id: uuidv4(),
    title: '挪威的森林',
    author: '村上春树',
    isbn: '9787544247221',
    category: '文学',
    cover: '',
    stock: 7,
    tags: ['青春', '爱情', '日本文学', '成长'],
    description: '渡边的第一个恋人直子原是他高中要好同学木月的女友，但后来木月自杀了。',
    borrowCount: 78
  },
  {
    id: uuidv4(),
    title: '时间简史',
    author: '史蒂芬·霍金',
    isbn: '9787535732309',
    category: '科普',
    cover: '',
    stock: 9,
    tags: ['物理', '宇宙', '黑洞', '时间'],
    description: '探索时间和空间的奥秘，讲述宇宙的起源和命运。',
    borrowCount: 72
  },
  {
    id: uuidv4(),
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    isbn: '9787508633558',
    category: '社科',
    cover: '',
    stock: 4,
    tags: ['心理学', '行为经济学', '决策', '认知'],
    description: '诺贝尔经济学奖得主丹尼尔·卡尼曼力作，探讨大脑快与慢两种作决定的方式。',
    borrowCount: 38
  },
  {
    id: uuidv4(),
    title: '夏洛的网',
    author: 'E.B.怀特',
    isbn: '9787532767388',
    category: '少儿',
    cover: '',
    stock: 11,
    tags: ['童话', '友谊', '动物', '成长'],
    description: '在朱克曼家的谷仓里，快乐地生活着一群动物。小猪威尔伯和蜘蛛夏洛建立了真挚的友谊。',
    borrowCount: 91
  },
  {
    id: uuidv4(),
    title: '围城',
    author: '钱钟书',
    isbn: '9787020026081',
    category: '文学',
    cover: '',
    stock: 6,
    tags: ['讽刺', '经典', '中国文学', '婚姻'],
    description: '《围城》是钱钟书所著的长篇小说，是中国现代文学史上一部风格独特的讽刺小说。',
    borrowCount: 45
  },
  {
    id: uuidv4(),
    title: '乌合之众',
    author: '古斯塔夫·勒庞',
    isbn: '9787511720870',
    category: '社科',
    cover: '',
    stock: 5,
    tags: ['心理学', '群体心理', '社会学', '经典'],
    description: '《乌合之众》是社会心理学领域中最具影响力的著作，深刻剖析群体心理。',
    borrowCount: 41
  },
  {
    id: uuidv4(),
    title: '海底两万里',
    author: '儒勒·凡尔纳',
    isbn: '9787020030804',
    category: '少儿',
    cover: '',
    stock: 10,
    tags: ['科幻', '冒险', '海洋', '经典'],
    description: '叙述法国生物学家阿龙纳斯教授在深海旅行的故事。',
    borrowCount: 63
  },
  {
    id: uuidv4(),
    title: '基因传',
    author: '悉达多·穆克吉',
    isbn: '9787508669915',
    category: '科普',
    cover: '',
    stock: 3,
    tags: ['生物', '基因', '科学史', '遗传'],
    description: '从孟德尔到基因编辑技术，讲述基因科学的发展历程。',
    borrowCount: 29
  },
  {
    id: uuidv4(),
    title: '万历十五年',
    author: '黄仁宇',
    isbn: '9787101054491',
    category: '社科',
    cover: '',
    stock: 7,
    tags: ['历史', '明朝', '大历史观', '政治'],
    description: '黄仁宇用他的"大历史观"，论述了明朝万历年间的中国社会。',
    borrowCount: 55
  },
  {
    id: uuidv4(),
    title: '红楼梦',
    author: '曹雪芹',
    isbn: '9787020002207',
    category: '文学',
    cover: '',
    stock: 4,
    tags: ['古典名著', '中国文学', '家族史', '爱情'],
    description: '中国古典四大名著之首，以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线。',
    borrowCount: 83
  },
  {
    id: uuidv4(),
    title: '格列佛游记',
    author: '乔纳森·斯威夫特',
    isbn: '9787020041336',
    category: '少儿',
    cover: '',
    stock: 8,
    tags: ['讽刺', '冒险', '经典', '幻想'],
    description: '通过格列佛在小人国、大人国、飞岛国、慧骃国的奇遇，反映了18世纪前半期英国社会的一些矛盾。',
    borrowCount: 51
  }
];

export const mockCustomers: Customer[] = [
  {
    id: uuidv4(),
    name: '张小明',
    memberNo: 'M001',
    phone: '13800138001'
  },
  {
    id: uuidv4(),
    name: '李晓华',
    memberNo: 'M002',
    phone: '13800138002'
  },
  {
    id: uuidv4(),
    name: '王大伟',
    memberNo: 'M003',
    phone: '13800138003'
  },
  {
    id: uuidv4(),
    name: '陈美丽',
    memberNo: 'M004',
    phone: '13800138004'
  },
  {
    id: uuidv4(),
    name: '刘建国',
    memberNo: 'M005',
    phone: '13800138005'
  }
];

const today = new Date();
const daysAgo = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};
const daysLater = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const mockBorrowRecords: BorrowRecord[] = [
  {
    id: uuidv4(),
    bookId: mockBooks[0].id,
    customerId: mockCustomers[0].id,
    borrowDate: daysAgo(15),
    dueDate: daysLater(15),
    status: 'borrowing'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[2].id,
    customerId: mockCustomers[0].id,
    borrowDate: daysAgo(30),
    dueDate: daysAgo(5),
    status: 'overdue'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[1].id,
    customerId: mockCustomers[0].id,
    borrowDate: daysAgo(45),
    dueDate: daysAgo(30),
    returnDate: daysAgo(32),
    status: 'returned'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[3].id,
    customerId: mockCustomers[1].id,
    borrowDate: daysAgo(10),
    dueDate: daysLater(20),
    status: 'borrowing'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[4].id,
    customerId: mockCustomers[1].id,
    borrowDate: daysAgo(20),
    dueDate: daysAgo(5),
    returnDate: daysAgo(6),
    status: 'returned'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[5].id,
    customerId: mockCustomers[2].id,
    borrowDate: daysAgo(7),
    dueDate: daysLater(23),
    status: 'borrowing'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[6].id,
    customerId: mockCustomers[2].id,
    borrowDate: daysAgo(40),
    dueDate: daysAgo(20),
    returnDate: daysAgo(18),
    status: 'returned'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[7].id,
    customerId: mockCustomers[2].id,
    borrowDate: daysAgo(35),
    dueDate: daysAgo(15),
    status: 'overdue'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[8].id,
    customerId: mockCustomers[3].id,
    borrowDate: daysAgo(5),
    dueDate: daysLater(25),
    status: 'borrowing'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[9].id,
    customerId: mockCustomers[3].id,
    borrowDate: daysAgo(50),
    dueDate: daysAgo(30),
    returnDate: daysAgo(28),
    status: 'returned'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[10].id,
    customerId: mockCustomers[4].id,
    borrowDate: daysAgo(12),
    dueDate: daysLater(18),
    status: 'borrowing'
  },
  {
    id: uuidv4(),
    bookId: mockBooks[11].id,
    customerId: mockCustomers[4].id,
    borrowDate: daysAgo(25),
    dueDate: daysAgo(10),
    returnDate: daysAgo(12),
    status: 'returned'
  }
];
