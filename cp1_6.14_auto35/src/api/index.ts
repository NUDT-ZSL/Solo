import axios from 'axios';
import type {
  User,
  Card,
  Comment,
  Project,
  BurndownData,
  ApiResponse,
  ColumnType,
  Priority,
  Tag,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('API Error:', err);
    return { code: -1, data: null, message: err.message || '网络错误' };
  }
);

export const register = (
  nickname: string,
  password: string
): Promise<ApiResponse<User>> =>
  api.post('/users/register', { nickname, password });

export const login = (
  nickname: string,
  password: string
): Promise<ApiResponse<User>> => api.post('/users/login', { nickname, password });

export const fetchUsers = (): Promise<ApiResponse<User[]>> => api.get('/users');

export const fetchProjects = (
  userId?: string
): Promise<ApiResponse<Project[]>> =>
  api.get('/projects', { params: userId ? { userId } : {} });

export const createProject = (
  name: string,
  userId: string
): Promise<ApiResponse<Project>> => api.post('/projects', { name, userId });

export const joinProject = (
  projectId: string,
  userId: string
): Promise<ApiResponse<Project>> =>
  api.post('/projects/join', { projectId, userId });

export const fetchCards = (
  projectId: string
): Promise<ApiResponse<Card[]>> => api.get('/cards', { params: { projectId } });

export const createCard = (params: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: Priority;
  dueDate?: string;
  tags?: Tag[];
}): Promise<ApiResponse<Card>> => api.post('/cards', params);

export const updateCard = (
  id: string,
  params: Partial<Card> & { column?: ColumnType }
): Promise<ApiResponse<Card>> => api.put(`/cards/${id}`, params);

export const deleteCard = (id: string): Promise<ApiResponse<null>> =>
  api.delete(`/cards/${id}`);

export const fetchComments = (
  cardId: string
): Promise<ApiResponse<Comment[]>> =>
  api.get('/comments', { params: { cardId } });

export const addComment = (
  cardId: string,
  userId: string,
  content: string
): Promise<ApiResponse<Comment>> =>
  api.post('/comments', { cardId, userId, content });

export const fetchChartData = (
  projectId: string
): Promise<ApiResponse<BurndownData>> =>
  api.get('/chart/burndown', { params: { projectId } });
