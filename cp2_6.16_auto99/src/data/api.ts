import axios from 'axios';
import type { Puzzle, SolveResult } from './types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const getPuzzleById = async (id: string): Promise<Puzzle> => {
  const response = await apiClient.get<Puzzle>(`/puzzles/${id}`);
  return response.data;
};

export const submitSolution = async (
  id: string,
  playerSequence: number[]
): Promise<SolveResult> => {
  const response = await apiClient.post<SolveResult>('/puzzles/solve', {
    id,
    playerSequence,
  });
  return response.data;
};

export const getCollection = async (): Promise<string[]> => {
  const response = await apiClient.get<string[]>('/collection');
  return response.data;
};
