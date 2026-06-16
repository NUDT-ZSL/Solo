export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: Date;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Step {
  order: number;
  description: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  currentVersionId: string;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionNumber: number;
  branchName: string;
  parentVersionIds: string[];
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  authorId: string;
  message: string;
  timestamp: Date;
  isMerge: boolean;
  mergedFromBranch?: string;
}

export interface VersionDiff {
  version1: string;
  version2: string;
  ingredientsDiff: {
    added: Ingredient[];
    removed: Ingredient[];
    modified: {
      old: Ingredient;
      new: Ingredient;
    }[];
  };
  stepsDiff: {
    added: Step[];
    removed: Step[];
    modified: {
      old: Step;
      new: Step;
    }[];
  };
  notesDiff: {
    old: string;
    new: string;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateRecipeRequest {
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
}

export interface UpdateRecipeRequest {
  name?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  notes?: string;
  message: string;
}

export interface CreateBranchRequest {
  branchName: string;
  fromVersionId: string;
}

export interface MergeBranchRequest {
  sourceVersionId: string;
  targetVersionId: string;
  message: string;
}

export interface RecipeCard {
  recipeId: string;
  versionId: string;
  name: string;
  imageUrl: string;
  createdAt: Date;
}
