import { Idea } from '../modules/ideaEngine';

const now = Date.now();
const hour = 3600000;

export const mockIdeas: Idea[] = [
  {
    id: '1',
    title: 'AI智能推荐引擎',
    description: '利用用户行为数据构建个性化推荐系统，提升内容匹配度和用户粘性。通过协同过滤和深度学习模型实现精准推荐。',
    category: '增长',
    intuitionScore: 85,
    createdAt: new Date(now - 2 * hour).toISOString(),
    comments: [
      { id: 'c1', author: 'Alice', content: '这个想法很有潜力，可以显著提升用户留存', createdAt: new Date(now - 1.5 * hour).toISOString() },
      { id: 'c2', author: 'Bob', content: '需要考虑冷启动问题', createdAt: new Date(now - 1 * hour).toISOString() },
    ],
  },
  {
    id: '2',
    title: '自动化CI/CD流水线优化',
    description: '重构现有部署流程，引入并行构建和增量部署策略，将部署时间缩短60%以上。',
    category: '效率',
    intuitionScore: 72,
    createdAt: new Date(now - 4 * hour).toISOString(),
    comments: [
      { id: 'c3', author: 'Charlie', content: '并行构建方案需要仔细评估依赖关系', createdAt: new Date(now - 3 * hour).toISOString() },
    ],
  },
  {
    id: '3',
    title: '沉浸式3D产品展示',
    description: '使用WebGL技术为产品页面添加3D交互展示，用户可旋转、缩放查看产品细节，提升购物体验和转化率。',
    category: '体验',
    intuitionScore: 68,
    createdAt: new Date(now - 6 * hour).toISOString(),
    comments: [],
  },
  {
    id: '4',
    title: '微服务架构迁移方案',
    description: '将单体应用拆分为独立微服务，采用事件驱动架构实现服务间通信，提升系统可扩展性和容错能力。',
    category: '技术',
    intuitionScore: 55,
    createdAt: new Date(now - 8 * hour).toISOString(),
    comments: [
      { id: 'c4', author: 'Diana', content: '建议先从非核心模块开始拆分', createdAt: new Date(now - 7 * hour).toISOString() },
      { id: 'c5', author: 'Ethan', content: '需要评估团队对K8s的熟悉程度', createdAt: new Date(now - 6.5 * hour).toISOString() },
      { id: 'c6', author: 'Fiona', content: '服务网格选型也很重要', createdAt: new Date(now - 6 * hour).toISOString() },
      { id: 'c7', author: 'George', content: '监控体系需要提前建设', createdAt: new Date(now - 5.5 * hour).toISOString() },
    ],
  },
  {
    id: '5',
    title: '社交裂变分享机制',
    description: '设计邀请好友得积分、拼团优惠等社交裂变玩法，利用社交网络实现低成本用户增长。',
    category: '增长',
    intuitionScore: 90,
    createdAt: new Date(now - 1 * hour).toISOString(),
    comments: [
      { id: 'c8', author: 'Hannah', content: '拼团模式在电商领域已经验证过了', createdAt: new Date(now - 0.5 * hour).toISOString() },
    ],
  },
  {
    id: '6',
    title: '无障碍设计系统升级',
    description: '对现有UI组件库进行全面的无障碍性改造，支持屏幕阅读器、键盘导航和高对比度模式。',
    category: '体验',
    intuitionScore: 45,
    createdAt: new Date(now - 12 * hour).toISOString(),
    comments: [],
  },
  {
    id: '7',
    title: '智能客服机器人',
    description: '基于大语言模型构建智能客服系统，能够理解用户意图并自动回答常见问题，减少人工客服工作量。',
    category: '效率',
    intuitionScore: 78,
    createdAt: new Date(now - 3 * hour).toISOString(),
    comments: [
      { id: 'c9', author: 'Ivan', content: '需要设置好转人工的触发条件', createdAt: new Date(now - 2.5 * hour).toISOString() },
      { id: 'c10', author: 'Julia', content: '知识库的维护也很关键', createdAt: new Date(now - 2 * hour).toISOString() },
    ],
  },
  {
    id: '8',
    title: '边缘计算节点部署',
    description: '在主要城市部署边缘计算节点，将静态资源和计算密集型任务下沉到边缘，降低用户访问延迟。',
    category: '技术',
    intuitionScore: 62,
    createdAt: new Date(now - 10 * hour).toISOString(),
    comments: [],
  },
];
