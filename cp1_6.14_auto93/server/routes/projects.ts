import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface SubTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  assignee?: string;
  order: number;
}

interface Stage {
  name: string;
  progress: number;
  subtasks: SubTask[];
  startDate: string;
  endDate: string;
}

interface Chapter {
  id: string;
  projectId: string;
  title: string;
  stages: {
    storyboard: Stage;
    lineArt: Stage;
    coloring: Stage;
    lettering: Stage;
  };
}

interface Collaborator {
  email: string;
  role: 'editor' | 'viewer';
  avatar?: string;
  nickname: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  chapters: Chapter[];
  collaborators: Collaborator[];
  createdAt: string;
  updatedAt: string;
}

function getStore(req: Request): Project[] {
  return (req.app.locals._projectStore as Project[]) || [];
}

function setStore(req: Request, store: Project[]): void {
  req.app.locals._projectStore = store;
}

router.get('/', (req: Request, res: Response) => {
  const projects = getStore(req);
  res.json(projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    coverImage: p.coverImage,
    chapterCount: p.chapters.length,
    collaboratorCount: p.collaborators.length,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  })));
});

router.get('/:id', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  res.json(project);
});

router.post('/', (req: Request, res: Response) => {
  const projects = getStore(req);
  const { name, description, coverImage } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: '项目名称不能为空' });
    return;
  }
  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name: name.trim(),
    description: description || '',
    coverImage: coverImage || '',
    chapters: [],
    collaborators: [],
    createdAt: now,
    updatedAt: now,
  };
  projects.push(project);
  setStore(req, projects);
  res.status(201).json(project);
});

router.put('/:id', (req: Request, res: Response) => {
  const projects = getStore(req);
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const { name, description, coverImage } = req.body;
  if (name !== undefined) projects[idx].name = name.trim();
  if (description !== undefined) projects[idx].description = description;
  if (coverImage !== undefined) projects[idx].coverImage = coverImage;
  projects[idx].updatedAt = new Date().toISOString();
  setStore(req, projects);
  res.json(projects[idx]);
});

router.delete('/:id', (req: Request, res: Response) => {
  const projects = getStore(req);
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  projects.splice(idx, 1);
  setStore(req, projects);
  res.status(204).send();
});

router.post('/:id/chapters', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const { title, startDate, endDate } = req.body;
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: '章节标题不能为空' });
    return;
  }
  const chapter: Chapter = {
    id: uuidv4(),
    projectId: project.id,
    title: title.trim(),
    stages: {
      storyboard: { name: '分镜', progress: 0, subtasks: [], startDate: startDate || '', endDate: endDate || '' },
      lineArt: { name: '线稿', progress: 0, subtasks: [], startDate: startDate || '', endDate: endDate || '' },
      coloring: { name: '上色', progress: 0, subtasks: [], startDate: startDate || '', endDate: endDate || '' },
      lettering: { name: '文字', progress: 0, subtasks: [], startDate: startDate || '', endDate: endDate || '' },
    },
  };
  project.chapters.push(chapter);
  project.updatedAt = new Date().toISOString();
  setStore(req, projects);
  res.status(201).json(chapter);
});

router.put('/:projectId/chapters/:chapterId', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const chapter = project.chapters.find(c => c.id === req.params.chapterId);
  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }
  const { title, stages } = req.body;
  if (title !== undefined) chapter.title = title.trim();
  if (stages) {
    (['storyboard', 'lineArt', 'coloring', 'lettering'] as const).forEach(key => {
      if (stages[key]) {
        if (stages[key].progress !== undefined) {
          chapter.stages[key].progress = Math.max(0, Math.min(100, Number(stages[key].progress)));
        }
        if (stages[key].startDate !== undefined) chapter.stages[key].startDate = stages[key].startDate;
        if (stages[key].endDate !== undefined) chapter.stages[key].endDate = stages[key].endDate;
        if (stages[key].subtasks !== undefined) chapter.stages[key].subtasks = stages[key].subtasks;
      }
    });
  }
  project.updatedAt = new Date().toISOString();
  setStore(req, projects);
  res.json(chapter);
});

router.delete('/:projectId/chapters/:chapterId', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const chapterIdx = project.chapters.findIndex(c => c.id === req.params.chapterId);
  if (chapterIdx === -1) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }
  project.chapters.splice(chapterIdx, 1);
  project.updatedAt = new Date().toISOString();
  setStore(req, projects);
  res.status(204).send();
});

router.get('/:id/gantt', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const ganttData = project.chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    stages: {
      storyboard: { progress: chapter.stages.storyboard.progress, startDate: chapter.stages.storyboard.startDate, endDate: chapter.stages.storyboard.endDate, subtasks: chapter.stages.storyboard.subtasks },
      lineArt: { progress: chapter.stages.lineArt.progress, startDate: chapter.stages.lineArt.startDate, endDate: chapter.stages.lineArt.endDate, subtasks: chapter.stages.lineArt.subtasks },
      coloring: { progress: chapter.stages.coloring.progress, startDate: chapter.stages.coloring.startDate, endDate: chapter.stages.coloring.endDate, subtasks: chapter.stages.coloring.subtasks },
      lettering: { progress: chapter.stages.lettering.progress, startDate: chapter.stages.lettering.startDate, endDate: chapter.stages.lettering.endDate, subtasks: chapter.stages.lettering.subtasks },
    },
  }));
  res.json(ganttData);
});

router.post('/:id/collaborators', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const { email, role, nickname } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: '邮箱不能为空' });
    return;
  }
  if (!['editor', 'viewer'].includes(role)) {
    res.status(400).json({ error: '角色必须为 editor 或 viewer' });
    return;
  }
  const existing = project.collaborators.find(c => c.email === email);
  if (existing) {
    res.status(409).json({ error: '该协作者已存在' });
    return;
  }
  const collaborator: Collaborator = { email, role, nickname: nickname || email.split('@')[0], avatar: '' };
  project.collaborators.push(collaborator);
  project.updatedAt = new Date().toISOString();
  setStore(req, projects);
  res.status(201).json(collaborator);
});

router.delete('/:id/collaborators/:email', (req: Request, res: Response) => {
  const projects = getStore(req);
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const email = decodeURIComponent(req.params.email);
  const idx = project.collaborators.findIndex(c => c.email === email);
  if (idx === -1) {
    res.status(404).json({ error: '协作者不存在' });
    return;
  }
  project.collaborators.splice(idx, 1);
  project.updatedAt = new Date().toISOString();
  setStore(req, projects);
  res.status(204).send();
});

export default router;
