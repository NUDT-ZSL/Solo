import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  Recipe
} from '../models/schema';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

let io: SocketIOServer | null = null;

export function setRecipeIO(ioInstance: SocketIOServer) {
  io = ioInstance;
}

router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 12;
  const recipes = getAllRecipes(page, pageSize);
  res.json(recipes);
});

router.get('/:id', (req: Request, res: Response) => {
  const recipe = getRecipeById(req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(recipe);
});

router.post('/', (req: Request, res: Response) => {
  const { title, description, ingredients, steps, author, difficulty } = req.body;

  if (!title || !ingredients || !steps || !author) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const recipe: Omit<Recipe, 'createdAt'> = {
    id: uuidv4(),
    title,
    description: description || '',
    ingredients,
    steps,
    author,
    difficulty: difficulty || 1
  };

  const created = createRecipe(recipe);
  res.status(201).json(created);

  if (io) {
    io.to('recipe-updates').emit('recipe-created', created);
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, description, ingredients, steps, author, difficulty } = req.body;

  const updates: Partial<Omit<Recipe, 'id' | 'createdAt'>> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (ingredients !== undefined) updates.ingredients = ingredients;
  if (steps !== undefined) updates.steps = steps;
  if (author !== undefined) updates.author = author;
  if (difficulty !== undefined) updates.difficulty = difficulty;

  const updated = updateRecipe(req.params.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(updated);

  if (io) {
    io.to('recipe-updates').emit('recipe-updated', updated);
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteRecipe(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json({ success: true });

  if (io) {
    io.to('recipe-updates').emit('recipe-deleted', req.params.id);
  }
});

export default router;
