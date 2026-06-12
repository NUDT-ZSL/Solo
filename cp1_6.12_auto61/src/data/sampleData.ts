export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  categoryId: string;
  tags: string[];
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const initialCategories: Category[] = [
  { id: 'all', name: '全部', icon: '📚', color: '#1A237E' },
  { id: 'dev', name: '开发工具', icon: '💻', color: '#3F51B5' },
  { id: 'design', name: '设计资源', icon: '🎨', color: '#E91E63' },
  { id: 'learn', name: '学习教程', icon: '📖', color: '#009688' },
  { id: 'news', name: '科技资讯', icon: '📰', color: '#FF5722' },
  { id: 'tools', name: '效率工具', icon: '🛠️', color: '#673AB7' },
];

export const initialLinks: LinkItem[] = [
  {
    id: '1',
    title: 'React 官方文档',
    url: 'https://react.dev',
    description: 'React 最新官方文档，包含 Hooks、Suspense 等新特性详解',
    categoryId: 'dev',
    tags: ['React', '前端', '框架'],
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: '2',
    title: 'TypeScript 手册',
    url: 'https://www.typescriptlang.org/docs',
    description: 'TypeScript 官方文档，学习类型系统的最佳资源',
    categoryId: 'dev',
    tags: ['TypeScript', '类型系统'],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: '3',
    title: 'Vite 构建工具',
    url: 'https://vitejs.dev',
    description: '下一代前端构建工具，极速冷启动和热更新',
    categoryId: 'dev',
    tags: ['Vite', '构建', '工具'],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: '4',
    title: 'MDN Web 文档',
    url: 'https://developer.mozilla.org',
    description: 'Mozilla 开发者网络，最权威的 Web 技术文档',
    categoryId: 'dev',
    tags: ['MDN', '文档', 'Web'],
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: '5',
    title: 'Dribbble 设计社区',
    url: 'https://dribbble.com',
    description: '全球顶级设计师作品分享平台，获取设计灵感',
    categoryId: 'design',
    tags: ['设计', 'UI', '灵感'],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: '6',
    title: 'Figma 设计工具',
    url: 'https://figma.com',
    description: '协作式界面设计工具，团队设计的首选',
    categoryId: 'design',
    tags: ['Figma', 'UI设计', '协作'],
    createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: '7',
    title: 'Unsplash 图片库',
    url: 'https://unsplash.com',
    description: '免费高质量图片素材网站，商用授权',
    categoryId: 'design',
    tags: ['图片', '素材', '免费'],
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: '8',
    title: 'Iconfont 图标库',
    url: 'https://www.iconfont.cn',
    description: '阿里巴巴矢量图标库，海量图标资源',
    categoryId: 'design',
    tags: ['图标', 'SVG', '素材'],
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: '9',
    title: 'GitHub 开源社区',
    url: 'https://github.com',
    description: '全球最大的代码托管平台和开源社区',
    categoryId: 'learn',
    tags: ['GitHub', '开源', '代码'],
    createdAt: Date.now() - 86400000 * 9,
  },
  {
    id: '10',
    title: '掘金技术社区',
    url: 'https://juejin.cn',
    description: '中国开发者技术成长社区',
    categoryId: 'learn',
    tags: ['掘金', '博客', '技术'],
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: '11',
    title: 'Coursera 在线课程',
    url: 'https://www.coursera.org',
    description: '全球顶尖大学的在线课程平台',
    categoryId: 'learn',
    tags: ['Coursera', '教育', '课程'],
    createdAt: Date.now() - 86400000 * 11,
  },
  {
    id: '12',
    title: 'LeetCode 算法',
    url: 'https://leetcode.com',
    description: '程序员面试算法训练平台',
    categoryId: 'learn',
    tags: ['算法', '面试', '编程'],
    createdAt: Date.now() - 86400000 * 12,
  },
  {
    id: '13',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
    description: '黑客新闻，科技圈最有深度的讨论社区',
    categoryId: 'news',
    tags: ['科技', '新闻', '社区'],
    createdAt: Date.now() - 86400000 * 13,
  },
  {
    id: '14',
    title: '36氪',
    url: 'https://36kr.com',
    description: '中国领先的新商业媒体',
    categoryId: 'news',
    tags: ['科技', '创投', '媒体'],
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: '15',
    title: 'InfoQ',
    url: 'https://infoq.cn',
    description: '促进软件开发领域知识与创新的传播',
    categoryId: 'news',
    tags: ['技术', '资讯', '架构'],
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: '16',
    title: 'Notion 笔记工具',
    url: 'https://www.notion.so',
    description: '集笔记、任务、数据库于一体的生产力工具',
    categoryId: 'tools',
    tags: ['Notion', '笔记', '效率'],
    createdAt: Date.now() - 86400000 * 16,
  },
  {
    id: '17',
    title: 'Slack 团队沟通',
    url: 'https://slack.com',
    description: '团队协作即时通讯工具',
    categoryId: 'tools',
    tags: ['Slack', '沟通', '协作'],
    createdAt: Date.now() - 86400000 * 17,
  },
  {
    id: '18',
    title: 'Trello 看板',
    url: 'https://trello.com',
    description: '看板式项目管理工具',
    categoryId: 'tools',
    tags: ['Trello', '项目管理', '看板'],
    createdAt: Date.now() - 86400000 * 18,
  },
  {
    id: '19',
    title: 'Postman API 工具',
    url: 'https://www.postman.com',
    description: 'API 开发、测试、文档一体化工具',
    categoryId: 'tools',
    tags: ['Postman', 'API', '测试'],
    createdAt: Date.now() - 86400000 * 19,
  },
  {
    id: '20',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    description: '全球最大的编程问答社区',
    categoryId: 'dev',
    tags: ['问答', '社区', '编程'],
    createdAt: Date.now() - 86400000 * 20,
  },
];

export const tagColors: string[] = [
  '#E3F2FD', '#FCE4EC', '#E8F5E9', '#FFF3E0', '#F3E5F5',
  '#FFF8E1', '#E0F7FA', '#EDE7F6', '#F1F8E9', '#FFEBEE',
];
