export type EventType = 'page' | 'voice' | 'quiz';

export interface TimelineEvent {
  id: string;
  name: string;
  type: EventType;
  startTime: number;
  duration: number;
  content?: {
    chapter?: string;
    question?: string;
    options?: string[];
    voiceText?: string;
  };
}

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  page: '#4A90D9',
  voice: '#50C878',
  quiz: '#FF8C42'
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  page: '页面切换',
  voice: '自动语音',
  quiz: '互动问题'
};

export const DEFAULT_TOTAL_DURATION = 30;

export const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    name: '课程导入',
    type: 'page',
    startTime: 0,
    duration: 3,
    content: { chapter: '第1章 在线学习的未来' }
  },
  {
    id: '2',
    name: '欢迎语音',
    type: 'voice',
    startTime: 3,
    duration: 5,
    content: { voiceText: '各位同学好，欢迎来到今天的课程...' }
  },
  {
    id: '3',
    name: '概念讲解',
    type: 'page',
    startTime: 8,
    duration: 4,
    content: { chapter: '1.1 核心概念解析' }
  },
  {
    id: '4',
    name: '课堂小测',
    type: 'quiz',
    startTime: 12,
    duration: 8,
    content: {
      question: '以下哪个是正确的学习路径？',
      options: ['A. 先理论后实践', 'B. 先实践后理论', 'C. 理论实践交替', 'D. 随机学习']
    }
  },
  {
    id: '5',
    name: '案例分析',
    type: 'page',
    startTime: 20,
    duration: 5,
    content: { chapter: '1.2 真实案例分析' }
  },
  {
    id: '6',
    name: '总结语音',
    type: 'voice',
    startTime: 25,
    duration: 5,
    content: { voiceText: '今天我们学习了...希望大家课后复习。' }
  }
];

export function sortEventsByTime(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.startTime - b.startTime);
}

export function calculateTotalDuration(events: TimelineEvent[]): number {
  if (events.length === 0) return 0;
  const lastEvent = sortEventsByTime(events).slice(-1)[0];
  return lastEvent.startTime + lastEvent.duration;
}

export function calculateAverageDuration(events: TimelineEvent[]): number {
  if (events.length === 0) return 0;
  const total = events.reduce((sum, e) => sum + e.duration, 0);
  return total / events.length;
}

export function getLongestEvent(events: TimelineEvent[]): TimelineEvent | null {
  if (events.length === 0) return null;
  return events.reduce((max, e) => (e.duration > max.duration ? e : max));
}

export function getShortestEvent(events: TimelineEvent[]): TimelineEvent | null {
  if (events.length === 0) return null;
  return events.reduce((min, e) => (e.duration < min.duration ? e : min));
}

export function getDurationPercentage(event: TimelineEvent, totalDuration: number): number {
  if (totalDuration === 0) return 0;
  return (event.duration / totalDuration) * 100;
}

export function exportEventsToJSON(events: TimelineEvent[]): string {
  const sorted = sortEventsByTime(events);
  const exportData = sorted.map(e => ({
    name: e.name,
    type: e.type,
    startTime: e.startTime,
    endTime: e.startTime + e.duration,
    duration: e.duration
  }));
  return JSON.stringify(exportData, null, 2);
}
