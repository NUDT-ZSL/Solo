export interface User {
  id: string;
  username: string;
  password?: string;
  createdAt: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Step {
  order: number;
  description: string;
}

export interface Recipe {
  id: string;
  name: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  currentBranch: string;
}

export interface Version {
  id: string;
  recipeId: string;
  versionNumber: string;
  branch: string;
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  authorId: string;
  authorName?: string;
  commitMessage: string;
  createdAt: string;
  parentIds: string[];
  mergeSource?: string;
}

export interface DiffChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue?: any;
  newValue?: any;
  index?: number;
}

export interface VersionDiff {
  ingredients: DiffChange[];
  steps: DiffChange[];
  name: DiffChange;
  notes: DiffChange;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  version: Version;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type ViewMode = 'editor' | 'versions' | 'card';
