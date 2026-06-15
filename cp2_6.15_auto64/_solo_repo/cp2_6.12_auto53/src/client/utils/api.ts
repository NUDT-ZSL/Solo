import axios from 'axios';
import { Chapter, Character, Relation, StoryProject } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const projectApi = {
  async getProject(id: string): Promise<StoryProject> {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  async createProject(name: string): Promise<StoryProject> {
    const res = await api.post('/projects', { name });
    return res.data;
  },

  async saveProject(project: StoryProject): Promise<void> {
    await api.put(`/projects/${project.id}`, project);
  },

  async exportProject(id: string): Promise<Blob> {
    const res = await api.get(`/projects/${id}/export`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export const chapterApi = {
  async saveChapters(projectId: string, chapters: Chapter[]): Promise<void> {
    await api.put(`/projects/${projectId}/chapters`, { chapters });
  },
};

export const characterApi = {
  async create(projectId: string, character: Partial<Character>): Promise<Character> {
    const res = await api.post(`/projects/${projectId}/characters`, character);
    return res.data;
  },

  async update(projectId: string, id: string, character: Partial<Character>): Promise<Character> {
    const res = await api.put(`/projects/${projectId}/characters/${id}`, character);
    return res.data;
  },

  async delete(projectId: string, id: string): Promise<void> {
    await api.delete(`/projects/${projectId}/characters/${id}`);
  },

  async uploadAvatar(projectId: string, characterId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post(
      `/projects/${projectId}/characters/${characterId}/avatar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },
};

export const relationApi = {
  async create(projectId: string, relation: Partial<Relation>): Promise<Relation> {
    const res = await api.post(`/projects/${projectId}/relations`, relation);
    return res.data;
  },

  async delete(projectId: string, id: string): Promise<void> {
    await api.delete(`/projects/${projectId}/relations/${id}`);
  },
};
