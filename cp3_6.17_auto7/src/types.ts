export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface Step {
  id: string;
  order: number;
  description: string;
}

export interface RecipeContent {
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  version: string;
  branch: string;
  content: RecipeContent;
  parentIds: string[];
  authorId: string;
  authorName: string;
  message: string;
  timestamp: string;
  isMerge?: boolean;
}

export interface Recipe {
  id: string;
  ownerId: string;
  currentVersionId: string;
  currentBranch: string;
  versions: RecipeVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface VersionDiff {
  name: DiffChange[];
  ingredients: DiffChange[];
  steps: DiffChange[];
  notes: DiffChange[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
