import axios from 'axios';

export interface Riddle {
  id: string;
  question: string;
  answer: string;
  thanks: string;
  attempts: number;
  correctCount: number;
  solved: boolean;
  createdAt: number;
}

export interface CreateRiddleRequest {
  question: string;
  answer: string;
  thanks?: string;
}

export interface AttemptResponse {
  correct: boolean;
  thanks?: string;
}

const api = axios.create({
  baseURL: '/api',
});

export const getRiddles = async (): Promise<Riddle[]> => {
  const response = await api.get('/riddles');
  return response.data;
};

export const getRiddle = async (id: string): Promise<Riddle> => {
  const response = await api.get(`/riddles/${id}`);
  return response.data;
};

export const createRiddle = async (
  data: CreateRiddleRequest
): Promise<Riddle> => {
  const response = await api.post('/riddles', data);
  return response.data;
};

export const attemptRiddle = async (
  id: string,
  guess: string
): Promise<AttemptResponse> => {
  const response = await api.post(`/riddles/attempt/${id}`, { guess });
  return response.data;
};
