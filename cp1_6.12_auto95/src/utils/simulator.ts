import axios from 'axios';
import type { DecisionNode, SimulateRequest, SimulateResponse } from './types';

export async function runSimulation(
  decisionChain: DecisionNode[],
): Promise<SimulateResponse> {
  const payload: SimulateRequest = {
    decisionChain,
    timestamp: Date.now(),
  };

  try {
    const response = await axios.post<SimulateResponse>('/api/simulate', payload, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('模拟请求失败:', error.message);
    } else {
      console.error('未知错误:', error);
    }
    throw error;
  }
}

export function formatReplaySummary(nodes: DecisionNode[]): string {
  if (nodes.length === 0) return '(空路径)';
  const names = nodes.map((n) => n.name);
  if (names.length <= 3) return names.join(' → ');
  return `${names.slice(0, 3).join(' → ')}...`;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
