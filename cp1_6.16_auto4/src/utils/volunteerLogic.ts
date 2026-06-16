import type {
  Activity,
  MatchedActivity,
  ServiceRecord,
  Skill,
  SkillDistribution,
  VolunteerReport,
  DashboardStats,
  MonthlyTrend,
  Volunteer,
} from '../types';
import { ALL_SKILLS } from '../types';

export interface SkillWeights {
  [key: string]: number;
}

export interface MatchOptions {
  threshold: number;
  skillWeights?: SkillWeights;
  urgencyWeight?: number;
}

const DEFAULT_SKILL_WEIGHTS: SkillWeights = {
  教学: 1.2,
  翻译: 1.0,
  技术: 1.3,
  设计: 1.1,
  医疗: 1.5,
};

export function normalizeSkillWeights(weights: SkillWeights): SkillWeights {
  const values = Object.values(weights);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    const normalized: SkillWeights = {};
    for (const key of Object.keys(weights)) {
      normalized[key] = 1;
    }
    return normalized;
  }

  const normalized: SkillWeights = {};
  for (const key of Object.keys(weights)) {
    normalized[key] = 0.5 + (weights[key] - min) / (max - min) * 0.5;
  }
  return normalized;
}

export function getISOWeekNumber(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekDiff = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);

  if (weekDiff < 1) {
    const prevYear = target.getUTCFullYear() - 1;
    const prevDec28 = new Date(Date.UTC(prevYear, 11, 28));
    return getISOWeekNumber(prevDec28);
  }

  if (weekDiff > 52) {
    const nextJan4 = new Date(Date.UTC(target.getUTCFullYear() + 1, 0, 4));
    const nextYearWeek = getISOWeekNumber(nextJan4);
    if (nextYearWeek.week === 1) {
      return { year: target.getUTCFullYear() + 1, week: 1 };
    }
    return { year: target.getUTCFullYear(), week: weekDiff };
  }

  return { year: target.getUTCFullYear(), week: weekDiff };
}

function getWeekNumber(date: Date): { year: number; week: number } {
  return getISOWeekNumber(date);
}

export function isSameWeek(dateStr: string, referenceDate: Date = new Date()): boolean {
  const target = new Date(dateStr);
  const refWeek = getWeekNumber(referenceDate);
  const targetWeek = getWeekNumber(target);
  return refWeek.year === targetWeek.year && refWeek.week === targetWeek.week;
}

export function calculateSkillMatch(
  volunteerSkills: Skill[],
  requiredSkills: Skill[],
  skillWeights: SkillWeights = DEFAULT_SKILL_WEIGHTS
): number {
  if (requiredSkills.length === 0) return 1;
  if (volunteerSkills.length === 0) return 0;

  const volunteerSet = new Set(volunteerSkills);
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const skill of requiredSkills) {
    const weight = skillWeights[skill] ?? 1;
    totalWeight += weight;
    if (volunteerSet.has(skill)) {
      matchedWeight += weight;
    }
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0;
}

function calculateUrgencyScore(activityDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activityDay = new Date(activityDate);
  activityDay.setHours(0, 0, 0, 0);

  const daysUntil = Math.ceil((activityDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 0;
  if (daysUntil <= 3) return 1;
  if (daysUntil <= 7) return 0.7;
  if (daysUntil <= 14) return 0.4;
  return 0.1;
}

export function matchActivitiesToVolunteer(
  activities: Activity[],
  volunteer: Volunteer | null,
  volunteerSkills: Skill[],
  options: MatchOptions = { threshold: 0.6 }
): MatchedActivity[] {
  const skills = volunteer?.skills.length ? volunteer.skills : volunteerSkills;
  const { threshold, skillWeights, urgencyWeight = 0.15 } = options;

  return activities
    .map((activity) => {
      const skillMatchScore = calculateSkillMatch(skills, activity.requiredSkills, skillWeights);
      const urgencyScore = calculateUrgencyScore(activity.date);
      const finalScore = skillMatchScore * (1 - urgencyWeight) + urgencyScore * urgencyWeight;

      return {
        ...activity,
        matchScore: Math.min(1, finalScore),
        isRecommended: finalScore >= threshold,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function calculateTotalHours(records: ServiceRecord[], volunteerName?: string): number {
  const filtered = volunteerName
    ? records.filter((r) => r.volunteerName === volunteerName)
    : records;
  return filtered.reduce((sum, r) => sum + r.hours, 0);
}

export function calculateWeeklyHours(records: ServiceRecord[]): number {
  return records
    .filter((r) => isSameWeek(r.date))
    .reduce((sum, r) => sum + r.hours, 0);
}

export function countActiveVolunteers(records: ServiceRecord[]): number {
  const uniqueNames = new Set(records.map((r) => r.volunteerName));
  return uniqueNames.size;
}

export function countWeeklyActiveVolunteers(records: ServiceRecord[]): number {
  const weeklyRecords = records.filter((r) => isSameWeek(r.date));
  const uniqueNames = new Set(weeklyRecords.map((r) => r.volunteerName));
  return uniqueNames.size;
}

export function getTopActivities(records: ServiceRecord[], limit = 3): { name: string; count: number }[] {
  const activityCount = new Map<string, number>();

  for (const record of records) {
    const current = activityCount.get(record.activityName) ?? 0;
    activityCount.set(record.activityName, current + 1);
  }

  return Array.from(activityCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function calculateSkillDistribution(records: ServiceRecord[], volunteerName?: string): SkillDistribution[] {
  const filtered = volunteerName
    ? records.filter((r) => r.volunteerName === volunteerName)
    : records;

  const skillCount: Record<Skill, number> = {
    教学: 0,
    翻译: 0,
    技术: 0,
    设计: 0,
    医疗: 0,
  };

  for (const record of filtered) {
    for (const skill of record.skills) {
      skillCount[skill] = (skillCount[skill] ?? 0) + record.hours;
    }
  }

  return ALL_SKILLS
    .filter((skill) => skillCount[skill] > 0)
    .map((skill) => ({
      name: skill,
      value: skillCount[skill],
    }));
}

export function calculateMonthlyTrend(records: ServiceRecord[], volunteerName?: string): MonthlyTrend[] {
  const filtered = volunteerName
    ? records.filter((r) => r.volunteerName === volunteerName)
    : records;

  const monthlyMap = new Map<string, number>();

  for (const record of filtered) {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyMap.get(monthKey) ?? 0;
    monthlyMap.set(monthKey, current + record.hours);
  }

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, hours]) => ({ month, hours }));
}

export function generateVolunteerReport(
  records: ServiceRecord[],
  volunteerName: string
): VolunteerReport {
  const volunteerRecords = records.filter((r) => r.volunteerName === volunteerName);

  return {
    volunteerName,
    totalHours: calculateTotalHours(records, volunteerName),
    activityCount: new Set(volunteerRecords.map((r) => r.activityId)).size,
    skillDistribution: calculateSkillDistribution(records, volunteerName),
    monthlyTrend: calculateMonthlyTrend(records, volunteerName),
  };
}

export function generateDashboardStats(records: ServiceRecord[]): DashboardStats {
  const weeklyRecords = records.filter((r) => isSameWeek(r.date));

  return {
    weeklyHours: calculateWeeklyHours(records),
    activeVolunteers: countWeeklyActiveVolunteers(records),
    topActivities: getTopActivities(weeklyRecords),
  };
}
