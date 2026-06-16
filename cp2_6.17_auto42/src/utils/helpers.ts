import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import zhCN from 'dayjs/locale/zh-cn.js';
import type { Task } from '../data/db';

dayjs.extend(relativeTime);
dayjs.locale(zhCN);

export function generateUUID(): string {
  return uuidv4();
}

export function formatTime(dateStr: string): string {
  return dayjs(dateStr).fromNow();
}

export function formatExactTime(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}

export function filterTasksByBuilding(tasks: Task[], building: string | null): Task[] {
  if (!building) return tasks;
  return tasks.filter((task) => {
    const users = (globalThis as any).__usersCache || [];
    const publisher = users.find((u: any) => u.id === task.publisherId);
    return publisher && publisher.building === building;
  });
}

export function calculatePublisherReward(): number {
  return 1;
}

export function calculateAcceptorReward(rewardPoints: number): number {
  return rewardPoints;
}

export function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    express: '取快递',
    pet: '照看宠物',
    groupbuy: '团购拼单',
    other: '其他'
  };
  return labels[type] || '其他';
}

export function getTaskTypeColor(type: string): string {
  const colors: Record<string, string> = {
    express: '#facc15',
    pet: '#a78bfa',
    groupbuy: '#34d399',
    other: '#9ca3af'
  };
  return colors[type] || '#9ca3af';
}

export function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '待接单',
    'in-progress': '进行中',
    completed: '已完成',
    cancelled: '已取消'
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: '#22c55e',
    'in-progress': '#f59e0b',
    cancelled: '#ef4444',
    active: '#6366f1'
  };
  return colors[status] || '#9ca3af';
}
