export interface SubTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  assignee?: string;
  order: number;
}

export interface Stage {
  name: string;
  progress: number;
  subtasks: SubTask[];
  startDate: string;
  endDate: string;
}

export interface ChapterStages {
  storyboard: Stage;
  lineArt: Stage;
  coloring: Stage;
  lettering: Stage;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  stages: ChapterStages;
}

export interface Collaborator {
  email: string;
  role: 'editor' | 'viewer';
  avatar?: string;
  nickname: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  chapters: Chapter[];
  collaborators: Collaborator[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  chapterCount: number;
  collaboratorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DraftImage {
  id: string;
  chapterId: string;
  stage: string;
  note: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  chapterId: string;
  imageId?: string;
  taskId?: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface GanttChapterData {
  id: string;
  title: string;
  stages: {
    storyboard: { progress: number; startDate: string; endDate: string; subtasks: SubTask[] };
    lineArt: { progress: number; startDate: string; endDate: string; subtasks: SubTask[] };
    coloring: { progress: number; startDate: string; endDate: string; subtasks: SubTask[] };
    lettering: { progress: number; startDate: string; endDate: string; subtasks: SubTask[] };
  };
}

export type ZoomLevel = 'day' | 'week' | 'month';

export const STAGE_COLORS: Record<string, string> = {
  storyboard: '#6c5ce7',
  lineArt: '#00b894',
  coloring: '#fdcb6e',
  lettering: '#74b9ff',
};

export const STAGE_LABELS: Record<string, string> = {
  storyboard: '分镜',
  lineArt: '线稿',
  coloring: '上色',
  lettering: '文字',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#e74c3c',
  medium: '#f0a500',
  low: '#95a5a6',
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};
