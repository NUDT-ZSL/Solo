import { v4 as uuidv4 } from 'uuid';

export type ProjectStatus = '待启动' | '进行中' | '已延期' | '已完成';

export type Priority = '高' | '中' | '低';

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface Inspiration {
  id: string;
  projectId: string;
  imageUrl: string;
  note: string;
  createdAt: string;
  height: number;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  assignee: string;
  priority: Priority;
  estimatedHours: number;
  completed: boolean;
  order: number;
  createdAt: string;
}

const mockProjects: Project[] = [
  {
    id: 'p1',
    name: '2024春季品牌宣传片',
    description: '为品牌春季系列拍摄制作30秒宣传片，涵盖户外场景和产品特写',
    deadline: '2024-03-15',
    status: '进行中',
    createdAt: '2024-01-10'
  },
  {
    id: 'p2',
    name: '新品发布会视觉设计',
    description: '设计新品发布会的全套视觉物料，包括主视觉、海报、邀请函等',
    deadline: '2024-02-28',
    status: '已完成',
    createdAt: '2024-01-05'
  },
  {
    id: 'p3',
    name: '社交媒体内容策划',
    description: '规划Q1社交媒体内容，包括短视频、图文、互动活动',
    deadline: '2024-03-31',
    status: '待启动',
    createdAt: '2024-01-15'
  },
  {
    id: 'p4',
    name: '用户访谈纪录片',
    description: '采访5位核心用户，制作品牌故事纪录片，时长10分钟',
    deadline: '2024-01-20',
    status: '已延期',
    createdAt: '2023-12-01'
  },
  {
    id: 'p5',
    name: '电商平台视觉升级',
    description: '升级电商平台首页和详情页视觉，提升品牌调性',
    deadline: '2024-04-01',
    status: '进行中',
    createdAt: '2024-01-12'
  },
  {
    id: 'p6',
    name: '年度品牌画册',
    description: '设计制作2024年度品牌画册，展示全年品牌成果',
    deadline: '2024-12-15',
    status: '待启动',
    createdAt: '2024-01-18'
  }
];

const mockInspirations: Inspiration[] = [
  {
    id: 'i1',
    projectId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400',
    note: '自然光线下的产品展示，柔和的光影效果值得参考',
    createdAt: '2024-01-11',
    height: 300
  },
  {
    id: 'i2',
    projectId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400',
    note: '城市街景的色调搭配，适合春季户外场景',
    createdAt: '2024-01-12',
    height: 400
  },
  {
    id: 'i3',
    projectId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    note: '山脉剪影的构图方式，可以用作开场镜头',
    createdAt: '2024-01-13',
    height: 280
  },
  {
    id: 'i4',
    projectId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400',
    note: '海洋波浪的慢动作效果，很有韵律感',
    createdAt: '2024-01-14',
    height: 350
  },
  {
    id: 'i5',
    projectId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    note: '森林中的光线穿透效果，非常梦幻',
    createdAt: '2024-01-15',
    height: 320
  },
  {
    id: 'i6',
    projectId: 'p1',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    note: '海滩的清新色调，代表春季的活力',
    createdAt: '2024-01-16',
    height: 260
  },
  {
    id: 'i7',
    projectId: 'p2',
    imageUrl: 'https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=400',
    note: '极简主义的视觉风格，适合科技感发布会',
    createdAt: '2024-01-06',
    height: 380
  },
  {
    id: 'i8',
    projectId: 'p2',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    note: '霓虹灯光效果，可以营造未来感氛围',
    createdAt: '2024-01-07',
    height: 290
  }
];

