export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface RecipeVersion {
  id: string;
  version: string;
  parentIds: string[];
  recipeId: string;
  author: string;
  authorId: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  note: string;
  createdAt: string;
  branch: string;
  message: string;
}

export interface Recipe {
  id: string;
  name: string;
  authorId: string;
  author: string;
  createdAt: string;
  versions: RecipeVersion[];
  mainBranch: string;
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
  user: Omit<User, 'password'>;
  token: string;
}

export interface CreateRecipeRequest {
  name: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  note?: string;
  message?: string;
}

export interface UpdateRecipeRequest {
  name?: string;
  ingredients?: Ingredient[];
  steps?: RecipeStep[];
  note?: string;
  message?: string;
}

export interface CreateVersionRequest {
  ingredients: Ingredient[];
  steps: RecipeStep[];
  note?: string;
  message: string;
  parentId: string;
}

export interface CreateBranchRequest {
  branchName: string;
  fromVersionId: string;
}

export interface MergeBranchRequest {
  sourceVersionId: string;
  targetBranch: string;
  message: string;
}
