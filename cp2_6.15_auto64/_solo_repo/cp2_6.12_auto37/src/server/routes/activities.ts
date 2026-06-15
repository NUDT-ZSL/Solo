import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getActivitiesByRecipeId,
  getActivityById,
  createActivity,
  updateActivityTask,
  assignTask,
  joinActivity,
  getRecipeById,
  Activity,
  Task
} from '../models/schema';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

let io: SocketIOServer | null = null;

export function setActivityIO(ioInstance: SocketIOServer) {
  io = ioInstance;
}

function generateTasksFromRecipe(steps: string[]): Task[] {
  const taskTemplates = ['准备食材', '切菜处理', '调味腌制', '烹饪制作', '装盘上桌'];
  const tasks: Task[] = [];

  if (steps.length === 0) {
    return taskTemplates.map((name, index) => ({
      id: uuidv4(),
      name,
      assignee: null,
      status: 'pending' as const
    }));
  }

  steps.forEach((step, index) => {
    tasks.push({
      id: uuidv4(),
      name: step.length > 30 ? step.substring(0, 30) + '...' : step,
      assignee: null,
      status: 'pending'
    });
  });

  return tasks;
}

router.get('/', (req: Request, res: Response) => {
  const recipeId = req.query.recipeId as string;
  if (!recipeId) {
    res.status(400).json({ error: 'recipeId query parameter is required' });
    return;
  }
  const activities = getActivitiesByRecipeId(recipeId);
  res.json(activities);
});

router.get('/:id', (req: Request, res: Response) => {
  const activity = getActivityById(req.params.id);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json(activity);
});

router.post('/', (req: Request, res: Response) => {
  const { recipeId, name, host, maxParticipants, startTime } = req.body;

  if (!recipeId || !name || !host) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const recipe = getRecipeById(recipeId);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }

  const tasks = generateTasksFromRecipe(recipe.steps);

  const activity: Omit<Activity, 'createdAt'> = {
    id: uuidv4(),
    recipeId,
    name,
    host,
    tasks,
    maxParticipants: maxParticipants || 5,
    startTime: startTime || null,
    status: 'pending',
    participants: [host]
  };

  const created = createActivity(activity);
  res.status(201).json(created);

  if (io) {
    io.to(`recipe-${recipeId}`).emit('activity-created', created);
  }
});

router.post('/:id/join', (req: Request, res: Response) => {
  const { participant } = req.body;
  if (!participant) {
    res.status(400).json({ error: 'participant is required' });
    return;
  }

  const activity = joinActivity(req.params.id, participant);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json(activity);

  if (io) {
    io.to(`activity-${req.params.id}`).emit('participant-joined', {
      activityId: req.params.id,
      participant,
      participants: activity.participants
    });
  }
});

router.put('/:id/task/:taskId', (req: Request, res: Response) => {
  const { status, assignee } = req.body;
  const activityId = req.params.id;
  const taskId = req.params.taskId;

  let activity = getActivityById(activityId);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  if (status) {
    activity = updateActivityTask(activityId, taskId, status);
  }

  if (assignee && activity) {
    activity = assignTask(activityId, taskId, assignee);
  }

  if (!activity) {
    res.status(500).json({ error: 'Failed to update task' });
    return;
  }

  res.json(activity);

  if (io) {
    io.to(`activity-${activityId}`).emit('task-update', {
      taskId,
      newStatus: status,
      assignee,
      task: activity.tasks.find(t => t.id === taskId)
    });
  }
});

router.post('/:id/task/:taskId/claim', (req: Request, res: Response) => {
  const { assignee } = req.body;
  const activityId = req.params.id;
  const taskId = req.params.taskId;

  if (!assignee) {
    res.status(400).json({ error: 'assignee is required' });
    return;
  }

  const activity = assignTask(activityId, taskId, assignee);
  if (!activity) {
    res.status(404).json({ error: 'Activity or task not found' });
    return;
  }

  res.json(activity);

  if (io) {
    io.to(`activity-${activityId}`).emit('task-update', {
      taskId,
      assignee,
      task: activity.tasks.find(t => t.id === taskId)
    });
  }
});

export default router;
