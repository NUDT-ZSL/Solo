import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Task {
  id: string;
  title: string;
  content: string;
  status: TaskStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskContextType {
  tasks: Task[];
  addTask: (title: string, content: string) => void;
  updateTask: (id: string, title: string, content: string) => void;
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
      return JSON.parse(stored);
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

  const addTask = (title: string, content: string) => {
    const now = Date.now();
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const newTask: Task = {
      id: uuidv4(),
      title,
      content,
      status: 'todo',
      order: todoTasks.length,
      createdAt: now,
      updatedAt: now
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (id: string, title: string, content: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, title, content, updatedAt: Date.now() }
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
        if (idx >= newIndex) {
          const taskRef = newTasks.find(t => t.id === task.id);
          if (taskRef) {
            taskRef.order = idx + 1;
          }
        } else {
          const taskRef = newTasks.find(t => t.id === task.id);
          if (taskRef) {
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
