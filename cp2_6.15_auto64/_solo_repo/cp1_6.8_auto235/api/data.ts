type Tag = "技术" | "设计" | "生活" | "其他"

interface Inspiration {
  id: string
  title: string
  content: string
  tag: Tag
  priority: 1 | 2 | 3 | 4 | 5
  createdAt: string
}

export type { Tag, Inspiration }

export let inspirations: Inspiration[] = [
  {
    id: "1",
    title: "React性能优化实践",
    content: "使用React.memo、useMemo和useCallback减少不必要的重渲染，结合虚拟列表处理大数据量场景，利用React DevTools Profiler定位性能瓶颈。",
    tag: "技术",
    priority: 5,
    createdAt: "2026-06-01T08:30:00Z",
  },
  {
    id: "2",
    title: "TypeScript类型体操技巧",
    content: "深入理解条件类型、映射类型和模板字面量类型，通过infer关键字实现类型推断，利用递归类型实现深度类型转换。",
    tag: "技术",
    priority: 4,
    createdAt: "2026-06-02T10:15:00Z",
  },
  {
    id: "3",
    title: "WebGL着色器探索",
    content: "学习GLSL着色器语言，理解顶点着色器与片段着色器的协作机制，尝试用噪声函数生成程序化纹理和粒子效果。",
    tag: "技术",
    priority: 3,
    createdAt: "2026-06-03T14:00:00Z",
  },
  {
    id: "4",
    title: "渐变色方案灵感",
    content: "从日落天空和极光中提取自然渐变，尝试将暖橙到深紫的过渡应用在CTA按钮和背景装饰中，营造沉浸式视觉体验。",
    tag: "设计",
    priority: 4,
    createdAt: "2026-06-04T09:20:00Z",
  },
  {
    id: "5",
    title: "毛玻璃UI新玩法",
    content: "结合backdrop-filter的blur与saturate属性，叠加半透明色彩层，在深色模式下实现光感毛玻璃卡片效果，增强界面层次感。",
    tag: "设计",
    priority: 3,
    createdAt: "2026-06-04T16:45:00Z",
  },
  {
    id: "6",
    title: "晨间冥想习惯养成",
    content: "每天起床后进行10分钟正念冥想，专注呼吸节奏，逐渐延长至20分钟，观察一周后注意力和情绪稳定性的变化。",
    tag: "生活",
    priority: 2,
    createdAt: "2026-06-05T07:00:00Z",
  },
  {
    id: "7",
    title: "周末徒步路线规划",
    content: "探索城市周边的山林步道，记录沿途风景与体力消耗数据，整理出适合不同体能等级的徒步路线清单。",
    tag: "生活",
    priority: 1,
    createdAt: "2026-06-05T18:30:00Z",
  },
  {
    id: "8",
    title: "量子计算入门笔记",
    content: "理解量子比特的叠加态与纠缠态，学习量子门操作的基本原理，尝试用Qiskit框架运行简单的量子电路模拟。",
    tag: "其他",
    priority: 2,
    createdAt: "2026-06-06T11:00:00Z",
  },
  {
    id: "9",
    title: "科幻小说书单",
    content: "整理近年优秀科幻作品：《三体》《基地》《沙丘》《银河系漫游指南》《神经漫游者》，按硬科幻与软科幻分类推荐。",
    tag: "其他",
    priority: 1,
    createdAt: "2026-06-06T20:00:00Z",
  },
  {
    id: "10",
    title: "微前端架构思考",
    content: "对比Module Federation与Single-SPA方案，评估在现有项目中的迁移成本，设计应用间通信机制与样式隔离策略。",
    tag: "技术",
    priority: 5,
    createdAt: "2026-06-07T13:30:00Z",
  },
]

let nextId = 11

export function addInspiration(input: Omit<Inspiration, "id" | "createdAt">): Inspiration {
  const inspiration: Inspiration = {
    ...input,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
  }
  inspirations.push(inspiration)
  return inspiration
}
