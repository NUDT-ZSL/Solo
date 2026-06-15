import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskContextType {
  tasks: Task[];
  addTask: (title: string, description: string) => void;
  updateTask: (id: string, title: string, description: string) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus, newIndex: number) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEY = 'eink-kanban-tasks';

const loadTasksFromStorage = (): Task[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(task => ({
          ...task,
          description: task.description ?? task.content ?? '',
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load tasks from localStorage:', e);
  }
  return [];
};

const saveTasksToStorage = (tasks: Task[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage:', e);
  }
};

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage());

  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  const addTask = (title: string, description: string) => {
    const now = Date.now();
    const status = 'todo' as TaskStatus;
    const sameStatusTasks = tasks.filter(t => t.status === status);
    const maxOrder = sameStatusTasks.length > 0
      ? Math.max(...sameStatusTasks.map(t => t.order))
      : -1;
    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      status,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (id: string, title: string, description: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, title, description, updatedAt: Date.now() }
        : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const moveTask = (id: string, newStatus: TaskStatus, newIndex: number) => {
    setTasks(prev => {
      const taskToMove = prev.find(t => t.id === id);
      if (!taskToMove) return prev;

      const oldStatus = taskToMove.status;
      const oldIndex = taskToMove.order;

      if (oldStatus === newStatus && oldIndex === newIndex) {
        return prev;
      }

      let newTasks = prev.map(task => {
        if (task.id === id) {
          return { ...task, status: newStatus, order: newIndex, updatedAt: Date.now() };
        }
        return task;
      });

      const sameColumnTasks = newTasks
        .filter(t => t.status === newStatus && t.id !== id)
        .sort((a, b) => a.order - b.order);

      sameColumnTasks.forEach((task, idx) => {
        const taskRef = newTasks.find(t => t.id === task.id);
        if (taskRef) {
          if (idx >= newIndex) {
            taskRef.order = idx + 1;
          } else {
            taskRef.order = idx;
          }
        }
      });

      if (oldStatus !== newStatus) {
        const oldColumnTasks = newTasks
          .filter(t => t.status === oldStatus)
          .sort((a, b) => a.order - b.order);

        oldColumnTasks.forEach((task, idx) => {
          const taskRef = newTasks.find(t => t.id === task.id);
          if (taskRef) {
            taskRef.order = idx;
          }
        });
      }

      return newTasks;
    });
  };

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, moveTask, getTasksByStatus }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
