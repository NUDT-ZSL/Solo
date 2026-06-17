export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Step {
  id: string;
  order: number;
  description: string;
}

export interface Recipe {
  id: string;
  userId: string;
  name: string;
  currentVersion: string;
  mainBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  recipeId: string;
  versionNumber: number;
  branch: string;
  authorId: string;
  authorName: string;
  commitMessage: string;
  parentVersionId: string | null;
  mergeParentVersionId: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  createdAt: string;
  isMerge: boolean;
}

export interface DiffChange<T = any> {
  type: 'added' | 'removed' | 'modified';
  value: T;
  oldValue?: T;
}

export interface VersionDiff {
  ingredients: DiffChange<Ingredient>[];
  steps: DiffChange<Step>[];
  notes: DiffChange<string>[];
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface CreateRecipeRequest {
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  commitMessage?: string;
}

export interface UpdateRecipeRequest {
  name?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  notes?: string;
  commitMessage?: string;
}

export interface CreateBranchRequest {
  branchName: string;
  fromVersionId: string;
}

export interface MergeBranchRequest {
  sourceBranch: string;
  targetBranch: string;
  commitMessage?: string;
}

export interface RollbackRequest {
  versionId: string;
  commitMessage?: string;
}

export interface UseApiReturn {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getRecipes: () => Promise<Recipe[]>;
  getRecipe: (id: string) => Promise<Recipe>;
  createRecipe: (data: CreateRecipeRequest) => Promise<Recipe>;
  updateRecipe: (id: string, data: UpdateRecipeRequest) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  getVersions: (recipeId: string) => Promise<Version[]>;
  getVersion: (recipeId: string, versionId: string) => Promise<Version>;
  getDiff: (recipeId: string, versionId1: string, versionId2: string) => Promise<VersionDiff>;
  createBranch: (recipeId: string, data: CreateBranchRequest) => Promise<Version>;
  mergeBranch: (recipeId: string, data: MergeBranchRequest) => Promise<Version>;
  rollback: (recipeId: string, data: RollbackRequest) => Promise<Version>;
}