const mockTasks: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    name: '确定拍摄场地',
    assignee: '张三',
    priority: '高',
    estimatedHours: 8,
    completed: true,
    order: 0,
    createdAt: '2024-01-10'
  },
  {
    id: 't2',
    projectId: 'p1',
    name: '联系模特经纪公司',
    assignee: '李四',
    priority: '高',
    estimatedHours: 4,
    completed: true,
    order: 1,
    createdAt: '2024-01-10'
  },
  {
    id: 't3',
    projectId: 'p1',
    name: '拍摄脚本撰写',
    assignee: '王五',
    priority: '高',
    estimatedHours: 16,
    completed: false,
    order: 2,
    createdAt: '2024-01-11'
  },
  {
    id: 't4',
    projectId: 'p1',
    name: '道具准备与采购',
    assignee: '赵六',
    priority: '中',
    estimatedHours: 12,
    completed: false,
    order: 3,
    createdAt: '2024-01-11'
  },
  {
    id: 't5',
    projectId: 'p1',
    name: '场地搭建与灯光调试',
    assignee: '张三',
    priority: '高',
    estimatedHours: 24,
    completed: false,
    order: 4,
    createdAt: '2024-01-12'
  },
  {
    id: 't6',
    projectId: 'p1',
    name: '正式拍摄',
    assignee: '全体',
    priority: '高',
    estimatedHours: 48,
    completed: false,
    order: 5,
    createdAt: '2024-01-12'
  },
  {
    id: 't7',
    projectId: 'p1',
    name: '后期剪辑与调色',
    assignee: '王五',
    priority: '高',
    estimatedHours: 32,
    completed: false,
    order: 6,
    createdAt: '2024-01-13'
  },
  {
    id: 't8',
    projectId: 'p2',
    name: '主视觉设计',
    assignee: '设计师A',
    priority: '高',
    estimatedHours: 20,
    completed: true,
    order: 0,
    createdAt: '2024-01-05'
  },
  {
    id: 't9',
    projectId: 'p2',
    name: '海报系列设计',
    assignee: '设计师B',
    priority: '中',
    estimatedHours: 16,
    completed: true,
    order: 1,
    createdAt: '2024-01-06'
  },
  {
    id: 't10',
    projectId: 'p5',
    name: '首页布局改版',
    assignee: '设计团队',
    priority: '高',
    estimatedHours: 24,
    completed: false,
    order: 0,
    createdAt: '2024-01-12'
  },
  {
    id: 't11',
    projectId: 'p5',
    name: '详情页模板设计',
    assignee: '设计师C',
    priority: '中',
    estimatedHours: 18,
    completed: false,
    order: 1,
    createdAt: '2024-01-13'
  },
  {
    id: 't12',
    projectId: 'p4',
    name: '用户筛选与联系',
    assignee: '策划组',
    priority: '高',
    estimatedHours: 10,
    completed: true,
    order: 0,
    createdAt: '2023-12-01'
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchProjects = async (): Promise<Project[]> => {
  await delay(800);
  return [...mockProjects];
};

export const fetchInspirations = async (projectId: string): Promise<Inspiration[]> => {
  await delay(600);
  return mockInspirations.filter(i => i.projectId === projectId);
};

export const fetchTasks = async (projectId: string): Promise<Task[]> => {
  await delay(600);
  return mockTasks.filter(t => t.projectId === projectId);
};

export const createProject = async (data: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
  await delay(500);
  const newProject: Project = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString().split('T')[0]
  };
  mockProjects.push(newProject);
  return newProject;
};

export const updateProjectStatus = async (projectId: string, status: ProjectStatus): Promise<Project> => {
  await delay(300);
  const project = mockProjects.find(p => p.id === projectId);
  if (project) {
    project.status = status;
    return { ...project };
  }
  throw new Error('Project not found');
};

export const createInspiration = async (data: Omit<Inspiration, 'id' | 'createdAt' | 'height'>): Promise<Inspiration> => {
  await delay(400);
  const newInspiration: Inspiration = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString().split('T')[0],
    height: 250 + Math.floor(Math.random() * 200)
  };
  mockInspirations.push(newInspiration);
  return newInspiration;
};

export const createTask = async (data: Omit<Task, 'id' | 'completed' | 'order' | 'createdAt'>): Promise<Task> => {
  await delay(400);
  const projectTasks = mockTasks.filter(t => t.projectId === data.projectId);
  const newTask: Task = {
    ...data,
    id: uuidv4(),
    completed: false,
    order: projectTasks.length,
    createdAt: new Date().toISOString().split('T')[0]
  };
  mockTasks.push(newTask);
  return newTask;
};

export const toggleTaskCompletion = async (taskId: string): Promise<Task> => {
  await delay(200);
  const task = mockTasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    return { ...task };
  }
  throw new Error('Task not found');
};

export const updateTaskOrder = async (taskId: string, newOrder: number): Promise<Task> => {
  await delay(200);
  const task = mockTasks.find(t => t.id === taskId);
  if (task) {
    task.order = newOrder;
    return { ...task };
  }
  throw new Error('Task not found');
};

export const fetchAllTasks = async (): Promise<Task[]> => {
  await delay(500);
  return [...mockTasks];
};
