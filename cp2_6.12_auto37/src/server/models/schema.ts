import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../../data');
const dataFile = path.join(dataDir, 'community-kitchen-data.json');

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  author: string;
  difficulty: number;
  createdAt: number;
}

export interface Task {
  id: string;
  name: string;
  assignee: string | null;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Activity {
  id: string;
  recipeId: string;
  name: string;
  host: string;
  tasks: Task[];
  maxParticipants: number;
  startTime: number | null;
  status: string;
  participants: string[];
  createdAt: number;
}

interface DataStore {
  recipes: Recipe[];
  activities: Activity[];
}

let dataStore: DataStore = {
  recipes: [],
  activities: []
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadData() {
  ensureDataDir();
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      dataStore = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load data:', err);
    dataStore = { recipes: [], activities: [] };
  }
}

function saveData() {
  ensureDataDir();
  try {
    fs.writeFileSync(dataFile, JSON.stringify(dataStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data:', err);
  }
}

loadData();

export function getAllRecipes(page: number, pageSize: number): Recipe[] {
  const offset = (page - 1) * pageSize;
  const sorted = [...dataStore.recipes].sort((a, b) => b.createdAt - a.createdAt);
  return sorted.slice(offset, offset + pageSize);
}

export function getRecipeById(id: string): Recipe | null {
  const recipe = dataStore.recipes.find((r) => r.id === id);
  return recipe || null;
}

export function createRecipe(recipe: Omit<Recipe, 'createdAt'>): Recipe {
  const createdAt = Date.now();
  const newRecipe = { ...recipe, createdAt };
  dataStore.recipes.push(newRecipe);
  saveData();
  return newRecipe;
}

export function updateRecipe(
  id: string,
  updates: Partial<Omit<Recipe, 'id' | 'createdAt'>>
): Recipe | null {
  const index = dataStore.recipes.findIndex((r) => r.id === id);
  if (index === -1) return null;

  dataStore.recipes[index] = {
    ...dataStore.recipes[index],
    ...updates
  };
  saveData();
  return dataStore.recipes[index];
}

export function deleteRecipe(id: string): boolean {
  const index = dataStore.recipes.findIndex((r) => r.id === id);
  if (index === -1) return false;
  dataStore.recipes.splice(index, 1);
  saveData();
  return true;
}

export function getActivitiesByRecipeId(recipeId: string): Activity[] {
  return dataStore.activities
    .filter((a) => a.recipeId === recipeId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getActivityById(id: string): Activity | null {
  const activity = dataStore.activities.find((a) => a.id === id);
  return activity || null;
}

export function createActivity(activity: Omit<Activity, 'createdAt'>): Activity {
  const createdAt = Date.now();
  const newActivity = { ...activity, createdAt };
  dataStore.activities.push(newActivity);
  saveData();
  return newActivity;
}

export function updateActivityTask(
  activityId: string,
  taskId: string,
  newStatus: Task['status']
): Activity | null {
  const activity = getActivityById(activityId);
  if (!activity) return null;

  const task = activity.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  task.status = newStatus;
  saveData();
  return getActivityById(activityId);
}

export function assignTask(
  activityId: string,
  taskId: string,
  assignee: string
): Activity | null {
  const activity = getActivityById(activityId);
  if (!activity) return null;

  const task = activity.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  task.assignee = assignee;
  saveData();
  return getActivityById(activityId);
}

export function joinActivity(
  activityId: string,
  participant: string
): Activity | null {
  const activity = getActivityById(activityId);
  if (!activity) return null;

  if (!activity.participants.includes(participant)) {
    activity.participants.push(participant);
  }
  saveData();
  return getActivityById(activityId);
}

export default {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getActivitiesByRecipeId,
  getActivityById,
  createActivity,
  updateActivityTask,
  assignTask,
  joinActivity
};
