export type Priority = 'high' | 'medium' | 'low';

export interface MindMapNode {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string;
  notes: string;
  isMilestone: boolean;
  x: number;
  y: number;
  parentId: string | null;
  children: string[];
  collapsed: boolean;
  progress: number;
}

export type Theme = 'light' | 'dark';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface GanttTask {
  id: string;
  title: string;
  priority: Priority;
  startDate: Date;
  endDate: Date;
  progress: number;
  level: number;
  isMilestone: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  parentId: string | null;
}
