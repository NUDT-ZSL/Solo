export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Step {
  order: number;
  description: string;
}

export interface RecipeContent {
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
}

export interface Version {
  id: string;
  recipeId: string;
  versionNumber: string;
  branch: string;
  content: RecipeContent;
  authorId: string;
  authorName: string;
  message: string;
  timestamp: string;
  parentIds: string[];
  isMerge?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
  currentBranch: string;
  versions: Version[];
}

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface RecipeDiff {
  name: DiffChange[];
  ingredients: {
    added: Ingredient[];
    removed: Ingredient[];
    modified: { old: Ingredient; new: Ingredient }[];
  };
  steps: {
    added: Step[];
    removed: Step[];
    modified: { old: Step; new: Step }[];
  };
  notes: DiffChange[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
