import type { Track } from '../api/backend';

export type DifficultyPreference = 'easy' | 'moderate' | 'challenge';

export interface PlanTask {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  description: string;
}

export interface DayPlan {
  dayIndex: number;
  date: string;
  label: string;
  totalDuration: number;
  tasks: PlanTask[];
}

export interface WeeklyPlan {
  startDate: string;
  endDate: string;
  days: DayPlan[];
  totalTasks: number;
  totalDuration: number;
}

export interface WeeklyStats {
  totalMinutes: number;
  completedTasks: number;
  totalTasks: number;
  streakDays: number;
  dailyMinutes: { date: string; minutes: number; label: string }[];
  dailyTracksCompleted: { date: string; count: number; label: string }[];
  completionPercentage: number;
}

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const fullDayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getWeekDates(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(date: Date): string {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function evaluateDifficulty(track: Track, userLevel: number): number {
  const baseDiff = track.difficulty;
  const levelGap = baseDiff - userLevel;
  let score = baseDiff * 2;
  if (levelGap > 0) {
    score += levelGap * 1.5;
  } else if (levelGap < -2) {
    score -= Math.abs(levelGap) * 0.5;
  }
  if (track.duration > 10) score += 1;
  if (track.duration > 15) score += 1;
  return Math.max(1, Math.min(10, Math.round(score)));
}

const basicWarmups = [
  { title: '热身练习：音阶/琶音', duration: 5, description: '慢速练习，注意音准和手指均匀' },
  { title: '基础技巧训练', duration: 5, description: '针对本周重点技巧进行专项练习' },
  { title: '节奏感训练', duration: 5, description: '用节拍器辅助练习节奏型' },
  { title: '呼吸/放松练习', duration: 3, description: '演奏前身体和气息的放松准备' },
];

function generateTrackTasks(track: Track, preference: DifficultyPreference, dayIndex: number): PlanTask[] {
  const tasks: PlanTask[] = [];
  const diff = track.difficulty;
  const practiceCount = preference === 'easy' ? 2 : preference === 'moderate' ? 3 : 5;
  const segments = ['A段', 'B段', '过渡段', '尾声', '高难度小节'];

  if (dayIndex % 3 === 0) {
    tasks.push({
      id: generateId(),
      title: `${track.title}：分段慢练`,
      duration: Math.round(track.duration * 0.6),
      completed: false,
      description: `以60-70%速度逐段练习，重点攻克难点部分`,
    });
  }

  if (dayIndex % 2 === 0) {
    const segIdx = dayIndex % segments.length;
    tasks.push({
      id: generateId(),
      title: `${track.title}：${segments[segIdx]}重复${practiceCount}遍`,
      duration: Math.round(track.duration * 0.4),
      completed: false,
      description: `重点练习${segments[segIdx]}，注意音乐表现力`,
    });
  }

  if (diff >= 3 && (dayIndex === 1 || dayIndex === 4 || dayIndex === 6)) {
    tasks.push({
      id: generateId(),
      title: `${track.title}：分手/分声部练习`,
      duration: Math.round(track.duration * 0.5),
      completed: false,
      description: `先单手/单声部熟练，再逐步合起来`,
    });
  }

  if (dayIndex === 6) {
    tasks.push({
      id: generateId(),
      title: `${track.title}：完整演奏一遍`,
      duration: track.duration,
      completed: false,
      description: `按照正常速度完整演奏，录音回放自查`,
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      id: generateId(),
      title: `${track.title}：整体流畅练习`,
      duration: Math.round(track.duration * 0.7),
      completed: false,
      description: `保持连贯和稳定的速度`,
    });
  }

  return tasks;
}

export function getPlan(
  tracks: Track[],
  dailyMinutes: number,
  preference: DifficultyPreference,
  _userLevel: number = 2
): WeeklyPlan {
  const weekDates = getWeekDates();
  const days: DayPlan[] = [];
  let allTasks = 0;
  let allDuration = 0;

  const adjustedTracks = tracks.length > 0 ? tracks : [];

  for (let i = 0; i < 7; i++) {
    const date = weekDates[i];
    const tasks: PlanTask[] = [];
    let dayTotal = 0;
    const isRestDay = (preference === 'easy' && i === 3) ? false : false;

    if (!isRestDay) {
      const warmupIdx = i % basicWarmups.length;
      const warmup = { ...basicWarmups[warmupIdx], id: generateId(), completed: false };
      tasks.push(warmup);
      dayTotal += warmup.duration;
    }

    if (adjustedTracks.length > 0) {
      const trackIdx = i % adjustedTracks.length;
      const trackTasks = generateTrackTasks(adjustedTracks[trackIdx], preference, i);
      for (const t of trackTasks) {
        if (dayTotal + t.duration <= dailyMinutes * 1.1) {
          tasks.push(t);
          dayTotal += t.duration;
        }
      }

      if (adjustedTracks.length > 1 && i % 2 === 1) {
        const trackIdx2 = (i + 1) % adjustedTracks.length;
        const track2Tasks = generateTrackTasks(adjustedTracks[trackIdx2], preference, i).slice(0, 2);
        for (const t of track2Tasks) {
          if (dayTotal + t.duration <= dailyMinutes * 1.2) {
            tasks.push(t);
            dayTotal += t.duration;
          }
        }
      }
    }

    const diffMultiplier = preference === 'easy' ? 0.8 : preference === 'moderate' ? 1.0 : 1.2;
    const targetDuration = Math.round(dailyMinutes * diffMultiplier);
    if (dayTotal < targetDuration && adjustedTracks.length > 0) {
      const fillTask = {
        id: generateId(),
        title: `${adjustedTracks[i % adjustedTracks.length].title}：巩固练习`,
        duration: Math.max(5, targetDuration - dayTotal),
        completed: false,
        description: '复习之前学习的内容，注意细节处理',
      };
      tasks.push(fillTask);
      dayTotal += fillTask.duration;
    }

    const taskCount = Math.min(4, Math.max(2, tasks.length));
    const finalTasks = tasks.slice(0, taskCount);
    const finalDuration = finalTasks.reduce((s, t) => s + t.duration, 0);

    allTasks += finalTasks.length;
    allDuration += finalDuration;

    days.push({
      dayIndex: i,
      date: formatDate(date),
      label: `${dayLabels[i]}（${(date.getMonth() + 1)}/${date.getDate()}）`,
      totalDuration: finalDuration,
      tasks: finalTasks,
    });
  }

  return {
    startDate: formatDate(weekDates[0]),
    endDate: formatDate(weekDates[6]),
    days,
    totalTasks: allTasks,
    totalDuration: allDuration,
  };
}

export function calculateWeeklyStats(plan: WeeklyPlan, completedTaskIds: Set<string>, dailyRecord: Record<string, number>): WeeklyStats {
  const weekDates = getWeekDates();
  const dailyMinutes: WeeklyStats['dailyMinutes'] = [];
  const dailyTracksCompleted: WeeklyStats['dailyTracksCompleted'] = [];

  let totalMinutes = 0;
  let completedTasks = 0;
  let streakDays = 0;
  let currentStreak = 0;

  for (let i = 0; i < 7; i++) {
    const date = formatDate(weekDates[i]);
    const dayPlan = plan.days[i];
    const dateLabel = `${dayLabels[i]}（${(weekDates[i].getMonth() + 1)}/${weekDates[i].getDate()}）`;

    let minutes = dailyRecord[date] || 0;
    let tracksCompleted = 0;

    if (dayPlan) {
      for (const task of dayPlan.tasks) {
        if (completedTaskIds.has(task.id)) {
          minutes += task.duration;
          completedTasks++;
          if (task.title.includes('完整演奏')) tracksCompleted++;
        }
      }
    }

    totalMinutes += minutes;
    dailyMinutes.push({ date, minutes, label: dateLabel });
    dailyTracksCompleted.push({
      date,
      count: dailyRecord[`tracks_${date}`] || tracksCompleted,
      label: dateLabel,
    });

    if (minutes > 0) {
      currentStreak++;
      streakDays = Math.max(streakDays, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const today = new Date();
  let backwardStreak = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(weekDates[i]);
    if (d > today) continue;
    const dateStr = formatDate(d);
    const mins = dailyRecord[dateStr] || 0;
    const dayPlan = plan.days[i];
    let hasCompleted = mins > 0;
    if (dayPlan && !hasCompleted) {
      hasCompleted = dayPlan.tasks.some(t => completedTaskIds.has(t.id));
    }
    if (hasCompleted) {
      backwardStreak++;
    } else {
      break;
    }
  }
  streakDays = Math.max(streakDays, backwardStreak);

  return {
    totalMinutes,
    completedTasks,
    totalTasks: plan.totalTasks,
    streakDays,
    dailyMinutes,
    dailyTracksCompleted,
    completionPercentage: plan.totalTasks > 0 ? Math.round((completedTasks / plan.totalTasks) * 100) : 0,
  };
}

export { dayLabels, fullDayLabels, formatDate, getWeekDates };
