import { Task, Member, GroupMap } from '../types';

export const GROUP_MAP: GroupMap = {
  review: '待评审',
  developing: '开发中',
  testing: '测试中',
  done: '已完成'
};

export const MEMBERS: Member[] = [
  { id: '1', name: '张明', color: '#3b82f6' },
  { id: '2', name: '李华', color: '#10b981' },
  { id: '3', name: '王芳', color: '#f59e0b' },
  { id: '4', name: '赵磊', color: '#ef4444' }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    title: '用户登录模块重构',
    description: '将原有账号密码登录升级为支持OAuth2.0的多方式登录系统，需要兼容旧版用户数据。',
    assignee: '1',
    group: 'developing',
    tags: ['前端', '高优先级'],
    createdAt: '2026-06-10T09:00:00Z',
    commentCount: 3,
    comments: [
      {
        id: 'c1',
        userId: '2',
        userName: '李华',
        content: '建议先梳理清楚现有登录逻辑的依赖关系',
        createdAt: '2026-06-10T10:30:00Z'
      },
      {
        id: 'c2',
        userId: '3',
        userName: '王芳',
        content: 'OAuth2.0的回调地址需要提前在各平台配置',
        createdAt: '2026-06-11T14:20:00Z'
      },
      {
        id: 'c3',
        userId: '4',
        userName: '赵磊',
        content: '记得加单元测试覆盖率',
        createdAt: '2026-06-12T08:15:00Z'
      }
    ]
  },
  {
    id: 'task-2',
    title: '首页加载性能优化',
    description: '首屏加载时间超过3秒，需要优化图片懒加载、代码分割和接口请求策略。',
    assignee: '2',
    group: 'testing',
    tags: ['性能', '优化'],
    createdAt: '2026-06-08T11:00:00Z',
    commentCount: 2,
    comments: [
      {
        id: 'c4',
        userId: '1',
        userName: '张明',
        content: '建议使用Webpack Bundle Analyzer分析包体积',
        createdAt: '2026-06-09T09:00:00Z'
      },
      {
        id: 'c5',
        userId: '3',
        userName: '王芳',
        content: '可以考虑使用图片CDN做自动压缩',
        createdAt: '2026-06-09T15:30:00Z'
      }
    ]
  },
  {
    id: 'task-3',
    title: '订单导出功能设计',
    description: '支持按日期范围导出订单数据为Excel，需要考虑大数据量下的性能问题。',
    assignee: '3',
    group: 'review',
    tags: ['后端', '新功能'],
    createdAt: '2026-06-11T16:00:00Z',
    commentCount: 1,
    comments: [
      {
        id: 'c6',
        userId: '4',
        userName: '赵磊',
        content: '大数据量建议用流式导出，避免内存溢出',
        createdAt: '2026-06-12T10:00:00Z'
      }
    ]
  },
  {
    id: 'task-4',
    title: '移动端适配修复',
    description: 'iOS Safari上部分页面布局错乱，需要统一viewport和响应式断点。',
    assignee: '1',
    group: 'done',
    tags: ['前端', 'Bug'],
    createdAt: '2026-06-05T13:00:00Z',
    commentCount: 4,
    comments: [
      {
        id: 'c7',
        userId: '2',
        userName: '李华',
        content: '用safe-area-inset处理刘海屏问题',
        createdAt: '2026-06-05T14:00:00Z'
      },
      {
        id: 'c8',
        userId: '3',
        userName: '王芳',
        content: '-webkit-overflow-scrolling: touch 可以让滚动更顺滑',
        createdAt: '2026-06-06T09:00:00Z'
      },
      {
        id: 'c9',
        userId: '4',
        userName: '赵磊',
        content: '记得测一下横屏模式',
        createdAt: '2026-06-06T16:00:00Z'
      },
      {
        id: 'c10',
        userId: '1',
        userName: '张明',
        content: '已修复，PR已合并',
        createdAt: '2026-06-07T11:00:00Z'
      }
    ]
  },
  {
    id: 'task-5',
    title: '用户权限系统升级',
    description: '现有RBAC模型需要支持更细粒度的数据权限控制。',
    assignee: '4',
    group: 'developing',
    tags: ['后端', '高优先级'],
    createdAt: '2026-06-09T08:00:00Z',
    commentCount: 2,
    comments: [
      {
        id: 'c11',
        userId: '1',
        userName: '张明',
        content: '建议参考ABAC模型设计',
        createdAt: '2026-06-09T11:00:00Z'
      },
      {
        id: 'c12',
        userId: '2',
        userName: '李华',
        content: '需要做数据库迁移脚本，注意数据一致性',
        createdAt: '2026-06-10T09:30:00Z'
      }
    ]
  },
  {
    id: 'task-6',
    title: '支付网关切换方案评审',
    description: '评估从当前支付网关切换到新网关的成本和风险。',
    assignee: '3',
    group: 'review',
    tags: ['架构', '高优先级'],
    createdAt: '2026-06-12T10:00:00Z',
    commentCount: 0,
    comments: []
  },
  {
    id: 'task-7',
    title: '数据统计面板UI调整',
    description: '根据UX反馈调整统计面板的图表配色和交互细节。',
    assignee: '2',
    group: 'testing',
    tags: ['UI', '设计'],
    createdAt: '2026-06-11T14:00:00Z',
    commentCount: 1,
    comments: [
      {
        id: 'c13',
        userId: '3',
        userName: '王芳',
        content: '图表tooltip建议显示完整时间',
        createdAt: '2026-06-12T08:30:00Z'
      }
    ]
  },
  {
    id: 'task-8',
    title: '消息推送通道优化',
    description: '优化离线消息的推送策略，减少重复和延迟。',
    assignee: '4',
    group: 'review',
    tags: ['后端', '优化'],
    createdAt: '2026-06-12T15:00:00Z',
    commentCount: 0,
    comments: []
  },
  {
    id: 'task-9',
    title: '产品官网SEO优化',
    description: '增加meta标签、结构化数据和优化页面加载速度。',
    assignee: '1',
    group: 'done',
    tags: ['SEO', '优化'],
    createdAt: '2026-06-03T09:00:00Z',
    commentCount: 2,
    comments: [
      {
        id: 'c14',
        userId: '2',
        userName: '李华',
        content: '记得加robots.txt和sitemap.xml',
        createdAt: '2026-06-03T11:00:00Z'
      },
      {
        id: 'c15',
        userId: '4',
        userName: '赵磊',
        content: 'Google Search Console已配置好',
        createdAt: '2026-06-04T14:00:00Z'
      }
    ]
  },
  {
    id: 'task-10',
    title: 'API文档自动生成',
    description: '基于OpenAPI规范自动生成接口文档，支持在线调试。',
    assignee: '2',
    group: 'developing',
    tags: ['工具', '新功能'],
    createdAt: '2026-06-10T14:00:00Z',
    commentCount: 1,
    comments: [
      {
        id: 'c16',
        userId: '3',
        userName: '王芳',
        content: '可以用Swagger UI或者Redoc',
        createdAt: '2026-06-11T09:00:00Z'
      }
    ]
  }
];
