import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  proficiency: number;
  color: string;
  hue: number;
  category: string;
  x?: number;
  y?: number;
  parentId?: string | null;
}

export interface SkillLink {
  id: string;
  source: string;
  target: string;
  type: 'dependency' | 'enhancement' | 'manual';
}

export interface SkillsData {
  nodes: SkillNode[];
  links: SkillLink[];
}

const generatePresetData = (): SkillsData => {
  const nodes: SkillNode[] = [
    {
      id: '1',
      name: '前端开发',
      description: '现代Web前端开发的核心技能体系，包括基础技术栈和主流框架',
      proficiency: 65,
      color: '#e94560',
      hue: 350,
      category: '核心',
      x: 500,
      y: 150,
      parentId: null,
    },
    {
      id: '2',
      name: 'HTML',
      description: '超文本标记语言，构建网页结构的基础',
      proficiency: 95,
      color: '#ff6b35',
      hue: 15,
      category: '基础',
      x: 200,
      y: 300,
      parentId: '1',
    },
    {
      id: '3',
      name: 'CSS',
      description: '层叠样式表，负责网页的视觉呈现和布局',
      proficiency: 85,
      color: '#2196f3',
      hue: 210,
      category: '基础',
      x: 400,
      y: 320,
      parentId: '1',
    },
    {
      id: '4',
      name: 'JavaScript',
      description: 'Web编程语言，实现网页交互和动态效果',
      proficiency: 75,
      color: '#ffc107',
      hue: 45,
      category: '基础',
      x: 600,
      y: 320,
      parentId: '1',
    },
    {
      id: '5',
      name: 'React',
      description: '由Facebook开发的声明式组件化UI框架',
      proficiency: 70,
      color: '#00d4ff',
      hue: 190,
      category: '框架',
      x: 300,
      y: 500,
      parentId: '4',
    },
    {
      id: '6',
      name: 'Vue',
      description: '渐进式JavaScript框架，易上手且功能强大',
      proficiency: 60,
      color: '#42b883',
      hue: 150,
      category: '框架',
      x: 520,
      y: 500,
      parentId: '4',
    },
    {
      id: '7',
      name: 'TypeScript',
      description: 'JavaScript的超集，添加了静态类型系统',
      proficiency: 55,
      color: '#3178c6',
      hue: 210,
      category: '语言',
      x: 740,
      y: 380,
      parentId: '4',
    },
    {
      id: '8',
      name: 'Node.js',
      description: '基于V8引擎的JavaScript服务端运行时',
      proficiency: 45,
      color: '#8cc84b',
      hue: 90,
      category: '后端',
      x: 150,
      y: 500,
      parentId: '4',
    },
    {
      id: '9',
      name: 'Webpack',
      description: '现代JavaScript应用的模块打包工具',
      proficiency: 40,
      color: '#8ed6fb',
      hue: 200,
      category: '工具',
      x: 850,
      y: 500,
      parentId: '7',
    },
    {
      id: '10',
      name: 'D3.js',
      description: '基于数据驱动文档的数据可视化库',
      proficiency: 35,
      color: '#f97316',
      hue: 25,
      category: '可视化',
      x: 680,
      y: 560,
      parentId: '4',
    },
  ];

  const links: SkillLink[] = [
    { id: 'l1', source: '2', target: '1', type: 'dependency' },
    { id: 'l2', source: '3', target: '1', type: 'dependency' },
    { id: 'l3', source: '4', target: '1', type: 'dependency' },
    { id: 'l4', source: '5', target: '4', type: 'dependency' },
    { id: 'l5', source: '6', target: '4', type: 'dependency' },
    { id: 'l6', source: '7', target: '4', type: 'enhancement' },
    { id: 'l7', source: '8', target: '4', type: 'dependency' },
    { id: 'l8', source: '9', target: '7', type: 'enhancement' },
    { id: 'l9', source: '10', target: '4', type: 'dependency' },
    { id: 'l10', source: '3', target: '5', type: 'enhancement' },
    { id: 'l11', source: '3', target: '6', type: 'enhancement' },
  ];

  return { nodes, links };
};

let skillsData: SkillsData = generatePresetData();

app.get('/api/skills', (_req, res) => {
  res.json(skillsData);
});

app.post('/api/skills', (req, res) => {
  const data = req.body as SkillsData;

  if (!data.nodes || !data.links) {
    return res.status(400).json({ error: 'Invalid data format: nodes and links required' });
  }

  if (data.nodes.length > 50) {
    return res.status(400).json({ error: 'Nodes count exceeds maximum limit of 50' });
  }

  skillsData = {
    nodes: data.nodes.map((n) => ({
      ...n,
      proficiency: Math.max(0, Math.min(100, n.proficiency)),
    })),
    links: data.links,
  };

  const snapshot = {
    timestamp: new Date().toISOString(),
    totalNodes: skillsData.nodes.length,
    totalLinks: skillsData.links.length,
    avgProficiency:
      skillsData.nodes.length > 0
        ? (
            skillsData.nodes.reduce((sum, n) => sum + n.proficiency, 0) /
            skillsData.nodes.length
          ).toFixed(2)
        : '0.00',
    categories: [...new Set(skillsData.nodes.map((n) => n.category))],
  };

  console.log('========== 图谱快照 ==========');
  console.log(`时间戳: ${snapshot.timestamp}`);
  console.log(`节点数量: ${snapshot.totalNodes}`);
  console.log(`连线数量: ${snapshot.totalLinks}`);
  console.log(`平均熟练度: ${snapshot.avgProficiency}%`);
  console.log(`分类标签: ${snapshot.categories.join(', ')}`);
  console.log('节点详情:');
  skillsData.nodes.forEach((n) => {
    console.log(`  - [${n.id}] ${n.name} (${n.category}): ${n.proficiency}%`);
  });
  console.log('==============================\n');

  res.json({ success: true, snapshot });
});

app.delete('/api/skills/:id', (req, res) => {
  const { id } = req.params;

  const nodeExists = skillsData.nodes.some((n) => n.id === id);
  if (!nodeExists) {
    return res.status(404).json({ error: `Node with id ${id} not found` });
  }

  const removeIds = new Set<string>([id]);
  const collectChildren = (parentId: string) => {
    skillsData.nodes.forEach((n) => {
      if (n.parentId === parentId && !removeIds.has(n.id)) {
        removeIds.add(n.id);
        collectChildren(n.id);
      }
    });
  };
  collectChildren(id);

  skillsData.nodes = skillsData.nodes.filter((n) => !removeIds.has(n.id));
  skillsData.links = skillsData.links.filter(
    (l) => !removeIds.has(l.source) && !removeIds.has(l.target)
  );

  res.json({
    success: true,
    removedNodes: removeIds.size,
    remainingNodes: skillsData.nodes.length,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     技能树后端服务启动成功                            ║
║     服务地址: http://localhost:${PORT}                  ║
║     API 端点:                                         ║
║       GET    /api/skills       获取所有技能数据       ║
║       POST   /api/skills       保存技能图谱           ║
║       DELETE /api/skills/:id   删除指定节点           ║
║     预设节点: ${skillsData.nodes.length} 个节点, ${skillsData.links.length} 条连线 ║
╚═══════════════════════════════════════════════════════╝
`);
});
