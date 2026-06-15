import axios from 'axios';
import { Recipe, Activity } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const recipeAPI = {
  getAll: async (page = 1, pageSize = 12): Promise<Recipe[]> => {
    const response = await api.get('/recipes', {
      params: { page, pageSize }
    });
    return response.data;
  },

  getById: async (id: string): Promise<Recipe> => {
    const response = await api.get(`/recipes/${id}`);
    return response.data;
  },

  create: async (recipe: Omit<Recipe, 'id' | 'createdAt'>): Promise<Recipe> => {
    const response = await api.post('/recipes', recipe);
    return response.data;
  },

  update: async (id: string, updates: Partial<Recipe>): Promise<Recipe> => {
    const response = await api.put(`/recipes/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`);
  }
};

export const activityAPI = {
  getByRecipeId: async (recipeId: string): Promise<Activity[]> => {
    const response = await api.get('/activities', {
      params: { recipeId }
    });
    return response.data;
  },

  getById: async (id: string): Promise<Activity> => {
    const response = await api.get(`/activities/${id}`);
    return response.data;
  },

  create: async (data: {
    recipeId: string;
    name: string;
    host: string;
    maxParticipants?: number;
    startTime?: number;
  }): Promise<Activity> => {
    const response = await api.post('/activities', data);
    return response.data;
  },

  join: async (activityId: string, participant: string): Promise<Activity> => {
    const response = await api.post(`/activities/${activityId}/join`, {
      participant
    });
    return response.data;
  },

  updateTask: async (
    activityId: string,
    taskId: string,
    updates: { status?: string; assignee?: string }
  ): Promise<Activity> => {
    const response = await api.put(
      `/activities/${activityId}/task/${taskId}`,
      updates
    );
    return response.data;
  },

  claimTask: async (
    activityId: string,
    taskId: string,
    assignee: string
  ): Promise<Activity> => {
    const response = await api.post(
      `/activities/${activityId}/task/${taskId}/claim`,
      { assignee }
    );
    return response.data;
  }
};
