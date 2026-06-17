export interface User {
  id: string;
  username: string;
  password: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeStep {
  stepNumber: number;
  description: string;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionLabel: string;
  branchName: string;
  parentIds: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  commitMessage: string;
  isMerge: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface DiffResult {
  ingredients: {
    added: Ingredient[];
    removed: Ingredient[];
    modified: { old: Ingredient; new: Ingredient }[];
  };
  steps: {
    added: RecipeStep[];
    removed: RecipeStep[];
    modified: { old: RecipeStep; new: RecipeStep }[];
  };
  notes: { old: string; new: string };
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string };
}

export interface CreateRecipePayload {
  name: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes?: string;
}

export interface SaveVersionPayload {
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes: string;
  commitMessage: string;
  branchName?: string;
}

export interface BranchPayload {
  fromVersionId: string;
  branchName: string;
}

export interface MergePayload {
  sourceBranchName: string;
  commitMessage: string;
}
